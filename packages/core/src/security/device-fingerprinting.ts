/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * Device Fingerprinting Middleware - Enhanced security through device recognition
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export interface DeviceFingerprint {
  fingerprint: string;
  components: FingerprintComponents;
  riskScore: number;
  isTrusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  loginCount: number;
}

export interface FingerprintComponents {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  touchSupport: boolean;
  canvasFingerprint: string;
  webglFingerprint: string;
  fonts: string[];
  plugins: string[];
  doNotTrack: boolean;
  cookiesEnabled: boolean;
  localStorageEnabled: boolean;
  sessionStorageEnabled: boolean;
  indexedDBEnabled: boolean;
}

export interface DeviceFingerprintConfig {
  enabled: boolean;
  trustDuration: number;
  maxDevicesPerUser: number;
  riskThreshold: number;
  components: string[];
  storeIpHistory: boolean;
  blockSuspiciousDevices: boolean;
}

export class DeviceFingerprinting {
  private config: DeviceFingerprintConfig;
  private fingerprints: Map<string, DeviceFingerprint> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();
  private ipHistory: Map<string, string[]> = new Map();

  constructor() {
    this.config = {
      enabled: process.env.DEVICE_FINGERPRINTING_ENABLED !== 'false',
      trustDuration: parseInt(process.env.DEVICE_TRUST_DURATION || '2592000000'), // 30 days
      maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER || '5'),
      riskThreshold: parseInt(process.env.DEVICE_RISK_THRESHOLD || '70'),
      components: (process.env.FINGERPRINT_COMPONENTS || 'all').split(','),
      storeIpHistory: process.env.STORE_IP_HISTORY !== 'false',
      blockSuspiciousDevices: process.env.BLOCK_SUSPICIOUS_DEVICES === 'true',
    };
  }

  /**
   * Generate device fingerprint from request
   */
  async generateFingerprint(req: Request): Promise<FingerprintComponents> {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const secChUa = req.headers['sec-ch-ua'] || '';
    const secChUaMobile = req.headers['sec-ch-ua-mobile'] || '';
    const secChUaPlatform = req.headers['sec-ch-ua-platform'] || '';

    // Basic components
    const components: FingerprintComponents = {
      userAgent,
      language: acceptLanguage.split(',')[0] || 'en-US',
      timezone: this.detectTimezone(req),
      screenResolution: this.detectScreenResolution(req),
      colorDepth: parseInt(req.headers['sec-ch-viewport-depth'] as string || '24'),
      platform: secChUaPlatform.replace(/["']/g, '') || this.detectPlatform(userAgent),
      hardwareConcurrency: 0,
      deviceMemory: 0,
      touchSupport: 'ontouchstart' in global || 'maxtouchpoints' in navigator,
      canvasFingerprint: await this.generateCanvasFingerprint(req),
      webglFingerprint: this.generateWebGLFingerprint(req),
      fonts: await this.detectFonts(req),
      plugins: this.detectPlugins(userAgent),
      doNotTrack: req.headers['dnt'] === '1',
      cookiesEnabled: true,
      localStorageEnabled: true,
      sessionStorageEnabled: true,
      indexedDBEnabled: true,
    };

    return components;
  }

  /**
   * Get or create device fingerprint
   */
  async getOrCreateFingerprint(
    userId: string,
    req: Request
  ): Promise<{ fingerprint: DeviceFingerprint; isNew: boolean; isTrusted: boolean }> {
    const components = await this.generateFingerprint(req);
    const fingerprintHash = this.hashComponents(components);

    let fingerprint = this.fingerprints.get(fingerprintHash);
    const isNew = !fingerprint;

    if (isNew) {
      fingerprint = {
        fingerprint: fingerprintHash,
        components,
        riskScore: this.calculateRiskScore(components),
        isTrusted: false,
        firstSeen: new Date(),
        lastSeen: new Date(),
        loginCount: 1,
      };

      // Check device limit
      const userDeviceCount = this.userDevices.get(userId)?.size || 0;
      if (userDeviceCount >= this.config.maxDevicesPerUser) {
        if (this.config.blockSuspiciousDevices) {
          throw new Error('Maximum devices reached');
        }
      }

      this.fingerprints.set(fingerprintHash, fingerprint);

      // Track user-device relationship
      if (!this.userDevices.has(userId)) {
        this.userDevices.set(userId, new Set());
      }
      this.userDevices.get(userId)!.add(fingerprintHash);

      logger.info('New device fingerprint created', { userId, fingerprint: fingerprintHash });
    } else {
      fingerprint.lastSeen = new Date();
      fingerprint.loginCount++;

      logger.info('Existing device fingerprint accessed', { userId, fingerprint: fingerprintHash });
    }

    // Check if device is trusted
    const isTrusted = this.isDeviceTrusted(userId, fingerprint);

    // Update IP history
    if (this.config.storeIpHistory) {
      const clientIp = this.getClientIp(req);
      if (clientIp) {
        const ipHistory = this.ipHistory.get(fingerprintHash) || [];
        if (!ipHistory.includes(clientIp)) {
          ipHistory.push(clientIp);
          if (ipHistory.length > 10) {
            ipHistory.shift();
          }
          this.ipHistory.set(fingerprintHash, ipHistory);
        }
      }
    }

    return { fingerprint, isNew, isTrusted };
  }

  /**
   * Trust a device
   */
  trustDevice(userId: string, fingerprintHash: string): boolean {
    const fingerprint = this.fingerprints.get(fingerprintHash);
    if (!fingerprint) {
      return false;
    }

    fingerprint.isTrusted = true;
    logger.info('Device trusted', { userId, fingerprint: fingerprintHash });

    return true;
  }

  /**
   * Untrust a device
   */
  untrustDevice(userId: string, fingerprintHash: string): boolean {
    const fingerprint = this.fingerprints.get(fingerprintHash);
    if (!fingerprint) {
      return false;
    }

    fingerprint.isTrusted = false;
    logger.info('Device untrusted', { userId, fingerprint: fingerprintHash });

    return true;
  }

  /**
   * Get all devices for a user
   */
  getUserDevices(userId: string): DeviceFingerprint[] {
    const deviceHashes = this.userDevices.get(userId);
    if (!deviceHashes) {
      return [];
    }

    return Array.from(deviceHashes)
      .map(hash => this.fingerprints.get(hash))
      .filter((f): f is DeviceFingerprint => f !== undefined);
  }

  /**
   * Remove a device
   */
  removeDevice(userId: string, fingerprintHash: string): boolean {
    const fingerprint = this.fingerprints.get(fingerprintHash);
    if (!fingerprint) {
      return false;
    }

    this.fingerprints.delete(fingerprintHash);

    const userDevices = this.userDevices.get(userId);
    if (userDevices) {
      userDevices.delete(fingerprintHash);
      if (userDevices.size === 0) {
        this.userDevices.delete(userId);
      }
    }

    this.ipHistory.delete(fingerprintHash);

    logger.info('Device removed', { userId, fingerprint: fingerprintHash });

    return true;
  }

  /**
   * Check device risk
   */
  assessDeviceRisk(userId: string, req: Request): {
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
    reasons: string[];
    requiresMFA: boolean;
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    // Get current fingerprint
    const components = this.generateFingerprintSync(req);
    const fingerprintHash = this.hashComponents(components);
    const fingerprint = this.fingerprints.get(fingerprintHash);

    // Check if device is known
    if (!fingerprint) {
      riskScore += 40;
      reasons.push('unknown_device');
    } else {
      // Check if device is trusted
      if (!this.isDeviceTrusted(userId, fingerprint)) {
        riskScore += 15;
        reasons.push('untrusted_device');
      }

      // Check login frequency
      if (fingerprint.loginCount < 3) {
        riskScore += 10;
        reasons.push('new_device');
      }

      // Check IP change
      if (this.config.storeIpHistory) {
        const clientIp = this.getClientIp(req);
        const ipHistory = this.ipHistory.get(fingerprintHash) || [];
        if (clientIp && !ipHistory.includes(clientIp)) {
          riskScore += 20;
          reasons.push('new_ip');
        }
      }
    }

    // Check for suspicious indicators
    if (components.doNotTrack) {
      riskScore += 5;
      reasons.push('dnt_enabled');
    }

    if (!components.cookiesEnabled) {
      riskScore += 10;
      reasons.push('cookies_disabled');
    }

    // Determine risk level
    const riskLevel = riskScore >= this.config.riskThreshold ? 'high' 
      : riskScore >= 40 ? 'medium' 
      : 'low';

    return {
      riskLevel,
      riskScore,
      reasons,
      requiresMFA: riskLevel === 'high' && !fingerprint?.isTrusted,
    };
  }

  /**
   * Middleware for device fingerprinting
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!this.config.enabled) {
        next();
        return;
      }

      try {
        // Skip for health checks
        if (req.path === '/health' || req.path === '/health/ready') {
          next();
          return;
        }

        // Store fingerprint in request for later use
        (req as any).deviceFingerprint = await this.generateFingerprint(req);
        next();
      } catch (error) {
        logger.error('Device fingerprinting error', { error });
        next();
      }
    };
  }

  /**
   * Detect timezone from request
   */
  private detectTimezone(req: Request): string {
    const tzHeader = req.headers['x-timezone'] as string;
    if (tzHeader) {
      return tzHeader;
    }
    
    const acceptLanguage = req.headers['accept-language'] as string;
    if (acceptLanguage) {
      const match = acceptLanguage.match(/timezone=([^;]+)/i);
      if (match) {
        return match[1];
      }
    }
    
    return 'UTC';
  }

  /**
   * Detect screen resolution
   */
  private detectScreenResolution(req: Request): string {
    const width = req.headers['sec-ch-viewport-width'] || '1920';
    const height = req.headers['sec-ch-viewport-height'] || '1080';
    return `${width}x${height}`;
  }

  /**
   * Detect platform
   */
  private detectPlatform(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Generate canvas fingerprint
   */
  private async generateCanvasFingerprint(req: Request): Promise<string> {
    // In production, this would be generated client-side and sent
    // For server-side, use basic headers
    const userAgent = req.headers['user-agent'] || '';
    const canvasData = `canvas_${userAgent.length}_${Date.now()}`;
    return crypto.createHash('sha256').update(canvasData).digest('hex');
  }

  /**
   * Generate WebGL fingerprint
   */
  private generateWebGLFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const webglData = `webgl_${userAgent.length}`;
    return crypto.createHash('sha256').update(webglData).digest('hex');
  }

  /**
   * Detect fonts (placeholder)
   */
  private async detectFonts(req: Request): Promise<string[]> {
    // In production, this would be detected client-side
    return [];
  }

  /**
   * Detect plugins from user agent
   */
  private detectPlugins(userAgent: string): string[] {
    const plugins: string[] = [];
    
    if (userAgent.includes('PDF')) plugins.push('PDF Reader');
    if (userAgent.includes('Flash')) plugins.push('Flash');
    if (userAgent.includes('Java')) plugins.push('Java');
    if (userAgent.includes('Silverlight')) plugins.push('Silverlight');
    
    return plugins;
  }

  /**
   * Hash fingerprint components
   */
  private hashComponents(components: FingerprintComponents): string {
    const data = JSON.stringify(components);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate fingerprint synchronously
   */
  private generateFingerprintSync(req: Request): FingerprintComponents {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    return {
      userAgent,
      language: acceptLanguage.split(',')[0] || 'en-US',
      timezone: 'UTC',
      screenResolution: '1920x1080',
      colorDepth: 24,
      platform: this.detectPlatform(userAgent),
      hardwareConcurrency: 0,
      deviceMemory: 0,
      touchSupport: false,
      canvasFingerprint: '',
      webglFingerprint: '',
      fonts: [],
      plugins: [],
      doNotTrack: false,
      cookiesEnabled: true,
      localStorageEnabled: true,
      sessionStorageEnabled: true,
      indexedDBEnabled: true,
    };
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(components: FingerprintComponents): number {
    let score = 0;

    // Lower score is better (more unique/trusted)
    if (components.userAgent.length < 50) score += 10;
    if (components.fonts.length < 5) score += 10;
    if (!components.touchSupport) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Check if device is trusted
   */
  private isDeviceTrusted(userId: string, fingerprint: DeviceFingerprint): boolean {
    if (!fingerprint.isTrusted) return false;

    // Check if within trust duration
    const trustEnd = new Date(fingerprint.firstSeen.getTime() + this.config.trustDuration);
    return trustEnd > new Date();
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '')?.split(',')[0]?.trim() || '';
  }
}

export const deviceFingerprinting = new DeviceFingerprinting();
