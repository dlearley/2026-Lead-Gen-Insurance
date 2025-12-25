import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().default('insurance-lead-gen-ai'),

    API_PORT: z.coerce.number().int().positive().default(3000),
    DATA_SERVICE_PORT: z.coerce.number().int().positive().default(3001),
    ORCHESTRATOR_PORT: z.coerce.number().int().positive().default(3002),

    LOG_LEVEL: z.string().default('info'),
    LOG_FORMAT: z.string().default('json'),

    POSTGRES_USER: z.string().default('postgres'),
    POSTGRES_PASSWORD: z.string().default('postgres'),
    POSTGRES_DB: z.string().default('insurance_lead_gen'),
    POSTGRES_HOST: z.string().default('localhost'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
    DATABASE_URL: z.string().optional(),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().default(''),

    NEO4J_AUTH: z.string().default('neo4j/password'),
    NEO4J_URI: z.string().default('bolt://localhost:7687'),

    QDRANT_URL: z.string().default('http://localhost:6333'),

    NATS_URL: z.string().default('nats://localhost:4222'),

    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('24h'),
  })
  .passthrough();

const env = envSchema.parse(process.env);

const databaseUrl =
  env.DATABASE_URL ??
  `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(
    env.POSTGRES_PASSWORD
  )}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

export const config = {
  app: {
    name: env.APP_NAME,
    env: env.NODE_ENV,
  },
  api: {
    port: env.API_PORT,
  },
  dataService: {
    port: env.DATA_SERVICE_PORT,
  },
  orchestrator: {
    port: env.ORCHESTRATOR_PORT,
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  postgres: {
    url: databaseUrl,
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  neo4j: {
    auth: env.NEO4J_AUTH,
    uri: env.NEO4J_URI,
  },
  qdrant: {
    url: env.QDRANT_URL,
  },
  nats: {
    url: env.NATS_URL,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
} as const;

export type Config = typeof config;
export type Env = z.infer<typeof envSchema>;

export default config;
