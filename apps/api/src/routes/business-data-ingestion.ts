/**
 * Business Data Ingestion API Routes
 * Proxy routes for business data ingestion functionality
 */

import { Router, Request, Response } from 'express';
import { proxyRequest } from '../utils/proxy';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

// Proxy configuration
const DATA_SERVICE_BASE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

// ========================================
// Business Data Source Management
// ========================================

/**
 * @route GET /api/v1/business-data/sources
 * @desc Get all business data sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/sources`);
  } catch (error) {
    logger.error('Proxy error for business data sources:', error);
    res.status(500).json({ error: 'Failed to fetch business data sources' });
  }
});

/**
 * @route POST /api/v1/business-data/sources
 * @desc Create a new business data source
 */
router.post('/sources', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/sources`);
  } catch (error) {
    logger.error('Proxy error for creating business data source:', error);
    res.status(500).json({ error: 'Failed to create business data source' });
  }
});

/**
 * @route GET /api/v1/business-data/sources/:id
 * @desc Get business data source by ID
 */
router.get('/sources/:id', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/sources/${req.params.id}`);
  } catch (error) {
    logger.error('Proxy error for getting business data source:', error);
    res.status(500).json({ error: 'Failed to fetch business data source' });
  }
});

/**
 * @route PUT /api/v1/business-data/sources/:id
 * @desc Update business data source
 */
router.put('/sources/:id', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/sources/${req.params.id}`);
  } catch (error) {
    logger.error('Proxy error for updating business data source:', error);
    res.status(500).json({ error: 'Failed to update business data source' });
  }
});

/**
 * @route DELETE /api/v1/business-data/sources/:id
 * @desc Delete business data source
 */
router.delete('/sources/:id', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/sources/${req.params.id}`);
  } catch (error) {
    logger.error('Proxy error for deleting business data source:', error);
    res.status(500).json({ error: 'Failed to delete business data source' });
  }
});

// ========================================
// Pipeline Execution
// ========================================

/**
 * @route POST /api/v1/business-data/ingestion/run
 * @desc Trigger manual business data ingestion
 */
router.post('/ingestion/run', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/ingestion/run`);
  } catch (error) {
    logger.error('Proxy error for manual ingestion:', error);
    res.status(500).json({ error: 'Failed to run business data ingestion' });
  }
});

/**
 * @route GET /api/v1/business-data/ingestion/status
 * @desc Get pipeline health and status
 */
router.get('/ingestion/status', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/ingestion/status`);
  } catch (error) {
    logger.error('Proxy error for pipeline status:', error);
    res.status(500).json({ error: 'Failed to get pipeline status' });
  }
});

// ========================================
// Analytics and Reporting
// ========================================

/**
 * @route GET /api/v1/business-data/analytics
 * @desc Get business data analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/analytics`);
  } catch (error) {
    logger.error('Proxy error for analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * @route GET /api/v1/business-data/reports/quality
 * @desc Get data quality report
 */
router.get('/reports/quality', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/reports/quality`);
  } catch (error) {
    logger.error('Proxy error for quality report:', error);
    res.status(500).json({ error: 'Failed to get quality report' });
  }
});

// ========================================
// Configuration Management
// ========================================

/**
 * @route GET /api/v1/business-data/config
 * @desc Get current pipeline configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/config`);
  } catch (error) {
    logger.error('Proxy error for config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

/**
 * @route PUT /api/v1/business-data/config
 * @desc Update pipeline configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/config`);
  } catch (error) {
    logger.error('Proxy error for config update:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ========================================
// Jobs and Processing History
// ========================================

/**
 * @route GET /api/v1/business-data/jobs
 * @desc Get recent processing jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    await proxyRequest(req, res, `${DATA_SERVICE_BASE_URL}/api/v1/business-data/jobs`);
  } catch (error) {
    logger.error('Proxy error for jobs:', error);
    res.status(500).json({ error: 'Failed to get processing jobs' });
  }
});

export default router;