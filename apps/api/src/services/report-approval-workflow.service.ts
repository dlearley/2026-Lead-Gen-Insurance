import { PrismaClient } from '@prisma/client';
import {
  type ApprovalEvent,
  type WorkflowInstance,
  type WorkflowStatus,
} from './regulatory-reporting.service-types.js';

export class ReportApprovalWorkflowService {
  constructor(private readonly prisma: PrismaClient) {}

  async initiateApproval(reportId: string): Promise<WorkflowInstance> {
    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: { status: 'Review' },
    });

    await this.writeAuditMetric(reportId, 'ApprovalInitiated', { reportId });

    return { reportId, status: 'Review' };
  }

  async submitApproval(
    reportId: string,
    approver: string,
    decision: 'Approved' | 'Rejected',
    notes?: string,
  ): Promise<void> {
    if (decision === 'Approved') {
      await this.prisma.complianceReport.update({
        where: { id: reportId },
        data: { status: 'Approved', approvedBy: approver, approvedDate: new Date() },
      });
    } else {
      await this.prisma.complianceReport.update({
        where: { id: reportId },
        data: { status: 'Draft' },
      });
    }

    await this.writeAuditMetric(reportId, `Approval${decision}`, { reportId, approver, decision, notes });
  }

  async escalateApproval(reportId: string): Promise<void> {
    await this.writeAuditMetric(reportId, 'ApprovalEscalated', { reportId });
  }

  async getApprovalStatus(reportId: string): Promise<WorkflowStatus> {
    const report = await this.prisma.complianceReport.findUniqueOrThrow({ where: { id: reportId } });
    return {
      reportId,
      status: report.status,
      pendingApprovers: report.status === 'Review' ? ['compliance_officer'] : [],
    };
  }

  async getApprovalHistory(reportId: string): Promise<ApprovalEvent[]> {
    const metrics = await this.prisma.complianceReportMetrics.findMany({
      where: {
        reportId,
        metricType: { startsWith: 'Approval' },
      },
      orderBy: { createdAt: 'asc' },
    });

    return metrics.map((m) => {
      const data = safeParseJson<Record<string, unknown>>(m.data) ?? {};
      return {
        at: m.createdAt,
        by: (data.approver as string | undefined) ?? 'system',
        decision: (data.decision as string | undefined) ?? m.metricType,
        notes: data.notes as string | undefined,
      };
    });
  }

  private async writeAuditMetric(reportId: string, metricType: string, data: unknown): Promise<void> {
    await this.prisma.complianceReportMetrics.create({
      data: {
        reportId,
        metricType,
        data: JSON.stringify(data),
      },
    });

    // Best-effort event mirroring (some deployments use Event for lead-only events).
    try {
      await this.prisma.event.create({
        data: {
          type: `regulatory.approval.${metricType}`,
          source: 'api',
          entityType: 'ComplianceReport',
          entityId: reportId,
          data: data as any,
        },
      });
    } catch {
      // ignore
    }
  }
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
