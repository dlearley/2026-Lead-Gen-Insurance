import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { ScheduledReportService } from '../scheduled-report.service.js';

describe('ScheduledReportService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      scheduledReport: {
        upsert: jest.fn(async ({ create }: any) => ({ id: 'sch_1', ...create })),
        findMany: jest.fn(async () => [
          {
            id: 'sch_1',
            reportType: 'AnnualCompliance',
            jurisdiction: 'Federal',
            schedule: '* * * * *',
            frequency: 'Monthly',
            nextRunDate: new Date('2026-01-01T00:00:00.000Z'),
            lastRunDate: null,
            autoGenerate: true,
            autoSubmit: true,
            requireApproval: false,
            notifyOn: [],
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        update: jest.fn(async () => ({ id: 'sch_1' })),
        findUnique: jest.fn(async () => null),
      },
    } as unknown as PrismaClient;
  });

  it('schedules a report', async () => {
    const generator: any = { generateComplianceReport: jest.fn(async () => ({ id: 'rep_1' })) };
    const submission: any = { submitReport: jest.fn(async () => ({ submissionId: 'sub_1', status: 'Submitted' })) };

    const svc = new ScheduledReportService(prisma, generator, submission);

    const result = await svc.scheduleReport('AnnualCompliance', 'Monthly', {
      jurisdiction: 'Federal',
      schedule: '0 0 1 * *',
      nextRunDate: new Date('2026-02-01T00:00:00.000Z'),
    });

    expect(result.scheduleId).toBe('sch_1');
    expect((prisma.scheduledReport.upsert as any) as jest.Mock).toHaveBeenCalled();
  });

  it('executes schedules and auto-submits when configured', async () => {
    const generator: any = {
      generateComplianceReport: jest.fn(async () => ({ id: 'rep_1' })),
    };
    const submission: any = {
      submitReport: jest.fn(async () => ({ submissionId: 'sub_1', status: 'Submitted' })),
    };

    const svc = new ScheduledReportService(prisma, generator, submission);

    const result = await svc.executeScheduledReports();

    expect(result.executed).toBe(1);
    expect(generator.generateComplianceReport).toHaveBeenCalled();
    expect(submission.submitReport).toHaveBeenCalled();
  });
});
