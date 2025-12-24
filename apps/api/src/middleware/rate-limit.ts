import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const createRateLimitMiddleware = (options: {
  points: number;
  durationSeconds: number;
}): RequestHandler => {
  const limiter = new RateLimiterMemory({
    points: options.points,
    duration: options.durationSeconds,
  });

  return (req: Request, res: Response, next: NextFunction) => {
    void limiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => {
        res.status(429).json({ error: 'rate_limited' });
      });
  };
};
