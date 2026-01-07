import { PrismaClient } from '@prisma/client';
import {
  DataConsent,
  DataDeletionRequest,
  ComplianceAuditLog,
  ComplianceReport,
  DataRetentionPolicy,
  ComplianceViolation,
  DataSubjectRequest,
  ConsentType,
  DeletionRequestStatus,
  ReportStatus,
  ViolationStatus,
  DataSubjectRequestStatus,
} from '@insurancereport/types';

export class ComplianceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ==================== CONSENT METHODS ====================

  async findConsentById(id: string): Promise<DataConsent | null> {
    return this.prisma.dataConsent.findUnique({
      where: { id },
    }) as Promise<DataConsent | null>;
  }

  async findConsentsByLeadId(leadId: string): Promise<DataConsent[]> {
    return this.prisma.dataConsent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataConsent[]>;
  }

  async findConsentsByEmail(email: string): Promise<DataConsent[]> {
    return this.prisma.dataConsent.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataConsent[]>;
  }

  async findLatestValidConsent(
    email: string,
    consentType: ConsentType,
  ): Promise<DataConsent | null> {
    return this.prisma.dataConsent.findFirst({
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
    }) as Promise<DataConsent | null>;
  }

  async countConsentsByType(consentType: ConsentType): Promise<number> {
    return this.prisma.dataConsent.count({
      where: { consentType, consentGiven: true, withdrawnAt: null },
    });
  }

  // ==================== DELETION REQUEST METHODS ====================

  async findDeletionRequestById(id: string): Promise<DataDeletionRequest | null> {
    return this.prisma.dataDeletionRequest.findUnique({
      where: { id },
      include: { auditLogs: true },
    }) as Promise<DataDeletionRequest | null>;
  }

  async findDeletionRequestsByLeadId(leadId: string): Promise<DataDeletionRequest[]> {
    return this.prisma.dataDeletionRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataDeletionRequest[]>;
  }

  async findDeletionRequestsByEmail(email: string): Promise<DataDeletionRequest[]> {
    return this.prisma.dataDeletionRequest.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataDeletionRequest[]>;
  }

  async findPendingDeletionRequests(): Promise<DataDeletionRequest[]> {
    return this.prisma.dataDeletionRequest.findMany({
      where: { status: DeletionRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    }) as Promise<DataDeletionRequest[]>;
  }

  async countDeletionRequestsByStatus(
    status: DeletionRequestStatus,
  ): Promise<number> {
    return this.prisma.dataDeletionRequest.count({
      where: { status },
    });
  }

  // ==================== AUDIT LOG METHODS ====================

  async findAuditLogs(params: {
    entityType?: string;
    entityId?: string;
    actionType?: string;
    performedBy?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: ComplianceAuditLog[]; total: number }> {
    const where: any = {};

    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.entityId) {
      where.entityId = params.entityId;
    }
    if (params.actionType) {
      where.actionType = params.actionType;
    }
    if (params.performedBy) {
      where.performedBy = params.performedBy;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.complianceAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      this.prisma.complianceAuditLog.count({ where }),
    ]);

    return {
      logs: logs as ComplianceAuditLog[],
      total,
    };
  }

  async findAuditLogsByRequestId(requestId: string): Promise<ComplianceAuditLog[]> {
    return this.prisma.complianceAuditLog.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ComplianceAuditLog[]>;
  }

  async countAuditLogsByActionType(actionType: string): Promise<number> {
    return this.prisma.complianceAuditLog.count({
      where: { actionType },
    });
  }

  // ==================== REPORT METHODS ====================

  async findReportById(id: string): Promise<ComplianceReport | null> {
    return this.prisma.report.findUnique({
      where: { id },
    }) as Promise<ComplianceReport | null>;
  }

  async findReportsByType(reportType: string): Promise<ComplianceReport[]> {
    return this.prisma.complianceReport.findMany({
      where: { reportType },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ComplianceReport[]>;
  }

  async findReportsByStatus(status: ReportStatus): Promise<ComplianceReport[]> {
    return this.prisma.complianceReport.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ComplianceReport[]>;
  }

  async findPendingReports(): Promise<ComplianceReport[]> {
    return this.prisma.complianceReport.findMany({
      where: { status: ReportStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ComplianceReport[]>;
  }

  async countReportsByType(reportType: string): Promise<number> {
    return this.prisma.complianceReport.count({
      where: { reportType },
    });
  }

  // ==================== RETENTION POLICY METHODS ====================

  async findRetentionPolicyById(id: string): Promise<DataRetentionPolicy | null> {
    return this.prisma.dataRetentionPolicy.findUnique({
      where: { id },
    }) as Promise<DataRetentionPolicy | null>;
  }

  async findActiveRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return this.prisma.dataRetentionPolicy.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { nextRunAt: 'asc' }],
    }) as Promise<DataRetentionPolicy[]>;
  }

  async findDueRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return this.prisma.dataRetentionPolicy.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
      orderBy: [{ priority: 'desc' }, { nextRunAt: 'asc' }],
    }) as Promise<DataRetentionPolicy[]>;
  }

  async findRetentionPoliciesByEntityType(
    entityType: string,
  ): Promise<DataRetentionPolicy[]> {
    return this.prisma.dataRetentionPolicy.findMany({
      where: { entityType },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataRetentionPolicy[]>;
  }

  // ==================== VIOLATION METHODS ====================

  async findViolationById(id: string): Promise<ComplianceViolation | null> {
    return this.prisma.complianceViolation.findUnique({
      where: { id },
    }) as Promise<ComplianceViolation | null>;
  }

  async findViolationsBySeverity(
    severity: string,
  ): Promise<ComplianceViolation[]> {
    return this.prisma.complianceViolation.findMany({
      where: { severity },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ComplianceViolation[]>;
  }

  async findViolationsByStatus(status: ViolationStatus): Promise<ComplianceViolation[]> {
    return this.prisma.complianceViolation.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ComplianceViolation[]>;
  }

  async findOpenViolations(): Promise<ComplianceViolation[]> {
    return this.prisma.complianceViolation.findMany({
      where: { status: { in: [ViolationStatus.OPEN, ViolationStatus.IN_PROGRESS] } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    }) as Promise<ComplianceViolation[]>;
  }

  async findCriticalViolations(): Promise<ComplianceViolation[]> {
    return this.prisma.complianceViolation.findMany({
      where: {
        severity: 'CRITICAL',
        status: { in: [ViolationStatus.OPEN, ViolationStatus.IN_PROGRESS] },
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ComplianceViolation[]>;
  }

  async countViolationsByStatus(status: ViolationStatus): Promise<number> {
    return this.prisma.complianceViolation.count({
      where: { status },
    });
  }

  // ==================== DATA SUBJECT REQUEST METHODS ====================

  async findDataSubjectRequestById(id: string): Promise<DataSubjectRequest | null> {
    return this.prisma.dataSubjectRequest.findUnique({
      where: { id },
    }) as Promise<DataSubjectRequest | null>;
  }

  async findDataSubjectRequestsByLeadId(leadId: string): Promise<DataSubjectRequest[]> {
    return this.prisma.dataSubjectRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataSubjectRequest[]>;
  }

  async findDataSubjectRequestsByEmail(email: string): Promise<DataSubjectRequest[]> {
    return this.prisma.dataSubjectRequest.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    }) as Promise<DataSubjectRequest[]>;
  }

  async findPendingDataSubjectRequests(): Promise<DataSubjectRequest[]> {
    return this.prisma.dataSubjectRequest.findMany({
      where: { status: DataSubjectRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    }) as Promise<DataSubjectRequest[]>;
  }

  async findVerifiedDataSubjectRequests(): Promise<DataSubjectRequest[]> {
    return this.prisma.dataSubjectRequest.findMany({
      where: { status: DataSubjectRequestStatus.VERIFIED },
      orderBy: { createdAt: 'asc' },
    }) as Promise<DataSubjectRequest[]>;
  }

  async countDataSubjectRequestsByStatus(
    status: DataSubjectRequestStatus,
  ): Promise<number> {
    return this.prisma.dataSubjectRequest.count({
      where: { status },
    });
  }

  // ==================== AGGREGATION METHODS ====================

  async getComplianceSummary() {
    const [
      totalAuditLogs,
      activeConsents,
      pendingDeletionRequests,
      openViolations,
      activePolicies,
      reportsGenerated,
      pendingDataSubjectRequests,
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
      this.prisma.dataSubjectRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      totalAuditLogs,
      activeConsents,
      pendingDeletionRequests,
      openViolations,
      activePolicies,
      reportsGenerated,
      pendingDataSubjectRequests,
    };
  }

  async getConsentDistribution() {
    const consents = await this.prisma.dataConsent.findMany();

    const distribution = consents.reduce(
      (acc, consent) => {
        const type = consent.consentType;
        if (!acc[type]) {
          acc[type] = { total: 0, active: 0, withdrawn: 0 };
        }
        acc[type].total++;
        if (consent.consentGiven && !consent.withdrawnAt) {
          acc[type].active++;
        }
        if (consent.withdrawnAt) {
          acc[type].withdrawn++;
        }
        return acc;
      },
      {} as Record<string, { total: number; active: number; withdrawn: number }>,
    );

    return distribution;
  }

  async getViolationDistribution() {
    const violations = await this.prisma.complianceViolation.findMany();

    const bySeverity = violations.reduce(
      (acc, violation) => {
        const severity = violation.severity;
        if (!acc[severity]) {
          acc[severity] = 0;
        }
        acc[severity]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byType = violations.reduce(
      (acc, violation) => {
        const type = violation.violationType;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { bySeverity, byType };
  }
}
