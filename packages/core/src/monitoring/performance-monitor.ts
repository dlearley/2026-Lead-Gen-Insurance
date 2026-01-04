import { logger } from '../logger.js';
import { MetricsCollector } from './metrics.js';
import { AdvancedCacheManager } from '../cache/advanced-cache-manager.js';
import { AdvancedQueryOptimizer } from '../database/advanced-query-optimizer.js';
import { APIResponseOptimizer } from '../api/api-optimizer.js';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  pollingInterval?: number; // seconds
  alertThresholds?: {
    apiResponseTime?: number; // ms
    databaseQueryTime?: number; // ms
    cacheHitRate?: number; // percentage
    errorRate?: number; // percentage
    cpuUsage?: number; // percentage
    memoryUsage?: number; // percentage
  };
  anomalyDetection?: {
    enabled?: boolean;
    sensitivity?: number; // 0-1 scale
    windowSize?: number; // number of samples
  };
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'regression';
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  description: string;
  context?: Record<string, any>;
}

/**
 * Performance anomaly
 */
export interface PerformanceAnomaly {
  id: string;
  metric: string;
  detectedAt: Date;
  baselineValue: number;
  currentValue: number;
  deviation: number; // standard deviations
  severity: 'high' | 'medium' | 'low';
  description: string;
  context?: Record<string, any>;
}

/**
 * Performance trend
 */
export interface PerformanceTrend {
  metric: string;
  values: Array<{ timestamp: Date; value: number }>;
  baseline: number;
  current: number;
  changePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * System resource metrics
 */
export interface SystemResourceMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  networkThroughput: number; // MB/s
  diskIO: number; // MB/s
  openConnections: number;
  activeRequests: number;
  queueLength: number;
  timestamp: Date;
}

/**
 * Performance dashboard data
 */
export interface PerformanceDashboardData {
  apiPerformance: {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
    cacheHitRate: number;
  };
  databasePerformance: {
    avgQueryTime: number;
    slowQueries: number;
    fullTableScans: number;
    indexUsage: number;
    connectionPoolUsage: number;
  };
  cachePerformance: {
    hitRate: number;
    memoryUsage: number;
    evictionRate: number;
    currentKeys: number;
  };
  systemResources: SystemResourceMetrics;
  alerts: PerformanceAlert[];
  anomalies: PerformanceAnomaly[];
  trends: PerformanceTrend[];
  timestamp: Date;
}

/**
 * Performance SLO (Service Level Objective)
 */
export interface PerformanceSLO {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  window: string; // e.g., '5m', '1h', '1d'
  complianceThreshold: number; // percentage
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Performance SLO compliance report
 */
export interface PerformanceSLOCompliance {
  sloId: string;
  sloName: string;
  metric: string;
  target: number;
  actualValue: number;
  compliancePercentage: number;
  inCompliance: boolean;
  measurementWindow: string;
  measuredAt: Date;
}

/**
 * Performance Monitor for comprehensive performance monitoring and alerting
 */
export class PerformanceMonitor {
  private metrics: MetricsCollector;
  private cacheManager?: AdvancedCacheManager;
  private queryOptimizer?: AdvancedQueryOptimizer;
  private apiOptimizer?: APIResponseOptimizer;
  private config: PerformanceMonitorConfig;
  private alerts: PerformanceAlert[];
  private anomalies: PerformanceAnomaly[];
  private trends: Map<string, PerformanceTrend>;
  private sloCompliance: PerformanceSLOCompliance[];
  private systemMetricsHistory: SystemResourceMetrics[];
  private performanceHistory: PerformanceDashboardData[];
  private pollingInterval: number;
  private pollingTimeout?: NodeJS.Timeout;

  constructor(options: {
    config?: PerformanceMonitorConfig;
    cacheManager?: AdvancedCacheManager;
    queryOptimizer?: AdvancedQueryOptimizer;
    apiOptimizer?: APIResponseOptimizer;
    metrics?: MetricsCollector;
  } = {}) {
    this.config = options.config || this.getDefaultConfig();
    this.cacheManager = options.cacheManager;
    this.queryOptimizer = options.queryOptimizer;
    this.apiOptimizer = options.apiOptimizer;
    this.metrics = options.metrics || new MetricsCollector();
    this.alerts = [];
    this.anomalies = [];
    this.trends = new Map();
    this.sloCompliance = [];
    this.systemMetricsHistory = [];
    this.performanceHistory = [];
    this.pollingInterval = this.config.pollingInterval || 60;
    
    this.setupMetrics();
    this.startMonitoring();
  }

  private getDefaultConfig(): PerformanceMonitorConfig {
    return {
      pollingInterval: 60, // 60 seconds
      alertThresholds: {
        apiResponseTime: 1000, // 1000ms
        databaseQueryTime: 100, // 100ms
        cacheHitRate: 70, // 70%
        errorRate: 1, // 1%
        cpuUsage: 80, // 80%
        memoryUsage: 85 // 85%
      },
      anomalyDetection: {
        enabled: true,
        sensitivity: 0.8, // 80% sensitivity
        windowSize: 10 // 10 samples
      }
    };
  }

  private setupMetrics(): void {
    // Performance monitoring metrics
    this.metrics.gauge('performance.alerts.active', 0);
    this.metrics.gauge('performance.anomalies.active', 0);
    this.metrics.gauge('performance.slo.compliance', 100);
    this.metrics.gauge('performance.system.cpu', 0);
    this.metrics.gauge('performance.system.memory', 0);
    this.metrics.gauge('performance.system.disk', 0);
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.pollingTimeout = setInterval(() => {
      this.collectPerformanceData();
      this.checkAlerts();
      this.detectAnomalies();
      this.updateTrends();
      this.checkSLOCompliance();
      this.cleanupOldData();
    }, this.pollingInterval * 1000);
    
    logger.info('Performance monitoring started', {
      pollingInterval: this.pollingInterval
    });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.pollingTimeout) {
      clearInterval(this.pollingTimeout);
      this.pollingTimeout = undefined;
      logger.info('Performance monitoring stopped');
    }
  }

  /**
   * Collect performance data from all components
   */
  private async collectPerformanceData(): Promise<void> {
    try {
      const dashboardData = await this.getPerformanceDashboardData();
      this.performanceHistory.push(dashboardData);
      
      // Keep only last 100 samples
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }
      
      logger.debug('Performance data collected', {
        timestamp: new Date().toISOString(),
        apiResponseTime: dashboardData.apiPerformance.avgResponseTime,
        cacheHitRate: dashboardData.cachePerformance.hitRate,
        cpuUsage: dashboardData.systemResources.cpuUsage
      });
    } catch (error) {
      logger.error('Error collecting performance data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const dashboardData = this.getPerformanceDashboardData();
    const now = new Date();
    const newAlerts: PerformanceAlert[] = [];
    
    // Check API response time alert
    if (this.config.alertThresholds?.apiResponseTime &&
        dashboardData.apiPerformance.avgResponseTime > this.config.alertThresholds.apiResponseTime) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'high',
        metric: 'api_response_time',
        value: dashboardData.apiPerformance.avgResponseTime,
        threshold: this.config.alertThresholds.apiResponseTime,
        triggeredAt: now,
        description: `API response time exceeds threshold: ${dashboardData.apiPerformance.avgResponseTime.toFixed(2)}ms > ${this.config.alertThresholds.apiResponseTime}ms`,
        context: {
          p50: dashboardData.apiPerformance.p50ResponseTime,
          p95: dashboardData.apiPerformance.p95ResponseTime,
          p99: dashboardData.apiPerformance.p99ResponseTime
        }
      });
    }
    
    // Check database query time alert
    if (this.config.alertThresholds?.databaseQueryTime &&
        dashboardData.databasePerformance.avgQueryTime > this.config.alertThresholds.databaseQueryTime) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'high',
        metric: 'database_query_time',
        value: dashboardData.databasePerformance.avgQueryTime,
        threshold: this.config.alertThresholds.databaseQueryTime,
        triggeredAt: now,
        description: `Database query time exceeds threshold: ${dashboardData.databasePerformance.avgQueryTime.toFixed(2)}ms > ${this.config.alertThresholds.databaseQueryTime}ms`,
        context: {
          slowQueries: dashboardData.databasePerformance.slowQueries,
          fullTableScans: dashboardData.databasePerformance.fullTableScans
        }
      });
    }
    
    // Check cache hit rate alert
    if (this.config.alertThresholds?.cacheHitRate &&
        dashboardData.cachePerformance.hitRate < this.config.alertThresholds.cacheHitRate) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'medium',
        metric: 'cache_hit_rate',
        value: dashboardData.cachePerformance.hitRate,
        threshold: this.config.alertThresholds.cacheHitRate,
        triggeredAt: now,
        description: `Cache hit rate below threshold: ${dashboardData.cachePerformance.hitRate.toFixed(2)}% < ${this.config.alertThresholds.cacheHitRate}%`,
        context: {
          currentKeys: dashboardData.cachePerformance.currentKeys,
          memoryUsage: dashboardData.cachePerformance.memoryUsage
        }
      });
    }
    
    // Check error rate alert
    if (this.config.alertThresholds?.errorRate &&
        dashboardData.apiPerformance.errorRate > this.config.alertThresholds.errorRate) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'critical',
        metric: 'error_rate',
        value: dashboardData.apiPerformance.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        triggeredAt: now,
        description: `Error rate exceeds threshold: ${dashboardData.apiPerformance.errorRate.toFixed(2)}% > ${this.config.alertThresholds.errorRate}%`
      });
    }
    
    // Check CPU usage alert
    if (this.config.alertThresholds?.cpuUsage &&
        dashboardData.systemResources.cpuUsage > this.config.alertThresholds.cpuUsage) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'high',
        metric: 'cpu_usage',
        value: dashboardData.systemResources.cpuUsage,
        threshold: this.config.alertThresholds.cpuUsage,
        triggeredAt: now,
        description: `CPU usage exceeds threshold: ${dashboardData.systemResources.cpuUsage.toFixed(2)}% > ${this.config.alertThresholds.cpuUsage}%`,
        context: {
          memoryUsage: dashboardData.systemResources.memoryUsage,
          diskUsage: dashboardData.systemResources.diskUsage
        }
      });
    }
    
    // Check memory usage alert
    if (this.config.alertThresholds?.memoryUsage &&
        dashboardData.systemResources.memoryUsage > this.config.alertThresholds.memoryUsage) {
      
      newAlerts.push({
        id: this.generateId(),
        type: 'threshold',
        severity: 'high',
        metric: 'memory_usage',
        value: dashboardData.systemResources.memoryUsage,
        threshold: this.config.alertThresholds.memoryUsage,
        triggeredAt: now,
        description: `Memory usage exceeds threshold: ${dashboardData.systemResources.memoryUsage.toFixed(2)}% > ${this.config.alertThresholds.memoryUsage}%`
      });
    }
    
    // Add new alerts and log them
    newAlerts.forEach(alert => {
      this.alerts.push(alert);
      logger.warn('Performance alert triggered', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        description: alert.description
      });
    });
    
    this.metrics.gauge('performance.alerts.active', this.alerts.length);
  }

  /**
   * Detect performance anomalies
   */
  private detectAnomalies(): void {
    if (!this.config.anomalyDetection?.enabled) return;
    
    const now = new Date();
    const windowSize = this.config.anomalyDetection.windowSize || 10;
    const sensitivity = this.config.anomalyDetection.sensitivity || 0.8;
    
    // Only detect anomalies if we have enough data
    if (this.performanceHistory.length < windowSize) return;
    
    const recentData = this.performanceHistory.slice(-windowSize);
    const newAnomalies: PerformanceAnomaly[] = [];
    
    // Check API response time anomalies
    const apiResponseTimes = recentData.map(d => d.apiPerformance.avgResponseTime);
    const apiMean = this.calculateMean(apiResponseTimes);
    const apiStdDev = this.calculateStdDev(apiResponseTimes, apiMean);
    const currentApiResponseTime = this.performanceHistory[this.performanceHistory.length - 1].apiPerformance.avgResponseTime;
    
    if (Math.abs(currentApiResponseTime - apiMean) > sensitivity * apiStdDev * 3) {
      newAnomalies.push({
        id: this.generateId(),
        metric: 'api_response_time',
        detectedAt: now,
        baselineValue: apiMean,
        currentValue: currentApiResponseTime,
        deviation: Math.abs(currentApiResponseTime - apiMean) / apiStdDev,
        severity: this.getAnomalySeverity(Math.abs(currentApiResponseTime - apiMean) / apiStdDev),
        description: `API response time anomaly detected: ${currentApiResponseTime.toFixed(2)}ms vs baseline ${apiMean.toFixed(2)}ms`
      });
    }
    
    // Check database query time anomalies
    const dbQueryTimes = recentData.map(d => d.databasePerformance.avgQueryTime);
    const dbMean = this.calculateMean(dbQueryTimes);
    const dbStdDev = this.calculateStdDev(dbQueryTimes, dbMean);
    const currentDbQueryTime = this.performanceHistory[this.performanceHistory.length - 1].databasePerformance.avgQueryTime;
    
    if (Math.abs(currentDbQueryTime - dbMean) > sensitivity * dbStdDev * 3) {
      newAnomalies.push({
        id: this.generateId(),
        metric: 'database_query_time',
        detectedAt: now,
        baselineValue: dbMean,
        currentValue: currentDbQueryTime,
        deviation: Math.abs(currentDbQueryTime - dbMean) / dbStdDev,
        severity: this.getAnomalySeverity(Math.abs(currentDbQueryTime - dbMean) / dbStdDev),
        description: `Database query time anomaly detected: ${currentDbQueryTime.toFixed(2)}ms vs baseline ${dbMean.toFixed(2)}ms`
      });
    }
    
    // Check cache hit rate anomalies
    const cacheHitRates = recentData.map(d => d.cachePerformance.hitRate);
    const cacheMean = this.calculateMean(cacheHitRates);
    const cacheStdDev = this.calculateStdDev(cacheHitRates, cacheMean);
    const currentCacheHitRate = this.performanceHistory[this.performanceHistory.length - 1].cachePerformance.hitRate;
    
    if (Math.abs(currentCacheHitRate - cacheMean) > sensitivity * cacheStdDev * 3) {
      newAnomalies.push({
        id: this.generateId(),
        metric: 'cache_hit_rate',
        detectedAt: now,
        baselineValue: cacheMean,
        currentValue: currentCacheHitRate,
        deviation: Math.abs(currentCacheHitRate - cacheMean) / cacheStdDev,
        severity: this.getAnomalySeverity(Math.abs(currentCacheHitRate - cacheMean) / cacheStdDev),
        description: `Cache hit rate anomaly detected: ${currentCacheHitRate.toFixed(2)}% vs baseline ${cacheMean.toFixed(2)}%`
      });
    }
    
    // Add new anomalies
    newAnomalies.forEach(anomaly => {
      this.anomalies.push(anomaly);
      logger.warn('Performance anomaly detected', {
        anomalyId: anomaly.id,
        metric: anomaly.metric,
        severity: anomaly.severity,
        baselineValue: anomaly.baselineValue,
        currentValue: anomaly.currentValue,
        deviation: anomaly.deviation,
        description: anomaly.description
      });
    });
    
    this.metrics.gauge('performance.anomalies.active', this.anomalies.length);
  }

  private getAnomalySeverity(deviation: number): PerformanceAnomaly['severity'] {
    if (deviation > 5) return 'high';
    if (deviation > 3) return 'medium';
    return 'low';
  }

  /**
   * Update performance trends
   */
  private updateTrends(): void {
    const now = new Date();
    const windowSize = Math.min(10, this.performanceHistory.length);
    
    if (windowSize < 3) return; // Need at least 3 data points for trends
    
    const recentData = this.performanceHistory.slice(-windowSize);
    
    // Update API response time trend
    this.updateMetricTrend('api_response_time', recentData.map(d => d.apiPerformance.avgResponseTime), now);
    
    // Update database query time trend
    this.updateMetricTrend('database_query_time', recentData.map(d => d.databasePerformance.avgQueryTime), now);
    
    // Update cache hit rate trend
    this.updateMetricTrend('cache_hit_rate', recentData.map(d => d.cachePerformance.hitRate), now);
    
    // Update error rate trend
    this.updateMetricTrend('error_rate', recentData.map(d => d.apiPerformance.errorRate), now);
    
    // Update CPU usage trend
    this.updateMetricTrend('cpu_usage', recentData.map(d => d.systemResources.cpuUsage), now);
    
    // Update memory usage trend
    this.updateMetricTrend('memory_usage', recentData.map(d => d.systemResources.memoryUsage), now);
  }

  private updateMetricTrend(metric: string, values: number[], timestamp: Date): void {
    const currentValue = values[values.length - 1];
    const baselineValue = values[0];
    const changePercentage = ((currentValue - baselineValue) / baselineValue) * 100;
    
    // Determine trend direction
    let trend: PerformanceTrend['trend'] = 'stable';
    
    if (Math.abs(changePercentage) > 10) {
      trend = changePercentage > 0 ? 'declining' : 'improving';
    }
    
    // Create or update trend
    const existingTrend = this.trends.get(metric);
    
    if (existingTrend) {
      existingTrend.values.push({ timestamp, value: currentValue });
      existingTrend.baseline = baselineValue;
      existingTrend.current = currentValue;
      existingTrend.changePercentage = changePercentage;
      existingTrend.trend = trend;
      
      // Keep only last 10 values
      if (existingTrend.values.length > 10) {
        existingTrend.values = existingTrend.values.slice(-10);
      }
    } else {
      const trendValues = values.map((value, index) => ({
        timestamp: new Date(timestamp.getTime() - (values.length - 1 - index) * this.pollingInterval * 1000),
        value
      }));
      
      this.trends.set(metric, {
        metric,
        values: trendValues,
        baseline: baselineValue,
        current: currentValue,
        changePercentage,
        trend
      });
    }
  }

  /**
   * Check SLO compliance
   */
  private checkSLOCompliance(): void {
    // In a real implementation, this would check against defined SLOs
    // For this example, we'll use some default SLOs
    
    const now = new Date();
    const dashboardData = this.getPerformanceDashboardData();
    const newComplianceResults: PerformanceSLOCompliance[] = [];
    
    // API Response Time SLO
    newComplianceResults.push({
      sloId: 'api_response_time',
      sloName: 'API Response Time',
      metric: 'api_response_time',
      target: 500, // 500ms
      actualValue: dashboardData.apiPerformance.p95ResponseTime,
      compliancePercentage: Math.min(100, (500 / dashboardData.apiPerformance.p95ResponseTime) * 100),
      inCompliance: dashboardData.apiPerformance.p95ResponseTime <= 500,
      measurementWindow: '1m',
      measuredAt: now
    });
    
    // Database Query Time SLO
    newComplianceResults.push({
      sloId: 'database_query_time',
      sloName: 'Database Query Time',
      metric: 'database_query_time',
      target: 100, // 100ms
      actualValue: dashboardData.databasePerformance.avgQueryTime,
      compliancePercentage: Math.min(100, (100 / dashboardData.databasePerformance.avgQueryTime) * 100),
      inCompliance: dashboardData.databasePerformance.avgQueryTime <= 100,
      measurementWindow: '1m',
      measuredAt: now
    });
    
    // Cache Hit Rate SLO
    newComplianceResults.push({
      sloId: 'cache_hit_rate',
      sloName: 'Cache Hit Rate',
      metric: 'cache_hit_rate',
      target: 80, // 80%
      actualValue: dashboardData.cachePerformance.hitRate,
      compliancePercentage: Math.min(100, (dashboardData.cachePerformance.hitRate / 80) * 100),
      inCompliance: dashboardData.cachePerformance.hitRate >= 80,
      measurementWindow: '1m',
      measuredAt: now
    });
    
    // Error Rate SLO
    newComplianceResults.push({
      sloId: 'error_rate',
      sloName: 'Error Rate',
      metric: 'error_rate',
      target: 1, // 1%
      actualValue: dashboardData.apiPerformance.errorRate,
      compliancePercentage: Math.min(100, ((1 - dashboardData.apiPerformance.errorRate) / 1) * 100),
      inCompliance: dashboardData.apiPerformance.errorRate <= 1,
      measurementWindow: '1m',
      measuredAt: now
    });
    
    // Update compliance results
    this.sloCompliance = newComplianceResults;
    
    // Calculate overall compliance
    const compliantCount = this.sloCompliance.filter(s => s.inCompliance).length;
    const compliancePercentage = (compliantCount / this.sloCompliance.length) * 100;
    
    this.metrics.gauge('performance.slo.compliance', compliancePercentage);
    
    // Log SLO violations
    this.sloCompliance.forEach(slo => {
      if (!slo.inCompliance) {
        logger.warn('SLO violation detected', {
          sloId: slo.sloId,
          sloName: slo.sloName,
          metric: slo.metric,
          target: slo.target,
          actualValue: slo.actualValue,
          compliancePercentage: slo.compliancePercentage
        });
      }
    });
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const now = new Date();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup old alerts (resolve alerts older than 24 hours)
    this.alerts = this.alerts.map(alert => {
      if (!alert.resolvedAt && now.getTime() - alert.triggeredAt.getTime() > retentionPeriod) {
        return { ...alert, resolvedAt: now };
      }
      return alert;
    });
    
    // Remove resolved alerts
    this.alerts = this.alerts.filter(alert => !alert.resolvedAt);
    
    // Cleanup old anomalies
    this.anomalies = this.anomalies.filter(anomaly => {
      return now.getTime() - anomaly.detectedAt.getTime() < retentionPeriod;
    });
    
    // Cleanup old SLO compliance data
    if (this.sloCompliance.length > 100) {
      this.sloCompliance = this.sloCompliance.slice(-100);
    }
    
    // Cleanup old system metrics
    if (this.systemMetricsHistory.length > 100) {
      this.systemMetricsHistory = this.systemMetricsHistory.slice(-100);
    }
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboardData(): Promise<PerformanceDashboardData> {
    const now = new Date();
    
    // Get API performance data
    const apiPerformance = this.getAPIPerformance();
    
    // Get database performance data
    const databasePerformance = this.getDatabasePerformance();
    
    // Get cache performance data
    const cachePerformance = this.getCachePerformance();
    
    // Get system resource metrics
    const systemResources = this.getSystemResources();
    
    return {
      apiPerformance,
      databasePerformance,
      cachePerformance,
      systemResources,
      alerts: this.getActiveAlerts(),
      anomalies: this.getActiveAnomalies(),
      trends: this.getPerformanceTrends(),
      timestamp: now
    };
  }

  private getAPIPerformance(): PerformanceDashboardData['apiPerformance'] {
    if (!this.apiOptimizer) {
      return {
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        cacheHitRate: 0
      };
    }
    
    const report = this.apiOptimizer.generateOptimizationReport();
    
    return {
      avgResponseTime: report.avgResponseTime,
      p50ResponseTime: report.p50ResponseTime,
      p95ResponseTime: report.p95ResponseTime,
      p99ResponseTime: report.p99ResponseTime,
      errorRate: report.errorRate || 0,
      throughput: report.totalRequests / (this.pollingInterval || 60),
      cacheHitRate: report.cacheHitRate
    };
  }

  private getDatabasePerformance(): PerformanceDashboardData['databasePerformance'] {
    if (!this.queryOptimizer) {
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        fullTableScans: 0,
        indexUsage: 0,
        connectionPoolUsage: 0
      };
    }
    
    const report = this.queryOptimizer.generateOptimizationReport();
    
    return {
      avgQueryTime: report.queryStats.reduce((sum, stat) => sum + stat.avgDuration, 0) / Math.max(1, report.queryStats.length),
      slowQueries: report.slowQueries,
      fullTableScans: report.fullTableScans,
      indexUsage: report.indexStats.reduce((sum, stat) => sum + stat.usageCount, 0),
      connectionPoolUsage: 0 // Would come from connection pool metrics
    };
  }

  private getCachePerformance(): PerformanceDashboardData['cachePerformance'] {
    if (!this.cacheManager) {
      return {
        hitRate: 0,
        memoryUsage: 0,
        evictionRate: 0,
        currentKeys: 0
      };
    }
    
    const stats = this.cacheManager.getStats();
    const cacheSize = this.cacheManager.getCacheSize();
    
    return {
      hitRate: stats.hitRate,
      memoryUsage: stats.memoryUsage,
      evictionRate: stats.evictionCount / (this.pollingInterval || 60),
      currentKeys: cacheSize.keys
    };
  }

  private getSystemResources(): SystemResourceMetrics {
    // In a real implementation, this would collect actual system metrics
    // For this example, we'll simulate some values
    
    const cpuUsage = 30 + Math.random() * 20; // 30-50%
    const memoryUsage = 40 + Math.random() * 15; // 40-55%
    const diskUsage = 25 + Math.random() * 10; // 25-35%
    
    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkThroughput: 1 + Math.random() * 5, // 1-6 MB/s
      diskIO: 0.5 + Math.random() * 2, // 0.5-2.5 MB/s
      openConnections: 50 + Math.floor(Math.random() * 100), // 50-150
      activeRequests: 10 + Math.floor(Math.random() * 50), // 10-60
      queueLength: Math.floor(Math.random() * 10), // 0-10
      timestamp: new Date()
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolvedAt);
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies(): PerformanceAnomaly[] {
    return [...this.anomalies];
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): PerformanceTrend[] {
    return Array.from(this.trends.values());
  }

  /**
   * Get SLO compliance report
   */
  getSLOCompliance(): PerformanceSLOCompliance[] {
    return [...this.sloCompliance];
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit: number = 24): PerformanceDashboardData[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get system metrics history
   */
  getSystemMetricsHistory(limit: number = 24): SystemResourceMetrics[] {
    return this.systemMetricsHistory.slice(-limit);
  }

  /**
   * Resolve performance alert
   */
  resolveAlert(alertId: string): boolean {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId && !alert.resolvedAt);
    
    if (alertIndex === -1) {
      return false;
    }
    
    this.alerts[alertIndex] = {
      ...this.alerts[alertIndex],
      resolvedAt: new Date()
    };
    
    this.metrics.gauge('performance.alerts.active', this.alerts.filter(a => !a.resolvedAt).length);
    
    logger.info('Performance alert resolved', { alertId });
    
    return true;
  }

  /**
   * Resolve performance anomaly
   */
  resolveAnomaly(anomalyId: string): boolean {
    const anomalyIndex = this.anomalies.findIndex(anomaly => anomaly.id === anomalyId);
    
    if (anomalyIndex === -1) {
      return false;
    }
    
    this.anomalies.splice(anomalyIndex, 1);
    
    this.metrics.gauge('performance.anomalies.active', this.anomalies.length);
    
    logger.info('Performance anomaly resolved', { anomalyId });
    
    return true;
  }

  /**
   * Update performance monitor configuration
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.pollingInterval) {
      this.pollingInterval = config.pollingInterval;
      this.restartMonitoring();
    }
    
    logger.info('Performance monitor configuration updated', { config });
  }

  /**
   * Restart monitoring with new interval
   */
  private restartMonitoring(): void {
    this.stopMonitoring();
    this.startMonitoring();
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    dashboard: PerformanceDashboardData;
    alerts: PerformanceAlert[];
    anomalies: PerformanceAnomaly[];
    trends: PerformanceTrend[];
    sloCompliance: PerformanceSLOCompliance[];
    generatedAt: Date;
  } {
    return {
      dashboard: this.getPerformanceDashboardData(),
      alerts: this.getActiveAlerts(),
      anomalies: this.getActiveAnomalies(),
      trends: this.getPerformanceTrends(),
      sloCompliance: this.getSLOCompliance(),
      generatedAt: new Date()
    };
  }

  /**
   * Generate performance alert report
   */
  generateAlertReport(): {
    activeAlerts: number;
    resolvedAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    recentAlerts: PerformanceAlert[];
    generatedAt: Date;
  } {
    const alertsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    const alertsByType: Record<string, number> = {
      threshold: 0,
      anomaly: 0,
      regression: 0
    };
    
    this.alerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });
    
    return {
      activeAlerts: this.alerts.filter(a => !a.resolvedAt).length,
      resolvedAlerts: this.alerts.filter(a => a.resolvedAt).length,
      alertsBySeverity,
      alertsByType,
      recentAlerts: this.alerts.slice(-10),
      generatedAt: new Date()
    };
  }

  /**
   * Generate performance anomaly report
   */
  generateAnomalyReport(): {
    totalAnomalies: number;
    anomaliesBySeverity: Record<string, number>;
    anomaliesByMetric: Record<string, number>;
    recentAnomalies: PerformanceAnomaly[];
    generatedAt: Date;
  } {
    const anomaliesBySeverity: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    const anomaliesByMetric: Record<string, number> = {};
    
    this.anomalies.forEach(anomaly => {
      anomaliesBySeverity[anomaly.severity] = (anomaliesBySeverity[anomaly.severity] || 0) + 1;
      anomaliesByMetric[anomaly.metric] = (anomaliesByMetric[anomaly.metric] || 0) + 1;
    });
    
    return {
      totalAnomalies: this.anomalies.length,
      anomaliesBySeverity,
      anomaliesByMetric,
      recentAnomalies: this.anomalies.slice(-10),
      generatedAt: new Date()
    };
  }

  /**
   * Generate SLO compliance report
   */
  generateSLOReport(): {
    totalSLOs: number;
    compliantSLOs: number;
    compliancePercentage: number;
    sloCompliance: PerformanceSLOCompliance[];
    generatedAt: Date;
  } {
    const compliantSLOs = this.sloCompliance.filter(slo => slo.inCompliance).length;
    const compliancePercentage = (compliantSLOs / this.sloCompliance.length) * 100;
    
    return {
      totalSLOs: this.sloCompliance.length,
      compliantSLOs,
      compliancePercentage,
      sloCompliance: [...this.sloCompliance],
      generatedAt: new Date()
    };
  }

  /**
   * Clear all performance data
   */
  clearAllData(): void {
    this.alerts = [];
    this.anomalies = [];
    this.trends.clear();
    this.sloCompliance = [];
    this.systemMetricsHistory = [];
    this.performanceHistory = [];
    
    this.metrics.gauge('performance.alerts.active', 0);
    this.metrics.gauge('performance.anomalies.active', 0);
    this.metrics.gauge('performance.slo.compliance', 100);
    
    logger.info('All performance monitoring data cleared');
  }

  /**
   * Helper methods
   */

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    
    const variance = values.reduce((sum, value) => {
      const diff = value - mean;
      return sum + (diff * diff);
    }, 0) / (values.length - 1);
    
    return Math.sqrt(variance);
  }

  /**
   * Performance monitoring decorators
   */

  /**
   * Decorator to monitor API performance
   */
  MonitorAPIPerformance() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            // This would be enhanced in a real implementation
            perfMonitor.metrics.increment('api.requests');
            perfMonitor.metrics.timing('api.response_time', duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            perfMonitor.metrics.increment('api.errors');
            perfMonitor.metrics.timing('api.response_time', duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Decorator to monitor database performance
   */
  MonitorDatabasePerformance() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            perfMonitor.metrics.increment('database.queries');
            perfMonitor.metrics.timing('database.query_time', duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            perfMonitor.metrics.increment('database.errors');
            perfMonitor.metrics.timing('database.query_time', duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Decorator to monitor cache performance
   */
  MonitorCachePerformance() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            perfMonitor.metrics.increment('cache.operations');
            perfMonitor.metrics.timing('cache.operation_time', duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Get performance monitor from context
          const perfMonitor: PerformanceMonitor = this.perfMonitor;
          if (perfMonitor) {
            perfMonitor.metrics.increment('cache.errors');
            perfMonitor.metrics.timing('cache.operation_time', duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }
}

/**
 * Factory function to create PerformanceMonitor
 */
export function createPerformanceMonitor(options?: {
  config?: PerformanceMonitorConfig;
  cacheManager?: AdvancedCacheManager;
  queryOptimizer?: AdvancedQueryOptimizer;
  apiOptimizer?: APIResponseOptimizer;
  metrics?: MetricsCollector;
}): PerformanceMonitor {
  return new PerformanceMonitor(options);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitoringUtils {
  /**
   * Generate Prometheus metrics from performance data
   */
  static generatePrometheusMetrics(data: PerformanceDashboardData): string {
    const lines: string[] = [];
    const timestamp = Math.floor(data.timestamp.getTime() / 1000);
    
    // API Performance Metrics
    lines.push(`api_response_time_avg{type="p50"} ${data.apiPerformance.p50ResponseTime} ${timestamp}`);
    lines.push(`api_response_time_avg{type="p95"} ${data.apiPerformance.p95ResponseTime} ${timestamp}`);
    lines.push(`api_response_time_avg{type="p99"} ${data.apiPerformance.p99ResponseTime} ${timestamp}`);
    lines.push(`api_response_time_avg{type="max"} ${data.apiPerformance.maxResponseTime} ${timestamp}`);
    lines.push(`api_error_rate ${data.apiPerformance.errorRate} ${timestamp}`);
    lines.push(`api_throughput ${data.apiPerformance.throughput} ${timestamp}`);
    lines.push(`api_cache_hit_rate ${data.apiPerformance.cacheHitRate} ${timestamp}`);
    
    // Database Performance Metrics
    lines.push(`database_query_time_avg ${data.databasePerformance.avgQueryTime} ${timestamp}`);
    lines.push(`database_slow_queries ${data.databasePerformance.slowQueries} ${timestamp}`);
    lines.push(`database_full_table_scans ${data.databasePerformance.fullTableScans} ${timestamp}`);
    lines.push(`database_index_usage ${data.databasePerformance.indexUsage} ${timestamp}`);
    
    // Cache Performance Metrics
    lines.push(`cache_hit_rate ${data.cachePerformance.hitRate} ${timestamp}`);
    lines.push(`cache_memory_usage ${data.cachePerformance.memoryUsage} ${timestamp}`);
    lines.push(`cache_eviction_rate ${data.cachePerformance.evictionRate} ${timestamp}`);
    lines.push(`cache_current_keys ${data.cachePerformance.currentKeys} ${timestamp}`);
    
    // System Resource Metrics
    lines.push(`system_cpu_usage ${data.systemResources.cpuUsage} ${timestamp}`);
    lines.push(`system_memory_usage ${data.systemResources.memoryUsage} ${timestamp}`);
    lines.push(`system_disk_usage ${data.systemResources.diskUsage} ${timestamp}`);
    lines.push(`system_network_throughput ${data.systemResources.networkThroughput} ${timestamp}`);
    lines.push(`system_disk_io ${data.systemResources.diskIO} ${timestamp}`);
    lines.push(`system_open_connections ${data.systemResources.openConnections} ${timestamp}`);
    lines.push(`system_active_requests ${data.systemResources.activeRequests} ${timestamp}`);
    lines.push(`system_queue_length ${data.systemResources.queueLength} ${timestamp}`);
    
    // Alerts and Anomalies
    lines.push(`performance_alerts_active ${data.alerts.length} ${timestamp}`);
    lines.push(`performance_anomalies_active ${data.anomalies.length} ${timestamp}`);
    
    return lines.join('\n');
  }

  /**
   * Generate Grafana dashboard JSON for performance monitoring
   */
  static generateGrafanaDashboard(): any {
    return {
      title: 'Performance Monitoring Dashboard',
      tags: ['performance', 'monitoring'],
      timezone: 'browser',
      panels: [
        {
          title: 'API Performance',
          type: 'graph',
          targets: [
            { expr: 'api_response_time_avg{type="p50"}', legendFormat: 'P50 Response Time' },
            { expr: 'api_response_time_avg{type="p95"}', legendFormat: 'P95 Response Time' },
            { expr: 'api_response_time_avg{type="p99"}', legendFormat: 'P99 Response Time' }
          ],
          yaxes: [
            { format: 'ms', label: 'Response Time' },
            { format: 'short', label: '' }
          ]
        },
        {
          title: 'Error Rate',
          type: 'singlestat',
          targets: [
            { expr: 'api_error_rate', format: 'percent' }
          ],
          thresholds: '1,5,10'
        },
        {
          title: 'Cache Hit Rate',
          type: 'singlestat',
          targets: [
            { expr: 'cache_hit_rate', format: 'percent' }
          ],
          thresholds: '70,80,90'
        },
        {
          title: 'System Resources',
          type: 'graph',
          targets: [
            { expr: 'system_cpu_usage', legendFormat: 'CPU Usage' },
            { expr: 'system_memory_usage', legendFormat: 'Memory Usage' },
            { expr: 'system_disk_usage', legendFormat: 'Disk Usage' }
          ],
          yaxes: [
            { format: 'percent', label: 'Usage' },
            { format: 'short', label: '' }
          ]
        },
        {
          title: 'Active Alerts',
          type: 'singlestat',
          targets: [
            { expr: 'performance_alerts_active', format: 'none' }
          ],
          thresholds: '0,5,10'
        },
        {
          title: 'Active Anomalies',
          type: 'singlestat',
          targets: [
            { expr: 'performance_anomalies_active', format: 'none' }
          ],
          thresholds: '0,3,5'
        }
      ],
      templating: {
        list: []
      },
      schemaVersion: 16,
      version: 1
    };
  }

  /**
   * Generate performance alert webhook payload
   */
  static generateAlertWebhookPayload(alert: PerformanceAlert): any {
    return {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      triggeredAt: alert.triggeredAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
      description: alert.description,
      context: alert.context || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate performance anomaly webhook payload
   */
  static generateAnomalyWebhookPayload(anomaly: PerformanceAnomaly): any {
    return {
      anomalyId: anomaly.id,
      metric: anomaly.metric,
      detectedAt: anomaly.detectedAt.toISOString(),
      baselineValue: anomaly.baselineValue,
      currentValue: anomaly.currentValue,
      deviation: anomaly.deviation,
      severity: anomaly.severity,
      description: anomaly.description,
      context: anomaly.context || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate performance score (0-100)
   */
  static calculatePerformanceScore(data: PerformanceDashboardData): number {
    let score = 100;
    
    // API Performance factors
    if (data.apiPerformance.p95ResponseTime > 1000) {
      score -= 20;
    } else if (data.apiPerformance.p95ResponseTime > 500) {
      score -= 10;
    }
    
    if (data.apiPerformance.errorRate > 5) {
      score -= 30;
    } else if (data.apiPerformance.errorRate > 1) {
      score -= 15;
    }
    
    if (data.apiPerformance.cacheHitRate < 70) {
      score -= 10;
    } else if (data.apiPerformance.cacheHitRate < 80) {
      score -= 5;
    }
    
    // Database Performance factors
    if (data.databasePerformance.avgQueryTime > 200) {
      score -= 15;
    } else if (data.databasePerformance.avgQueryTime > 100) {
      score -= 5;
    }
    
    if (data.databasePerformance.slowQueries > 10) {
      score -= 10;
    } else if (data.databasePerformance.slowQueries > 5) {
      score -= 5;
    }
    
    // Cache Performance factors
    if (data.cachePerformance.hitRate < 60) {
      score -= 15;
    } else if (data.cachePerformance.hitRate < 70) {
      score -= 5;
    }
    
    // System Resource factors
    if (data.systemResources.cpuUsage > 90) {
      score -= 20;
    } else if (data.systemResources.cpuUsage > 80) {
      score -= 10;
    }
    
    if (data.systemResources.memoryUsage > 90) {
      score -= 20;
    } else if (data.systemResources.memoryUsage > 80) {
      score -= 10;
    }
    
    // Alerts and anomalies
    if (data.alerts.length > 5) {
      score -= 20;
    } else if (data.alerts.length > 0) {
      score -= 5;
    }
    
    if (data.anomalies.length > 3) {
      score -= 15;
    } else if (data.anomalies.length > 0) {
      score -= 5;
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate performance health status
   */
  static generateHealthStatus(score: number): {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    color: 'green' | 'yellow' | 'orange' | 'red';
    description: string;
  } {
    if (score >= 90) {
      return {
        status: 'healthy',
        color: 'green',
        description: 'System is performing optimally'
      };
    } else if (score >= 75) {
      return {
        status: 'degraded',
        color: 'yellow',
        description: 'System performance is degraded'
      };
    } else if (score >= 50) {
      return {
        status: 'unhealthy',
        color: 'orange',
        description: 'System performance is unhealthy'
      };
    } else {
      return {
        status: 'critical',
        color: 'red',
        description: 'System performance is critical'
      };
    }
  }
}