import { prisma } from '@insurance-lead-gen/data-service';
import { logger } from '@insurance-lead-gen/core';
import type {
  ActivityLog,
  CreateActivityDto,
  ActivityFilterDto,
} from '@insurance-lead-gen/types';
import { Prisma } from '@prisma/client';

export class ActivitiesService {
  /**
   * Create a new activity log entry
   */
  async createActivity(dto: CreateActivityDto): Promise<ActivityLog> {
    try {
      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: dto.leadId },
        select: { id: true },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const activity = await prisma.activityLog.create({
        data: {
          leadId: dto.leadId,
          userId: dto.userId,
          activityType: dto.activityType,
          action: dto.action,
          description: dto.description,
          metadata: dto.metadata as Prisma.InputJsonValue,
        },
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

      return {
        id: activity.id,
        leadId: activity.leadId,
        userId: activity.userId,
        activityType: activity.activityType as any,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata as Record<string, unknown>,
        createdAt: activity.createdAt,
      };
    } catch (error) {
      logger.error('Error creating activity', { dto, error });
      throw error;
    }
  }

  /**
   * Get a single activity by ID
   */
  async getActivityById(id: string): Promise<ActivityLog | null> {
    try {
      const activity = await prisma.activityLog.findUnique({
        where: { id },
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

      if (!activity) {
        return null;
      }

      return {
        id: activity.id,
        leadId: activity.leadId,
        userId: activity.userId,
        activityType: activity.activityType as any,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata as Record<string, unknown>,
        createdAt: activity.createdAt,
      };
    } catch (error) {
      logger.error('Error fetching activity', { id, error });
      throw error;
    }
  }

  /**
   * Get activities with filtering and pagination
   */
  async getActivities(
    filter: ActivityFilterDto
  ): Promise<{ activities: ActivityLog[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const page = filter.page || 1;
      const limit = Math.min(filter.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: Prisma.ActivityLogWhereInput = {};
      if (filter.leadId) where.leadId = filter.leadId;
      if (filter.userId) where.userId = filter.userId;
      if (filter.activityType) where.activityType = filter.activityType;

      // Date range filter
      if (filter.dateFrom || filter.dateTo) {
        where.createdAt = {};
        if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
        if (filter.dateTo) where.createdAt.lte = filter.dateTo;
      }

      // Search filter
      if (filter.search) {
        where.OR = [
          { action: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
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
        }),
        prisma.activityLog.count({ where }),
      ]);

      const mappedActivities = activities.map((activity) => ({
        id: activity.id,
        leadId: activity.leadId,
        userId: activity.userId,
        activityType: activity.activityType as any,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata as Record<string, unknown>,
        createdAt: activity.createdAt,
      }));

      return {
        activities: mappedActivities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching activities', { filter, error });
      throw error;
    }
  }

  /**
   * Get activity statistics for a lead
   */
  async getActivityStats(leadId: string) {
    try {
      const [totalActivities, byType, byUser] = await Promise.all([
        prisma.activityLog.count({ where: { leadId } }),
        prisma.activityLog.groupBy({
          by: ['activityType'],
          where: { leadId },
          _count: true,
          orderBy: { _count: { activityType: 'desc' } },
        }),
        prisma.activityLog.groupBy({
          by: ['userId'],
          where: { leadId },
          _count: true,
          orderBy: { _count: { userId: 'desc' } },
          take: 5,
        }),
      ]);

      return {
        totalActivities,
        byType: byType.map((item) => ({
          activityType: item.activityType,
          count: item._count,
        })),
        topUsers: byUser.map((item) => ({
          userId: item.userId,
          count: item._count,
        })),
      };
    } catch (error) {
      logger.error('Error fetching activity stats', { leadId, error });
      throw error;
    }
  }

  /**
   * Delete activities (admin only - bulk delete by filter)
   */
  async deleteActivities(filter: ActivityFilterDto): Promise<number> {
    try {
      const where: Prisma.ActivityLogWhereInput = {};
      if (filter.leadId) where.leadId = filter.leadId;
      if (filter.userId) where.userId = filter.userId;
      if (filter.activityType) where.activityType = filter.activityType;

      // Date range filter
      if (filter.dateFrom || filter.dateTo) {
        where.createdAt = {};
        if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
        if (filter.dateTo) where.createdAt.lte = filter.dateTo;
      }

      const result = await prisma.activityLog.deleteMany({ where });
      return result.count;
    } catch (error) {
      logger.error('Error deleting activities', { filter, error });
      throw error;
    }
  }

  /**
   * Get recent activities for a user
   */
  async getRecentActivities(userId: string, limit: number = 10) {
    try {
      const activities = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return activities.map((activity) => ({
        id: activity.id,
        leadId: activity.leadId,
        leadName: activity.lead.firstName
          ? `${activity.lead.firstName} ${activity.lead.lastName}`.trim()
          : activity.lead.email || 'Unknown',
        activityType: activity.activityType,
        action: activity.action,
        description: activity.description,
        createdAt: activity.createdAt,
      }));
    } catch (error) {
      logger.error('Error fetching recent activities', { userId, error });
      throw error;
    }
  }
}

export const activitiesService = new ActivitiesService();
