/**
 * Phase 25.1E: Audit Trail Query Service
 *
 * Advanced querying and search capabilities for audit logs.
 */

import { PrismaClient } from '@prisma/client';
import type {
  AuditLogFilters,
  ImmutableAuditLog,
  Timeline,
  AuditTimelineEntry,
} from '@insurance-lead-gen/types';

export class AuditTrailQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Query audit logs with advanced filters
   */
  async query(filters: AuditLogFilters): Promise<ImmutableAuditLog[]> {
    const where: any = {};

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.eventCategory) where.eventCategory = filters.eventCategory;
    if (filters.severity) where.severity = filters.severity;
    if (filters.complianceStatus) where.complianceStatus = filters.complianceStatus;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;

    if (filters.dateRange) {
      where.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Full-text search across audit logs
   */
  async search(
    searchTerm: string,
    scope?: {
      eventTypes?: string[];
      categories?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<ImmutableAuditLog[]> {
    const where: any = {
      OR: [
        { eventType: { contains: searchTerm, mode: 'insensitive' } },
        { resourceId: { contains: searchTerm, mode: 'insensitive' } },
        { actorId: { contains: searchTerm, mode: 'insensitive' } },
        { changeDescription: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (scope?.eventTypes && scope.eventTypes.length > 0) {
      where.eventType = { in: scope.eventTypes };
    }

    if (scope?.categories && scope.categories.length > 0) {
      where.eventCategory = { in: scope.categories };
    }

    if (scope?.dateRange) {
      where.timestamp = {
        gte: scope.dateRange.start,
        lte: scope.dateRange.end,
      };
    }

    return this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  /**
   * Get complete timeline for a resource
   */
  async getTimelineFor(resourceId: string): Promise<Timeline> {
    const logs = await this.prisma.immutableAuditLog.findMany({
      where: { resourceId },
      orderBy: { timestamp: 'asc' },
    });

    const events: AuditTimelineEntry[] = logs.map((log) => ({
      timestamp: log.timestamp,
      sequenceNumber: log.sequenceNumber,
      eventType: log.eventType,
      actorId: log.actorId,
      action: log.action,
      resourceId: log.resourceId,
      description: log.changeDescription || `${log.action} on ${log.resourceType}`,
    }));

    return {
      resourceId,
      events,
      totalEvents: events.length,
      period: {
        start: logs.length > 0 ? logs[0].timestamp : new Date(),
        end: logs.length > 0 ? logs[logs.length - 1].timestamp : new Date(),
      },
    };
  }

  /**
   * Get conversation history (Read actions on a resource)
   */
  async getConversationHistory(resourceId: string): Promise<ImmutableAuditLog[]> {
    return this.prisma.immutableAuditLog.findMany({
      where: {
        resourceId,
        action: { in: ['Read', 'Update'] },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Compare states of a resource at two different times
   */
  async compareStates(
    resourceId: string,
    beforeDate: Date,
    afterDate: Date
  ): Promise<{
    before: any;
    after: any;
    changes: Array<{ field: string; oldValue: any; newValue: any }>;
  }> {
    const beforeLog = await this.prisma.immutableAuditLog.findFirst({
      where: {
        resourceId,
        timestamp: { lte: beforeDate },
        action: { in: ['Create', 'Update'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    const afterLog = await this.prisma.immutableAuditLog.findFirst({
      where: {
        resourceId,
        timestamp: { lte: afterDate },
        action: { in: ['Create', 'Update'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    const before = beforeLog?.newValues ? JSON.parse(beforeLog.newValues) : {};
    const after = afterLog?.newValues ? JSON.parse(afterLog.newValues) : {};

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Find differences
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes.push({
          field: key,
          oldValue: before[key],
          newValue: after[key],
        });
      }
    }

    return { before, after, changes };
  }

  /**
   * Get audit logs grouped by hour
   */
  async getAuditLogsByHour(dateRange: { start: Date; end: Date }): Promise<
    Array<{
      hour: string;
      count: number;
    }>
  > {
    const result = await this.prisma.$queryRaw<
      Array<{ hour: string; count: bigint }>
    >`
      SELECT 
        to_char(timestamp, 'YYYY-MM-DD HH24:00:00') as hour,
        COUNT(*) as count
      FROM "ImmutableAuditLog"
      WHERE timestamp >= ${dateRange.start} AND timestamp <= ${dateRange.end}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    return result.map((row) => ({
      hour: row.hour,
      count: Number(row.count),
    }));
  }
}
