import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';
import { Tracer, Span } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

// Performance baseline configuration
export interface PerformanceBaseline {
  serviceName: string;
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  responseTime: number;
  statusCode: number;
  endpoint: string;
  method: string;
  userId?: string;
  timestamp: Date;
  databaseQueryTime?: number;
  cacheHit?: boolean;
  aiInferenceTime?: number;
}

// Performance analyzer class
export class PerformanceAnalyzer {
  private tracer: Tracer;
  
  // Performance metrics
  private responseTimeHistogram: Histogram<string>;
  private errorCounter: Counter<string>;
  private activeConnections: Gauge<string>;
  private throughputCounter: Counter<string>;
  
  // Baseline storage
  private baselines: Map<string, PerformanceBaseline> = new Map();
  
  // Performance thresholds
  private readonly SLOW_ENDPOINT_THRESHOLD = 500; // ms
  private readonly HIGH_ERROR_RATE_THRESHOLD = 0.1; // 10%
  private readonly LOW_CACHE_HIT_RATE = 0.8; // 80%
  
  constructor(serviceName: string) {
    this.tracer = getTracer('PerformanceAnalyzer');
    
    // Initialize Prometheus metrics
    this.responseTimeHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });
    
    this.errorCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service']
    });
    
    this.activeConnections = new Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      labelNames: ['service']
    });
    
    this.throughputCounter = new Counter({
      name: 'http_requests_throughput_total',
      help: 'Total throughput of HTTP requests',
      labelNames: ['service', 'endpoint']
    });
    
    register.registerMetric(this.responseTimeHistogram);
    register.registerMetric(this.errorCounter);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.throughputCounter);
    
    // Collect default metrics
    collectDefaultMetrics({ register });
    
    // Load existing baselines
    this.loadBaselines();
  }
  
  /**
   * Record performance metrics
   */
  async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    const span = this.tracer.startSpan('recordPerformanceMetrics');
    
    try {
      const duration = metrics.responseTime / 1000; // Convert to seconds
      
      // Record response time
      this.responseTimeHistogram
        .labels(metrics.method, metrics.endpoint, metrics.statusCode.toString(), 'api-service')
        .observe(duration);
      
      // Record error count
      if (metrics.statusCode >= 400) {
        this.errorCounter
          .labels(metrics.method, metrics.endpoint, metrics.statusCode.toString(), 'api-service')
          .inc();
      }
      
      // Record throughput
      this.throughputCounter
        .labels('api-service', metrics.endpoint)
        .inc();
      
      // Update active connections gauge
      this.activeConnections.labels('api-service').inc();
      setTimeout(() => {
        this.activeConnections.labels('api-service').dec();
      }, 100);
      
      // Check for performance issues
      await this.checkPerformanceIssues(metrics);
      
      // Update baseline if needed
      await this.updateBaseline(metrics);
      
      logger.info('Performance metrics recorded', {
        endpoint: metrics.endpoint,
        responseTime: metrics.responseTime,
        statusCode: metrics.statusCode,
        service: 'performance-analyzer'
      });
      
    } catch (error) {
      logger.error('Failed to record performance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'performance-analyzer'
      });
      span.recordException(error as Error);
    } finally {
      span.end();
    }
  }
  
  /**
   * Check for performance issues
   */
  private async checkPerformanceIssues(metrics: PerformanceMetrics): Promise<void> {
    const issues: string[] = [];
    
    // Check response time
    if (metrics.responseTime > this.SLOW_ENDPOINT_THRESHOLD) {
      issues.push(`Slow response time: ${metrics.responseTime}ms (threshold: ${this.SLOW_ENDPOINT_THRESHOLD}ms)`);
    }
    
    // Check error rate
    if (metrics.statusCode >= 500) {
      issues.push(`Server error: ${metrics.statusCode}`);
    }
    
    // Check cache hit rate (if applicable)
    if (metrics.cacheHit !== undefined && !metrics.cacheHit) {
      issues.push('Cache miss detected');
    }
    
    // Log issues
    if (issues.length > 0) {
      logger.warn('Performance issues detected', {
        endpoint: metrics.endpoint,
        issues,
        responseTime: metrics.responseTime,
        service: 'performance-analyzer'
      });
    }
  }
  
  /**
   * Update performance baseline
   */
  private async updateBaseline(metrics: PerformanceMetrics): Promise<void> {
    const key = `${metrics.method}:${metrics.endpoint}`;
    const existing = this.baselines.get(key);
    
    if (!existing) {
      // Create new baseline
      this.baselines.set(key, {
        serviceName: 'api-service',
        endpoint: metrics.endpoint,
        p50: metrics.responseTime,
        p95: metrics.responseTime,
        p99: metrics.responseTime,
        throughput: 1,
        errorRate: metrics.statusCode >= 400 ? 1 : 0,
        timestamp: new Date()
      });
    } else {
      // Update baseline with exponential moving average
      const alpha = 0.1; // Smoothing factor
      const beta = 0.05; // Error rate smoothing
      
      existing.p50 = existing.p50 * (1 - alpha) + metrics.responseTime * alpha;
      existing.p95 = Math.max(existing.p95 * (1 - alpha) + metrics.responseTime * alpha, existing.p50);
      existing.p99 = Math.max(existing.p99 * (1 - alpha) + metrics.responseTime * alpha, existing.p95);
      existing.throughput = existing.throughput * (1 - alpha) + 1 * alpha;
      existing.errorRate = existing.errorRate * (1 - beta) + (metrics.statusCode >= 400 ? 1 : 0) * beta;
      existing.timestamp = new Date();
    }
  }
  
  /**
   * Get performance baseline for endpoint
   */
  getBaseline(endpoint: string, method: string = 'GET'): PerformanceBaseline | null {
    return this.baselines.get(`${method}:${endpoint}`) || null;
  }
  
  /**
   * Get all baselines
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }
  
  /**
   * Analyze endpoint performance
   */
  async analyzeEndpointPerformance(endpoint: string, method: string = 'GET'): Promise<{
    baseline: PerformanceBaseline | null;
    recommendations: string[];
    issues: string[];
  }> {
    const baseline = this.getBaseline(endpoint, method);
    const recommendations: string[] = [];
    const issues: string[] = [];
    
    if (!baseline) {
      recommendations.push('No baseline data available - continue monitoring');
      return { baseline: null, recommendations, issues };
    }
    
    // Analyze response times
    if (baseline.p99 > this.SLOW_ENDPOINT_THRESHOLD) {
      issues.push(`P99 response time (${baseline.p99.toFixed(0)}ms) exceeds threshold (${this.SLOW_ENDPOINT_THRESHOLD}ms)`);
      recommendations.push('Consider implementing caching for this endpoint');
      recommendations.push('Optimize database queries');
      recommendations.push('Add pagination for large result sets');
    }
    
    // Analyze error rate
    if (baseline.errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
      issues.push(`Error rate (${(baseline.errorRate * 100).toFixed(1)}%) is too high`);
      recommendations.push('Review error logs and fix underlying issues');
      recommendations.push('Implement better error handling');
      recommendations.push('Add input validation');
    }
    
    // Analyze throughput
    if (baseline.throughput < 10) {
      recommendations.push('Consider load balancing if traffic increases');
      recommendations.push('Monitor for traffic growth patterns');
    }
    
    return { baseline, recommendations, issues };
  }
  
  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: {
      totalEndpoints: number;
      slowEndpoints: number;
      highErrorEndpoints: number;
      averageResponseTime: number;
      totalErrorRate: number;
    };
    endpoints: Array<{
      endpoint: string;
      baseline: PerformanceBaseline;
      issues: string[];
      recommendations: string[];
    }>;
    recommendations: string[];
  }> {
    const endpointAnalyses = [];
    let totalResponseTime = 0;
    let totalErrorRate = 0;
    let slowCount = 0;
    let highErrorCount = 0;
    
    for (const baseline of this.getAllBaselines()) {
      const analysis = await this.analyzeEndpointPerformance(baseline.endpoint);
      
      endpointAnalyses.push({
        endpoint: baseline.endpoint,
        baseline,
        issues: analysis.issues,
        recommendations: analysis.recommendations
      });
      
      totalResponseTime += baseline.p95;
      totalErrorRate += baseline.errorRate;
      
      if (baseline.p99 > this.SLOW_ENDPOINT_THRESHOLD) slowCount++;
      if (baseline.errorRate > this.HIGH_ERROR_RATE_THRESHOLD) highErrorCount++;
    }
    
    const report = {
      summary: {
        totalEndpoints: this.baselines.size,
        slowEndpoints: slowCount,
        highErrorEndpoints: highErrorCount,
        averageResponseTime: this.baselines.size > 0 ? totalResponseTime / this.baselines.size : 0,
        totalErrorRate: this.baselines.size > 0 ? totalErrorRate / this.baselines.size : 0
      },
      endpoints: endpointAnalyses,
      recommendations: [
        'Review slow endpoints and implement optimizations',
        'Address high error rate endpoints',
        'Implement monitoring alerts for performance degradation',
        'Consider horizontal scaling for high-traffic endpoints',
        'Add caching where appropriate'
      ]
    };
    
    logger.info('Performance report generated', {
      totalEndpoints: report.summary.totalEndpoints,
      slowEndpoints: report.summary.slowEndpoints,
      service: 'performance-analyzer'
    });
    
    return report;
  }
  
  /**
   * Load baselines from storage
   */
  private async loadBaselines(): Promise<void> {
    // In a real implementation, load from database or file
    // For now, initialize with empty baselines
    logger.info('Performance baselines loaded', {
      count: this.baselines.size,
      service: 'performance-analyzer'
    });
  }
  
  /**
   * Save baselines to storage
   */
  private async saveBaselines(): Promise<void> {
    // In a real implementation, save to database or file
    logger.info('Performance baselines saved', {
      count: this.baselines.size,
      service: 'performance-analyzer'
    });
  }
}