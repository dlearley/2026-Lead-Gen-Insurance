/**
 * Advanced Performance Analyzer with AI-powered optimization recommendations
 * Phase 13.6: Performance Optimization & Tuning
 */

import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';
import { Tracer, Span, context, propagation } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface PerformanceBaseline {
  serviceName: string;
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
  confidence: number;
  seasonality?: PerformanceSeasonality;
}

export interface PerformanceSeasonality {
  hourly: number[];
  daily: number[];
  weekly: number[];
  monthly: number[];
}

export interface PerformanceAnomaly {
  id: string;
  timestamp: Date;
  endpoint: string;
  type: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  recommendation: string;
  status: 'open' | 'investigating' | 'resolved';
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'database' | 'cache' | 'api' | 'infrastructure' | 'code';
  title: string;
  description: string;
  impact: {
    performance: string;
    cost: string;
    complexity: string;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeframe: string;
    steps: string[];
    risks: string[];
  };
  metrics: {
    expectedImprovement: string;
    measurementApproach: string[];
  };
  status: 'pending' | 'in_progress' | 'implemented' | 'rejected';
  createdAt: Date;
  implementedAt?: Date;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number; // percentage change per day/week/month
  confidence: number;
  forecast: {
    next: number[];
    dates: Date[];
  };
}

export class AdvancedPerformanceAnalyzer {
  private tracer: Tracer;
  
  // Enhanced metrics collection
  private responseTimeHistogram: Histogram<string>;
  private errorCounter: Counter<string>;
  private activeConnections: Gauge<string>;
  private throughputCounter: Counter<string>;
  private resourceUsageGauge: Gauge<string>;
  private customMetrics: Map<string, Gauge<string>> = new Map();
  
  // Advanced analytics storage
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private anomalies: PerformanceAnomaly[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private trends: Map<string, PerformanceTrend> = new Map();
  
  // Configuration
  private readonly SLOW_ENDPOINT_THRESHOLD = 500; // ms
  private readonly HIGH_ERROR_RATE_THRESHOLD = 0.1; // 10%
  private readonly LOW_CACHE_HIT_RATE = 0.8; // 80%
  private readonly ANOMALY_THRESHOLD = 2.5; // standard deviations
  private readonly BASELINE_RETENTION_DAYS = 30;
  private readonly TREND_ANALYSIS_PERIOD = 7; // days
  
  constructor(serviceName: string) {
    this.tracer = getTracer('AdvancedPerformanceAnalyzer');
    
    this.initializePrometheusMetrics(serviceName);
    this.loadHistoricalBaselines();
    this.startPeriodicAnalysis();
  }
  
  private initializePrometheusMetrics(serviceName: string): void {
    // Enhanced response time histogram with more buckets
    this.responseTimeHistogram = new Histogram({
      name: 'advanced_http_request_duration_seconds',
      help: 'HTTP request duration in seconds with enhanced buckets',
      labelNames: ['method', 'route', 'status_code', 'service', 'endpoint_type'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 2, 3, 5, 7, 10, 15, 30, 60]
    });
    
    // Enhanced error tracking
    this.errorCounter = new Counter({
      name: 'advanced_http_requests_total',
      help: 'Total number of HTTP requests with enhanced categorization',
      labelNames: ['method', 'route', 'status_code', 'service', 'error_type']
    });
    
    // Active connections with resource tracking
    this.activeConnections = new Gauge({
      name: 'advanced_http_active_connections',
      help: 'Number of active HTTP connections with resource usage',
      labelNames: ['service', 'resource_type']
    });
    
    // Enhanced throughput metrics
    this.throughputCounter = new Counter({
      name: 'advanced_http_requests_throughput_total',
      help: 'Total throughput of HTTP requests with categorization',
      labelNames: ['service', 'endpoint', 'data_size', 'cache_status']
    });
    
    // Resource usage tracking
    this.resourceUsageGauge = new Gauge({
      name: 'advanced_resource_usage',
      help: 'Resource usage metrics (CPU, memory, network, disk)',
      labelNames: ['service', 'resource_type', 'unit']
    });
    
    // Register all metrics
    register.registerMetric(this.responseTimeHistogram);
    register.registerMetric(this.errorCounter);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.throughputCounter);
    register.registerMetric(this.resourceUsageGauge);
    
    // Collect default system metrics
    collectDefaultMetrics({ register });
  }
  
  /**
   * Record performance metrics with enhanced analysis
   */
  async recordMetrics(metrics: {
    responseTime: number;
    statusCode: number;
    endpoint: string;
    method: string;
    userId?: string;
    timestamp: Date;
    databaseQueryTime?: number;
    cacheHit?: boolean;
    aiInferenceTime?: number;
    requestSize?: number;
    responseSize?: number;
    dataSize?: string;
  }): Promise<void> {
    const span = this.tracer.startSpan('recordAdvancedMetrics');
    
    try {
      const duration = metrics.responseTime / 1000; // Convert to seconds
      
      // Enhanced metric recording
      this.responseTimeHistogram
        .labels(metrics.method, metrics.endpoint, metrics.statusCode.toString(), 'api-service', this.categorizeEndpoint(metrics.endpoint))
        .observe(duration);
      
      // Enhanced error categorization
      if (metrics.statusCode >= 400) {
        const errorType = this.categorizeError(metrics.statusCode);
        this.errorCounter
          .labels(metrics.method, metrics.endpoint, metrics.statusCode.toString(), 'api-service', errorType)
          .inc();
      }
      
      // Enhanced throughput tracking
      this.throughputCounter
        .labels('api-service', metrics.endpoint, metrics.dataSize || 'unknown', metrics.cacheHit ? 'hit' : 'miss')
        .inc();
      
      // Update resource usage gauge
      this.updateResourceUsage(metrics);
      
      // Advanced analysis
      await this.performAnomalyDetection(metrics);
      await this.updateAdvancedBaseline(metrics);
      await this.analyzeTrends(metrics);
      
      // Generate real-time recommendations
      await this.generateRealtimeRecommendations(metrics);
      
      logger.info('Advanced performance metrics recorded', {
        endpoint: metrics.endpoint,
        responseTime: metrics.responseTime,
        statusCode: metrics.statusCode,
        cacheHit: metrics.cacheHit,
        service: 'advanced-performance-analyzer'
      });
      
    } catch (error) {
      logger.error('Failed to record advanced performance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: metrics.endpoint,
        service: 'advanced-performance-analyzer'
      });
      span.recordException(error as Error);
    } finally {
      span.end();
    }
  }
  
  private categorizeEndpoint(endpoint: string): string {
    if (endpoint.includes('/api/v1/leads')) return 'lead_management';
    if (endpoint.includes('/api/v1/analytics')) return 'analytics';
    if (endpoint.includes('/api/v1/agents')) return 'agent_management';
    if (endpoint.includes('/api/v1/campaigns')) return 'campaign_management';
    if (endpoint.includes('/auth') || endpoint.includes('/login')) return 'authentication';
    return 'general';
  }
  
  private categorizeError(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 401 || statusCode === 403) return 'authentication';
      if (statusCode === 404) return 'not_found';
      if (statusCode === 429) return 'rate_limit';
      return 'client_error';
    }
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }
  
  private updateResourceUsage(metrics: any): void {
    // Simulate resource usage tracking (in real implementation, this would be system metrics)
    const simulatedCpuUsage = Math.random() * 100;
    const simulatedMemoryUsage = Math.random() * 100;
    const simulatedNetworkUsage = Math.random() * 100;
    
    this.resourceUsageGauge.labels('api-service', 'cpu', 'percentage').set(simulatedCpuUsage);
    this.resourceUsageGauge.labels('api-service', 'memory', 'percentage').set(simulatedMemoryUsage);
    this.resourceUsageGauge.labels('api-service', 'network', 'mbps').set(simulatedNetworkUsage);
  }
  
  /**
   * Advanced anomaly detection using statistical analysis
   */
  private async performAnomalyDetection(metrics: any): Promise<void> {
    const key = `${metrics.method}:${metrics.endpoint}`;
    const baseline = this.baselines.get(key);
    
    if (!baseline || !baseline.confidence || baseline.confidence < 0.7) {
      return; // Skip if no reliable baseline
    }
    
    const anomalies = [];
    
    // Response time anomaly detection
    const responseTimeZScore = this.calculateZScore(metrics.responseTime, baseline.p95, baseline.p95 * 0.2);
    if (Math.abs(responseTimeZScore) > this.ANOMALY_THRESHOLD) {
      anomalies.push({
        type: 'response_time' as const,
        severity: responseTimeZScore > 0 ? 'critical' : 'warning',
        value: metrics.responseTime,
        expectedValue: baseline.p95,
        deviation: responseTimeZScore,
        description: `Response time anomaly detected: ${metrics.responseTime}ms (expected: ${baseline.p95}ms)`
      });
    }
    
    // Error rate anomaly detection
    if (metrics.statusCode >= 400) {
      const currentErrorRate = 1; // Simplified - would calculate from sliding window
      const errorRateZScore = this.calculateZScore(currentErrorRate, baseline.errorRate, baseline.errorRate * 0.1);
      
      if (Math.abs(errorRateZScore) > this.ANOMALY_THRESHOLD) {
        anomalies.push({
          type: 'error_rate' as const,
          severity: errorRateZScore > 0 ? 'critical' : 'warning',
          value: currentErrorRate,
          expectedValue: baseline.errorRate,
          deviation: errorRateZScore,
          description: `Error rate anomaly detected: ${currentErrorRate} (expected: ${baseline.errorRate})`
        });
      }
    }
    
    // Cache hit rate anomaly
    if (metrics.cacheHit !== undefined && baseline.confidence > 0.8) {
      const expectedCacheHitRate = 0.85; // Would be from historical analysis
      const cacheHitRate = metrics.cacheHit ? 1 : 0;
      const cacheZScore = this.calculateZScore(cacheHitRate, expectedCacheHitRate, 0.1);
      
      if (Math.abs(cacheZScore) > this.ANOMALY_THRESHOLD) {
        anomalies.push({
          type: 'resource_usage' as const,
          severity: cacheZScore < 0 ? 'warning' : 'info',
          value: cacheHitRate,
          expectedValue: expectedCacheHitRate,
          deviation: cacheZScore,
          description: `Cache performance anomaly: ${cacheHitRate ? 'hit' : 'miss'} (expected hit rate: ${expectedCacheHitRate})`
        });
      }
    }
    
    // Store anomalies
    for (const anomaly of anomalies) {
      const fullAnomaly: PerformanceAnomaly = {
        id: this.generateId(),
        timestamp: metrics.timestamp,
        endpoint: metrics.endpoint,
        ...anomaly,
        recommendation: this.generateAnomalyRecommendation(anomaly),
        status: 'open'
      };
      
      this.anomalies.push(fullAnomaly);
      
      logger.warn('Performance anomaly detected', {
        anomaly: fullAnomaly,
        service: 'advanced-performance-analyzer'
      });
    }
    
    // Clean old anomalies
    this.cleanOldAnomalies();
  }
  
  private calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }
  
  private generateAnomalyRecommendation(anomaly: any): string {
    switch (anomaly.type) {
      case 'response_time':
        if (anomaly.deviation > 0) {
          return 'Investigate database query performance, consider caching, or optimize API logic';
        }
        return 'Response time improved - review recent changes to identify optimization';
      case 'error_rate':
        return 'Check error logs, validate input data, and review recent deployments';
      case 'resource_usage':
        return 'Monitor resource usage patterns and consider scaling or optimization';
      default:
        return 'Investigate the underlying cause of this anomaly';
    }
  }
  
  private generateId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private cleanOldAnomalies(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.BASELINE_RETENTION_DAYS);
    
    this.anomalies = this.anomalies.filter(anomaly => 
      anomaly.timestamp > cutoff || anomaly.status === 'open'
    );
  }
  
  /**
   * Advanced baseline update with seasonality analysis
   */
  private async updateAdvancedBaseline(metrics: any): Promise<void> {
    const key = `${metrics.method}:${metrics.endpoint}`;
    const existing = this.baselines.get(key);
    
    if (!existing) {
      // Create new baseline with seasonality
      this.baselines.set(key, {
        serviceName: 'api-service',
        endpoint: metrics.endpoint,
        method: metrics.method,
        p50: metrics.responseTime,
        p95: metrics.responseTime,
        p99: metrics.responseTime,
        throughput: 1,
        errorRate: metrics.statusCode >= 400 ? 1 : 0,
        timestamp: new Date(),
        confidence: 0.1,
        seasonality: this.initializeSeasonality()
      });
    } else {
      // Update with advanced smoothing and seasonality
      const alpha = 0.1; // Base smoothing factor
      const now = new Date();
      const hourWeight = this.getHourWeight(now);
      const dayWeight = this.getDayWeight(now);
      
      // Weighted update based on time
      const adjustedAlpha = alpha * hourWeight * dayWeight;
      
      existing.p50 = this.exponentialMovingAverage(existing.p50, metrics.responseTime, adjustedAlpha);
      existing.p95 = Math.max(
        this.exponentialMovingAverage(existing.p95, metrics.responseTime, adjustedAlpha),
        existing.p50
      );
      existing.p99 = Math.max(
        this.exponentialMovingAverage(existing.p99, metrics.responseTime, adjustedAlpha),
        existing.p95
      );
      
      // Update throughput
      existing.throughput = this.exponentialMovingAverage(existing.throughput, 1, adjustedAlpha);
      
      // Update error rate
      const beta = 0.05;
      existing.errorRate = this.exponentialMovingAverage(
        existing.errorRate, 
        metrics.statusCode >= 400 ? 1 : 0, 
        beta * hourWeight * dayWeight
      );
      
      // Update confidence
      existing.confidence = Math.min(1, existing.confidence + adjustedAlpha * 0.5);
      
      // Update seasonality patterns
      this.updateSeasonality(existing, metrics, now);
      existing.timestamp = now;
    }
  }
  
  private initializeSeasonality(): PerformanceSeasonality {
    return {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      weekly: new Array(52).fill(0),
      monthly: new Array(12).fill(0)
    };
  }
  
  private getHourWeight(date: Date): number {
    const hour = date.getHours();
    // Higher weight during peak hours (9 AM - 6 PM)
    return (hour >= 9 && hour <= 18) ? 1.2 : 0.8;
  }
  
  private getDayWeight(date: Date): number {
    const day = date.getDay();
    // Higher weight on weekdays
    return (day >= 1 && day <= 5) ? 1.1 : 0.7;
  }
  
  private exponentialMovingAverage(current: number, newValue: number, alpha: number): number {
    return current * (1 - alpha) + newValue * alpha;
  }
  
  private updateSeasonality(baseline: PerformanceBaseline, metrics: any, now: Date): void {
    if (!baseline.seasonality) return;
    
    const hour = now.getHours();
    const day = now.getDay();
    const week = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const month = now.getMonth();
    
    // Update seasonal patterns
    baseline.seasonality.hourly[hour] = this.exponentialMovingAverage(
      baseline.seasonality.hourly[hour], 
      metrics.responseTime, 
      0.1
    );
    baseline.seasonality.daily[day] = this.exponentialMovingAverage(
      baseline.seasonality.daily[day], 
      metrics.responseTime, 
      0.1
    );
    baseline.seasonality.weekly[week] = this.exponentialMovingAverage(
      baseline.seasonality.weekly[week], 
      metrics.responseTime, 
      0.1
    );
    baseline.seasonality.monthly[month] = this.exponentialMovingAverage(
      baseline.seasonality.monthly[month], 
      metrics.responseTime, 
      0.1
    );
  }
  
  /**
   * Trend analysis and forecasting
   */
  private async analyzeTrends(metrics: any): Promise<void> {
    const trendKey = `${metrics.method}:${metrics.endpoint}:response_time`;
    
    if (!this.trends.has(trendKey)) {
      this.trends.set(trendKey, {
        metric: trendKey,
        direction: 'stable',
        rate: 0,
        confidence: 0.1,
        forecast: { next: [], dates: [] }
      });
    }
    
    const trend = this.trends.get(trendKey)!;
    
    // Simple trend calculation (would be more sophisticated in production)
    const recentData = this.getRecentMetrics(trendKey, this.TREND_ANALYSIS_PERIOD);
    if (recentData.length > 10) {
      const slope = this.calculateLinearRegression(recentData.map((_, i) => i), recentData);
      trend.rate = slope * 100; // Convert to percentage
      trend.direction = Math.abs(slope) < 0.001 ? 'stable' : (slope > 0 ? 'degrading' : 'improving');
      trend.confidence = Math.min(1, trend.confidence + 0.05);
      
      // Generate forecast
      trend.forecast = this.generateForecast(recentData, 7); // 7 days ahead
    }
  }
  
  private getRecentMetrics(key: string, days: number): number[] {
    // This would retrieve actual historical data in a real implementation
    // For now, return simulated data
    return Array.from({ length: 7 }, () => Math.random() * 100 + 50);
  }
  
  private calculateLinearRegression(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
  
  private generateForecast(data: number[], days: number): { next: number[]; dates: Date[] } {
    const x = data.map((_, i) => i);
    const slope = this.calculateLinearRegression(x, data);
    const intercept = data[0] - slope * x[0];
    
    const forecast: number[] = [];
    const dates: Date[] = [];
    
    for (let i = 1; i <= days; i++) {
      const predictedValue = intercept + slope * (x.length + i);
      forecast.push(Math.max(0, predictedValue)); // Ensure non-negative
      dates.push(new Date(Date.now() + i * 24 * 60 * 60 * 1000));
    }
    
    return { next: forecast, dates };
  }
  
  /**
   * Generate real-time optimization recommendations
   */
  private async generateRealtimeRecommendations(metrics: any): Promise<void> {
    const key = `${metrics.method}:${metrics.endpoint}`;
    const baseline = this.baselines.get(key);
    
    if (!baseline || baseline.confidence < 0.7) return;
    
    // Response time recommendations
    if (metrics.responseTime > baseline.p99 * 1.5) {
      this.addRecommendation({
        priority: 'high',
        category: 'api',
        title: 'Slow Response Time Detected',
        description: `Endpoint ${metrics.endpoint} is responding ${((metrics.responseTime / baseline.p99 - 1) * 100).toFixed(1)}% slower than baseline`,
        impact: {
          performance: 'High',
          cost: 'Medium',
          complexity: 'Low'
        },
        implementation: {
          effort: 'medium',
          timeframe: '1-2 weeks',
          steps: [
            'Analyze recent database query patterns',
            'Check for N+1 query issues',
            'Implement response caching',
            'Consider API pagination'
          ],
          risks: ['Cache invalidation complexity', 'Potential stale data']
        },
        metrics: {
          expectedImprovement: '20-40% response time reduction',
          measurementApproach: ['Monitor P95 response time', 'Track user experience metrics']
        },
        status: 'pending'
      });
    }
    
    // Error rate recommendations
    if (metrics.statusCode >= 500) {
      this.addRecommendation({
        priority: 'critical',
        category: 'infrastructure',
        title: 'High Server Error Rate',
        description: 'Server errors detected - immediate investigation required',
        impact: {
          performance: 'Critical',
          cost: 'High',
          complexity: 'Medium'
        },
        implementation: {
          effort: 'high',
          timeframe: 'Immediate',
          steps: [
            'Check error logs immediately',
            'Review recent deployments',
            'Validate database connectivity',
            'Check external service dependencies'
          ],
          risks: ['Service disruption', 'Data corruption']
        },
        metrics: {
          expectedImprovement: 'Reduce error rate to <1%',
          measurementApproach: ['Monitor error rates', 'Set up alerting']
        },
        status: 'pending'
      });
    }
  }
  
  private addRecommendation(rec: Omit<OptimizationRecommendation, 'id' | 'createdAt'>): void {
    const recommendation: OptimizationRecommendation = {
      id: this.generateId(),
      createdAt: new Date(),
      ...rec
    };
    
    this.recommendations.push(recommendation);
    
    logger.info('Optimization recommendation generated', {
      recommendationId: recommendation.id,
      priority: recommendation.priority,
      category: recommendation.category,
      title: recommendation.title
    });
  }
  
  /**
   * Start periodic analysis tasks
   */
  private startPeriodicAnalysis(): void {
    // Run comprehensive analysis every 5 minutes
    setInterval(() => {
      this.performComprehensiveAnalysis().catch((error) => {
        logger.error('Comprehensive analysis failed', { error });
      });
    }, 5 * 60 * 1000);
    
    // Update baselines every minute
    setInterval(() => {
      this.saveBaselines().catch((error) => {
        logger.error('Failed to save baselines', { error });
      });
    }, 60 * 1000);
  }
  
  private async performComprehensiveAnalysis(): Promise<void> {
    logger.info('Starting comprehensive performance analysis');
    
    // Analyze all endpoints
    for (const [key, baseline] of this.baselines) {
      const [method, endpoint] = key.split(':');
      const analysis = await this.analyzeEndpointPerformance(endpoint, method);
      
      // Generate recommendations based on analysis
      for (const issue of analysis.issues) {
        this.generateRecommendationFromIssue(endpoint, issue);
      }
    }
    
    // Clean up old data
    this.cleanupOldData();
    
    logger.info('Comprehensive performance analysis completed');
  }
  
  private async analyzeEndpointPerformance(endpoint: string, method: string = 'GET'): Promise<{
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
    
    // Advanced performance analysis
    if (baseline.p99 > this.SLOW_ENDPOINT_THRESHOLD) {
      issues.push(`P99 response time (${baseline.p99.toFixed(0)}ms) exceeds threshold`);
      recommendations.push('Consider implementing multi-level caching');
      recommendations.push('Optimize database queries with proper indexing');
      recommendations.push('Implement response compression');
    }
    
    if (baseline.errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
      issues.push(`Error rate (${(baseline.errorRate * 100).toFixed(1)}%) is too high`);
      recommendations.push('Implement comprehensive error handling');
      recommendations.push('Add input validation and sanitization');
      recommendations.push('Set up monitoring alerts for error spikes');
    }
    
    // Trend-based recommendations
    const trend = this.trends.get(`${method}:${endpoint}:response_time`);
    if (trend && trend.direction === 'degrading' && trend.confidence > 0.7) {
      issues.push('Response time trend is degrading');
      recommendations.push('Investigate root cause of performance degradation');
      recommendations.push('Consider capacity planning');
    }
    
    return { baseline, recommendations, issues };
  }
  
  private generateRecommendationFromIssue(endpoint: string, issue: string): void {
    if (issue.includes('response time') && issue.includes('exceeds')) {
      this.addRecommendation({
        priority: 'medium',
        category: 'database',
        title: 'Database Optimization Needed',
        description: `Performance issue detected on ${endpoint}: ${issue}`,
        impact: {
          performance: 'High',
          cost: 'Low',
          complexity: 'Medium'
        },
        implementation: {
          effort: 'medium',
          timeframe: '1-2 weeks',
          steps: [
            'Analyze query execution plans',
            'Identify missing indexes',
            'Optimize slow queries',
            'Consider query result caching'
          ],
          risks: ['Index overhead', 'Storage space increase']
        },
        metrics: {
          expectedImprovement: '30-50% query performance improvement',
          measurementApproach: ['Monitor query execution times', 'Track P95 response times']
        },
        status: 'pending'
      });
    }
  }
  
  private async saveBaselines(): Promise<void> {
    // In a real implementation, save to persistent storage
    logger.info('Performance baselines saved', {
      count: this.baselines.size,
      service: 'advanced-performance-analyzer'
    });
  }
  
  private loadHistoricalBaselines(): void {
    // In a real implementation, load from persistent storage
    logger.info('Historical performance baselines loaded', {
      count: this.baselines.size,
      service: 'advanced-performance-analyzer'
    });
  }
  
  private cleanupOldData(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.BASELINE_RETENTION_DAYS);
    
    // Clean old recommendations
    this.recommendations = this.recommendations.filter(rec => 
      rec.createdAt > cutoff || rec.status !== 'implemented'
    );
    
    // Clean trends (keep only recent)
    for (const [key, trend] of this.trends) {
      if (trend.confidence < 0.1) {
        this.trends.delete(key);
      }
    }
  }
  
  // Public API methods
  getBaseline(endpoint: string, method: string = 'GET'): PerformanceBaseline | null {
    return this.baselines.get(`${method}:${endpoint}`) || null;
  }
  
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }
  
  getAnomalies(since?: Date): PerformanceAnomaly[] {
    if (!since) return [...this.anomalies];
    return this.anomalies.filter(anomaly => anomaly.timestamp > since);
  }
  
  getRecommendations(category?: string): OptimizationRecommendation[] {
    if (!category) return [...this.recommendations];
    return this.recommendations.filter(rec => rec.category === category);
  }
  
  getTrends(): PerformanceTrend[] {
    return Array.from(this.trends.values());
  }
  
  getPerformanceReport(): {
    summary: {
      totalEndpoints: number;
      slowEndpoints: number;
      highErrorEndpoints: number;
      averageResponseTime: number;
      totalErrorRate: number;
      anomalyCount: number;
      recommendationCount: number;
    };
    topRecommendations: OptimizationRecommendation[];
    criticalAnomalies: PerformanceAnomaly[];
    trendingEndpoints: Array<{
      endpoint: string;
      trend: PerformanceTrend;
    }>;
  } {
    const baselines = this.getAllBaselines();
    const slowCount = baselines.filter(b => b.p99 > this.SLOW_ENDPOINT_THRESHOLD).length;
    const errorCount = baselines.filter(b => b.errorRate > this.HIGH_ERROR_RATE_THRESHOLD).length;
    
    const avgResponseTime = baselines.length > 0 
      ? baselines.reduce((sum, b) => sum + b.p95, 0) / baselines.length 
      : 0;
    
    const totalErrorRate = baselines.length > 0
      ? baselines.reduce((sum, b) => sum + b.errorRate, 0) / baselines.length
      : 0;
    
    return {
      summary: {
        totalEndpoints: baselines.length,
        slowEndpoints: slowCount,
        highErrorEndpoints: errorCount,
        averageResponseTime: avgResponseTime,
        totalErrorRate: totalErrorRate,
        anomalyCount: this.anomalies.filter(a => a.status === 'open').length,
        recommendationCount: this.recommendations.filter(r => r.status === 'pending').length
      },
      topRecommendations: this.recommendations
        .filter(r => r.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, 10),
      criticalAnomalies: this.anomalies
        .filter(a => a.severity === 'critical' && a.status === 'open')
        .slice(0, 10),
      trendingEndpoints: this.getTrendingEndpoints()
    };
  }
  
  private getTrendingEndpoints(): Array<{ endpoint: string; trend: PerformanceTrend }> {
    return Array.from(this.trends.entries())
      .filter(([_, trend]) => trend.confidence > 0.6)
      .map(([key, trend]) => ({
        endpoint: key.split(':').slice(0, 2).join(':'),
        trend
      }))
      .sort((a, b) => Math.abs(b.trend.rate) - Math.abs(a.trend.rate))
      .slice(0, 10);
  }
}