import { Router, Request, Response } from 'express';
import { WorkflowService } from '../services/workflow.service.js';
import { CircuitBreakerService } from '../services/circuit-breaker.service.js';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowExecutionDto,
  CircuitBreakerConfig,
} from '@insurance/types';
import logger from '../logger.js';

const router = Router();
const workflowService = new WorkflowService();
const circuitBreakerService = new CircuitBreakerService();

// ========================================
// WORKFLOWS
// ========================================

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const workflow = await workflowService.createWorkflow(req.body as CreateWorkflowDto);
    res.status(201).json(workflow);
  } catch (error) {
    logger.error('Failed to create workflow', { error });
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * GET /api/v1/workflows
 * Get all workflows with filtering
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      category: req.query.category as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await workflowService.getWorkflows(filters);
    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch workflows', { error });
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/v1/workflows/:id
 * Get workflow by ID
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    logger.error('Failed to fetch workflow', { error });
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * PUT /api/v1/workflows/:id
 * Update a workflow
 */
router.put('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const workflow = await workflowService.updateWorkflow(req.params.id, req.body as UpdateWorkflowDto);
    res.json(workflow);
  } catch (error) {
    logger.error('Failed to update workflow', { error });
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/v1/workflows/:id
 * Delete a workflow
 */
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    await workflowService.deleteWorkflow(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete workflow', { error });
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ========================================
// WORKFLOW EXECUTIONS
// ========================================

/**
 * POST /api/v1/workflows/:id/execute
 * Execute a workflow
 */
router.post('/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const request: CreateWorkflowExecutionDto = {
      workflowId: req.params.id,
      input: req.body.input || {},
      metadata: req.body.metadata,
    };

    const execution = await workflowService.executeWorkflow(request);
    res.status(202).json(execution);
  } catch (error) {
    logger.error('Failed to execute workflow', { error });
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute workflow';
    res.status(400).json({ error: errorMessage });
  }
});

/**
 * GET /api/v1/executions
 * Get workflow executions
 */
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const filters = {
      workflowId: req.query.workflowId as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await workflowService.getExecutions(filters);
    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch executions', { error });
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

/**
 * GET /api/v1/executions/:id
 * Get execution by ID
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await workflowService.getExecutionById(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    logger.error('Failed to fetch execution', { error });
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// ========================================
// WORKFLOW METRICS
// ========================================

/**
 * GET /api/v1/workflows/:id/metrics
 * Get workflow metrics
 */
router.get('/workflows/:id/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await workflowService.getWorkflowMetrics(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to fetch workflow metrics', { error });
    res.status(500).json({ error: 'Failed to fetch workflow metrics' });
  }
});

// ========================================
// CIRCUIT BREAKERS
// ========================================

/**
 * GET /api/v1/circuit-breakers
 * Get all circuit breakers
 */
router.get('/circuit-breakers', async (req: Request, res: Response) => {
  try {
    const breakers = await circuitBreakerService.getAllCircuitBreakers();
    res.json(breakers);
  } catch (error) {
    logger.error('Failed to fetch circuit breakers', { error });
    res.status(500).json({ error: 'Failed to fetch circuit breakers' });
  }
});

/**
 * GET /api/v1/circuit-breakers/:serviceId
 * Get circuit breaker for a service
 */
router.get('/circuit-breakers/:serviceId', async (req: Request, res: Response) => {
  try {
    const state = await circuitBreakerService.getCircuitBreaker(req.params.serviceId);
    res.json({ serviceId: req.params.serviceId, state });
  } catch (error) {
    logger.error('Failed to fetch circuit breaker', { error });
    res.status(500).json({ error: 'Failed to fetch circuit breaker' });
  }
});

/**
 * PUT /api/v1/circuit-breakers/:serviceId/config
 * Update circuit breaker configuration
 */
router.put('/circuit-breakers/:serviceId/config', async (req: Request, res: Response) => {
  try {
    await circuitBreakerService.updateConfig(req.params.serviceId, req.body as CircuitBreakerConfig);
    res.json({ message: 'Circuit breaker config updated' });
  } catch (error) {
    logger.error('Failed to update circuit breaker config', { error });
    res.status(500).json({ error: 'Failed to update circuit breaker config' });
  }
});

/**
 * POST /api/v1/circuit-breakers/:serviceId/reset
 * Reset circuit breaker
 */
router.post('/circuit-breakers/:serviceId/reset', async (req: Request, res: Response) => {
  try {
    await circuitBreakerService.resetCircuitBreaker(req.params.serviceId);
    res.json({ message: 'Circuit breaker reset' });
  } catch (error) {
    logger.error('Failed to reset circuit breaker', { error });
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

/**
 * DELETE /api/v1/circuit-breakers/:serviceId
 * Delete circuit breaker
 */
router.delete('/circuit-breakers/:serviceId', async (req: Request, res: Response) => {
  try {
    await circuitBreakerService.deleteCircuitBreaker(req.params.serviceId);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete circuit breaker', { error });
    res.status(500).json({ error: 'Failed to delete circuit breaker' });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

/**
 * GET /api/v1/orchestration/health
 * Health check endpoint
 */
router.get('/orchestration/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'orchestration',
    timestamp: new Date().toISOString(),
  });
});

export default router;
