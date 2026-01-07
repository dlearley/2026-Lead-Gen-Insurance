/**
 * Performance Optimization Routes
 * API endpoints for database optimization, caching, and capacity planning
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheManager, logger } from '@insurance-lead-gen/core';
import { DatabaseOptimizerService } from '../services/database-optimizer.service.js';
import { CacheWarmingService } from '../services/cache-warming.service.js';
import { JobSchedulerService } from '../services/job-scheduler.service.js';
import { CapacityPlanningService } from '../services/capacity-planning.service.js';

export function createPerformanceRoutes(
  prisma: PrismaClient,
  cache: CacheManager
): Router {
  const router = Router();

  const dbOptimizer = new DatabaseOptimizerService(prisma);
  const cacheWarming = new CacheWarmingService(prisma, cache);
  const jobScheduler = new JobSchedulerService();
  const capacityPlanning = new CapacityPlanningService(prisma);

  router.post('/database/analyze-query', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await dbOptimizer.analyzeQuery(query);
      res.json(result);
    } catch (error) {
      logger.error('Query analysis failed', { error });
      res.status(500).json({ error: 'Failed to analyze query' });
    }
  });

  router.get('/database/indexing-strategy', async (req, res) => {
    try {
      const strategy = await dbOptimizer.getIndexingStrategy();
      res.json(strategy);
    } catch (error) {
      logger.error('Failed to get indexing strategy', { error });
      res.status(500).json({ error: 'Failed to get indexing strategy' });
    }
  });

  router.get('/database/connection-pool', async (req, res) => {
    try {
      const metrics = await dbOptimizer.getConnectionPoolMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get connection pool metrics', { error });
      res.status(500).json({ error: 'Failed to get connection pool metrics' });
    }
  });

  router.get('/database/slow-queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const queries = await dbOptimizer.getSlowQueries(limit);
      res.json(queries);
    } catch (error) {
      logger.error('Failed to get slow queries', { error });
      res.status(500).json({ error: 'Failed to get slow queries' });
    }
  });

  router.post('/database/optimize-table/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      await dbOptimizer.optimizeTable(tableName);
      res.json({ success: true, message: `Table ${tableName} optimized` });
    } catch (error) {
      logger.error('Failed to optimize table', { error });
      res.status(500).json({ error: 'Failed to optimize table' });
    }
  });

  router.get('/database/table-stats/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      const stats = await dbOptimizer.getTableStats(tableName);
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get table stats', { error });
      res.status(500).json({ error: 'Failed to get table stats' });
    }
  });

  router.get('/database/size', async (req, res) => {
    try {
      const size = await dbOptimizer.getDatabaseSize();
      res.json(size);
    } catch (error) {
      logger.error('Failed to get database size', { error });
      res.status(500).json({ error: 'Failed to get database size' });
    }
  });

  router.post('/database/archive', async (req, res) => {
    try {
      const policy = req.body;
      const result = await dbOptimizer.archiveOldData(policy);
      res.json(result);
    } catch (error) {
      logger.error('Data archival failed', { error });
      res.status(500).json({ error: 'Data archival failed' });
    }
  });

  router.post('/cache/warm', async (req, res) => {
    try {
      await cacheWarming.warmCriticalData();
      res.json({ success: true, message: 'Cache warming completed' });
    } catch (error) {
      logger.error('Cache warming failed', { error });
      res.status(500).json({ error: 'Cache warming failed' });
    }
  });

  router.post('/cache/invalidate', async (req, res) => {
    try {
      const { pattern } = req.body;
      await cacheWarming.invalidatePattern(pattern);
      res.json({ success: true, message: `Pattern ${pattern} invalidated` });
    } catch (error) {
      logger.error('Cache invalidation failed', { error });
      res.status(500).json({ error: 'Cache invalidation failed' });
    }
  });

  router.get('/cache/metrics', async (req, res) => {
    try {
      const metrics = await cacheWarming.getCacheMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get cache metrics', { error });
      res.status(500).json({ error: 'Failed to get cache metrics' });
    }
  });

  router.get('/cache/hit-rate', async (req, res) => {
    try {
      const report = await cacheWarming.getCacheHitRateReport();
      res.json(report);
    } catch (error) {
      logger.error('Failed to get cache hit rate', { error });
      res.status(500).json({ error: 'Failed to get cache hit rate' });
    }
  });

  router.get('/jobs/metrics', async (req, res) => {
    try {
      const { queue } = req.query;
      
      if (queue) {
        const metrics = await jobScheduler.getJobMetrics(queue as string);
        res.json(metrics);
      } else {
        const allMetrics = await jobScheduler.getAllMetrics();
        res.json(allMetrics);
      }
    } catch (error) {
      logger.error('Failed to get job metrics', { error });
      res.status(500).json({ error: 'Failed to get job metrics' });
    }
  });

  router.post('/jobs/schedule', async (req, res) => {
    try {
      const schedule = req.body;
      await jobScheduler.scheduleJob(schedule);
      res.json({ success: true, message: 'Job scheduled' });
    } catch (error) {
      logger.error('Failed to schedule job', { error });
      res.status(500).json({ error: 'Failed to schedule job' });
    }
  });

  router.post('/jobs/:queue/pause', async (req, res) => {
    try {
      const { queue } = req.params;
      await jobScheduler.pauseQueue(queue);
      res.json({ success: true, message: `Queue ${queue} paused` });
    } catch (error) {
      logger.error('Failed to pause queue', { error });
      res.status(500).json({ error: 'Failed to pause queue' });
    }
  });

  router.post('/jobs/:queue/resume', async (req, res) => {
    try {
      const { queue } = req.params;
      await jobScheduler.resumeQueue(queue);
      res.json({ success: true, message: `Queue ${queue} resumed` });
    } catch (error) {
      logger.error('Failed to resume queue', { error });
      res.status(500).json({ error: 'Failed to resume queue' });
    }
  });

  router.post('/jobs/:queue/retry-failed', async (req, res) => {
    try {
      const { queue } = req.params;
      await jobScheduler.retryFailedJobs(queue);
      res.json({ success: true, message: 'Failed jobs retried' });
    } catch (error) {
      logger.error('Failed to retry jobs', { error });
      res.status(500).json({ error: 'Failed to retry jobs' });
    }
  });

  router.get('/jobs/:queue/dead-letter', async (req, res) => {
    try {
      const { queue } = req.params;
      const jobs = await jobScheduler.getDeadLetterJobs(queue);
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get dead letter jobs', { error });
      res.status(500).json({ error: 'Failed to get dead letter jobs' });
    }
  });

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
      const months = parseInt(req.query.months as string) || 6;

      const forecast = await capacityPlanning.forecastCapacity(
        resourceType as any,
        months
      );
      res.json(forecast);
    } catch (error) {
      logger.error('Failed to get capacity forecast', { error });
      res.status(500).json({ error: 'Failed to get capacity forecast' });
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

  return router;
}
