import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AppError } from '../errors/app-error.js';
import type { ErrorContextData } from '../errors/error-metadata.js';
import { MetricsCollector } from '../monitoring/metrics.js';
import { logger } from '../logger.js';

export interface ErrorResponse {
  errorId: string;
  message: string;
  code: string;
  statusCode: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, unknown>;
  suggestedAction?: string;
  documentationUrl?: string;
  validationErrors?: Array<{
    field: string;
    type: string;
    message: string;
    path?: string[];
  }>;
}

/**
 * Extracts the request ID from the request object
 */
function getRequestId(req: Request): string {
  return (req as any).id || (req as any).requestId || (req as any).traceId || uuidv4();
}

/**
 * Builds error context from request
 */
function buildErrorContext(req: Request): ErrorContextData {
  return {
    requestId: getRequestId(req),
    traceId: (req as any).traceId,
    spanId: (req as any).spanId,
    service: 'api',
    operation: req.method + ' ' + req.path,
    affectedResource: req.path
  };
}

/**
 * Sanitizes sensitive information from request data
 */
function sanitizeRequestData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'access_token',
    'refresh_token'
  ];
  
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      }
    }
  }
  
  return sanitized;
}

/**
 * Extracts user information from request
 */
function getUserInfo(req: Request): string | undefined {
  const userId = (req as any).user?.id;
  const userEmail = (req as any).user?.email;
  const ip = req.ip || (req as any).connection?.remoteAddress;
  
  if (userId && userEmail) {
    return `${userId} (${userEmail})`;
  }
  
  return ip || undefined;
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  error: AppError,
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  statusCode: number
): ErrorResponse {
  const response: ErrorResponse = {
    errorId: error.id,
    message: error.userMessage || 'An unexpected error occurred',
    code: error.errorCode,
    statusCode,
    severity,
    retryable: error.retryable,
    suggestedAction: error.suggestedAction,
    details: error.metadata
  };

  if (error instanceof (require('../errors/validation-error.js').ValidationError)) {
    response.validationErrors = (error as any).fields;
  }

  if (error instanceof (require('../errors/rate-limit-error.js').RateLimitError)) {
    response.retryAfter = (error as any).retryAfter;
  }

  return response;
}

/**
 * Enhanced error handling middleware
 */
export function errorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();
    
    // Generate unique error ID if not present
    const errorId = uuidv4();
    
    // Build request context
    const userInfo = getUserInfo(req);
    const errorContext = buildErrorContext(req);
    
    // Sanitize request data
    const sanitizedBody = sanitizeRequestData(req.body as Record<string, unknown> || {});
    const sanitizedHeaders = sanitizeRequestData(req.headers as Record<string, unknown>);
    const sanitizedQuery = sanitizeRequestData(req.query as Record<string, unknown>);

    // Check if it's an AppError (structured error)
    const isAppError = error.constructor.name === 'AppError' || 
                      error.constructor.name === 'AppError' in error;
    
    if (isAppError) {
      const appError = error as AppError;
      
      // Determine HTTP status code and severity
      let statusCode = appError.httpStatusCode || 500;
      let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = appError.severity;
      
      // Client errors (4xx) should be info/low severity, server errors (5xx) high/critical
      if (statusCode >= 400 && statusCode < 500) {
        severity = 'low';
      } else if (statusCode >= 500) {
        severity = 'high';
        if (statusCode === 503 || statusCode === 504) {
          severity = 'critical';
        }
      }

      // Sanitize error metadata
      const sanitizedMetadata = sanitizeRequestData(appError.metadata);
      appError.metadata = sanitizedMetadata;

      // Create error response
      const errorResponse = createErrorResponse(appError, severity, statusCode);
      
      // Log based on severity
      const logData = {
        ...appError.toLogData(),
        requestId: errorContext.requestId,
        user: userInfo,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        duration: process.hrtime.bigint() - startTime,
        request: {
          body: sanitizedBody,
          headers: sanitizedHeaders,
          query: sanitizedQuery,
          params: req.params
        }
      };

      // Log with appropriate level
      if (severity === 'critical') {
        logger.error(logData);
        MetricsCollector.increment('error.critical.total', 1, { type: appError.errorCode });
      } else if (severity === 'high') {
        logger.error(logData);
        MetricsCollector.increment('error.high.total', 1, { type: appError.errorCode });
      } else if (severity === 'medium') {
        logger.warn(logData);
        MetricsCollector.increment('error.medium.total', 1, { type: appError.errorCode });
      } else {
        logger.warn(logData);
        MetricsCollector.increment('error.low.total', 1, { type: appError.errorCode });
      }

      // Track circuit breaker state if present
      if (req.app.locals.circuitBreakerStates) {
        errorResponse.details = {
          ...errorResponse.details,
          circuitBreaker: req.app.locals.circuitBreakerStates
        };
      }

      // Send response
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Handle unhandled errors (should not reach this middleware)
    const severity = 'critical';
    const statusCode = 500;
    
    // Create generic error response
    const errorResponse: ErrorResponse = {
      errorId,
      message: 'An unexpected error occurred',
      code: 'UNHANDLED_ERROR',
      statusCode,
      severity,
      retryable: false,
      details: {}
    };

    // Log unhandled error
    logger.error({
      errorId,
      type: error.constructor.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId: errorContext.requestId,
      user: userInfo,
      method: req.method,
      url: req.url,
      ip: req.ip,
      request: {
        body: sanitizedBody,
        headers: sanitizedHeaders,
        query: sanitizedQuery,
        params: req.params
      }
    });
    
    MetricsCollector.increment('error.unhandled.total', 1, { type: error.constructor.name });

    // Send response
    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Not found middleware for handling 404 errors
 */
export function notFoundHandler() {
  return (req: Request, res: Response): void => {
    const error = new (require('../errors/not-found-error.js').NotFoundError)(
      `Endpoint ${req.method} ${req.path} not found`,
      {
        service: 'api',
        operation: req.method + ' ' + req.path,
        affectedResource: req.path
      }
    );
    
    res.status(404).json({
      errorId: error.id,
      message: error.userMessage,
      code: error.errorCode,
      statusCode: 404,
      severity: 'low',
      retryable: false,
      suggestedAction: 'Please verify the endpoint URL and try again.',
      details: error.metadata
    });
  };
}

/**
 * Creates a middleware that validates required parameters
 */
export function validateRequiredParams(...requiredParams: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingParams: string[] = [];
    
    requiredParams.forEach(param => {
      if (!(req.query[param] || req.params[param] || req.body[param])) {
        missingParams.push(param);
      }
    });
    
    if (missingParams.length > 0) {
      const ValidationError = require('../errors/validation-error.js').ValidationError;
      const error = new ValidationError(
        `Missing required parameters: ${missingParams.join(', ')}`,
        missingParams.map(param => ({
          field: param,
          type: 'required',
          message: `${param} is required`
        })),
        {
          service: 'api',
          operation: req.method + ' ' + req.path
        }
      );
      
      res.status(400).json(error.toJSON());
      return;
    }
    
    next();
  };
}

export { ErrorResponse };