import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  InvestigationRecommendationService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Investigation Routes - Phase 27.4
 */

// Get investigation recommendations
router.post('/:claimId/recommend', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const { fraudScore } = req.body;

    logger.info('Investigation recommendations requested', { claimId });

    const recommendations = await InvestigationRecommendationService.getInvestigationRecommendations(claimId, fraudScore || 0);

    res.json({
      claimId,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error('Error getting investigation recommendations', { error });
    res.status(500).json({ error: 'Failed to get investigation recommendations' });
  }
});

// Get investigation queue
router.get('/queue', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const claims = req.body.claims || [];

    logger.info('Investigation queue requested', { count: claims.length });

    const prioritized = await InvestigationRecommendationService.prioritizeInvestigations(claims);

    res.json({
      queue: prioritized,
      total: prioritized.length,
      highPriority: prioritized.filter(p => p.priority > 70).length,
      mediumPriority: prioritized.filter(p => p.priority >= 40 && p.priority <= 70).length,
      lowPriority: prioritized.filter(p => p.priority < 40).length,
    });
  } catch (error) {
    logger.error('Error getting investigation queue', { error });
    res.status(500).json({ error: 'Failed to get investigation queue' });
  }
});

// Create investigation
router.post('/:claimId/create', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const { fraudScore, claimData } = req.body;

    logger.info('Creating investigation', { claimId });

    const investigationType = await InvestigationRecommendationService.recommendInvestigationType(claimId, claimData, fraudScore || 0);
    const assignment = await InvestigationRecommendationService.assignInvestigator(claimId, investigationType.type);

    res.json({
      claimId,
      investigationId: assignment.investigationId,
      investigationType: investigationType.type,
      investigator: {
        id: assignment.investigatorId,
        name: assignment.investigatorName,
      },
      dueDate: assignment.dueDate,
      specialization: assignment.specialization,
    });
  } catch (error) {
    logger.error('Error creating investigation', { error });
    res.status(500).json({ error: 'Failed to create investigation' });
  }
});

// Update investigation status
router.put('/:investigationId/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { investigationId } = req.params;
    const { status, notes } = req.body;

    await InvestigationRecommendationService.updateInvestigationStatus(investigationId, status, notes);

    res.json({
      investigationId,
      status,
      message: 'Investigation status updated',
    });
  } catch (error) {
    logger.error('Error updating investigation status', { error });
    res.status(500).json({ error: 'Failed to update investigation status' });
  }
});

// Get investigation results
router.get('/:investigationId/results', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { investigationId } = req.params;

    logger.info('Getting investigation results', { investigationId });

    const results = await InvestigationRecommendationService.getInvestigationResults(investigationId);

    res.json(results);
  } catch (error) {
    logger.error('Error getting investigation results', { error });
    res.status(500).json({ error: 'Failed to get investigation results' });
  }
});

// Close investigation
router.post('/:investigationId/close', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { investigationId } = req.params;
    const { findings, fraudConfirmed } = req.body;

    logger.info('Closing investigation', { investigationId, fraudConfirmed });

    await InvestigationRecommendationService.closeInvestigation(investigationId, findings, fraudConfirmed);

    res.json({
      investigationId,
      message: 'Investigation closed',
      fraudConfirmed,
    });
  } catch (error) {
    logger.error('Error closing investigation', { error });
    res.status(500).json({ error: 'Failed to close investigation' });
  }
});

// Get investigation metrics
router.get('/metrics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    const metrics = await InvestigationRecommendationService.getInvestigationMetrics(dateRange);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting investigation metrics', { error });
    res.status(500).json({ error: 'Failed to get investigation metrics' });
  }
});

export default router;
