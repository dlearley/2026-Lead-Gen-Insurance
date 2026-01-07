import { Router, Request, Response } from 'express';
import { BrokerBenchmarkService } from '../services/benchmark.service.js';
import { logger } from '@insurance-lead-gen/core';

export function createBenchmarkRoutes(benchmarkService: BrokerBenchmarkService): Router {
  const router = Router();

  /**
   * GET /api/v1/benchmark/:brokerId
   * Get broker benchmark metrics for a specific period
   */
  router.get('/:brokerId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      
      const benchmark = await benchmarkService.generateBrokerBenchmark(brokerId, period);
      res.json(benchmark);
    } catch (error) {
      logger.error('Failed to get broker benchmark', { error });
      res.status(500).json({ error: 'Failed to get broker benchmark' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/comparisons
   * Get benchmark comparisons for a broker
   */
  router.get('/:brokerId/comparisons', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      
      const comparisons = await benchmarkService.getBenchmarkComparisons(brokerId, period);
      res.json(comparisons);
    } catch (error) {
      logger.error('Failed to get benchmark comparisons', { error });
      res.status(500).json({ error: 'Failed to get benchmark comparisons' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/trends/:category
   * Get benchmark trends for a specific category
   */
  router.get('/:brokerId/trends/:category', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId, category } = req.params;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      const months = parseInt(req.query.months as string) || 6;
      
      const trends = await benchmarkService.getBenchmarkTrends(
        brokerId,
        category as any,
        period,
        months
      );
      res.json(trends);
    } catch (error) {
      logger.error('Failed to get benchmark trends', { error });
      res.status(500).json({ error: 'Failed to get benchmark trends' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/insights
   * Get automated insights for a broker
   */
  router.get('/:brokerId/insights', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      
      const insights = await benchmarkService.generateInsights(brokerId, period);
      res.json(insights);
    } catch (error) {
      logger.error('Failed to get benchmark insights', { error });
      res.status(500).json({ error: 'Failed to get benchmark insights' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/ranking
   * Get broker ranking among peers
   */
  router.get('/:brokerId/ranking', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      
      const ranking = await benchmarkService.getBrokerRanking(brokerId);
      res.json(ranking);
    } catch (error) {
      logger.error('Failed to get broker ranking', { error });
      res.status(500).json({ error: 'Failed to get broker ranking' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/report
   * Generate a comprehensive benchmark report
   */
  router.get('/:brokerId/report', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
      
      const report = await benchmarkService.generateBenchmarkReport(brokerId, period);
      res.json(report);
    } catch (error) {
      logger.error('Failed to generate benchmark report', { error });
      res.status(500).json({ error: 'Failed to generate benchmark report' });
    }
  });

  /**
   * GET /api/v1/benchmark/peer-groups
   * Get available peer groups for comparison
   */
  router.get('/peer/groups', async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        region: req.query.region as string,
        specialization: req.query.specialization ? (req.query.specialization as string).split(',') : undefined,
        minLeads: req.query.minLeads ? parseInt(req.query.minLeads as string) : undefined,
      };
      
      const peerGroups = await benchmarkService.getPeerGroups(filters);
      res.json(peerGroups);
    } catch (error) {
      logger.error('Failed to get peer groups', { error });
      res.status(500).json({ error: 'Failed to get peer groups' });
    }
  });

  /**
   * GET /api/v1/benchmark/industry
   * Get industry-wide benchmark data
   */
  router.get('/industry/benchmarks', async (req: Request, res: Response): Promise<void> => {
    try {
      const industryBenchmarks = await benchmarkService.getIndustryBenchmarks();
      res.json(industryBenchmarks);
    } catch (error) {
      logger.error('Failed to get industry benchmarks', { error });
      res.status(500).json({ error: 'Failed to get industry benchmarks' });
    }
  });

  /**
   * GET /api/v1/benchmark/:brokerId/goals
   * Get all performance goals for a broker
   */
  router.get('/:brokerId/goals', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      
      const goals = await benchmarkService.getGoals(brokerId);
      res.json(goals);
    } catch (error) {
      logger.error('Failed to get performance goals', { error });
      res.status(500).json({ error: 'Failed to get performance goals' });
    }
  });

  /**
   * POST /api/v1/benchmark/:brokerId/goals
   * Create a new performance goal
   */
  router.post('/:brokerId/goals', async (req: Request, res: Response): Promise<void> => {
    try {
      const { brokerId } = req.params;
      const { category, targetValue, deadline } = req.body;
      
      const goal = await benchmarkService.createGoal({
        brokerId,
        category,
        targetValue,
        deadline: new Date(deadline),
      });
      
      res.status(201).json(goal);
    } catch (error) {
      logger.error('Failed to create performance goal', { error });
      res.status(500).json({ error: 'Failed to create performance goal' });
    }
  });

  /**
   * GET /api/v1/benchmark/goals/:goalId
   * Get a specific performance goal
   */
  router.get('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;
      
      const goal = await benchmarkService.getGoalById(goalId);
      
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      
      res.json(goal);
    } catch (error) {
      logger.error('Failed to get performance goal', { error });
      res.status(500).json({ error: 'Failed to get performance goal' });
    }
  });

  /**
   * PATCH /api/v1/benchmark/goals/:goalId
   * Update a performance goal
   */
  router.patch('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;
      const { targetValue, currentValue, deadline } = req.body;
      
      const goal = await benchmarkService.updateGoal(goalId, {
        ...(targetValue !== undefined && { targetValue }),
        ...(currentValue !== undefined && { currentValue }),
        ...(deadline && { deadline: new Date(deadline) }),
      });
      
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      
      res.json(goal);
    } catch (error) {
      logger.error('Failed to update performance goal', { error });
      res.status(500).json({ error: 'Failed to update performance goal' });
    }
  });

  /**
   * DELETE /api/v1/benchmark/goals/:goalId
   * Delete a performance goal
   */
  router.delete('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;
      
      const deleted = await benchmarkService.deleteGoal(goalId);
      
      if (!deleted) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete performance goal', { error });
      res.status(500).json({ error: 'Failed to delete performance goal' });
    }
  });

  return router;
}
