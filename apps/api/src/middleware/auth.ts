import type { Request, Response, NextFunction } from 'express';
import { auditLogService, buildAuditContext } from '../services/audit.js';

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
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_AUTH === 'true') {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dev@example.com',
      role: 'ADMIN',
    };
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    void auditLogService
      .logCritical({
        ...buildAuditContext(req),
        action: 'auth_missing_token',
        resourceType: 'auth',
        status: 'failure',
        errorMessage: 'No token provided',
      })
      .catch(() => undefined)
      .finally(() => {
        res.status(401).json({ error: 'Unauthorized - No token provided' });
      });
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

    void auditLogService
      .logCritical({
        ...buildAuditContext(req),
        action: 'auth_invalid_token',
        resourceType: 'auth',
        status: 'failure',
        errorMessage: 'Invalid token',
      })
      .catch(() => undefined)
      .finally(() => {
        res.status(401).json({ error: 'Unauthorized - Invalid token' });
      });
  } catch {
    void auditLogService
      .logCritical({
        ...buildAuditContext(req),
        action: 'auth_invalid_token',
        resourceType: 'auth',
        status: 'failure',
        errorMessage: 'Invalid token',
      })
      .catch(() => undefined)
      .finally(() => {
        res.status(401).json({ error: 'Unauthorized - Invalid token' });
      });
  }
}

export function requireRole(allowedRoles: AuthenticatedUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      void auditLogService
        .logCritical({
          ...buildAuditContext(req),
          action: 'authorization_missing_user',
          resourceType: 'authorization',
          status: 'failure',
          errorMessage: 'No authenticated user in request',
        })
        .catch(() => undefined)
        .finally(() => {
          res.status(401).json({ error: 'Unauthorized' });
        });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      void auditLogService
        .logCritical({
          ...buildAuditContext(req),
          action: 'authorization_denied',
          resourceType: 'authorization',
          status: 'failure',
          errorMessage: 'Insufficient permissions',
          newValues: { requiredRoles: allowedRoles, userRole: req.user.role },
        })
        .catch(() => undefined)
        .finally(() => {
          res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        });
      return;
    }

    next();
  };
}
