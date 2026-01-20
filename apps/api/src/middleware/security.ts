import type { Request, Response, NextFunction } from 'express';
import { logger } from '@insurance-lead-gen/core';

export function createInputSanitizer() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Basic input sanitization
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  };
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
}

function sanitizeString(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove null bytes and trim
  return value.replace(/\x00/g, '').trim();
}