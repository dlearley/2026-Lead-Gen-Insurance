import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('insurance-lead-gen-ai'),
  LOG_LEVEL: z.string().default('info'),

  API_PORT: z.coerce.number().int().positive().default(3000),
  DATA_SERVICE_PORT: z.coerce.number().int().positive().default(3001),
  ORCHESTRATOR_PORT: z.coerce.number().int().positive().default(3002),

  DATABASE_URL: z.string().optional(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  NEO4J_AUTH: z.string().optional(),
  NEO4J_URI: z.string().optional(),

  QDRANT_URL: z.string().optional(),

  NATS_URL: z.string().default('nats://localhost:4222'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  JWT_SECRET: z.string().default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  API_RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(60),
  API_RATE_LIMIT_DURATION_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (processEnv: NodeJS.ProcessEnv): Env => envSchema.parse(processEnv);
