import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';

const router = Router();
const config = getConfig();

const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}`;

router.get('/check', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/check`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to check alerts', { error });
    res.status(500).json({ success: false, error: 'Failed to check alerts' });
  }
});

router.post('/rules', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to create alert rule', { error });
    res.status(500).json({ success: false, error: 'Failed to create alert rule' });
  }
});

router.get('/rules', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/rules`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch alert rules', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch alert rules' });
  }
});

router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/rules/${id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to fetch alert rule', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch alert rule' });
  }
});

router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to update alert rule', { error });
    res.status(500).json({ success: false, error: 'Failed to update alert rule' });
  }
});

router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/rules/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to delete alert rule', { error });
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' });
  }
});

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/alerts/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to resolve alert', { error });
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
});

export default router;
