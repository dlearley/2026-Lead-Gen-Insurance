import type { Request, Response, NextFunction } from 'express';
import { UserPayload, UserRole, Permission } from '@insurance-lead-gen/types';
import { authService, AuthService, logger, securityPolicyService } from '@insurance-lead-gen/core';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      deviceFingerprint?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Allow bypass for health check and certain public routes
  if (req.path === '/health' || req.path === '/health/ready' || req.path === '/health/full' || req.path === '/metrics') {
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
    // Log failed authentication attempt
    securityPolicyService.logSecurityEvent({
      type: 'login_failure',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      status: 'failure',
      details: { reason: 'missing_token', path: req.path },
    });

    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = await authService.verifyAccessToken(token);
    req.user = decoded;

    // Log successful authentication
    securityPolicyService.logSecurityEvent({
      type: 'login_success',
      userId: decoded.id,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      status: 'success',
    });

    next();
  } catch (error) {
    // Log failed authentication attempt
    securityPolicyService.logSecurityEvent({
      type: 'login_failure',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      status: 'failure',
      details: { reason: 'invalid_token', path: req.path },
    });

    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
  }
};

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      securityPolicyService.logSecurityEvent({
        type: 'suspicious_activity',
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        status: 'failure',
        details: { reason: 'missing_user_for_role_check', path: req.path },
      });

      res.status(401).json({ error: 'Unauthorized - No authenticated user' });
      return;
    }

    if (!AuthService.hasRole(req.user.roles, role)) {
      securityPolicyService.logSecurityEvent({
        type: 'suspicious_activity',
        userId: req.user.id,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        status: 'failure',
        details: { reason: 'insufficient_role', requiredRole: role, path: req.path },
      });

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
      securityPolicyService.logSecurityEvent({
        type: 'suspicious_activity',
        userId: req.user.id,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        status: 'failure',
        details: { reason: 'insufficient_permission', requiredPermission: permission, path: req.path },
      });

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

// MFA requirement middleware
export const requireMFA = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if MFA is verified in token
    if (!(req as any).user?.mfa_verified) {
      securityPolicyService.logSecurityEvent({
        type: 'suspicious_activity',
        userId: req.user.id,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        status: 'failure',
        details: { reason: 'mfa_required', path: req.path },
      });

      res.status(403).json({ 
        error: 'MFA verification required',
        mfaRequired: true 
      });
      return;
    }

    next();
  };
};
