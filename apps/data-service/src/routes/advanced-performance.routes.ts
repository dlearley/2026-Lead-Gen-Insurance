/**
 * Enhanced Performance Optimization Routes
 * Phase 13.6: Comprehensive performance optimization API with advanced analytics
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheManager, logger } from '@insurance-lead-gen/core';
import { AdvancedDatabaseOptimizerService } from '../services/advanced-database-optimizer.service.js';
import { AdvancedMultiLayerCacheService } from '../services/advanced-multi-layer-cache.service.js';
import { IntelligentLoadBalancerService } from '../services/intelligent-load-balancer.service.js';
import { AdvancedCapacityPlanningService } from '../services/advanced-capacity-planning.service.js';
import { PerformanceOptimizationOrchestrator } from '../services/performance-optimization-orchestrator.js';
import Redis from 'ioredis';

export function createAdvancedPerformanceRoutes(
  prisma: PrismaClient,
  cache: CacheManager,
  redis: Redis
): Router {
  const router = Router();

  // Initialize services
  const dbOptimizer = new AdvancedDatabaseOptimizerService(prisma);
  const cacheService = new AdvancedMultiLayerCacheService(redis);
  const loadBalancer = new IntelligentLoadBalancerService({
    algorithm: 'ai_powered',
    healthCheckInterval: 30000,
    failureThreshold: 3,
    recoveryThreshold: 2,
    sessionAffinity: false,
    enableAutoScaling: true,
    scalingMetrics: [
      {
        name: 'cpu',
        type: 'cpu',
        target: 70,
        threshold: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldown: 5
      }
    ]
  });
  
  const capacityPlanning = new AdvancedCapacityPlanningService();
  
  const orchestrator = new PerformanceOptimizationOrchestrator({
    enableAdvancedAnalytics: true,
    enableDatabaseOptimization: true,
    enableMultiLayerCaching: true,
    enableIntelligentLoadBalancing: true,
    enableCapacityPlanning: true,
    enableAutomatedOptimization: true,
    optimizationInterval: 15, // 15 minutes
    alertThresholds: {
      responseTime: 500,
      errorRate: 0.05,
      cpuUsage: 80,
      memoryUsage: 85
    },
    automationRules: [
      {
        id: 'scale-up-on-high-cpu',
        name: 'Scale up on high CPU usage',
        trigger: {
          type: 'threshold',
          metric: 'cpu_usage',
          condition: 'greater_than',
          value: 85,
          duration: 5
        },
        actions: [
          {
            type: 'scale_up',
            target: 'load-balancer',
            parameters: { instances: 1 }
          }
        ],
        enabled: true,
        cooldown: 10
      }
    ]
  }, redis);

  // ============================================================================
  // Database Optimization Routes
  // ============================================================================

  router.post('/database/analyze-query', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const [complexity, plan] = await Promise.all([
        dbOptimizer.analyzeQueryComplexity(query),
        dbOptimizer.executeQuery(`EXPLAIN (ANALYZE, BUFFERS) ${query}`).catch(() => null)
      ]);

      res.json({
        complexity,
        executionPlan: plan,
        recommendations: [
          complexity.score > 7 ? 'Consider optimizing this complex query' : 'Query complexity is acceptable',
          complexity.factors.hasJoins ? 'Joins detected - ensure proper indexing' : null,
          complexity.factors.hasSubqueries ? 'Subqueries detected - consider rewriting' : null
        ].filter(Boolean)
      });
    } catch (error) {
      logger.error('Query analysis failed', { error });
      res.status(500).json({ error: 'Failed to analyze query' });
    }
  });

  router.get('/database/index-recommendations', async (req, res) => {
    try {
      const recommendations = await dbOptimizer.getIndexRecommendations();
      res.json(recommendations);
    } catch (error) {
      logger.error('Failed to get index recommendations', { error });
      res.status(500).json({ error: 'Failed to get index recommendations' });
    }
  });

  router.get('/database/optimization-plan', async (req, res) => {
    try {
      const plan = await dbOptimizer.generateOptimizationPlan();
      res.json(plan);
    } catch (error) {
      logger.error('Failed to generate optimization plan', { error });
      res.status(500).json({ error: 'Failed to generate optimization plan' });
    }
  });

  router.get('/database/slow-queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const queries = await dbOptimizer.getSlowQueries(500, limit); // 500ms threshold
      res.json(queries);
    } catch (error) {
      logger.error('Failed to get slow queries', { error });
      res.status(500).json({ error: 'Failed to get slow queries' });
    }
  });

  router.get('/database/connection-pool', async (req, res) => {
    try {
      const optimization = await dbOptimizer.optimizeConnectionPool();
      res.json(optimization);
    } catch (error) {
      logger.error('Failed to get connection pool metrics', { error });
      res.status(500).json({ error: 'Failed to get connection pool metrics' });
    }
  });

  router.get('/database/table-stats/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      const stats = await dbOptimizer.getTableStatistics(tableName);
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get table statistics', { error });
      res.status(500).json({ error: 'Failed to get table statistics' });
    }
  });

  router.post('/database/optimize/:action/:target', async (req, res) => {
    try {
      const { action, target } = req.params;
      const { type, sql, description } = req.body;

      const optimizationAction = {
        type: action as any,
        target,
        sql,
        description,
        priority: 1,
        estimatedImpact: 'Performance improvement',
        risks: ['Temporary performance impact']
      };

      const result = await dbOptimizer.executeOptimizationAction(optimizationAction);
      
      if (result.success) {
        res.json({ success: true, message: `${action} completed for ${target}` });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Database optimization failed', { error });
      res.status(500).json({ error: 'Failed to execute optimization' });
    }
  });

  // ============================================================================
  // Multi-Layer Cache Routes
  // ============================================================================

  router.get('/cache/strategies', async (req, res) => {
    try {
      const strategies = cacheService.getAllStrategies();
      res.json(Object.fromEntries(strategies));
    } catch (error) {
      logger.error('Failed to get cache strategies', { error });
      res.status(500).json({ error: 'Failed to get cache strategies' });
    }
  });

  router.post('/cache/warm', async (req, res) => {
    try {
      await cacheService.warmCache();
      res.json({ success: true, message: 'Cache warming completed' });
    } catch (error) {
      logger.error('Cache warming failed', { error });
      res.status(500).json({ error: 'Cache warming failed' });
    }
  });

  router.get('/cache/metrics', async (req, res) => {
    try {
      const metrics = await cacheService.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get cache metrics', { error });
      res.status(500).json({ error: 'Failed to get cache metrics' });
    }
  });

  router.get('/cache/hit-rate', async (req, res) => {
    try {
      const report = await cacheService.getHitRateReport();
      res.json(report);
    } catch (error) {
      logger.error('Failed to get cache hit rate', { error });
      res.status(500).json({ error: 'Failed to get cache hit rate' });
    }
  });

  router.get('/cache/optimization-recommendations', async (req, res) => {
    try {
      const recommendations = await cacheService.getOptimizationRecommendations();
      res.json(recommendations);
    } catch (error) {
      logger.error('Failed to get cache optimization recommendations', { error });
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  });

  router.post('/cache/invalidate', async (req, res) => {
    try {
      const { pattern, reason } = req.body;
      const count = await cacheService.invalidate(pattern, reason);
      res.json({ success: true, invalidated: count });
    } catch (error) {
      logger.error('Cache invalidation failed', { error });
      res.status(500).json({ error: 'Cache invalidation failed' });
    }
  });

  router.post('/cache/strategies/:name/register', async (req, res) => {
    try {
      const { name } = req.params;
      const strategy = req.body;
      cacheService.registerStrategy(name, strategy);
      res.json({ success: true, message: `Strategy ${name} registered` });
    } catch (error) {
      logger.error('Failed to register cache strategy', { error });
      res.status(500).json({ error: 'Failed to register strategy' });
    }
  });

  // ============================================================================
  // Load Balancer Routes
  // ============================================================================

  router.get('/load-balancer/metrics', async (req, res) => {
    try {
      const metrics = loadBalancer.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get load balancer metrics', { error });
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  router.get('/load-balancer/instances', async (req, res) => {
    try {
      const instances = loadBalancer.getInstanceStatus();
      res.json(instances);
    } catch (error) {
      logger.error('Failed to get instance status', { error });
      res.status(500).json({ error: 'Failed to get instance status' });
    }
  });

  router.get('/load-balancer/traffic-history', async (req, res) => {
    try {
      const history = loadBalancer.getTrafficHistory();
      res.json(history);
    } catch (error) {
      logger.error('Failed to get traffic history', { error });
      res.status(500).json({ error: 'Failed to get traffic history' });
    }
  });

  router.post('/load-balancer/instances/register', async (req, res) => {
    try {
      const { id, host, port, weight, maxConnections } = req.body;
      await loadBalancer.registerInstance({
        id,
        host,
        port,
        weight: weight || 1,
        status: 'healthy',
        maxConnections: maxConnections || 1000
      });
      res.json({ success: true, message: `Instance ${id} registered` });
    } catch (error) {
      logger.error('Failed to register instance', { error });
      res.status(500).json({ error: 'Failed to register instance' });
    }
  });

  router.post('/load-balancer/instances/:id/unregister', async (req, res) => {
    try {
      const { id } = req.params;
      await loadBalancer.unregisterInstance(id);
      res.json({ success: true, message: `Instance ${id} unregistered` });
    } catch (error) {
      logger.error('Failed to unregister instance', { error });
      res.status(500).json({ error: 'Failed to unregister instance' });
    }
  });

  router.post('/load-balancer/simulate-request', async (req, res) => {
    try {
      const { path, method, userId, priority } = req.body;
      const decision = await loadBalancer.routeRequest({ path, method, userId, priority });
      res.json(decision);
    } catch (error) {
      logger.error('Request routing failed', { error });
      res.status(500).json({ error: 'Request routing failed' });
    }
  });

  // ============================================================================
  // Capacity Planning Routes
  // ============================================================================

  router.get('/capacity/dashboard', async (req, res) => {
    try {
      const dashboard = await capacityPlanning.getCapacityDashboard();
      res.json(dashboard);
    } catch (error) {
      logger.error('Failed to get capacity dashboard', { error });
      res.status(500).json({ error: 'Failed to get capacity dashboard' });
    }
  });

  router.get('/capacity/forecast/:resourceType', async (req, res) => {
    try {
      const { resourceType } = req.params;
      const horizon = parseInt(req.query.horizon as string) || 90;
      const scenario = (req.query.scenario as string) || 'baseline';

      const forecast = await capacityPlanning.generateCapacityForecast(resourceType, {
        horizon,
        includeRecommendations: true,
        scenario: scenario as any
      });
      res.json(forecast);
    } catch (error) {
      logger.error('Failed to get capacity forecast', { error });
      res.status(500).json({ error: 'Failed to get capacity forecast' });
    }
  });

  router.get('/capacity/trend/:resourceType', async (req, res) => {
    try {
      const { resourceType } = req.params;
      const period = (req.query.period as string) || 'day';

      const trend = await capacityPlanning.analyzeCapacityTrend(resourceType, period as any);
      res.json(trend);
    } catch (error) {
      logger.error('Failed to get capacity trend', { error });
      res.status(500).json({ error: 'Failed to get capacity trend' });
    }
  });

  router.get('/capacity/bottlenecks', async (req, res) => {
    try {
      const bottlenecks = await capacityPlanning.identifyBottlenecks();
      res.json(bottlenecks);
    } catch (error) {
      logger.error('Failed to identify bottlenecks', { error });
      res.status(500).json({ error: 'Failed to identify bottlenecks' });
    }
  });

  router.get('/capacity/alerts', async (req, res) => {
    try {
      const includeResolved = req.query.includeResolved === 'true';
      const alerts = await capacityPlanning.getAlerts(includeResolved);
      res.json(alerts);
    } catch (error) {
      logger.error('Failed to get capacity alerts', { error });
      res.status(500).json({ error: 'Failed to get capacity alerts' });
    }
  });

  router.post('/capacity/alerts/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      await capacityPlanning.resolveAlert(id);
      res.json({ success: true, message: 'Alert resolved' });
    } catch (error) {
      logger.error('Failed to resolve alert', { error });
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  router.get('/capacity/optimization-opportunities', async (req, res) => {
    try {
      const opportunities = await capacityPlanning.getOptimizationOpportunities();
      res.json(opportunities);
    } catch (error) {
      logger.error('Failed to get optimization opportunities', { error });
      res.status(500).json({ error: 'Failed to get optimization opportunities' });
    }
  });

  // ============================================================================
  // Orchestration Routes
  // ============================================================================

  router.get('/orchestrator/health', async (req, res) => {
    try {
      const health = await orchestrator.getSystemHealth();
      res.json(health);
    } catch (error) {
      logger.error('Failed to get orchestrator health', { error });
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });

  router.post('/orchestrator/optimization-cycle', async (req, res) => {
    try {
      const report = await orchestrator.triggerOptimizationCycle();
      res.json(report);
    } catch (error) {
      logger.error('Failed to trigger optimization cycle', { error });
      res.status(500).json({ error: 'Failed to trigger optimization cycle' });
    }
  });

  router.get('/orchestrator/report/latest', async (req, res) => {
    try {
      const report = orchestrator.getLastOptimizationReport();
      if (report) {
        res.json(report);
      } else {
        res.status(404).json({ error: 'No optimization report available' });
      }
    } catch (error) {
      logger.error('Failed to get latest report', { error });
      res.status(500).json({ error: 'Failed to get latest report' });
    }
  });

  router.get('/orchestrator/report/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = orchestrator.getOptimizationHistory(limit);
      res.json(history);
    } catch (error) {
      logger.error('Failed to get optimization history', { error });
      res.status(500).json({ error: 'Failed to get optimization history' });
    }
  });

  // ============================================================================
  // Real-time Performance Monitoring
  // ============================================================================

  router.get('/monitoring/live-metrics', async (req, res) => {
    try {
      const [dbMetrics, cacheMetrics, lbMetrics] = await Promise.all([
        dbOptimizer.getQueryMetricsSummary(),
        cacheService.getMetrics(),
        loadBalancer.getMetrics()
      ]);

      res.json({
        timestamp: new Date(),
        database: dbMetrics,
        cache: cacheMetrics,
        loadBalancer: lbMetrics,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      });
    } catch (error) {
      logger.error('Failed to get live metrics', { error });
      res.status(500).json({ error: 'Failed to get live metrics' });
    }
  });

  router.get('/monitoring/performance-score', async (req, res) => {
    try {
      const health = await orchestrator.getSystemHealth();
      res.json({
        overallScore: health.overall === 'excellent' ? 100 : 
                     health.overall === 'good' ? 80 :
                     health.overall === 'warning' ? 60 : 40,
        status: health.overall,
        breakdown: health.components
      });
    } catch (error) {
      logger.error('Failed to get performance score', { error });
      res.status(500).json({ error: 'Failed to get performance score' });
    }
  });

  // ============================================================================
  // Configuration and Management
  // ============================================================================

  router.get('/config', async (req, res) => {
    try {
      const config = orchestrator.getConfig();
      res.json(config);
    } catch (error) {
      logger.error('Failed to get configuration', { error });
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  });

  router.put('/config', async (req, res) => {
    try {
      const newConfig = req.body;
      orchestrator.updateConfig(newConfig);
      res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
      logger.error('Failed to update configuration', { error });
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  router.post('/initialize', async (req, res) => {
    try {
      await orchestrator.initialize();
      await orchestrator.start();
      res.json({ success: true, message: 'Performance optimization services initialized and started' });
    } catch (error) {
      logger.error('Failed to initialize performance optimization', { error });
      res.status(500).json({ error: 'Failed to initialize services' });
    }
  });

  router.post('/stop', async (req, res) => {
    try {
      orchestrator.stop();
      res.json({ success: true, message: 'Performance optimization services stopped' });
    } catch (error) {
      logger.error('Failed to stop performance optimization', { error });
      res.status(500).json({ error: 'Failed to stop services' });
    }
  });

  return router;
}