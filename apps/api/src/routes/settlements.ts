import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  SettlementOptimizationService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Settlement Optimization Routes - Phase 27.4
 */

// Get settlement recommendation
router.post('/recommend/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Settlement recommendation requested', { claimId });

    const recommendation = await SettlementOptimizationService.recommendSettlement(claimId, claimData);

    res.json(recommendation);
  } catch (error) {
    logger.error('Error getting settlement recommendation', { error });
    res.status(500).json({ error: 'Failed to get settlement recommendation' });
  }
});

// Get optimal settlement amount
router.get('/:claimId/optimal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const optimalSettlement = await SettlementOptimizationService.calculateOptimalSettlement(claimData as any);

    res.json(optimalSettlement);
  } catch (error) {
    logger.error('Error getting optimal settlement', { error });
    res.status(500).json({ error: 'Failed to get optimal settlement' });
  }
});

// Get negotiation strategy
router.get('/:claimId/strategy', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const strategy = await SettlementOptimizationService.getNegotiationStrategy(claimId, claimData as any);

    res.json(strategy);
  } catch (error) {
    logger.error('Error getting negotiation strategy', { error });
    res.status(500).json({ error: 'Failed to get negotiation strategy' });
  }
});

// Get comparable cases
router.get('/:claimId/comparable-cases', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const comparableCases = await SettlementOptimizationService.getComparableCases(claimId, limit);

    res.json(comparableCases);
  } catch (error) {
    logger.error('Error getting comparable cases', { error });
    res.status(500).json({ error: 'Failed to get comparable cases' });
  }
});

// Get litigation cost estimate
router.get('/:claimId/litigation-costs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const costs = await SettlementOptimizationService.estimateLitigationCosts(claimId, claimData as any);

    res.json(costs);
  } catch (error) {
    logger.error('Error estimating litigation costs', { error });
    res.status(500).json({ error: 'Failed to estimate litigation costs' });
  }
});

// Get subrogation evaluation
router.get('/:claimId/subrogation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const subrogation = await SettlementOptimizationService.evaluateSubrogation(claimId, claimData as any);

    res.json(subrogation);
  } catch (error) {
    logger.error('Error evaluating subrogation', { error });
    res.status(500).json({ error: 'Failed to evaluate subrogation' });
  }
});

// Get settlement justification
router.get('/:claimId/justification', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;

    const justification = await SettlementOptimizationService.getSettlementJustification(claimId, claimData as any);

    res.json(justification);
  } catch (error) {
    logger.error('Error getting settlement justification', { error });
    res.status(500).json({ error: 'Failed to get settlement justification' });
  }
});

export default router;
