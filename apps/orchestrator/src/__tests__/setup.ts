/**
 * Orchestrator Test Setup
 */
import { jest } from '@jest/globals';

export const mockConfig = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      NATS_URL: 'nats://localhost:4222',
      REDIS_URL: 'redis://localhost:6379',
      OPENAI_API_KEY: 'test-key',
    };
    return config[key];
  }),
};

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock NATS connection
export class MockNatsConnection {
  subscribe = jest.fn().mockReturnValue({
    callback: jest.fn(),
    unsubscribe: jest.fn(),
  });
  publish = jest.fn().mockResolvedValue(true);
  close = jest.fn().mockResolvedValue(true);
  drain = jest.fn().mockResolvedValue(true);
}

// Mock Redis
export class MockRedisClient {
  get = jest.fn().mockResolvedValue(null);
  set = jest.fn().mockResolvedValue('OK');
  del = jest.fn().mockResolvedValue(1);
  keys = jest.fn().mockResolvedValue([]);
  hget = jest.fn().mockResolvedValue(null);
  hset = jest.fn().mockResolvedValue(1);
  hdel = jest.fn().mockResolvedValue(1);
  quit = jest.fn().mockResolvedValue('OK');
}

// Mock OpenAI
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test response' } }],
      }),
    },
  },
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    }),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});
