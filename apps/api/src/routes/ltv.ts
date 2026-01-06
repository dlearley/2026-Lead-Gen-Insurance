import { Router } from 'express';
import { LTVSegmentationService, logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const ltvService = new LTVSegmentationService();

// Get customer LTV segment
router.get('/segments/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await ltvService.getCustomerSegment(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching LTV segment', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update all LTV segments
router.post('/segments/update', authMiddleware, async (req, res) => {
  try {
    const count = await ltvService.updateLTVSegments();
    res.json({ updated: count });
  } catch (error) {
    logger.error('Error updating LTV segments', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get high-value customers
router.get('/top-customers', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const result = await ltvService.getTopValueCustomers(limit);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching top customers', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get segment analytics
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const result = await ltvService.getSegmentAnalytics();
    res.json(result);
  } catch (error) {
    logger.error('Error fetching segment analytics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get LTV segment trends
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const result = await ltvService.getSegmentTrends(days);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching segment trends', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
