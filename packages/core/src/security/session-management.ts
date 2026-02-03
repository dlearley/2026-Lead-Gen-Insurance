/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * Session Management Service - Secure session handling with token rotation
 */

import crypto from 'crypto';
import { logger } from '../logger.js';

export interface SessionConfig {
  cookieName: string;
  cookieSecret: string;
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  slidingExpiration: boolean;
  absoluteTimeout: number;
  concurrentSessions: number;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  isActive: boolean;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

export interface SessionTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export class SessionService {
  private config: SessionConfig;
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor() {
    this.config = {
      cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
      cookieSecret: process.env.SESSION_COOKIE_SECRET || crypto.randomBytes(32).toString('hex'),
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000'), // 1 hour
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: (process.env.SESSION_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
      slidingExpiration: process.env.SESSION_SLIDING_EXPIRATION !== 'false',
      absoluteTimeout: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT || '2592000000'), // 30 days
      concurrentSessions: parseInt(process.env.SESSION_CONCURRENT_SESSIONS || '5'),
    };
  }

  /**
   * Create a new session
   */
  createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
    fingerprint: string,
    deviceInfo?: DeviceInfo
  ): Session {
    const now = new Date();
    const sessionId = this.generateSessionId();

    // Check concurrent session limit
    const userSessionIds = this.userSessions.get(userId);
    if (userSessionIds && userSessionIds.size >= this.config.concurrentSessions) {
      // Remove oldest session
      const oldestSessionId = Array.from(userSessionIds)[0];
      this.revokeSession(oldestSessionId);
    }

    const session: Session = {
      id: sessionId,
      userId,
      accessToken,
      refreshToken,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.config.maxAge),
      ipAddress,
      userAgent,
      fingerprint,
      isActive: true,
      deviceInfo,
    };

    this.sessions.set(sessionId, session);

    if (!userSessionIds) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    logger.info('Session created', { sessionId, userId });

    return session;
  }

  /**
   * Validate and refresh session
   */
  validateSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (!session.isActive) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      this.revokeSession(sessionId);
      return null;
    }

    // Update last accessed time (sliding expiration)
    if (this.config.slidingExpiration) {
      session.lastAccessedAt = new Date();
      session.expiresAt = new Date(Date.now() + this.config.maxAge);
    }

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((s): s is Session => s !== undefined && s.isActive);
  }

  /**
   * Update session tokens
   */
  updateSessionTokens(
    sessionId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    session.expiresAt = new Date(Date.now() + expiresIn * 1000);
    session.lastAccessedAt = new Date();

    logger.info('Session tokens updated', { sessionId });

    return true;
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    this.sessions.delete(sessionId);

    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    logger.info('Session revoked', { sessionId, userId: session.userId });

    return true;
  }

  /**
   * Revoke all sessions for a user
   */
  revokeAllUserSessions(userId: string, excludeSessionId?: string): number {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return 0;
    }

    let revokedCount = 0;
    for (const sessionId of sessionIds) {
      if (excludeSessionId && sessionId === excludeSessionId) {
        continue;
      }
      this.revokeSession(sessionId);
      revokedCount++;
    }

    logger.info('All user sessions revoked', { userId, count: revokedCount, excludeSessionId });

    return revokedCount;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.validateSession(sessionId);
    return session !== null;
  }

  /**
   * Validate session fingerprint
   */
  validateFingerprint(sessionId: string, fingerprint: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // In production, use more sophisticated fingerprint comparison
    return session.fingerprint === fingerprint;
  }

  /**
   * Detect session anomalies
   */
  detectAnomalies(sessionId: string, ipAddress: string, userAgent: string): {
    hasAnomaly: boolean;
    anomalies: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { hasAnomaly: false, anomalies: [] };
    }

    const anomalies: string[] = [];

    // Check IP change
    if (session.ipAddress !== ipAddress) {
      anomalies.push('ip_changed');
    }

    // Check user agent change
    if (session.userAgent !== userAgent) {
      anomalies.push('user_agent_changed');
    }

    return {
      hasAnomaly: anomalies.length > 0,
      anomalies,
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive || session.expiresAt < now) {
        this.sessions.delete(sessionId);
        const userSessionIds = this.userSessions.get(session.userId);
        if (userSessionIds) {
          userSessionIds.delete(sessionId);
          if (userSessionIds.size === 0) {
            this.userSessions.delete(session.userId);
          }
        }
        cleanedCount++;
      }
    }

    logger.info('Expired sessions cleaned', { count: cleanedCount });

    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeUsers: number;
    expiredSessions: number;
  } {
    const now = new Date();
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      if (!session.isActive || session.expiresAt < now) {
        expiredSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      expiredSessions,
    };
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Generate session cookie options
   */
  getCookieOptions(): Record<string, string | boolean | number> {
    return {
      name: this.config.cookieName,
      value: '',
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      maxAge: this.config.maxAge,
      path: '/',
    };
  }

  /**
   * Generate session fingerprint from request headers
   */
  static generateFingerprint(
    userAgent: string,
    acceptLanguage: string,
    acceptEncoding: string
  ): string {
    const data = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Parse user agent for device info
   */
  static parseUserAgent(userAgent: string): DeviceInfo {
    const isMobile = /mobile/i.test(userAgent);
    const browser = this.extractBrowser(userAgent);
    const os = this.extractOS(userAgent);
    const device = isMobile ? 'mobile' : 'desktop';

    return { browser, os, device, isMobile };
  }

  private static extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private static extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}

export const sessionService = new SessionService();
