import { Counter, Histogram, Gauge, Registry, register } from 'prom-client';

export class EnhancedMetrics {
  private readonly registry: Registry;
  
  // Database metrics
  private readonly dbOperationLatency: Histogram<string>;
  private readonly dbConnections: Gauge<string>;
  
  // Cache metrics
  private readonly cacheHitRate: Gauge<string>;
  private readonly cacheLatency: Histogram<string>;
  
  // Business metrics
  private readonly leadsConverted: Counter<string>;
  private readonly revenue: Counter<string>;
  private readonly customerAcquisitionCost: Gauge<string>;

  constructor(serviceName: string) {
    this.registry = register;

    this.dbOperationLatency = new Histogram({
      name: 'database_operation_duration_seconds',
      help: 'Duration of database operations',
      labelNames: ['operation', 'table', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.dbConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database', 'service'],
      registers: [this.registry],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['cache_type', 'service'],
      registers: [this.registry],
    });

    this.cacheLatency = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations',
      labelNames: ['operation', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.05],
      registers: [this.registry],
    });

    this.leadsConverted = new Counter({
      name: 'leads_converted_total',
      help: 'Total number of leads converted',
      labelNames: ['source', 'service'],
      registers: [this.registry],
    });

    this.revenue = new Counter({
      name: 'revenue_total',
      help: 'Total revenue generated in USD',
      labelNames: ['source', 'service'],
      registers: [this.registry],
    });

    this.customerAcquisitionCost = new Gauge({
      name: 'customer_acquisition_cost',
      help: 'Customer acquisition cost in USD',
      labelNames: ['source', 'service'],
      registers: [this.registry],
    });
  }

  recordDbLatency(operation: string, table: string, service: string, duration: number) {
    this.dbOperationLatency.labels(operation, table, service).observe(duration);
  }

  recordRevenue(source: string, service: string, amount: number) {
    this.revenue.labels(source, service).inc(amount);
  }

  recordLeadConversion(source: string, service: string) {
    this.leadsConverted.labels(source, service).inc();
  }
}
