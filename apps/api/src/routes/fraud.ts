import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  FraudDetectionService,
  FraudNetworkAnalysisService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Fraud Detection Routes - Phase 27.4
 */

// Assess fraud risk for a claim
router.post('/assess/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Fraud assessment requested', { claimId });

    const assessment = await FraudDetectionService.assessFraudRisk(claimId, claimData);

    res.json(assessment);
  } catch (error) {
    logger.error('Error assessing fraud risk', { error });
    res.status(500).json({ error: 'Failed to assess fraud risk' });
  }
});

// Get fraud assessment for a claim
router.get('/risk/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;

    // In production, this would query database for stored assessment
    res.status(501).json({ error: 'Not implemented - would retrieve stored fraud assessment' });
  } catch (error) {
    logger.error('Error getting fraud assessment', { error });
    res.status(500).json({ error: 'Failed to get fraud assessment' });
  }
});

// Get fraud explanation
router.get('/explanation/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const assessment = req.body;

    const explanation = await FraudDetectionService.getFraudExplanation(claimId, assessment);

    res.json(explanation);
  } catch (error) {
    logger.error('Error getting fraud explanation', { error });
    res.status(500).json({ error: 'Failed to get fraud explanation' });
  }
});

// Get suspicious claims
router.get('/suspicious-claims', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      minFraudScore: req.query.minFraudScore ? Number(req.query.minFraudScore) : undefined,
      fraudRiskLevel: req.query.fraudRiskLevel as string,
      insuranceType: req.query.insuranceType as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      amountFrom: req.query.amountFrom ? Number(req.query.amountFrom) : undefined,
      amountTo: req.query.amountTo ? Number(req.query.amountTo) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    };

    const suspiciousClaims = await FraudDetectionService.getSuspiciousClaims(filters);

    res.json({
      claims: suspiciousClaims,
      total: suspiciousClaims.length,
    });
  } catch (error) {
    logger.error('Error getting suspicious claims', { error });
    res.status(500).json({ error: 'Failed to get suspicious claims' });
  }
});

// Flag claim for investigation
router.post('/:claimId/flag-investigation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const { reason } = req.body;

    await FraudDetectionService.flagForInvestigation(claimId, reason);

    res.json({ message: 'Claim flagged for investigation' });
  } catch (error) {
    logger.error('Error flagging claim for investigation', { error });
    res.status(500).json({ error: 'Failed to flag claim for investigation' });
  }
});

// Get fraud networks
router.get('/networks', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await FraudNetworkAnalysisService.getNetworkStatistics();

    res.json(statistics);
  } catch (error) {
    logger.error('Error getting fraud networks', { error });
    res.status(500).json({ error: 'Failed to get fraud networks' });
  }
});

// Get network details
router.get('/networks/:networkId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { networkId } = req.params;

    const members = await FraudNetworkAnalysisService.getNetworkMembers(networkId);
    const fraudScore = await FraudNetworkAnalysisService.calculateNetworkFraudScore(networkId);

    res.json({
      networkId,
      members,
      fraudScore,
    });
  } catch (error) {
    logger.error('Error getting network details', { error });
    res.status(500).json({ error: 'Failed to get network details' });
  }
});

// Report fraud network to law enforcement
router.post('/networks/:networkId/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { networkId } = req.params;
    const { details } = req.body;

    const result = await FraudNetworkAnalysisService.reportFraudNetwork(networkId, details);

    res.json(result);
  } catch (error) {
    logger.error('Error reporting fraud network', { error });
    res.status(500).json({ error: 'Failed to report fraud network' });
  }
});

export default router;
