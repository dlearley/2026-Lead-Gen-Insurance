export type ReportType =
  | 'lead_funnel'
  | 'agent_performance'
  | 'ai_metrics'
  | 'system_health'
  | 'lead_volume'
  | 'conversion_summary'
  | 'custom';

export type ReportFormat = 'json' | 'csv' | 'pdf';

export type ReportSchedule = 'once' | 'daily' | 'weekly' | 'monthly';

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  schedule: ReportSchedule;
  scheduleTime?: string;
  enabled: boolean;
  filters?: ReportFilters;
  recipients?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  insuranceType?: string[];
  leadSource?: string[];
  agentIds?: string[];
  status?: string[];
  customFields?: Record<string, unknown>;
}

export interface ReportGeneration {
  id: string;
  configId: string;
  status: ReportStatus;
  format: ReportFormat;
  startedAt: Date;
  completedAt?: Date;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateReportConfigDto {
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  schedule: ReportSchedule;
  scheduleTime?: string;
  enabled?: boolean;
  filters?: ReportFilters;
  recipients?: string[];
}

export interface UpdateReportConfigDto {
  name?: string;
  description?: string;
  format?: ReportFormat;
  schedule?: ReportSchedule;
  scheduleTime?: string;
  enabled?: boolean;
  filters?: ReportFilters;
  recipients?: string[];
}

export interface GenerateReportDto {
  configId?: string;
  type: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  dateRange: {
    from: Date;
    to: Date;
  };
  summary: Record<string, unknown>;
  sections: ReportSection[];
  metadata?: Record<string, unknown>;
}

export interface ReportSection {
  title: string;
  description?: string;
  data: unknown;
  charts?: ChartConfig[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table';
  title: string;
  data: unknown;
  options?: Record<string, unknown>;
}

export type AlertType =
  | 'anomaly_detected'
  | 'threshold_exceeded'
  | 'performance_degradation'
  | 'system_error'
  | 'unusual_pattern';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  expectedValue?: number;
  threshold?: number;
  context?: Record<string, unknown>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
}

export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  windowMinutes?: number;
  consecutiveCount?: number;
}

export interface CreateAlertRuleDto {
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled?: boolean;
  cooldownMinutes?: number;
  notificationChannels?: string[];
}

export interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  condition?: AlertCondition;
  severity?: AlertSeverity;
  enabled?: boolean;
  cooldownMinutes?: number;
  notificationChannels?: string[];
}

export interface AcknowledgeAlertDto {
  userId: string;
  notes?: string;
}

export interface ResolveAlertDto {
  userId: string;
  resolution: string;
  notes?: string;
}

export interface CustomReportBuilder {
  metrics: ReportMetric[];
  dimensions: ReportDimension[];
  filters?: ReportFilters;
  groupBy?: string[];
  orderBy?: OrderBy[];
  limit?: number;
}

export interface ReportMetric {
  field: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
  alias?: string;
  format?: string;
}

export interface ReportDimension {
  field: string;
  alias?: string;
  format?: string;
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}
