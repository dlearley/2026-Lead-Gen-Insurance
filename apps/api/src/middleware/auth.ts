import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  try {
    const token = authHeader.substring(7);

    if (token === 'dev-token') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@example.com',
        role: 'ADMIN',
      };
      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  } catch {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

export function requireRole(allowedRoles: AuthenticatedUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
}
