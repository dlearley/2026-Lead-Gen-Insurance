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
        error: 'Failed to fetch support data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// ========================================
// SUPPORT TICKET ROUTES
// ========================================

router.post('/tickets', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/tickets');
});

router.get('/tickets', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/tickets');
});

router.get('/tickets/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/tickets/${req.params.id}`);
});

router.put('/tickets/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/tickets/${req.params.id}`);
});

router.post('/tickets/:id/comments', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/tickets/${req.params.id}/comments`);
});

router.post('/tickets/:id/escalate', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/tickets/${req.params.id}/escalate`);
});

// ========================================
// INCIDENT ROUTES
// ========================================

router.post('/incidents', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/incidents');
});

router.get('/incidents', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/incidents');
});

router.get('/incidents/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/incidents/${req.params.id}`);
});

router.put('/incidents/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/incidents/${req.params.id}`);
});

router.post('/incidents/:id/updates', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/incidents/${req.params.id}/updates`);
});

// ========================================
// KNOWLEDGE BASE ROUTES
// ========================================

router.post('/kb-articles', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/kb-articles');
});

router.get('/kb-articles', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/kb-articles');
});

router.get('/kb-articles/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/kb-articles/${req.params.id}`);
});

router.put('/kb-articles/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/support/kb-articles/${req.params.id}`);
});

// ========================================
// SLA ROUTES
// ========================================

router.post('/sla-policies', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/sla-policies');
});

router.get('/sla-policies', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/sla-policies');
});

router.get('/sla-reports', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/sla-reports');
});

// ========================================
// ANALYTICS ROUTES
// ========================================

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/support/analytics');
});

export default router;
