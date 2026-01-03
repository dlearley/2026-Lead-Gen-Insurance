/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { loadEnv } from './env.js';
import { getSecretsManager } from '@insurance-lead-gen/core';

export function getConfig() {
  const env = loadEnv();
  return {
    env: env.NODE_ENV,
    appName: env.APP_NAME,
    ports: {
      api: env.API_PORT,
      dataService: env.DATA_SERVICE_PORT,
      orchestrator: env.ORCHESTRATOR_PORT,
    },
    nats: {
      url: env.NATS_URL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
    neo4j: {
      uri: env.NEO4J_URI,
      auth: env.NEO4J_AUTH,
    },
    qdrant: {
      url: env.QDRANT_URL,
    },
    ai: {
      openaiApiKey: env.OPENAI_API_KEY,
      openaiModel: env.OPENAI_MODEL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
  };
}

export async function getAsyncConfig() {
  const baseConfig = getConfig();
  const secretsManager = getSecretsManager();

  // Load sensitive values from Secrets Manager with env fallbacks
  const dbUrl = await secretsManager.getSecret('DATABASE_URL') || process.env.DATABASE_URL;
  const openaiApiKey = await secretsManager.getSecret('OPENAI_API_KEY') || baseConfig.ai.openaiApiKey;
  const jwtSecret = await secretsManager.getSecret('JWT_SECRET') || baseConfig.jwt.secret;
  const redisPassword = await secretsManager.getSecret('REDIS_PASSWORD') || baseConfig.redis.password;

  return {
    ...baseConfig,
    database: {
      url: dbUrl,
    },
    ai: {
      ...baseConfig.ai,
      openaiApiKey,
    },
    jwt: {
      ...baseConfig.jwt,
      secret: jwtSecret,
    },
    redis: {
      ...baseConfig.redis,
      password: redisPassword,
    },
  };
}

export * from './env.js';
export * from './security.config.js';
