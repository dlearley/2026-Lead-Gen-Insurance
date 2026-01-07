/**
 * Phase 30: Partner Ecosystem & Integrations
 * OAuth 2.0 Service - Handles OAuth 2.0 authentication flows
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import type {
  OAuthClient,
  OAuthToken,
  OAuthTokenRequest,
  OAuthTokenResponse,
  OAuthAuthorizationRequest,
} from '@insurance-platform/types';

export class OAuth2Service {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create OAuth client
   */
  async createClient(
    partnerId: string,
    appId: string,
    redirectUris: string[],
    allowedFlows: string[] = ['authorization_code', 'refresh_token']
  ): Promise<{ clientId: string; clientSecret: string }> {
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const hashedSecret = this.hashSecret(clientSecret);

    await this.prisma.oAuthClient.create({
      data: {
        partnerId,
        appId,
        clientId,
        clientSecret: hashedSecret,
        redirectUris,
        allowedFlows,
        tokenLifetime: 3600, // 1 hour
        refreshTokenLifetime: 2592000, // 30 days
        status: 'ACTIVE',
      },
    });

    return {
      clientId,
      clientSecret, // Only returned once
    };
  }

  /**
   * Validate client credentials
   */
  async validateClient(clientId: string, clientSecret: string): Promise<boolean> {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || client.status !== 'ACTIVE') {
      return false;
    }

    const hashedSecret = this.hashSecret(clientSecret);
    return client.clientSecret === hashedSecret;
  }

  /**
   * Handle authorization code flow - generate authorization code
   */
  async generateAuthorizationCode(
    request: OAuthAuthorizationRequest,
    userId: string
  ): Promise<string> {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId: request.clientId },
    });

    if (!client) {
      throw new Error('Invalid client');
    }

    if (!client.redirectUris.includes(request.redirectUri)) {
      throw new Error('Invalid redirect URI');
    }

    // Generate authorization code
    const code = this.generateSecureToken(32);
    
    // Store authorization code temporarily (should use Redis in production)
    // For now, we'll create a pending token
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.oAuthToken.create({
      data: {
        clientId: client.id,
        userId,
        tokenType: 'Bearer',
        accessToken: `auth_code_${code}`, // Temporary placeholder
        scopes: request.scope ? request.scope.split(' ') : [],
        expiresAt,
        revoked: false,
      },
    });

    return code;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    // Validate client
    const isValid = await this.validateClient(clientId, clientSecret);
    if (!isValid) {
      throw new Error('Invalid client credentials');
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Find and validate authorization code
    const authRecord = await this.prisma.oAuthToken.findFirst({
      where: {
        accessToken: `auth_code_${code}`,
        clientId: client.id,
        revoked: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!authRecord) {
      throw new Error('Invalid or expired authorization code');
    }

    // Generate access and refresh tokens
    const accessToken = this.generateSecureToken(40);
    const refreshToken = this.generateSecureToken(40);

    const expiresAt = new Date(Date.now() + client.tokenLifetime * 1000);
    const refreshExpiresAt = new Date(Date.now() + client.refreshTokenLifetime * 1000);

    // Create new token
    await this.prisma.oAuthToken.create({
      data: {
        clientId: client.id,
        userId: authRecord.userId,
        tokenType: 'Bearer',
        accessToken,
        refreshToken,
        scopes: authRecord.scopes,
        expiresAt,
        refreshExpiresAt,
        revoked: false,
      },
    });

    // Revoke authorization code
    await this.prisma.oAuthToken.update({
      where: { id: authRecord.id },
      data: { revoked: true },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: client.tokenLifetime,
      refreshToken,
      scope: (authRecord.scopes as string[]).join(' '),
    };
  }

  /**
   * Client credentials flow - for machine-to-machine auth
   */
  async clientCredentialsGrant(
    clientId: string,
    clientSecret: string,
    scope?: string
  ): Promise<OAuthTokenResponse> {
    const isValid = await this.validateClient(clientId, clientSecret);
    if (!isValid) {
      throw new Error('Invalid client credentials');
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.allowedFlows.includes('client_credentials')) {
      throw new Error('Client credentials flow not allowed');
    }

    const accessToken = this.generateSecureToken(40);
    const expiresAt = new Date(Date.now() + client.tokenLifetime * 1000);

    await this.prisma.oAuthToken.create({
      data: {
        clientId: client.id,
        tokenType: 'Bearer',
        accessToken,
        scopes: scope ? scope.split(' ') : [],
        expiresAt,
        revoked: false,
      },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: client.tokenLifetime,
      scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthTokenResponse> {
    const isValid = await this.validateClient(clientId, clientSecret);
    if (!isValid) {
      throw new Error('Invalid client credentials');
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Find refresh token
    const tokenRecord = await this.prisma.oAuthToken.findFirst({
      where: {
        refreshToken,
        clientId: client.id,
        revoked: false,
        refreshExpiresAt: { gte: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new access token
    const newAccessToken = this.generateSecureToken(40);
    const expiresAt = new Date(Date.now() + client.tokenLifetime * 1000);

    await this.prisma.oAuthToken.create({
      data: {
        clientId: client.id,
        userId: tokenRecord.userId,
        tokenType: 'Bearer',
        accessToken: newAccessToken,
        refreshToken: tokenRecord.refreshToken, // Reuse refresh token
        scopes: tokenRecord.scopes,
        expiresAt,
        refreshExpiresAt: tokenRecord.refreshExpiresAt,
        revoked: false,
      },
    });

    // Optionally revoke old access token
    await this.prisma.oAuthToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    return {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: client.tokenLifetime,
      refreshToken: tokenRecord.refreshToken,
      scope: (tokenRecord.scopes as string[]).join(' '),
    };
  }

  /**
   * Validate access token
   */
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    token?: OAuthToken;
    scopes?: string[];
  }> {
    const tokenRecord = await this.prisma.oAuthToken.findFirst({
      where: {
        accessToken,
        revoked: false,
        expiresAt: { gte: new Date() },
      },
      include: {
        client: {
          include: {
            partner: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return { valid: false };
    }

    if (tokenRecord.client.status !== 'ACTIVE') {
      return { valid: false };
    }

    if (tokenRecord.client.partner.status !== 'ACTIVE') {
      return { valid: false };
    }

    return {
      valid: true,
      token: tokenRecord as OAuthToken,
      scopes: tokenRecord.scopes as string[],
    };
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<void> {
    await this.prisma.oAuthToken.updateMany({
      where: {
        OR: [{ accessToken: token }, { refreshToken: token }],
      },
      data: { revoked: true },
    });
  }

  /**
   * Introspect token (check token details)
   */
  async introspectToken(token: string): Promise<{
    active: boolean;
    clientId?: string;
    userId?: string;
    scopes?: string[];
    expiresAt?: Date;
  }> {
    const tokenRecord = await this.prisma.oAuthToken.findFirst({
      where: {
        accessToken: token,
        revoked: false,
      },
      include: {
        client: true,
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return { active: false };
    }

    return {
      active: true,
      clientId: tokenRecord.client.clientId,
      userId: tokenRecord.userId || undefined,
      scopes: tokenRecord.scopes as string[],
      expiresAt: tokenRecord.expiresAt,
    };
  }

  /**
   * Generate client ID
   */
  private generateClientId(): string {
    return `client_${this.generateSecureToken(24)}`;
  }

  /**
   * Generate client secret
   */
  private generateClientSecret(): string {
    return `secret_${this.generateSecureToken(40)}`;
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(length: number): string {
    return crypto
      .randomBytes(Math.ceil(length * 0.75))
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, length);
  }

  /**
   * Hash secret
   */
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
}
