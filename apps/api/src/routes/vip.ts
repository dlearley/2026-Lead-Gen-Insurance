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
        error: 'Failed to fetch VIP data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

router.get('/agents/:agentId/status', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/vip/agents/${req.params.agentId}/status`);
});

router.post('/agents/:agentId/points', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/vip/agents/${req.params.agentId}/points`);
});

router.put('/agents/:agentId/tier', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/vip/agents/${req.params.agentId}/tier`);
});

router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/vip/leaderboard');
});

export default router;
