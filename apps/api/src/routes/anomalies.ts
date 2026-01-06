import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  AnomalyDetectionService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Anomaly Detection Routes - Phase 27.4
 */

// Detect anomalies for a claim
router.post('/detect/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claimData = req.body;

    logger.info('Anomaly detection requested', { claimId });

    const anomalies = await AnomalyDetectionService.detectAnomalies(claimId, claimData);

    res.json({
      claimId,
      anomalies,
      count: anomalies.length,
      severityBreakdown: {
        Critical: anomalies.filter(a => a.severity === 'Critical').length,
        High: anomalies.filter(a => a.severity === 'High').length,
        Medium: anomalies.filter(a => a.severity === 'Medium').length,
        Low: anomalies.filter(a => a.severity === 'Low').length,
      },
    });
  } catch (error) {
    logger.error('Error detecting anomalies', { error });
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Get anomalies for a claim
router.get('/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;

    // In production, this would query database for stored anomalies
    res.status(501).json({ error: 'Not implemented - would retrieve stored anomalies' });
  } catch (error) {
    logger.error('Error getting anomalies', { error });
    res.status(500).json({ error: 'Failed to get anomalies' });
  }
});

// Get anomaly explanation
router.get('/:anomalyId/explanation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { anomalyId } = req.params;
    const anomaly = req.body;

    const explanation = await AnomalyDetectionService.getAnomalyExplanation(anomalyId, anomaly);

    res.json(explanation);
  } catch (error) {
    logger.error('Error getting anomaly explanation', { error });
    res.status(500).json({ error: 'Failed to get anomaly explanation' });
  }
});

// Get anomalies by type
router.get('/by-type/:type', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    // In production, this would query database
    res.status(501).json({
      error: 'Not implemented - would retrieve anomalies by type',
      type,
      limit,
    });
  } catch (error) {
    logger.error('Error getting anomalies by type', { error });
    res.status(500).json({ error: 'Failed to get anomalies by type' });
  }
});

// Mark anomaly as reviewed
router.post('/:anomalyId/review', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { anomalyId } = req.params;
    const { reviewed } = req.body;

    // In production, this would update anomaly record
    res.json({ message: 'Anomaly marked as reviewed', anomalyId, reviewed });
  } catch (error) {
    logger.error('Error marking anomaly as reviewed', { error });
    res.status(500).json({ error: 'Failed to mark anomaly as reviewed' });
  }
});

export default router;
