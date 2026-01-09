import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';
import type { TimelineEvent, TimelineFilter } from '@insurance-lead-gen/types';
import { validateQuery } from '../utils/validation.js';

const router = Router({ mergeParams: true });

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
 * GET /api/v1/leads/:leadId/timeline
 * Get unified timeline for a lead
 */
router.get('/', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const query = validateQuery(timelineFilterSchema, req.query);

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Build base conditions
    const baseConditions: any = { leadId };

    // Add date filters
    if (query.dateFrom || query.dateTo) {
      baseConditions.createdAt = {};
      if (query.dateFrom) baseConditions.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) baseConditions.createdAt.lte = new Date(query.dateTo);
    }

    const events: TimelineEvent[] = [];
    const limit = Math.min(100, query.limit);
    const skip = (query.page - 1) * limit;

    // Fetch notes if needed
    if (!query.type || query.type === 'all' || query.type === 'notes') {
      const noteConditions: any = {
        ...baseConditions,
        ...(query.userId && { authorId: query.userId }),
        ...(query.noteType && { type: query.noteType }),
        ...(query.visibility && { visibility: query.visibility }),
      };

      const notes = await prisma.note.findMany({
        where: noteConditions,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          attachments: true,
        },
      });

      events.push(
        ...notes.map((note) => ({
          id: note.id,
          leadId: note.leadId,
          eventType: 'note' as const,
          timestamp: note.createdAt,
          type: note.type,
          title: `${note.type.replace(/_/g, ' ').toUpperCase()}: Note`,
          description: note.content,
          userId: note.authorId,
          metadata: {
            visibility: note.visibility,
            mentions: note.mentions || [],
            attachments: note.attachments,
            authorName: `${note.author.firstName} ${note.author.lastName}`.trim(),
            authorEmail: note.author.email,
          },
          relatedEntityId: note.id,
        }))
      );
    }

    // Fetch activities if needed
    if (!query.type || query.type === 'all' || query.type === 'activities') {
      const activityConditions: any = {
        ...baseConditions,
        ...(query.userId && { userId: query.userId }),
        ...(query.activityType && { activityType: query.activityType }),
      };

      const activities = await prisma.activityLog.findMany({
        where: activityConditions,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      events.push(
        ...activities.map((activity) => ({
          id: activity.id,
          leadId: activity.leadId,
          eventType: 'activity' as const,
          timestamp: activity.createdAt,
          type: activity.activityType,
          title: activity.activityType.replace(/_/g, ' ').toLowerCase(),
          description: activity.description || activity.action,
          userId: activity.userId,
          metadata: {
            action: activity.action,
            ...(activity.metadata as Record<string, unknown>),
            userName: activity.user ? `${activity.user.firstName} ${activity.user.lastName}`.trim() : 'System',
            userEmail: activity.user?.email,
          },
          relatedEntityId: activity.id,
        }))
      );
    }

    // Apply search filter if provided
    let filteredEvents = events;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredEvents = events.filter((event) =>
        event.description?.toLowerCase().includes(searchLower) ||
        event.title.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(skip, skip + limit);

    // Calculate aggregations
    const [notesCount, activitiesCount] = await Promise.all([
      prisma.note.count({
        where: {
          leadId,
          ...(query.userId && { authorId: query.userId }),
          ...(query.noteType && { type: query.noteType }),
          ...(query.visibility && { visibility: query.visibility }),
          ...(query.dateFrom && { createdAt: { gte: new Date(query.dateFrom) } }),
          ...(query.dateTo && { createdAt: { lte: new Date(query.dateTo) } }),
        },
      }),
      prisma.activityLog.count({
        where: {
          leadId,
          ...(query.userId && { userId: query.userId }),
          ...(query.activityType && { activityType: query.activityType }),
          ...(query.dateFrom && { createdAt: { gte: new Date(query.dateFrom) } }),
          ...(query.dateTo && { createdAt: { lte: new Date(query.dateTo) } }),
        },
      }),
    ]);

    const aggregations = {
      notesCount,
      activitiesCount,
      emailsCount: 0,
      tasksCount: 0,
      callsCount: 0,
      meetingsCount: 0,
    };

    res.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      aggregations,
    });
  } catch (error) {
    logger.error('Error fetching timeline', { error });
    next(error);
  }
});

/**
 * GET /api/v1/leads/:leadId/timeline/statistics
 * Get timeline statistics for a lead
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const { leadId } = req.params;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const [notes, activities] = await Promise.all([
      prisma.note.findMany({
        where: { leadId },
        select: { createdAt: true, authorId: true },
      }),
      prisma.activityLog.findMany({
        where: { leadId },
        select: { createdAt: true, userId: true },
      }),
    ]);

    const totalEvents = notes.length + activities.length;
    const allTimestamps = [
      ...notes.map((n) => n.createdAt.getTime()),
      ...activities.map((a) => a.createdAt.getTime()),
    ];

    const lastActivity = allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)) : undefined;
    const firstActivity = allTimestamps.length > 0 ? new Date(Math.min(...allTimestamps)) : undefined;

    // Calculate average activities per day
    let averageActivitiesPerDay = 0;
    if (firstActivity && lastActivity) {
      const daysDiff = Math.max(1, Math.ceil((lastActivity.getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24)));
      averageActivitiesPerDay = totalEvents / daysDiff;
    }

    // Find most active user
    const userActivityCounts = new Map<string, number>();

    notes.forEach((note) => {
      const count = userActivityCounts.get(note.authorId) || 0;
      userActivityCounts.set(note.authorId, count + 1);
    });

    activities.forEach((activity) => {
      if (activity.userId) {
        const count = userActivityCounts.get(activity.userId) || 0;
        userActivityCounts.set(activity.userId, count + 1);
      }
    });

    let mostActiveUser;
    if (userActivityCounts.size > 0) {
      let maxCount = 0;
      userActivityCounts.forEach((count, userId) => {
        if (count > maxCount) {
          maxCount = count;
          mostActiveUser = { userId, activityCount: count };
        }
      });
    }

    // Fetch user details
    if (mostActiveUser) {
      const user = await prisma.user.findUnique({
        where: { id: mostActiveUser.userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        mostActiveUser.userName = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    res.json({
      success: true,
      data: {
        leadId,
        totalEvents,
        notesCount: notes.length,
        activitiesCount: activities.length,
        emailsCount: 0,
        tasksCount: 0,
        callsCount: 0,
        lastActivity,
        firstActivity,
        averageActivitiesPerDay,
        mostActiveUser,
      },
    });
  } catch (error) {
    logger.error('Error fetching timeline statistics', { error });
    next(error);
  }
});

export default router;
