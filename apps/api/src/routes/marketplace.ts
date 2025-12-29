// Phase 12.6: Marketplace API Routes
import express, { type Request, type Response, type NextFunction } from 'express';
import axios from 'axios';
import { logger } from '@insurance-lead-gen/core';

const router = express.Router();

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

// Helper function to proxy requests to data service
const proxyToDataService = async (
  req: Request,
  res: Response,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
) => {
  try {
    const url = `${DATA_SERVICE_URL}/api/v1/marketplace${path}`;
    
    const axiosConfig: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && method !== 'DELETE') {
      axiosConfig.data = req.body;
    }

    if (method === 'GET') {
      axiosConfig.params = req.query;
    }

    const response = await axios(axiosConfig);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    logger.error('Marketplace proxy error', { error, path, method });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// ==================== Vendor Routes ====================

router.post('/vendors', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/vendors', 'POST');
});

router.get('/vendors/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}`, 'GET');
});

router.get('/vendors/user/:userId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/user/${req.params.userId}`, 'GET');
});

router.put('/vendors/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}`, 'PUT');
});

router.get('/vendors', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/vendors', 'GET');
});

router.post('/vendors/:id/approve', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}/approve`, 'POST');
});

router.post('/vendors/:id/suspend', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}/suspend`, 'POST');
});

router.get('/vendors/:id/performance', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}/performance`, 'GET');
});

router.delete('/vendors/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/vendors/${req.params.id}`, 'DELETE');
});

// ==================== Item Routes ====================

router.post('/items', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/items', 'POST');
});

router.get('/items/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/items/${req.params.id}`, 'GET');
});

router.put('/items/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/items/${req.params.id}`, 'PUT');
});

router.post('/items/search', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/items/search', 'POST');
});

router.get('/items/featured/list', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/items/featured/list', 'GET');
});

router.get('/items/vendor/:vendorId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/items/vendor/${req.params.vendorId}`, 'GET');
});

router.post('/items/:id/toggle-featured', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/items/${req.params.id}/toggle-featured`, 'POST');
});

router.delete('/items/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/items/${req.params.id}`, 'DELETE');
});

// ==================== Transaction Routes ====================

router.post('/transactions', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/transactions', 'POST');
});

router.get('/transactions/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/${req.params.id}`, 'GET');
});

router.put('/transactions/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/${req.params.id}`, 'PUT');
});

router.post('/transactions/:id/complete', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/${req.params.id}/complete`, 'POST');
});

router.post('/transactions/:id/fail', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/${req.params.id}/fail`, 'POST');
});

router.post('/transactions/:id/refund', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/${req.params.id}/refund`, 'POST');
});

router.get('/transactions/buyer/:buyerId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/buyer/${req.params.buyerId}`, 'GET');
});

router.get('/transactions/vendor/:vendorId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/transactions/vendor/${req.params.vendorId}`, 'GET');
});

router.post('/transactions/summary', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/transactions/summary', 'POST');
});

// ==================== Review Routes ====================

router.post('/reviews', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/reviews', 'POST');
});

router.get('/reviews/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/${req.params.id}`, 'GET');
});

router.put('/reviews/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/${req.params.id}`, 'PUT');
});

router.get('/reviews/item/:itemId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/item/${req.params.itemId}`, 'GET');
});

router.get('/reviews/vendor/:vendorId', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/vendor/${req.params.vendorId}`, 'GET');
});

router.get('/reviews/item/:itemId/summary', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/item/${req.params.itemId}/summary`, 'GET');
});

router.get('/reviews/vendor/:vendorId/summary', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/vendor/${req.params.vendorId}/summary`, 'GET');
});

router.post('/reviews/:id/helpful', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/${req.params.id}/helpful`, 'POST');
});

router.post('/reviews/:id/report', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/${req.params.id}/report`, 'POST');
});

router.delete('/reviews/:id', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/reviews/${req.params.id}`, 'DELETE');
});

// ==================== Analytics Routes ====================

router.get('/analytics', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/analytics', 'GET');
});

router.get('/analytics/overview', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/analytics/overview', 'GET');
});

router.get('/analytics/top-items', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/analytics/top-items', 'GET');
});

router.get('/analytics/top-vendors', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, '/analytics/top-vendors', 'GET');
});

router.get('/analytics/category/:category', async (req: Request, res: Response) => {
  await proxyToDataService(req, res, `/analytics/category/${req.params.category}`, 'GET');
});

export default router;
