/* eslint-disable @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import {
  RateLimitConfig,
  SecurityHeadersConfig,
  EncryptionConfig,
  SecretsManagerConfig,
} from '@insurance-lead-gen/core';

export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    global: RateLimitConfig;
    auth: RateLimitConfig;
    api: RateLimitConfig;
  };
  headers: SecurityHeadersConfig;
  encryption: EncryptionConfig;
  secrets: SecretsManagerConfig;
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  audit: {
    enabled: boolean;
    dbEnabled: boolean;
    retentionDays: number;
    archiveAfterDays: number;
    batchDelayMs: number;
    batchSize: number;
    excludePaths: string[];
  };
}

export function loadSecurityConfig(): SecurityConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    rateLimit: {
      enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
      global: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        message: 'Too many requests, please try again later.',
        redis: process.env.REDIS_URL
          ? {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD,
            }
          : undefined,
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many authentication attempts, please try again later.',
      },
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000,
      },
    },
    headers: {
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: !isDevelopment,
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
        reportOnly: isDevelopment,
      },
      frameOptions: 'DENY',
      xssProtection: true,
      noSniff: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
      },
    },
    encryption: {
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      key: process.env.ENCRYPTION_KEY,
      keyLength: 32, // 256 bits
      ivLength: 16,
      saltLength: 64,
      iterations: 100000,
      digest: 'sha512',
    },
    secrets: {
      backend: (process.env.SECRETS_BACKEND as any) || 'env',
      awsRegion: process.env.AWS_SECRETS_MANAGER_REGION,
      vaultAddr: process.env.VAULT_ADDR,
      vaultToken: process.env.VAULT_TOKEN,
      cacheTTL: parseInt(process.env.SECRETS_CACHE_TTL || '300000'), // 5 minutes
    },
    cors: {
      origin: process.env.CORS_ORIGIN || (isDevelopment ? '*' : ''),
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      maxAge: 86400, // 24 hours
    },
    session: {
      secret: process.env.SESSION_SECRET || 'change-me-in-production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
      secure: !isDevelopment,
      httpOnly: true,
      sameSite: isDevelopment ? 'lax' : 'strict',
    },
    audit: {
      enabled: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      dbEnabled: process.env.AUDIT_LOG_DB_ENABLED !== 'false',
      retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'), // 7 years
      archiveAfterDays: parseInt(process.env.AUDIT_LOG_ARCHIVE_AFTER_DAYS || '365'), // 1 year
      batchDelayMs: parseInt(process.env.AUDIT_LOG_BATCH_DELAY_MS || '100'),
      batchSize: parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '100'),
      excludePaths: ['/health', '/metrics', '/favicon.ico'],
    },
  };
}

export const securityConfig = loadSecurityConfig();
