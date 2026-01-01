import { Counter, Histogram, Gauge, register, Registry } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export class MetricsCollector {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsInProgress: Gauge<string>;
  private readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.registry = register;

    // Initialize default metrics (CPU, memory, etc.)
    this.registry.setDefaultLabels({
      service: serviceName,
    });

    // HTTP requests counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status', 'service'],
      registers: [this.registry],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // In-progress requests gauge
    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path', 'service'],
      registers: [this.registry],
    });

    // Cache metrics
    this.createCounter('cache_hits_total', 'Total number of cache hits', ['type']);
    this.createCounter('cache_misses_total', 'Total number of cache misses', ['type']);

    // Database metrics
    this.createHistogram('database_query_duration_seconds', 'Duration of database queries', ['operation', 'table']);
  }

  /**
   * Express middleware to collect HTTP metrics
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = Date.now();

      // Increment in-progress counter
      this.httpRequestsInProgress.labels(req.method, req.path, this.serviceName).inc();

      // Hook into response finish event
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        // Decrement in-progress counter
        this.httpRequestsInProgress.labels(req.method, req.path, this.serviceName).dec();

        // Record metrics
        this.httpRequestsTotal.labels(
          req.method,
          req.path,
          res.statusCode.toString(),
          this.serviceName
        ).inc();

        this.httpRequestDuration.labels(
          req.method,
          req.path,
          res.statusCode.toString(),
          this.serviceName
        ).observe(duration);
      });

      next();
    };
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get content type for metrics
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Create a custom counter
   */
  createCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    return new Counter({
      name,
      help,
      labelNames: [...labelNames, 'service'],
      registers: [this.registry],
    });
  }

  /**
   * Create a custom histogram
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): Histogram<string> {
    return new Histogram({
      name,
      help,
      labelNames: [...labelNames, 'service'],
      buckets,
      registers: [this.registry],
    });
  }

  /**
   * Create a custom gauge
   */
  createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    return new Gauge({
      name,
      help,
      labelNames: [...labelNames, 'service'],
      registers: [this.registry],
    });
  }
}

// Business metrics for lead processing
export class LeadMetrics {
  private readonly leadsProcessed: Counter<string>;
  private readonly leadsConverted: Counter<string>;
  private readonly leadsQueueDepth: Gauge<string>;
  private readonly leadProcessingDuration: Histogram<string>;
  private readonly leadScoringDuration: Histogram<string>;

  constructor(registry: Registry, serviceName: string) {
    this.leadsProcessed = new Counter({
      name: 'leads_processed_total',
      help: 'Total number of leads processed',
      labelNames: ['status', 'source', 'service'],
      registers: [registry],
    });

    this.leadsConverted = new Counter({
      name: 'leads_converted_total',
      help: 'Total number of leads converted to policies',
      labelNames: ['type', 'service'],
      registers: [registry],
    });

    this.leadsQueueDepth = new Gauge({
      name: 'leads_queue_depth',
      help: 'Current depth of lead processing queue',
      labelNames: ['queue', 'service'],
      registers: [registry],
    });

    this.leadProcessingDuration = new Histogram({
      name: 'lead_processing_duration_seconds',
      help: 'Time taken to process a lead',
      labelNames: ['status', 'service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    });

    this.leadScoringDuration = new Histogram({
      name: 'lead_scoring_duration_seconds',
      help: 'Time taken to score a lead with AI',
      labelNames: ['model', 'service'],
      buckets: [0.5, 1, 2, 5, 10, 20],
      registers: [registry],
    });
  }

  recordLeadProcessed(status: string, source: string, service: string): void {
    this.leadsProcessed.labels(status, source, service).inc();
  }

  recordLeadConverted(type: string, service: string): void {
    this.leadsConverted.labels(type, service).inc();
  }

  setQueueDepth(queue: string, service: string, depth: number): void {
    this.leadsQueueDepth.labels(queue, service).set(depth);
  }

  recordProcessingDuration(status: string, service: string, duration: number): void {
    this.leadProcessingDuration.labels(status, service).observe(duration);
  }

  recordScoringDuration(model: string, service: string, duration: number): void {
    this.leadScoringDuration.labels(model, service).observe(duration);
  }
}

// AI model metrics
export class AIMetrics {
  private readonly aiModelCalls: Counter<string>;
  private readonly aiModelLatency: Histogram<string>;
  private readonly aiModelErrors: Counter<string>;
  private readonly aiAPICost: Counter<string>;

  constructor(registry: Registry, serviceName: string) {
    this.aiModelCalls = new Counter({
      name: 'ai_model_calls_total',
      help: 'Total number of AI model API calls',
      labelNames: ['model', 'status', 'service'],
      registers: [registry],
    });

    this.aiModelLatency = new Histogram({
      name: 'ai_model_latency_seconds',
      help: 'Latency of AI model API calls',
      labelNames: ['model', 'service'],
      buckets: [0.5, 1, 2, 5, 10, 20, 30],
      registers: [registry],
    });

    this.aiModelErrors = new Counter({
      name: 'ai_model_errors_total',
      help: 'Total number of AI model errors',
      labelNames: ['model', 'error_type', 'service'],
      registers: [registry],
    });

    this.aiAPICost = new Counter({
      name: 'ai_api_cost_total',
      help: 'Total cost of AI API calls in USD',
      labelNames: ['model', 'service'],
      registers: [registry],
    });
  }

  recordModelCall(model: string, status: string, service: string): void {
    this.aiModelCalls.labels(model, status, service).inc();
  }

  recordModelLatency(model: string, service: string, latency: number): void {
    this.aiModelLatency.labels(model, service).observe(latency);
  }

  recordModelError(model: string, errorType: string, service: string): void {
    this.aiModelErrors.labels(model, errorType, service).inc();
  }

  recordAPICost(model: string, service: string, cost: number): void {
    this.aiAPICost.labels(model, service).inc(cost);
  }
}
