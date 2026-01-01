import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { customerSuccessService } from '../services/customer-success.js';

const router = Router();

// ========================================
// Validation Schemas
// ========================================

const createCustomerSchema = z.object({
  leadId: z.string().uuid().optional(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  website: z.string().url().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  tier: z.enum(['ENTERPRISE', 'MID_MARKET', 'SMALL_BUSINESS', 'TRIAL']).optional(),
  contractStartDate: z.coerce.date(),
  contractEndDate: z.coerce.date().optional(),
  annualContractValue: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  website: z.string().url().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  tier: z.enum(['ENTERPRISE', 'MID_MARKET', 'SMALL_BUSINESS', 'TRIAL']).optional(),
  status: z.enum(['ACTIVE', 'ONBOARDING', 'AT_RISK', 'CHURNED', 'PAUSED']).optional(),
  contractEndDate: z.coerce.date().optional(),
  annualContractValue: z.number().positive().optional(),
  totalPolicies: z.number().int().nonnegative().optional(),
  activePolicies: z.number().int().nonnegative().optional(),
  lifetimeValue: z.number().nonnegative().optional(),
  healthScore: z.number().int().min(0).max(100).optional(),
  churnRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  lastContactDate: z.coerce.date().optional(),
  nextRenewalDate: z.coerce.date().optional(),
  preferredContactMethod: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const createSuccessPlanSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  planType: z.enum(['ONBOARDING', 'QUARTERLY', 'ANNUAL', 'EXPANSION', 'RECOVERY']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  businessObjectives: z.array(z.string()),
  successMetrics: z.record(z.any()).optional(),
  baselineValue: z.record(z.any()).optional(),
  stakeholders: z.record(z.any()).optional(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.coerce.date(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
    owner: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    deliverables: z.array(z.string()),
  })).optional(),
  notes: z.string().optional(),
});

const createHealthScoreSchema = z.object({
  customerId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  engagementScore: z.number().int().min(0).max(100).optional(),
  successScore: z.number().int().min(0).max(100).optional(),
  satisfactionScore: z.number().int().min(0).max(100).optional(),
  financialScore: z.number().int().min(0).max(100).optional(),
  factors: z.record(z.any()).optional(),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});

const createBusinessReviewSchema = z.object({
  customerId: z.string().uuid(),
  reviewType: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EXECUTIVE', 'STRATEGIC']),
  reviewDate: z.coerce.date(),
  attendeeNames: z.array(z.string()),
  attendeeTitles: z.array(z.string()),
  agenda: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional(),
  metricsReview: z.record(z.any()).optional(),
  goalsProgress: z.record(z.any()).optional(),
  decisions: z.array(z.string()).optional(),
  actionItems: z.record(z.any()).optional(),
  nextSteps: z.array(z.string()).optional(),
  overallRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
  presentationUrl: z.string().url().optional(),
  notes: z.string().optional(),
  followUpDate: z.coerce.date().optional(),
});

const createAdvocacyActivitySchema = z.object({
  customerId: z.string().uuid(),
  activityType: z.enum(['CASE_STUDY', 'TESTIMONIAL', 'REFERENCE_CALL', 'SPEAKER_EVENT', 'PRESS_RELEASE', 'WEBINAR', 'USER_GROUP', 'ADVISORY_BOARD']),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELLED']).optional(),
  date: z.coerce.date().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  outcome: z.string().optional(),
  value: z.string().optional(),
  caseStudyUrl: z.string().url().optional(),
  testimonialUrl: z.string().url().optional(),
  referenceNotes: z.string().optional(),
});

const customerFilterSchema = z.object({
  tier: z.enum(['ENTERPRISE', 'MID_MARKET', 'SMALL_BUSINESS', 'TRIAL']).optional(),
  status: z.enum(['ACTIVE', 'ONBOARDING', 'AT_RISK', 'CHURNED', 'PAUSED']).optional(),
  healthScoreMin: z.number().int().min(0).max(100).optional(),
  healthScoreMax: z.number().int().min(0).max(100).optional(),
  churnRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  csmId: z.string().uuid().optional(),
  onboardingStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
  search: z.string().optional(),
  customerSinceFrom: z.coerce.date().optional(),
  customerSinceTo: z.coerce.date().optional(),
  contractRenewalFrom: z.coerce.date().optional(),
  contractRenewalTo: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// Customer Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers
 * Get all customers with optional filters
 */
router.get('/customers', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = customerFilterSchema.parse(req.query);
    const result = await customerSuccessService.getCustomers(filters);

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching customers', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers',
    });
  }
});

/**
 * GET /api/v1/customer-success/customers/:id
 * Get customer by ID
 */
router.get('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await customerSuccessService.getCustomerById(id);

    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
      return;
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error('Error fetching customer', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers
 * Create a new customer
 */
router.post('/customers', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerSuccessService.createCustomer(data);

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error('Error creating customer', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    });
  }
});

/**
 * PUT /api/v1/customer-success/customers/:id
 * Update customer
 */
router.put('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerSuccessService.updateCustomer(id, data);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error('Error updating customer', { error, customerId: req.params.id });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer',
    });
  }
});

/**
 * DELETE /api/v1/customer-success/customers/:id
 * Delete customer (soft delete)
 */
router.delete('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await customerSuccessService.deleteCustomer(id);

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting customer', { error, customerId: req.params.id });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete customer',
    });
  }
});

// ========================================
// Customer Success Profile Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers/:id/profile
 * Get customer success profile
 */
router.get('/customers/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await customerSuccessService.getCustomerSuccessProfile(id);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Customer success profile not found',
      });
      return;
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Error fetching customer success profile', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    });
  }
});

/**
 * PUT /api/v1/customer-success/customers/:id/profile
 * Update customer success profile
 */
router.put('/customers/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await customerSuccessService.updateCustomerSuccessProfile(id, req.body);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Error updating customer success profile', { error, customerId: req.params.id });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    });
  }
});

// ========================================
// Health Score Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers/:id/health-scores
 * Get health score history for customer
 */
router.get('/customers/:id/health-scores', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    const healthScores = await customerSuccessService.getCustomerHealthScores(id, Number(limit));

    res.json({
      success: true,
      data: healthScores,
    });
  } catch (error) {
    logger.error('Error fetching health scores', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health scores',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers/:id/health-scores
 * Create a new health score entry
 */
router.post('/customers/:id/health-scores', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const data = createHealthScoreSchema.parse({ ...req.body, customerId });
    const healthScore = await customerSuccessService.createHealthScore(data);

    res.status(201).json({
      success: true,
      data: healthScore,
    });
  } catch (error) {
    logger.error('Error creating health score', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create health score',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers/:id/health-scores/calculate
 * Calculate health score from component scores
 */
router.post('/customers/:id/health-scores/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const { engagementScore, successScore, satisfactionScore, financialScore } = req.body;

    const result = await customerSuccessService.calculateHealthScore({
      customerId,
      engagementScore,
      successScore,
      satisfactionScore,
      financialScore,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error calculating health score', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate health score',
    });
  }
});

// ========================================
// Success Plan Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers/:id/success-plans
 * Get success plans for customer
 */
router.get('/customers/:id/success-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const successPlans = await customerSuccessService.getCustomerSuccessPlans(id);

    res.json({
      success: true,
      data: successPlans,
    });
  } catch (error) {
    logger.error('Error fetching success plans', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch success plans',
    });
  }
});

/**
 * GET /api/v1/customer-success/success-plans/:planId
 * Get success plan by ID
 */
router.get('/success-plans/:planId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    const successPlan = await customerSuccessService.getSuccessPlanById(planId);

    if (!successPlan) {
      res.status(404).json({
        success: false,
        error: 'Success plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: successPlan,
    });
  } catch (error) {
    logger.error('Error fetching success plan', { error, successPlanId: req.params.planId });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch success plan',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers/:id/success-plans
 * Create a new success plan
 */
router.post('/customers/:id/success-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const data = createSuccessPlanSchema.parse({ ...req.body, customerId });
    const successPlan = await customerSuccessService.createSuccessPlan(data);

    res.status(201).json({
      success: true,
      data: successPlan,
    });
  } catch (error) {
    logger.error('Error creating success plan', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create success plan',
    });
  }
});

/**
 * PUT /api/v1/customer-success/success-plans/:planId
 * Update success plan
 */
router.put('/success-plans/:planId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    const successPlan = await customerSuccessService.updateSuccessPlan(planId, req.body);

    res.json({
      success: true,
      data: successPlan,
    });
  } catch (error) {
    logger.error('Error updating success plan', { error, successPlanId: req.params.planId });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update success plan',
    });
  }
});

/**
 * POST /api/v1/customer-success/success-plans/:planId/milestones
 * Add milestone to success plan
 */
router.post('/success-plans/:planId/milestones', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    const milestone = await customerSuccessService.addMilestone(planId, req.body);

    res.status(201).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    logger.error('Error adding milestone', { error, successPlanId: req.params.planId });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add milestone',
    });
  }
});

/**
 * PUT /api/v1/customer-success/success-plans/:planId/milestones/:milestoneId
 * Update milestone
 */
router.put('/success-plans/:planId/milestones/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId, milestoneId } = req.params;
    const milestone = await customerSuccessService.updateMilestone(milestoneId, req.body);

    res.json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    logger.error('Error updating milestone', { error, milestoneId: req.params.milestoneId });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update milestone',
    });
  }
});

// ========================================
// Business Review Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers/:id/business-reviews
 * Get business reviews for customer
 */
router.get('/customers/:id/business-reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewType } = req.query;
    const businessReviews = await customerSuccessService.getCustomerBusinessReviews(id, reviewType as string);

    res.json({
      success: true,
      data: businessReviews,
    });
  } catch (error) {
    logger.error('Error fetching business reviews', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch business reviews',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers/:id/business-reviews
 * Create a new business review
 */
router.post('/customers/:id/business-reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const data = createBusinessReviewSchema.parse({ ...req.body, customerId });
    const businessReview = await customerSuccessService.createBusinessReview(data);

    res.status(201).json({
      success: true,
      data: businessReview,
    });
  } catch (error) {
    logger.error('Error creating business review', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create business review',
    });
  }
});

/**
 * PUT /api/v1/customer-success/business-reviews/:reviewId
 * Update business review
 */
router.put('/business-reviews/:reviewId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const businessReview = await customerSuccessService.updateBusinessReview(reviewId, req.body);

    res.json({
      success: true,
      data: businessReview,
    });
  } catch (error) {
    logger.error('Error updating business review', { error, reviewId: req.params.reviewId });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update business review',
    });
  }
});

// ========================================
// Advocacy Routes
// ========================================

/**
 * GET /api/v1/customer-success/customers/:id/advocacy-activities
 * Get advocacy activities for customer
 */
router.get('/customers/:id/advocacy-activities', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { activityType, status } = req.query;
    const activities = await customerSuccessService.getCustomerAdvocacyActivities(
      id,
      activityType as string,
      status as string
    );

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    logger.error('Error fetching advocacy activities', { error, customerId: req.params.id });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch advocacy activities',
    });
  }
});

/**
 * POST /api/v1/customer-success/customers/:id/advocacy-activities
 * Create a new advocacy activity
 */
router.post('/customers/:id/advocacy-activities', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const data = createAdvocacyActivitySchema.parse({ ...req.body, customerId });
    const activity = await customerSuccessService.createAdvocacyActivity(data);

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error('Error creating advocacy activity', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create advocacy activity',
    });
  }
});

/**
 * PUT /api/v1/customer-success/advocacy-activities/:activityId
 * Update advocacy activity
 */
router.put('/advocacy-activities/:activityId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { activityId } = req.params;
    const activity = await customerSuccessService.updateAdvocacyActivity(activityId, req.body);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error('Error updating advocacy activity', { error, activityId: req.params.activityId });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update advocacy activity',
    });
  }
});

// ========================================
// Statistics & Analytics Routes
// ========================================

/**
 * GET /api/v1/customer-success/statistics
 * Get customer success statistics
 */
router.get('/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await customerSuccessService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Error fetching statistics', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    });
  }
});

/**
 * GET /api/v1/customer-success/onboarding-metrics
 * Get onboarding metrics
 */
router.get('/onboarding-metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await customerSuccessService.getOnboardingMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching onboarding metrics', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch onboarding metrics',
    });
  }
});

/**
 * GET /api/v1/customer-success/advocacy-metrics
 * Get advocacy metrics
 */
router.get('/advocacy-metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await customerSuccessService.getAdvocacyMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching advocacy metrics', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch advocacy metrics',
    });
  }
});

/**
 * GET /api/v1/customer-success/expansion-opportunities
 * Get expansion opportunities
 */
router.get('/expansion-opportunities', async (req: Request, res: Response): Promise<void> => {
  try {
    const { csmId } = req.query;
    const opportunities = await customerSuccessService.getExpansionOpportunities(csmId as string);

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    logger.error('Error fetching expansion opportunities', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expansion opportunities',
    });
  }
});

/**
 * GET /api/v1/customer-success/health-alerts
 * Get health score alerts
 */
router.get('/health-alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { csmId } = req.query;
    const alerts = await customerSuccessService.getHealthScoreAlerts(csmId as string);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Error fetching health alerts', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health alerts',
    });
  }
});

export default router;
