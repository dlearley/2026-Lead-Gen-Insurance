import { PrismaClient } from '@prisma/client';
import {
  DataConsent,
  DataDeletionRequest,
  ComplianceAuditLog,
  ComplianceReport,
  DataRetentionPolicy,
  ComplianceViolation,
  DataSubjectRequest,
  CreateDataConsentInput,
  CreateDataDeletionRequestInput,
  CreateComplianceReportInput,
  CreateDataRetentionPolicyInput,
  CreateComplianceViolationInput,
  CreateDataSubjectRequestInput,
  ConsentType,
  AuditLogFilters,
  ConsentCheckResult,
  ComplianceMetrics,
} from '@insurancereport/types';

export class ComplianceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ==================== CONSENT MANAGEMENT ====================

  async createConsent(input: CreateDataConsentInput): Promise<DataConsent> {
    // If leadId is provided, get the email from the lead
    let email = input.email;
    if (input.leadId && !email) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: input.leadId },
        select: { email: true },
      });
      email = lead?.email;
    }

    const consent = await this.prisma.dataConsent.create({
      data: {
        leadId: input.leadId,
        email,
        consentType: input.consentType,
        consentGiven: input.consentGiven,
        consentText: input.consentText,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
      },
    });

    // Audit log
    await this.createAuditLog({
      entityType: 'CONSENT',
      entityId: consent.id,
      actionType: 'CREATE',
      newValue: consent,
      performedBy: 'SYSTEM',
    });

    return consent as DataConsent;
  }

  async getConsent(consentId: string): Promise<DataConsent | null> {
    return this.prisma.dataConsent.findUnique({
      where: { id: consentId },
    }) as Promise<DataConsent | null>;
  }

  async getConsentsByLead(leadId: string): Promise<DataConsent[]> {
    return this.prisma.dataConsent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataConsent[]>;
  }

  async getConsentsByEmail(email: string): Promise<DataConsent[]> {
    return this.prisma.dataConsent.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataConsent[]>;
  }

  async checkConsent(
    email: string,
    consentType: ConsentType,
  ): Promise<ConsentCheckResult | null> {
    const consent = await this.prisma.dataConsent.findFirst({
      where: {
        email,
        consentType,
        consentGiven: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        withdrawnAt: null,
      },
      orderBy: { version: 'desc' },
    });

    if (!consent) {
      return null;
    }

    return {
      hasValidConsent: true,
      consentType: consent.consentType as ConsentType,
      consentGiven: consent.consentGiven,
      consentDate: consent.createdAt,
      withdrawn: !!consent.withdrawnAt,
      expired: consent.expiresAt ? consent.expiresAt < new Date() : false,
      version: consent.version,
    };
  }

  async withdrawConsent(
    consentId: string,
    ipAddress?: string,
    performedBy?: string,
  ): Promise<DataConsent> {
    const consent = await this.prisma.dataConsent.update({
      where: { id: consentId },
      data: {
        consentGiven: false,
        withdrawnAt: new Date(),
      },
    });

    // Audit log
    await this.createAuditLog({
      entityType: 'CONSENT',
      entityId: consent.id,
      actionType: 'UPDATE',
      oldValue: { consentGiven: true, withdrawnAt: null },
      newValue: { consentGiven: false, withdrawnAt: consent.withdrawnAt },
      performedBy: performedBy || 'SYSTEM',
      ipAddress,
    });

    return consent as DataConsent;
  }

  // ==================== DATA DELETION REQUESTS ====================

  async createDeletionRequest(
    input: CreateDataDeletionRequestInput,
  ): Promise<DataDeletionRequest> {
    const request = await this.prisma.dataDeletionRequest.create({
      data: {
        leadId: input.leadId,
        email: input.email,
        requestType: input.requestType,
        requestedBy: input.requestedBy,
        requestedByEmail: input.requestedByEmail,
        ipAddress: input.ipAddress,
        reason: input.reason,
      },
    });

    // Audit log
    await this.createAuditLog({
      entityType: 'DATA_SUBJECT_REQUEST',
      entityId: request.id,
      actionType: 'CREATE',
      newValue: request,
      performedBy: input.requestedBy,
      ipAddress: input.ipAddress,
    });

    return request as DataDeletionRequest;
  }

  async getDeletionRequest(requestId: string): Promise<DataDeletionRequest | null> {
    return this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
      include: { auditLogs: true },
    }) as Promise<DataDeletionRequest | null>;
  }

  async verifyDeletionRequest(
    requestId: string,
    verifiedBy: string,
  ): Promise<DataDeletionRequest> {
    const request = await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Audit log
    await this.createAuditLog({
      entityType: 'DATA_SUBJECT_REQUEST',
      entityId: request.id,
      actionType: 'UPDATE',
      oldValue: { status: 'PENDING' },
      newValue: { status: 'VERIFIED' },
      performedBy: verifiedBy,
    });

    return request as DataDeletionRequest;
  }

  async processDeletionRequest(
    requestId: string,
    processedBy: string,
  ): Promise<void> {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Deletion request not found');
    }

    // Start processing
    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    // Delete lead data if leadId is provided
    if (request.leadId) {
      await this.prisma.lead.delete({
        where: { id: request.leadId },
      });

      // Audit log
      await this.createAuditLog({
        entityType: 'LEAD',
        entityId: request.leadId,
        actionType: 'DELETE',
        deletionRequestId: request.id,
        performedBy: processedBy,
        sensitiveFields: [
          'email',
          'phone',
          'firstName',
          'lastName',
          'street',
          'city',
          'state',
          'zipCode',
        ],
      });
    }

    // Update consent records
    if (request.email) {
      await this.prisma.dataConsent.updateMany({
        where: { email: request.email },
        data: { withdrawnAt: new Date() },
      });
    }

    // Mark as completed
    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  // ==================== AUDIT LOGS ====================

  async createAuditLog(input: {
    entityType: string;
    entityId: string;
    actionType: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    performedBy?: string;
    performedByRole?: string;
    ipAddress?: string;
    userAgent?: string;
    sensitiveFields?: string[];
    requestId?: string;
    sessionId?: string;
    deletionRequestId?: string;
  }): Promise<ComplianceAuditLog> {
    return this.prisma.complianceAuditLog.create({
      data: {
        entityType: input.entityType as any,
        entityId: input.entityId,
        actionType: input.actionType as any,
        oldValue: input.oldValue as any,
        newValue: input.newValue as any,
        performedBy: input.performedBy,
        performedByRole: input.performedByRole,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        sensitiveFields: input.sensitiveFields || [],
        requestId: input.requestId,
        sessionId: input.sessionId,
        deletionRequestId: input.deletionRequestId,
      },
    }) as Promise<ComplianceAuditLog>;
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<{
    logs: ComplianceAuditLog[];
    total: number;
  }> {
    const where: any = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters.actionType) {
      where.actionType = filters.actionType;
    }
    if (filters.performedBy) {
      where.performedBy = filters.performedBy;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }
    if (filters.requestId) {
      where.requestId = filters.requestId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.complianceAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.complianceAuditLog.count({ where }),
    ]);

    return {
      logs: logs as ComplianceAuditLog[],
      total,
    };
  }

  // ==================== COMPLIANCE REPORTS ====================

  async createReport(input: CreateComplianceReportInput): Promise<ComplianceReport> {
    const report = await this.prisma.complianceReport.create({
      data: {
        reportType: input.reportType,
        reportFormat: input.reportFormat,
        title: input.title,
        description: input.description,
        generatedBy: input.generatedBy,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        filters: input.filters as any,
      },
    });

    return report as ComplianceReport;
  }

  async generateReport(reportId: string): Promise<ComplianceReport> {
    const report = await this.prisma.complianceReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Update status to generating
    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: { status: 'GENERATING' },
    });

    // Generate report based on type
    const metrics = await this.generateReportMetrics(
      report.reportType,
      report.periodStart,
      report.periodEnd,
    );

    // Update report with metrics
    const updatedReport = await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        metrics: metrics as any,
        status: 'COMPLETED',
        publishedAt: new Date(),
      },
    });

    // Audit log
    await this.createAuditLog({
      entityType: 'REPORT',
      entityId: report.id,
      actionType: 'CREATE',
      newValue: updatedReport,
      performedBy: report.generatedBy,
    });

    return updatedReport as ComplianceReport;
  }

  private async generateReportMetrics(
    reportType: string,
    periodStart?: Date | null,
    periodEnd?: Date | null,
  ): Promise<Record<string, unknown>> {
    const dateFilter: any = {};
    if (periodStart) dateFilter.gte = periodStart;
    if (periodEnd) dateFilter.lte = periodEnd;

    switch (reportType) {
      case 'DATA_PROCESSING_REGISTRY':
        return {
          totalRecords: await this.prisma.lead.count({
            where: { createdAt: dateFilter },
          }),
          dataProcessors: ['Internal Systems', 'Cloud Services', 'Analytics Tools'],
          dataControllers: ['Insurance Lead Gen Platform'],
          purposes: ['Lead Management', 'Customer Service', 'Analytics'],
        };

      case 'DATA_SUBJECT_REQUESTS':
        const requests = await this.prisma.dataSubjectRequest.findMany({
          where: { createdAt: dateFilter },
        });
        return {
          totalRequests: requests.length,
          byStatus: this.groupBy(requests, 'status'),
          byType: this.groupBy(requests, 'requestType'),
          avgProcessingTime: this.calculateAvgProcessingTime(requests),
        };

      case 'CONSENT_REGISTRY':
        const consents = await this.prisma.dataConsent.findMany({
          where: { createdAt: dateFilter },
        });
        return {
          totalConsents: consents.length,
          byType: this.groupBy(consents, 'consentType'),
          activeConsents: consents.filter((c) => c.consentGiven && !c.withdrawnAt).length,
          withdrawnConsents: consents.filter((c) => c.withdrawnAt).length,
        };

      case 'AUDIT_LOG_REPORT':
        const logs = await this.prisma.complianceAuditLog.findMany({
          where: { createdAt: dateFilter },
        });
        return {
          totalLogs: logs.length,
          byAction: this.groupBy(logs, 'actionType'),
          byEntity: this.groupBy(logs, 'entityType'),
          byPerformer: this.groupBy(logs, 'performedBy'),
        };

      default:
        return {};
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAvgProcessingTime(requests: any[]): number {
    const completedRequests = requests.filter(
      (r) => r.completedAt && r.createdAt,
    );
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((acc, r) => {
      return acc + (new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime());
    }, 0);

    return totalTime / completedRequests.length / (1000 * 60 * 60 * 24); // in days
  }

  // ==================== DATA RETENTION POLICIES ====================

  async createRetentionPolicy(
    input: CreateDataRetentionPolicyInput,
  ): Promise<DataRetentionPolicy> {
    return this.prisma.dataRetentionPolicy.create({
      data: {
        entityType: input.entityType as any,
        retentionPeriod: input.retentionPeriod,
        action: input.action as any,
        condition: input.condition,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 0,
        createdBy: input.createdBy,
      },
    }) as Promise<DataRetentionPolicy>;
  }

  async applyRetentionPolicy(policyId: string): Promise<DataRetentionPolicy> {
    const policy = await this.prisma.dataRetentionPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Retention policy not found');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    let recordsDeleted = 0;
    let recordsProcessed = 0;

    // Apply policy based on entity type
    switch (policy.entityType) {
      case 'LEAD':
        const leads = await this.prisma.lead.findMany({
          where: {
            createdAt: { lt: cutoffDate },
            status: 'CONVERTED', // Only delete converted leads
          },
        });

        for (const lead of leads) {
          await this.prisma.lead.delete({ where: { id: lead.id } });
          recordsDeleted++;
        }
        recordsProcessed = leads.length;
        break;

      // Add more entity types as needed
    }

    // Update policy stats
    const updatedPolicy = await this.prisma.dataRetentionPolicy.update({
      where: { id: policyId },
      data: {
        lastRunAt: new Date(),
        recordsProcessed,
        recordsDeleted,
        nextRunAt: this.calculateNextRunDate(),
      },
    });

    return updatedPolicy as DataRetentionPolicy;
  }

  private calculateNextRunDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Run daily
    return date;
  }

  // ==================== COMPLIANCE VIOLATIONS ====================

  async createViolation(input: CreateComplianceViolationInput): Promise<ComplianceViolation> {
    return this.prisma.complianceViolation.create({
      data: {
        violationType: input.violationType as any,
        severity: input.severity as any,
        description: input.description,
        entityId: input.entityId,
        entityType: input.entityType as any,
        detectedBy: input.detectedBy,
        detectionMethod: input.detectionMethod,
        affectedRecords: input.affectedRecords,
        riskScore: input.riskScore,
        notes: input.notes,
      },
    }) as Promise<ComplianceViolation>;
  }

  async remediateViolation(
    violationId: string,
    action: string,
    remediatedBy: string,
  ): Promise<ComplianceViolation> {
    return this.prisma.complianceViolation.update({
      where: { id: violationId },
      data: {
        remediationAction: action,
        remediationStatus: 'COMPLETED',
        remediatedAt: new Date(),
        remediatedBy,
      },
    }) as Promise<ComplianceViolation>;
  }

  // ==================== DATA SUBJECT REQUESTS ====================

  async createDataSubjectRequest(
    input: CreateDataSubjectRequestInput,
  ): Promise<DataSubjectRequest> {
    return this.prisma.dataSubjectRequest.create({
      data: {
        leadId: input.leadId,
        email: input.email,
        requestType: input.requestType as any,
        verificationData: input.verificationData as any,
        requestData: input.requestData as any,
        ipAddress: input.ipAddress,
        requestedBy: input.requestedBy,
      },
    }) as Promise<DataSubjectRequest>;
  }

  async getComplianceMetrics(): Promise<ComplianceMetrics> {
    const [
      totalAuditLogs,
      activeConsents,
      pendingDeletionRequests,
      openViolations,
      activePolicies,
      reportsGenerated,
    ] = await Promise.all([
      this.prisma.complianceAuditLog.count(),
      this.prisma.dataConsent.count({
        where: { consentGiven: true, withdrawnAt: null },
      }),
      this.prisma.dataDeletionRequest.count({
        where: { status: { in: ['PENDING', 'VERIFIED', 'PROCESSING'] } },
      }),
      this.prisma.complianceViolation.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.dataRetentionPolicy.count({ where: { isActive: true } }),
      this.prisma.complianceReport.count(),
    ]);

    const completedRequests = await this.prisma.dataSubjectRequest.findMany({
      where: { completedAt: { not: null }, createdAt: { not: null } },
    });

    const avgProcessingTime = this.calculateAvgProcessingTime(completedRequests);

    // Calculate compliance score (0-100)
    const complianceScore = this.calculateComplianceScore({
      activeConsents,
      pendingDeletionRequests,
      openViolations,
    });

    return {
      totalAuditLogs,
      activeConsents,
      pendingDeletionRequests,
      openViolations,
      activePolicies,
      reportsGenerated,
      avgProcessingTime,
      complianceScore,
    };
  }

  private calculateComplianceScore(metrics: {
    activeConsents: number;
    pendingDeletionRequests: number;
    openViolations: number;
  }): number {
    let score = 100;

    // Deduct points for open violations
    score -= metrics.openViolations * 10;

    // Deduct points for overdue deletion requests (over 30 days)
    const overdueRequests = Math.max(0, metrics.pendingDeletionRequests);
    score -= overdueRequests * 5;

    return Math.max(0, score);
  }
}
