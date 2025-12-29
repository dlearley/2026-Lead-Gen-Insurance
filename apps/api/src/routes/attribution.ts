// Attribution API Routes - Proxy to Data Service

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getConfig } from '@insurance-lead-gen/config';

const config = getConfig();
const router = express.Router();

// Proxy to data service for attribution endpoints
const dataServiceProxy = createProxyMiddleware({
  target: `http://localhost:${config.ports.dataService}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/attribution': '/api/v1/attribution',
  },
});

// Marketing Sources
router.post('/sources', dataServiceProxy);
router.get('/sources/:id', dataServiceProxy);
router.put('/sources/:id', dataServiceProxy);
router.get('/sources', dataServiceProxy);
router.delete('/sources/:id', dataServiceProxy);
router.get('/sources/:id/metrics', dataServiceProxy);

// Campaigns
router.post('/campaigns', dataServiceProxy);
router.get('/campaigns/:id', dataServiceProxy);
router.put('/campaigns/:id', dataServiceProxy);
router.get('/campaigns', dataServiceProxy);
router.delete('/campaigns/:id', dataServiceProxy);
router.get('/campaigns/:id/metrics', dataServiceProxy);
router.get('/campaigns/:id/roi', dataServiceProxy);

// Attributions
router.post('/attributions', dataServiceProxy);
router.get('/attributions/:id', dataServiceProxy);
router.put('/attributions/:id', dataServiceProxy);
router.get('/attributions', dataServiceProxy);
router.delete('/attributions/:id', dataServiceProxy);

// Analytics & Reporting
router.get('/analytics', dataServiceProxy);
router.post('/reports', dataServiceProxy);

export default router;