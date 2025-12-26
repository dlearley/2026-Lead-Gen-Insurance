import { loadEnv } from './env.js';

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

export * from './env.js';
