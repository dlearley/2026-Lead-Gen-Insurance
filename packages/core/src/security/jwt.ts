/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '../logger.js';

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
  issuer?: string;
  audience?: string;
  keyRotationEnabled?: boolean;
}

export interface JWTPayload {
  sub: string; // Subject (user ID)
  email?: string;
  role?: string;
  permissions?: string[];
  type: 'access' | 'refresh';
  jti: string; // JWT ID for revocation tracking
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class JWTService {
  private config: Required<JWTConfig>;
  private keyRotationCache: Map<string, string> = new Map();

  constructor(config: JWTConfig) {
    this.config = {
      accessTokenSecret: config.accessTokenSecret,
      refreshTokenSecret: config.refreshTokenSecret,
      accessTokenExpiry: config.accessTokenExpiry || '15m',
      refreshTokenExpiry: config.refreshTokenExpiry || '7d',
      issuer: config.issuer || 'lead-management',
      audience: config.audience || 'lead-management-api',
      keyRotationEnabled: config.keyRotationEnabled !== false,
    };
  }

  /**
   * Generate a new JWT ID for tracking
   */
  private generateJTI(): string {
    return crypto.randomUUID();
  }

  /**
   * Get the secret key for a specific token type
   */
  private getSecret(type: 'access' | 'refresh'): string {
    return type === 'access' ? this.config.accessTokenSecret : this.config.refreshTokenSecret;
  }

  /**
   * Generate an access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'type' | 'jti' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJTI();

    const tokenPayload: JWTPayload = {
      ...payload,
      type: 'access',
      jti,
      iat: now,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    return jwt.sign(tokenPayload, this.getSecret('access'), {
      expiresIn: this.config.accessTokenExpiry,
      algorithm: 'RS256', // Use asymmetric keys for production
    });
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJTI();

    const payload: JWTPayload = {
      sub: userId,
      type: 'refresh',
      jti,
      iat: now,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    return jwt.sign(payload, this.getSecret('refresh'), {
      expiresIn: this.config.refreshTokenExpiry,
      algorithm: 'RS256',
    });
  }

  /**
   * Generate a token pair (access + refresh)
   */
  generateTokenPair(
    payload: Omit<JWTPayload, 'type' | 'jti' | 'iat' | 'exp' | 'iss' | 'aud'>
  ): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload.sub);

    // Calculate expiry time
    const decoded = jwt.decode(accessToken) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret('access'), {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['RS256'],
      }) as JWTPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Access token verification failed', { error });
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret('refresh'), {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['RS256'],
      }) as JWTPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Refresh token verification failed', { error });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  refreshAccessToken(refreshToken: string, userPayload: Omit<JWTPayload, 'type' | 'jti' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    // Verify the refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Ensure the user ID matches
    if (decoded.sub !== userPayload.sub) {
      throw new Error('User ID mismatch');
    }

    // Generate new access token
    return this.generateAccessToken(userPayload);
  }

  /**
   * Decode a token without verification (for inspection only)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Token decode failed', { error });
      return null;
    }
  }

  /**
   * Get the remaining time until token expiration
   */
  getTokenExpirationTime(token: string): number | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean {
    const remainingTime = this.getTokenExpirationTime(token);
    return remainingTime === null || remainingTime <= 0;
  }

  /**
   * Extract user ID from token
   */
  getUserIdFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.sub || null;
  }

  /**
   * Revoke a token (add to blacklist)
   */
  revokeToken(jti: string, expirationTime: Date): void {
    // In production, store in Redis or database
    const ttl = Math.ceil((expirationTime.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      this.keyRotationCache.set(jti, 'revoked');
      // Set expiration cleanup
      setTimeout(() => this.keyRotationCache.delete(jti), ttl * 1000);
    }
  }

  /**
   * Check if a token is revoked
   */
  isTokenRevoked(jti: string): boolean {
    return this.keyRotationCache.has(jti);
  }

  /**
   * Rotate refresh tokens (generate new refresh token)
   */
  rotateRefreshToken(oldRefreshToken: string): { newRefreshToken: string; shouldRevoke: boolean } {
    const decoded = this.verifyRefreshToken(oldRefreshToken);
    const newRefreshToken = this.generateRefreshToken(decoded.sub);

    // Revoke old token
    this.revokeToken(decoded.jti, new Date(decoded.exp! * 1000));

    return {
      newRefreshToken,
      shouldRevoke: true,
    };
  }

  /**
   * Generate key pair for RS256 (for production)
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Validate JWT payload structure
   */
  static validatePayload(payload: any): payload is JWTPayload {
    return (
      typeof payload === 'object' &&
      typeof payload.sub === 'string' &&
      typeof payload.type === 'string' &&
      (payload.type === 'access' || payload.type === 'refresh') &&
      typeof payload.jti === 'string'
    );
  }
}

// Export default instance for development
let defaultJWTService: JWTService | null = null;

export function getJWTService(): JWTService {
  if (!defaultJWTService) {
    defaultJWTService = new JWTService({
      accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: process.env.JWT_ISSUER || 'lead-management',
      audience: process.env.JWT_AUDIENCE || 'lead-management-api',
    });
  }
  return defaultJWTService;
}
