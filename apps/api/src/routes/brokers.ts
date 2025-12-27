import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();

/**
 * Proxy requests to data service for brokers
 */
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService || 3001}`;

/**
 * GET /api/v1/brokers
 * Proxy to data service
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers?${new URLSearchParams(req.query as Record<string, string>)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brokers' });
  }
});

/**
 * GET /api/v1/brokers/:id
 * Proxy to data service
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch broker' });
  }
});

/**
 * POST /api/v1/brokers
 * Proxy to data service
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create broker' });
  }
});

/**
 * PUT /api/v1/brokers/:id
 * Proxy to data service
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update broker' });
  }
});

/**
 * PATCH /api/v1/brokers/:id
 * Proxy to data service
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update broker' });
  }
});

/**
 * DELETE /api/v1/brokers/:id
 * Proxy to data service
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}`, {
      method: 'DELETE',
    });
    res.status(response.status).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete broker' });
  }
});

/**
 * POST /api/v1/brokers/:id/test
 * Test broker integration
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test broker integration' });
  }
});

/**
 * GET /api/v1/brokers/:id/health
 * Get broker health status
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}/health`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get broker health' });
  }
});

/**
 * POST /api/v1/brokers/:id/leads
 * Submit a lead to a broker
 */
router.post('/:id/leads', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/brokers/${req.params.id}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit lead to broker' });
  }
});

export default router;
