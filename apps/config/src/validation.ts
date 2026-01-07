import { z } from 'zod';
import { EnvironmentConfig } from './types';

// Base validation schemas
const databaseConfigSchema = z.object({
  host: z.string().min(1, 'Database host is required'),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1, 'Database user is required'),
  password: z.string().min(1, 'Database password is required'),
  database: z.string().min(1, 'Database name is required'),
  maxConnections: z.number().int().min(1).max(1000),
  idleTimeout: z.number().int().min(1000),
  connectionTimeout: z.number().int().min(1000),
  url: z.string().url('Database URL must be a valid URL'),
  replicaUrl: z.string().url().optional(),
  statementTimeout: z.number().int().min(1000).optional()
});

const redisConfigSchema = z.object({
  host: z.string().min(1, 'Redis host is required'),
  port: z.number().int().min(1).max(65535),
  password: z.string().min(1, 'Redis password is required'),
  tlsEnabled: z.boolean(),
  clusterMode: z.boolean().optional()
});

const neo4jConfigSchema = z.object({
  uri: z.string().min(1, 'Neo4j URI is required'),
  auth: z.object({
    username: z.string().min(1, 'Neo4j username is required'),
    password: z.string().min(1, 'Neo4j password is required')
  }),
  httpPort: z.number().int().min(1).max(65535),
  boltPort: z.number().int().min(1).max(65535),
  encryption: z.boolean(),
  clusterMode: z.boolean().optional()
});

const qdrantConfigSchema = z.object({
  url: z.string().url('Qdrant URL must be valid'),
  apiKey: z.string().min(1, 'Qdrant API key is required'),
  collectionName: z.string().min(1, 'Collection name is required')
});

const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  model: z.string().min(1, 'AI model is required'),
  apiKey: z.string().min(1, 'API key is required'),
  embeddingProvider: z.string().min(1, 'Embedding provider is required'),
  embeddingApiKey: z.string().min(1, 'Embedding API key is required'),
  embeddingModel: z.string().min(1, 'Embedding model is required'),
  vectorDimension: z.number().int().min(128).max(4096)
});

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  fromAddress: z.string().email('Invalid from email address'),
  replyTo: z.string().email().optional()
});

const securityConfigSchema = z.object({
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().min(1, 'JWT expiration is required'),
  bcryptRounds: z.number().int().min(10).max(15),
  sessionSecret: z.string().min(32, 'Session secret must be at least 32 characters'),
  enableHsts: z.boolean().optional(),
  enableCsp: z.boolean().optional(),
  enableXFrameOptions: z.boolean().optional()
});

const monitoringConfigSchema = z.object({
  enableMetrics: z.boolean(),
  metricsPort: z.number().int().min(1024).max(65535),
  jaegerEndpoint: z.string().url('Jaeger endpoint must be a valid URL'),
  otelServiceName: z.string().min(1, 'OpenTelemetry service name is required'),
  otelEndpoint: z.string().url('OpenTelemetry endpoint must be valid'),
  otelHeaders: z.string().optional(),
  enableApm: z.boolean().optional(),
  apmServerUrl: z.string().url().optional(),
  traceSampleRate: z.number().min(0).max(1)
});

const cdnConfigSchema = z.object({
  url: z.string().url('CDN URL must be valid'),
  distributionId: z.string().min(1, 'CDN distribution ID is required')
});

const s3ConfigSchema = z.object({
  bucket: z.string().min(1, 'S3 bucket name is required'),
  region: z.string().min(1, 'AWS region is required'),
  encryptionEnabled: z.boolean(),
  versioningEnabled: z.boolean()
});

const natsConfigSchema = z.object({
  url: z.string().url('NATS URL must be valid'),
  cluster: z.string().min(1, 'NATS cluster name is required'),
  monitorPort: z.number().int().min(1).max(65535)
});

// Environment-specific schemas
const devConfigSchema = z.object({
  environment: z.literal('dev'),
  nodeEnv: z.string(),
  port: z.number().int(),
  apiUrl: z.string().url(),
  frontendUrl: z.string().url(),
  secretsManager: z.any(),
  database: databaseConfigSchema,
  redis: redisConfigSchema,
  neo4j: neo4jConfigSchema,
  qdrant: qdrantConfigSchema.optional(),
  ai: aiConfigSchema.optional(),
  email: emailConfigSchema.optional(),
  security: securityConfigSchema.optional(),
  monitoring: monitoringConfigSchema.optional()
});

const stagingConfigSchema = z.object({
  environment: z.literal('staging'),
  nodeEnv: z.string(),
  port: z.number().int(),
  apiUrl: z.string().url(),
  frontendUrl: z.string().url(),
  secretsManager: z.any(),
  database: databaseConfigSchema,
  redis: redisConfigSchema,
  neo4j: neo4jConfigSchema,
  qdrant: qdrantConfigSchema,
  ai: aiConfigSchema,
  nats: natsConfigSchema,
  email: emailConfigSchema,
  security: securityConfigSchema,
  monitoring: monitoringConfigSchema,
  cdn: cdnConfigSchema,
  s3: s3ConfigSchema
});

const prodConfigSchema = z.object({
  environment: z.literal('prod'),
  nodeEnv: z.string(),
  port: z.number().int(),
  apiUrl: z.string().url(),
  frontendUrl: z.string().url(),
  secretsManager: z.any(),
  database: databaseConfigSchema.extend({
    replicaUrl: z.string().url(),
    statementTimeout: z.number().int()
  }),
  redis: redisConfigSchema.extend({
    clusterMode: z.boolean()
  }),
  neo4j: neo4jConfigSchema.extend({
    clusterMode: z.boolean()
  }),
  qdrant: qdrantConfigSchema,
  ai: aiConfigSchema,
  nats: natsConfigSchema.extend({
    clusterServers: z.array(z.string()).min(1)
  }),
  email: emailConfigSchema.extend({
    replyTo: z.string().email()
  }),
  security: securityConfigSchema.extend({
    enableHsts: z.boolean(),
    enableCsp: z.boolean(),
    enableXFrameOptions: z.boolean()
  }),
  monitoring: monitoringConfigSchema.extend({
    enableApm: z.boolean(),
    apmServerUrl: z.string().url()
  }),
  cdn: cdnConfigSchema,
  s3: s3ConfigSchema,
  backup: z.object({
    retentionDays: z.number().int().min(1),
    automated: z.boolean(),
    window: z.string().min(1)
  }),
  disasterRecovery: z.object({
    enabled: z.boolean(),
    region: z.string().min(1)
  }),
  compliance: z.object({
    auditLog: z.boolean(),
    retentionDays: z.number().int().min(1),
    gdpr: z.boolean()
  })
});

const environmentConfigSchema = z.union([devConfigSchema, stagingConfigSchema, prodConfigSchema]);

export interface ValidationResult {
  success: boolean;
  error?: z.ZodError;
  data?: any;
}

export function validateConfig(config: any): ValidationResult {
  try {
    const validatedData = environmentConfigSchema.parse(config);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
  
  return `Configuration validation failed with ${issues.length} error(s):\n${issues.join('\n')}`;
}

export function validateRequiredEnvVars(requiredVars: string[]): { missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  return { missing, present };
}