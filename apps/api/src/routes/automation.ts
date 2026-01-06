import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  ClaimsAutomationService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Claims Automation Routes - Phase 27.4
 */

// Check auto-approval eligibility
router.get('/:claimId/eligibility', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.query;
    const fraudScore = req.query.fraudScore ? Number(req.query.fraudScore) : 0.2;

    const eligibility = await ClaimsAutomationService.getAutomationEligibility(claimId, claimData as any, fraudScore);

    res.json(eligibility);
  } catch (error) {
    logger.error('Error checking eligibility', { error });
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Auto-approve claim
router.post('/:claimId/auto-approve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;
    const fraudScore = req.body.fraudScore || 0.2;

    logger.info('Auto-approval requested', { claimId });

    const result = await ClaimsAutomationService.autoApproveClaim(claimId, claimData, fraudScore);

    res.json(result);
  } catch (error) {
    logger.error('Error auto-approving claim', { error });
    res.status(500).json({ error: 'Failed to auto-approve claim' });
  }
});

// Auto-route claim
router.post('/:claimId/auto-route', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Auto-routing requested', { claimId });

    const routing = await ClaimsAutomationService.autoRouteClaim(claimId, claimData);

    res.json(routing);
  } catch (error) {
    logger.error('Error auto-routing claim', { error });
    res.status(500).json({ error: 'Failed to auto-route claim' });
  }
});

// Auto-pay claim
router.post('/:claimId/auto-pay', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const { approvedAmount } = req.body;

    logger.info('Auto-payment requested', { claimId, approvedAmount });

    const payment = await ClaimsAutomationService.autoPayClaim(claimId, approvedAmount);

    res.json(payment);
  } catch (error) {
    logger.error('Error auto-paying claim', { error });
    res.status(500).json({ error: 'Failed to auto-pay claim' });
  }
});

// Get eligible claims for automation
router.get('/eligible-claims', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;

    // In production, this would query database for eligible claims
    res.status(501).json({
      error: 'Not implemented - would retrieve eligible claims',
      limit: Number(limit),
    });
  } catch (error) {
    logger.error('Error getting eligible claims', { error });
    res.status(500).json({ error: 'Failed to get eligible claims' });
  }
});

// Apply automation rules
router.post('/:claimId/apply-rules', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Applying automation rules', { claimId });

    const results = await ClaimsAutomationService.applyAutomationRules(claimId, claimData);

    res.json({
      claimId,
      results,
      totalRules: results.length,
      matchedRules: results.filter(r => r.matched).length,
      executedRules: results.filter(r => r.executed).length,
    });
  } catch (error) {
    logger.error('Error applying automation rules', { error });
    res.status(500).json({ error: 'Failed to apply automation rules' });
  }
});

export default router;
