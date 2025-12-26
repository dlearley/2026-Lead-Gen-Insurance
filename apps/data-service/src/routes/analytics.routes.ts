import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../analytics.js';
import { logger } from '@insurance-lead-gen/core';

export function createAnalyticsRoutes(analyticsService: AnalyticsService): Router {
  const router = Router();

  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const period = (req.query.period as 'day' | 'week' | 'month') || 'week';
      const summary = await analyticsService.getDashboardSummary(period);
      res.json(summary);
    } catch (error) {
      logger.error('Failed to get dashboard summary', { error });
      res.status(500).json({ error: 'Failed to get dashboard summary' });
    }
  });

  router.get('/leads/funnel', async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, insuranceType } = req.query;
      const metrics = await analyticsService.getLeadFunnelMetrics({
        startDate: startDate as string,
        endDate: endDate as string,
        insuranceType: insuranceType as string,
      });
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get lead funnel metrics', { error });
      res.status(500).json({ error: 'Failed to get lead funnel metrics' });
    }
  });

  router.get('/leads/volume', async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await analyticsService.getLeadFunnelMetrics();
      const bySource = Object.entries(metrics.bySource).map(([source, count]) => ({
        source,
        count,
      }));
      const byType = Object.entries(metrics.byInsuranceType).map(([type, count]) => ({
        type,
        count,
      }));
      res.json({ bySource, byType, trend: metrics.trend });
    } catch (error) {
      logger.error('Failed to get lead volume metrics', { error });
      res.status(500).json({ error: 'Failed to get lead volume metrics' });
    }
  });

  router.get('/agents/leaderboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await analyticsService.getAgentLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      logger.error('Failed to get agent leaderboard', { error });
      res.status(500).json({ error: 'Failed to get agent leaderboard' });
    }
  });

  router.get('/agents/:agentId/performance', async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const performance = await analyticsService.getAgentPerformance(agentId);
      res.json(performance);
    } catch (error) {
      logger.error('Failed to get agent performance', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent performance' });
    }
  });

  router.get('/ai/metrics', async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await analyticsService.getAIModelMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get AI model metrics', { error });
      res.status(500).json({ error: 'Failed to get AI model metrics' });
    }
  });

  router.get('/ai/processing', async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await analyticsService.getAIProcessingStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get AI processing stats', { error });
      res.status(500).json({ error: 'Failed to get AI processing stats' });
    }
  });

  router.get('/system/health', async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await analyticsService.getSystemHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Failed to get system health', { error });
      res.status(500).json({ status: 'unhealthy', error: 'Failed to get system health' });
    }
  });

  router.post('/track/event', async (req: Request, res: Response): Promise<void> => {
    try {
      await analyticsService.trackEvent(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      logger.error('Failed to track event', { error });
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  router.post('/track/lead', async (req: Request, res: Response): Promise<void> => {
    try {
      await analyticsService.trackLeadStatusChange(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      logger.error('Failed to track lead event', { error });
      res.status(500).json({ error: 'Failed to track lead event' });
    }
  });

  router.post('/track/agent', async (req: Request, res: Response): Promise<void> => {
    try {
      await analyticsService.trackAgentEvent(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      logger.error('Failed to track agent event', { error });
      res.status(500).json({ error: 'Failed to track agent event' });
    }
  });

  router.post('/track/ai', async (req: Request, res: Response): Promise<void> => {
    try {
      await analyticsService.trackAIPerformance(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      logger.error('Failed to track AI performance', { error });
      res.status(500).json({ error: 'Failed to track AI performance' });
    }
  });

  return router;
}
