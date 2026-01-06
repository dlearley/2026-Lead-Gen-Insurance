import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import {
  ClaimsAnalyticsService,
} from '@insurance-lead-gen/core';

const router = Router();

/**
 * Claims Analytics Routes - Phase 27.4
 */

// Get claims metrics
router.get('/metrics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Claims metrics requested', { dateRange });

    const metrics = await ClaimsAnalyticsService.getClaimsMetrics(dateRange);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting claims metrics', { error });
    res.status(500).json({ error: 'Failed to get claims metrics' });
  }
});

// Get fraud detection rate
router.get('/fraud-detection-rate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };
    const line = req.query.line as string;

    logger.info('Fraud detection rate requested', { dateRange, line });

    const rate = await ClaimsAnalyticsService.getFraudDetectionRate(dateRange, line);

    res.json({
      dateRange,
      insuranceLine: line || 'all',
      fraudDetectionRate: rate,
      fraudCatchRatePercentage: rate * 100,
    });
  } catch (error) {
    logger.error('Error getting fraud detection rate', { error });
    res.status(500).json({ error: 'Failed to get fraud detection rate' });
  }
});

// Get processing time analytics
router.get('/processing-time', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Processing time analytics requested', { dateRange });

    const analytics = await ClaimsAnalyticsService.getProcessingTimeAnalytics(dateRange);

    res.json(analytics);
  } catch (error) {
    logger.error('Error getting processing time analytics', { error });
    res.status(500).json({ error: 'Failed to get processing time analytics' });
  }
});

// Get settlement ratio analysis
router.get('/settlement-ratio', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Settlement ratio analysis requested', { dateRange });

    const analysis = await ClaimsAnalyticsService.getSettlementRatioAnalysis(dateRange);

    res.json(analysis);
  } catch (error) {
    logger.error('Error getting settlement ratio analysis', { error });
    res.status(500).json({ error: 'Failed to get settlement ratio analysis' });
  }
});

// Get subrogation metrics
router.get('/subrogation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Subrogation metrics requested', { dateRange });

    const metrics = await ClaimsAnalyticsService.getSubrogationMetrics(dateRange);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting subrogation metrics', { error });
    res.status(500).json({ error: 'Failed to get subrogation metrics' });
  }
});

// Get litigation statistics
router.get('/litigation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Litigation statistics requested', { dateRange });

    const statistics = await ClaimsAnalyticsService.getLitigationStatistics(dateRange);

    res.json(statistics);
  } catch (error) {
    logger.error('Error getting litigation statistics', { error });
    res.status(500).json({ error: 'Failed to get litigation statistics' });
  }
});

// Identify processing bottlenecks
router.get('/bottlenecks', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Processing bottlenecks requested');

    const bottlenecks = await ClaimsAnalyticsService.identifyBottlenecks();

    res.json({
      bottlenecks,
      total: bottlenecks.length,
      criticalBottlenecks: bottlenecks.filter(b => b.averageDelay > 10).length,
    });
  } catch (error) {
    logger.error('Error identifying bottlenecks', { error });
    res.status(500).json({ error: 'Failed to identify bottlenecks' });
  }
});

// Get claims by queue
router.get('/by-queue/:queueType', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { queueType } = req.params;

    logger.info('Claims by queue requested', { queueType });

    const queue = await ClaimsAnalyticsService.getClaimsByQueue(queueType);

    res.json(queue);
  } catch (error) {
    logger.error('Error getting claims by queue', { error });
    res.status(500).json({ error: 'Failed to get claims by queue' });
  }
});

// Generate analytics report
router.post('/generate-report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end } = req.body;

    const dateRange = {
      start: new Date(start),
      end: new Date(end),
    };

    logger.info('Generating analytics report', { dateRange });

    const report = await ClaimsAnalyticsService.generateAnalyticsReport(dateRange);

    res.json(report);
  } catch (error) {
    logger.error('Error generating analytics report', { error });
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// Get efficiency metrics
router.get('/efficiency', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange = {
      start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: req.query.end ? new Date(req.query.end as string) : new Date(),
    };

    logger.info('Efficiency metrics requested', { dateRange });

    const metrics = await ClaimsAnalyticsService.calculateEfficiencyMetrics(dateRange);

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting efficiency metrics', { error });
    res.status(500).json({ error: 'Failed to get efficiency metrics' });
  }
});

export default router;
