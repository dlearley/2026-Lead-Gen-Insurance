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
        error: 'Failed to fetch broker network data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Profile endpoints
router.get('/profile/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/profile/${req.params.brokerId}`);
});

// Connection endpoints
router.get('/connections/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/connections/${req.params.brokerId}`);
});

router.post('/connections', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/broker-network/connections');
});

router.patch('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/connections/${req.params.id}`);
});

// Referral endpoints
router.get('/referrals/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/referrals/${req.params.brokerId}`);
});

router.post('/referrals', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/broker-network/referrals');
});

router.patch('/referrals/:id/status', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/referrals/${req.params.id}/status`);
});

// Metrics endpoints
router.get('/metrics/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/metrics/${req.params.brokerId}`);
});

router.get('/value/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/value/${req.params.brokerId}`);
});

router.get('/multiplier/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/multiplier/${req.params.brokerId}`);
});

router.get('/score/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/score/${req.params.brokerId}`);
});

router.get('/reach/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/reach/${req.params.brokerId}`);
});

// Growth and analytics endpoints
router.get('/growth/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/growth/${req.params.brokerId}`);
});

router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/broker-network/leaderboard');
});

router.get('/effectiveness/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/effectiveness/${req.params.brokerId}`);
});

router.get('/prediction/:brokerId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/broker-network/prediction/${req.params.brokerId}`);
});

// Admin endpoints
router.post('/recalculate-scores', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/broker-network/recalculate-scores');
});

export default router;
