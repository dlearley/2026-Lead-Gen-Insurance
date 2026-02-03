/**
 * Phase 13.2: Security Hardening & OAuth/SSO
 * Security types for the Insurance Lead Gen Platform
 */

// User roles
export type UserRole = 'admin' | 'broker' | 'agent' | 'system';

// User payload for JWT tokens
export interface UserPayload {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  provider?: string;
  mfa_verified?: boolean;
}

// Extended token payload
export interface TokenPayload extends UserPayload {
  iat: number;
  exp: number;
}

// Authentication tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
}

// Permission types
export type Permission = 
  | 'read:leads' | 'write:leads' | 'delete:leads'
  | 'read:policies' | 'write:policies'
  | 'read:reports' | 'write:reports'
  | 'admin:all';

// Role hierarchy for authorization
export const RoleHierarchy: Record<UserRole, number> = {
  admin: 100,
  system: 90,
  broker: 50,
  agent: 10,
};

// Role permissions mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  admin: ['admin:all'],
  system: ['admin:all'],
  broker: ['read:leads', 'write:leads', 'read:policies', 'write:policies', 'read:reports'],
  agent: ['read:leads', 'write:leads', 'read:policies'],
};

// OAuth client for partner integrations
export interface OAuthClient {
  id: string;
  partnerId: string;
  appId: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  allowedFlows: string[];
  tokenLifetime: number;
  refreshTokenLifetime: number;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
}

// OAuth token
export interface OAuthToken {
  id: string;
  clientId: string;
  userId?: string;
  tokenType: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt: Date;
  refreshExpiresAt?: Date;
  revoked: boolean;
}

// OAuth authorization request
export interface OAuthAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state: string;
  responseType: 'code' | 'token';
}

// OAuth token request
export interface OAuthTokenRequest {
  grantType: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  refreshToken?: string;
  scope?: string;
}

// OAuth token response
export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
  instanceUrl?: string;
}

// OAuth state for callback
export interface OAuthState {
  redirectUri: string;
  scope?: string;
  state: string;
  provider: string;
  nonce?: string;
}

// CRM OAuth configuration
export interface OAuthConfig {
  provider: CrmProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  issuer?: string;
  jwksUri?: string;
}

// CRM providers
export type CrmProvider = 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';

// SSO Provider types
export type SSOProvider = 'google' | 'microsoft' | 'oidc';

// SSO session
export interface SSOSession {
  state: string;
  nonce: string;
  provider: SSOProvider;
  createdAt: Date;
  expiresAt: Date;
  redirectUri?: string;
}

// MFA types
export type MFAMethod = 'totp' | 'sms' | 'email' | 'webauthn';

export interface MFASetting {
  userId: string;
  method: MFAMethod;
  enabled: boolean;
  secret?: string;
  phoneNumber?: string;
  backupCodesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface UserSession {
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
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
  };
}

// Security event types
export type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'password_changed'
  | 'account_locked'
  | 'account_unlocked'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_revoked'
  | 'password_expiring'
  | 'suspicious_activity'
  | 'device_trusted'
  | 'device_removed'
  | 'token_refreshed';

// Security event
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  status: 'success' | 'failure';
}

// Device information
export interface DeviceInfo {
  id: string;
  userId: string;
  fingerprint: string;
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
  firstSeen: Date;
  lastSeen: Date;
  isTrusted: boolean;
  loginCount: number;
}

// Password policy
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  preventCommonPasswords: boolean;
  preventReusedPasswords: number;
  preventSimilarToUsername: boolean;
  preventKeyboardPatterns: boolean;
  expirationDays: number;
  preventEmailPattern: boolean;
}

// Account lockout policy
export interface AccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number;
  failedAttemptWindow: number;
  notifyOnLockout: boolean;
  notifyOnSuspiciousActivity: boolean;
}

// Security policy
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
}

// Password strength result
export interface PasswordStrengthResult {
  score: number;
  strength: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  suggestions: string[];
}

// Risk assessment
export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  factors: {
    name: string;
    score: number;
    description: string;
  }[];
  recommendations: string[];
  requiresMFA: boolean;
}

// Login result
export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
  };
  tokens?: AuthTokens;
  mfaRequired?: boolean;
  mfaMethod?: MFAMethod;
  error?: string;
  remainingAttempts?: number;
  lockoutEndTime?: Date;
}

// Registration result
export interface RegistrationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  tokens?: AuthTokens;
  error?: string;
}

// Password reset result
export interface PasswordResetResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}
