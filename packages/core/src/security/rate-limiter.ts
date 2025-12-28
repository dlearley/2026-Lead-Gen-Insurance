/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

export interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
  resetKey(key: string): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: Date }> = new Map();
  private readonly windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const hit = this.hits.get(key);

    if (!hit || hit.resetTime.getTime() < now) {
      const resetTime = new Date(now + this.windowMs);
      this.hits.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime };
    }

    hit.count++;
    return { totalHits: hit.count, resetTime: hit.resetTime };
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }
}

class RedisStore implements RateLimitStore {
  private client: RedisClientType;
  private readonly windowMs: number;
  private connected: boolean = false;

  constructor(windowMs: number, redisConfig: { host: string; port: number; password?: string }) {
    this.windowMs = windowMs;
    this.client = createClient({
      url: `redis://${redisConfig.host}:${redisConfig.port}`,
      password: redisConfig.password,
    }) as RedisClientType;

    this.client.on('error', (err) => {
      logger.error('Redis rate limiter error', { error: err });
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      logger.info('Redis rate limiter connected');
    } catch (error) {
      logger.error('Failed to connect to Redis for rate limiting', { error });
    }
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    const windowKey = `ratelimit:${key}`;
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    const multi = this.client.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, ttlSeconds);
    multi.ttl(windowKey);

    const results = await multi.exec();
    const totalHits = results[0] as number;
    const ttl = results[2] as number;

    const resetTime = new Date(Date.now() + ttl * 1000);

    return { totalHits, resetTime };
  }

  async resetKey(key: string): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.client.del(`ratelimit:${key}`);
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

export function createSecurityRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    handler,
    redis,
  } = config;

  const store: RateLimitStore = redis ? new RedisStore(windowMs, redis) : new MemoryStore(windowMs);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const { totalHits, resetTime } = await store.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - totalHits));
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      if (totalHits > maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          totalHits,
          maxRequests,
          ip: req.ip,
          path: req.path,
        });

        res.setHeader('Retry-After', Math.ceil((resetTime.getTime() - Date.now()) / 1000));

        if (handler) {
          handler(req, res);
          return;
        }

        res.status(statusCode).json({
          error: 'Too Many Requests',
          message,
          retryAfter: resetTime.toISOString(),
        });
        return;
      }

      // Handle skip logic for successful/failed requests
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const isFailure = statusCode >= 400;

        if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailure)) {
          store.resetKey(key).catch((err) => {
            logger.error('Failed to reset rate limit key', { error: err, key });
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error });
      next(); // Continue on error to avoid blocking requests
    }
  };
}

// Preset configurations
export const rateLimitPresets = {
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
  },
  moderate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  lenient: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.',
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },
};
