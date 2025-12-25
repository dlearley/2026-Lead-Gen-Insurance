export const config = {
  port: process.env.API_PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },
};
