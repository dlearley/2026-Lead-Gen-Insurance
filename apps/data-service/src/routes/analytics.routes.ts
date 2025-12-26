import { Router, type Request, type Response } from 'express';
import { analyticsService } from '../analytics.js';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

router.get('/dashboard', (_req: Request, res: Response): void => {
  try {
    const summary = analyticsService.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get dashboard summary', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leads/funnel', (_req: Request, res: Response): void => {
  try {
    const metrics = analyticsService.getLeadFunnelMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get lead funnel metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leads/volume', (_req: Request, res: Response): void => {
  try {
    const metrics = analyticsService.getLeadVolumeMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get lead volume metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/agents/leaderboard', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = analyticsService.getAgentLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    logger.error('Failed to get agent leaderboard', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/agents/:agentId/performance', (req: Request, res: Response): void => {
  try {
    const { agentId } = req.params;
    const metrics = analyticsService.getAgentPerformanceMetrics(agentId);
    
    if (!metrics) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get agent performance metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ai/metrics', (_req: Request, res: Response): void => {
  try {
    const metrics = analyticsService.getAIModelMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get AI model metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ai/processing', (_req: Request, res: Response): void => {
  try {
    const stats = analyticsService.getAIProcessingStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get AI processing stats', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system/health', (_req: Request, res: Response): void => {
  try {
    const health = analyticsService.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Failed to get system health', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track/:eventType', (req: Request, res: Response): void => {
  try {
    const { eventType } = req.params;
    const event = req.body;
    
    analyticsService.trackEvent({
      type: eventType as Parameters<typeof analyticsService.trackEvent>[0]['type'],
      timestamp: event.timestamp || new Date().toISOString(),
      data: event.data || {},
      metadata: event.metadata,
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to track event', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset', (_req: Request, res: Response): void => {
  try {
    analyticsService.resetMetrics();
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to reset metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
