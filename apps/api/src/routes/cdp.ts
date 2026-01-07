import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();

const cdpProxy = createProxyMiddleware({
  target: `http://localhost:${config.ports.dataService}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/cdp': '/api/v1/cdp',
  },
});

router.use('/', cdpProxy);

export default router;
