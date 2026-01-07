import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  ClaimsOutcomePredictionService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Claims Outcome Prediction Routes - Phase 27.4
 */

// Predict claim outcome
router.post('/predict/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Claim outcome prediction requested', { claimId });

    const prediction = await ClaimsOutcomePredictionService.predictClaimOutcome(claimId, claimData);

    res.json(prediction);
  } catch (error) {
    logger.error('Error predicting claim outcome', { error });
    res.status(500).json({ error: 'Failed to predict claim outcome' });
  }
});

// Get settlement prediction
router.get('/:claimId/settlement', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const prediction = await ClaimsOutcomePredictionService.predictSettlementAmount(claimData as any);

    res.json(prediction);
  } catch (error) {
    logger.error('Error getting settlement prediction', { error });
    res.status(500).json({ error: 'Failed to get settlement prediction' });
  }
});

// Get resolution time
router.get('/:claimId/resolution-time', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const prediction = await ClaimsOutcomePredictionService.predictResolutionTime(claimId, claimData as any);

    res.json(prediction);
  } catch (error) {
    logger.error('Error getting resolution time', { error });
    res.status(500).json({ error: 'Failed to get resolution time' });
  }
});

// Get litigation risk
router.get('/:claimId/litigation-risk', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const risk = await ClaimsOutcomePredictionService.estimateLitigationRisk(claimId, claimData as any);

    res.json(risk);
  } catch (error) {
    logger.error('Error getting litigation risk', { error });
    res.status(500).json({ error: 'Failed to get litigation risk' });
  }
});

// Get reserve recommendation
router.get('/:claimId/reserve-recommendation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const recommendation = await ClaimsOutcomePredictionService.recommendReserveAmount(claimId, claimData as any);

    res.json(recommendation);
  } catch (error) {
    logger.error('Error getting reserve recommendation', { error });
    res.status(500).json({ error: 'Failed to get reserve recommendation' });
  }
});

// Get prediction accuracy
router.get('/accuracy', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    const accuracy = await ClaimsOutcomePredictionService.getPredictionAccuracy(dateRange);

    res.json(accuracy);
  } catch (error) {
    logger.error('Error getting prediction accuracy', { error });
    res.status(500).json({ error: 'Failed to get prediction accuracy' });
  }
});

export default router;
