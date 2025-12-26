import Redis from 'ioredis';

import { getConfig } from '@insurance-lead-gen/config';

export const createRedisConnection = (): Redis => {
  const config = getConfig();

  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  });
};
