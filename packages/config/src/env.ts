import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .optional()
    .default('development'),

  APP_NAME: z.string().optional().default('insurance-lead-gen-ai'),

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
  JWT_EXPIRES_IN: z.string().optional().default('24h'),
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
