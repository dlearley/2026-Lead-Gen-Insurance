import { parseEnv } from './env.js';

export interface Config {
  app: {
    env: 'development' | 'test' | 'production';
    name: string;
    logLevel: string;
  };
  ports: {
    api: number;
    dataService: number;
    orchestrator: number;
  };
  database: {
    url?: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  nats: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  openai: {
    apiKey?: string;
    model: string;
  };
  apiRateLimit: {
    points: number;
    durationSeconds: number;
  };
}

export const createConfig = (processEnv: NodeJS.ProcessEnv): Config => {
  const env = parseEnv(processEnv);

  return {
    app: {
      env: env.NODE_ENV,
      name: env.APP_NAME,
      logLevel: env.LOG_LEVEL,
    },
    ports: {
      api: env.API_PORT,
      dataService: env.DATA_SERVICE_PORT,
      orchestrator: env.ORCHESTRATOR_PORT,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
    nats: {
      url: env.NATS_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
    },
    apiRateLimit: {
      points: env.API_RATE_LIMIT_POINTS,
      durationSeconds: env.API_RATE_LIMIT_DURATION_SECONDS,
    },
  };
};

let cachedConfig: Config | undefined;

export const getConfig = (): Config => {
  if (!cachedConfig) {
    cachedConfig = createConfig(process.env);
  }

  return cachedConfig;
};
