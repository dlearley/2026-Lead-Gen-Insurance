import { prisma } from '../db/prisma.js';
import { ComplianceReportGeneratorService } from '../services/compliance-report-generator.service.js';
import { RegulatorySubmissionService } from '../services/regulatory-submission.service.js';
import { ScheduledReportService } from '../services/scheduled-report.service.js';

export async function runReportSchedulerJob(): Promise<{ executed: number; generated: number; submitted: number; failures: number }> {
  const generator = new ComplianceReportGeneratorService(prisma);
  const submissionService = new RegulatorySubmissionService(prisma);
  const scheduler = new ScheduledReportService(prisma, generator, submissionService);

  return scheduler.executeScheduledReports();
}
