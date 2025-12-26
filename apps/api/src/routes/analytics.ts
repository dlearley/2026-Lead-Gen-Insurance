import { Router, type Request, type Response } from 'express';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3002';

async function proxyToDataService(endpoint: string, req: Request, res: Response): Promise<void> {
  try {
    const url = `${DATA_SERVICE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to proxy to data service', { error, endpoint });
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.get('/dashboard', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/dashboard', req, res);
});

router.get('/leads/funnel', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/leads/funnel', req, res);
});

router.get('/leads/volume', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/leads/volume', req, res);
});

router.get('/agents/leaderboard', (req: Request, res: Response): void => {
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const endpoint = `/api/v1/analytics/agents/leaderboard${queryString ? `?${queryString}` : ''}`;
  void proxyToDataService(endpoint, req, res);
});

router.get('/agents/:agentId/performance', (req: Request, res: Response): void => {
  const { agentId } = req.params;
  void proxyToDataService(`/api/v1/analytics/agents/${agentId}/performance`, req, res);
});

router.get('/ai/metrics', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/ai/metrics', req, res);
});

router.get('/ai/processing', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/ai/processing', req, res);
});

router.get('/system/health', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/system/health', req, res);
});

router.post('/track/:eventType', (req: Request, res: Response): void => {
  const { eventType } = req.params;
  void proxyToDataService(`/api/v1/analytics/track/${eventType}`, req, res);
});

router.post('/reset', (req: Request, res: Response): void => {
  void proxyToDataService('/api/v1/analytics/reset', req, res);
});

export default router;
