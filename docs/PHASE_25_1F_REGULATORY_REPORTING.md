# Phase 25.1F: Regulatory Reporting & Submissions

This phase adds automated regulatory compliance reporting, breach notification workflows, submission tracking, and a regulatory calendar.

## Key Concepts

### Report Types
- **AnnualCompliance**: Annual compliance overview for a jurisdiction
- **QuarterlyAudit**: Quarterly audit report
- **ViolationSummary**: Summary of compliance violations / signals
- **DataAccess**: Data access activity report
- **PrivacyImpact**: Privacy impact assessment report
- **FairLending**: Fair lending metrics report
- **IncidentReport**: Incident/breach report (often jurisdiction-specific)

### Primary Entities
- **ComplianceReport**: Generated compliance report with metrics and content
- **RegulatorySubmission**: Log of each submission to a regulator/portal
- **DataBreachNotification**: Breach record + investigation + notification status
- **BreachNotificationRecipient**: Per-individual tracking of breach notifications
- **RegulatoryReportTemplate**: Jurisdiction-specific reporting templates
- **ScheduledReport**: Automated generation/submission schedules
- **RegulatoryDeadline**: Deadline calendar with reminders and recurrence
- **RegulatoryCommLog**: Communication history with regulators

## Database Schema
Schema is defined in `prisma/schema.prisma` under the **Regulatory Reporting & Submissions (Phase 25.1F)** section.

> Note: The system uses Prisma with PostgreSQL scalar lists for several arrays (attachments, keyFindings, reminderDates, etc.).

## API Routes
Routes are implemented in `apps/api/src/routes/regulatory-reporting.routes.ts` and mounted under:
- `/api/v1/*`
- `/api/*` (legacy)

### Reports
- `GET /api/v1/reports` — list compliance reports
- `POST /api/v1/reports/generate` — generate compliance report (if payload includes `jurisdiction` + `reportType`)
- `GET /api/v1/reports/:id` — fetch a report
- `GET /api/v1/reports/:id/download?format=pdf|excel|xml` — export
- `PUT /api/v1/reports/:id` — update report fields

### Approvals
- `POST /api/v1/reports/:id/submit-approval`
- `PUT /api/v1/reports/:id/approve`
- `PUT /api/v1/reports/:id/reject`
- `GET /api/v1/reports/:id/approval-status`

### Submissions
- `POST /api/v1/reports/:id/submit`
- `GET /api/v1/submissions`
- `GET /api/v1/submissions/:id`
- `GET /api/v1/submissions/:id/status`
- `POST /api/v1/submissions/:id/resend`

### Breaches
- `POST /api/v1/breaches`
- `GET /api/v1/breaches`
- `GET /api/v1/breaches/:id`
- `POST /api/v1/breaches/:id/notify`
- `POST /api/v1/breaches/:id/notify-regulator`
- `GET /api/v1/breaches/:id/status`
- `POST /api/v1/breaches/:id/investigate`
- `POST /api/v1/breaches/:id/resolve`

### Templates
- `GET /api/v1/report-templates`
- `GET /api/v1/report-templates/:id`
- `POST /api/v1/report-templates`
- `PUT /api/v1/report-templates/:id`

### Scheduling
- `GET /api/v1/scheduled-reports`
- `POST /api/v1/scheduled-reports`
- `GET /api/v1/scheduled-reports/:id`
- `PUT /api/v1/scheduled-reports/:id`
- `POST /api/v1/scheduled-reports/:id/pause`
- `POST /api/v1/scheduled-reports/:id/resume`

### Regulatory Calendar
- `GET /api/v1/regulatory/calendar?year=2026`
- `GET /api/v1/regulatory/deadlines?days=30`
- `GET /api/v1/regulatory/deadlines/:id`
- `POST /api/v1/regulatory/deadlines`
- `POST /api/v1/regulatory/deadlines/:id/complete`

### History
- `GET /api/v1/regulatory/filings`
- `GET /api/v1/regulatory/filings/:id`
- `GET /api/v1/regulatory/communications`

## Services
Located under `apps/api/src/services/`:
- `ComplianceReportGeneratorService`
- `RegulatorySubmissionService`
- `ReportTemplateService`
- `ScheduledReportService`
- `RegulatoryCalendarService`
- `ReportApprovalWorkflowService`
- `BreachNotificationService`
- `BreachNotificationTemplateService`
- `ReportExportService`
- `BreachBatchNotifierService`
- `RegulatoryCommunicationService`
- `ReportAnalyticsService`

## Jobs
Located under `apps/api/src/jobs/`:
- `report-scheduler.job.ts`
- `breach-notification.job.ts`
- `deadline-reminder.job.ts`
- `regulatory-reporting.config.ts`

The config file provides cron definitions for:
- Daily deadline reminders (8 AM)
- Daily overdue deadline alerts (9 AM)
- Weekly breach notification reminders
- Monthly filing status report
- Yearly calendar reset

## Seeding
The Prisma seed file (`apps/data-service/prisma/seed.ts`) now also seeds:
- Baseline report templates for **Federal** and **CA**
- A current-year annual compliance deadline

## Notes / Extensions
- Export formats are currently implemented as minimal placeholders (PDF header / CSV / XML) intended to be replaced with full rendering.
- Approval workflow and audit trail are persisted to the existing `Event` table using `regulatory.approval.*` event types.
