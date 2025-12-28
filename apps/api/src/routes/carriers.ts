import express from 'express';
import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { createProxyMiddleware } from 'http-proxy-middleware';

const config = getConfig();
const router = express.Router();

// Proxy carrier requests to data service
const carrierProxy = createProxyMiddleware({
  target: `http://localhost:${config.ports.dataService}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/carriers': '/api/v1/carriers',
    '^/api/carriers': '/api/v1/carriers',
  },
  onProxyReq: (proxyReq, req, res) => {
    logger.debug('Proxying carrier request', {
      method: req.method,
      path: req.path,
      target: `http://localhost:${config.ports.dataService}${req.path}`,
    });
  },
  onError: (err, req, res) => {
    logger.error('Carrier proxy error', { error: err, path: req.path });
    res.status(500).json({ error: 'Proxy error' });
  },
});

// Carrier routes
router.post('/', carrierProxy);
router.get('/', carrierProxy);
router.get('/:id', carrierProxy);
router.get('/:id/performance', carrierProxy);
router.put('/:id', carrierProxy);
router.delete('/:id', carrierProxy);
router.post('/:id/performance', carrierProxy);
router.get('/:id/performance/metrics', carrierProxy);
router.put('/:id/performance/metrics/:metricId', carrierProxy);
router.post('/:id/performance/calculate', carrierProxy);
router.get('/top-performing', carrierProxy);
router.get('/needing-attention', carrierProxy);
router.put('/:id/partnership-tier', carrierProxy);
router.put('/:id/partnership-status', carrierProxy);
router.get('/:id/performance/trends', carrierProxy);
router.post('/compare', carrierProxy);

export default router;