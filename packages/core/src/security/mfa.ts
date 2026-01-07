/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { logger } from '../logger.js';

export interface MFAConfig {
  issuer?: string;
  serviceName?: string;
  secretLength?: number;
  backupCodesCount?: number;
  totpWindow?: number;
}

export interface MFASecret {
  userId: string;
  secret: string;
  qrCodeUrl?: string;
  backupCodes: string[];
  createdAt: Date;
}

export interface MFAVerification {
  userId: string;
  code: string;
  type: 'totp' | 'backup';
}

export class MFAService {
  private config: Required<MFAConfig>;
  private userSecrets: Map<string, MFASecret> = new Map();
  private usedBackupCodes: Set<string> = new Set();

  constructor(config: MFAConfig = {}) {
    this.config = {
      issuer: config.issuer || 'Lead Management',
      serviceName: config.serviceName || 'lead-management',
      secretLength: config.secretLength || 32,
      backupCodesCount: config.backupCodesCount || 10,
      totpWindow: config.totpWindow || 2, // Allow 2 time step window
    };
  }

  /**
   * Generate a new MFA secret for a user
   */
  async generateMFASecret(userId: string, email?: string): Promise<MFASecret> {
    const secret = authenticator.generateSecret(this.config.secretLength);

    const backupCodes = this.generateBackupCodes();

    // Generate QR code URL
    let qrCodeUrl: string | undefined;
    if (email) {
      const totpUrl = authenticator.keyuri(email, this.config.issuer, secret);
      qrCodeUrl = await QRCode.toDataURL(totpUrl);
    }

    const mfaSecret: MFASecret = {
      userId,
      secret,
      qrCodeUrl,
      backupCodes,
      createdAt: new Date(),
    };

    // In production, store securely in database
    this.userSecrets.set(userId, mfaSecret);

    logger.info('MFA secret generated', { userId });

    return mfaSecret;
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(userId: string, code: string): boolean {
    const mfaSecret = this.userSecrets.get(userId);

    if (!mfaSecret) {
      logger.warn('MFA secret not found', { userId });
      return false;
    }

    const isValid = authenticator.verify({
      token: code,
      secret: mfaSecret.secret,
      window: this.config.totpWindow,
    });

    if (isValid) {
      logger.info('TOTP verification successful', { userId });
    } else {
      logger.warn('TOTP verification failed', { userId });
    }

    return isValid;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(userId: string, code: string): boolean {
    const mfaSecret = this.userSecrets.get(userId);

    if (!mfaSecret) {
      logger.warn('MFA secret not found', { userId });
      return false;
    }

    // Check if code exists in user's backup codes
    const codeIndex = mfaSecret.backupCodes.indexOf(code);

    if (codeIndex === -1) {
      logger.warn('Invalid backup code', { userId });
      return false;
    }

    // Check if code has already been used
    const codeKey = `${userId}:${code}`;
    if (this.usedBackupCodes.has(codeKey)) {
      logger.warn('Backup code already used', { userId });
      return false;
    }

    // Mark code as used
    this.usedBackupCodes.add(codeKey);

    // Remove from user's backup codes
    mfaSecret.backupCodes.splice(codeIndex, 1);

    logger.info('Backup code verification successful', { userId, remaining: mfaSecret.backupCodes.length });

    return true;
  }

  /**
   * Verify MFA code (TOTP or backup)
   */
  verifyMFA(verification: MFAVerification): boolean {
    if (verification.type === 'totp') {
      return this.verifyTOTP(verification.userId, verification.code);
    } else if (verification.type === 'backup') {
      return this.verifyBackupCode(verification.userId, verification.code);
    }

    return false;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.config.backupCodesCount; i++) {
      // Generate 8-character code in groups of 4
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }

    return codes;
  }

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes(userId: string): string[] {
    const mfaSecret = this.userSecrets.get(userId);

    if (!mfaSecret) {
      throw new Error('MFA not enabled for user');
    }

    mfaSecret.backupCodes = this.generateBackupCodes();

    logger.info('Backup codes regenerated', { userId });

    return mfaSecret.backupCodes;
  }

  /**
   * Disable MFA for a user
   */
  disableMFA(userId: string): void {
    const mfaSecret = this.userSecrets.get(userId);

    if (mfaSecret) {
      // Clean up used backup codes
      for (const code of mfaSecret.backupCodes) {
        this.usedBackupCodes.delete(`${userId}:${code}`);
      }

      this.userSecrets.delete(userId);

      logger.info('MFA disabled', { userId });
    }
  }

  /**
   * Check if MFA is enabled for a user
   */
  isMFAEnabled(userId: string): boolean {
    return this.userSecrets.has(userId);
  }

  /**
   * Get remaining backup codes count
   */
  getRemainingBackupCodesCount(userId: string): number {
    const mfaSecret = this.userSecrets.get(userId);
    return mfaSecret ? mfaSecret.backupCodes.length : 0;
  }

  /**
   * Generate SMS OTP (One-Time Password)
   */
  generateSMSOTP(length: number = 6): string {
    const otp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');
    return otp;
  }

  /**
   * Verify SMS OTP
   */
  verifySMSOTP(userId: string, code: string, expectedCode: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      logger.warn('SMS OTP expired', { userId });
      return false;
    }

    if (code !== expectedCode) {
      logger.warn('Invalid SMS OTP', { userId });
      return false;
    }

    logger.info('SMS OTP verification successful', { userId });

    return true;
  }
}

export interface WebAuthnCredential {
  id: string;
  userId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  createdAt: Date;
}

export interface WebAuthnChallenge {
  challenge: string;
  userId: string;
  expiresAt: Date;
}

export class WebAuthnService {
  private credentials: Map<string, WebAuthnCredential> = new Map();
  private challenges: Map<string, WebAuthnChallenge> = new Map();

  /**
   * Generate registration challenge
   */
  generateRegistrationChallenge(userId: string): { challenge: string; user: { id: string; name: string; displayName: string } } {
    const challenge = crypto.randomBytes(32).toString('base64url');

    const webAuthnChallenge: WebAuthnChallenge = {
      challenge,
      userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    this.challenges.set(challenge, webAuthnChallenge);

    logger.info('WebAuthn registration challenge generated', { userId });

    return {
      challenge,
      user: {
        id: userId,
        name: userId,
        displayName: userId,
      },
    };
  }

  /**
   * Verify registration
   */
  verifyRegistration(userId: string, challenge: string, credential: any): boolean {
    const storedChallenge = this.challenges.get(challenge);

    if (!storedChallenge || storedChallenge.userId !== userId) {
      logger.warn('Invalid or expired challenge', { userId });
      return false;
    }

    if (new Date() > storedChallenge.expiresAt) {
      this.challenges.delete(challenge);
      logger.warn('Challenge expired', { userId });
      return false;
    }

    // In production, verify credential with WebAuthn library
    const webAuthnCredential: WebAuthnCredential = {
      id: credential.id,
      userId,
      publicKey: credential.publicKey,
      counter: 0,
      transports: credential.transports,
      createdAt: new Date(),
    };

    this.credentials.set(`${userId}:${credential.id}`, webAuthnCredential);
    this.challenges.delete(challenge);

    logger.info('WebAuthn registration verified', { userId, credentialId: credential.id });

    return true;
  }

  /**
   * Generate authentication challenge
   */
  generateAuthenticationChallenge(userId: string): { challenge: string; allowCredentials: Array<{ id: string; transports?: string[] }> } {
    const challenge = crypto.randomBytes(32).toString('base64url');

    const webAuthnChallenge: WebAuthnChallenge = {
      challenge,
      userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    this.challenges.set(challenge, webAuthnChallenge);

    // Get user's credentials
    const userCredentials = Array.from(this.credentials.entries())
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, cred]) => ({
        id: cred.id,
        transports: cred.transports,
      }));

    logger.info('WebAuthn authentication challenge generated', { userId });

    return {
      challenge,
      allowCredentials: userCredentials,
    };
  }

  /**
   * Verify authentication
   */
  verifyAuthentication(userId: string, challenge: string, credential: any): boolean {
    const storedChallenge = this.challenges.get(challenge);

    if (!storedChallenge || storedChallenge.userId !== userId) {
      logger.warn('Invalid or expired challenge', { userId });
      return false;
    }

    if (new Date() > storedChallenge.expiresAt) {
      this.challenges.delete(challenge);
      logger.warn('Challenge expired', { userId });
      return false;
    }

    // Get stored credential
    const storedCredential = this.credentials.get(`${userId}:${credential.id}`);

    if (!storedCredential) {
      logger.warn('Credential not found', { userId, credentialId: credential.id });
      return false;
    }

    // In production, verify signature and counter
    // Verify counter hasn't decreased (replay attack protection)
    if (credential.counter < storedCredential.counter) {
      logger.warn('Counter decreased - possible replay attack', { userId });
      return false;
    }

    // Update counter
    storedCredential.counter = credential.counter;

    this.challenges.delete(challenge);

    logger.info('WebAuthn authentication verified', { userId, credentialId: credential.id });

    return true;
  }

  /**
   * Get user's WebAuthn credentials
   */
  getUserCredentials(userId: string): WebAuthnCredential[] {
    return Array.from(this.credentials.entries())
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, cred]) => cred);
  }

  /**
   * Remove a credential
   */
  removeCredential(userId: string, credentialId: string): boolean {
    const key = `${userId}:${credentialId}`;
    const removed = this.credentials.delete(key);

    if (removed) {
      logger.info('WebAuthn credential removed', { userId, credentialId });
    }

    return removed;
  }
}

// Export default instances
let defaultMFAService: MFAService | null = null;
let defaultWebAuthnService: WebAuthnService | null = null;

export function getMFAService(): MFAService {
  if (!defaultMFAService) {
    defaultMFAService = new MFAService({
      issuer: process.env.MFA_ISSUER || 'Lead Management',
      serviceName: process.env.MFA_SERVICE_NAME || 'lead-management',
    });
  }
  return defaultMFAService;
}

export function getWebAuthnService(): WebAuthnService {
  if (!defaultWebAuthnService) {
    defaultWebAuthnService = new WebAuthnService();
  }
  return defaultWebAuthnService;
}
