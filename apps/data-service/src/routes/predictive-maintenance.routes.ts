import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@insurance/core';
import { 
  CalculateHealthScoreRequest, 
  HealthScoreFilterParams, 
  InterventionFilterParams,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  BatchHealthScoreRequest,
} from '@insurance/types';
import { PredictiveMaintenanceService } from '../services/predictive-maintenance-service.js';

const router = Router();
const prisma = new PrismaClient();
const predictiveMaintenanceService = new PredictiveMaintenanceService(prisma);

// ========================================
// HEALTH SCORING ENDPOINTS
// ========================================

/**
 * Calculate health score for a customer
 * POST /api/predictive-maintenance/health-scores/calculate
 */
router.post('/health-scores/calculate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { customerId, forceRecalculate, useAiPrediction, overrideManualScore } = req.body as CalculateHealthScoreRequest;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: { message: 'customerId is required' },
      });
    }

    const result = await predictiveMaintenanceService.calculateHealthScore(customerId, {}, {
      forceRecalculate,
      useAiPrediction,
      overrideManualScore,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error calculating health score:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to calculate health score' },
    });
  }
});

/**
 * Calculate health scores for multiple customers
 * POST /api/predictive-maintenance/health-scores/batch
 */
router.post('/health-scores/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { customerIds, includeHistoricalData, calculateIfMissing } = req.body as BatchHealthScoreRequest;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'customerIds array is required' },
      });
    }

    const result = await predictiveMaintenanceService.calculateBatchHealthScores(customerIds);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error calculating batch health scores:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to calculate batch health scores' },
    });
  }
});

/**
 * Get health score by customer ID
 * GET /api/predictive-maintenance/health-scores/:customerId
 */
router.get('/health-scores/:customerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const healthScore = await predictiveMaintenanceService.getHealthScoreByCustomerId(customerId);

    if (!healthScore) {
      return res.status(404).json({
        success: false,
        error: { message: 'Health score not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: healthScore,
    });
  } catch (error: any) {
    console.error('Error getting health score:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get health score' },
    });
  }
});

/**
 * List health scores with filtering
 * GET /api/predictive-maintenance/health-scores
 */
router.get('/health-scores', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      churnRiskLevels,
      minScore,
      maxScore,
      trending,
      includeCustomerData,
      page = 1,
      limit = 50,
    } = req.query;

    const filter: HealthScoreFilterParams = {
      churnRiskLevels: churnRiskLevels ? (churnRiskLevels as string).split(',') as any : undefined,
      minScore: minScore ? parseInt(minScore as string) : undefined,
      maxScore: maxScore ? parseInt(maxScore as string) : undefined,
      trending: trending ? (trending as string).split(',') as any : undefined,
      includeCustomerData: includeCustomerData === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const result = await predictiveMaintenanceService.listHealthScores(filter);

    res.status(200).json({
      success: true,
      data: result,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 50,
        total: result.total,
      },
    });
  } catch (error: any) {
    console.error('Error listing health scores:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to list health scores' },
    });
  }
});

/**
 * Get health score trend for a customer
 * GET /api/predictive-maintenance/health-scores/:customerId/trend
 */
router.get('/health-scores/:customerId/trend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { daysBack = 90 } = req.query;

    const trend = await predictiveMaintenanceService.getHealthScoreTrend(
      customerId,
      parseInt(daysBack as string)
    );

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    console.error('Error getting health score trend:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get health score trend' },
    });
  }
});

// ========================================
// INTERVENTION ENDPOINTS
// ========================================

/**
 * Create a new intervention
 * POST /api/predictive-maintenance/interventions
 */
router.post('/interventions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = req.body as CreateInterventionRequest;

    if (!request.customerId || !request.healthScoreId || !request.interventionType || !request.triggerSource) {
      return res.status(400).json({
        success: false,
        error: { message: 'customerId, healthScoreId, interventionType, and triggerSource are required' },
      });
    }

    const intervention = await predictiveMaintenanceService.createIntervention(request);

    res.status(201).json({
      success: true,
      data: intervention,
    });
  } catch (error: any) {
    console.error('Error creating intervention:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create intervention' },
    });
  }
});

/**
 * Get intervention by ID
 * GET /api/predictive-maintenance/interventions/:id
 */
router.get('/interventions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const intervention = await predictiveMaintenanceService.getIntervention(id);

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: { message: 'Intervention not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: intervention,
    });
  } catch (error: any) {
    console.error('Error getting intervention:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get intervention' },
    });
  }
});

/**
 * Update intervention
 * PUT /api/predictive-maintenance/interventions/:id
 */
router.put('/interventions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = req.body as UpdateInterventionRequest;

    const intervention = await predictiveMaintenanceService.updateIntervention(id, request);

    res.status(200).json({
      success: true,
      data: intervention,
    });
  } catch (error: any) {
    console.error('Error updating intervention:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update intervention' },
    });
  }
});

/**
 * List interventions with filtering
 * GET /api/predictive-maintenance/interventions
 */
router.get('/interventions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      status,
      priority,
      assignedTo,
      interventionType,
      dueDateFrom,
      dueDateTo,
      outcome,
      page = 1,
      limit = 50,
    } = req.query;

    const filter: InterventionFilterParams = {
      customerId: customerId as string,
      status: status ? (status as string).split(',') as any : undefined,
      priority: priority ? (priority as string).split(',') as any : undefined,
      assignedTo: assignedTo as string,
      interventionType: interventionType ? (interventionType as string).split(',') as any : undefined,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom as string) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo as string) : undefined,
      outcome: outcome ? (outcome as string).split(',') as any : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const result = await predictiveMaintenanceService.listInterventions(filter);

    res.status(200).json({
      success: true,
      data: result.interventions,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 50,
        total: result.total,
      },
    });
  } catch (error: any) {
    console.error('Error listing interventions:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to list interventions' },
    });
  }
});

/**
 * Bulk update interventions
 * PUT /api/predictive-maintenance/interventions/bulk/update
 */
router.put('/interventions/bulk/update', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ids, request } = req.body;

    if (!ids || !Array.isArray(ids) || !request) {
      return res.status(400).json({
        success: false,
        error: { message: 'ids array and request object are required' },
      });
    }

    const result = await predictiveMaintenanceService.bulkUpdateInterventions(ids, request);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error bulk updating interventions:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to bulk update interventions' },
    });
  }
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

/**
 * Get predictive health analytics dashboard data
 * GET /api/predictive-maintenance/analytics
 */
router.get('/analytics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const analytics = await predictiveMaintenanceService.getPredictiveAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error getting predictive analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get predictive analytics' },
    });
  }
});

/**
 * Get risk factor analysis
 * GET /api/predictive-maintenance/analytics/risk-factors
 */
router.get('/analytics/risk-factors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const analysis = await predictiveMaintenanceService.getRiskFactorAnalysis();

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Error getting risk factor analysis:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get risk factor analysis' },
    });
  }
});

export default router;