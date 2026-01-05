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

// GDPR Automation
export {
  GDPRAutomationService,
  gdprAutomationService,
  type DSARRequest,
  type ConsentGranularity,
  type RetentionJob,
  type ComplianceAudit,
  type DSARType,
  type DSARStatus,
  type GDPRArticle,
  type VerificationMethod,
  type DSARPriority,
  type ConsentCategory,
  type ComplianceScope,
  type ComplianceFinding,
} from './gdpr-automation.js';

// Consent Management
export {
  ConsentManagementService,
  consentManagementService,
  type ConsentBanner,
  type ConsentPurpose,
  type ConsentBannerStyle,
  type ThirdPartyIntegration,
  type ConsentRecord,
  type ConsentAction,
  type ConsentPreference,
  type GranularPreference,
  type ConsentAnalytics,
  type PrivacyPolicy,
  type PolicyChange,
} from './consent-management.js';

// Data Retention
export {
  DataRetentionService,
  dataRetentionService,
  type RetentionPolicy,
  type RetentionPeriod,
  type RetentionCondition,
  type RetentionException,
  type DataRecord,
  type DeletionBatch,
  type RetentionReport,
  type PolicyReport,
  type CategoryReport,
  type ComplianceReport,
  type DataCategory,
  type DeletionMethod,
} from './data-retention.js';

// GDPR API Service
export {
  gdprApiService,
  GDPRApiService,
  type CreateDSARRequest,
  type RecordConsentRequest,
  type ConsentWithdrawalRequest,
  type CreateRetentionPolicy,
  type ConsentAnalytics,
  type DSARAnalytics,
  type ComplianceStatus,
  type DataPortabilityValidation,
} from './gdpr-api.js';

// GDPR Middleware
export {
  GDPRMiddleware,
  createGDPRMiddleware,
  gdprMiddleware,
  type GDPRContext,
} from './gdpr-middleware.js';

// GDPR Examples
export {
  gdprExamples,
  GDPRModule,
  setupGDPRMiddleware,
  ConsentBannerManager,
  DSARProcessor,
  RetentionPolicyManager,
  ComplianceMonitor,
} from './gdpr-examples.js';
