import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/insurance_lead_gen'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('insurance_lead_gen'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Neo4j
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_AUTH: z.string().default('neo4j/password'),

  // Qdrant
  QDRANT_URL: z.string().default('http://localhost:6333'),

  // NATS
  NATS_URL: z.string().default('nats://localhost:4222'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // JWT & Security
  JWT_SECRET: z.string().default('your_jwt_secret_here_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // API Ports
  API_PORT: z.coerce.number().default(3000),
  DATA_SERVICE_PORT: z.coerce.number().default(3001),
  ORCHESTRATOR_PORT: z.coerce.number().default(3002),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('insurance-lead-gen-ai'),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) {
    return config;
  }

  try {
    config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error.errors);
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

export const config = loadConfig();
