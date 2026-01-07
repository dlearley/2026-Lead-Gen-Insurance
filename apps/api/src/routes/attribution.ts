import { Router, Request, Response } from 'express';
import { ApiClient } from '../services/api-client.service.js';

export function createAttributionRouter(apiClient: ApiClient): Router {
  const router = Router();

  // ========================================
  // TOUCHPOINT ROUTES
  // ========================================

  router.post('/touchpoints', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/touchpoints', req.body);
      res.status(result.statusCode || 201).json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create touchpoint';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINT_CREATE_FAILED', message } });
    }
  });

  router.get('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.get(`/api/v1/attribution/touchpoints/${req.params.id}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get touchpoint';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINT_GET_FAILED', message } });
    }
  });

  router.get('/touchpoints', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/touchpoints?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get touchpoints';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINTS_GET_FAILED', message } });
    }
  });

  router.put('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.put(`/api/v1/attribution/touchpoints/${req.params.id}`, req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update touchpoint';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINT_UPDATE_FAILED', message } });
    }
  });

  router.delete('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      await apiClient.delete(`/api/v1/attribution/touchpoints/${req.params.id}`);
      res.json({ success: true, message: 'Touchpoint deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete touchpoint';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINT_DELETE_FAILED', message } });
    }
  });

  router.get('/leads/:leadId/touchpoints', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.get(`/api/v1/attribution/leads/${req.params.leadId}/touchpoints`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get lead touchpoints';
      res.status(500).json({ success: false, error: { code: 'TOUCHPOINTS_GET_FAILED', message } });
    }
  });

  // ========================================
  // CONVERSION ROUTES
  // ========================================

  router.post('/conversions', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/conversions', req.body);
      res.status(result.statusCode || 201).json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create conversion';
      res.status(500).json({ success: false, error: { code: 'CONVERSION_CREATE_FAILED', message } });
    }
  });

  router.get('/conversions/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.get(`/api/v1/attribution/conversions/${req.params.id}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversion';
      res.status(500).json({ success: false, error: { code: 'CONVERSION_GET_FAILED', message } });
    }
  });

  router.get('/conversions', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/conversions?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversions';
      res.status(500).json({ success: false, error: { code: 'CONVERSIONS_GET_FAILED', message } });
    }
  });

  router.put('/conversions/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.put(`/api/v1/attribution/conversions/${req.params.id}`, req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update conversion';
      res.status(500).json({ success: false, error: { code: 'CONVERSION_UPDATE_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION CALCULATION ROUTES
  // ========================================

  router.post('/attribution/calculate', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/attribution/calculate', req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate attribution';
      res.status(500).json({ success: false, error: { code: 'ATTRIBUTION_CALCULATION_FAILED', message } });
    }
  });

  router.post('/attribution/calculate-and-save', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/attribution/calculate-and-save', req.body);
      res.status(result.statusCode || 201).json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate and save attribution';
      res.status(500).json({ success: false, error: { code: 'ATTRIBUTION_SAVE_FAILED', message } });
    }
  });

  router.post('/attribution/batch', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/attribution/batch', req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process batch attribution';
      res.status(500).json({ success: false, error: { code: 'BATCH_ATTRIBUTION_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION RECORD ROUTES
  // ========================================

  router.get('/attributions/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.get(`/api/v1/attribution/attributions/${req.params.id}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attribution';
      res.status(500).json({ success: false, error: { code: 'ATTRIBUTION_GET_FAILED', message } });
    }
  });

  router.get('/attributions', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/attributions?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attributions';
      res.status(500).json({ success: false, error: { code: 'ATTRIBUTIONS_GET_FAILED', message } });
    }
  });

  router.put('/attributions/:id', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.put(`/api/v1/attribution/attributions/${req.params.id}`, req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update attribution';
      res.status(500).json({ success: false, error: { code: 'ATTRIBUTION_UPDATE_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION REPORTING ROUTES
  // ========================================

  router.get('/reports/attribution', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/reports/attribution?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate attribution report';
      res.status(500).json({ success: false, error: { code: 'REPORT_GENERATION_FAILED', message } });
    }
  });

  router.get('/analytics/attribution', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/analytics/attribution?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attribution analytics';
      res.status(500).json({ success: false, error: { code: 'ANALYTICS_GET_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION MODEL CONFIG ROUTES
  // ========================================

  router.get('/attribution/models/:model/config', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.get(`/api/v1/attribution/attribution/models/${req.params.model}/config`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get model config';
      res.status(500).json({ success: false, error: { code: 'MODEL_CONFIG_GET_FAILED', message } });
    }
  });

  router.post('/attribution/models/config', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/attribution/models/config', req.body);
      res.status(result.statusCode || 201).json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set model config';
      res.status(500).json({ success: false, error: { code: 'MODEL_CONFIG_SET_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION DISPUTE ROUTES
  // ========================================

  router.post('/disputes', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.post('/api/v1/attribution/disputes', req.body);
      res.status(result.statusCode || 201).json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create dispute';
      res.status(500).json({ success: false, error: { code: 'DISPUTE_CREATE_FAILED', message } });
    }
  });

  router.get('/disputes', async (req: Request, res: Response) => {
    try {
      const query = new URLSearchParams(req.query as Record<string, string>).toString();
      const result = await apiClient.get(`/api/v1/attribution/disputes?${query}`);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get disputes';
      res.status(500).json({ success: false, error: { code: 'DISPUTES_GET_FAILED', message } });
    }
  });

  router.put('/disputes/:id/resolve', async (req: Request, res: Response) => {
    try {
      const result = await apiClient.put(`/api/v1/attribution/disputes/${req.params.id}/resolve`, req.body);
      res.json(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve dispute';
      res.status(500).json({ success: false, error: { code: 'DISPUTE_RESOLVE_FAILED', message } });
    }
  });

  return router;
}

export default createAttributionRouter;
