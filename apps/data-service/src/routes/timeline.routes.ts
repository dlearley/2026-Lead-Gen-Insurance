import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { timelineService } from '../services/timeline.service.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const timelineFilterSchema = z.object({
  type: z.enum(['all', 'notes', 'activities', 'emails', 'tasks', 'calls', 'meetings', 'documents']).optional().default('all'),
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
  noteType: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ========================================
// ROUTES
// ========================================

/**
 * GET /timeline/:leadId
 * Get unified timeline for a lead
 */
router.get('/:leadId', validate({ query: timelineFilterSchema }), async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const query = req.query;

    const filter = {
      ...query,
      ...(query.dateFrom && { dateFrom: new Date(query.dateFrom as string) }),
      ...(query.dateTo && { dateTo: new Date(query.dateTo as string) }),
    };

    const timeline = await timelineService.getTimeline(leadId, filter);

    res.json({
      success: true,
      data: timeline.events,
      pagination: timeline.pagination,
      aggregations: timeline.aggregations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /timeline/:leadId/statistics
 * Get timeline statistics for a lead
 */
router.get('/:leadId/statistics', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const stats = await timelineService.getStatistics(leadId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /timeline/:leadId/summaries
 * Get event summaries grouped by date
 */
router.get('/:leadId/summaries', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const summaries = await timelineService.getEventSummaries(leadId, dateFrom, dateTo);

    res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
