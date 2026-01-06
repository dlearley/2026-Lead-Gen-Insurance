import { Router } from 'express';
import { ChurnPredictionService, logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const churnService = new ChurnPredictionService();

// Get churn risk score
router.get('/risk/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await churnService.scoreChurnRisk(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching churn risk', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all at-risk customers
router.get('/at-risk', authMiddleware, async (req, res) => {
  try {
    const riskLevel = (req.query.riskLevel as 'High' | 'Medium') || 'High';
    const result = await churnService.getAtRiskCustomers(riskLevel);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching at-risk customers', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get contributing factors
router.get('/factors/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await churnService.getChurnFactors(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching churn factors', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get intervention recommendation
router.post('/intervention/:customerId', authMiddleware, async (req, res) => {
  try {
    const result = await churnService.recommendIntervention(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching intervention recommendation', { error, customerId: req.params.customerId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get retention campaign targets
router.get('/retention-targets', authMiddleware, async (req, res) => {
  try {
    const campaignType = (req.query.campaignType as string) || 'general';
    const result = await churnService.getRetentionTargets(campaignType);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching retention targets', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
