// SLO and Error Budget Types

export interface SLODefinition {
  name: string;
  description: string;
  target: number; // Percentage (e.g., 99.9 = 99.9%)
  window: string; // Time window (e.g., '28d', '7d', '1d')
  service: string;
  metricType: 'availability' | 'latency' | 'throughput' | 'correctness';
  threshold?: number; // For latency (ms), throughput (rps), etc.
}

export interface ErrorBudget {
  sloName: string;
  totalBudget: number; // Total error budget in minutes/hours
  consumedBudget: number; // Consumed error budget
  remainingBudget: number; // Remaining error budget
  burnRate: number; // Current burn rate
  lastUpdated: Date;
}

export interface SLOStatus {
  slo: SLODefinition;
  currentAvailability: number;
  errorBudget: ErrorBudget;
  isViolated: boolean;
  violationSeverity?: 'critical' | 'warning' | 'minor';
  timeToExhaustion?: number; // Minutes until error budget exhausted
}

export interface SLOAlert {
  sloName: string;
  service: string;
  type: 'violation' | 'budget_depletion' | 'high_burn_rate';
  severity: 'critical' | 'warning' | 'minor';
  message: string;
  timestamp: Date;
  currentValue: number;
  targetValue: number;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  service: string;
  changeType: 'code' | 'config' | 'infrastructure' | 'data';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactAnalysis: string;
  rollbackPlan: string;
  scheduledTime?: Date;
  status: 'proposed' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'rolled_back';
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface PostIncidentReview {
  id: string;
  incidentId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
  rootCause: string;
  impact: string;
  timeline: IncidentTimelineEvent[];
  actionItems: ActionItem[];
  lessonsLearned: string;
  createdBy: string;
  createdAt: Date;
  status: 'draft' | 'review' | 'published';
}

export interface IncidentTimelineEvent {
  time: Date;
  description: string;
  type: 'detection' | 'response' | 'mitigation' | 'resolution' | 'communication';
  responsible?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface Runbook {
  id: string;
  title: string;
  description: string;
  incidentType: string;
  severity: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
  steps: RunbookStep[];
  prerequisites: string[];
  relatedAlerts: string[];
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface RunbookStep {
  stepNumber: number;
  title: string;
  description: string;
  commands?: string[];
  expectedOutput?: string;
  rollbackCommands?: string[];
  decisionPoints?: DecisionPoint[];
}

export interface DecisionPoint {
  condition: string;
  action: string;
  nextStep: number;
}

export interface ComplianceRequirement {
  id: string;
  regulation: string;
  description: string;
  applicableServices: string[];
  complianceCriteria: string[];
  auditFrequency: string;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  status: 'compliant' | 'non_compliant' | 'pending';
  evidenceRequired: string[];
}

export interface ComplianceAudit {
  id: string;
  requirementId: string;
  auditDate: Date;
  auditor: string;
  findings: string[];
  status: 'pass' | 'fail' | 'partial';
  evidenceProvided: string[];
  remediationPlan?: string;
  remediationDueDate?: Date;
}

export interface SLOComplianceReport {
  reportDate: Date;
  reportingPeriod: string;
  overallCompliance: number; // Percentage
  sloStatuses: SLOStatus[];
  errorBudgetStatus: ErrorBudgetStatus[];
  violations: SLOAlert[];
  complianceTrends: ComplianceTrend[];
}

export interface ErrorBudgetStatus {
  sloName: string;
  service: string;
  remainingBudgetPercentage: number;
  burnRate: number;
  isDepleted: boolean;
}

export interface ComplianceTrend {
  sloName: string;
  service: string;
  dates: Date[];
  complianceValues: number[]; // Percentage values
}

export interface ChangeAdvisoryBoardMeeting {
  id: string;
  date: Date;
  attendees: string[];
  changeRequests: ChangeRequest[];
  decisions: ChangeDecision[];
  notes: string;
}

export interface ChangeDecision {
  changeRequestId: string;
  decision: 'approved' | 'rejected' | 'deferred';
  reason: string;
  conditions?: string[];
  approvedBy: string;
}

export interface ErrorBudgetPolicy {
  sloName: string;
  service: string;
  depletionThresholds: {
    warning: number; // Percentage remaining
    critical: number; // Percentage remaining
  };
  featureFreezeTriggers: {
    partial: number; // Percentage remaining
    full: number; // Percentage remaining
  };
  notificationChannels: string[];
  escalationPath: string[];
}