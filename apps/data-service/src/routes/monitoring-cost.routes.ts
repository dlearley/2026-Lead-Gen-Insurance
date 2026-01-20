/**
 * Advanced Monitoring & Cost Optimization Routes - Task 10.8
 */

import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { advancedMonitoringCostService } from '../services/advanced-monitoring-cost.service.js';
import type {
  CreateCostMetricDTO,
  CreateBudgetDTO,
  CostReportFilters,
  MonitoringQuery,
} from '@insurance-lead-gen/types';

const router = Router();

/**
 * Cost Tracking Endpoints
 */

// Record a cost metric
router.post('/costs', async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateCostMetricDTO = req.body;
    const metric = await advancedMonitoringCostService.recordCostMetric(dto);
    
    res.status(201).json({
      success: true,
      data: metric,
    });
  } catch (error) {
    logger.error('Failed to record cost metric', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record cost metric',
    });
  }
});

// Get cost report
router.get('/costs/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: CostReportFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      services: req.query.services ? (req.query.services as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      minCost: req.query.minCost ? Number(req.query.minCost) : undefined,
      maxCost: req.query.maxCost ? Number(req.query.maxCost) : undefined,
    };
    
    const report = await advancedMonitoringCostService.getCostReport(filters);
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Failed to generate cost report', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cost report',
    });
  }
});

// Get cost allocation
router.get('/costs/allocation', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();
    
    const allocation = await advancedMonitoringCostService.getCostAllocation({
      start: startDate,
      end: endDate,
    });
    
    res.json({
      success: true,
      data: allocation,
    });
  } catch (error) {
    logger.error('Failed to get cost allocation', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost allocation',
    });
  }
});

// Get cost forecast
router.get('/costs/forecast/:service', async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.params;
    const days = req.query.days ? Number(req.query.days) : 30;
    
    const forecast = await advancedMonitoringCostService.getCostForecast(service, days);
    
    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error('Failed to get cost forecast', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost forecast',
    });
  }
});

// Get cost anomalies
router.get('/costs/anomalies', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const severity = req.query.severity as 'low' | 'medium' | 'high' | undefined;
    
    const anomalies = await advancedMonitoringCostService.getCostAnomalies(service, severity);
    
    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length,
    });
  } catch (error) {
    logger.error('Failed to get cost anomalies', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost anomalies',
    });
  }
});

/**
 * Budget Management Endpoints
 */

// Create budget
router.post('/budgets', async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateBudgetDTO = req.body;
    const budget = await advancedMonitoringCostService.createBudget(dto);
    
    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    logger.error('Failed to create budget', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create budget',
    });
  }
});

// Get all budgets
router.get('/budgets', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      service: req.query.service as string | undefined,
      category: req.query.category as string | undefined,
    };
    
    const budgets = await advancedMonitoringCostService.getBudgets(filters);
    
    res.json({
      success: true,
      data: budgets,
      count: budgets.length,
    });
  } catch (error) {
    logger.error('Failed to get budgets', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get budgets',
    });
  }
});

// Update budget
router.patch('/budgets/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const budget = await advancedMonitoringCostService.updateBudget(id, updates);
    
    res.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    logger.error('Failed to update budget', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update budget',
    });
  }
});

// Delete budget
router.delete('/budgets/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await advancedMonitoringCostService.deleteBudget(id);
    
    res.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete budget', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete budget',
    });
  }
});

/**
 * Optimization Endpoints
 */

// Get optimization opportunities
router.get('/optimization/opportunities', async (req: Request, res: Response): Promise<void> => {
  try {
    const opportunities = await advancedMonitoringCostService.getOptimizationOpportunities();
    
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      totalPotentialSavings: opportunities.reduce((sum, o) => sum + o.potentialSavings, 0),
    });
  } catch (error) {
    logger.error('Failed to get optimization opportunities', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get optimization opportunities',
    });
  }
});

// Get infrastructure recommendations
router.get('/optimization/infrastructure', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const recommendations = await advancedMonitoringCostService.getInfrastructureRecommendations(service);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error('Failed to get infrastructure recommendations', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get infrastructure recommendations',
    });
  }
});

// Get observability costs
router.get('/optimization/observability-costs', async (req: Request, res: Response): Promise<void> => {
  try {
    const costs = await advancedMonitoringCostService.getObservabilityCosts();
    
    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    logger.error('Failed to get observability costs', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get observability costs',
    });
  }
});

/**
 * Monitoring Endpoints
 */

// Get system health
router.get('/monitoring/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const health = await advancedMonitoringCostService.getSystemHealth(service);
    
    res.json({
      success: true,
      data: health,
      count: health.length,
    });
  } catch (error) {
    logger.error('Failed to get system health', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system health',
    });
  }
});

// Get performance metrics
router.post('/monitoring/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const query: MonitoringQuery = req.body;
    const metrics = await advancedMonitoringCostService.getPerformanceMetrics(query);
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get performance metrics',
    });
  }
});

// Get resource utilization
router.get('/monitoring/utilization', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const utilization = await advancedMonitoringCostService.getResourceUtilization(service);
    
    res.json({
      success: true,
      data: utilization,
      count: utilization.length,
    });
  } catch (error) {
    logger.error('Failed to get resource utilization', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get resource utilization',
    });
  }
});

// Get SLO tracking
router.get('/monitoring/slo/:service', async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.params;
    const slo = await advancedMonitoringCostService.getSLOTracking(service);
    
    res.json({
      success: true,
      data: slo,
    });
  } catch (error) {
    logger.error('Failed to get SLO tracking', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get SLO tracking',
    });
  }
});

/**
 * Alert Endpoints
 */

// Get active alerts
router.get('/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const alerts = await advancedMonitoringCostService.getActiveAlerts(service);
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Failed to get active alerts', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active alerts',
    });
  }
});

// Create alert
router.post('/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const alertData = req.body;
    const alert = await advancedMonitoringCostService.createAlert(alertData);
    
    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Failed to create alert', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alert',
    });
  }
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;
    
    const alert = await advancedMonitoringCostService.acknowledgeAlert(id, acknowledgedBy);
    
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    });
  }
});

// Resolve alert
router.post('/alerts/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const alert = await advancedMonitoringCostService.resolveAlert(id);
    
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Failed to resolve alert', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve alert',
    });
  }
});

/**
 * Auto-scaling Events
 */

// Get auto-scaling events
router.get('/autoscaling/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = req.query.service as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    
    const events = await advancedMonitoringCostService.getAutoScalingEvents(service, limit);
    
    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    logger.error('Failed to get auto-scaling events', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get auto-scaling events',
    });
  }
});

export { router as monitoringCostRouter };
