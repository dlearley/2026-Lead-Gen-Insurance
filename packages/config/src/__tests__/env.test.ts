import { loadEnv } from '../env.js';

describe('loadEnv', () => {
  it('should apply defaults when values are missing', () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.NATS_URL).toBe('nats://localhost:4222');
  });

  it('should coerce numeric values', () => {
    const env = loadEnv({ API_PORT: '4000' });

    expect(env.API_PORT).toBe(4000);
  });
});
