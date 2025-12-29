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
        error: 'Failed to fetch benchmark data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

router.get('/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}`);
});

router.get('/:brokerId/comparisons', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/comparisons`);
});

router.get('/:brokerId/trends/:category', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/trends/${req.params.category}`);
});

router.get('/:brokerId/insights', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/insights`);
});

router.get('/:brokerId/ranking', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/ranking`);
});

router.get('/:brokerId/report', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/report`);
});

router.get('/peer/groups', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/benchmark/peer/groups');
});

router.get('/industry/benchmarks', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/benchmark/industry/benchmarks');
});

router.get('/:brokerId/goals', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/goals`);
});

router.post('/:brokerId/goals', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/${req.params.brokerId}/goals`);
});

router.get('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/goals/${req.params.goalId}`);
});

router.patch('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/goals/${req.params.goalId}`);
});

router.delete('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/benchmark/goals/${req.params.goalId}`);
});

export default router;
