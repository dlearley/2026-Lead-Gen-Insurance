import { Request, Response, NextFunction } from 'express';
import { createSecurityRateLimiter } from '@insurance-lead-gen/core';

export const userRateLimiter = createSecurityRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 500,
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'unknown',
  message: 'Too many requests for this user, please try again later.',
  redis: process.env.REDIS_HOST ? {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  } : undefined,
});

export const createEndpointRateLimiter = (maxRequests: number, windowMs: number = 60 * 1000) => {
  return createSecurityRateLimiter({
    windowMs,
    maxRequests,
    keyGenerator: (req: Request) => `${req.path}:${req.user?.id || req.ip}`,
    redis: process.env.REDIS_HOST ? {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    } : undefined,
  });
};
