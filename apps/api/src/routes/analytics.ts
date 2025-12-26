import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

async function proxyToDataService(req: Request, res: Response, endpoint: string): Promise<void> {
  try {
    const response = await axios({
      method: req.method,
      url: `${DATA_SERVICE_URL}${endpoint}`,
      data: req.body,
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      logger.error('Proxy to data service failed', { endpoint, error: error.message });
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch analytics data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/dashboard');
});

router.get('/leads/funnel', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/leads/funnel');
});

router.get('/leads/volume', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/leads/volume');
});

router.get('/agents/leaderboard', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/agents/leaderboard');
});

router.get('/agents/:agentId/performance', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/analytics/agents/${req.params.agentId}/performance`);
});

router.get('/ai/metrics', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/ai/metrics');
});

router.get('/ai/processing', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/ai/processing');
});

router.get('/system/health', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/system/health');
});

router.post('/track/event', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/track/event');
});

router.post('/track/lead', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/track/lead');
});

router.post('/track/agent', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/track/agent');
});

router.post('/track/ai', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/analytics/track/ai');
});

export default router;
