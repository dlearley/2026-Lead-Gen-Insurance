import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { ComplianceReportGeneratorService } from '../compliance-report-generator.service.js';

describe('ComplianceReportGeneratorService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      lead: {
        count: jest.fn(async () => 10),
      },
      event: {
        count: jest.fn(async () => 0),
        create: jest.fn(async () => ({ id: 'evt_1' })),
      },
      complianceReport: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'rep_1',
          reportId: data.reportId,
          reportType: data.reportType,
          jurisdiction: data.jurisdiction,
          reportPeriod: data.reportPeriod,
          startDate: data.startDate,
          endDate: data.endDate,
          title: data.title,
          summary: data.summary,
          reportContent: data.reportContent,
          attachments: data.attachments,
          metrics: data.metrics,
          keyFindings: data.keyFindings,
          violations: data.violations,
          violations_critical: data.violations_critical,
          violations_high: data.violations_high,
          violations_medium: data.violations_medium,
          violations_low: data.violations_low,
          remediationActions: data.remediationActions,
          completedRemediation: data.completedRemediation,
          pendingRemediation: data.pendingRemediation,
          status: data.status,
          generatedDate: new Date(),
          approvedDate: null,
          approvedBy: null,
          submittedDate: null,
          submittedTo: null,
          submissionRef: null,
          generateType: data.generateType,
          generatedBy: data.generatedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn(async () => ({ id: 'rep_1' })),
      },
      complianceReportMetrics: {
        create: jest.fn(async () => ({ id: 'crm_1' })),
      },
    } as unknown as PrismaClient;
  });

  it('generates a compliance report and persists it', async () => {
    const svc = new ComplianceReportGeneratorService(prisma);

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    const report = await svc.generateComplianceReport('AnnualCompliance', 'Federal', { startDate, endDate });

    expect(report.id).toBe('rep_1');
    expect(report.reportType).toBe('AnnualCompliance');
    expect(report.jurisdiction).toBe('Federal');
    expect((prisma.complianceReport.create as any) as jest.Mock).toHaveBeenCalled();
    expect((prisma.complianceReportMetrics.create as any) as jest.Mock).toHaveBeenCalled();
  });

  it('updates approval status', async () => {
    const svc = new ComplianceReportGeneratorService(prisma);

    await svc.approveReport('rep_1', 'alice', 'ok');

    expect((prisma.complianceReport.update as any) as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rep_1' },
        data: expect.objectContaining({ status: 'Approved', approvedBy: 'alice' }),
      }),
    );
  });
});
