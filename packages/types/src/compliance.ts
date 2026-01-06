/**
 * Compliance & Regulatory Types
 *
 * Types for GDPR, CCPA, and other regulatory compliance features
 */

export enum ConsentType {
  MARKETING_COMMUNICATIONS = 'MARKETING_COMMUNICATIONS',
  DATA_PROCESSING = 'DATA_PROCESSING',
  DATA_SHARING = 'DATA_SHARING',
  ANALYTICS = 'ANALYTICS',
  PERSONALIZED_ADS = 'PERSONALIZED_ADS',
  LOCATION_TRACKING = 'LOCATION_TRACKING',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}

export enum DeletionRequestType {
  RIGHT_TO_BE_FORGOTTEN = 'RIGHT_TO_BE_FORGOTTEN',
  DATA_PORTABILITY = 'DATA_PORTABILITY',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',
  CONSENT_WITHDRAWAL = 'CONSENT_WITHDRAWAL',
}

export enum DeletionRequestStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum EntityType {
  LEAD = 'LEAD',
  AGENT = 'AGENT',
  CARRIER = 'CARRIER',
  ASSIGNMENT = 'ASSIGNMENT',
  CONSENT = 'CONSENT',
  AUDIT_LOG = 'AUDIT_LOG',
  REPORT = 'REPORT',
  POLICY = 'POLICY',
  VIOLATION = 'VIOLATION',
  DATA_SUBJECT_REQUEST = 'DATA_SUBJECT_REQUEST',
}

export enum ActionType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  ACCESS = 'ACCESS',
  SHARE = 'SHARE',
  ANONYMIZE = 'ANONYMIZE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
}

export enum ReportType {
  DATA_PROCESSING_REGISTRY = 'DATA_PROCESSING_REGISTRY',
  DATA_SUBJECT_REQUESTS = 'DATA_SUBJECT_REQUESTS',
  DATA_BREACH_REPORT = 'DATA_BREACH_REPORT',
  CONSENT_REGISTRY = 'CONSENT_REGISTRY',
  RETENTION_REPORT = 'RETENTION_REPORT',
  AUDIT_LOG_REPORT = 'AUDIT_LOG_REPORT',
  PRIVACY_IMPACT_ASSESSMENT = 'PRIVACY_IMPACT_ASSESSMENT',
  SECURITY_INCIDENT_REPORT = 'SECURITY_INCIDENT_REPORT',
}

export enum ReportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
  XML = 'XML',
  HTML = 'HTML',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum RetentionAction {
  DELETE = 'DELETE',
  ANONYMIZE = 'ANONYMIZE',
  ARCHIVE = 'ARCHIVE',
  TRANSFER = 'TRANSFER',
}

export enum ViolationType {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_BREACH = 'DATA_BREACH',
  CONSENT_VIOLATION = 'CONSENT_VIOLATION',
  RETENTION_VIOLATION = 'RETENTION_VIOLATION',
  DATA_LEAK = 'DATA_LEAK',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  COMPLIANCE_BREACH = 'COMPLIANCE_BREACH',
}

export enum ViolationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ViolationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum RemediationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum DataSubjectRequestType {
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  DELETION_REQUEST = 'DELETION_REQUEST',
  PORTABILITY_REQUEST = 'PORTABILITY_REQUEST',
  RECTIFICATION_REQUEST = 'RECTIFICATION_REQUEST',
  OBJECTION_REQUEST = 'OBJECTION_REQUEST',
  RESTRICTION_REQUEST = 'RESTRICTION_REQUEST',
}

export enum DataSubjectRequestStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface DataConsent {
  id: string;
  leadId?: string;
  email?: string;
  consentType: ConsentType;
  consentGiven: boolean;
  consentText: string;
  ipAddress?: string;
  userAgent?: string;
  version: number;
  withdrawnAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataDeletionRequest {
  id: string;
  leadId?: string;
  email?: string;
  requestType: DeletionRequestType;
  status: DeletionRequestStatus;
  requestedBy: string;
  requestedByEmail?: string;
  ipAddress?: string;
  reason?: string;
  verifiedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectedReason?: string;
  retentionExpiry?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceAuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  actionType: ActionType;
  performedBy?: string;
  performedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  sensitiveFields: string[];
  requestId?: string;
  sessionId?: string;
  deletionRequestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ComplianceReport {
  id: string;
  reportType: ReportType;
  reportFormat: ReportFormat;
  status: ReportStatus;
  title: string;
  description?: string;
  generatedBy: string;
  periodStart?: Date;
  periodEnd?: Date;
  filters?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  fileUrl?: string;
  fileSize?: number;
  recordCount?: number;
  encryptionKey?: string;
  checksum?: string;
  retentionExpiresAt?: Date;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRetentionPolicy {
  id: string;
  entityType: EntityType;
  retentionPeriod: number; // in days
  action: RetentionAction;
  condition?: string;
  isActive: boolean;
  priority: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
  recordsProcessed: number;
  recordsDeleted: number;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceViolation {
  id: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  status: ViolationStatus;
  description: string;
  entityId?: string;
  entityType?: EntityType;
  detectedBy?: string;
  detectionMethod?: string;
  affectedRecords?: number;
  riskScore?: number;
  remediationAction?: string;
  remediationStatus: RemediationStatus;
  remediatedAt?: Date;
  remediatedBy?: string;
  notes?: string;
  reportedTo?: string;
  reportDate?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSubjectRequest {
  id: string;
  leadId?: string;
  email: string;
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  verificationData?: Record<string, unknown>;
  identityVerified: boolean;
  verifiedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  rejectionReason?: string;
  ipAddress?: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataConsentInput {
  leadId?: string;
  email?: string;
  consentType: ConsentType;
  consentGiven: boolean;
  consentText: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
}

export interface UpdateDataConsentInput {
  consentGiven?: boolean;
  withdrawnAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateDataDeletionRequestInput {
  leadId?: string;
  email?: string;
  requestType: DeletionRequestType;
  requestedBy: string;
  requestedByEmail?: string;
  ipAddress?: string;
  reason?: string;
}

export interface CreateComplianceReportInput {
  reportType: ReportType;
  reportFormat: ReportFormat;
  title: string;
  description?: string;
  generatedBy: string;
  periodStart?: Date;
  periodEnd?: Date;
  filters?: Record<string, unknown>;
}

export interface CreateDataRetentionPolicyInput {
  entityType: EntityType;
  retentionPeriod: number;
  action: RetentionAction;
  condition?: string;
  isActive?: boolean;
  priority?: number;
  createdBy?: string;
}

export interface CreateComplianceViolationInput {
  violationType: ViolationType;
  severity: ViolationSeverity;
  description: string;
  entityId?: string;
  entityType?: EntityType;
  detectedBy?: string;
  detectionMethod?: string;
  affectedRecords?: number;
  riskScore?: number;
  notes?: string;
}

export interface CreateDataSubjectRequestInput {
  leadId?: string;
  email: string;
  requestType: DataSubjectRequestType;
  verificationData?: Record<string, unknown>;
  requestData?: Record<string, unknown>;
  ipAddress?: string;
  requestedBy: string;
}

export interface AuditLogFilters {
  entityType?: EntityType;
  entityId?: string;
  actionType?: ActionType;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  requestId?: string;
  limit?: number;
  offset?: number;
}

export interface ReportGenerationOptions {
  includeSensitiveData?: boolean;
  anonymizePersonalData?: boolean;
  encryptReport?: boolean;
  notifyRecipients?: string[];
}

export interface ConsentCheckResult {
  hasValidConsent: boolean;
  consentType: ConsentType;
  consentGiven: boolean;
  consentDate: Date;
  withdrawn?: boolean;
  expired?: boolean;
  version: number;
}

export interface ComplianceMetrics {
  totalAuditLogs: number;
  activeConsents: number;
  pendingDeletionRequests: number;
  openViolations: number;
  activePolicies: number;
  reportsGenerated: number;
  avgProcessingTime: number;
  complianceScore: number;
}

export interface DataProcessingRecord {
  dataProcessor: string;
  dataController: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  transferMechanism: string;
  retentionPeriod: string;
  securityMeasures: string[];
}

export interface PrivacyImpactAssessment {
  id: string;
  projectName: string;
  projectDescription: string;
  dataTypes: string[];
  riskScore: number;
  identifiedRisks: string[];
  mitigationStrategies: string[];
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED';
  assessedBy: string;
  assessmentDate: Date;
  nextReviewDate: Date;
}
