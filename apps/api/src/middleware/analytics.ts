import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram } from 'prom-client';

// Metrics
const apiRequestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'endpoint', 'status', 'customer_id'],
});

const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'endpoint', 'status', 'customer_id'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const apiAnalyticsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const user: any = req.user;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const customerId = (user?.organizationId as string) || 'anonymous';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const route: any = req.route;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const path = (route?.path as string) || req.path;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    apiRequestCounter.inc({
      method: req.method,
      endpoint: path,
      status: res.statusCode,
      customer_id: customerId,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    apiRequestDuration.observe(
      {
        method: req.method,
        endpoint: path,
        status: res.statusCode,
        customer_id: customerId,
      },
      duration
    );
  });

  next();
};
