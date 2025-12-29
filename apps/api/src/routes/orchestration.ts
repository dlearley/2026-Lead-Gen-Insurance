import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();

/**
 * Proxy requests to data service for orchestration
 */
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService || 3001}`;

/**
 * GET /api/v1/orchestration/health
 * Health check endpoint
 */
router.get('/orchestration/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'orchestration-proxy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * GET /api/v1/workflows
 * Get all workflows
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/workflows?${new URLSearchParams(req.query as Record<string, string>)}`
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/v1/workflows/:id
 * Get workflow by ID
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * PUT /api/v1/workflows/:id
 * Update a workflow
 */
router.put('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/v1/workflows/:id
 * Delete a workflow
 */
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows/${req.params.id}`, {
      method: 'DELETE',
    });
    res.status(response.status).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * POST /api/v1/workflows/:id/execute
 * Execute a workflow
 */
router.post('/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows/${req.params.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * GET /api/v1/workflows/:id/metrics
 * Get workflow metrics
 */
router.get('/workflows/:id/metrics', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/workflows/${req.params.id}/metrics`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow metrics' });
  }
});

/**
 * GET /api/v1/executions
 * Get workflow executions
 */
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/executions?${new URLSearchParams(req.query as Record<string, string>)}`
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

/**
 * GET /api/v1/executions/:id
 * Get execution by ID
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/executions/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

/**
 * GET /api/v1/circuit-breakers
 * Get all circuit breakers
 */
router.get('/circuit-breakers', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/circuit-breakers`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circuit breakers' });
  }
});

/**
 * GET /api/v1/circuit-breakers/:serviceId
 * Get circuit breaker by service ID
 */
router.get('/circuit-breakers/:serviceId', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/circuit-breakers/${req.params.serviceId}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circuit breaker' });
  }
});

/**
 * PUT /api/v1/circuit-breakers/:serviceId/config
 * Update circuit breaker configuration
 */
router.put('/circuit-breakers/:serviceId/config', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/circuit-breakers/${req.params.serviceId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update circuit breaker config' });
  }
});

/**
 * POST /api/v1/circuit-breakers/:serviceId/reset
 * Reset circuit breaker
 */
router.post('/circuit-breakers/:serviceId/reset', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/circuit-breakers/${req.params.serviceId}/reset`, {
      method: 'POST',
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

/**
 * DELETE /api/v1/circuit-breakers/:serviceId
 * Delete circuit breaker
 */
router.delete('/circuit-breakers/:serviceId', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/circuit-breakers/${req.params.serviceId}`, {
      method: 'DELETE',
    });
    res.status(response.status).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete circuit breaker' });
  }
});

export default router;
