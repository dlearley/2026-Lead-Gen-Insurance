/**
 * Advanced Monitoring & Cost Optimization API Routes - Task 10.8
 * Proxy routes to data-service
 */

import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import axios from 'axios';
import { getConfig } from '@insurance-lead-gen/config';

const router = Router();
const config = getConfig();
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}`;

/**
 * Cost Tracking Endpoints
 */

// Record a cost metric
router.post('/costs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/costs`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Failed to record cost metric', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record cost metric',
    });
  }
});

// Get cost report
router.get('/costs/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/costs/report`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get cost report', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost report',
    });
  }
});

// Get cost allocation
router.get('/costs/allocation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/costs/allocation`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get cost allocation', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost allocation',
    });
  }
});

// Get cost forecast
router.get('/costs/forecast/:service', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.params;
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/costs/forecast/${service}`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get cost forecast', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cost forecast',
    });
  }
});

// Get cost anomalies
router.get('/costs/anomalies', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/costs/anomalies`,
      { params: req.query }
    );
    res.json(response.data);
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
router.post('/budgets', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/budgets`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Failed to create budget', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create budget',
    });
  }
});

// Get all budgets
router.get('/budgets', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/budgets`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get budgets', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get budgets',
    });
  }
});

// Update budget
router.patch('/budgets/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const response = await axios.patch(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/budgets/${id}`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to update budget', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update budget',
    });
  }
});

// Delete budget
router.delete('/budgets/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const response = await axios.delete(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/budgets/${id}`
    );
    res.json(response.data);
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
router.get('/optimization/opportunities', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/optimization/opportunities`
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get optimization opportunities', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get optimization opportunities',
    });
  }
});

// Get infrastructure recommendations
router.get('/optimization/infrastructure', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/optimization/infrastructure`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get infrastructure recommendations', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get infrastructure recommendations',
    });
  }
});

// Get observability costs
router.get('/optimization/observability-costs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/optimization/observability-costs`
    );
    res.json(response.data);
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
router.get('/monitoring/health', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/monitoring/health`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get system health', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system health',
    });
  }
});

// Get performance metrics
router.post('/monitoring/metrics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/monitoring/metrics`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get performance metrics', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get performance metrics',
    });
  }
});

// Get resource utilization
router.get('/monitoring/utilization', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/monitoring/utilization`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get resource utilization', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get resource utilization',
    });
  }
});

// Get SLO tracking
router.get('/monitoring/slo/:service', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.params;
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/monitoring/slo/${service}`
    );
    res.json(response.data);
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
router.get('/alerts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/alerts`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get active alerts', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active alerts',
    });
  }
});

// Create alert
router.post('/alerts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/alerts`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Failed to create alert', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alert',
    });
  }
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/alerts/${id}/acknowledge`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    });
  }
});

// Resolve alert
router.post('/alerts/:id/resolve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/alerts/${id}/resolve`
    );
    res.json(response.data);
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
router.get('/autoscaling/events', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/monitoring-cost/autoscaling/events`,
      { params: req.query }
    );
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to get auto-scaling events', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get auto-scaling events',
    });
  }
});

export default router;
