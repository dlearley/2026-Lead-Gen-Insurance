import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getConfig } from '@insurance-lead-gen/config';

const config = getConfig();
const router = Router();

const apiProxy = createProxyMiddleware({
  target: `http://localhost:${config.ports.dataService}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/rtc-signal': '/api/v1/rtc-signal',
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  },
});

router.use(apiProxy);

export default router;