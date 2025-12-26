import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsInProgress: Gauge<string>;

  constructor() {
    // HTTP requests counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status', 'service'],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    // In-progress requests gauge
    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path', 'service'],
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const service = 'api';

    // Increment in-progress counter
    this.httpRequestsInProgress.labels(req.method, req.path, service).inc();

    // Hook into response finish event
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      
      // Decrement in-progress counter
      this.httpRequestsInProgress.labels(req.method, req.path, service).dec();

      // Record metrics
      this.httpRequestsTotal.labels(
        req.method,
        req.path,
        res.statusCode.toString(),
        service
      ).inc();

      this.httpRequestDuration.labels(
        req.method,
        req.path,
        res.statusCode.toString(),
        service
      ).observe(duration);
    });

    next();
  }
}

// Export Prometheus registry
export { register };
