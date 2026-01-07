/**
 * Response Compression Middleware
 * Compresses API responses to reduce bandwidth usage
 */

import compression from 'compression';
import { Request, Response } from 'express';
import type { ResponseCompressionConfig } from '@insurance-lead-gen/types';

export function createCompressionMiddleware(config?: Partial<ResponseCompressionConfig>) {
  const defaultConfig: ResponseCompressionConfig = {
    enabled: true,
    threshold: 1024,
    level: 6,
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }

      return compression.filter(req, res);
    },
    ...config,
  };

  if (!defaultConfig.enabled) {
    return (req: Request, res: Response, next: () => void) => next();
  }

  return compression({
    threshold: defaultConfig.threshold,
    level: defaultConfig.level,
    filter: defaultConfig.filter,
  });
}
