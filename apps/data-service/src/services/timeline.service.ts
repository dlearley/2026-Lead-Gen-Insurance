import { prisma } from '@insurance-lead-gen/data-service';
import { logger } from '@insurance-lead-gen/core';
import type {
  TimelineEvent,
  TimelineFilter,
  TimelineResponse,
  TimelineStatistics,
  EventSummary,
  ActivityLog,
  Note,
  NoteVisibility,
  NoteType,
  ActivityType,
} from '@insurance-lead-gen/types';
import { Prisma } from '@prisma/client';

export class TimelineService {
  /**
   * Get unified timeline for a lead
   */
  async getTimeline(leadId: string, filter: TimelineFilter = {}): Promise<TimelineResponse> {
    try {
      const page = filter.search ? 1 : 1;
      const limit = 50;
      const skip = (page - 1) * limit;

      // Build base conditions
      const baseConditions: Prisma.PrismaWhereInput = {
        leadId,
      };

      // Add date filters
      if (filter.dateFrom || filter.dateTo) {
        const dateConditions: Prisma.PrismaWhereInput = {};
        if (filter.dateFrom) {
          dateConditions.gte = filter.dateFrom;
        }
        if (filter.dateTo) {
          dateConditions.lte = filter.dateTo;
        }
        baseConditions.AND = [
          ...(baseConditions.AND || []),
          { createdAt: dateConditions },
        ];
      }

      // Fetch all events based on type filter
      const events: TimelineEvent[] = [];

      // Fetch notes
      if (!filter.type || filter.type === 'all' || filter.type === 'notes') {
        const noteConditions: Prisma.Prisma.NoteWhereInput = {
          ...baseConditions,
          ...(filter.userId && { authorId: filter.userId }),
          ...(filter.noteType && { type: filter.noteType }),
          ...(filter.visibility && { visibility: filter.visibility }),
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
            title: `${note.type.replace('_', ' ').toUpperCase()}: Note`,
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

      // Fetch activities
      if (!filter.type || filter.type === 'all' || filter.type === 'activities') {
        const activityConditions: Prisma.Prisma.ActivityLogWhereInput = {
          ...baseConditions,
          ...(filter.userId && { userId: filter.userId }),
          ...(filter.activityType && { activityType: filter.activityType }),
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
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredEvents = events.filter((event) =>
          event.description?.toLowerCase().includes(searchLower) ||
          event.title.toLowerCase().includes(searchLower) ||
          event.type.toLowerCase().includes(searchLower)
        );
      }

      // Sort all events by timestamp (newest first)
      filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Paginate
      const total = filteredEvents.length;
      const paginatedEvents = filteredEvents.slice(skip, skip + limit);

      // Calculate aggregations
      const aggregations = await this.getAggregations(leadId, filter);

      return {
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        aggregations,
      };
    } catch (error) {
      logger.error('Error fetching timeline', { leadId, filter, error });
      throw error;
    }
  }

  /**
   * Get event counts and aggregations
   */
  private async getAggregations(leadId: string, filter: TimelineFilter) {
    const baseConditions = { leadId };

    const [notesCount, activitiesCount] = await Promise.all([
      prisma.note.count({
        where: {
          ...baseConditions,
          ...(filter.userId && { authorId: filter.userId }),
          ...(filter.noteType && { type: filter.noteType }),
          ...(filter.dateFrom && filter.dateTo ? {
            createdAt: {
              gte: filter.dateFrom,
              lte: filter.dateTo,
            },
          } : {}),
        },
      }),
      prisma.activityLog.count({
        where: {
          ...baseConditions,
          ...(filter.userId && { userId: filter.userId }),
          ...(filter.activityType && { activityType: filter.activityType }),
          ...(filter.dateFrom && filter.dateTo ? {
            createdAt: {
              gte: filter.dateFrom,
              lte: filter.dateTo,
            },
          } : {}),
        },
      }),
    ]);

    return {
      notesCount,
      activitiesCount,
      emailsCount: 0, // To be implemented when email tracking is added
      tasksCount: 0, // To be implemented when task tracking is added
      callsCount: 0, // To be implemented when call tracking is added
      meetingsCount: 0, // To be implemented when meeting tracking is added
    };
  }

  /**
   * Get timeline statistics for a lead
   */
  async getStatistics(leadId: string): Promise<TimelineStatistics> {
    try {
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

      // Fetch user details for most active user
      if (mostActiveUser) {
        const user = await prisma.user.findUnique({
          where: { id: mostActiveUser.userId },
          select: { firstName: true, lastName: true },
        });
        if (user) {
          mostActiveUser.userName = `${user.firstName} ${user.lastName}`.trim();
        }
      }

      return {
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
      };
    } catch (error) {
      logger.error('Error fetching timeline statistics', { leadId, error });
      throw error;
    }
  }

  /**
   * Get event summaries grouped by date
   */
  async getEventSummaries(leadId: string, dateFrom?: Date, dateTo?: Date): Promise<EventSummary[]> {
    try {
      const conditions: Prisma.PrismaWhereInput = { leadId };
      if (dateFrom || dateTo) {
        conditions.AND = [{ createdAt: {} }];
        if (dateFrom) conditions.AND[0].createdAt.gte = dateFrom;
        if (dateTo) conditions.AND[0].createdAt.lte = dateTo;
      }

      const [notes, activities] = await Promise.all([
        prisma.note.findMany({
          where: conditions,
          select: { createdAt: true, type: true },
        }),
        prisma.activityLog.findMany({
          where: conditions,
          select: { createdAt: true, activityType: true },
        }),
      ]);

      const eventDates = new Map<string, { count: number; types: Record<string, number> }>();

      // Process notes
      notes.forEach((note) => {
        const dateKey = note.createdAt.toISOString().split('T')[0];
        const existing = eventDates.get(dateKey) || { count: 0, types: {} };
        existing.count++;
        existing.types[note.type] = (existing.types[note.type] || 0) + 1;
        eventDates.set(dateKey, existing);
      });

      // Process activities
      activities.forEach((activity) => {
        const dateKey = activity.createdAt.toISOString().split('T')[0];
        const existing = eventDates.get(dateKey) || { count: 0, types: {} };
        existing.count++;
        existing.types[activity.activityType] = (existing.types[activity.activityType] || 0) + 1;
        eventDates.set(dateKey, existing);
      });

      // Convert to array and sort by date
      const summaries = Array.from(eventDates.entries())
        .map(([date, data]) => ({
          date: new Date(date),
          count: data.count,
          types: data.types,
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return summaries;
    } catch (error) {
      logger.error('Error fetching event summaries', { leadId, dateFrom, dateTo, error });
      throw error;
    }
  }
}

export const timelineService = new TimelineService();
