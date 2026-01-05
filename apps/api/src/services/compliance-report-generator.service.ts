import { randomUUID } from 'crypto';
import { PrismaClient, type ComplianceReport } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import {
  type DateRange,
  type Metrics,
  type ReportOptions,
  type RemediationStatus,
  type Timeline,
  type ViolationSummary,
} from './regulatory-reporting.service-types.js';

export type RegulatoryEventPublisher = {
  publish: (topic: string, data: unknown) => Promise<void>;
};

export class ComplianceReportGeneratorService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher?: RegulatoryEventPublisher,
  ) {}

  async generateComplianceReport(
    reportType: string,
    jurisdiction: string,
    dateRange: DateRange,
    options: ReportOptions = {},
  ): Promise<ComplianceReport> {
    const metrics = await this.compileReportMetrics(reportType, dateRange);
    const violations = await this.compileViolationSummary(dateRange);
    const remediation = await this.compileRemediationStatus();
    const timeline = await this.compileComplianceTimeline(dateRange);

    const reportId = options.reportPeriod
      ? `CR-${jurisdiction}-${reportType}-${options.reportPeriod}-${randomUUID().slice(0, 8)}`
      : `CR-${jurisdiction}-${reportType}-${randomUUID().slice(0, 8)}`;

    const title = options.title ?? `${reportType} Compliance Report (${jurisdiction})`;
    const summary =
      options.summary ??
      `Report generated for ${jurisdiction} covering ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}.`;

    const reportContent = JSON.stringify(
      {
        title,
        summary,
        reportType,
        jurisdiction,
        dateRange,
        metrics,
        violations,
        remediation,
        timeline,
      },
      null,
      2,
    );

    const report = await this.prisma.complianceReport.create({
      data: {
        reportId,
        reportType,
        jurisdiction,
        reportPeriod:
          options.reportPeriod ??
          `${dateRange.startDate.getUTCFullYear()}-${String(dateRange.startDate.getUTCMonth() + 1).padStart(2, '0')}`,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        title,
        summary,
        reportContent,
        attachments: options.attachments ?? [],
        metrics: JSON.stringify(metrics),
        keyFindings: violations.keyFindings,
        violations: violations.violations,
        violations_critical: violations.critical,
        violations_high: violations.high,
        violations_medium: violations.medium,
        violations_low: violations.low,
        remediationActions: remediation.actions,
        completedRemediation: remediation.completed,
        pendingRemediation: remediation.pending,
        status: 'Draft',
        generateType: options.generateType ?? 'Manual',
        generatedBy: options.generatedBy ?? 'system',
      },
    });

    await this.prisma.complianceReportMetrics.create({
      data: {
        reportId: report.id,
        metricType: 'Summary',
        data: JSON.stringify({ metrics, violations, remediation, timeline }),
      },
    });

    try {
      await this.publisher?.publish('regulatory.report.generated', {
        id: report.id,
        reportId: report.reportId,
        reportType: report.reportType,
        jurisdiction: report.jurisdiction,
        generatedDate: report.generatedDate,
      });
    } catch (error) {
      logger.warn('Failed to publish report.generated event', { error });
    }

    return report;
  }

  async generateAnnualComplianceReport(year: number, jurisdiction: string): Promise<ComplianceReport> {
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    return this.generateComplianceReport('AnnualCompliance', jurisdiction, { startDate, endDate }, { reportPeriod: `${year}` });
  }

  async generateQuarterlyReport(
    quarter: number,
    year: number,
    jurisdiction: string,
  ): Promise<ComplianceReport> {
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(Date.UTC(year, startMonth, 1));
    const endDate = new Date(Date.UTC(year, startMonth + 3, 1));

    return this.generateComplianceReport('QuarterlyAudit', jurisdiction, { startDate, endDate }, { reportPeriod: `${year}-Q${quarter}` });
  }

  async generateViolationReport(dateRange: DateRange): Promise<ComplianceReport> {
    return this.generateComplianceReport('ViolationSummary', 'Federal', dateRange);
  }

  async generateDataAccessReport(dateRange: DateRange): Promise<ComplianceReport> {
    return this.generateComplianceReport('DataAccess', 'Federal', dateRange);
  }

  async generateFairLendingReport(period: string): Promise<ComplianceReport> {
    const [year, month] = period.split('-').map((v) => Number(v));
    const startDate = new Date(Date.UTC(year, (month || 1) - 1, 1));
    const endDate = new Date(Date.UTC(year, month || 1, 1));

    return this.generateComplianceReport('FairLending', 'Federal', { startDate, endDate }, { reportPeriod: period });
  }

  async compileReportMetrics(reportType: string, dateRange: DateRange): Promise<Metrics> {
    const [leadsCreated, eventsCreated] = await Promise.all([
      this.prisma.lead.count({
        where: {
          createdAt: {
            gte: dateRange.startDate,
            lt: dateRange.endDate,
          },
        },
      }),
      this.prisma.event.count({
        where: {
          timestamp: {
            gte: dateRange.startDate,
            lt: dateRange.endDate,
          },
        },
      }),
    ]);

    return {
      reportType,
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      leadsCreated,
      eventsCreated,
    };
  }

  async compileViolationSummary(dateRange: DateRange): Promise<ViolationSummary> {
    const violations = await this.prisma.event.count({
      where: {
        type: {
          contains: 'violation',
          mode: 'insensitive',
        },
        timestamp: {
          gte: dateRange.startDate,
          lt: dateRange.endDate,
        },
      },
    });

    return {
      violations,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      keyFindings: violations > 0 ? ['Potential violation signals detected in event stream'] : [],
    };
  }

  async compileRemediationStatus(): Promise<RemediationStatus> {
    return {
      completed: 0,
      pending: 0,
    };
  }

  async compileComplianceTimeline(dateRange: DateRange): Promise<Timeline> {
    const days = Math.max(
      1,
      Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (24 * 60 * 60 * 1000)),
    );

    const timeline: Timeline = [];

    for (let i = 0; i < Math.min(days, 31); i += 1) {
      const dayStart = new Date(dateRange.startDate);
      dayStart.setUTCDate(dayStart.getUTCDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      // eslint-disable-next-line no-await-in-loop
      const events = await this.prisma.event.count({
        where: {
          timestamp: { gte: dayStart, lt: dayEnd },
        },
      });

      timeline.push({ date: dayStart.toISOString().slice(0, 10), events });
    }

    return timeline;
  }

  async submitForApproval(reportId: string): Promise<void> {
    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: { status: 'Review' },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.report.submitted_for_approval',
          source: 'api',
          entityType: 'ComplianceReport',
          entityId: reportId,
          data: { reportId },
        },
      });
    } catch (error) {
      logger.warn('Failed to write report approval submission event', { error });
    }
  }

  async approveReport(reportId: string, approver: string, notes?: string): Promise<void> {
    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        status: 'Approved',
        approvedBy: approver,
        approvedDate: new Date(),
      },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.report.approved',
          source: 'api',
          entityType: 'ComplianceReport',
          entityId: reportId,
          data: { reportId, approver, notes },
        },
      });
    } catch (error) {
      logger.warn('Failed to write report approved event', { error });
    }
  }

  async rejectReport(reportId: string, reason: string): Promise<void> {
    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        status: 'Draft',
      },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.report.rejected',
          source: 'api',
          entityType: 'ComplianceReport',
          entityId: reportId,
          data: { reportId, reason },
        },
      });
    } catch (error) {
      logger.warn('Failed to write report rejected event', { error });
    }
  }
}
