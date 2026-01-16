import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { RoutingService } from '../routing-service.js';

const router = Router();
const routingService = new RoutingService();

/**
 * GET /api/v1/routing/config
 * Get current routing configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = routingService.getConfig();
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get routing configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get routing configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/routing/config
 * Update routing configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration data',
      });
    }
    
    routingService.updateConfig(updates);
    const newConfig = routingService.getConfig();
    
    logger.info('Routing configuration updated', { config: newConfig });
    
    res.json({
      success: true,
      data: newConfig,
      message: 'Routing configuration updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update routing configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update routing configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/routing/process-lead
 * Process and route a new lead using AI-powered matching
 */
router.post('/process-lead', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required',
      });
    }
    
    logger.info('Processing lead for routing', { leadId });
    
    const routingDecision = await routingService.routeLead(leadId);
    
    res.json({
      success: true,
      data: routingDecision,
      message: 'Lead routed successfully',
    });
  } catch (error) {
    logger.error('Failed to process lead', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process lead',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/routing/route/:leadId
 * Route a specific lead to the best matching agent
 */
router.post('/route/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required',
      });
    }
    
    logger.info('Routing lead', { leadId });
    
    const routingDecision = await routingService.routeLead(leadId);
    
    res.json({
      success: true,
      data: routingDecision,
      message: 'Lead routed successfully',
    });
  } catch (error) {
    logger.error('Failed to route lead', { error, leadId: req.params.leadId });
    res.status(500).json({
      success: false,
      error: 'Failed to route lead',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/routing/batch
 * Batch process and route multiple leads
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds array is required',
      });
    }
    
    logger.info('Batch routing leads', { count: leadIds.length });
    
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };
    
    for (const leadId of leadIds) {
      try {
        const routingDecision = await routingService.routeLead(leadId);
        results.successful.push({
          leadId,
          routingDecision,
        });
      } catch (error) {
        logger.error('Failed to route lead in batch', { error, leadId });
        results.failed.push({
          leadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      message: `Batch routing completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    });
  } catch (error) {
    logger.error('Failed to process batch routing', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process batch routing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/routing/reassign-stale
 * Reassign stale leads that haven't been acted upon
 */
router.post('/reassign-stale', async (req: Request, res: Response) => {
  try {
    logger.info('Starting stale lead reassignment');
    
    await routingService.reassignStaleLeads();
    
    res.json({
      success: true,
      message: 'Stale lead reassignment completed',
    });
  } catch (error) {
    logger.error('Failed to reassign stale leads', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to reassign stale leads',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/routing/webhook
 * Webhook endpoint for external lead routing requests
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { leadId, source, webhookSecret } = req.body;
    
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId is required',
      });
    }
    
    // Verify webhook secret (in production, use proper authentication)
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }
    
    logger.info('Processing webhook routing request', { leadId, source });
    
    const routingDecision = await routingService.routeLead(leadId);
    
    res.json({
      success: true,
      data: routingDecision,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Failed to process webhook', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/routing/agent/:agentId/history
 * Get routing history for a specific agent
 */
router.get('/agent/:agentId/history', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required',
      });
    }
    
    const history = await routingService.getAgentRoutingHistory(agentId);
    
    res.json({
      success: true,
      data: {
        agentId,
        routingHistory: history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get agent routing history', { error, agentId: req.params.agentId });
    res.status(500).json({
      success: false,
      error: 'Failed to get agent routing history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
