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

// Secrets Management
export {
  SecretsManager,
  createSecretsManagerFromEnv,
  getSecretsManager,
  type SecretBackend,
  type SecretsManagerConfig,
  type Secret,
} from './secrets-manager.js';
