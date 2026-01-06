import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import {
  LeadPrioritizationService,
  AgentMatchingService,
  CapacityManagementService,
  RoutingEngineService,
  QueueManagementService,
  RoutingAnalyticsService,
  ABTestingService,
} from '@insurance-lead-gen/core';
import type {
  RoutingStrategy,
  AgentStatus,
  QueueType,
  LeadTier,
} from '@insurance-lead-gen/types';

const router = Router();

// Initialize services lazily
let services: {
  leadPrioritization: LeadPrioritizationService;
  agentMatching: AgentMatchingService;
  capacityManagement: CapacityManagementService;
  routingEngine: RoutingEngineService;
  queueManagement: QueueManagementService;
  routingAnalytics: RoutingAnalyticsService;
  abTesting: ABTestingService;
} | null = null;

function getServices(prisma: PrismaClient) {
  if (!services) {
    services = {
      leadPrioritization: new LeadPrioritizationService(prisma),
      agentMatching: new AgentMatchingService(prisma),
      capacityManagement: new CapacityManagementService(prisma),
      routingEngine: new RoutingEngineService(
        prisma,
        new LeadPrioritizationService(prisma),
        new AgentMatchingService(prisma),
        new CapacityManagementService(prisma)
      ),
      queueManagement: new QueueManagementService(
        prisma,
        new LeadPrioritizationService(prisma),
        new RoutingEngineService(
          prisma,
          new LeadPrioritizationService(prisma),
          new AgentMatchingService(prisma),
          new CapacityManagementService(prisma)
        )
      ),
      routingAnalytics: new RoutingAnalyticsService(prisma),
      abTesting: new ABTestingService(prisma),
    };
  }
  return services;
}

// ========================================
// LEAD PRIORITIZATION ENDPOINTS
// ========================================

/**
 * GET /api/v1/routing/prioritization/score/:leadId
 * Get lead score and tier
 */
router.get('/prioritization/score/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const score = await svc.leadPrioritization.getLeadScore(leadId);
    const slaStatus = await svc.leadPrioritization.getSLAStatus(leadId);

    res.json({
      leadId,
      score: score.score,
      tier: score.tier,
      factors: score.factors,
      dynamicAdjustments: score.dynamicAdjustments,
      slaStatus,
      createdAt: score.createdAt,
    });
  } catch (error) {
    logger.error('Error getting lead score', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/prioritization/rescore
 * Rescore all active leads
 */
router.post('/prioritization/rescore', async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const rescoredCount = await svc.leadPrioritization.rescoreAllLeads();

    res.json({
      success: true,
      totalLeadsRescored: rescoredCount,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error rescoring leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/prioritization/tier/:tier
 * Get leads by tier
 */
router.get('/prioritization/tier/:tier', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tier } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const leads = await svc.leadPrioritization.getLeadsByTier(
      tier as LeadTier,
      limit,
      offset
    );

    res.json({
      tier,
      leads,
      count: leads.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error getting leads by tier', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/prioritization/queue-status
 * Get queue status
 */
router.get('/prioritization/queue-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const priorities = await svc.leadPrioritization.getLeadPriorities();

    res.json({
      totalPriorities: priorities.length,
      priorities,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error getting queue status', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// AGENT MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/v1/routing/agents/:agentId/availability
 * Get agent availability
 */
router.get('/agents/:agentId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const capacity = await svc.capacityManagement.getAgentCapacity(agentId);

    res.json(capacity);
  } catch (error) {
    logger.error('Error getting agent availability', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/routing/agents/:agentId/availability
 * Update agent status
 */
router.put('/agents/:agentId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const schema = z.object({
      status: z.enum(['Available', 'In_Call', 'Break', 'Training', 'Offline']),
      maxCapacity: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    await svc.capacityManagement.updateAgentStatus(
      agentId,
      data.status,
      data.maxCapacity
    );

    res.json({
      success: true,
      agentId,
      status: data.status,
      maxCapacity: data.maxCapacity,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error updating agent status', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/agents/:agentId/specializations
 * Get agent specializations
 */
router.get('/agents/:agentId/specializations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const capability = await svc.agentMatching.getAgentCapability(agentId);

    res.json(capability);
  } catch (error) {
    logger.error('Error getting agent specializations', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/agents/:agentId/specializations
 * Update agent specializations
 */
router.post('/agents/:agentId/specializations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const schema = z.object({
      specializations: z.array(
        z.object({
          insuranceLine: z.enum(['Auto', 'Home', 'Life', 'Health', 'Commercial']),
          customerSegment: z.enum(['Individual', 'SMB', 'Enterprise']),
          proficiencyLevel: z.number().min(1).max(5),
          maxConcurrentLeads: z.number().optional(),
          languages: z.array(z.string()).optional(),
          territories: z.array(z.string()).optional(),
        })
      ),
    });

    const { specializations } = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    await svc.agentMatching.updateAgentSpecializations(agentId, specializations);

    res.json({
      success: true,
      agentId,
      specializations,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error updating agent specializations', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/agents/:agentId/performance
 * Get agent performance metrics
 */
router.get('/agents/:agentId/performance', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const periodStart = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = req.query.end ? new Date(req.query.end as string) : new Date();

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const quality = await svc.routingAnalytics.getAssignmentQuality(agentId, {
      start: periodStart,
      end: periodEnd,
    });

    res.json(quality);
  } catch (error) {
    logger.error('Error getting agent performance', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/agents/matching/:leadId
 * Find matching agents for a lead
 */
router.get('/agents/matching/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const matchingAgents = await svc.agentMatching.findMatchingAgents(leadId);

    res.json({
      leadId,
      totalMatches: matchingAgents.length,
      matches: matchingAgents.slice(0, limit),
    });
  } catch (error) {
    logger.error('Error finding matching agents', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// ROUTING ENDPOINTS
// ========================================

/**
 * POST /api/v1/routing/assign/:leadId
 * Route lead to best matching agent
 */
router.post('/assign/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const schema = z.object({
      strategy: z.enum(['greedy', 'optimal', 'reinforcement', 'manual', 'hybrid']).optional(),
      preferredAgentId: z.string().optional(),
      force: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const result = await svc.routingEngine.routeLead(
      leadId,
      (data.strategy as RoutingStrategy) || 'greedy',
      data.preferredAgentId,
      data.force || false
    );

    res.json(result);
  } catch (error) {
    logger.error('Error routing lead', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/batch-assign
 * Batch route multiple leads
 */
router.post('/batch-assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      leadIds: z.array(z.string()).min(1),
      strategy: z.enum(['greedy', 'optimal']),
    });

    const { leadIds, strategy } = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const results = await svc.routingEngine.batchRouteLeads(leadIds, strategy);

    res.json({
      totalLeads: leadIds.length,
      successfulAssignments: results.filter(r => r.success).length,
      failedAssignments: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    logger.error('Error batch routing leads', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/reroute/:leadId
 * Reroute lead to different agent
 */
router.post('/reroute/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const schema = z.object({
      reason: z.string(),
    });

    const { reason } = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const result = await svc.routingEngine.rerouteLead(leadId, reason);

    res.json({
      success: true,
      leadId,
      reason,
      result,
    });
  } catch (error) {
    logger.error('Error rerouting lead', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/explanation/:leadId
 * Get routing explanation for lead assignment
 */
router.get('/explanation/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const explanation = await svc.routingEngine.getRoutingExplanation(leadId);

    res.json(explanation);
  } catch (error) {
    logger.error('Error getting routing explanation', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// QUEUE MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/v1/routing/queue/:queueType/status
 * Get queue status
 */
router.get('/queue/:queueType/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { queueType } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const metrics = await svc.queueManagement.getQueueMetrics(queueType as QueueType);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting queue status', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/queue/:queueType/leads
 * Get leads in queue
 */
router.get('/queue/:queueType/leads', async (req: Request, res: Response): Promise<void> => {
  try {
    const { queueType } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const prisma = req.app.get('prisma') as PrismaClient;

    const leads = await prisma.assignmentQueue.findMany({
      where: { queueType },
      include: { lead: true },
      orderBy: { leadScore: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json({
      queueType,
      totalLeads: leads.length,
      leads,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error getting queue leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/queue/:queueType/process
 * Process queue
 */
router.post('/queue/:queueType/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const { queueType } = req.params;
    const maxAssignments = parseInt(req.body.maxAssignments as string) || 10;

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const assignedCount = await svc.queueManagement.processQueue(
      queueType as QueueType,
      maxAssignments
    );

    res.json({
      success: true,
      queueType,
      assignedCount,
      processedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error processing queue', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/queue/lead/:leadId/move
 * Move lead to different queue
 */
router.post('/queue/lead/:leadId/move', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const schema = z.object({
      newQueueType: z.enum(['hot', 'active', 'nurture', 'waiting', 'reassignment']),
      reason: z.string(),
    });

    const { newQueueType, reason } = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    await svc.queueManagement.moveLeadToQueue(leadId, newQueueType as QueueType, reason);

    res.json({
      success: true,
      leadId,
      previousQueue: 'unknown',
      newQueueType,
      reason,
      movedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error moving lead to queue', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// CAPACITY MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/v1/routing/capacity/agents
 * Get agent capacity heatmap
 */
router.get('/capacity/agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const heatmap = await svc.capacityManagement.getCapacityHeatmap();

    res.json({
      totalAgents: heatmap.length,
      agents: heatmap,
      updatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error getting capacity heatmap', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/capacity/available/:agentId
 * Get agent available capacity
 */
router.get('/capacity/available/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const availableCapacity = await svc.capacityManagement.getAvailableCapacity(agentId);

    res.json({
      agentId,
      availableCapacity,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error getting available capacity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/capacity/forecast
 * Forecast capacity needs
 */
router.get('/capacity/forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const hours = parseInt(req.query.hours as string) || 8;

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const forecast = await svc.capacityManagement.getCapacityForecast(hours);

    res.json({
      forecastPeriod: `${hours} hours`,
      forecast,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error getting capacity forecast', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/v1/routing/metrics
 * Get routing performance metrics
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const start = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(req.query.end as string) : new Date();

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const metrics = await svc.routingAnalytics.getRoutingMetrics({
      start,
      end,
    });

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting routing metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/sla-at-risk
 * Get leads approaching SLA breach
 */
router.get('/sla-at-risk', async (req: Request, res: Response): Promise<void> => {
  try {
    const thresholdMinutes = parseInt(req.query.threshold as string) || 60;

    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const approachingLeads = await svc.queueManagement.getApproachingSLALeads(thresholdMinutes);

    res.json({
      totalAtRisk: approachingLeads.length,
      leads: approachingLeads,
      thresholdMinutes,
      checkedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error getting SLA at-risk leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// A/B TESTING ENDPOINTS
// ========================================

/**
 * POST /api/v1/routing/experiments/create
 * Create routing experiment
 */
router.post('/experiments/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string(),
      strategyType: z.enum(['greedy', 'optimal', 'reinforcement', 'hybrid']),
      description: z.string().optional(),
      trafficPercentage: z.number().min(0).max(100),
      startDate: z.string(),
      endDate: z.string().optional(),
      controlStrategyId: z.string().optional(),
      successMetric: z.enum(['conversion_rate', 'avg_handling_time', 'sla_compliance', 'customer_satisfaction']),
      variants: z.array(
        z.object({
          name: z.string(),
          strategy: z.enum(['greedy', 'optimal', 'reinforcement', 'manual', 'hybrid']),
          parameters: z.record(z.unknown()),
          trafficAllocation: z.number().min(0).max(100),
        })
      ).min(2),
    });

    const data = schema.parse(req.body);
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const experiment = await svc.abTesting.createExperiment(
      {
        name: data.name,
        strategyType: data.strategyType,
        description: data.description,
        trafficPercentage: data.trafficPercentage,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        controlStrategyId: data.controlStrategyId,
        successMetric: data.successMetric,
        minSampleSize: 100,
        confidenceLevel: 0.95,
      },
      data.variants
    );

    res.status(201).json(experiment);
  } catch (error) {
    logger.error('Error creating experiment', { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/experiments/active
 * Get active experiments
 */
router.get('/experiments/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const experiments = await svc.abTesting.getActiveExperiments();

    res.json({
      totalActive: experiments.length,
      experiments,
    });
  } catch (error) {
    logger.error('Error getting active experiments', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/routing/experiments/:experimentId/metrics
 * Get experiment metrics
 */
router.get('/experiments/:experimentId/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { experimentId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    const metrics = await svc.abTesting.getExperimentMetrics(experimentId);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting experiment metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/experiments/:experimentId/promote
 * Promote winning variant
 */
router.post('/experiments/:experimentId/promote', async (req: Request, res: Response): Promise<void> => {
  try {
    const { experimentId } = req.params;
    const prisma = req.app.get('prisma') as PrismaClient;
    const svc = getServices(prisma);

    await svc.abTesting.promoteWinner(experimentId);

    res.json({
      success: true,
      experimentId,
      promotedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error promoting winner', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
