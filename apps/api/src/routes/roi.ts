import { Router } from 'express';
import { ROIAnalyticsService, logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const roiService = new ROIAnalyticsService();

// Get ROI metrics
router.get('/:leadSource', authMiddleware, async (req, res) => {
  try {
    const result = await roiService.calculateROI(req.params.leadSource, {});
    res.json(result);
  } catch (error) {
    logger.error('Error fetching ROI metrics', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue forecast
router.get('/:leadSource/forecast', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const result = await roiService.forecastRevenue(req.params.leadSource, days as 30 | 60 | 90);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching revenue forecast', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payback period
router.get('/:leadSource/payback', authMiddleware, async (req, res) => {
  try {
    const result = await roiService.calculatePaybackPeriod(req.params.leadSource);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching payback period', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get break-even analysis
router.get('/:leadSource/breakeven', authMiddleware, async (req, res) => {
  try {
    const result = await roiService.analyzeBreakEven(req.params.leadSource);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching break-even analysis', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare all sources
router.get('/comparison', authMiddleware, async (req, res) => {
  try {
    const result = await roiService.compareSourcePerformance({});
    res.json(result);
  } catch (error) {
    logger.error('Error fetching source comparison', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cost trends
router.get('/trends/:leadSource', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const result = await roiService.trackAcquisitionCosts(req.params.leadSource, days);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching cost trends', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
