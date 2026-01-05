// Rate limiter middleware

import rateLimit from 'rate-limiter-flexible'
import { Request, Response, NextFunction } from 'express'

const rateLimiter = new rateLimit.RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
})

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  rateLimiter.consume(req.ip)
    .then(() => {
      next()
    })
    .catch(() => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      })
    })
}