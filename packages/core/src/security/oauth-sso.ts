/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * OAuth/SSO Provider Service - Supports Google, Microsoft Azure AD, and Generic OIDC
 */

import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../logger.js';
import { getSecretsManager } from './secrets-manager.js';

export interface OAuthProviderConfig {
  provider: 'google' | 'microsoft' | 'oidc';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  issuer?: string;
  jwksUri?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  locale?: string;
  provider: string;
}

export interface SSOConfig {
  enabled: boolean;
  defaultProvider: 'google' | 'microsoft' | 'oidc';
  enforceMFA: boolean;
  allowedDomains?: string[];
  autoProvisionUsers: boolean;
  sessionTimeout: number;
  singleLogoutEnabled: boolean;
}

export class OAuthSSOService {
  private providers: Map<string, OAuthProviderConfig> = new Map();
  private config: SSOConfig;

  constructor() {
    this.config = {
      enabled: process.env.SSO_ENABLED === 'true',
      defaultProvider: (process.env.SSO_DEFAULT_PROVIDER as 'google' | 'microsoft' | 'oidc') || 'google',
      enforceMFA: process.env.SSO_ENFORCE_MFA === 'true',
      allowedDomains: process.env.SSO_ALLOWED_DOMAINS?.split(',') || [],
      autoProvisionUsers: process.env.SSO_AUTO_PROVISION_USERS !== 'false',
      sessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT || '86400000'),
      singleLogoutEnabled: process.env.SSO_SINGLE_LOGOUT_ENABLED !== 'false',
    };
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    const secretsManager = getSecretsManager();

    // Google OAuth Configuration
    this.providers.set('google', {
      provider: 'google',
      clientId: await this.getSecretOrEnv(secretsManager, 'GOOGLE_CLIENT_ID'),
      clientSecret: await this.getSecretOrEnv(secretsManager, 'GOOGLE_CLIENT_SECRET'),
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/v1/auth/sso/callback`,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });

    // Microsoft Azure AD Configuration
    this.providers.set('microsoft', {
      provider: 'microsoft',
      clientId: await this.getSecretOrEnv(secretsManager, 'MICROSOFT_CLIENT_ID'),
      clientSecret: await this.getSecretOrEnv(secretsManager, 'MICROSOFT_CLIENT_SECRET'),
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.APP_URL}/api/v1/auth/sso/callback`,
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: [
        'openid',
        'email',
        'profile',
        'User.Read',
      ],
      issuer: 'https://login.microsoftonline.com/common/v2.0',
      jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    });

    // Generic OIDC Configuration
    if (process.env.OIDC_CLIENT_ID) {
      this.providers.set('oidc', {
        provider: 'oidc',
        clientId: await this.getSecretOrEnv(secretsManager, 'OIDC_CLIENT_ID'),
        clientSecret: await this.getSecretOrEnv(secretsManager, 'OIDC_CLIENT_SECRET'),
        redirectUri: process.env.OIDC_REDIRECT_URI || `${process.env.APP_URL}/api/v1/auth/sso/callback`,
        authorizationUrl: process.env.OIDC_AUTH_URL || '',
        tokenUrl: process.env.OIDC_TOKEN_URL || '',
        userInfoUrl: process.env.OIDC_USERINFO_URL || '',
        scopes: (process.env.OIDC_SCOPES || 'openid email profile').split(' '),
        issuer: process.env.OIDC_ISSUER,
        jwksUri: process.env.OIDC_JWKS_URI,
      });
    }
  }

  private async getSecretOrEnv(secretsManager: any, key: string): Promise<string> {
    return (await secretsManager.getSecret(key)) || process.env[key] || '';
  }

  /**
   * Generate authorization URL for SSO login
   */
  getAuthorizationUrl(provider: 'google' | 'microsoft' | 'oidc', state: string, nonce?: string): string {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      ...(provider === 'microsoft' && { response_mode: 'query' }),
    });

    // Add nonce for OIDC security
    if (nonce) {
      params.set('nonce', nonce);
    }

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(
    provider: 'google' | 'microsoft' | 'oidc',
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokenResponse> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    try {
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      };

      // PKCE support
      if (codeVerifier) {
        params.code_verifier = codeVerifier;
      }

      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams(params).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        idToken: response.data.id_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type || 'Bearer',
        scope: response.data.scope,
      };
    } catch (error) {
      logger.error(`Failed to exchange code for token with ${provider}`, { error });
      throw new Error('Failed to authenticate with provider');
    }
  }

  /**
   * Fetch user information from provider
   */
  async getUserInfo(provider: 'google' | 'microsoft' | 'oidc', accessToken: string): Promise<OAuthUserInfo> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;

      if (provider === 'google') {
        return {
          id: data.sub,
          email: data.email,
          emailVerified: data.email_verified,
          name: data.name,
          firstName: data.given_name,
          lastName: data.family_name,
          picture: data.picture,
          locale: data.locale,
          provider: 'google',
        };
      } else if (provider === 'microsoft') {
        return {
          id: data.id,
          email: data.mail || data.userPrincipalName,
          emailVerified: true, // Microsoft always verifies
          name: data.displayName,
          firstName: data.givenName,
          lastName: data.surname,
          picture: undefined, // Requires additional call
          locale: data.preferredLanguage,
          provider: 'microsoft',
        };
      } else {
        return {
          id: data.sub,
          email: data.email || data.preferred_username,
          emailVerified: data.email_verified || false,
          name: data.name,
          firstName: data.given_name,
          lastName: data.family_name,
          picture: data.picture,
          locale: data.locale,
          provider: 'oidc',
        };
      }
    } catch (error) {
      logger.error(`Failed to fetch user info from ${provider}`, { error });
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(provider: 'google' | 'microsoft' | 'oidc', refreshToken: string): Promise<OAuthTokenResponse> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        idToken: response.data.id_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type || 'Bearer',
        scope: response.data.scope,
      };
    } catch (error) {
      logger.error(`Failed to refresh token with ${provider}`, { error });
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Validate ID token
   */
  async validateIdToken(
    provider: 'google' | 'microsoft' | 'oidc',
    idToken: string,
    nonce?: string
  ): Promise<boolean> {
    // In production, validate JWT signature against provider's JWKS
    // For now, basic validation
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Verify issuer
      const config = this.providers.get(provider);
      if (config?.issuer && payload.iss !== config.issuer) {
        return false;
      }

      // Verify audience
      const clientConfig = this.providers.get(provider);
      if (clientConfig && payload.aud !== clientConfig.clientId) {
        return false;
      }

      // Verify nonce if provided
      if (nonce && payload.nonce !== nonce) {
        return false;
      }

      // Check expiration
      if (payload.exp * 1000 < Date.now()) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revoke tokens (single logout)
   */
  async revokeTokens(provider: 'google' | 'microsoft' | 'oidc', accessToken: string, refreshToken?: string): Promise<void> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    try {
      // Revoke access token
      await axios.post(
        provider === 'google' 
          ? 'https://oauth2.googleapis.com/revoke'
          : 'https://login.microsoftonline.com/common/oauth2/v2.0/revoke',
        new URLSearchParams({ token: accessToken }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      // Revoke refresh token if provided
      if (refreshToken) {
        await axios.post(
          provider === 'google'
            ? 'https://oauth2.googleapis.com/revoke'
            : 'https://login.microsoftonline.com/common/oauth2/v2.0/revoke',
          new URLSearchParams({ token: refreshToken }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      }
    } catch (error) {
      logger.error(`Failed to revoke tokens with ${provider}`, { error });
    }
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate state parameter
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate nonce for OIDC
   */
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Check if SSO is configured and enabled
   */
  isSSOEnabled(): boolean {
    return this.config.enabled && this.providers.size > 0;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get SSO configuration
   */
  getSSOConfig(): SSOConfig {
    return { ...this.config };
  }

  /**
   * Validate domain restriction
   */
  validateDomainRestriction(email: string): boolean {
    if (!this.config.allowedDomains || this.config.allowedDomains.length === 0) {
      return true; // No domain restrictions
    }
    
    const domain = email.split('@')[1]?.toLowerCase();
    return this.config.allowedDomains.some(d => domain === d.toLowerCase());
  }
}

export const oauthSSOService = new OAuthSSOService();
