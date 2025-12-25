import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .optional()
    .default('info'),
  API_PORT: z.coerce.number().int().positive().optional().default(3000),
  DATA_SERVICE_PORT: z.coerce.number().int().positive().optional().default(3001),
  ORCHESTRATOR_PORT: z.coerce.number().int().positive().optional().default(3002),
});

type EnvConfig = z.infer<typeof envSchema>;

export interface Config {
  env: EnvConfig['NODE_ENV'];
  logLevel: EnvConfig['LOG_LEVEL'];
  api: {
    port: number;
  };
  dataService: {
    port: number;
  };
  orchestrator: {
    port: number;
  };
}

const env = envSchema.parse(process.env);

export const config: Config = {
  env: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  api: {
    port: env.API_PORT,
  },
  dataService: {
    port: env.DATA_SERVICE_PORT,
  },
  orchestrator: {
    port: env.ORCHESTRATOR_PORT,
  },
};
