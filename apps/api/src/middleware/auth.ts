import type { Request, Response, NextFunction } from 'express';
import { UserPayload, UserRole, Permission } from '@insurance-lead-gen/types';
import { authService, AuthService, logger } from '@insurance-lead-gen/core';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Allow bypass for health check and certain public routes
  if (req.path === '/health' || req.path === '/favicon.ico') {
    next();
    return;
  }

  // Support development/test bypass
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_AUTH === 'true') {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dev@example.com',
      roles: ['admin'],
      permissions: ['admin:all'],
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
    const decoded = await authService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
  }
};

export const requireRole = (role: UserRole) => {
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

    if (!AuthService.hasRole(req.user.roles, role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient role' });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!AuthService.hasPermission(req.user.roles, permission)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};

// RBAC Matrix / Helper for multiple roles
export const requireAnyRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasAny = roles.some(role => AuthService.hasRole(req.user!.roles, role));
    if (!hasAny) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};
