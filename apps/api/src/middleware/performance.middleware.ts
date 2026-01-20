/**
 * Performance Monitoring Middleware
 * Tracks API request performance in real-time
 */

import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service.js';

export function createPerformanceMonitoringMiddleware(
  monitoringService: PerformanceMonitoringService
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const path = req.route?.path || req.path;
    const method = req.method;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const error = res.statusCode >= 400;
      
      monitoringService.recordApiRequest(
        path,
        method,
        duration,
        res.statusCode,
        error
      );
    });

    next();
  };
}

/**
 * Query performance tracking middleware
 */
export function createQueryTrackingMiddleware(
  monitoringService: PerformanceMonitoringService
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const queryStartTime = Date.now();

    // Track database operations if using Prisma
    const prisma = (req as any).prisma;
    if (prisma) {
      const originalQuery = prisma.$queryRawUnsafe.bind(prisma);
      prisma.$queryRawUnsafe = async (...args: any[]) => {
        const start = Date.now();
        try {
          const result = await originalQuery(...args);
          monitoringService.recordQuery(args[0], Date.now() - start);
          return result;
        } catch (error) {
          monitoringService.recordQuery(args[0], Date.now() - start);
          throw error;
        }
      };
    }

    next();
  };
}

/**
 * Response time tracking helper
 */
export function trackResponseTime(
  monitoringService: PerformanceMonitoringService,
  operation: string
) {
  const startTime = Date.now();

  return () => {
    const duration = Date.now() - startTime;
    monitoringService.recordApiRequest(operation, 'INTERNAL', duration, 200, false);
    return duration;
  };
}
