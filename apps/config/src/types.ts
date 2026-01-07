import { SecretsManager } from './secrets-manager';

export type Environment = 'dev' | 'staging' | 'prod';

export interface BaseConfig {
  environment: Environment;
  nodeEnv: string;
  port: number;
  apiUrl: string;
  frontendUrl: string;
  secretsManager: SecretsManager;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  url: string;
  replicaUrl?: string;
  statementTimeout?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  tlsEnabled: boolean;
  clusterMode?: boolean;
}

export interface Neo4jConfig {
  uri: string;
  auth: {
    username: string;
    password: string;
  };
  httpPort: number;
  boltPort: number;
  encryption: boolean;
  clusterMode?: boolean;
}

export interface QdrantConfig {
  url: string;
  apiKey: string;
  collectionName: string;
}

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingModel: string;
  vectorDimension: number;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  replyTo?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  sessionSecret: string;
  enableHsts?: boolean;
  enableCsp?: boolean;
  enableXFrameOptions?: boolean;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  metricsPort: number;
  jaegerEndpoint: string;
  otelServiceName: string;
  otelEndpoint: string;
  otelHeaders?: string;
  enableApm?: boolean;
  apmServerUrl?: string;
  traceSampleRate: number;
}

export interface CDNConfig {
  url: string;
  distributionId: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  encryptionEnabled: boolean;
  versioningEnabled: boolean;
}

export interface DevConfig extends BaseConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  neo4j: Neo4jConfig;
  qdrant?: QdrantConfig;
  ai?: AIConfig;
  email?: EmailConfig;
  security?: SecurityConfig;
  monitoring?: MonitoringConfig;
}

export interface StagingConfig extends BaseConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  neo4j: Neo4jConfig;
  qdrant: QdrantConfig;
  ai: AIConfig;
  nats: {
    url: string;
    cluster: string;
    monitorPort: number;
  };
  email: EmailConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  cdn: CDNConfig;
  s3: S3Config;
}

export interface ProdConfig extends BaseConfig {
  database: DatabaseConfig & { replicaUrl: string; statementTimeout: number };
  redis: RedisConfig & { clusterMode: boolean };
  neo4j: Neo4jConfig & { clusterMode: boolean };
  qdrant: QdrantConfig;
  ai: AIConfig;
  nats: {
    url: string;
    cluster: string;
    monitorPort: number;
    clusterServers: string[];
  };
  email: EmailConfig & { replyTo: string };
  security: SecurityConfig & {
    enableHsts: boolean;
    enableCsp: boolean;
    enableXFrameOptions: boolean;
  };
  monitoring: MonitoringConfig & {
    enableApm: boolean;
    apmServerUrl: string;
  };
  cdn: CDNConfig;
  s3: S3Config;
  backup: {
    retentionDays: number;
    automated: boolean;
    window: string;
  };
  disasterRecovery: {
    enabled: boolean;
    region: string;
  };
  compliance: {
    auditLog: boolean;
    retentionDays: number;
    gdpr: boolean;
  };
}

export type EnvironmentConfig = DevConfig | StagingConfig | ProdConfig;

export interface SecretsManagerConfig {
  backend: 'aws-secrets-manager' | 'hashicorp-vault' | 'local-encrypted' | 'env';
  awsRegion?: string;
  vaultAddress?: string;
  vaultToken?: string;
  localKeyPath?: string;
  auditLogPath?: string;
}