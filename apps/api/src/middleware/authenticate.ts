import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateJwt = (secret: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret);
      (req as unknown as { user: unknown }).user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'unauthorized' });
    }
  };
};
