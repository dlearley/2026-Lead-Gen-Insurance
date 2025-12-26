import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@insurance-lead-gen/core';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

// Rate limiting middleware
const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || 'unknown';

  rateLimiter.consume(key)
    .then(() => {
      next();
    })
    .catch(() => {
      logger.warn('Rate limit exceeded', { ip: key });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    });
};

export { rateLimiterMiddleware as rateLimiter };