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
        error: 'Failed to fetch BI data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Prediction endpoints
router.get('/predictive/leads/conversion', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/predictive/leads/conversion');
});

router.get('/predictive/agents/performance', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/predictive/agents/performance');
});

router.get('/predictive/market/trends', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/predictive/market/trends');
});

// Insights endpoints
router.get('/insights/leads', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/insights/leads');
});

router.get('/insights/agents', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/insights/agents');
});

router.get('/insights/market', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/insights/market');
});

// Recommendations endpoints
router.get('/recommendations/routing', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/recommendations/routing');
});

router.get('/recommendations/performance', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/recommendations/performance');
});

router.get('/recommendations/optimization', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/recommendations/optimization');
});

// Data exploration endpoint
router.post('/explore', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/explore');
});

// What-if analysis endpoint
router.post('/analysis/what-if', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/bi/analysis/what-if');
});

export default router;