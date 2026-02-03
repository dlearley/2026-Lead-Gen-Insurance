import type { Request, Response, NextFunction } from 'express';
import { APIGatewayService, APIGatewayServiceConfig } from '@insurance-lead-gen/core';
import { RequestContext, AuthenticationRequest, RequestValidation } from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

/**
 * API Gateway Request Processing Middleware
 */
export const apiGatewayMiddleware = (gatewayService: APIGatewayService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract authentication request if present
      const authRequest = extractAuthRequest(req);
      
      // Process request through API gateway
      const { context, auth } = await gatewayService.processRequest(req, authRequest);
      
      // Attach context to request for downstream handlers
      req.apiContext = context;
      req.auth = auth;
      
      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('API Gateway processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
      
      // Handle different types of errors
      if (error instanceof Error) {
        switch (error.message) {
          case 'Rate limit exceeded':
            res.status(429).json({ 
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              retryAfter: 60
            });
            return;
            
          case 'Invalid token':
          case 'Token has expired':
            res.status(401).json({ 
              error: 'UNAUTHORIZED',
              message: error.message
            });
            return;
            
          case 'Insufficient permissions':
          case 'Insufficient scope':
            res.status(403).json({ 
              error: 'FORBIDDEN',
              message: error.message
            });
            return;
            
          default:
            if (error.message.includes('validation')) {
              res.status(400).json({ 
                error: 'VALIDATION_ERROR',
                message: error.message
              });
              return;
            }
        }
      }
      
      res.status(500).json({ 
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  };
};

/**
 * Request Validation Middleware
 */
export const requestValidationMiddleware = (validationConfig: RequestValidation) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!validationConfig.enabled) {
      next();
      return;
    }

    const context = req.apiContext;
    if (!context) {
      res.status(500).json({ error: 'MISSING_CONTEXT', message: 'Request context not found' });
      return;
    }

    try {
      // Find matching schema for the route
      const schema = validationConfig.schemas.find(
        s => s.route === context.path && s.method === context.method
      );

      if (!schema) {
        if (validationConfig.strict) {
          res.status(400).json({ 
            error: 'NO_SCHEMA_FOUND',
            message: `No validation schema found for ${context.method} ${context.path}`
          });
          return;
        }
        next();
        return;
      }

      // Validate required fields
      const validationResults = validateRequestBody(schema, context.body);
      
      // Add validation results to context
      context.attributes.validationResults = validationResults;

      // Handle validation errors
      if (validationConfig.errorHandling === 'reject' && validationResults.errors.length > 0) {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          errors: validationResults.errors
        });
        return;
      }

      // Sanitize input if enabled
      if (validationConfig.sanitizeInput) {
        context.body = sanitizeRequestBody(context.body);
      }

      next();
    } catch (error) {
      logger.error('Request validation error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        context: context.id
      });

      if (validationConfig.errorHandling === 'reject') {
        res.status(500).json({ 
          error: 'VALIDATION_ERROR',
          message: 'Validation processing failed'
        });
        return;
      }

      next();
    }
  };
};

/**
 * Request Transformation Middleware
 */
export const requestTransformationMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = req.apiContext;
    if (!context) {
      next();
      return;
    }

    try {
      // Transform query parameters
      req.query = transformQueryParameters(req.query);
      
      // Transform request body
      if (req.body && typeof req.body === 'object') {
        req.body = transformRequestBody(req.body);
      }

      // Add request metadata
      context.attributes.requestSize = JSON.stringify(req.body || {}).length;
      context.attributes.requestHeaders = Object.keys(req.headers).length;

      next();
    } catch (error) {
      logger.error('Request transformation error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        context: context.id
      });
      next();
    }
  };
};

/**
 * Response Transformation Middleware
 */
export const responseTransformationMiddleware = (gatewayService: APIGatewayService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = req.apiContext;
    if (!context) {
      next();
      return;
    }

    // Override res.json to transform responses
    const originalJson = res.json;
    res.json = function(body: any) {
      // Transform response
      const transformedBody = transformResponseBody(body, context);
      
      // Add response metadata
      const responseMetadata = {
        timestamp: new Date().toISOString(),
        requestId: context.id,
        processingTime: Date.now() - context.startTime,
        userId: context.user?.id
      };

      // Add metadata if configured
      if (context.attributes.includeMetadata) {
        transformedBody._metadata = responseMetadata;
      }

      return originalJson.call(this, transformedBody);
    };

    next();
  };
};

/**
 * Security Headers Middleware
 */
export const securityHeadersMiddleware = (config: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (config.hsts.enabled) {
      res.setHeader('Strict-Transport-Security', 
        `max-age=${config.hsts.maxAge}${config.hsts.includeSubDomains ? '; includeSubDomains' : ''}${config.hsts.preload ? '; preload' : ''}`);
    }

    if (config.xssProtection.enabled) {
      res.setHeader('X-XSS-Protection', `1; mode=${config.xssProtection.mode}`);
    }

    if (config.contentTypeOptions.enabled) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (config.frameOptions.enabled) {
      res.setHeader('X-Frame-Options', config.frameOptions.policy);
    }

    if (config.referrerPolicy.enabled) {
      res.setHeader('Referrer-Policy', config.referrerPolicy.policy);
    }

    // Content Security Policy
    if (config.contentSecurityPolicy?.enabled) {
      const directives = Object.entries(config.contentSecurityPolicy.directives)
        .map(([key, value]) => `${key} ${value}`)
        .join('; ');
      res.setHeader('Content-Security-Policy', directives);
    }

    next();
  };
};

/**
 * CORS Configuration Middleware
 */
export const corsMiddleware = (config: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set CORS headers based on configuration
    if (config.origin === true) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    } else if (Array.isArray(config.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', config.origin);
    }

    res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    
    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Max-Age', config.maxAge.toString());

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(config.optionsSuccessStatus).end();
      return;
    }

    next();
  };
};

/**
 * Request ID Middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || 
                   req.headers['x-correlation-id'] as string ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;
  
  next();
};

/**
 * Request Logging Middleware
 */
export const requestLoggingMiddleware = (config: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Log request
    if (config.enabled) {
      const logData = {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: getClientIP(req),
        userId: req.auth?.user?.id,
        timestamp: new Date().toISOString()
      };

      if (config.includeHeaders) {
        logData.headers = config.redactSensitiveData ? redactHeaders(req.headers) : req.headers;
      }

      logger.info('Incoming request', logData);
    }

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      if (config.enabled) {
        logger.info('Request completed', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userId: req.auth?.user?.id,
          ip: getClientIP(req)
        });
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Circuit Breaker Middleware
 */
export const circuitBreakerMiddleware = (config: any) => {
  const circuitBreakers = new Map<string, any>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const serviceKey = `${req.method}:${req.path}`;
    
    // Get or create circuit breaker for this service
    let circuitBreaker = circuitBreakers.get(serviceKey);
    if (!circuitBreaker) {
      circuitBreaker = createCircuitBreaker(config);
      circuitBreakers.set(serviceKey, circuitBreaker);
    }

    // Check circuit state
    if (circuitBreaker.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - circuitBreaker.lastFailureTime > config.recoveryTimeout) {
        circuitBreaker.state = 'half-open';
      } else {
        res.status(503).json({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Circuit breaker is open'
        });
        return;
      }
    }

    try {
      await circuitBreaker.fire();
      next();
    } catch (error) {
      circuitBreaker.recordFailure();
      
      if (circuitBreaker.state === 'half-open') {
        // Half-open test failed, go back to open
        circuitBreaker.state = 'open';
      }

      res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable'
      });
    }
  };
};

// Helper functions

function extractAuthRequest(req: Request): AuthenticationRequest | undefined {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader?.startsWith('Bearer ')) {
    return {
      provider: 'jwt',
      credentials: {
        token: authHeader.substring(7)
      },
      clientInfo: extractClientInfo(req)
    };
  }

  if (apiKey) {
    return {
      provider: 'api_key',
      credentials: {
        apiKey
      },
      clientInfo: extractClientInfo(req)
    };
  }

  return undefined;
}

function extractClientInfo(req: Request): any {
  return {
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'] as string,
    platform: req.headers['sec-ch-ua-platform'] as string,
    deviceType: detectDeviceType(req.headers['user-agent'] as string)
  };
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         (req.headers['x-real-ip'] as string) || 
         req.socket?.remoteAddress || 
         'unknown';
}

function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'api' {
  if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    return 'api';
  }
  if (userAgent.includes('tablet')) {
    return 'tablet';
  }
  if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
    return 'mobile';
  }
  return 'desktop';
}

function validateRequestBody(schema: any, body: any): any {
  const errors: any[] = [];
  const warnings: any[] = [];

  // Basic validation logic
  if (schema.requiredFields) {
    for (const field of schema.requiredFields) {
      if (!body || body[field] === undefined || body[field] === null) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `Required field '${field}' is missing`
        });
      }
    }
  }

  return { errors, warnings };
}

function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove null bytes and dangerous characters
  const recursiveSanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\x00/g, '').trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(recursiveSanitize);
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = recursiveSanitize(value);
      }
      return result;
    }
    
    return obj;
  };

  return recursiveSanitize(sanitized);
}

function transformQueryParameters(query: any): any {
  const transformed = { ...query };
  
  // Convert string numbers to actual numbers
  for (const [key, value] of Object.entries(transformed)) {
    if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
      transformed[key] = Number(value);
    }
  }
  
  return transformed;
}

function transformRequestBody(body: any): any {
  // Add any request body transformations here
  return body;
}

function transformResponseBody(body: any, context: RequestContext): any {
  // Add any response body transformations here
  return body;
}

function redactHeaders(headers: any): any {
  const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
  const redacted = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (redacted[header]) {
      redacted[header] = '[REDACTED]';
    }
  }
  
  return redacted;
}

function createCircuitBreaker(config: any): any {
  return {
    state: 'closed',
    failureCount: 0,
    lastFailureTime: 0,
    async fire(): Promise<void> {
      // Simulate circuit breaker logic
      return Promise.resolve();
    },
    recordFailure(): void {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= config.failureThreshold) {
        this.state = 'open';
      }
    }
  };
}

/**
 * Rate Limit Headers Middleware
 * Injects standard rate limit headers into all responses
 */
export const rateLimitHeadersMiddleware = (gatewayService?: APIGatewayService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original setHeader
    const originalSetHeader = res.setHeader.bind(res);
    
    // Override setHeader to inject rate limit info from context
    res.setHeader = (name: string, value: string | number) => {
      // Let the original headers be set
      return originalSetHeader(name, value);
    };
    
    // Inject rate limit headers if available in context
    const context = (req as any).apiContext;
    if (context?.attributes) {
      const { rateLimitLimit, rateLimitRemaining, rateLimitReset } = context.attributes;
      
      if (rateLimitLimit !== undefined) {
        originalSetHeader('X-RateLimit-Limit', rateLimitLimit.toString());
      }
      if (rateLimitRemaining !== undefined) {
        originalSetHeader('X-RateLimit-Remaining', rateLimitRemaining.toString());
      }
      if (rateLimitReset) {
        originalSetHeader('X-RateLimit-Reset', rateLimitReset);
      }
    }
    
    next();
  };
};

/**
 * Create API Gateway middleware configuration
 */
export function createGatewayMiddlewareConfig(overrides?: Partial<APIGatewayServiceConfig>): APIGatewayServiceConfig {
  return {
    id: 'api-gateway',
    name: 'Insurance Lead Gen API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV as any || 'development',
    enabled: true,
    rateLimits: {
      global: {
        requests: 1000,
        windowMs: 60000,
        strategy: 'sliding'
      },
      perRoute: {},
      perUser: {},
      burstLimit: 50
    },
    security: {
      jwt: {
        secret: process.env.JWT_SECRET || 'secret',
        algorithm: 'HS256',
        expiresIn: '1h',
        refreshTokenExpiresIn: '7d',
        issuer: 'insurance-lead-gen',
        audience: 'api',
        enableBlacklisting: true,
        leeway: 60
      },
      apiKeys: {
        enabled: true,
        headerName: 'X-API-Key',
        prefix: 'ak_',
        hashAlgorithm: 'sha256',
        rotationInterval: 90 * 24 * 60 * 60 * 1000,
        allowedScopes: ['read', 'write', 'admin']
      },
      oauth: {
        providers: [],
        redirectUris: [],
        stateExpiry: 600000,
        enableStateValidation: true,
        enableNonceValidation: false
      },
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || false
          : true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
        exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        credentials: true,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204
      },
      csrf: {
        enabled: false,
        headerName: 'X-CSRF-Token',
        cookieName: 'csrf_token',
        cookieOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/'
        },
        tokenLength: 32,
        excludedRoutes: ['/health', '/metrics', '/api/v1/auth/login']
      },
      headers: {
        hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true, preload: true },
        xssProtection: { enabled: true, mode: 'block' },
        contentTypeOptions: { enabled: true },
        frameOptions: { enabled: true, policy: 'SAMEORIGIN' },
        referrerPolicy: { enabled: true, policy: 'strict-origin-when-cross-origin' }
      },
      inputValidation: {
        enabled: true,
        sanitizeInput: true,
        removeNullBytes: true,
        maxPayloadSize: 10485760,
        allowedContentTypes: [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data'
        ],
        blockedPatterns: [
          '/\\$\\{.*\\}/',
          '/\\$\\(.*\\)/',
          '/script/i',
          '/union\\s+select/i',
          '/--.*$/m'
        ],
        customValidators: []
      },
      auditLogging: true,
      encryptionAtRest: true
    },
    routing: {
      services: [],
      loadBalancer: {
        algorithm: 'round_robin',
        stickySession: false
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 30000
      }
    },
    monitoring: {
      enabled: true,
      metrics: {
        enabled: true,
        interval: 15000
      },
      logging: {
        enabled: true,
        level: 'info'
      },
      alerting: {
        enabled: true,
        rules: [],
        channels: []
      }
    },
    ...overrides
  } as APIGatewayServiceConfig;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      apiContext?: RequestContext;
      auth?: any;
      requestId?: string;
    }
  }
}