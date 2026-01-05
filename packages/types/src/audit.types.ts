/**
 * Phase 25.1E: Enhanced Audit & Logging Types
 */

// ============================================
// Core Audit Types
// ============================================

export interface AuditEventData {
  eventType: string;
  eventCategory: AuditEventCategory;
  severity: AuditSeverity;
  actorId: string;
  actorType: ActorType;
  actorRole?: string;
  resourceType: string;
  resourceId: string;
  parentResourceId?: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
  changeDescription?: string;
  compliancePolicies?: string[];
  complianceStatus?: ComplianceStatus;
  riskLevel?: RiskLevel;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  duration?: number;
  timestamp?: Date;
}

export interface ImmutableAuditLog {
  id: string;
  sequenceNumber: bigint;
  chainHash?: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  actorId: string;
  actorType: string;
  actorRole?: string;
  resourceType: string;
  resourceId: string;
  parentResourceId?: string;
  action: string;
  oldValues?: string;
  newValues?: string;
  changes?: string;
  changeDescription?: string;
  compliancePolicies: string[];
  complianceStatus: string;
  riskLevel: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  duration?: number;
  timestamp: Date;
  createdAt: Date;
  checksum: string;
  signatureHash?: string;
  updatedAt: Date;
}

// ============================================
// Compliance Types
// ============================================

export interface ComplianceEventData {
  eventId: string;
  eventType: ComplianceEventType;
  jurisdiction: string;
  description: string;
  entityType: string;
  entityId: string;
  status: ComplianceEventStatus;
  initiatedDate: Date;
  completedDate?: Date;
  relatedAuditLogs?: string[];
  evidence?: string;
  assignedTo?: string;
  notes?: string;
}

export interface ComplianceEvent {
  id: string;
  eventId: string;
  eventType: string;
  jurisdiction: string;
  description: string;
  entityType: string;
  entityId: string;
  status: string;
  initiatedDate: Date;
  completedDate?: Date;
  relatedAuditLogs: string[];
  evidence?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ViolationData {
  violationId: string;
  auditLogId?: string;
  violationType: ViolationType;
  severityLevel: SeverityLevel;
  policy: string;
  jurisdiction: string;
  regulation?: string;
  occurredDate: Date;
  detectedBy: string;
  affectedEntities: number;
  affectedFields: string[];
  riskAssessment: string;
  owner: string;
  notes?: string;
}

export interface ComplianceViolation {
  id: string;
  violationId: string;
  auditLogId?: string;
  violationType: string;
  severityLevel: string;
  policy: string;
  jurisdiction: string;
  regulation?: string;
  detectionDate: Date;
  occurredDate: Date;
  detectedBy: string;
  affectedEntities: number;
  affectedFields: string[];
  riskAssessment: string;
  status: string;
  remediationPlan?: string;
  remediationDate?: Date;
  remediationDetails?: string;
  reportedToRegulator: boolean;
  regulatoryReport?: string;
  reportDate?: Date;
  owner: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Query & Filter Types
// ============================================

export interface AuditLogFilters {
  actorId?: string;
  resourceId?: string;
  resourceType?: string;
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  complianceStatus?: string;
  riskLevel?: string;
  dateRange?: DateRange;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface EventFilters {
  eventType?: string;
  jurisdiction?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}

export interface SearchScope {
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  dateRange?: DateRange;
}

// ============================================
// Integrity & Verification Types
// ============================================

export interface IntegrityCheckResult {
  isValid: boolean;
  startSequence: bigint;
  endSequence: bigint;
  totalRecordsChecked: number;
  discrepanciesFound: number;
  discrepancies: IntegrityDiscrepancy[];
  checkedAt: Date;
  verifiedBy: string;
}

export interface IntegrityDiscrepancy {
  sequenceNumber: bigint;
  type: string;
  description: string;
  severity: string;
}

export interface ChainValidationResult {
  isValid: boolean;
  sequenceNumber: bigint;
  expectedHash?: string;
  actualHash?: string;
  message: string;
}

export interface SequenceValidation {
  isValid: boolean;
  gaps: SequenceGap[];
  duplicates: bigint[];
  totalRecords: number;
}

export interface SequenceGap {
  start: bigint;
  end: bigint;
  missingCount: number;
}

export interface ChecksumValidation {
  isValid: boolean;
  invalidRecords: string[];
  totalChecked: number;
}

export interface TamperingAlert {
  id: string;
  auditLogId: string;
  sequenceNumber: bigint;
  alertType: string;
  description: string;
  detectedAt: Date;
  severity: string;
}

// ============================================
// Analysis Types
// ============================================

export interface BehaviorAnalysis {
  userId: string;
  period: DateRange;
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByHour: Record<number, number>;
  unusualPatterns: UnusualPattern[];
  riskScore: number;
  recommendations: string[];
}

export interface UnusualPattern {
  type: string;
  description: string;
  confidence: number;
  timestamp: Date;
}

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  userId?: string;
  resourceId?: string;
  timestamp: Date;
  severity: string;
  confidence: number;
  relatedAuditLogs: string[];
}

export interface SuspiciousAccessAlert {
  id: string;
  userId: string;
  resourceId: string;
  dataType: string;
  reason: string;
  timestamp: Date;
  riskLevel: string;
  requiresReview: boolean;
}

// ============================================
// Reporting Types
// ============================================

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: DateRange;
  summary: ComplianceReportSummary;
  violations: ComplianceViolation[];
  complianceEvents: ComplianceEvent[];
  certifications: ComplianceCertification[];
  recommendations: string[];
}

export interface ComplianceReportSummary {
  totalEvents: number;
  totalViolations: number;
  criticalViolations: number;
  unresolvedViolations: number;
  complianceScore: number;
  trendAnalysis: string;
}

export interface ForensicReport {
  reportId: string;
  incidentId: string;
  generatedAt: Date;
  period: DateRange;
  timeline: AuditTimelineEntry[];
  affectedResources: string[];
  suspiciousActivities: Anomaly[];
  recommendations: string[];
  summary: string;
}

export interface AuditTimelineEntry {
  timestamp: Date;
  sequenceNumber: bigint;
  eventType: string;
  actorId: string;
  action: string;
  resourceId: string;
  description: string;
}

export interface Timeline {
  resourceId: string;
  events: AuditTimelineEntry[];
  totalEvents: number;
  period: DateRange;
}

export interface AccessLog {
  id: string;
  resourceId: string;
  accessedBy: string;
  accessDate: Date;
  accessMethod: string;
  accessReason?: string;
  accessContext?: string;
}

// ============================================
// Export & Archive Types
// ============================================

export interface ExportResult {
  exportId: string;
  format: ExportFormat;
  fileUrl: string;
  fileSize: number;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
}

export interface ArchiveResult {
  archivedRecords: number;
  startSequence: bigint;
  endSequence: bigint;
  archiveLocation: string;
  archivedAt: Date;
}

// ============================================
// Certification Types
// ============================================

export interface ComplianceCertification {
  id: string;
  certificationName: string;
  jurisdiction: string;
  certifyingBody: string;
  effectiveDate: Date;
  expiryDate?: Date;
  scope: string;
  status: string;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationStatus {
  active: ComplianceCertification[];
  expiring: ComplianceCertification[];
  expired: ComplianceCertification[];
}

export interface ValidationResult {
  isValid: boolean;
  missingRequirements: string[];
  recommendations: string[];
}

// ============================================
// Enums
// ============================================

export type AuditEventCategory =
  | 'LeadManagement'
  | 'QuoteGeneration'
  | 'PolicyBinding'
  | 'DataAccess'
  | 'UserManagement'
  | 'SystemOperation'
  | 'Security'
  | 'Compliance';

export type AuditSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export type ActorType = 'User' | 'System' | 'API' | 'Scheduler' | 'Integration';

export type AuditAction =
  | 'Create'
  | 'Read'
  | 'Update'
  | 'Delete'
  | 'Approve'
  | 'Reject'
  | 'Export'
  | 'Download';

export type ComplianceStatus = 'Compliant' | 'Violation' | 'Warning' | 'Review';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplianceEventType =
  | 'ConsentGiven'
  | 'ConsentWithdrawn'
  | 'DSARCreated'
  | 'DSARCompleted'
  | 'DeletionExecuted'
  | 'ViolationDetected'
  | 'RemediationCompleted'
  | 'AuditInitiated'
  | 'BreachNotified';

export type ComplianceEventStatus =
  | 'Initiated'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Remediated';

export type ViolationType =
  | 'UnauthorizedAccess'
  | 'DataBreach'
  | 'PolicyViolation'
  | 'RuleViolation'
  | 'DiscriminatoryAction'
  | 'DisclosureFailure';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type ExportFormat = 'CSV' | 'JSON' | 'PDF' | 'ARFF';

export type DataType = 'PII' | 'FinancialData' | 'HealthData' | 'CriminalHistory';

export type AccessMethod = 'WebUI' | 'API' | 'Export' | 'Download';
