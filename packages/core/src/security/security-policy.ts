/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * Security Policy Service - Password policies, account lockout, and security rules
 */

import crypto from 'bcryptjs';
import { logger } from '../logger.js';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  preventCommonPasswords: boolean;
  preventReusedPasswords: number; // Number of previous passwords to check
  preventSimilarToUsername: boolean;
  preventKeyboardPatterns: boolean;
  expirationDays: number;
  preventEmailPattern: boolean;
}

export interface AccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number; // milliseconds
  failedAttemptWindow: number; // milliseconds
  notifyOnLockout: boolean;
  notifyOnSuspiciousActivity: boolean;
}

export interface SecurityPolicy {
  password: PasswordPolicy;
  lockout: AccountLockoutPolicy;
  session: {
    absoluteTimeout: number;
    inactivityTimeout: number;
    maxConcurrentSessions: number;
    requireMFA: boolean;
  };
  ip: {
    whitelist: string[];
    blacklist: string[];
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
  };
  headers: {
    hstsMaxAge: number;
    hstsIncludeSubdomains: boolean;
    hstsPreload: boolean;
    cspEnabled: boolean;
    xFrameOptions: string;
    xContentTypeOptions: boolean;
    referrerPolicy: string;
  };
}

export interface SecurityEvent {
  type: 'login_success' | 'login_failure' | 'password_changed' | 'account_locked' | 
        'account_unlocked' | 'mfa_enabled' | 'mfa_disabled' | 'session_revoked' |
        'password_expiring' | 'suspicious_activity';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  strength: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  suggestions: string[];
}

export class SecurityPolicyService {
  private passwordPolicy: PasswordPolicy;
  private lockoutPolicy: AccountLockoutPolicy;
  private failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private commonPasswords: Set<string> = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
    'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
    'qazwsx', 'michael', 'football', 'password1', 'password123', 'welcome',
  ]);

  constructor() {
    this.passwordPolicy = {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128'),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
      specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      preventCommonPasswords: process.env.PASSWORD_PREVENT_COMMON !== 'false',
      preventReusedPasswords: parseInt(process.env.PASSWORD_PREVENT_REUSED || '5'),
      preventSimilarToUsername: process.env.PASSWORD_PREVENT_SIMILAR !== 'false',
      preventKeyboardPatterns: process.env.PASSWORD_PREVENT_KEYBOARD !== 'false',
      expirationDays: parseInt(process.env.PASSWORD_EXPIRATION_DAYS || '90'),
      preventEmailPattern: process.env.PASSWORD_PREVENT_EMAIL !== 'false',
    };

    this.lockoutPolicy = {
      maxFailedAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
      failedAttemptWindow: parseInt(process.env.FAILED_ATTEMPT_WINDOW || '300000'), // 5 minutes
      notifyOnLockout: process.env.NOTIFY_ON_LOCKOUT !== 'false',
      notifyOnSuspiciousActivity: process.env.NOTIFY_ON_SUSPICIOUS !== 'false',
    };
  }

  /**
   * Get full security policy
   */
  getPolicy(): SecurityPolicy {
    return {
      password: this.passwordPolicy,
      lockout: this.lockoutPolicy,
      session: {
        absoluteTimeout: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT || '2592000000'),
        inactivityTimeout: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '1800000'),
        maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
        requireMFA: process.env.REQUIRE_MFA === 'true',
      },
      ip: {
        whitelist: (process.env.IP_WHITELIST || '').split(',').filter(Boolean),
        blacklist: (process.env.IP_BLACKLIST || '').split(',').filter(Boolean),
        rateLimitWindow: parseInt(process.env.IP_RATE_LIMIT_WINDOW || '60000'),
        rateLimitMaxRequests: parseInt(process.env.IP_RATE_LIMIT_MAX || '100'),
      },
      headers: {
        hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
        hstsIncludeSubdomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
        hstsPreload: process.env.HSTS_PRELOAD === 'true',
        cspEnabled: process.env.CSP_ENABLED !== 'false',
        xFrameOptions: process.env.X_FRAME_OPTIONS || 'DENY',
        xContentTypeOptions: process.env.X_CONTENT_TYPE_OPTIONS !== 'false',
        referrerPolicy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin',
      },
    };
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, username?: string, email?: string): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters`);
    } else {
      score += 20;
    }

    if (password.length > this.passwordPolicy.maxLength) {
      errors.push(`Password must not exceed ${this.passwordPolicy.maxLength} characters`);
    }

    // Character requirements
    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    if (this.passwordPolicy.requireSpecialChars && !new RegExp(`[${this.passwordPolicy.specialChars}]`).test(password)) {
      errors.push(`Password must contain at least one special character (${this.passwordPolicy.specialChars})`);
    } else {
      score += 10;
    }

    // Common password check
    if (this.passwordPolicy.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common');
    } else if (password.length >= this.passwordPolicy.minLength) {
      score += 15;
    }

    // Email pattern check
    if (this.passwordPolicy.preventEmailPattern && email) {
      const emailPrefix = email.split('@')[0];
      if (emailPrefix && password.toLowerCase().includes(emailPrefix.toLowerCase())) {
        errors.push('Password cannot contain your email address');
      }
    }

    // Username similarity check
    if (this.passwordPolicy.preventSimilarToUsername && username) {
      const similarity = this.calculateStringSimilarity(password.toLowerCase(), username.toLowerCase());
      if (similarity > 0.7) {
        errors.push('Password is too similar to your username');
      }
    }

    // Keyboard pattern check
    if (this.passwordPolicy.preventKeyboardPatterns) {
      const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', 'abcdef', 'qazwsx', 'poiuytrewq'];
      for (const pattern of keyboardPatterns) {
        if (password.toLowerCase().includes(pattern)) {
          errors.push('Password contains keyboard patterns');
          break;
        }
      }
    }

    // Bonus points for length beyond minimum
    if (password.length > this.passwordPolicy.minLength + 5) {
      score += 10;
    }

    // Bonus points for character variety
    const uniqueChars = new Set(password).size;
    const varietyBonus = Math.min(uniqueChars / password.length * 15, 15);
    score += Math.floor(varietyBonus);

    // Determine strength level
    let strength: PasswordStrengthResult['strength'];
    if (score < 40) strength = 'very_weak';
    else if (score < 60) strength = 'weak';
    else if (score < 75) strength = 'fair';
    else if (score < 90) strength = 'good';
    else strength = 'strong';

    // Generate suggestions
    if (strength !== 'strong') {
      suggestions.push('Use a longer password (14+ characters)');
      if (!/\d/.test(password)) suggestions.push('Add numbers');
      if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
      if (!new RegExp(`[${this.passwordPolicy.specialChars}]`).test(password)) suggestions.push('Add special characters');
    }

    return {
      score: Math.min(score, 100),
      strength,
      errors,
      suggestions,
    };
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return crypto.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return crypto.compare(password, hash);
  }

  /**
   * Check if account should be locked
   */
  checkLockout(ipAddress: string, userId?: string): {
    isLocked: boolean;
    remainingAttempts: number;
    lockoutEndTime?: Date;
    message: string;
  } {
    const key = userId ? `user:${userId}` : `ip:${ipAddress}`;
    const attemptData = this.failedAttempts.get(key);

    if (!attemptData) {
      return {
        isLocked: false,
        remainingAttempts: this.lockoutPolicy.maxFailedAttempts,
        message: '',
      };
    }

    const now = new Date();
    const windowEnd = new Date(attemptData.lastAttempt.getTime() + this.lockoutPolicy.failedAttemptWindow);

    // Reset if window has passed
    if (now > windowEnd) {
      this.failedAttempts.delete(key);
      return {
        isLocked: false,
        remainingAttempts: this.lockoutPolicy.maxFailedAttempts,
        message: '',
      };
    }

    // Check if locked
    if (attemptData.count >= this.lockoutPolicy.maxFailedAttempts) {
      const lockoutEnd = new Date(attemptData.lastAttempt.getTime() + this.lockoutPolicy.lockoutDuration);
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockoutEndTime: lockoutEnd,
        message: `Account locked. Try again after ${lockoutEnd.toISOString()}`,
      };
    }

    const remaining = this.lockoutPolicy.maxFailedAttempts - attemptData.count;
    return {
      isLocked: false,
      remainingAttempts: remaining,
      message: remaining <= 2 ? `Warning: ${remaining} attempts remaining` : '',
    };
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(ipAddress: string, userId?: string): void {
    const key = userId ? `user:${userId}` : `ip:${ipAddress}`;
    const attemptData = this.failedAttempts.get(key);

    if (attemptData) {
      attemptData.count++;
      attemptData.lastAttempt = new Date();
    } else {
      this.failedAttempts.set(key, {
        count: 1,
        lastAttempt: new Date(),
      });
    }

    // Log security event
    this.logSecurityEvent({
      type: 'login_failure',
      userId,
      ipAddress,
      userAgent: '',
      timestamp: new Date(),
    });

    // Check for brute force pattern
    if (attemptData.count >= this.lockoutPolicy.maxFailedAttempts * 3) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        userId,
        ipAddress,
        userAgent: '',
        timestamp: new Date(),
        details: { reason: 'multiple_failed_attempts', count: attemptData.count },
      });
    }
  }

  /**
   * Record successful login
   */
  recordSuccessfulLogin(ipAddress: string, userId?: string): void {
    const key = userId ? `user:${userId}` : `ip:${ipAddress}`;
    this.failedAttempts.delete(key);

    this.logSecurityEvent({
      type: 'login_success',
      userId,
      ipAddress,
      userAgent: '',
      timestamp: new Date(),
    });
  }

  /**
   * Unlock account
   */
  unlockAccount(userId: string): void {
    const key = `user:${userId}`;
    this.failedAttempts.delete(key);

    this.logSecurityEvent({
      type: 'account_unlocked',
      userId,
      ipAddress: '',
      userAgent: '',
      timestamp: new Date(),
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Keep only last 10000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }

    logger.info('Security event', { type: event.type, userId: event.userId, ipAddress: event.ipAddress });

    // In production, send to SIEM or security monitoring
  }

  /**
   * Get security events
   */
  getSecurityEvents(filter?: { userId?: string; type?: string; since?: Date }): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (filter?.userId) {
      events = events.filter(e => e.userId === filter.userId);
    }

    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }

    if (filter?.since) {
      events = events.filter(e => e.timestamp >= filter.since!);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check IP whitelist/blacklist
   */
  checkIpPolicy(ipAddress: string): { allowed: boolean; reason: string } {
    const policy = this.getPolicy();

    if (policy.ip.blacklist.includes(ipAddress)) {
      return { allowed: false, reason: 'IP is blacklisted' };
    }

    if (policy.ip.whitelist.length > 0 && !policy.ip.whitelist.includes(ipAddress)) {
      return { allowed: false, reason: 'IP is not whitelisted' };
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1.length === 0 || str2.length === 0) return 0;
    if (str1 === str2) return 1;

    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - matrix[str1.length][str2.length] / maxLength;
  }

  /**
   * Generate password suggestions
   */
  generatePasswordSuggestion(): string {
    const length = Math.max(this.passwordPolicy.minLength, 16);
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = this.passwordPolicy.specialChars;

    let password = '';
    
    // Ensure at least one of each required type
    if (this.passwordPolicy.requireUppercase) {
      password += uppercase[crypto.randomInt(uppercase.length)];
    }
    if (this.passwordPolicy.requireLowercase) {
      password += lowercase[crypto.randomInt(lowercase.length)];
    }
    if (this.passwordPolicy.requireNumbers) {
      password += numbers[crypto.randomInt(numbers.length)];
    }
    if (this.passwordPolicy.requireSpecialChars) {
      password += special[crypto.randomInt(special.length)];
    }

    // Fill remaining length
    const allChars = uppercase + lowercase + numbers + special;
    while (password.length < length) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle password
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
  }
}

export const securityPolicyService = new SecurityPolicyService();
