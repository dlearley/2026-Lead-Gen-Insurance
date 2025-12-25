import { Request, Response, NextFunction } from 'express';
import { logger } from '@insurance-lead-gen/core';

// Simple API key authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  // In production, this would validate against a database or config
  // For now, we'll use a simple check
  const validApiKey = process.env.API_KEY || 'dev-key-12345';

  if (apiKey === validApiKey) {
    logger.debug('Authenticated request', { apiKey: '***REDACTED***' });
    next();
  } else {
    logger.warn('Unauthorized request attempt', { providedKey: apiKey });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }
};

export { authMiddleware };