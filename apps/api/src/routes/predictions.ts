import { Router } from 'express';
import { PredictionService, logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const predictionService = new PredictionService();

// Lead conversion prediction
router.post('/lead-conversion/:leadId', authMiddleware, async (req, res) => {
  try {
    const result = await predictionService.predictConversion(req.params.leadId);
    res.json(result);
  } catch (error) {
    logger.error('Error in lead conversion prediction', { error, leadId: req.params.leadId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LTV prediction
router.post('/ltv/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await predictionService.calculateLTV(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error in LTV prediction', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Churn risk score
router.post('/churn-risk/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await predictionService.scoreChurn(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error in churn risk scoring', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ROI forecast
router.post('/roi-forecast/:leadSource', authMiddleware, async (req, res) => {
  try {
    const result = await predictionService.forecastROI(req.params.leadSource, 30);
    res.json(result);
  } catch (error) {
    logger.error('Error in ROI forecast', { error, leadSource: req.params.leadSource });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch prediction status
router.get('/batch', authMiddleware, async (req, res) => {
  res.json({ status: 'completed', total: 150 });
});

// Force refresh expired predictions
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const count = await predictionService.refreshExpiredPredictions();
    res.json({ refreshed: count });
  } catch (error) {
    logger.error('Error refreshing predictions', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
