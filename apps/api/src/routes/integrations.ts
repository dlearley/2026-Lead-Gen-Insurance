import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();

/**
 * Proxy requests to data service for integration configs and logs
 */
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService || 3001}`;

/**
 * GET /api/v1/integration-configs
 * Proxy to data service
 */
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/integration-configs?${new URLSearchParams(req.query as Record<string, string>)}`
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration configs' });
  }
});

/**
 * GET /api/v1/integration-configs/:id
 * Proxy to data service
 */
router.get('/configs/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration config' });
  }
});

/**
 * GET /api/v1/integration-configs/type/:configType
 * Proxy to data service
 */
router.get('/configs/type/:configType', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/type/${req.params.configType}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration configs by type' });
  }
});

/**
 * GET /api/v1/integration-configs/template/:configType
 * Get configuration template
 */
router.get('/configs/template/:configType', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/template/${req.params.configType}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config template' });
  }
});

/**
 * POST /api/v1/integration-configs
 * Create integration config
 */
router.post('/configs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create integration config' });
  }
});

/**
 * PUT /api/v1/integration-configs/:id
 * Update integration config
 */
router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update integration config' });
  }
});

/**
 * PATCH /api/v1/integration-configs/:id
 * Patch integration config
 */
router.patch('/configs/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update integration config' });
  }
});

/**
 * DELETE /api/v1/integration-configs/:id
 * Delete integration config
 */
router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}`, {
      method: 'DELETE',
    });
    res.status(response.status).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete integration config' });
  }
});

/**
 * POST /api/v1/integration-configs/:id/enable
 * Enable integration config
 */
router.post('/configs/:id/enable', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable integration config' });
  }
});

/**
 * POST /api/v1/integration-configs/:id/disable
 * Disable integration config
 */
router.post('/configs/:id/disable', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-configs/${req.params.id}/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable integration config' });
  }
});

/**
 * GET /api/v1/integration-logs
 * Get integration logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/integration-logs?${new URLSearchParams(req.query as Record<string, string>)}`
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration logs' });
  }
});

/**
 * GET /api/v1/integration-logs/:id
 * Get specific integration log
 */
router.get('/logs/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/integration-logs/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration log' });
  }
});

/**
 * GET /api/v1/integration-logs/stats/summary
 * Get integration logs statistics
 */
router.get('/logs/stats/summary', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/integration-logs/stats/summary?${new URLSearchParams(req.query as Record<string, string>)}`
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration logs stats' });
  }
});

/**
 * DELETE /api/v1/integration-logs
 * Delete integration logs
 */
router.delete('/logs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `${DATA_SERVICE_URL}/api/v1/integration-logs?${new URLSearchParams(req.query as Record<string, string>)}`,
      {
        method: 'DELETE',
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete integration logs' });
  }
});

export default router;
