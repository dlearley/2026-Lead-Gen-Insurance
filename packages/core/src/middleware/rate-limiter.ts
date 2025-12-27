import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../logger/index.js';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
}

export class RateLimiter {
  private redis: Redis;
  private options: Required<RateLimiterOptions>;

  constructor(redis: Redis, options: RateLimiterOptions) {
    this.redis = redis;
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      handler: options.handler || this.defaultHandler,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = this.options.keyGenerator(req);
      const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / this.options.windowMs)}`;

      try {
        const current = await this.redis.incr(windowKey);
        
        if (current === 1) {
          await this.redis.expire(windowKey, Math.ceil(this.options.windowMs / 1000));
        }

        const remaining = Math.max(0, this.options.maxRequests - current);
        const resetTime = Math.ceil((Date.now() + this.options.windowMs) / 1000);

        res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());

        if (current > this.options.maxRequests) {
          logger.warn(`Rate limit exceeded for key: ${key}`, {
            ip: req.ip,
            path: req.path,
            current,
            limit: this.options.maxRequests,
          });
          
          return this.options.handler(req, res);
        }

        const originalSend = res.send.bind(res);
        res.send = function (body: any) {
          if (
            (res.statusCode >= 400 && !this.options.skipFailedRequests) ||
            (res.statusCode < 400 && !this.options.skipSuccessfulRequests)
          ) {
            // Request counted
          }
          return originalSend(body);
        }.bind(this);

        next();
      } catch (error) {
        logger.error('Rate limiter error', { error, key });
        next();
      }
    };
  }

  private defaultKeyGenerator(req: Request): string {
    return req.ip || 'unknown';
  }

  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
    });
  }

  async reset(key: string): Promise<void> {
    const pattern = `ratelimit:${key}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getRemainingRequests(key: string): Promise<number> {
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / this.options.windowMs)}`;
    const current = await this.redis.get(windowKey);
    const currentCount = current ? parseInt(current, 10) : 0;
    return Math.max(0, this.options.maxRequests - currentCount);
  }
}

export function createRateLimiter(redis: Redis, options: RateLimiterOptions): RateLimiter {
  return new RateLimiter(redis, options);
}

export function createDefaultRateLimiter(redis: Redis): RateLimiter {
  return new RateLimiter(redis, {
    windowMs: 60000,
    maxRequests: 100,
  });
}

export function createApiKeyRateLimiter(redis: Redis): RateLimiter {
  return new RateLimiter(redis, {
    windowMs: 60000,
    maxRequests: 1000,
    keyGenerator: (req: Request) => {
      const apiKey = req.headers['x-api-key'] as string;
      return apiKey || req.ip || 'unknown';
    },
  });
}

export function createStrictRateLimiter(redis: Redis): RateLimiter {
  return new RateLimiter(redis, {
    windowMs: 60000,
    maxRequests: 10,
  });
}
