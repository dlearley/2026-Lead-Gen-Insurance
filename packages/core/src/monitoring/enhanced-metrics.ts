/**
 * Enhanced Prometheus Metrics
 * 
 * Comprehensive metrics collection including:
 * - HTTP request/response metrics
 * - Lead processing metrics
 * - AI model performance metrics
 * - Queue metrics
 * - Database metrics
 * - Observability cost tracking
 */

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

export interface MetricsConfig {
  namespace?: string;
  serviceName: string;
  environment?: string;
  labels?: Record<string, string>;
}

/**
 * HTTP Metrics
 */
export interface HttpMetrics {
  requests: Counter<string>;
  responseTime: Histogram<string>;
  errors: Counter<string>;
  activeRequests: Gauge<string>;
}

/**
 * Lead Metrics
 */
export interface LeadMetrics {
  ingested: Counter<string>;
  qualified: Counter<string>;
  routed: Counter<string>;
  converted: Counter<string>;
  processingTime: Histogram<string>;
  scoreDistribution: Histogram<string>;
}

/**
 * AI Metrics
 */
export interface AIMetrics {
  requests: Counter<string>;
  latency: Histogram<string>;
  costs: Counter<string>;
  tokens: Counter<string>;
  errors: Counter<string>;
  modelAccuracy: Gauge<string>;
}

/**
 * Queue Metrics
 */
export interface QueueMetrics {
  jobsProcessed: Counter<string>;
  jobsFailed: Counter<string>;
  processingTime: Histogram<string>;
  queueDepth: Gauge<string>;
  retryCount: Counter<string>;
}

/**
 * Database Metrics
 */
export interface DatabaseMetrics {
  queries: Counter<string>;
  queryDuration: Histogram<string>;
  connections: Gauge<string>;
  connectionErrors: Counter<string>;
  slowQueries: Counter<string>;
}

/**
 * Observability Cost Metrics
 */
export interface ObservabilityCostMetrics {
  tracesExported: Counter<string>;
  logsExported: Counter<string>;
  metricsExported: Counter<string>;
  costTraces: Counter<string>;
  costLogs: Counter<string>;
  costMetrics: Counter<string>;
  totalCost: Counter<string>;
  costRatio: Gauge<string>;
}

export class EnhancedMetricsService {
  private registry: Registry;
  private httpMetrics: HttpMetrics;
  private leadMetrics: LeadMetrics;
  private aiMetrics: AIMetrics;
  private queueMetrics: QueueMetrics;
  private databaseMetrics: DatabaseMetrics;
  private observabilityCostMetrics: ObservabilityCostMetrics;
  private defaultLabels: Record<string, string>;

  constructor(config: MetricsConfig) {
    this.defaultLabels = {
      service: config.serviceName,
      environment: config.environment || process.env.NODE_ENV || 'development',
      ...config.labels,
    };

    this.registry = new Registry();
    this.registry.setDefaultLabels(this.defaultLabels);

    // Initialize all metric types
    this.httpMetrics = this.initHttpMetrics();
    this.leadMetrics = this.initLeadMetrics();
    this.aiMetrics = this.initAIMetrics();
    this.queueMetrics = this.initQueueMetrics();
    this.databaseMetrics = this.initDatabaseMetrics();
    this.observabilityCostMetrics = this.initObservabilityCostMetrics();
  }

  /**
   * Initialize HTTP metrics
   */
  private initHttpMetrics(): HttpMetrics {
    const namespace = this.defaultLabels.service;

    return {
      requests: new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [this.registry],
      }),

      responseTime: new Histogram({
        name: 'http_response_time_seconds',
        help: 'HTTP response time in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [this.registry],
      }),

      errors: new Counter({
        name: 'http_errors_total',
        help: 'Total number of HTTP errors',
        labelNames: ['method', 'route', 'status_code'],
        registers: [this.registry],
      }),

      activeRequests: new Gauge({
        name: 'http_active_requests',
        help: 'Number of active HTTP requests',
        labelNames: ['method', 'route'],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Initialize Lead metrics
   */
  private initLeadMetrics(): LeadMetrics {
    return {
      ingested: new Counter({
        name: 'leads_ingested_total',
        help: 'Total number of leads ingested',
        labelNames: ['source', 'type'],
        registers: [this.registry],
      }),

      qualified: new Counter({
        name: 'leads_qualified_total',
        help: 'Total number of leads qualified',
        labelNames: ['tier'],
        registers: [this.registry],
      }),

      routed: new Counter({
        name: 'leads_routed_total',
        help: 'Total number of leads routed',
        labelNames: ['agent_id', 'type'],
        registers: [this.registry],
      }),

      converted: new Counter({
        name: 'leads_converted_total',
        help: 'Total number of leads converted',
        labelNames: ['insurance_type'],
        registers: [this.registry],
      }),

      processingTime: new Histogram({
        name: 'lead_processing_time_seconds',
        help: 'Lead processing time in seconds',
        labelNames: ['stage'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [this.registry],
      }),

      scoreDistribution: new Histogram({
        name: 'lead_score_distribution',
        help: 'Lead score distribution',
        labelNames: ['insurance_type'],
        buckets: [0, 20, 40, 60, 80, 100],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Initialize AI metrics
   */
  private initAIMetrics(): AIMetrics {
    return {
      requests: new Counter({
        name: 'ai_requests_total',
        help: 'Total number of AI requests',
        labelNames: ['model', 'operation'],
        registers: [this.registry],
      }),

      latency: new Histogram({
        name: 'ai_latency_seconds',
        help: 'AI model latency in seconds',
        labelNames: ['model', 'operation'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
        registers: [this.registry],
      }),

      costs: new Counter({
        name: 'ai_costs_total',
        help: 'Total AI costs in USD',
        labelNames: ['model', 'operation'],
        registers: [this.registry],
      }),

      tokens: new Counter({
        name: 'ai_tokens_total',
        help: 'Total AI tokens consumed',
        labelNames: ['model', 'type'],
        registers: [this.registry],
      }),

      errors: new Counter({
        name: 'ai_errors_total',
        help: 'Total number of AI errors',
        labelNames: ['model', 'operation', 'error_type'],
        registers: [this.registry],
      }),

      modelAccuracy: new Gauge({
        name: 'ai_model_accuracy',
        help: 'AI model accuracy percentage',
        labelNames: ['model', 'operation'],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Initialize Queue metrics
   */
  private initQueueMetrics(): QueueMetrics {
    return {
      jobsProcessed: new Counter({
        name: 'queue_jobs_processed_total',
        help: 'Total number of jobs processed',
        labelNames: ['queue_name', 'status'],
        registers: [this.registry],
      }),

      jobsFailed: new Counter({
        name: 'queue_jobs_failed_total',
        help: 'Total number of failed jobs',
        labelNames: ['queue_name', 'error_type'],
        registers: [this.registry],
      }),

      processingTime: new Histogram({
        name: 'queue_job_processing_time_seconds',
        help: 'Job processing time in seconds',
        labelNames: ['queue_name', 'job_type'],
        buckets: [0.1, 0.5, 1, 5, 10, 30],
        registers: [this.registry],
      }),

      queueDepth: new Gauge({
        name: 'queue_depth',
        help: 'Current queue depth',
        labelNames: ['queue_name'],
        registers: [this.registry],
      }),

      retryCount: new Counter({
        name: 'queue_job_retries_total',
        help: 'Total number of job retries',
        labelNames: ['queue_name', 'job_type'],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Initialize Database metrics
   */
  private initDatabaseMetrics(): DatabaseMetrics {
    return {
      queries: new Counter({
        name: 'database_queries_total',
        help: 'Total number of database queries',
        labelNames: ['operation', 'table'],
        registers: [this.registry],
      }),

      queryDuration: new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
        registers: [this.registry],
      }),

      connections: new Gauge({
        name: 'database_connections',
        help: 'Number of database connections',
        labelNames: ['state'], // active, idle, total
        registers: [this.registry],
      }),

      connectionErrors: new Counter({
        name: 'database_connection_errors_total',
        help: 'Total number of database connection errors',
        labelNames: ['error_type'],
        registers: [this.registry],
      }),

      slowQueries: new Counter({
        name: 'database_slow_queries_total',
        help: 'Total number of slow queries (>100ms)',
        labelNames: ['operation', 'table'],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Initialize Observability Cost Metrics
   */
  private initObservabilityCostMetrics(): ObservabilityCostMetrics {
    // Cost constants (in USD)
    const TRACE_COST_PER_1M = 0.005; // $0.005 per million traces
    const LOG_COST_PER_GB = 0.50; // $0.50 per GB of logs
    const METRIC_COST_PER_SERIES = 0.00025; // $0.00025 per metric series per month

    return {
      tracesExported: new Counter({
        name: 'observability_traces_exported_total',
        help: 'Total number of traces exported',
        registers: [this.registry],
      }),

      logsExported: new Counter({
        name: 'observability_logs_exported_bytes',
        help: 'Total bytes of logs exported',
        registers: [this.registry],
      }),

      metricsExported: new Counter({
        name: 'observability_metrics_exported_total',
        help: 'Total number of metrics exported',
        registers: [this.registry],
      }),

      costTraces: new Counter({
        name: 'observability_cost_traces_usd',
        help: 'Total cost of traces in USD',
        registers: [this.registry],
      }),

      costLogs: new Counter({
        name: 'observability_cost_logs_usd',
        help: 'Total cost of logs in USD',
        registers: [this.registry],
      }),

      costMetrics: new Counter({
        name: 'observability_cost_metrics_usd',
        help: 'Total cost of metrics in USD',
        registers: [this.registry],
      }),

      totalCost: new Counter({
        name: 'observability_cost_total_usd',
        help: 'Total observability cost in USD',
        registers: [this.registry],
      }),

      costRatio: new Gauge({
        name: 'observability_cost_ratio_percent',
        help: 'Observability cost as percentage of infrastructure cost',
        registers: [this.registry],
      }),
    };
  }

  /**
   * Get HTTP metrics
   */
  getHttpMetrics(): HttpMetrics {
    return this.httpMetrics;
  }

  /**
   * Get Lead metrics
   */
  getLeadMetrics(): LeadMetrics {
    return this.leadMetrics;
  }

  /**
   * Get AI metrics
   */
  getAIMetrics(): AIMetrics {
    return this.aiMetrics;
  }

  /**
   * Get Queue metrics
   */
  getQueueMetrics(): QueueMetrics {
    return this.queueMetrics;
  }

  /**
   * Get Database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    return this.databaseMetrics;
  }

  /**
   * Get Observability Cost metrics
   */
  getObservabilityCostMetrics(): ObservabilityCostMetrics {
    return this.observabilityCostMetrics;
  }

  /**
   * Get metrics registry for Prometheus
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }

  /**
   * Shutdown metrics service
   */
  shutdown(): void {
    this.registry.clear();
  }

  /**
   * Record observability cost
   */
  recordObservabilityCost(infrastructureCostUsd: number): void {
    const { tracesExported, logsExported, metricsExported, costTraces, costLogs, costMetrics, totalCost, costRatio } = this.observabilityCostMetrics;

    // Get current values
    const traces = tracesExported.reset()?.values[0]?.value || 0;
    const logsBytes = logsExported.reset()?.values[0]?.value || 0;
    const metricsCount = metricsExported.reset()?.values[0]?.value || 0;

    // Calculate costs
    const traceCost = (traces / 1_000_000) * 0.005;
    const logCost = (logsBytes / (1024 * 1024 * 1024)) * 0.50;
    const metricCost = metricsCount * 0.00025;
    const totalObsCost = traceCost + logCost + metricCost;

    // Record costs
    costTraces.reset();
    costLogs.reset();
    costMetrics.reset();
    totalCost.reset();

    // Calculate ratio
    const ratio = infrastructureCostUsd > 0 ? (totalObsCost / infrastructureCostUsd) * 100 : 0;
    costRatio.set({ service: this.defaultLabels.service }, ratio);
  }
}
