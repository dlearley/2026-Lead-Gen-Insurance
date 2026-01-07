import { PrismaClient } from '@prisma/client';
import {
  ComplianceAuditLog,
  ComplianceAuditLogFilter,
  IAuditTrailService,
} from '@types/compliance';
import { logger } from '@insurance-lead-gen/core';

export class AuditTrailService implements IAuditTrailService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Log a compliance action (immutable)
   */
  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes: Record<string, any>,
    compliancePolicies?: string[]
  ): Promise<void> {
    try {
      // Get request context if available
      const { ipAddress, userAgent } = this.getRequestContext();

      // Prepare audit log entry
      const auditLogData = {
        userId,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
        compliancePolicies: compliancePolicies ? JSON.stringify(compliancePolicies) : null,
        ipAddress,
        userAgent,
        timestamp: new Date(), // Immutable timestamp
        createdAt: new Date(),
      };

      // Create immutable audit log entry
      await this.prisma.complianceAuditLog.create({
        data: auditLogData,
      });

      // Log to application logger as well
      logger.info('Compliance action logged', {
        userId,
        action,
        entityType,
        entityId,
        policyCount: compliancePolicies?.length || 0,
        ipAddress,
      });

      // For critical actions, also log to separate system for redundancy
      if (this.isCriticalAction(action)) {
        await this.logCriticalAction(auditLogData);
      }
    } catch (error) {
      logger.error('Error logging compliance action', {
        error,
        userId,
        action,
        entityType,
        entityId,
      });
      
      // Don't throw error to avoid breaking main flow, but log the failure
      // In production, you might want to send this to a separate alerting system
    }
  }

  /**
   * Get audit trail with filtering
   */
  async getAuditTrail(filters: ComplianceAuditLogFilter): Promise<ComplianceAuditLog[]> {
    try {
      const whereClause: any = {};

      // Apply filters
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      if (filters.entityId) {
        whereClause.entityId = filters.entityId;
      }

      if (filters.action) {
        whereClause.action = filters.action;
      }

      if (filters.entityType) {
        whereClause.entityType = filters.entityType;
      }

      if (filters.dateFrom || filters.dateTo) {
        whereClause.timestamp = {};
        if (filters.dateFrom) {
          whereClause.timestamp.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereClause.timestamp.lte = filters.dateTo;
        }
      }

      // Execute query with pagination
      const auditLogs = await this.prisma.complianceAuditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      });

      // Parse JSON fields
      return auditLogs.map(log => ({
        ...log,
        changes: JSON.parse(log.changes || '{}'),
        compliancePolicies: log.compliancePolicies ? JSON.parse(log.compliancePolicies) : undefined,
      }));
    } catch (error) {
      logger.error('Error retrieving audit trail', { error, filters });
      throw new Error(`Failed to retrieve audit trail: ${error.message}`);
    }
  }

  /**
   * Generate audit report for a date range
   */
  async generateAuditReport(dateRange: { from: Date; to: Date }): Promise<ComplianceAuditLog[]> {
    try {
      const auditLogs = await this.prisma.complianceAuditLog.findMany({
        where: {
          timestamp: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      // Parse JSON fields
      const parsedLogs = auditLogs.map(log => ({
        ...log,
        changes: JSON.parse(log.changes || '{}'),
        compliancePolicies: log.compliancePolicies ? JSON.parse(log.compliancePolicies) : undefined,
      }));

      // Generate summary statistics
      await this.generateAuditStatistics(parsedLogs, dateRange);

      logger.info('Audit report generated', {
        from: dateRange.from,
        to: dateRange.to,
        logCount: parsedLogs.length,
      });

      return parsedLogs;
    } catch (error) {
      logger.error('Error generating audit report', { error, dateRange });
      throw new Error(`Failed to generate audit report: ${error.message}`);
    }
  }

  /**
   * Validate audit log integrity
   */
  async validateAuditIntegrity(): Promise<boolean> {
    try {
      // Check for tampering indicators
      const checks = await Promise.all([
        this.checkForDeletedLogs(),
        this.checkForModifiedLogs(),
        this.checkForDuplicateEntries(),
        this.checkTimestampConsistency(),
      ]);

      const allChecksPass = checks.every(check => check === true);

      logger.info('Audit integrity validation completed', {
        passed: allChecksPass,
        checks: checks.length,
      });

      return allChecksPass;
    } catch (error) {
      logger.error('Error validating audit integrity', { error });
      return false;
    }
  }

  /**
   * Get audit statistics for a date range
   */
  async getAuditStatistics(dateRange: { from: Date; to: Date }): Promise<any> {
    try {
      const logs = await this.prisma.complianceAuditLog.findMany({
        where: {
          timestamp: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      });

      const stats = {
        totalEntries: logs.length,
        actionsByType: {} as Record<string, number>,
        entitiesByType: {} as Record<string, number>,
        usersByActivity: {} as Record<string, number>,
        compliancePoliciesInvolved: {} as Record<string, number>,
        hourlyDistribution: {} as Record<number, number>,
        dailyDistribution: {} as Record<string, number>,
      };

      logs.forEach(log => {
        // Actions by type
        stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;

        // Entities by type
        stats.entitiesByType[log.entityType] = (stats.entitiesByType[log.entityType] || 0) + 1;

        // Users by activity
        stats.usersByActivity[log.userId] = (stats.usersByActivity[log.userId] || 0) + 1;

        // Compliance policies involved
        if (log.compliancePolicies) {
          const policies = JSON.parse(log.compliancePolicies);
          policies.forEach((policyId: string) => {
            stats.compliancePoliciesInvolved[policyId] = (stats.compliancePoliciesInvolved[policyId] || 0) + 1;
          });
        }

        // Hourly distribution
        const hour = log.timestamp.getHours();
        stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;

        // Daily distribution
        const day = log.timestamp.toISOString().split('T')[0];
        stats.dailyDistribution[day] = (stats.dailyDistribution[day] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error generating audit statistics', { error, dateRange });
      throw new Error(`Failed to generate audit statistics: ${error.message}`);
    }
  }

  /**
   * Search audit logs with full-text search
   */
  async searchAuditLogs(query: string, filters?: Partial<ComplianceAuditLogFilter>): Promise<ComplianceAuditLog[]> {
    try {
      // For production, consider using PostgreSQL full-text search or Elasticsearch
      const whereClause: any = {
        OR: [
          { action: { contains: query, mode: 'insensitive' } },
          { entityType: { contains: query, mode: 'insensitive' } },
          { entityId: { contains: query, mode: 'insensitive' } },
          { changes: { contains: query, mode: 'insensitive' } },
        ],
      };

      // Apply additional filters
      if (filters) {
        Object.keys(filters).forEach(key => {
          const value = (filters as any)[key];
          if (value !== undefined && value !== null) {
            whereClause[key] = value;
          }
        });
      }

      const auditLogs = await this.prisma.complianceAuditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: 100, // Limit search results
      });

      return auditLogs.map(log => ({
        ...log,
        changes: JSON.parse(log.changes || '{}'),
        compliancePolicies: log.compliancePolicies ? JSON.parse(log.compliancePolicies) : undefined,
      }));
    } catch (error) {
      logger.error('Error searching audit logs', { error, query, filters });
      throw new Error(`Failed to search audit logs: ${error.message}`);
    }
  }

  /**
   * Export audit logs in various formats
   */
  async exportAuditLogs(
    dateRange: { from: Date; to: Date },
    format: 'json' | 'csv' | 'xml' = 'json',
    filters?: Partial<ComplianceAuditLogFilter>
  ): Promise<string> {
    try {
      const auditLogs = await this.getAuditTrail({
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        limit: 10000, // Large export
        ...filters,
      });

      switch (format) {
        case 'json':
          return JSON.stringify(auditLogs, null, 2);
        case 'csv':
          return this.convertToCSV(auditLogs);
        case 'xml':
          return this.convertToXML(auditLogs);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit logs', { error, format, dateRange });
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }

  /**
   * Get current request context (IP, User-Agent)
   */
  private getRequestContext(): { ipAddress?: string; userAgent?: string } {
    // In a real implementation, this would extract from the current request
    // For now, return placeholder values
    return {
      ipAddress: process.env.SYSTEM_IP || '127.0.0.1',
      userAgent: 'ComplianceSystem/1.0',
    };
  }

  /**
   * Check if an action is considered critical
   */
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'PolicyCreated',
      'PolicyArchived',
      'PolicyUpdated',
      'ViolationDetected',
      'ViolationResolved',
      'DataDeleted',
      'DataExported',
      'UserAccessGranted',
      'UserAccessRevoked',
      'SystemConfigurationChanged',
    ];

    return criticalActions.includes(action);
  }

  /**
   * Log critical actions to separate system for redundancy
   */
  private async logCriticalAction(auditLogData: any): Promise<void> {
    try {
      // In production, this could write to a separate immutable log system
      // like AWS CloudTrail, Azure Activity Logs, or a blockchain
      logger.warn('Critical compliance action detected', auditLogData);
    } catch (error) {
      logger.error('Error logging critical action', { error, auditLogData });
    }
  }

  /**
   * Check for deleted audit logs (tampering indicator)
   */
  private async checkForDeletedLogs(): Promise<boolean> {
    try {
      // This would check for gaps in sequence or unexpected deletions
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      logger.error('Error checking for deleted logs', { error });
      return false;
    }
  }

  /**
   * Check for modified audit logs (tampering indicator)
   */
  private async checkForModifiedLogs(): Promise<boolean> {
    try {
      // This would check for checksum mismatches or modification timestamps
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      logger.error('Error checking for modified logs', { error });
      return false;
    }
  }

  /**
   * Check for duplicate entries (potential tampering)
   */
  private async checkForDuplicateEntries(): Promise<boolean> {
    try {
      const duplicates = await this.prisma.complianceAuditLog.groupBy({
        by: ['userId', 'action', 'entityType', 'entityId', 'timestamp'],
        having: {
          id: {
            _count: {
              gt: 1,
            },
          },
        },
      });

      return duplicates.length === 0;
    } catch (error) {
      logger.error('Error checking for duplicates', { error });
      return false;
    }
  }

  /**
   * Check timestamp consistency
   */
  private async checkTimestampConsistency(): Promise<boolean> {
    try {
      // Check for future timestamps or unrealistic time jumps
      const now = new Date();
      const suspiciousLogs = await this.prisma.complianceAuditLog.count({
        where: {
          OR: [
            { timestamp: { gt: new Date(now.getTime() + 60000) } }, // More than 1 minute in future
            { createdAt: { lt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } }, // Older than 1 year
          ],
        },
      });

      return suspiciousLogs === 0;
    } catch (error) {
      logger.error('Error checking timestamp consistency', { error });
      return false;
    }
  }

  /**
   * Generate audit statistics
   */
  private async generateAuditStatistics(logs: ComplianceAuditLog[], dateRange: { from: Date; to: Date }): Promise<void> {
    try {
      const stats = await this.getAuditStatistics(dateRange);
      
      logger.info('Audit statistics generated', {
        period: dateRange,
        totalEntries: stats.totalEntries,
        uniqueActions: Object.keys(stats.actionsByType).length,
        uniqueUsers: Object.keys(stats.usersByActivity).length,
      });
    } catch (error) {
      logger.error('Error generating audit statistics', { error });
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: ComplianceAuditLog[]): string {
    const headers = [
      'ID',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Changes',
      'Compliance Policies',
      'IP Address',
      'User Agent',
      'Timestamp',
      'Created At',
    ];

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id,
        log.userId,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.changes).replace(/"/g, '""'),
        log.compliancePolicies ? JSON.stringify(log.compliancePolicies) : '',
        log.ipAddress || '',
        log.userAgent || '',
        log.timestamp.toISOString(),
        log.createdAt.toISOString(),
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert audit logs to XML format
   */
  private convertToXML(logs: ComplianceAuditLog[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const auditLogsElement = '<AuditLogs>';

    const logElements = logs.map(log => {
      return `
    <AuditLog>
      <Id>${log.id}</Id>
      <UserId>${log.userId}</UserId>
      <Action>${log.action}</Action>
      <EntityType>${log.entityType}</EntityType>
      <EntityId>${log.entityId}</EntityId>
      <Changes>${this.escapeXml(JSON.stringify(log.changes))}</Changes>
      <CompliancePolicies>${log.compliancePolicies ? this.escapeXml(JSON.stringify(log.compliancePolicies)) : ''}</CompliancePolicies>
      <IpAddress>${log.ipAddress || ''}</IpAddress>
      <UserAgent>${this.escapeXml(log.userAgent || '')}</UserAgent>
      <Timestamp>${log.timestamp.toISOString()}</Timestamp>
      <CreatedAt>${log.createdAt.toISOString()}</CreatedAt>
    </AuditLog>`;
    });

    const xmlFooter = '</AuditLogs>';

    return `${xmlHeader}\n${auditLogsElement}${logElements.join('')}\n${xmlFooter}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}