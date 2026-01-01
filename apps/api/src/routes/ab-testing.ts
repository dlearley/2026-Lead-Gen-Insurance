import express, { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { getABTestingService } from '@insurance-lead-gen/ai-services';

const router = express.Router();
const abTestingService = getABTestingService();

/**
 * GET /api/v1/ab-testing/tests
 * Get all active A/B tests
 */
router.get('/tests', async (req: Request, res: Response) => {
  try {
    const activeTests = abTestingService.getActiveTests();
    
    res.json({
      success: true,
      count: activeTests.length,
      tests: activeTests
    });
  } catch (error) {
    logger.error('Failed to get active tests', { error });
    res.status(500).json({
      error: 'Failed to get active tests',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ab-testing/tests/:testName
 * Get specific A/B test details
 */
router.get('/tests/:testName', async (req: Request, res: Response) => {
  const { testName } = req.params;

  try {
    const summary = abTestingService.getTestSummary(testName);
    
    if (!summary.test) {
      return res.status(404).json({
        error: 'Test not found',
        testName
      });
    }

    res.json({
      success: true,
      test: summary.test,
      assignmentsCount: summary.assignmentsCount
    });
  } catch (error) {
    logger.error('Failed to get test details', { error, testName });
    res.status(500).json({
      error: 'Failed to get test details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ab-testing/tests/:testName/results
 * Get A/B test results and analysis
 */
router.get('/tests/:testName/results', async (req: Request, res: Response) => {
  const { testName } = req.params;

  try {
    const results = await abTestingService.calculateTestResults(testName);
    
    if (!results) {
      return res.status(404).json({
        error: 'Test not found or no results available',
        testName
      });
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Failed to calculate test results', { error, testName });
    res.status(500).json({
      error: 'Failed to calculate test results',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ab-testing/assign/:leadId
 * Assign a lead to a test variant
 */
router.post('/assign/:leadId', async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { testName = 'ml_lead_scoring_v2' } = req.body;

  try {
    const variant = abTestingService.assignLeadToVariant(leadId, testName);
    
    res.json({
      success: true,
      leadId,
      testName,
      variant
    });
  } catch (error) {
    logger.error('Failed to assign lead to variant', { error, leadId, testName });
    res.status(500).json({
      error: 'Failed to assign lead',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/ab-testing/variant/:leadId
 * Get variant assignment for a lead
 */
router.get('/variant/:leadId', async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { testName = 'ml_lead_scoring_v2' } = req.query;

  try {
    const variant = abTestingService.getLeadVariant(leadId, testName as string);
    
    res.json({
      success: true,
      leadId,
      testName,
      variant,
      shouldUseMLScoring: variant === 'treatment'
    });
  } catch (error) {
    logger.error('Failed to get lead variant', { error, leadId, testName });
    res.status(500).json({
      error: 'Failed to get lead variant',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/ab-testing/tests/:testName/stop
 * Stop an active A/B test
 */
router.post('/tests/:testName/stop', async (req: Request, res: Response) => {
  const { testName } = req.params;

  try {
    abTestingService.stopTest(testName);
    
    res.json({
      success: true,
      message: `Test ${testName} stopped successfully`,
      testName
    });
  } catch (error) {
    logger.error('Failed to stop test', { error, testName });
    res.status(500).json({
      error: 'Failed to stop test',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
