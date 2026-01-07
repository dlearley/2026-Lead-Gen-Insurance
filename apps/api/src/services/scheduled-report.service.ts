import { PrismaClient, type ScheduledReport } from '@prisma/client';
import { ComplianceReportGeneratorService } from './compliance-report-generator.service.js';
import { RegulatorySubmissionService } from './regulatory-submission.service.js';
import {
  type ExecutionResult,
  type ScheduleOptions,
  type ScheduleResult,
} from './regulatory-reporting.service-types.js';

export class ScheduledReportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly generator: ComplianceReportGeneratorService,
    private readonly submissionService: RegulatorySubmissionService,
  ) {}

  async scheduleReport(reportType: string, frequency: string, options: ScheduleOptions): Promise<ScheduleResult> {
    const schedule = await this.prisma.scheduledReport.upsert({
      where: { reportType_jurisdiction: { reportType, jurisdiction: options.jurisdiction } },
      update: {
        frequency,
        schedule: options.schedule,
        nextRunDate: options.nextRunDate,
        autoGenerate: options.autoGenerate ?? true,
        autoSubmit: options.autoSubmit ?? false,
        requireApproval: options.requireApproval ?? true,
        notifyOn: options.notifyOn ?? [],
        status: 'Active',
      },
      create: {
        reportType,
        jurisdiction: options.jurisdiction,
        frequency,
        schedule: options.schedule,
        nextRunDate: options.nextRunDate,
        autoGenerate: options.autoGenerate ?? true,
        autoSubmit: options.autoSubmit ?? false,
        requireApproval: options.requireApproval ?? true,
        notifyOn: options.notifyOn ?? [],
        status: 'Active',
      },
    });

    return { scheduleId: schedule.id, nextRunDate: schedule.nextRunDate };
  }

  async executeScheduledReports(): Promise<ExecutionResult> {
    const now = new Date();
    const schedules = await this.prisma.scheduledReport.findMany({
      where: {
        status: 'Active',
        autoGenerate: true,
        nextRunDate: { lte: now },
      },
    });

    let generated = 0;
    let submitted = 0;
    let failures = 0;

    for (const schedule of schedules) {
      try {
        const startDate = schedule.lastRunDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const endDate = now;

        const report = await this.generator.generateComplianceReport(
          schedule.reportType,
          schedule.jurisdiction,
          { startDate, endDate },
          { generateType: 'Scheduled', generatedBy: 'scheduler' },
        );

        generated += 1;

        if (schedule.autoSubmit && !schedule.requireApproval) {
          await this.submissionService.submitReport(report.id, {
            regulatoryBody: 'AUTO',
            jurisdiction: schedule.jurisdiction,
            submissionUrl: 'scheduled://auto',
            submissionMethod: 'API',
            submittedBy: 'scheduler',
          });
          submitted += 1;
        }

        await this.prisma.scheduledReport.update({
          where: { id: schedule.id },
          data: {
            lastRunDate: now,
            nextRunDate: computeNextRunDate(schedule, now),
          },
        });
      } catch {
        failures += 1;
      }
    }

    return {
      executed: schedules.length,
      generated,
      submitted,
      failures,
    };
  }

  async getSchedule(reportType: string, jurisdiction: string): Promise<ScheduledReport | null> {
    return this.prisma.scheduledReport.findUnique({
      where: { reportType_jurisdiction: { reportType, jurisdiction } },
    });
  }

  async updateSchedule(scheduleId: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    return this.prisma.scheduledReport.update({
      where: { id: scheduleId },
      data: updates,
    });
  }

  async pauseSchedule(scheduleId: string): Promise<void> {
    await this.prisma.scheduledReport.update({ where: { id: scheduleId }, data: { status: 'Paused' } });
  }

  async resumeSchedule(scheduleId: string): Promise<void> {
    await this.prisma.scheduledReport.update({ where: { id: scheduleId }, data: { status: 'Active' } });
  }
}

function computeNextRunDate(schedule: ScheduledReport, base: Date): Date {
  const next = new Date(base);
  switch (schedule.frequency) {
    case 'Monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case 'Quarterly':
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case 'Annual':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
    default:
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
  }
}
