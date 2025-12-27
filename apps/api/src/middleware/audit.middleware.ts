/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises, @typescript-eslint/prefer-nullish-coalescing */
import { Request, Response, NextFunction } from 'express';
import { auditLogger, AuditEventType, AuditEventSeverity } from '@insurance-lead-gen/core';

export interface AuditMiddlewareConfig {
  excludePaths?: string[];
  logSuccessful?: boolean;
  logFailed?: boolean;
}

export function createAuditMiddleware(config: AuditMiddlewareConfig = {}) {
  const { excludePaths = ['/health', '/metrics'], logSuccessful = true, logFailed = true } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      next();
      return;
    }

    // Capture the original send function
    const originalSend = res.send.bind(res);
    const startTime = Date.now();

    res.send = function (body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const isFailed = statusCode >= 400;

      // Log based on configuration
      if ((isSuccess && logSuccessful) || (isFailed && logFailed)) {
        const userId = (req as any).user?.id || (req as any).userId;
        const userName = (req as any).user?.name || (req as any).userName;

        // Determine event type based on path and method
        const eventType = determineEventType(req.path, req.method);

        // Determine severity
        let severity = AuditEventSeverity.INFO;
        if (statusCode >= 500) {
          severity = AuditEventSeverity.ERROR;
        } else if (statusCode >= 400) {
          severity = AuditEventSeverity.WARNING;
        }

        auditLogger.log({
          eventType,
          severity,
          userId,
          userName,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          action: `${req.method} ${req.path}`,
          resource: extractResource(req.path),
          resourceId: req.params.id,
          result: isSuccess ? 'success' : 'failure',
          requestId: (req as any).id || req.get('x-request-id'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            query: req.query,
          },
        });
      }

      return originalSend(body);
    };

    next();
  };
}

function determineEventType(path: string, method: string): AuditEventType {
  if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) {
    return AuditEventType.AUTHENTICATION;
  }

  if (path.includes('/admin')) {
    return AuditEventType.ADMIN_ACTION;
  }

  if (path.includes('/privacy') || path.includes('/gdpr') || path.includes('/consent')) {
    return AuditEventType.PRIVACY_EVENT;
  }

  if (path.includes('/config') || path.includes('/settings')) {
    return AuditEventType.CONFIGURATION_CHANGE;
  }

  if (method === 'DELETE') {
    return AuditEventType.DATA_DELETION;
  }

  if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
    return AuditEventType.DATA_MODIFICATION;
  }

  if (method === 'GET') {
    return AuditEventType.DATA_ACCESS;
  }

  return AuditEventType.SYSTEM_EVENT;
}

function extractResource(path: string): string {
  // Extract the resource name from the path (e.g., /api/v1/leads -> leads)
  const parts = path.split('/').filter(Boolean);

  // Remove 'api' and version parts
  const filtered = parts.filter((part) => part !== 'api' && !part.match(/^v\d+$/));

  // Return the first resource part
  return filtered[0] || 'unknown';
}
