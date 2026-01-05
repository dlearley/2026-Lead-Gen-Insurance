export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type ReportOptions = {
  reportPeriod?: string;
  title?: string;
  summary?: string;
  attachments?: string[];
  generatedBy?: string;
  generateType?: 'Manual' | 'Scheduled' | 'Triggered';
};

export type Metrics = Record<string, unknown>;

export type ViolationSummary = {
  violations: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  keyFindings: string[];
};

export type RemediationStatus = {
  completed: number;
  pending: number;
  actions?: string;
};

export type Timeline = Array<{ date: string; events: number }>;

export type Document = {
  fileName: string;
  mimeType: string;
  content: string;
};

export type NotificationResult = {
  success: boolean;
  notified: number;
  failed: number;
  errors?: string[];
};

export type NotificationStatus = {
  breachId: string;
  totalRecipients: number;
  notified: number;
  acknowledged: number;
  pending: number;
};

export type InvestigationResult = {
  breachId: string;
  status: string;
};

export type SubmissionResult = {
  submissionId: string;
  status: string;
};

export type ExtensionResult = {
  submissionId: string;
  previousDeadline?: Date;
  newDeadline: Date;
};

export type Summary = {
  submissionId: string;
  reportId: string;
  regulatoryBody: string;
  status: string;
  referenceNumber?: string;
};

export type TemplateFilters = {
  jurisdiction?: string;
  reportType?: string;
  status?: string;
};

export type ValidationResult = {
  valid: boolean;
  missingMetrics: string[];
};

export type DeadlineData = {
  deadlineId: string;
  reportType: string;
  jurisdiction: string;
  description: string;
  dueDate: Date;
  reminderDates: Date[];
  isRecurring?: boolean;
  recurrencePattern?: string;
};

export type CalendarView = {
  year: number;
  deadlines: Array<{
    id: string;
    reportType: string;
    jurisdiction: string;
    dueDate: Date;
    status: string;
  }>;
};

export type ReminderResult = {
  remindersSent: number;
  overdue: number;
};

export type ScheduleOptions = {
  jurisdiction: string;
  schedule: string;
  nextRunDate: Date;
  autoGenerate?: boolean;
  autoSubmit?: boolean;
  requireApproval?: boolean;
  notifyOn?: string[];
};

export type ScheduleResult = {
  scheduleId: string;
  nextRunDate: Date;
};

export type ExecutionResult = {
  executed: number;
  generated: number;
  submitted: number;
  failures: number;
};

export type WorkflowInstance = {
  reportId: string;
  status: string;
};

export type WorkflowStatus = {
  reportId: string;
  status: string;
  pendingApprovers: string[];
};

export type ApprovalEvent = {
  at: Date;
  by: string;
  decision: string;
  notes?: string;
};

export type BreachData = {
  breachId?: string;
  breachDate: Date;
  discoveryDate: Date;
  breachType: string;
  description: string;
  affectedDataTypes: string[];
  affectedRecords: number;
  affectedIndividuals: number;
  systemsAffected: string[];
  severity: string;
  potentialHarm: string;
  remediation: string;
  preventionMeasures?: string;
  complianceRequirements: string[];
  leadIds?: string[];
  templateUsed?: string;
};

export type BreachStatus = {
  breachId: string;
  status: string;
  notificationSent: boolean;
  regulatorNotified: boolean;
};
