import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger, ValidationError, BaseError } from '@insurance-lead-gen/core';
import { RoutingService, type RoutingDecision, type RoutingConfig } from './routing-service.js';
import type { Lead } from '@insurance-lead-gen/types';

const PORT = process.env.ORCHESTRATOR_PORT || 3002;

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const routingService = new RoutingService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get routing configuration
app.get('/api/v1/routing/config', (req, res) => {
  try {
    const config = routingService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

// Update routing configuration
app.put('/api/v1/routing/config', (req, res, next) => {
  try {
    const configUpdate: Partial<RoutingConfig> = req.body;
    routingService.updateConfig(configUpdate);
    
    res.json({ 
      success: true, 
      data: routingService.getConfig(),
      message: 'Routing configuration updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Process lead with AI-powered routing
app.post('/api/v1/routing/process-lead', async (req, res, next) => {
  try {
    const leadData: Partial<Lead> = req.body;
    
    if (!leadData.id && !leadData.source) {
      throw new ValidationError('Lead ID or source is required for routing');
    }

    // If lead data is provided but not persisted, we need to create it first
    // In a real implementation, this would save to PostgreSQL via API call
    const leadId = leadData.id || `lead_${Date.now()}`;
    
    // Route the lead using AI-powered matching
    const routingDecision: RoutingDecision = await routingService.routeLead(leadId);
    
    res.json({ 
      success: true, 
      data: routingDecision,
      message: 'Lead routed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Route a specific lead to the best matching agent
app.post('/api/v1/routing/route/:leadId', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    
    const routingDecision: RoutingDecision = await routingService.routeLead(leadId);
    
    res.json({ 
      success: true, 
      data: routingDecision,
      message: 'Lead routed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reassign stale leads that haven't been accepted
app.post('/api/v1/routing/reassign-stale', async (req, res, next) => {
  try {
    await routingService.reassignStaleLeads();
    
    res.json({ 
      success: true, 
      message: 'Stale lead reassignment process completed'
    });
  } catch (error) {
    next(error);
  }
});

// Get agent routing history
app.get('/api/v1/routing/agents/:agentId/history', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const history = await routingService.getAgentRoutingHistory(agentId);
    
    res.json({ 
      success: true, 
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Batch route multiple leads
app.post('/api/v1/routing/batch', async (req, res, next) => {
  try {
    const { leadIds } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new ValidationError('leadIds must be a non-empty array');
    }

    const results = await Promise.allSettled(
      leadIds.map(leadId => routingService.routeLead(leadId))
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    res.json({
      success: true,
      data: {
        total: leadIds.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((r, i) => ({
          leadId: leadIds[i],
          status: r.status,
          ...(r.status === 'fulfilled' ? { data: (r as PromiseFulfilledResult<RoutingDecision>).value } : {}),
          ...(r.status === 'rejected' ? { error: (r as PromiseRejectedResult).reason.message } : {})
        }))
      },
      message: `Routed ${successful.length} of ${leadIds.length} leads successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Simulate webhook endpoint for external systems
app.post('/api/v1/routing/webhook', async (req, res, next) => {
  try {
    const { event, data } = req.body;
    
    if (event !== 'lead.qualified') {
      return res.json({ 
        success: false, 
        message: 'Only lead.qualified events are processed for routing'
      });
    }

    const leadId = data.leadId;
    if (!leadId) {
      throw new ValidationError('leadId is required in event data');
    }

    // Process the qualified lead
    const routingDecision = await routingService.routeLead(leadId);
    
    res.json({ 
      success: true, 
      data: routingDecision,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error handling orchestrator request', { 
    error: error.message, 
    stack: error.stack,
    path: req.path,
    method: req.method 
  });

  if (error instanceof BaseError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal orchestrator error',
    });
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

const server = app.listen(PORT, () => {
  logger.info(`Orchestrator service running on port ${PORT}`);
});

export default app;