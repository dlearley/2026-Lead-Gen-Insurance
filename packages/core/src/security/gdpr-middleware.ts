// GDPR Middleware for Express/NestJS Applications
// Phase 25.1B - Data Privacy & GDPR Automation

import { Request, Response, NextFunction } from 'express';
import { gdprApiService } from './gdpr-api.js';

export interface GDPRContext {
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  geolocation?: string;
  consentChecked: boolean;
  consentValid: boolean;
}

// Extend Express Request type to include GDPR context
declare global {
  namespace Express {
    interface Request {
      gdpr?: GDPRContext;
    }
  }
}

export class GDPRMiddleware {
  private service: typeof gdprApiService;

  constructor(service: typeof gdprApiService = gdprApiService) {
    this.service = service;
  }

  /**
   * Middleware to extract and validate GDPR context from request
   */
  extractContext(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const gdprContext: GDPRContext = {
        userId: req.headers['x-user-id'] as string,
        sessionId: this.extractSessionId(req),
        ipAddress: this.extractIPAddress(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        geolocation: req.headers['cf-ipcountry'] || req.headers['x-geo-country'] as string,
        consentChecked: false,
        consentValid: false
      };

      req.gdpr = gdprContext;
      next();
    };
  }

  /**
   * Middleware to check consent requirements for specific purposes
   */
  requireConsent(purposeId: string, required: boolean = true): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.gdpr) {
        req.gdpr = {
          sessionId: this.extractSessionId(req),
          ipAddress: this.extractIPAddress(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          consentChecked: false,
          consentValid: false
        };
      }

      if (!req.gdpr.userId) {
        if (required) {
          return res.status(403).json({
            error: 'Consent required',
            message: 'User authentication required for this operation',
            code: 'CONSENT_REQUIRED'
          });
        }
        return next();
      }

      try {
        const hasConsent = await this.service.hasValidConsent(req.gdpr.userId, purposeId);
        
        req.gdpr.consentChecked = true;
        req.gdpr.consentValid = hasConsent;

        if (required && !hasConsent) {
          return res.status(403).json({
            error: 'Consent required',
            message: `Valid consent required for ${purposeId}`,
            code: 'CONSENT_REQUIRED',
            purpose: purposeId
          });
        }

        if (!required && hasConsent) {
          // Store consent context for analytics
          res.setHeader('X-Consent-Valid', 'true');
          res.setHeader('X-Consent-Purpose', purposeId);
        }

        next();
      } catch (error) {
        console.error('Consent check failed:', error);
        
        if (required) {
          return res.status(500).json({
            error: 'Consent verification failed',
            message: 'Unable to verify consent status',
            code: 'CONSENT_CHECK_FAILED'
          });
        }
        
        next();
      }
    };
  }

  /**
   * Middleware to log GDPR audit events
   */
  auditLog(eventType: string, data?: Record<string, any>): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // Log the GDPR event (implementation would use actual logging service)
      const auditData = {
        eventType,
        userId: req.gdpr?.userId,
        sessionId: req.gdpr?.sessionId,
        ipAddress: req.gdpr?.ipAddress,
        userAgent: req.gdpr?.userAgent,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        data
      };

      console.log('GDPR Audit Event:', auditData);
      
      // In production, this would send to audit logging service
      // auditLogger.log(auditData);
      
      next();
    };
  }

  /**
   * Middleware to handle data portability requests
   */
  handleDataPortability(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && req.path.includes('/export')) {
        const userId = req.params.userId || req.query.userId as string;
        
        if (!userId) {
          return res.status(400).json({
            error: 'User ID required',
            message: 'User ID must be specified for data export',
            code: 'USER_ID_REQUIRED'
          });
        }

        try {
          const validation = await this.service.validateDataPortability(userId);
          
          if (!validation.valid) {
            return res.status(400).json({
              error: 'Data portability not available',
              message: 'User data is not available for export',
              code: 'PORTABILITY_UNAVAILABLE',
              restrictions: validation.restrictions
            });
          }

          // Set appropriate headers for data export
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
          res.setHeader('X-Portable-Formats', validation.portableFormats.join(', '));
          res.setHeader('X-Estimated-Size', `${validation.estimatedSize} bytes`);
          
        } catch (error) {
          console.error('Data portability validation failed:', error);
          return res.status(500).json({
            error: 'Validation failed',
            message: 'Unable to validate data portability request',
            code: 'PORTABILITY_VALIDATION_FAILED'
          });
        }
      }
      
      next();
    };
  }

  /**
   * Middleware to enforce rate limiting on GDPR endpoints
   */
  gdprRateLimit(): RequestHandler {
    const limits = {
      'POST /gdpr/dsar/requests': { requests: 3, window: '1h' }, // Max 3 DSAR requests per hour
      'POST /gdpr/consents/record': { requests: 10, window: '1h' }, // Max 10 consent changes per hour
      'DELETE /gdpr/consents/withdraw': { requests: 5, window: '1h' }, // Max 5 withdrawals per hour
      'POST /gdpr/retention/execute': { requests: 1, window: '24h' }, // Max 1 execution per day
    };

    const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const key = `${req.method} ${req.path}`;
      const limit = limits[key as keyof typeof limits];
      
      if (!limit) {
        return next(); // No rate limit for this endpoint
      }

      const clientId = req.gdpr?.userId || req.gdpr?.ipAddress || 'anonymous';
      const now = Date.now();
      const windowMs = this.parseWindowMs(limit.window);
      
      const clientData = rateLimitStore.get(clientId) || { count: 0, resetTime: now + windowMs };
      
      if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + windowMs;
      }
      
      clientData.count++;
      rateLimitStore.set(clientId, clientData);
      
      if (clientData.count > limit.requests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests to ${key}`,
          code: 'RATE_LIMIT_EXCEEDED',
          limit: limit.requests,
          window: limit.window,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.requests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - clientData.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
      
      next();
    };
  }

  private extractSessionId(req: Request): string {
    return (
      req.headers['x-session-id'] as string ||
      req.headers['authorization']?.toString().replace('Bearer ', '') ||
      req.ip ||
      'unknown'
    );
  }

  private extractIPAddress(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] as string ||
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.ip ||
      'unknown'
    );
  }

  private parseWindowMs(window: string): number {
    const match = window.match(/(\d+)([smhd])/);
    if (!match) return 3600000; // Default 1 hour
    
    const [, value, unit] = match;
    const num = parseInt(value, 10);
    
    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }
}

// Export middleware factory
export const createGDPRMiddleware = () => new GDPRMiddleware();

// Common middleware combinations
export const gdprMiddleware = {
  // Extract GDPR context from request
  extractContext: () => createGDPRMiddleware().extractContext(),
  
  // Require consent for specific purpose
  requireConsent: (purposeId: string, required: boolean = true) => 
    createGDPRMiddleware().requireConsent(purposeId, required),
  
  // Audit log GDPR events
  auditLog: (eventType: string, data?: Record<string, any>) => 
    createGDPRMiddleware().auditLog(eventType, data),
  
  // Handle data portability
  dataPortability: () => createGDPRMiddleware().handleDataPortability(),
  
  // Apply rate limiting to GDPR endpoints
  rateLimit: () => createGDPRMiddleware().gdprRateLimit(),
  
  // Full GDPR middleware stack
  full: {
    extractContext: () => createGDPRMiddleware().extractContext(),
    requireConsent: (purposeId: string, required: boolean = true) => 
      createGDPRMiddleware().requireConsent(purposeId, required),
    auditLog: (eventType: string, data?: Record<string, any>) => 
      createGDPRMiddleware().auditLog(eventType, data),
    rateLimit: () => createGDPRMiddleware().gdprRateLimit()
  }
};