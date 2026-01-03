import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createEndpointRateLimiter } from '../middleware/user-rate-limit.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();
const config = getConfig();

const reportDownloadLimiter = createEndpointRateLimiter(20, 24 * 60 * 60 * 1000);

const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}`;

router.post('/configs', authMiddleware, requirePermission('write:reports'), async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to create report config', { error });
    return sendError(res, 'Failed to create report config', 500);
  }
});

router.get('/configs', authMiddleware, requirePermission('read:reports'), async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs`);
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    logger.error('Failed to fetch report configs', { error });
    return sendError(res, 'Failed to fetch report configs', 500);
  }
});

router.get('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs/${id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to fetch report config', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch report config' });
  }
});

router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to update report config', { error });
    res.status(500).json({ success: false, error: 'Failed to update report config' });
  }
});

router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to delete report config', { error });
    res.status(500).json({ success: false, error: 'Failed to delete report config' });
  }
});

router.post('/generate', authMiddleware, requirePermission('read:reports'), reportDownloadLimiter, async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
      res.set('Content-Disposition', response.headers.get('content-disposition') || '');
      return res.send(Buffer.from(buffer));
    }
  } catch (error) {
    logger.error('Failed to generate report', { error });
    return sendError(res, 'Failed to generate report', 500);
  }
});

router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/scheduled`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch scheduled reports', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch scheduled reports' });
  }
});

router.post('/configs/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/configs/${id}/run`, {
      method: 'POST',
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to run report', { error });
    res.status(500).json({ success: false, error: 'Failed to run report' });
  }
});

export default router;
