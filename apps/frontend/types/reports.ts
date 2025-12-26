export type ReportType =
  | "lead_performance"
  | "agent_performance"
  | "conversion_funnel"
  | "revenue"
  | "ai_model_performance"
  | "system_health"
  | "custom";

export type ReportStatus = "pending" | "processing" | "completed" | "failed";

export type ReportFrequency = "once" | "daily" | "weekly" | "monthly";

export type ExportFormat = "pdf" | "csv" | "excel" | "json";

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy: string;
  fileUrl?: string;
  format: ExportFormat;
  parameters: Record<string, unknown>;
  error?: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  parameters: Record<string, unknown>;
  recipients: string[];
  format: ExportFormat;
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  format: ExportFormat;
  parameters?: Record<string, unknown>;
}

export interface CreateScheduleRequest {
  name: string;
  description?: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  parameters?: Record<string, unknown>;
  recipients: string[];
  format: ExportFormat;
}

export interface Alert {
  id: string;
  name: string;
  description?: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  lastTriggered?: string;
  recipients: string[];
  severity: "info" | "warning" | "critical";
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRequest {
  name: string;
  description?: string;
  condition: string;
  threshold: number;
  recipients: string[];
  severity: "info" | "warning" | "critical";
}
