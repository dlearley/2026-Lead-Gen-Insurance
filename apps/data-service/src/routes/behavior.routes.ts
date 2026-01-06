import { Router, Request, Response } from 'express';
import { BehaviorAnalyticsService } from '../services/behavior-analytics.js';
import { 
  TrackBehaviorEventRequest,
  GetBehaviorAnalyticsRequest,
  CreateSegmentRequest,
  CreatePersonalizationRuleRequest,
  CreateExperimentRequest,
  CreateTriggerRequest,
  SegmentType,
  PersonalizationStatus,
  ExperimentStatus,
  TriggerStatus
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

export function createBehaviorAnalyticsRoutes(service: BehaviorAnalyticsService): Router {
  const router = Router();

  // ========================================
  // BEHAVIOR TRACKING ENDPOINTS
  // ========================================

  /**
   * Track a behavior event
   * POST /api/behavior/events
   */
  router.post('/events', async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, leadId, userId } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      const event = await service.trackEvent(sessionId, req.body as TrackBehaviorEventRequest, leadId, userId);
      res.status(201).json(event);
    } catch (error) {
      logger.error('Failed to track behavior event', { error });
      res.status(500).json({ error: 'Failed to track behavior event' });
    }
  });

  /**
   * Get behavior analytics
   * GET /api/behavior/analytics
   */
  router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
    try {
      const { leadId, sessionId, includeEvents } = req.query;
      const timeRange = req.query.timeRange ? JSON.parse(req.query.timeRange as string) : undefined;

      const analytics = await service.getBehaviorAnalytics({
        leadId: leadId as string,
        sessionId: sessionId as string,
        timeRange,
        includeEvents: includeEvents === 'true',
      });

      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get behavior analytics', { error });
      res.status(500).json({ error: 'Failed to get behavior analytics' });
    }
  });

  /**
   * Get personalized content for a lead
   * GET /api/behavior/personalization/:leadId
   */
  router.get('/personalization/:leadId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { leadId } = req.params;
      const { sessionId } = req.query;

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      const personalization = await service.getPersonalizedContent(leadId, sessionId as string);
      res.json(personalization);
    } catch (error) {
      logger.error('Failed to get personalized content', { error });
      res.status(500).json({ error: 'Failed to get personalized content' });
    }
  });

  // ========================================
  // BEHAVIORAL SEGMENTATION ENDPOINTS
  // ========================================

  /**
   * Create a behavioral segment
   * POST /api/behavior/segments
   */
  router.post('/segments', async (req: Request, res: Response): Promise<void> => {
    try {
      const segment = await service.createSegment(req.body as CreateSegmentRequest);
      res.status(201).json(segment);
    } catch (error) {
      logger.error('Failed to create behavioral segment', { error });
      res.status(500).json({ error: 'Failed to create behavioral segment' });
    }
  });

  /**
   * Get all segments
   * GET /api/behavior/segments
   */
  router.get('/segments', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as SegmentType;

      const result = await service.getSegments(page, limit, type);
      res.json(result);
    } catch (error) {
      logger.error('Failed to get segments', { error });
      res.status(500).json({ error: 'Failed to get segments' });
    }
  });

  /**
   * Get a specific segment
   * GET /api/behavior/segments/:segmentId
   */
  router.get('/segments/:segmentId', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would fetch the segment from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get segment', { error });
      res.status(500).json({ error: 'Failed to get segment' });
    }
  });

  /**
   * Update a segment
   * PUT /api/behavior/segments/:segmentId
   */
  router.put('/segments/:segmentId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { segmentId } = req.params;
      const segment = await service.updateSegment(segmentId, req.body);
      res.json(segment);
    } catch (error) {
      logger.error('Failed to update segment', { error });
      res.status(500).json({ error: 'Failed to update segment' });
    }
  });

  /**
   * Delete a segment
   * DELETE /api/behavior/segments/:segmentId
   */
  router.delete('/segments/:segmentId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { segmentId } = req.params;
      await service.deleteSegment(segmentId);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete segment', { error });
      res.status(500).json({ error: 'Failed to delete segment' });
    }
  });

  // ========================================
  // PERSONALIZATION ENDPOINTS
  // ========================================

  /**
   * Create a personalization rule
   * POST /api/behavior/personalization-rules
   */
  router.post('/personalization-rules', async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await service.createPersonalizationRule(req.body as CreatePersonalizationRuleRequest);
      res.status(201).json(rule);
    } catch (error) {
      logger.error('Failed to create personalization rule', { error });
      res.status(500).json({ error: 'Failed to create personalization rule' });
    }
  });

  /**
   * Get personalization rules
   * GET /api/behavior/personalization-rules
   */
  router.get('/personalization-rules', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as PersonalizationStatus;

      // In a real implementation, you would fetch from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get personalization rules', { error });
      res.status(500).json({ error: 'Failed to get personalization rules' });
    }
  });

  /**
   * Update personalization rule
   * PUT /api/behavior/personalization-rules/:ruleId
   */
  router.put('/personalization-rules/:ruleId', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would update the rule via the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to update personalization rule', { error });
      res.status(500).json({ error: 'Failed to update personalization rule' });
    }
  });

  /**
   * Delete personalization rule
   * DELETE /api/behavior/personalization-rules/:ruleId
   */
  router.delete('/personalization-rules/:ruleId', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would delete the rule via the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to delete personalization rule', { error });
      res.status(500).json({ error: 'Failed to delete personalization rule' });
    }
  });

  // ========================================
  // A/B TESTING ENDPOINTS
  // ========================================

  /**
   * Create a behavior experiment
   * POST /api/behavior/experiments
   */
  router.post('/experiments', async (req: Request, res: Response): Promise<void> => {
    try {
      const experiment = await service.createExperiment(req.body as CreateExperimentRequest);
      res.status(201).json(experiment);
    } catch (error) {
      logger.error('Failed to create behavior experiment', { error });
      res.status(500).json({ error: 'Failed to create behavior experiment' });
    }
  });

  /**
   * Get experiments
   * GET /api/behavior/experiments
   */
  router.get('/experiments', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ExperimentStatus;

      // In a real implementation, you would fetch from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get experiments', { error });
      res.status(500).json({ error: 'Failed to get experiments' });
    }
  });

  /**
   * Get experiment variants for a user
   * GET /api/behavior/experiments/:experimentId/variants/:userId
   */
  router.get('/experiments/:experimentId/variants/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentId, userId } = req.params;
      const variant = await service.getExperimentVariants(experimentId, userId);
      res.json({ variant });
    } catch (error) {
      logger.error('Failed to get experiment variant', { error });
      res.status(500).json({ error: 'Failed to get experiment variant' });
    }
  });

  /**
   * Update experiment status
   * PUT /api/behavior/experiments/:experimentId/status
   */
  router.put('/experiments/:experimentId/status', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would update the experiment status via the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to update experiment status', { error });
      res.status(500).json({ error: 'Failed to update experiment status' });
    }
  });

  /**
   * Get experiment results
   * GET /api/behavior/experiments/:experimentId/results
   */
  router.get('/experiments/:experimentId/results', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would fetch results from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get experiment results', { error });
      res.status(500).json({ error: 'Failed to get experiment results' });
    }
  });

  // ========================================
  // BEHAVIORAL TRIGGERS ENDPOINTS
  // ========================================

  /**
   * Create a behavioral trigger
   * POST /api/behavior/triggers
   */
  router.post('/triggers', async (req: Request, res: Response): Promise<void> => {
    try {
      const trigger = await service.createTrigger(req.body as CreateTriggerRequest);
      res.status(201).json(trigger);
    } catch (error) {
      logger.error('Failed to create behavioral trigger', { error });
      res.status(500).json({ error: 'Failed to create behavioral trigger' });
    }
  });

  /**
   * Get triggers
   * GET /api/behavior/triggers
   */
  router.get('/triggers', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as TriggerStatus;

      // In a real implementation, you would fetch from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get triggers', { error });
      res.status(500).json({ error: 'Failed to get triggers' });
    }
  });

  /**
   * Update trigger
   * PUT /api/behavior/triggers/:triggerId
   */
  router.put('/triggers/:triggerId', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would update the trigger via the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to update trigger', { error });
      res.status(500).json({ error: 'Failed to update trigger' });
    }
  });

  /**
   * Delete trigger
   * DELETE /api/behavior/triggers/:triggerId
   */
  router.delete('/triggers/:triggerId', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would delete the trigger via the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to delete trigger', { error });
      res.status(500).json({ error: 'Failed to delete trigger' });
    }
  });

  /**
   * Get trigger executions
   * GET /api/behavior/triggers/:triggerId/executions
   */
  router.get('/triggers/:triggerId/executions', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would fetch executions from the service
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get trigger executions', { error });
      res.status(500).json({ error: 'Failed to get trigger executions' });
    }
  });

  // ========================================
  // ANALYTICS & REPORTING ENDPOINTS
  // ========================================

  /**
   * Get behavior analytics dashboard data
   * GET /api/behavior/dashboard
   */
  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '7d' } = req.query;

      // In a real implementation, you would aggregate analytics data
      const dashboardData = {
        behavior: {
          totalEvents: 1250,
          uniqueUsers: 342,
          averageEngagement: 78.5,
          topEvents: [
            { eventType: 'page_view', count: 450, percentage: 36 },
            { eventType: 'form_start', count: 280, percentage: 22.4 },
            { eventType: 'quote_request', count: 125, percentage: 10 },
            { eventType: 'email_click', count: 95, percentage: 7.6 },
          ],
          segments: {
            total: 8,
            active: 6,
            totalMembers: 1240,
          },
        },
        personalization: {
          activeRules: 12,
          runningExperiments: 3,
          triggeredActions: 234,
          successRate: 85.2,
        },
        triggers: {
          activeTriggers: 15,
          executionsToday: 45,
          successRate: 92.1,
        },
        trends: {
          engagementTrend: [
            { date: '2024-01-01', score: 75 },
            { date: '2024-01-02', score: 78 },
            { date: '2024-01-03', score: 82 },
            { date: '2024-01-04', score: 79 },
            { date: '2024-01-05', score: 85 },
            { date: '2024-01-06', score: 88 },
            { date: '2024-01-07', score: 91 },
          ],
          conversionTrend: [
            { date: '2024-01-01', rate: 12.5 },
            { date: '2024-01-02', rate: 13.2 },
            { date: '2024-01-03', rate: 14.8 },
            { date: '2024-01-04', rate: 13.9 },
            { date: '2024-01-05', rate: 15.3 },
            { date: '2024-01-06', rate: 16.1 },
            { date: '2024-01-07', rate: 17.2 },
          ],
          segmentGrowth: [
            { date: '2024-01-01', members: 1180 },
            { date: '2024-01-02', members: 1195 },
            { date: '2024-01-03', members: 1208 },
            { date: '2024-01-04', members: 1215 },
            { date: '2024-01-05', members: 1228 },
            { date: '2024-01-06', members: 1235 },
            { date: '2024-01-07', members: 1240 },
          ],
        },
      };

      res.json(dashboardData);
    } catch (error) {
      logger.error('Failed to get behavior dashboard data', { error });
      res.status(500).json({ error: 'Failed to get behavior dashboard data' });
    }
  });

  /**
   * Get cohort analysis
   * GET /api/behavior/cohort-analysis
   */
  router.get('/cohort-analysis', async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, you would calculate cohort analysis
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      logger.error('Failed to get cohort analysis', { error });
      res.status(500).json({ error: 'Failed to get cohort analysis' });
    }
  });

  /**
   * Get funnel analysis
   * GET /api/behavior/funnel-analysis
   */
  router.get('/funnel-analysis', async (req: Request, res: Response): Promise<void> => {
    try {
      const { funnelId = 'default' } = req.query;

      // Mock funnel analysis data
      const funnelData = {
        name: 'Insurance Lead Conversion Funnel',
        steps: [
          {
            stepId: 'page_view',
            name: 'Page Views',
            eventType: 'page_view',
            count: 1000,
            rate: 100,
            dropoffRate: 0,
            averageTime: 0,
          },
          {
            stepId: 'form_start',
            name: 'Form Started',
            eventType: 'form_start',
            count: 450,
            rate: 45,
            dropoffRate: 55,
            averageTime: 120,
          },
          {
            stepId: 'quote_request',
            name: 'Quote Requested',
            eventType: 'quote_request',
            count: 200,
            rate: 20,
            dropoffRate: 25,
            averageTime: 300,
          },
          {
            stepId: 'application_start',
            name: 'Application Started',
            eventType: 'application_start',
            count: 125,
            rate: 12.5,
            dropoffRate: 7.5,
            averageTime: 600,
          },
          {
            stepId: 'application_complete',
            name: 'Application Completed',
            eventType: 'application_complete',
            count: 85,
            rate: 8.5,
            dropoffRate: 4,
            averageTime: 1200,
          },
        ],
        totalUsers: 1000,
        overallConversionRate: 8.5,
        generatedAt: new Date().toISOString(),
      };

      res.json(funnelData);
    } catch (error) {
      logger.error('Failed to get funnel analysis', { error });
      res.status(500).json({ error: 'Failed to get funnel analysis' });
    }
  });

  // ========================================
  // UTILITY ENDPOINTS
  // ========================================

  /**
   * Clear analytics cache
   * POST /api/behavior/cache/clear
   */
  router.post('/cache/clear', async (req: Request, res: Response): Promise<void> => {
    try {
      service.clearCache();
      res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

  /**
   * Health check
   * GET /api/behavior/health
   */
  router.get('/health', (req: Request, res: Response): void => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'behavior-analytics'
    });
  });

  return router;
}