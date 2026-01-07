import { Counter, Histogram, Gauge, register, Registry } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { updateSLOMetrics } from './slos';

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

        // Update SLO metrics
        const success = res.statusCode < 500;
        try {
          updateSLOMetrics('api_availability', this.serviceName, success ? 1 : 0, duration * 1000);
          updateSLOMetrics('api_latency_p95', this.serviceName, success ? 1 : 0, duration * 1000);
        } catch (error) {
          console.error('Error updating SLO metrics:', error);
        }
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

    // Update SLO metrics for lead processing
    try {
      const success = status === 'success' || status === 'completed';
      updateSLOMetrics('lead_processing_success_rate', service, success ? 1 : 0);
    } catch (error) {
      console.error('Error updating lead processing SLO metrics:', error);
    }
  }

  recordLeadConverted(type: string, service: string): void {
    this.leadsConverted.labels(type, service).inc();
  }

  setQueueDepth(queue: string, service: string, depth: number): void {
    this.leadsQueueDepth.labels(queue, service).set(depth);
  }

  recordProcessingDuration(status: string, service: string, duration: number): void {
    this.leadProcessingDuration.labels(status, service).observe(duration);

    // Update latency SLO metrics
    try {
      updateSLOMetrics('orchestrator_latency_p95', service, status === 'success' ? 1 : 0, duration * 1000);
    } catch (error) {
      console.error('Error updating orchestrator latency SLO metrics:', error);
    }
  }

  recordScoringDuration(model: string, service: string, duration: number): void {
    this.leadScoringDuration.labels(model, service).observe(duration);

    // Update AI model SLO metrics
    try {
      updateSLOMetrics('ai_model_latency_p95', service, 1, duration * 1000);
      updateSLOMetrics('ai_model_success_rate', service, 1);
    } catch (error) {
      console.error('Error updating AI model SLO metrics:', error);
    }
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

    // Update AI model SLO metrics
    try {
      const success = status === 'success' || status === 'completed';
      updateSLOMetrics('ai_model_success_rate', service, success ? 1 : 0);
    } catch (error) {
      console.error('Error updating AI model success SLO metrics:', error);
    }
  }

  recordModelLatency(model: string, service: string, latency: number): void {
    this.aiModelLatency.labels(model, service).observe(latency);

    // Update AI latency SLO metrics
    try {
      updateSLOMetrics('ai_model_latency_p95', service, 1, latency * 1000);
    } catch (error) {
      console.error('Error updating AI model latency SLO metrics:', error);
    }
  }

  recordModelError(model: string, errorType: string, service: string): void {
    this.aiModelErrors.labels(model, errorType, service).inc();

    // Update AI model SLO metrics for errors
    try {
      updateSLOMetrics('ai_model_success_rate', service, 0);
    } catch (error) {
      console.error('Error updating AI model error SLO metrics:', error);
    }
  }

  recordAPICost(model: string, service: string, cost: number): void {
    this.aiAPICost.labels(model, service).inc(cost);
  }
}

// Onboarding & activation metrics
export class OnboardingMetrics {
  private readonly sessionsStarted: Counter<string>;
  private readonly stepCompleted: Counter<string>;
  private readonly stepDurationSeconds: Histogram<string>;
  private readonly timeToFirstLeadDays: Histogram<string>;
  private readonly timeToCompletionHours: Histogram<string>;
  private readonly sessionsByStatus: Gauge<string>;
  private readonly funnelReached: Gauge<string>;
  private readonly abandonedSignups: Gauge<string>;
  private readonly atRiskByLevel: Gauge<string>;
  private readonly averageCompletionPct: Gauge<string>;
  private readonly feedbackSubmitted: Counter<string>;
  private readonly npsScore: Gauge<string>;
  private readonly feedbackResponseRate: Gauge<string>;

  constructor(registry: Registry, serviceName: string) {
    this.sessionsStarted = new Counter({
      name: 'onboarding_sessions_started_total',
      help: 'Total number of onboarding sessions started',
      labelNames: ['service'],
      registers: [registry],
    });

    this.stepCompleted = new Counter({
      name: 'onboarding_step_completed_total',
      help: 'Total number of onboarding steps completed',
      labelNames: ['step', 'service'],
      registers: [registry],
    });

    this.stepDurationSeconds = new Histogram({
      name: 'onboarding_step_duration_seconds',
      help: 'Time spent in onboarding step (seconds)',
      labelNames: ['step', 'service'],
      buckets: [1, 5, 10, 30, 60, 180, 600, 1800, 3600, 7200, 14400],
      registers: [registry],
    });

    this.timeToFirstLeadDays = new Histogram({
      name: 'onboarding_time_to_first_lead_days',
      help: 'Time from signup to first lead (days)',
      labelNames: ['service'],
      buckets: [0.25, 0.5, 1, 2, 3, 5, 7, 14, 30],
      registers: [registry],
    });

    this.timeToCompletionHours = new Histogram({
      name: 'onboarding_time_to_completion_hours',
      help: 'Time from signup to onboarding completion (hours)',
      labelNames: ['service'],
      buckets: [1, 6, 12, 24, 48, 72, 168, 336],
      registers: [registry],
    });

    this.sessionsByStatus = new Gauge({
      name: 'onboarding_sessions_total',
      help: 'Number of onboarding sessions by status',
      labelNames: ['status', 'service'],
      registers: [registry],
    });

    this.funnelReached = new Gauge({
      name: 'onboarding_funnel_reached_total',
      help: 'Number of sessions that have reached each step',
      labelNames: ['step', 'service'],
      registers: [registry],
    });

    this.abandonedSignups = new Gauge({
      name: 'onboarding_abandoned_signups_total',
      help: 'Number of signups considered abandoned (no progress within SLA)',
      labelNames: ['service'],
      registers: [registry],
    });

    this.atRiskByLevel = new Gauge({
      name: 'onboarding_at_risk_total',
      help: 'Number of onboarding sessions at risk by risk level',
      labelNames: ['level', 'service'],
      registers: [registry],
    });

    this.averageCompletionPct = new Gauge({
      name: 'onboarding_completion_percentage_average',
      help: 'Average onboarding completion percentage across active sessions',
      labelNames: ['service'],
      registers: [registry],
    });

    this.feedbackSubmitted = new Counter({
      name: 'onboarding_feedback_submitted_total',
      help: 'Total number of onboarding feedback submissions',
      labelNames: ['nps_category', 'sentiment', 'service'],
      registers: [registry],
    });

    this.npsScore = new Gauge({
      name: 'onboarding_nps_score',
      help: 'Net Promoter Score for onboarding (promoters% - detractors%)',
      labelNames: ['service'],
      registers: [registry],
    });

    this.feedbackResponseRate = new Gauge({
      name: 'onboarding_feedback_response_rate',
      help: 'Feedback response rate (responses / completed sessions)',
      labelNames: ['service'],
      registers: [registry],
    });
  }

  recordSessionStarted(service: string): void {
    this.sessionsStarted.labels(service).inc();
  }

  recordStepCompleted(step: string, service: string): void {
    this.stepCompleted.labels(step, service).inc();
  }

  recordStepDuration(step: string, service: string, durationSeconds: number): void {
    this.stepDurationSeconds.labels(step, service).observe(durationSeconds);
  }

  recordTimeToFirstLead(service: string, days: number): void {
    this.timeToFirstLeadDays.labels(service).observe(days);
  }

  recordTimeToCompletion(service: string, hours: number): void {
    this.timeToCompletionHours.labels(service).observe(hours);
  }

  setSessionsByStatus(service: string, status: string, count: number): void {
    this.sessionsByStatus.labels(status, service).set(count);
  }

  setFunnelReached(service: string, step: string, count: number): void {
    this.funnelReached.labels(step, service).set(count);
  }

  setAbandonedSignups(service: string, count: number): void {
    this.abandonedSignups.labels(service).set(count);
  }

  setAtRiskByLevel(service: string, level: string, count: number): void {
    this.atRiskByLevel.labels(level, service).set(count);
  }

  setAverageCompletionPercentage(service: string, pct: number): void {
    this.averageCompletionPct.labels(service).set(pct);
  }

  recordFeedbackSubmitted(service: string, npsCategory: string, sentiment: string): void {
    this.feedbackSubmitted.labels(npsCategory, sentiment, service).inc();
  }

  setNpsScore(service: string, score: number): void {
    this.npsScore.labels(service).set(score);
  }

  setFeedbackResponseRate(service: string, rate: number): void {
    this.feedbackResponseRate.labels(service).set(rate);
  }
}
