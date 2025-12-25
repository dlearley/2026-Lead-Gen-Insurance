import { z } from 'zod';

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  
  // API Service
  API_PORT: z.string().default('3000'),
  API_JWT_SECRET: z.string().optional(),
  API_RATE_LIMIT: z.string().default('100'),
  
  // Data Service
  DATA_SERVICE_PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NEO4J_URI: z.string().url(),
  NEO4J_USERNAME: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
  QDRANT_URL: z.string().url(),
  
  // Orchestrator Service
  ORCHESTRATOR_PORT: z.string().default('3002'),
  OPENAI_API_KEY: z.string(),
  NATS_SERVERS: z.string().default('nats://localhost:4222'),
  
  // Common
  APP_NAME: z.string().default('insurance-lead-gen'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate and parse environment variables
export const config = envSchema.parse(process.env);

// Service-specific configurations
export const apiConfig = {
  port: parseInt(config.API_PORT),
  jwtSecret: config.API_JWT_SECRET || 'default-secret',
  rateLimit: parseInt(config.API_RATE_LIMIT),
};

export const dataServiceConfig = {
  port: parseInt(config.DATA_SERVICE_PORT),
  databaseUrl: config.DATABASE_URL,
  redisUrl: config.REDIS_URL,
  neo4j: {
    uri: config.NEO4J_URI,
    username: config.NEO4J_USERNAME || 'neo4j',
    password: config.NEO4J_PASSWORD || 'password',
  },
  qdrantUrl: config.QDRANT_URL,
};

export const orchestratorConfig = {
  port: parseInt(config.ORCHESTRATOR_PORT),
  openaiApiKey: config.OPENAI_API_KEY,
  natsServers: config.NATS_SERVERS,
};

export default config;