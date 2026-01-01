import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();

/**
 * Proxy requests to data service for partners
 */
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService || 3001}`;

/**
 * GET /api/v1/partners
 * Get all partners
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners?${new URLSearchParams(req.query as Record<string, string>)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

/**
 * GET /api/v1/partners/:id
 * Get a specific partner
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner' });
  }
});

/**
 * POST /api/v1/partners
 * Create a new partner
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create partner' });
  }
});

/**
 * PUT /api/v1/partners/:id
 * Update a partner
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update partner' });
  }
});

/**
 * DELETE /api/v1/partners/:id
 * Delete a partner
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}`, {
      method: 'DELETE',
    });
    res.status(response.status).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete partner' });
  }
});

/**
 * GET /api/v1/partners/:id/users
 * Get all users for a partner
 */
router.get('/:id/users', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/users`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner users' });
  }
});

/**
 * POST /api/v1/partners/:id/users
 * Add a user to a partner
 */
router.post('/:id/users', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add partner user' });
  }
});

/**
 * GET /api/v1/partners/:id/training
 * Get training progress for a partner
 */
router.get('/:id/training', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/training`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner training progress' });
  }
});

/**
 * GET /api/v1/partners/:id/certifications
 * Get certifications for a partner
 */
router.get('/:id/certifications', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/certifications`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner certifications' });
  }
});

/**
 * GET /api/v1/partners/:id/performance
 * Get performance metrics for a partner
 */
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/performance`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner performance' });
  }
});

/**
 * POST /api/v1/partners/:id/support
 * Create a support ticket for a partner
 */
router.post('/:id/support', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

/**
 * GET /api/v1/partners/:id/support
 * Get support tickets for a partner
 */
router.get('/:id/support', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/partners/${req.params.id}/support`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

/**
 * GET /api/v1/training/modules
 * Get all training modules
 */
router.get('/training/modules', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/training/modules`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch training modules' });
  }
});

/**
 * POST /api/v1/training/modules
 * Create a new training module
 */
router.post('/training/modules', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/training/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create training module' });
  }
});

export default router;