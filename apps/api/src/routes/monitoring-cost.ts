/**
 * Advanced Monitoring & Cost Optimization API Routes - Task 10.8
 * Proxy routes to data-service
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const config = getConfig();
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}`;

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(path, DATA_SERVICE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function proxyJson(
  req: Request,
  res: Response,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    path: string;
    query?: Record<string, unknown>;
    body?: unknown;
  }
): Promise<void> {
  const url = buildUrl(options.path, options.query);

  const response = await fetch(url, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);
  res.status(response.status).json(data);
}

/**
 * Cost Tracking
 */
router.post('/costs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: '/api/v1/monitoring-cost/costs',
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to record cost metric', { error });
    res.status(500).json({ success: false, error: 'Failed to record cost metric' });
  }
});

router.get('/costs/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/costs/report',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get cost report', { error });
    res.status(500).json({ success: false, error: 'Failed to get cost report' });
  }
});

router.get('/costs/allocation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/costs/allocation',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get cost allocation', { error });
    res.status(500).json({ success: false, error: 'Failed to get cost allocation' });
  }
});

router.get('/costs/forecast/:service', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: `/api/v1/monitoring-cost/costs/forecast/${encodeURIComponent(req.params.service)}`,
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get cost forecast', { error });
    res.status(500).json({ success: false, error: 'Failed to get cost forecast' });
  }
});

router.get('/costs/anomalies', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/costs/anomalies',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get cost anomalies', { error });
    res.status(500).json({ success: false, error: 'Failed to get cost anomalies' });
  }
});

/**
 * Budgets
 */
router.post('/budgets', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: '/api/v1/monitoring-cost/budgets',
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to create budget', { error });
    res.status(500).json({ success: false, error: 'Failed to create budget' });
  }
});

router.get('/budgets', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/budgets',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get budgets', { error });
    res.status(500).json({ success: false, error: 'Failed to get budgets' });
  }
});

router.patch('/budgets/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'PATCH',
      path: `/api/v1/monitoring-cost/budgets/${encodeURIComponent(req.params.id)}`,
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to update budget', { error });
    res.status(500).json({ success: false, error: 'Failed to update budget' });
  }
});

router.delete('/budgets/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'DELETE',
      path: `/api/v1/monitoring-cost/budgets/${encodeURIComponent(req.params.id)}`,
    });
  } catch (error) {
    logger.error('Failed to delete budget', { error });
    res.status(500).json({ success: false, error: 'Failed to delete budget' });
  }
});

/**
 * Optimization
 */
router.get('/optimization/opportunities', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/optimization/opportunities',
    });
  } catch (error) {
    logger.error('Failed to get optimization opportunities', { error });
    res.status(500).json({ success: false, error: 'Failed to get optimization opportunities' });
  }
});

router.get('/optimization/infrastructure', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/optimization/infrastructure',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get infrastructure recommendations', { error });
    res.status(500).json({ success: false, error: 'Failed to get infrastructure recommendations' });
  }
});

router.get('/optimization/observability-costs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/optimization/observability-costs',
    });
  } catch (error) {
    logger.error('Failed to get observability costs', { error });
    res.status(500).json({ success: false, error: 'Failed to get observability costs' });
  }
});

/**
 * Monitoring
 */
router.get('/monitoring/health', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/monitoring/health',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get system health', { error });
    res.status(500).json({ success: false, error: 'Failed to get system health' });
  }
});

router.post('/monitoring/metrics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: '/api/v1/monitoring-cost/monitoring/metrics',
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', { error });
    res.status(500).json({ success: false, error: 'Failed to get performance metrics' });
  }
});

router.get('/monitoring/utilization', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/monitoring/utilization',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get resource utilization', { error });
    res.status(500).json({ success: false, error: 'Failed to get resource utilization' });
  }
});

router.get('/monitoring/slo/:service', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: `/api/v1/monitoring-cost/monitoring/slo/${encodeURIComponent(req.params.service)}`,
    });
  } catch (error) {
    logger.error('Failed to get SLO tracking', { error });
    res.status(500).json({ success: false, error: 'Failed to get SLO tracking' });
  }
});

/**
 * Alerts
 */
router.get('/alerts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/alerts',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get active alerts', { error });
    res.status(500).json({ success: false, error: 'Failed to get active alerts' });
  }
});

router.post('/alerts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: '/api/v1/monitoring-cost/alerts',
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to create alert', { error });
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

router.post('/alerts/:id/acknowledge', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: `/api/v1/monitoring-cost/alerts/${encodeURIComponent(req.params.id)}/acknowledge`,
      body: req.body,
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

router.post('/alerts/:id/resolve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'POST',
      path: `/api/v1/monitoring-cost/alerts/${encodeURIComponent(req.params.id)}/resolve`,
    });
  } catch (error) {
    logger.error('Failed to resolve alert', { error });
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
});

/**
 * Auto-scaling
 */
router.get('/autoscaling/events', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await proxyJson(req, res, {
      method: 'GET',
      path: '/api/v1/monitoring-cost/autoscaling/events',
      query: req.query as Record<string, unknown>,
    });
  } catch (error) {
    logger.error('Failed to get auto-scaling events', { error });
    res.status(500).json({ success: false, error: 'Failed to get auto-scaling events' });
  }
});

export default router;
