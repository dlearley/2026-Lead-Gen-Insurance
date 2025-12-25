import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';

// Configuration schema
const configSchema = z.object({
  // Database configuration
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.string().optional(),
  POSTGRES_DB: z.string().optional(),

  // Redis configuration
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Neo4j configuration
  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),

  // NATS configuration
  NATS_URL: z.string().optional(),

  // OpenAI configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  // API configuration
  API_PORT: z.string().optional(),
  DATA_SERVICE_PORT: z.string().optional(),
  ORCHESTRATOR_PORT: z.string().optional(),
  API_KEY: z.string().optional(),

  // Logging configuration
  LOG_LEVEL: z.string().optional(),
  LOG_FORMAT: z.string().optional(),

  // Application configuration
  NODE_ENV: z.string().optional(),
  APP_NAME: z.string().optional(),
});

// Load and validate configuration
export function loadConfig() {
  try {
    const config = configSchema.parse(process.env);
    logger.info('Configuration loaded and validated');
    return config;
  } catch (error) {
    logger.error('Configuration validation failed', { error });
    throw new Error('Invalid configuration');
  }
}

// Get configuration with defaults
export const config = {
  // Database
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance_lead_gen';
  },

  // Redis
  get redisHost(): string {
    return process.env.REDIS_HOST || 'localhost';
  },
  get redisPort(): number {
    return parseInt(process.env.REDIS_PORT || '6379');
  },

  // Neo4j
  get neo4jUri(): string {
    return process.env.NEO4J_URI || 'bolt://localhost:7687';
  },
  get neo4jUser(): string {
    return process.env.NEO4J_USER || 'neo4j';
  },
  get neo4jPassword(): string {
    return process.env.NEO4J_PASSWORD || 'password';
  },

  // NATS
  get natsUrl(): string {
    return process.env.NATS_URL || 'nats://localhost:4222';
  },

  // OpenAI
  get openaiApiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  },
  get openaiModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  },

  // API
  get apiPort(): number {
    return parseInt(process.env.API_PORT || '3000');
  },
  get dataServicePort(): number {
    return parseInt(process.env.DATA_SERVICE_PORT || '3001');
  },
  get orchestratorPort(): number {
    return parseInt(process.env.ORCHESTRATOR_PORT || '3002');
  },
  get apiKey(): string {
    return process.env.API_KEY || 'dev-key-12345';
  },

  // Logging
  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  },
  get logFormat(): string {
    return process.env.LOG_FORMAT || 'json';
  },

  // Application
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get appName(): string {
    return process.env.APP_NAME || 'insurance-lead-gen-ai';
  },
};

export default config;