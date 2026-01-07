import { PrismaClient } from '@prisma/client';
import {
  AuditLog,
  AuditActionType,
  EntityType,
  ComplianceDocument,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * ComplianceService - Manages regulatory compliance and audit logging
 */
export class ComplianceService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Log an audit event
   */
  async logAuditEvent(event: {
    organizationId?: string;
    userId?: string;
    actionType: AuditActionType;
    entityType?: EntityType;
    entityId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
  }): Promise<AuditLog> {
    try {
      this.logger.info('Logging audit event', { 
        actionType: event.actionType, 
        entityType: event.entityType 
      });

      const auditLog = await this.prisma.auditLog.create({
        data: {
          organizationId: event.organizationId,
          userId: event.userId,
          actionType: event.actionType,
          entityType: event.entityType,
          entityId: event.entityId,
          changes: event.changes,
          ipAddress: event.ipAddress,
          timestamp: new Date(),
        },
      });

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to log audit event', { error, event });
      // Don't throw for logging failures to avoid breaking main flow
      throw new AppError('Failed to log audit event', 500);
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    organizationId?: string;
    userId?: string;
    actionType?: AuditActionType;
    entityType?: EntityType;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    try {
      const whereClause: any = {};

      if (filters.organizationId) {
        whereClause.organizationId = filters.organizationId;
      }
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }
      if (filters.actionType) {
        whereClause.actionType = filters.actionType;
      }
      if (filters.entityType) {
        whereClause.entityType = filters.entityType;
      }
      if (filters.entityId) {
        whereClause.entityId = filters.entityId;
      }
      if (filters.startDate || filters.endDate) {
        whereClause.timestamp = {};
        if (filters.startDate) {
          whereClause.timestamp.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.timestamp.lte = filters.endDate;
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0,
        }),
        this.prisma.auditLog.count({ where: whereClause }),
      ]);

      return { logs, total };
    } catch (error) {
      this.logger.error('Failed to get audit logs', { error, filters });
      throw new AppError('Failed to retrieve audit logs', 500);
    }
  }

  /**
   * Store compliance document
   */
  async storeComplianceDocument(document: {
    organizationId?: string;
    documentType: string;
    documentVersion: number;
    effectiveDate?: Date;
    documentUrl: string;
  }): Promise<ComplianceDocument> {
    try {
      this.logger.info('Storing compliance document', { 
        documentType: document.documentType 
      });

      const complianceDoc = await this.prisma.complianceDocument.create({
        data: {
          organizationId: document.organizationId,
          documentType: document.documentType,
          documentVersion: document.documentVersion,
          effectiveDate: document.effectiveDate,
          documentUrl: document.documentUrl,
        },
      });

      return complianceDoc;
    } catch (error) {
      this.logger.error('Failed to store compliance document', { error, document });
      throw new AppError('Failed to store compliance document', 500);
    }
  }

  /**
   * Get compliance documents
   */
  async getComplianceDocuments(filters: {
    organizationId?: string;
    documentType?: string;
    effectiveFrom?: Date;
  }): Promise<ComplianceDocument[]> {
    try {
      const whereClause: any = {};

      if (filters.organizationId) {
        whereClause.organizationId = filters.organizationId;
      }
      if (filters.documentType) {
        whereClause.documentType = filters.documentType;
      }
      if (filters.effectiveFrom) {
        whereClause.effectiveDate = { gte: filters.effectiveFrom };
      }

      return await this.prisma.complianceDocument.findMany({
        where: whereClause,
        orderBy: [
          { documentType: 'asc' },
          { documentVersion: 'desc' },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to get compliance documents', { error, filters });
      throw new AppError('Failed to retrieve compliance documents', 500);
    }
  }

  /**
   * Run compliance check for an entity
   */
  async runComplianceCheck(entity: {
    entityType: EntityType;
    entityId: string;
    complianceRequirements: string[];
  }): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    try {
      this.logger.info('Running compliance check', { 
        entityType: entity.entityType, 
        entityId: entity.entityId 
      });

      const violations: string[] = [];
      const recommendations: string[] = [];

      // Check based on entity type
      switch (entity.entityType) {
        case 'ADVISOR':
          const advisor = await this.prisma.financialAdvisor.findUnique({
            where: { id: entity.entityId },
          });
          if (!advisor) {
            violations.push('Advisor not found');
          } else {
            if (advisor.status === 'SUSPENDED') {
              violations.push('Advisor is suspended');
            }
            if ((advisor.currentClients || 0) > (advisor.maxClients || 50)) {
              violations.push('Advisor exceeds maximum client capacity');
            }
          }
          break;

        case 'CUSTOMER':
          // Check customer compliance requirements
          const applications = await this.prisma.productApplication.findMany({
            where: { 
              customerId: entity.entityId,
              status: 'APPROVED',
            },
          });
          
          if (entity.complianceRequirements.includes('KYC') && applications.length === 0) {
            recommendations.push('No approved applications found - recommend KYC verification');
          }
          break;

        case 'PRODUCT':
          const product = await this.prisma.financialProduct.findUnique({
            where: { id: entity.entityId },
          });
          if (!product) {
            violations.push('Product not found');
          } else if (product.status === 'INACTIVE') {
            violations.push('Product is inactive');
          }
          break;
      }

      const compliant = violations.length === 0;

      await this.logAuditEvent({
        actionType: 'COMPLIANCE_CHECK',
        entityType: entity.entityType,
        entityId: entity.entityId,
        changes: {
          compliant,
          violations,
          recommendations,
        },
      });

      return {
        compliant,
        violations,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to run compliance check', { error, entity });
      throw new AppError('Failed to run compliance check', 500);
    }
  }

  /**
   * Get suspicious activity reports
   */
  async getSuspiciousActivityReports(filters: {
    startDate?: Date;
    endDate?: Date;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<AuditLog[]> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
          OR: [
            { actionType: 'DELETE' },
            { actionType: 'VIEW' },
            // Add more suspicious patterns
          ],
        },
        orderBy: { timestamp: 'desc' },
      });

      // In real implementation, apply ML models to detect suspicious patterns
      return logs;
    } catch (error) {
      this.logger.error('Failed to get suspicious activity reports', { error, filters });
      throw new AppError('Failed to retrieve suspicious activity reports', 500);
    }
  }

  /**
   * Retention policy check
   */
  async checkRetentionPolicy(entityType: EntityType, entityId: string): Promise<{
    canDelete: boolean;
    retentionPeriod: number;
    deleteDate?: Date;
  }> {
    try {
      const retentionPeriods: Record<EntityType, number> = {
        'USER': 7 * 365, // 7 years
        'CUSTOMER': 7 * 365,
        'LEAD': 3 * 365,
        'AGENT': 7 * 365,
        'ADVISOR': 7 * 365,
        'ACCOUNT': 7 * 365,
        'PRODUCT': 3 * 365,
      };

      const period = retentionPeriods[entityType] || 3 * 365;
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() + period);

      return {
        canDelete: true,
        retentionPeriod: period,
        deleteDate,
      };
    } catch (error) {
      this.logger.error('Failed to check retention policy', { error, entityType, entityId });
      throw new AppError('Failed to check retention policy', 500);
    }
  }
}