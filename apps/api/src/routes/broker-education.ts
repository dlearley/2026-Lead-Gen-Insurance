import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3002';

// Proxy all broker education requests to data service
const brokerEducationProxy = createProxyMiddleware({
  target: DATA_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/broker-education': '/api/v1/broker-education',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward any custom headers
    if (req.headers['user-id']) {
      proxyReq.setHeader('user-id', req.headers['user-id'] as string);
    }
  },
  onError: (err, req, res) => {
    console.error('Broker education proxy error:', err);
    res.status(500).json({ error: 'Failed to connect to data service' });
  },
});

router.use('/', brokerEducationProxy);

export default router;
