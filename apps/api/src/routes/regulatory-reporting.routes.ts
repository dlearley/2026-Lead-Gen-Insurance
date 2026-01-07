import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import { prisma as defaultPrisma } from '../db/prisma.js';
import { ComplianceReportGeneratorService } from '../services/compliance-report-generator.service.js';
import { BreachNotificationService } from '../services/breach-notification.service.js';
import { RegulatorySubmissionService } from '../services/regulatory-submission.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';
import { ScheduledReportService } from '../services/scheduled-report.service.js';
import { RegulatoryCalendarService } from '../services/regulatory-calendar.service.js';
import { ReportApprovalWorkflowService } from '../services/report-approval-workflow.service.js';
import { ReportExportService } from '../services/report-export.service.js';

type Deps = {
  prisma?: PrismaClient;
  generator?: ComplianceReportGeneratorService;
  breachService?: BreachNotificationService;
  submissionService?: RegulatorySubmissionService;
  templateService?: ReportTemplateService;
  scheduledReportService?: ScheduledReportService;
  calendarService?: RegulatoryCalendarService;
  approvalWorkflowService?: ReportApprovalWorkflowService;
  reportExportService?: ReportExportService;
};

export function createRegulatoryReportingRouter(deps: Deps = {}): Router {
  const router = Router();

  const prisma = deps.prisma ?? defaultPrisma;

  const generator = deps.generator ?? new ComplianceReportGeneratorService(prisma);
  const submissionService = deps.submissionService ?? new RegulatorySubmissionService(prisma);
  const templateService = deps.templateService ?? new ReportTemplateService(prisma);
  const approvalWorkflowService = deps.approvalWorkflowService ?? new ReportApprovalWorkflowService(prisma);
  const calendarService = deps.calendarService ?? new RegulatoryCalendarService(prisma);
  const reportExportService = deps.reportExportService ?? new ReportExportService(prisma);
  const breachService = deps.breachService ?? new BreachNotificationService(prisma);
  const scheduledReportService =
    deps.scheduledReportService ?? new ScheduledReportService(prisma, generator, submissionService);

  const config = getConfig();
  const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}`;

  // ========================================
  // Report Generation
  // ========================================

  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const { jurisdiction, reportType, status, limit } = req.query;
      const reports = await prisma.complianceReport.findMany({
        where: {
          jurisdiction: typeof jurisdiction === 'string' ? jurisdiction : undefined,
          reportType: typeof reportType === 'string' ? reportType : undefined,
          status: typeof status === 'string' ? status : undefined,
        },
        orderBy: { generatedDate: 'desc' },
        take: typeof limit === 'string' ? Number(limit) : 50,
      });

      res.json({ data: reports });
    } catch (error) {
      logger.error('Failed to list compliance reports', { error });
      res.status(500).json({ error: 'Failed to list reports' });
    }
  });

  router.post('/reports/generate', async (req: Request, res: Response) => {
    try {
      const body = req.body as any;

      const looksLikeRegulatory =
        typeof body?.reportType === 'string' &&
        typeof body?.jurisdiction === 'string' &&
        (body?.dateRange || (body?.startDate && body?.endDate));

      if (!looksLikeRegulatory) {
        const response = await fetch(`${DATA_SERVICE_URL}/api/v1/reports/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });

        if (response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json();
          res.status(response.status).json(data);
        } else {
          const buffer = await response.arrayBuffer();
          res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
          res.set('Content-Disposition', response.headers.get('content-disposition') || '');
          res.send(Buffer.from(buffer));
        }
        return;
      }

      const dateRange = body.dateRange ?? { startDate: body.startDate, endDate: body.endDate };
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      const report = await generator.generateComplianceReport(body.reportType, body.jurisdiction, {
        startDate,
        endDate,
      });

      res.status(201).json(report);
    } catch (error) {
      logger.error('Failed to generate compliance report', { error });
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  router.get('/reports/:id', async (req: Request, res: Response) => {
    try {
      const report = await prisma.complianceReport.findUnique({ where: { id: req.params.id } });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json(report);
    } catch (error) {
      logger.error('Failed to fetch compliance report', { error });
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  });

  router.get('/reports/:id/download', async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string | undefined) ?? 'pdf';

      const buffer =
        format === 'xml'
          ? await reportExportService.exportToXML(req.params.id)
          : format === 'excel'
            ? await reportExportService.exportToExcel(req.params.id)
            : await reportExportService.exportToPDF(req.params.id);

      const contentType =
        format === 'xml'
          ? 'application/xml'
          : format === 'excel'
            ? 'text/csv'
            : 'application/pdf';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${req.params.id}.${format}"`);
      res.send(buffer);
    } catch (error) {
      logger.error('Failed to download compliance report', { error });
      res.status(500).json({ error: 'Failed to download report' });
    }
  });

  router.put('/reports/:id', async (req: Request, res: Response) => {
    try {
      const updated = await prisma.complianceReport.update({
        where: { id: req.params.id },
        data: {
          title: req.body.title,
          summary: req.body.summary,
          reportContent: req.body.reportContent,
          attachments: req.body.attachments,
          metrics: req.body.metrics,
          keyFindings: req.body.keyFindings,
          remediationActions: req.body.remediationActions,
          status: req.body.status,
        },
      });

      res.json(updated);
    } catch (error) {
      logger.error('Failed to update compliance report', { error });
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  // ========================================
  // Report Approval
  // ========================================

  router.post('/reports/:id/submit-approval', async (req: Request, res: Response) => {
    try {
      const workflow = await approvalWorkflowService.initiateApproval(req.params.id);
      res.json(workflow);
    } catch (error) {
      logger.error('Failed to submit report for approval', { error });
      res.status(500).json({ error: 'Failed to submit for approval' });
    }
  });

  router.put('/reports/:id/approve', async (req: Request, res: Response) => {
    try {
      await approvalWorkflowService.submitApproval(req.params.id, req.body.approver ?? 'unknown', 'Approved', req.body.notes);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to approve report', { error });
      res.status(500).json({ error: 'Failed to approve report' });
    }
  });

  router.put('/reports/:id/reject', async (req: Request, res: Response) => {
    try {
      await approvalWorkflowService.submitApproval(req.params.id, req.body.approver ?? 'unknown', 'Rejected', req.body.reason);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to reject report', { error });
      res.status(500).json({ error: 'Failed to reject report' });
    }
  });

  router.get('/reports/:id/approval-status', async (req: Request, res: Response) => {
    try {
      const status = await approvalWorkflowService.getApprovalStatus(req.params.id);
      res.json(status);
    } catch (error) {
      logger.error('Failed to get approval status', { error });
      res.status(500).json({ error: 'Failed to get approval status' });
    }
  });

  // ========================================
  // Report Submission
  // ========================================

  router.post('/reports/:id/submit', async (req: Request, res: Response) => {
    try {
      const result = await submissionService.submitReport(req.params.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to submit report', { error });
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  router.get('/submissions', async (req: Request, res: Response) => {
    try {
      const submissions = await prisma.regulatorySubmission.findMany({
        orderBy: { submissionDate: 'desc' },
        take: 100,
      });
      res.json({ data: submissions });
    } catch (error) {
      logger.error('Failed to list submissions', { error });
      res.status(500).json({ error: 'Failed to list submissions' });
    }
  });

  router.get('/submissions/:id', async (req: Request, res: Response) => {
    try {
      const submission = await prisma.regulatorySubmission.findUnique({ where: { submissionId: req.params.id } });
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      res.json(submission);
    } catch (error) {
      logger.error('Failed to fetch submission', { error });
      res.status(500).json({ error: 'Failed to fetch submission' });
    }
  });

  router.get('/submissions/:id/status', async (req: Request, res: Response) => {
    try {
      const status = await submissionService.trackSubmission(req.params.id);
      res.json({ status: status.status, referenceNumber: status.referenceNumber });
    } catch (error) {
      logger.error('Failed to track submission', { error });
      res.status(500).json({ error: 'Failed to track submission' });
    }
  });

  router.post('/submissions/:id/resend', async (req: Request, res: Response) => {
    try {
      const submission = await submissionService.trackSubmission(req.params.id);
      const result = await submissionService.submitReport(submission.reportId, {
        regulatoryBody: submission.regulatoryBody,
        jurisdiction: submission.jurisdiction,
        submissionUrl: submission.submissionUrl,
        submissionMethod: submission.submissionMethod,
        submittedBy: req.body.submittedBy ?? submission.submittedBy,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to resend submission', { error });
      res.status(500).json({ error: 'Failed to resend submission' });
    }
  });

  // ========================================
  // Breach Notification
  // ========================================

  router.post('/breaches', async (req: Request, res: Response) => {
    try {
      const breach = await breachService.reportBreach({
        ...req.body,
        breachDate: new Date(req.body.breachDate),
        discoveryDate: new Date(req.body.discoveryDate),
      });
      res.status(201).json(breach);
    } catch (error) {
      logger.error('Failed to report breach', { error });
      res.status(500).json({ error: 'Failed to report breach' });
    }
  });

  router.get('/breaches', async (req: Request, res: Response) => {
    try {
      const breaches = await prisma.dataBreachNotification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ data: breaches });
    } catch (error) {
      logger.error('Failed to list breaches', { error });
      res.status(500).json({ error: 'Failed to list breaches' });
    }
  });

  router.get('/breaches/:id', async (req: Request, res: Response) => {
    try {
      const breach = await prisma.dataBreachNotification.findUnique({
        where: { breachId: req.params.id },
        include: { recipients: true },
      });
      if (!breach) return res.status(404).json({ error: 'Breach not found' });
      res.json(breach);
    } catch (error) {
      logger.error('Failed to get breach details', { error });
      res.status(500).json({ error: 'Failed to get breach' });
    }
  });

  router.post('/breaches/:id/notify', async (req: Request, res: Response) => {
    try {
      const result = await breachService.notifyAffectedIndividuals(req.params.id);
      res.json(result);
    } catch (error) {
      logger.error('Failed to notify affected individuals', { error });
      res.status(500).json({ error: 'Failed to notify individuals' });
    }
  });

  router.post('/breaches/:id/notify-regulator', async (req: Request, res: Response) => {
    try {
      const regulators: string[] = req.body.regulators ?? [];
      const result = await breachService.notifyRegulatories(req.params.id, regulators);
      res.json(result);
    } catch (error) {
      logger.error('Failed to notify regulators', { error });
      res.status(500).json({ error: 'Failed to notify regulators' });
    }
  });

  router.get('/breaches/:id/status', async (req: Request, res: Response) => {
    try {
      const status = await breachService.getBreachStatus(req.params.id);
      res.json(status);
    } catch (error) {
      logger.error('Failed to get breach status', { error });
      res.status(500).json({ error: 'Failed to get breach status' });
    }
  });

  router.post('/breaches/:id/investigate', async (req: Request, res: Response) => {
    try {
      const result = await breachService.investigateBreach(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      logger.error('Failed to initiate investigation', { error });
      res.status(500).json({ error: 'Failed to investigate breach' });
    }
  });

  router.post('/breaches/:id/resolve', async (req: Request, res: Response) => {
    try {
      await breachService.resolveBreach(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to resolve breach', { error });
      res.status(500).json({ error: 'Failed to resolve breach' });
    }
  });

  // ========================================
  // Templates
  // ========================================

  router.get('/report-templates', async (req: Request, res: Response) => {
    try {
      const templates = await templateService.listTemplates({
        jurisdiction: typeof req.query.jurisdiction === 'string' ? req.query.jurisdiction : undefined,
        reportType: typeof req.query.reportType === 'string' ? req.query.reportType : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ data: templates });
    } catch (error) {
      logger.error('Failed to list templates', { error });
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  router.get('/report-templates/:id', async (req: Request, res: Response) => {
    try {
      const template = await prisma.regulatoryReportTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    } catch (error) {
      logger.error('Failed to get template', { error });
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  router.post('/report-templates', async (req: Request, res: Response) => {
    try {
      const template = await templateService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      logger.error('Failed to create template', { error });
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  router.put('/report-templates/:id', async (req: Request, res: Response) => {
    try {
      const updated = await templateService.updateTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      logger.error('Failed to update template', { error });
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  // ========================================
  // Scheduled Reports
  // ========================================

  router.get('/scheduled-reports', async (req: Request, res: Response) => {
    try {
      const schedules = await prisma.scheduledReport.findMany({ orderBy: { nextRunDate: 'asc' } });
      res.json({ data: schedules });
    } catch (error) {
      logger.error('Failed to list scheduled reports', { error });
      res.status(500).json({ error: 'Failed to list schedules' });
    }
  });

  router.post('/scheduled-reports', async (req: Request, res: Response) => {
    try {
      const result = await scheduledReportService.scheduleReport(req.body.reportType, req.body.frequency, {
        jurisdiction: req.body.jurisdiction,
        schedule: req.body.schedule,
        nextRunDate: new Date(req.body.nextRunDate),
        autoGenerate: req.body.autoGenerate,
        autoSubmit: req.body.autoSubmit,
        requireApproval: req.body.requireApproval,
        notifyOn: req.body.notifyOn,
      });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create schedule', { error });
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  });

  router.get('/scheduled-reports/:id', async (req: Request, res: Response) => {
    try {
      const schedule = await prisma.scheduledReport.findUnique({ where: { id: req.params.id } });
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
      res.json(schedule);
    } catch (error) {
      logger.error('Failed to fetch schedule', { error });
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });

  router.put('/scheduled-reports/:id', async (req: Request, res: Response) => {
    try {
      const schedule = await scheduledReportService.updateSchedule(req.params.id, {
        ...req.body,
        nextRunDate: req.body.nextRunDate ? new Date(req.body.nextRunDate) : undefined,
      });
      res.json(schedule);
    } catch (error) {
      logger.error('Failed to update schedule', { error });
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  router.post('/scheduled-reports/:id/pause', async (req: Request, res: Response) => {
    try {
      await scheduledReportService.pauseSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to pause schedule', { error });
      res.status(500).json({ error: 'Failed to pause schedule' });
    }
  });

  router.post('/scheduled-reports/:id/resume', async (req: Request, res: Response) => {
    try {
      await scheduledReportService.resumeSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to resume schedule', { error });
      res.status(500).json({ error: 'Failed to resume schedule' });
    }
  });

  // ========================================
  // Regulatory Calendar
  // ========================================

  router.get('/regulatory/calendar', async (req: Request, res: Response) => {
    try {
      const year = typeof req.query.year === 'string' ? Number(req.query.year) : new Date().getUTCFullYear();
      const calendar = await calendarService.getRegulatoryCalendar(year);
      res.json(calendar);
    } catch (error) {
      logger.error('Failed to get regulatory calendar', { error });
      res.status(500).json({ error: 'Failed to get regulatory calendar' });
    }
  });

  router.get('/regulatory/deadlines', async (req: Request, res: Response) => {
    try {
      const days = typeof req.query.days === 'string' ? Number(req.query.days) : 30;
      const deadlines = await calendarService.getUpcomingDeadlines(days);
      res.json({ data: deadlines });
    } catch (error) {
      logger.error('Failed to list deadlines', { error });
      res.status(500).json({ error: 'Failed to list deadlines' });
    }
  });

  router.get('/regulatory/deadlines/:id', async (req: Request, res: Response) => {
    try {
      const deadline = await prisma.regulatoryDeadline.findUnique({ where: { deadlineId: req.params.id } });
      if (!deadline) return res.status(404).json({ error: 'Deadline not found' });
      res.json(deadline);
    } catch (error) {
      logger.error('Failed to get deadline', { error });
      res.status(500).json({ error: 'Failed to get deadline' });
    }
  });

  router.post('/regulatory/deadlines', async (req: Request, res: Response) => {
    try {
      const deadline = await calendarService.addDeadline({
        ...req.body,
        dueDate: new Date(req.body.dueDate),
        reminderDates: (req.body.reminderDates ?? []).map((d: string) => new Date(d)),
      });
      res.status(201).json(deadline);
    } catch (error) {
      logger.error('Failed to create deadline', { error });
      res.status(500).json({ error: 'Failed to create deadline' });
    }
  });

  router.post('/regulatory/deadlines/:id/complete', async (req: Request, res: Response) => {
    try {
      await calendarService.markDeadlineComplete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to mark deadline complete', { error });
      res.status(500).json({ error: 'Failed to mark deadline complete' });
    }
  });

  // ========================================
  // Compliance History
  // ========================================

  router.get('/regulatory/filings', async (_req: Request, res: Response) => {
    try {
      const filings = await prisma.regulatoryFilingArchive.findMany({ orderBy: { archivedDate: 'desc' } });
      res.json({ data: filings });
    } catch (error) {
      logger.error('Failed to list filings', { error });
      res.status(500).json({ error: 'Failed to list filings' });
    }
  });

  router.get('/regulatory/filings/:id', async (req: Request, res: Response) => {
    try {
      const filing = await prisma.regulatoryFilingArchive.findUnique({ where: { filingId: req.params.id } });
      if (!filing) return res.status(404).json({ error: 'Filing not found' });
      res.json(filing);
    } catch (error) {
      logger.error('Failed to get filing', { error });
      res.status(500).json({ error: 'Failed to get filing' });
    }
  });

  router.get('/regulatory/communications', async (_req: Request, res: Response) => {
    try {
      const communications = await prisma.regulatoryCommLog.findMany({ orderBy: { sentDate: 'desc' }, take: 200 });
      res.json({ data: communications });
    } catch (error) {
      logger.error('Failed to get communications', { error });
      res.status(500).json({ error: 'Failed to get communications' });
    }
  });

  return router;
}

export default createRegulatoryReportingRouter();
