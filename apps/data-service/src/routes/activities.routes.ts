import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { activitiesService } from '../services/activities.service.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createActivitySchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  userId: z.string().uuid().optional(),
  activityType: z.enum([
    'LEAD_CREATED',
    'LEAD_UPDATED',
    'STATUS_CHANGED',
    'ASSIGNMENT_CREATED',
    'ASSIGNMENT_UPDATED',
    'NOTE_CREATED',
    'NOTE_UPDATED',
    'NOTE_DELETED',
    'EMAIL_SENT',
    'EMAIL_RECEIVED',
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_COMPLETED',
    'SYSTEM_ACTION',
    'WORKFLOW_TRIGGERED',
    'CALL_LOGGED',
    'MEETING_SCHEDULED',
    'DOCUMENT_UPLOADED',
    'POLICY_CREATED',
    'CLAIM_CREATED',
    'CONVERSION',
  ]),
  action: z.string().min(1, 'Action is required').max(500),
  description: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const activityFilterSchema = z.object({
  leadId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  activityType: z.enum([
    'LEAD_CREATED',
    'LEAD_UPDATED',
    'STATUS_CHANGED',
    'ASSIGNMENT_CREATED',
    'ASSIGNMENT_UPDATED',
    'NOTE_CREATED',
    'NOTE_UPDATED',
    'NOTE_DELETED',
    'EMAIL_SENT',
    'EMAIL_RECEIVED',
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_COMPLETED',
    'SYSTEM_ACTION',
    'WORKFLOW_TRIGGERED',
    'CALL_LOGGED',
    'MEETING_SCHEDULED',
    'DOCUMENT_UPLOADED',
    'POLICY_CREATED',
    'CLAIM_CREATED',
    'CONVERSION',
  ]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// ROUTES
// ========================================

/**
 * POST /activities
 * Create a new activity
 */
router.post('/', validate({ body: createActivitySchema }), async (req, res, next) => {
  try {
    const body = req.body;

    const activity = await activitiesService.createActivity(body);

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/:id
 * Get a single activity by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await activitiesService.getActivityById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
      });
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities
 * Get activities with filtering and pagination
 */
router.get('/', validate({ query: activityFilterSchema }), async (req, res, next) => {
  try {
    const query = req.query;

    const filter = {
      ...query,
      ...(query.dateFrom && { dateFrom: new Date(query.dateFrom as string) }),
      ...(query.dateTo && { dateTo: new Date(query.dateTo as string) }),
    };

    const result = await activitiesService.getActivities(filter);

    res.json({
      success: true,
      data: result.activities,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /activities
 * Delete activities by filter (admin only)
 */
router.delete('/', validate({ query: activityFilterSchema }), async (req, res, next) => {
  try {
    const query = req.query;

    const filter = {
      ...query,
      ...(query.dateFrom && { dateFrom: new Date(query.dateFrom as string) }),
      ...(query.dateTo && { dateTo: new Date(query.dateTo as string) }),
    };

    const count = await activitiesService.deleteActivities(filter);

    res.json({
      success: true,
      message: `Deleted ${count} activities`,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/stats/:leadId
 * Get activity statistics for a lead
 */
router.get('/stats/:leadId', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const stats = await activitiesService.getActivityStats(leadId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /activities/recent/:userId
 * Get recent activities for a user
 */
router.get('/recent/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const activities = await activitiesService.getRecentActivities(userId, limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
