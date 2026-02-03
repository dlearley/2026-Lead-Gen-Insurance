import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .optional()
    .default('development'),

  APP_NAME: z.string().optional().default('insurance-lead-gen-ai'),
  APP_URL: z.string().optional().default('http://localhost:3000'),

  API_PORT: z.coerce.number().int().positive().optional().default(3000),
  DATA_SERVICE_PORT: z.coerce.number().int().positive().optional().default(3001),
  ORCHESTRATOR_PORT: z.coerce.number().int().positive().optional().default(3002),

  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .optional()
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).optional().default('json'),

  DATABASE_URL: z.string().optional(),

  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().optional().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  NATS_URL: z.string().optional().default('nats://localhost:4222'),

  NEO4J_URI: z.string().optional().default('bolt://localhost:7687'),
  NEO4J_AUTH: z.string().optional().default('neo4j/password'),

  QDRANT_URL: z.string().optional().default('http://localhost:6333'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional().default('gpt-4-turbo-preview'),

  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional().default('24h'),
  JWT_ACCESS_EXPIRY: z.string().optional().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().optional().default('7d'),
  JWT_ISSUER: z.string().optional().default('insurance-lead-gen'),
  JWT_AUDIENCE: z.string().optional().default('insurance-lead-gen-api'),

  // Session Configuration
  SESSION_COOKIE_NAME: z.string().optional().default('session_id'),
  SESSION_COOKIE_SECRET: z.string().optional(),
  SESSION_MAX_AGE: z.coerce.number().int().positive().optional().default(3600000),
  SESSION_ABSOLUTE_TIMEOUT: z.coerce.number().int().positive().optional().default(2592000000),
  SESSION_INACTIVITY_TIMEOUT: z.coerce.number().int().positive().optional().default(1800000),
  SESSION_SLIDING_EXPIRATION: z.coerce.boolean().optional().default(true),
  SESSION_CONCURRENT_SESSIONS: z.coerce.number().int().positive().optional().default(5),

  // SSO/OAuth Configuration
  SSO_ENABLED: z.coerce.boolean().optional().default(false),
  SSO_DEFAULT_PROVIDER: z.enum(['google', 'microsoft', 'oidc']).optional().default('google'),
  SSO_ENFORCE_MFA: z.coerce.boolean().optional().default(false),
  SSO_ALLOWED_DOMAINS: z.string().optional(),
  SSO_AUTO_PROVISION_USERS: z.coerce.boolean().optional().default(true),
  SSO_SESSION_TIMEOUT: z.coerce.number().int().positive().optional().default(86400000),
  SSO_SINGLE_LOGOUT_ENABLED: z.coerce.boolean().optional().default(true),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Microsoft Azure AD OAuth
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),

  // Generic OIDC
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: z.string().optional(),
  OIDC_AUTH_URL: z.string().optional(),
  OIDC_TOKEN_URL: z.string().optional(),
  OIDC_USERINFO_URL: z.string().optional(),
  OIDC_ISSUER: z.string().optional(),
  OIDC_JWKS_URI: z.string().optional(),
  OIDC_SCOPES: z.string().optional().default('openid email profile'),

  // Password Policy
  PASSWORD_MIN_LENGTH: z.coerce.number().int().positive().optional().default(12),
  PASSWORD_MAX_LENGTH: z.coerce.number().int().positive().optional().default(128),
  PASSWORD_REQUIRE_UPPERCASE: z.coerce.boolean().optional().default(true),
  PASSWORD_REQUIRE_LOWERCASE: z.coerce.boolean().optional().default(true),
  PASSWORD_REQUIRE_NUMBERS: z.coerce.boolean().optional().default(true),
  PASSWORD_REQUIRE_SPECIAL: z.coerce.boolean().optional().default(true),
  PASSWORD_PREVENT_COMMON: z.coerce.boolean().optional().default(true),
  PASSWORD_PREVENT_REUSED: z.coerce.number().int().positive().optional().default(5),
  PASSWORD_PREVENT_SIMILAR: z.coerce.boolean().optional().default(true),
  PASSWORD_PREVENT_KEYBOARD: z.coerce.boolean().optional().default(true),
  PASSWORD_PREVENT_EMAIL: z.coerce.boolean().optional().default(true),
  PASSWORD_EXPIRATION_DAYS: z.coerce.number().int().positive().optional().default(90),
  BCRYPT_ROUNDS: z.coerce.number().int().positive().optional().default(12),

  // Account Lockout
  LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().optional().default(5),
  LOCKOUT_DURATION: z.coerce.number().int().positive().optional().default(900000),
  FAILED_ATTEMPT_WINDOW: z.coerce.number().int().positive().optional().default(300000),
  NOTIFY_ON_LOCKOUT: z.coerce.boolean().optional().default(true),
  NOTIFY_ON_SUSPICIOUS: z.coerce.boolean().optional().default(true),

  // Device Fingerprinting
  DEVICE_FINGERPRINTING_ENABLED: z.coerce.boolean().optional().default(true),
  DEVICE_TRUST_DURATION: z.coerce.number().int().positive().optional().default(2592000000),
  MAX_DEVICES_PER_USER: z.coerce.number().int().positive().optional().default(5),
  DEVICE_RISK_THRESHOLD: z.coerce.number().int().positive().optional().default(70),
  BLOCK_SUSPICIOUS_DEVICES: z.coerce.boolean().optional().default(false),
  STORE_IP_HISTORY: z.coerce.boolean().optional().default(true),
  FINGERPRINT_COMPONENTS: z.string().optional(),

  // IP Policy
  IP_WHITELIST: z.string().optional(),
  IP_BLACKLIST: z.string().optional(),

  // Security Headers
  HSTS_MAX_AGE: z.coerce.number().int().positive().optional().default(31536000),
  HSTS_INCLUDE_SUBDOMAINS: z.coerce.boolean().optional().default(true),
  HSTS_PRELOAD: z.coerce.boolean().optional().default(false),
  CSP_ENABLED: z.coerce.boolean().optional().default(true),
  X_FRAME_OPTIONS: z.enum(['DENY', 'SAMEORIGIN']).optional().default('DENY'),
  X_CONTENT_TYPE_OPTIONS: z.coerce.boolean().optional().default(true),
  REFERRER_POLICY: z.string().optional().default('strict-origin-when-cross-origin'),

  // MFA Settings
  MFA_ISSUER: z.string().optional().default('Lead Management'),
  MFA_SERVICE_NAME: z.string().optional().default('lead-management'),
  MFA_ENABLED: z.coerce.boolean().optional().default(false),
  REQUIRE_MFA: z.coerce.boolean().optional().default(false),

  // Encryption
  ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_ALGORITHM: z.string().optional().default('aes-256-gcm'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Invalid environment variables: ${message}`);
  }

  return parsed.data;
}
