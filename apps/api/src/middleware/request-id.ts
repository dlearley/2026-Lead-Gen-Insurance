import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
