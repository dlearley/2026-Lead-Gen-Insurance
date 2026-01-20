import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '@insurance-lead-gen/core';

export interface RateLimitOptions {
  points: number;
  duration: number;
  keyGenerator?: (req: Request) => string;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

export const rateLimitPresets = {
  api: {
    points: 100,
    duration: 60, // per 60 seconds
  },
  auth: {
    points: 5,
    duration: 60, // per 60 seconds
  },
  upload: {
    points: 10,
    duration: 60, // per 60 seconds
  },
  search: {
    points: 30,
    duration: 60, // per 60 seconds
  },
  admin: {
    points: 200,
    duration: 60, // per 60 seconds
  },
  strict: {
    points: 10,
    duration: 60, // per 60 seconds
  }
};

export function createSecurityRateLimiter(
  options: RateLimitOptions,
  redis?: Redis
) {
  let limiter: RateLimiterRedis | RateLimiterMemory;

  if (redis || options.redis) {
    const redisClient = redis || new Redis(options.redis!);
    
    limiter = new RateLimiterRedis({
      points: options.points,
      duration: options.duration,
      keyPrefix: 'ratelimit',
      redis: redisClient,
      execEvenly: true, // Makes limits even across duration
    });
  } else {
    limiter = new RateLimiterMemory({
      points: options.points,
      duration: options.duration,
    });
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = options.keyGenerator ? options.keyGenerator(req) : getClientIP(req);
      
      await limiter.consume(key);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.points.toString(),
        'X-RateLimit-Remaining': (options.points - 1).toString(), // This would need to be fetched
        'X-RateLimit-Reset': Math.ceil(options.duration).toString(),
      });
      
      next();
    } catch (rejRes: any) {
      const remainingPoints = rejRes?.remainingPoints || 0;
      const msBeforeNext = rejRes?.msBeforeNext || 0;
      
      logger.warn('Rate limit exceeded', {
        ip: getClientIP(req),
        path: req.path,
        method: req.method,
        remainingPoints,
        msBeforeNext
      });
      
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': options.points.toString(),
        'X-RateLimit-Remaining': remainingPoints.toString(),
        'X-RateLimit-Reset': Math.ceil(msBeforeNext / 1000).toString(),
      });
      
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: Math.round(msBeforeNext / 1000) || 1,
      });
    }
  };
}

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

// IP-based rate limiter for general use
export const ipRateLimit = createSecurityRateLimiter({
  points: 100,
  duration: 60, // 100 requests per minute
});

// User-based rate limiter (requires authentication)
export const userRateLimit = createSecurityRateLimiter({
  points: 200,
  duration: 60, // 200 requests per minute
  keyGenerator: (req: Request) => {
    return req.user?.id || getClientIP(req);
  },
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimit = createSecurityRateLimiter({
  points: 5,
  duration: 60, // 5 requests per minute
  keyGenerator: (req: Request) => {
    return req.user?.id || getClientIP(req);
  },
});

// Auth endpoint rate limiter
export const authRateLimit = createSecurityRateLimiter({
  points: 5,
  duration: 300, // 5 attempts per 5 minutes
  keyGenerator: (req: Request) => {
    return `auth:${getClientIP(req)}`;
  },
});

// Upload rate limiter
export const uploadRateLimit = createSecurityRateLimiter({
  points: 10,
  duration: 60, // 10 uploads per minute
  keyGenerator: (req: Request) => {
    return req.user?.id || getClientIP(req);
  },
});

// Admin endpoint rate limiter
export const adminRateLimit = createSecurityRateLimiter({
  points: 500,
  duration: 60, // 500 requests per minute
  keyGenerator: (req: Request) => {
    return req.user?.id || getClientIP(req);
  },
});