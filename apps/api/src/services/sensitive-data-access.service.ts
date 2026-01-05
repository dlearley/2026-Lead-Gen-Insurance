/**
 * Phase 25.1E: Sensitive Data Access Tracking Service
 *
 * Tracks all access to sensitive data (PII, financial, health records)
 * for compliance and security auditing.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type { AccessLog, DataType, AccessMethod } from '@insurance-lead-gen/types';

export class SensitiveDataAccessService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Log data access
   */
  async logDataAccess(data: {
    leadId?: string;
    documentId?: string;
    dataType: DataType;
    accessedBy: string;
    accessMethod: AccessMethod;
    accessReason?: string;
    accessContext?: string;
  }): Promise<void> {
    try {
      await this.prisma.sensitiveDataAccessLog.create({
        data: {
          leadId: data.leadId,
          documentId: data.documentId,
          dataType: data.dataType,
          accessedBy: data.accessedBy,
          accessDate: new Date(),
          accessReason: data.accessReason,
          accessMethod: data.accessMethod,
          accessContext: data.accessContext,
        },
      });

      logger.debug('Sensitive data access logged', {
        dataType: data.dataType,
        accessedBy: data.accessedBy,
        accessMethod: data.accessMethod,
      });
    } catch (error) {
      logger.error('Failed to log data access', { error, data });
      // Don't throw - we don't want to block data access if logging fails
    }
  }

  /**
   * Get access history for a specific resource
   */
  async getAccessHistory(dataId: string, dataIdType: 'leadId' | 'documentId'): Promise<AccessLog[]> {
    const where = dataIdType === 'leadId' ? { leadId: dataId } : { documentId: dataId };

    const logs = await this.prisma.sensitiveDataAccessLog.findMany({
      where,
      orderBy: { accessDate: 'desc' },
      take: 100,
    });

    return logs.map((log) => ({
      id: log.id,
      resourceId: log.leadId || log.documentId || '',
      accessedBy: log.accessedBy,
      accessDate: log.accessDate,
      accessMethod: log.accessMethod,
      accessReason: log.accessReason || undefined,
      accessContext: log.accessContext || undefined,
    }));
  }

  /**
   * Detect suspicious access patterns
   */
  async detectSuspiciousAccess(): Promise<
    Array<{
      userId: string;
      reason: string;
      riskLevel: string;
      evidence: any;
      detectedAt: Date;
    }>
  > {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const alerts: Array<{
      userId: string;
      reason: string;
      riskLevel: string;
      evidence: any;
      detectedAt: Date;
    }> = [];

    // Detect bulk downloads in last hour
    const recentAccess = await this.prisma.sensitiveDataAccessLog.groupBy({
      by: ['accessedBy'],
      where: {
        accessDate: { gte: oneHourAgo },
        accessMethod: { in: ['Export', 'Download'] },
      },
      _count: {
        id: true,
      },
    });

    for (const access of recentAccess) {
      if (access._count.id > 50) {
        // More than 50 downloads/exports in an hour
        alerts.push({
          userId: access.accessedBy,
          reason: 'Bulk data download detected',
          riskLevel: 'High',
          evidence: {
            downloadCount: access._count.id,
            timeWindow: '1 hour',
          },
          detectedAt: now,
        });
      }
    }

    // Detect after-hours access
    const currentHour = now.getHours();
    if (currentHour < 6 || currentHour > 22) {
      const afterHoursAccess = await this.prisma.sensitiveDataAccessLog.findMany({
        where: {
          accessDate: { gte: oneHourAgo },
          dataType: { in: ['PII', 'FinancialData', 'HealthData'] },
        },
      });

      const userCounts: Record<string, number> = {};
      afterHoursAccess.forEach((log) => {
        userCounts[log.accessedBy] = (userCounts[log.accessedBy] || 0) + 1;
      });

      for (const [userId, count] of Object.entries(userCounts)) {
        if (count > 10) {
          alerts.push({
            userId,
            reason: 'After-hours access to sensitive data',
            riskLevel: 'Medium',
            evidence: {
              accessCount: count,
              hour: currentHour,
            },
            detectedAt: now,
          });
        }
      }
    }

    // Detect rapid access to multiple resources
    const rapidAccess = await this.prisma.$queryRaw<
      Array<{ accessedBy: string; accessCount: bigint; uniqueLeads: bigint }>
    >`
      SELECT "accessedBy", COUNT(*) as "accessCount", COUNT(DISTINCT "leadId") as "uniqueLeads"
      FROM "SensitiveDataAccessLog"
      WHERE "accessDate" >= ${oneHourAgo}
      GROUP BY "accessedBy"
      HAVING COUNT(DISTINCT "leadId") > 30
    `;

    for (const access of rapidAccess) {
      alerts.push({
        userId: access.accessedBy,
        reason: 'Rapid access to multiple resources',
        riskLevel: 'High',
        evidence: {
          uniqueResources: Number(access.uniqueLeads),
          totalAccess: Number(access.accessCount),
          timeWindow: '1 hour',
        },
        detectedAt: now,
      });
    }

    if (alerts.length > 0) {
      logger.warn('Suspicious data access detected', {
        alertCount: alerts.length,
        alerts,
      });
    }

    return alerts;
  }

  /**
   * Validate access authorization (placeholder for future RBAC)
   */
  async validateAccessAuthorization(userId: string, dataId: string): Promise<boolean> {
    // TODO: Implement RBAC checks
    // For now, allow all access (logging is still enforced)
    return true;
  }

  /**
   * Generate access report for a time period
   */
  async generateAccessReport(period: {
    start: Date;
    end: Date;
  }): Promise<{
    period: { start: Date; end: Date };
    totalAccess: number;
    uniqueUsers: number;
    byDataType: Record<string, number>;
    byAccessMethod: Record<string, number>;
    topAccessors: Array<{ userId: string; accessCount: number }>;
    suspiciousActivity: number;
  }> {
    const logs = await this.prisma.sensitiveDataAccessLog.findMany({
      where: {
        accessDate: {
          gte: period.start,
          lte: period.end,
        },
      },
    });

    const uniqueUsers = new Set(logs.map((log) => log.accessedBy)).size;

    const byDataType: Record<string, number> = {};
    const byAccessMethod: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    logs.forEach((log) => {
      byDataType[log.dataType] = (byDataType[log.dataType] || 0) + 1;
      byAccessMethod[log.accessMethod] = (byAccessMethod[log.accessMethod] || 0) + 1;
      userCounts[log.accessedBy] = (userCounts[log.accessedBy] || 0) + 1;
    });

    const topAccessors = Object.entries(userCounts)
      .map(([userId, accessCount]) => ({ userId, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      period,
      totalAccess: logs.length,
      uniqueUsers,
      byDataType,
      byAccessMethod,
      topAccessors,
      suspiciousActivity: 0, // Calculated separately
    };
  }
}
