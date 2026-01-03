import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@insurance-lead-gen/core';

const {
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'a-very-secret-string',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req: Request) => req.headers['x-csrf-token'],
});

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  doubleCsrfProtection(req, res, (err) => {
    if (err === invalidCsrfTokenError) {
      logger.warn('CSRF validation failed', { 
        ip: req.ip, 
        path: req.path, 
        method: req.method 
      });
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }
    next(err);
  });
};

export const getCsrfToken = (req: Request, res: Response) => {
  const token = generateToken(req, res);
  res.json({ token });
};
