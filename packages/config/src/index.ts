export { loadEnv, type Env } from './env.js';
import { loadEnv } from './env.js';

export const env = loadEnv(process.env);

export const config = {
  ...env,
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};
