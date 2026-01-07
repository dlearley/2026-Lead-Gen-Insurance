import { PerformanceMonitor, PerformanceMonitoringUtils } from './performance-monitor.js';
import { AdvancedCacheManager } from '../cache/advanced-cache-manager.js';
import { AdvancedQueryOptimizer } from '../database/advanced-query-optimizer.js';
import { APIResponseOptimizer } from '../api/api-optimizer.js';
import { MetricsCollector } from './metrics.js';

describe('PerformanceMonitor', () => {
  let perfMonitor: PerformanceMonitor;
  let cacheManagerMock: any;
  let queryOptimizerMock: any;
  let apiOptimizerMock: any;
  let metricsMock: any;

  beforeEach(() => {
    cacheManagerMock = {
      getStats: jest.fn().mockReturnValue({
        hitCount: 80,
        missCount: 20,
        hitRate: 80,
        memoryUsage: 50 * 1024 * 1024,
        evictionCount: 5
      }),
      getCacheSize: jest.fn().mockResolvedValue({ keys: 100, memoryUsage: 50 }),
      healthCheck: jest.fn().mockResolvedValue({
        healthy: true,
        redisConnected: true,
        localCacheEnabled: true,
        stats: { hitRate: 80 },
        memoryStatus: 'NORMAL'
      })
    };

    queryOptimizerMock = {
      generateOptimizationReport: jest.fn().mockReturnValue({
        slowQueries: 5,
        fullTableScans: 2,
        queryStats: [
          { query: 'SELECT * FROM leads', avgDuration: 50, executionCount: 100 }
        ],
        indexStats: [],
        topOptimizationOpportunities: []
      })
    };

    apiOptimizerMock = {
      generateOptimizationReport: jest.fn().mockReturnValue({
        avgResponseTime: 150,
        p50ResponseTime: 120,
        p95ResponseTime: 250,
        p99ResponseTime: 400,
        errorRate: 0.5,
        totalRequests: 1000,
        cacheHitRate: 85
      })
    };

    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn().mockReturnValue(0)
    };

    perfMonitor = new PerformanceMonitor({
      cacheManager: cacheManagerMock as any,
      queryOptimizer: queryOptimizerMock as any,
      apiOptimizer: apiOptimizerMock as any,
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(perfMonitor).toBeDefined();
      expect(perfMonitor['pollingInterval']).toBe(60);
      expect(perfMonitor['alerts'].length).toBe(0);
      expect(perfMonitor['anomalies'].length).toBe(0);
    });

    it('should accept custom configuration', () => {
      const customMonitor = new PerformanceMonitor({
        config: {
          pollingInterval: 30,
          alertThresholds: {
            apiResponseTime: 500
          }
        }
      });

      expect(customMonitor['pollingInterval']).toBe(30);
      expect(customMonitor['config'].alertThresholds?.apiResponseTime).toBe(500);
    });

    it('should start monitoring on initialization', () => {
      // Monitoring should be started automatically
      expect(perfMonitor['pollingTimeout']).toBeDefined();
    });
  });

  describe('Performance Data Collection', () => {
    it('should collect performance dashboard data', async () => {
      const dashboard = await perfMonitor.getPerformanceDashboardData();

      expect(dashboard).toBeDefined();
      expect(dashboard.apiPerformance).toBeDefined();
      expect(dashboard.databasePerformance).toBeDefined();
      expect(dashboard.cachePerformance).toBeDefined();
      expect(dashboard.systemResources).toBeDefined();
    });

    it('should get API performance data', () => {
      const apiPerformance = perfMonitor['getAPIPerformance']();
      
      expect(apiPerformance.avgResponseTime).toBe(150);
      expect(apiPerformance.cacheHitRate).toBe(85);
    });

    it('should get database performance data', () => {
      const dbPerformance = perfMonitor['getDatabasePerformance']();
      
      expect(dbPerformance.avgQueryTime).toBe(50);
      expect(dbPerformance.slowQueries).toBe(5);
    });

    it('should get cache performance data', () => {
      const cachePerformance = perfMonitor['getCachePerformance']();
      
      expect(cachePerformance.hitRate).toBe(80);
      expect(cachePerformance.currentKeys).toBe(100);
    });

    it('should get system resource metrics', () => {
      const systemResources = perfMonitor['getSystemResources']();
      
      expect(systemResources.cpuUsage).toBeGreaterThan(0);
      expect(systemResources.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Alert Management', () => {
    it('should detect high API response time', async () => {
      // Mock high response time
      apiOptimizerMock.generateOptimizationReport.mockReturnValue({
        avgResponseTime: 1500, // > 1000ms threshold
        p50ResponseTime: 1200,
        p95ResponseTime: 2500,
        p99ResponseTime: 4000,
        errorRate: 0.5,
        totalRequests: 1000,
        cacheHitRate: 85
      });

      // Force alert check
      await perfMonitor['checkAlerts']();

      const alerts = perfMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.metric === 'api_response_time')).toBe(true);
    });

    it('should detect low cache hit rate', async () => {
      // Mock low cache hit rate
      cacheManagerMock.getStats.mockReturnValue({
        hitCount: 40,
        missCount: 60,
        hitRate: 40, // < 70% threshold
        memoryUsage: 50 * 1024 * 1024,
        evictionCount: 5
      });

      // Force alert check
      await perfMonitor['checkAlerts']();

      const alerts = perfMonitor.getActiveAlerts();
      expect(alerts.some(a => a.metric === 'cache_hit_rate')).toBe(true);
    });

    it('should detect high error rate', async () => {
      // Mock high error rate
      apiOptimizerMock.generateOptimizationReport.mockReturnValue({
        avgResponseTime: 150,
        p50ResponseTime: 120,
        p95ResponseTime: 250,
        p99ResponseTime: 400,
        errorRate: 5.0, // > 1% threshold
        totalRequests: 1000,
        cacheHitRate: 85
      });

      // Force alert check
      await perfMonitor['checkAlerts']();

      const alerts = perfMonitor.getActiveAlerts();
      expect(alerts.some(a => a.metric === 'error_rate')).toBe(true);
      expect(alerts.some(a => a.severity === 'critical')).toBe(true);
    });

    it('should resolve alerts', () => {
      // Add an alert
      perfMonitor['alerts'] = [
        {
          id: 'alert1',
          type: 'threshold',
          severity: 'high',
          metric: 'api_response_time',
          value: 1500,
          threshold: 1000,
          triggeredAt: new Date(),
          description: 'High API response time'
        }
      ];

      const resolved = perfMonitor.resolveAlert('alert1');
      expect(resolved).toBe(true);
      expect(perfMonitor.getActiveAlerts().length).toBe(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect performance anomalies', async () => {
      // Add some performance history
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        perfMonitor['performanceHistory'].push({
          apiPerformance: { avgResponseTime: 150, p50ResponseTime: 120, p95ResponseTime: 250, p99ResponseTime: 400, errorRate: 0.5, throughput: 100, cacheHitRate: 85 },
          databasePerformance: { avgQueryTime: 50, slowQueries: 2, fullTableScans: 1, indexUsage: 10, connectionPoolUsage: 5 },
          cachePerformance: { hitRate: 80, memoryUsage: 50, evictionRate: 0.1, currentKeys: 100 },
          systemResources: { cpuUsage: 30, memoryUsage: 40, diskUsage: 25, networkThroughput: 2, diskIO: 1, openConnections: 50, activeRequests: 10, queueLength: 0, timestamp: new Date(now.getTime() - (9 - i) * 1000) },
          alerts: [],
          anomalies: [],
          trends: [],
          timestamp: new Date(now.getTime() - (9 - i) * 1000)
        });
      }

      // Add an anomalous data point
      perfMonitor['performanceHistory'].push({
        apiPerformance: { avgResponseTime: 1000, p50ResponseTime: 800, p95ResponseTime: 1500, p99ResponseTime: 2000, errorRate: 0.5, throughput: 100, cacheHitRate: 85 },
        databasePerformance: { avgQueryTime: 50, slowQueries: 2, fullTableScans: 1, indexUsage: 10, connectionPoolUsage: 5 },
        cachePerformance: { hitRate: 80, memoryUsage: 50, evictionRate: 0.1, currentKeys: 100 },
        systemResources: { cpuUsage: 30, memoryUsage: 40, diskUsage: 25, networkThroughput: 2, diskIO: 1, openConnections: 50, activeRequests: 10, queueLength: 0, timestamp: now },
        alerts: [],
        anomalies: [],
        trends: [],
        timestamp: now
      });

      // Force anomaly detection
      await perfMonitor['detectAnomalies']();

      const anomalies = perfMonitor.getActiveAnomalies();
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(a => a.metric === 'api_response_time')).toBe(true);
    });

    it('should resolve anomalies', () => {
      // Add an anomaly
      perfMonitor['anomalies'] = [
        {
          id: 'anomaly1',
          metric: 'api_response_time',
          detectedAt: new Date(),
          baselineValue: 150,
          currentValue: 1000,
          deviation: 5,
          severity: 'high',
          description: 'API response time anomaly'
        }
      ];

      const resolved = perfMonitor.resolveAnomaly('anomaly1');
      expect(resolved).toBe(true);
      expect(perfMonitor.getActiveAnomalies().length).toBe(0);
    });
  });

  describe('Performance Trends', () => {
    it('should track performance trends', async () => {
      // Add some performance history
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        perfMonitor['performanceHistory'].push({
          apiPerformance: { avgResponseTime: 150 + i * 10, p50ResponseTime: 120, p95ResponseTime: 250, p99ResponseTime: 400, errorRate: 0.5, throughput: 100, cacheHitRate: 85 },
          databasePerformance: { avgQueryTime: 50, slowQueries: 2, fullTableScans: 1, indexUsage: 10, connectionPoolUsage: 5 },
          cachePerformance: { hitRate: 80, memoryUsage: 50, evictionRate: 0.1, currentKeys: 100 },
          systemResources: { cpuUsage: 30, memoryUsage: 40, diskUsage: 25, networkThroughput: 2, diskIO: 1, openConnections: 50, activeRequests: 10, queueLength: 0, timestamp: new Date(now.getTime() - (4 - i) * 1000) },
          alerts: [],
          anomalies: [],
          trends: [],
          timestamp: new Date(now.getTime() - (4 - i) * 1000)
        });
      }

      // Force trend update
      await perfMonitor['updateTrends']();

      const trends = perfMonitor.getPerformanceTrends();
      expect(trends.length).toBeGreaterThan(0);
      expect(trends.some(t => t.metric === 'api_response_time')).toBe(true);
    });
  });

  describe('SLO Compliance', () => {
    it('should check SLO compliance', async () => {
      // Force SLO check
      await perfMonitor['checkSLOCompliance']();

      const sloCompliance = perfMonitor.getSLOCompliance();
      expect(sloCompliance.length).toBeGreaterThan(0);
      expect(sloCompliance.some(s => s.metric === 'api_response_time')).toBe(true);
    });

    it('should detect SLO violations', async () => {
      // Mock SLO violation
      apiOptimizerMock.generateOptimizationReport.mockReturnValue({
        avgResponseTime: 150,
        p50ResponseTime: 120,
        p95ResponseTime: 600, // > 500ms target
        p99ResponseTime: 400,
        errorRate: 0.5,
        totalRequests: 1000,
        cacheHitRate: 85
      });

      // Force SLO check
      await perfMonitor['checkSLOCompliance']();

      const sloCompliance = perfMonitor.getSLOCompliance();
      expect(sloCompliance.some(s => !s.inCompliance)).toBe(true);
    });
  });

  describe('Performance Reports', () => {
    it('should generate performance report', async () => {
      const report = perfMonitor.generatePerformanceReport();

      expect(report.dashboard).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.sloCompliance).toBeDefined();
    });

    it('should generate alert report', () => {
      // Add some alerts
      perfMonitor['alerts'] = [
        {
          id: 'alert1',
          type: 'threshold',
          severity: 'high',
          metric: 'api_response_time',
          value: 1500,
          threshold: 1000,
          triggeredAt: new Date(),
          description: 'High API response time'
        },
        {
          id: 'alert2',
          type: 'threshold',
          severity: 'critical',
          metric: 'error_rate',
          value: 5,
          threshold: 1,
          triggeredAt: new Date(),
          description: 'High error rate'
        }
      ];

      const report = perfMonitor.generateAlertReport();
      
      expect(report.activeAlerts).toBe(2);
      expect(report.alertsBySeverity.critical).toBe(1);
      expect(report.alertsBySeverity.high).toBe(1);
    });

    it('should generate anomaly report', () => {
      // Add some anomalies
      perfMonitor['anomalies'] = [
        {
          id: 'anomaly1',
          metric: 'api_response_time',
          detectedAt: new Date(),
          baselineValue: 150,
          currentValue: 1000,
          deviation: 5,
          severity: 'high',
          description: 'API response time anomaly'
        },
        {
          id: 'anomaly2',
          metric: 'database_query_time',
          detectedAt: new Date(),
          baselineValue: 50,
          currentValue: 500,
          deviation: 8,
          severity: 'high',
          description: 'Database query time anomaly'
        }
      ];

      const report = perfMonitor.generateAnomalyReport();
      
      expect(report.totalAnomalies).toBe(2);
      expect(report.anomaliesBySeverity.high).toBe(2);
    });

    it('should generate SLO report', async () => {
      // Force SLO check
      await perfMonitor['checkSLOCompliance']();

      const report = perfMonitor.generateSLOReport();
      
      expect(report.totalSLOs).toBeGreaterThan(0);
      expect(report.sloCompliance.length).toBeGreaterThan(0);
    });
  });

  describe('Performance History', () => {
    it('should get performance history', async () => {
      // Add some performance history
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        perfMonitor['performanceHistory'].push({
          apiPerformance: { avgResponseTime: 150, p50ResponseTime: 120, p95ResponseTime: 250, p99ResponseTime: 400, errorRate: 0.5, throughput: 100, cacheHitRate: 85 },
          databasePerformance: { avgQueryTime: 50, slowQueries: 2, fullTableScans: 1, indexUsage: 10, connectionPoolUsage: 5 },
          cachePerformance: { hitRate: 80, memoryUsage: 50, evictionRate: 0.1, currentKeys: 100 },
          systemResources: { cpuUsage: 30, memoryUsage: 40, diskUsage: 25, networkThroughput: 2, diskIO: 1, openConnections: 50, activeRequests: 10, queueLength: 0, timestamp: new Date(now.getTime() - (4 - i) * 1000) },
          alerts: [],
          anomalies: [],
          trends: [],
          timestamp: new Date(now.getTime() - (4 - i) * 1000)
        });
      }

      const history = perfMonitor.getPerformanceHistory(3);
      expect(history.length).toBe(3);
    });

    it('should get system metrics history', () => {
      // Add some system metrics
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        perfMonitor['systemMetricsHistory'].push({
          cpuUsage: 30 + i,
          memoryUsage: 40 + i,
          diskUsage: 25 + i,
          networkThroughput: 2 + i * 0.1,
          diskIO: 1 + i * 0.1,
          openConnections: 50 + i,
          activeRequests: 10 + i,
          queueLength: i,
          timestamp: new Date(now.getTime() - (4 - i) * 1000)
        });
      }

      const history = perfMonitor.getSystemMetricsHistory(3);
      expect(history.length).toBe(3);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      perfMonitor.updateConfig({
        pollingInterval: 30,
        alertThresholds: {
          apiResponseTime: 500
        }
      });

      expect(perfMonitor['config'].pollingInterval).toBe(30);
      expect(perfMonitor['config'].alertThresholds?.apiResponseTime).toBe(500);
    });

    it('should restart monitoring when polling interval changes', () => {
      const originalTimeout = perfMonitor['pollingTimeout'];
      
      perfMonitor.updateConfig({
        pollingInterval: 30
      });

      expect(perfMonitor['pollingTimeout']).not.toBe(originalTimeout);
      expect(perfMonitor['pollingInterval']).toBe(30);
    });
  });

  describe('Data Management', () => {
    it('should clear all performance data', () => {
      // Add some data
      perfMonitor['alerts'] = [
        {
          id: 'alert1',
          type: 'threshold',
          severity: 'high',
          metric: 'api_response_time',
          value: 1500,
          threshold: 1000,
          triggeredAt: new Date(),
          description: 'High API response time'
        }
      ];

      perfMonitor['anomalies'] = [
        {
          id: 'anomaly1',
          metric: 'api_response_time',
          detectedAt: new Date(),
          baselineValue: 150,
          currentValue: 1000,
          deviation: 5,
          severity: 'high',
          description: 'API response time anomaly'
        }
      ];

      perfMonitor.clearAllData();

      expect(perfMonitor.getActiveAlerts().length).toBe(0);
      expect(perfMonitor.getActiveAnomalies().length).toBe(0);
      expect(perfMonitor.getPerformanceTrends().length).toBe(0);
    });
  });

  describe('Performance Monitoring Decorators', () => {
    it('should create monitor API performance decorator', () => {
      const decorator = perfMonitor.MonitorAPIPerformance();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create monitor database performance decorator', () => {
      const decorator = perfMonitor.MonitorDatabasePerformance();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create monitor cache performance decorator', () => {
      const decorator = perfMonitor.MonitorCachePerformance();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});

describe('PerformanceMonitoringUtils', () => {
  describe('Prometheus Metrics', () => {
    it('should generate Prometheus metrics', () => {
      const dashboardData = {
        apiPerformance: {
          avgResponseTime: 150,
          p50ResponseTime: 120,
          p95ResponseTime: 250,
          p99ResponseTime: 400,
          errorRate: 0.5,
          throughput: 100,
          cacheHitRate: 85
        },
        databasePerformance: {
          avgQueryTime: 50,
          slowQueries: 2,
          fullTableScans: 1,
          indexUsage: 10,
          connectionPoolUsage: 5
        },
        cachePerformance: {
          hitRate: 80,
          memoryUsage: 50,
          evictionRate: 0.1,
          currentKeys: 100
        },
        systemResources: {
          cpuUsage: 30,
          memoryUsage: 40,
          diskUsage: 25,
          networkThroughput: 2,
          diskIO: 1,
          openConnections: 50,
          activeRequests: 10,
          queueLength: 0,
          timestamp: new Date()
        },
        alerts: [],
        anomalies: [],
        trends: [],
        timestamp: new Date()
      };

      const metrics = PerformanceMonitoringUtils.generatePrometheusMetrics(dashboardData);

      expect(metrics).toContain('api_response_time_avg');
      expect(metrics).toContain('database_query_time_avg');
      expect(metrics).toContain('cache_hit_rate');
      expect(metrics).toContain('system_cpu_usage');
    });
  });

  describe('Grafana Dashboard', () => {
    it('should generate Grafana dashboard', () => {
      const dashboard = PerformanceMonitoringUtils.generateGrafanaDashboard();

      expect(dashboard.title).toBe('Performance Monitoring Dashboard');
      expect(dashboard.panels.length).toBeGreaterThan(0);
      expect(dashboard.panels.some(p => p.title === 'API Performance')).toBe(true);
      expect(dashboard.panels.some(p => p.title === 'Cache Hit Rate')).toBe(true);
    });
  });

  describe('Webhook Payloads', () => {
    it('should generate alert webhook payload', () => {
      const alert = {
        id: 'alert1',
        type: 'threshold',
        severity: 'high',
        metric: 'api_response_time',
        value: 1500,
        threshold: 1000,
        triggeredAt: new Date(),
        description: 'High API response time'
      };

      const payload = PerformanceMonitoringUtils.generateAlertWebhookPayload(alert);

      expect(payload.alertId).toBe('alert1');
      expect(payload.severity).toBe('high');
      expect(payload.metric).toBe('api_response_time');
    });

    it('should generate anomaly webhook payload', () => {
      const anomaly = {
        id: 'anomaly1',
        metric: 'api_response_time',
        detectedAt: new Date(),
        baselineValue: 150,
        currentValue: 1000,
        deviation: 5,
        severity: 'high',
        description: 'API response time anomaly'
      };

      const payload = PerformanceMonitoringUtils.generateAnomalyWebhookPayload(anomaly);

      expect(payload.anomalyId).toBe('anomaly1');
      expect(payload.severity).toBe('high');
      expect(payload.metric).toBe('api_response_time');
    });
  });

  describe('Performance Scoring', () => {
    it('should calculate performance score', () => {
      const dashboardData = {
        apiPerformance: {
          avgResponseTime: 150,
          p50ResponseTime: 120,
          p95ResponseTime: 250,
          p99ResponseTime: 400,
          errorRate: 0.5,
          throughput: 100,
          cacheHitRate: 85
        },
        databasePerformance: {
          avgQueryTime: 50,
          slowQueries: 2,
          fullTableScans: 1,
          indexUsage: 10,
          connectionPoolUsage: 5
        },
        cachePerformance: {
          hitRate: 80,
          memoryUsage: 50,
          evictionRate: 0.1,
          currentKeys: 100
        },
        systemResources: {
          cpuUsage: 30,
          memoryUsage: 40,
          diskUsage: 25,
          networkThroughput: 2,
          diskIO: 1,
          openConnections: 50,
          activeRequests: 10,
          queueLength: 0,
          timestamp: new Date()
        },
        alerts: [],
        anomalies: [],
        trends: [],
        timestamp: new Date()
      };

      const score = PerformanceMonitoringUtils.calculatePerformanceScore(dashboardData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should generate health status', () => {
      const healthyStatus = PerformanceMonitoringUtils.generateHealthStatus(95);
      expect(healthyStatus.status).toBe('healthy');
      expect(healthyStatus.color).toBe('green');

      const degradedStatus = PerformanceMonitoringUtils.generateHealthStatus(75);
      expect(degradedStatus.status).toBe('degraded');
      expect(degradedStatus.color).toBe('yellow');

      const unhealthyStatus = PerformanceMonitoringUtils.generateHealthStatus(40);
      expect(unhealthyStatus.status).toBe('unhealthy');
      expect(unhealthyStatus.color).toBe('orange');

      const criticalStatus = PerformanceMonitoringUtils.generateHealthStatus(20);
      expect(criticalStatus.status).toBe('critical');
      expect(criticalStatus.color).toBe('red');
    });
  });
});