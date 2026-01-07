import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, rateLimitMiddleware, errorHandlerMiddleware } from '../middleware';
import { testStore, testUser, mockAuthMiddleware } from './setup';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should call next() with valid Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer valid_token_123' };
      
      // Mock successful token validation
      jest.spyOn(require('../utils/auth'), 'validateToken').mockReturnValue({
        valid: true,
        payload: { userId: testUser.id },
      });

      authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', () => {
      authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'No authorization header' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', () => {
      mockReq.headers = { authorization: 'InvalidFormat token123' };
      
      authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      mockReq.headers = { authorization: 'Bearer expired_token' };
      
      jest.spyOn(require('../utils/auth'), 'validateToken').mockReturnValue({
        valid: false,
        error: 'Token expired',
      });

      authMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('mockAuthMiddleware', () => {
    it('should set user on request', () => {
      mockAuthMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(mockReq.user).toEqual(testUser);
      expect(nextFn).toHaveBeenCalled();
    });
  });
});

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockRateLimiter: any;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/v1/leads',
      method: 'POST',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Mock rate limiter
    mockRateLimiter = {
      consume: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue({ remaining: 100 }),
    };
    jest.doMock('rate-limiter-flexible', () => ({
      RateLimiterMemory: jest.fn().mockImplementation(() => mockRateLimiter),
    }));
  });

  it('should allow request within rate limit', async () => {
    const { rateLimitMiddleware } = await import('../middleware');
    await rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set rate limit headers', async () => {
    const { rateLimitMiddleware } = await import('../middleware');
    await rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
  });

  it('should block request when rate limit exceeded', async () => {
    mockRateLimiter.consume.mockRejectedValue(new Error('Rate limit exceeded'));
    
    const { rateLimitMiddleware } = await import('../middleware');
    await rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too Many Requests',
    }));
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation failed');
    (error as any).statusCode = 400;
    (error as any).isOperational = true;

    errorHandlerMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should handle 404 errors', () => {
    const error = new Error('Not found');
    (error as any).statusCode = 404;

    errorHandlerMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Not found',
    }));
  });

  it('should handle internal server errors', () => {
    const error = new Error('Something went wrong');

    errorHandlerMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Internal server error',
    }));
  });

  it('should not expose internal error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Database connection failed');

    errorHandlerMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Internal server error',
    }));
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should preserve custom status codes', () => {
    const error = new Error('Custom error');
    (error as any).statusCode = 422;

    errorHandlerMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(422);
  });
});

describe('Input Sanitization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        firstName: 'John<script>',
        lastName: 'Doe',
        email: 'test@example.com',
        metadata: {
          notes: 'Some notes with SQL injection attempt: SELECT * FROM users',
        },
      },
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should sanitize script tags from input', () => {
    const { inputSanitizationMiddleware } = require('../middleware');
    inputSanitizationMiddleware(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.firstName).not.toContain('<script>');
  });

  it('should escape HTML characters', () => {
    const { inputSanitizationMiddleware } = require('../middleware');
    mockReq.body = { description: '<div>Test</div>' };
    
    inputSanitizationMiddleware(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.description).not.toContain('<div>');
  });

  it('should sanitize nested objects', () => {
    const { inputSanitizationMiddleware } = require('../middleware');
    
    inputSanitizationMiddleware(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.metadata.notes).not.toContain('SELECT * FROM');
  });
});

describe('Security Headers Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should set security headers', () => {
    const { securityHeadersMiddleware } = require('../middleware');
    securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set Content-Security-Policy header', () => {
    const { securityHeadersMiddleware } = require('../middleware');
    securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("default-src 'self'"));
  });
});
