// Rate Limiting
export {
  createSecurityRateLimiter,
  rateLimitPresets,
  type RateLimitConfig,
  type RateLimitStore,
} from './rate-limiter.js';

// Security Headers
export {
  createSecurityHeaders,
  securityHeaderPresets,
  type SecurityHeadersConfig,
} from './security-headers.js';

// Audit Logging
export {
  AuditLogger,
  auditLogger,
  AuditEventType,
  AuditEventSeverity,
  type AuditEvent,
  type AuditLoggerConfig,
} from './audit-logger.js';

export {
  AuditLogService,
  ConsoleAuditWriter,
  InMemoryAuditWriter,
  type AuditLogRecord,
  type AuditLogRecordInput,
  type AuditStatus,
  type AuditWriter,
} from './audit-service.js';

// Input Sanitization
export {
  InputSanitizer,
  createInputSanitizer,
  type InputSanitizerConfig,
} from './input-sanitizer.js';

// Encryption
export {
  EncryptionService,
  encryptPII,
  decryptPII,
  piiFields,
  type EncryptionConfig,
} from './encryption.js';

// Data Privacy
export {
  DataPrivacyService,
  dataPrivacyService,
  type ConsentRecord,
  type DataRetentionPolicy,
  type DataExportRequest,
  type DataDeletionRequest,
} from './data-privacy.js';

// Data Classification & Masking
export {
  DataClassification,
  defaultClassificationMatrix,
  discoverSensitiveFields,
  getFieldClassification,
  isSensitiveClassification,
  type ClassificationEntity,
  type ClassificationMatrix,
  type FieldClassification,
} from './data-classification.js';

export {
  deepRedact,
  maskAddress,
  maskCommonPIIFields,
  maskCreditCard,
  maskEmail,
  maskName,
  maskPhone,
  maskSSN,
  redactSensitiveStrings,
  redactValue,
  type MaskingOptions,
  type MaskingStrategy,
} from './masking.js';

// Secrets Management
export {
  SecretsManager,
  createSecretsManagerFromEnv,
  getSecretsManager,
  type SecretBackend,
  type SecretsManagerConfig,
  type Secret,
} from './secrets-manager.js';

// Authentication & Authorization
export {
  AuthService,
  authService,
  type AuthConfig,
} from './auth.js';

// JWT Service
export {
  JWTService,
  getJWTService,
  type JWTConfig,
  type JWTPayload,
  type TokenPair,
} from './jwt.js';

// MFA Service
export {
  MFAService,
  getMFAService,
  WebAuthnService,
  getWebAuthnService,
  type MFAConfig,
  type MFASecret,
  type MFAVerification,
  type WebAuthnCredential,
  type WebAuthnChallenge,
} from './mfa.js';

// OAuth/SSO Service
export {
  OAuthSSOService,
  oauthSSOService,
  type OAuthProviderConfig,
  type OAuthTokenResponse,
  type OAuthUserInfo,
  type SSOConfig,
} from './oauth-sso.js';

// Session Management
export {
  SessionService,
  sessionService,
  type SessionConfig,
  type Session,
  type SessionTokenPair,
  type DeviceInfo,
} from './session-management.js';

// Device Fingerprinting
export {
  DeviceFingerprinting,
  deviceFingerprinting,
  type DeviceFingerprint,
  type FingerprintComponents,
  type DeviceFingerprintConfig,
} from './device-fingerprinting.js';

// Security Policy
export {
  SecurityPolicyService,
  securityPolicyService,
  type PasswordPolicy,
  type AccountLockoutPolicy,
  type SecurityPolicy,
  type SecurityEvent,
  type PasswordStrengthResult,
} from './security-policy.js';
