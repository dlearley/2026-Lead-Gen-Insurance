// ========================================
// CLAIMS MANAGEMENT TYPES
// ========================================

export type ClaimType = 'COLLISION' | 'THEFT' | 'LIABILITY' | 'COMPREHENSIVE' | 'PROPERTY' | 'CASUALTY' | 'OTHER';
export type ClaimStatus = 'REPORTED' | 'ASSIGNED' | 'INVESTIGATING' | 'APPROVED' | 'DENIED' | 'APPEALED' | 'SETTLED' | 'CLOSED' | 'ARCHIVED';
export type ReportChannel = 'PHONE' | 'EMAIL' | 'WEB_PORTAL' | 'MOBILE_APP' | 'THIRD_PARTY' | 'API';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type StatusSource = 'SYSTEM' | 'USER' | 'CARRIER';

export interface Claim {
  id: string;
  organizationId: string;
  claimNumber: string;
  claimType: ClaimType;
  policyId: string;
  insuredId: string;
  claimantId?: string; // May be different from insured (third party)
  
  // Claim Details
  lossType?: string; // "auto_accident", "home_fire", "injury", etc.
  lossDescription?: string;
  lossDate: Date;
  lossLocation?: string;
  lossLatitude?: number;
  lossLongitude?: number;
  
  // Report Information
  reportedDate: Date;
  reportedById?: string;
  reportChannel: ReportChannel;
  reportReferenceNumber?: string;
  
  // Financial Details
  claimedAmount?: number;
  estimatedDamageAmount?: number;
  deductibleAmount?: number;
  reservedAmount?: number;
  paidAmount: number;
  subrogationRecovery: number;
  netClaimCost?: number;
  
  // Status & Workflow
  status: ClaimStatus;
  denyReason?: string;
  denyReasonCode?: string;
  
  // Carrier Information
  carrierClaimId?: string;
  carrierId?: string;
  
  // Third Parties
  thirdPartyInvolved: boolean;
  thirdPartyClaimantId?: string;
  thirdPartyInsurerId?: string;
  
  // Fraud & Risk
  fraudIndicator: boolean;
  fraudProbabilityScore?: number; // 0.0-1.0
  riskLevel?: RiskLevel;
  
  // Metadata
  internalNotes?: string;
  customerNotes?: string;
  metadata?: Record<string, unknown>;
  tags?: string[]; // Array of tags
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
}

export interface CreateClaimDto {
  organizationId: string;
  claimType: ClaimType;
  policyId: string;
  claimantId?: string;
  lossType?: string;
  lossDescription?: string;
  lossDate: Date;
  lossLocation?: string;
  lossLatitude?: number;
  lossLongitude?: number;
  reportChannel: ReportChannel;
  reportReferenceNumber?: string;
  claimedAmount?: number;
  estimatedDamageAmount?: number;
  deductibleAmount?: number;
  reservedAmount?: number;
  carrierId?: string;
  thirdPartyInvolved?: boolean;
  thirdPartyClaimantId?: string;
  thirdPartyInsurerId?: string;
  internalNotes?: string;
  customerNotes?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateClaimDto {
  claimType?: ClaimType;
  lossType?: string;
  lossDescription?: string;
  lossDate?: Date;
  lossLocation?: string;
  lossLatitude?: number;
  lossLongitude?: number;
  claimedAmount?: number;
  estimatedDamageAmount?: number;
  deductibleAmount?: number;
  reservedAmount?: number;
  paidAmount?: number;
  subrogationRecovery?: number;
  netClaimCost?: number;
  denyReason?: string;
  denyReasonCode?: string;
  carrierClaimId?: string;
  carrierId?: string;
  fraudIndicator?: boolean;
  fraudProbabilityScore?: number;
  riskLevel?: RiskLevel;
  internalNotes?: string;
  customerNotes?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// Policy & Insured Types for Claims
export type ClaimPolicyStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
import type { InsuranceType } from './scoring.js';

export interface Policy {
  id: string;
  policyNumber: string;
  policyType: InsuranceType;
  carrierId: string;
  insuredId: string;
  effectiveDate: Date;
  expirationDate: Date;
  status: ClaimPolicyStatus;
  premium?: number;
  coverageLimit?: number;
  deductible?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Insured {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  ssn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  driverLicense?: string;
  occupation?: string;
  maritalStatus?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Claims Status History
export interface ClaimStatusHistory {
  id: string;
  claimId: string;
  oldStatus?: string;
  newStatus: string;
  statusChangeDate: Date;
  changedBy?: string;
  reason?: string;
  source: StatusSource;
  createdAt: Date;
}

// Adjuster Management Types
export type AdjusterType = 'STAFF' | 'INDEPENDENT' | 'THIRD_PARTY';
export type AdjusterStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'RETIRED';
export type AssignmentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AssignmentStatus = 'ACTIVE' | 'REASSIGNED' | 'COMPLETED';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

export interface Adjuster {
  id: string;
  adjusterCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  adjusterType: AdjusterType;
  expertiseAreas?: string[]; // ['auto', 'property', 'liability']
  currentCaseload: number;
  maxCaseload?: number;
  status: AdjusterStatus;
  carrierId?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdjusterDto {
  adjusterCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  adjusterType?: AdjusterType;
  expertiseAreas?: string[];
  maxCaseload?: number;
  carrierId?: string;
  organizationId?: string;
}

export interface UpdateAdjusterDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  adjusterType?: AdjusterType;
  expertiseAreas?: string[];
  currentCaseload?: number;
  maxCaseload?: number;
  status?: AdjusterStatus;
}

export interface ClaimAssignment {
  id: string;
  claimId: string;
  adjusterId: string;
  assignmentDate: Date;
  removalDate?: Date;
  assignmentReason?: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  createdAt: Date;
}

export interface AssignAdjusterDto {
  adjusterId: string;
  assignmentReason?: string;
  priority?: AssignmentPriority;
}

export interface AdjusterAvailability {
  id: string;
  adjusterId: string;
  availableFrom: Date;
  availableUntil: Date;
  availabilityStatus: AvailabilityStatus;
  reason?: string;
  createdAt: Date;
}

export interface CreateAdjusterAvailabilityDto {
  adjusterId: string;
  availableFrom: Date;
  availableUntil: Date;
  availabilityStatus?: AvailabilityStatus;
  reason?: string;
}

// Claims Documents & Attachments Types
export type DocumentType = 'LOSS_OF_USE' | 'REPAIR_ESTIMATE' | 'POLICE_REPORT' | 'PHOTOS' | 'MEDICAL_RECORDS' | 'INVOICES' | 'RECEIPTS' | 'CORRESPONDENCE' | 'SETTLEMENT_AGREEMENT' | 'DENIAL_LETTER' | 'OTHER';
export type UploadedByType = 'INSURED' | 'AGENT' | 'ADJUSTER' | 'SYSTEM';
export type AttachmentCategory = 'DAMAGE' | 'EVIDENCE' | 'COMMUNICATION' | 'RECEIPT' | 'OTHER';
export type CreatedByType = 'INSURED' | 'ADJUSTER' | 'SYSTEM';
export type AccessType = 'VIEW' | 'DOWNLOAD' | 'SHARE';

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentType: DocumentType;
  documentName: string;
  filePath?: string;
  s3Key?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Metadata
  uploadedBy?: string;
  uploadedDate: Date;
  uploadedByType: UploadedByType;
  description?: string;
  
  // Availability
  isSharedWithInsured: boolean;
  isSharedWithCarrier: boolean;
  isConfidential: boolean; // Internal only
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadDocumentDto {
  claimId: string;
  documentType: DocumentType;
  documentName: string;
  description?: string;
  isSharedWithInsured?: boolean;
  isSharedWithCarrier?: boolean;
  isConfidential?: boolean;
}

export interface ClaimAttachment {
  id: string;
  claimId: string;
  attachmentType: string; // photo, video, audio, document, etc.
  attachmentCategory: AttachmentCategory;
  attachmentUrl?: string;
  s3Key?: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  metadata?: Record<string, unknown>; // {width, height, duration, etc.}
  createdByType: CreatedByType;
  createdAt: Date;
}

export interface ClaimDocumentAccessLog {
  id: string;
  documentId: string;
  userId?: string;
  accessType: AccessType;
  accessedAt: Date;
  ipAddress?: string;
}

// Claims Payments & Settlements Types
export type PaymentType = 'PARTIAL' | 'FINAL' | 'ADVANCE' | 'SUPPLEMENTAL';
export type PaymentMethod = 'CHECK' | 'ACH' | 'WIRE' | 'DEBIT_CARD';
export type PaymentStatus = 'REQUESTED' | 'APPROVED' | 'PENDING' | 'SENT' | 'RECEIVED' | 'FAILED' | 'CANCELLED';
export type PayeeType = 'INSURED' | 'VENDOR' | 'ADJUSTER' | 'OTHER';
export type SettlementType = 'NEGOTIATED' | 'STRUCTURED' | 'LUMP_SUM' | 'COURT_ORDERED';
export type SettlementStatus = 'PROPOSED' | 'ACCEPTED' | 'EXECUTED' | 'CLOSED';
export type PaymentScheduleType = 'STRUCTURED_SETTLEMENT' | 'INSTALLMENT' | 'ANNUITY';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type PaymentScheduleStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

export interface ClaimPayment {
  id: string;
  claimId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  requestedDate?: Date;
  approvedDate?: Date;
  paymentDate?: Date;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  checkNumber?: string;
  confirmationNumber?: string;
  payeeType: PayeeType;
  payeeId?: string;
  
  // Notes
  paymentNotes?: string;
  denialReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDto {
  claimId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  requestedDate?: Date;
  paymentAmount: number;
  payeeType: PayeeType;
  payeeId?: string;
  paymentNotes?: string;
}

export interface UpdatePaymentDto {
  paymentStatus?: PaymentStatus;
  approvedDate?: Date;
  paymentDate?: Date;
  checkNumber?: string;
  confirmationNumber?: string;
  denialReason?: string;
  paymentNotes?: string;
}

export interface ClaimSettlement {
  id: string;
  claimId: string;
  settlementDate?: Date;
  settlementAmount: number;
  settlementType: SettlementType;
  settlementStatus: SettlementStatus;
  
  // Settlement Terms
  settlementTerms?: string;
  releaseSigned: boolean;
  releaseSignedDate?: Date;
  
  // Subrogation
  subrogationReserved: boolean;
  subrogationAmount?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSettlementDto {
  claimId: string;
  settlementAmount: number;
  settlementType: SettlementType;
  settlementTerms?: string;
  subrogationReserved?: boolean;
  subrogationAmount?: number;
}

export interface ClaimPaymentSchedule {
  id: string;
  claimId: string;
  paymentScheduleType: PaymentScheduleType;
  totalAmount: number;
  paymentFrequency: PaymentFrequency;
  firstPaymentDate: Date;
  lastPaymentDate?: Date;
  status: PaymentScheduleStatus;
  createdAt: Date;
}

export interface CreatePaymentScheduleDto {
  claimId: string;
  paymentScheduleType: PaymentScheduleType;
  totalAmount: number;
  paymentFrequency: PaymentFrequency;
  firstPaymentDate: Date;
  lastPaymentDate?: Date;
}

// Claims Communication & Notes Types
export type CommunicationType = 'CALL' | 'EMAIL' | 'SMS' | 'LETTER' | 'IN_PERSON';
export type CommunicationDirection = 'INBOUND' | 'OUTBOUND';
export type CommunicatedWithType = 'INSURED' | 'ADJUSTER' | 'VENDOR' | 'ATTORNEY' | 'THIRD_PARTY';
export type ClaimNoteType = 'INTERNAL' | 'EXTERNAL' | 'INVESTIGATION' | 'DECISION';
export type NotePriority = 'LOW' | 'NORMAL' | 'HIGH';
export type TaskType = 'INVESTIGATION' | 'CONTACT' | 'DOCUMENT' | 'DECISION' | 'OTHER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ClaimCommunication {
  id: string;
  claimId: string;
  communicationType: CommunicationType;
  direction: CommunicationDirection;
  communicatedWithType: CommunicatedWithType;
  communicatedWithId?: string;
  
  // Content
  subject?: string;
  message?: string;
  
  // Details
  communicationDate: Date;
  durationMinutes?: number; // For calls
  communicationSummary?: string;
  outcome?: string;
  
  createdBy?: string;
  createdAt: Date;
}

export interface CreateCommunicationDto {
  claimId: string;
  communicationType: CommunicationType;
  direction: CommunicationDirection;
  communicatedWithType: CommunicatedWithType;
  communicatedWithId?: string;
  subject?: string;
  message?: string;
  durationMinutes?: number;
  communicationSummary?: string;
  outcome?: string;
}

export interface ClaimNote {
  id: string;
  claimId: string;
  noteType: ClaimNoteType;
  noteTitle: string;
  noteContent: string;
  isConfidential: boolean;
  priority: NotePriority;
  
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClaimNoteDto {
  claimId: string;
  noteType: ClaimNoteType;
  noteTitle: string;
  noteContent: string;
  isConfidential?: boolean;
  priority?: NotePriority;
}

export interface UpdateClaimNoteDto {
  noteTitle?: string;
  noteContent?: string;
  isConfidential?: boolean;
  priority?: NotePriority;
}

export interface ClaimTask {
  id: string;
  claimId: string;
  taskTitle: string;
  taskDescription?: string;
  taskType: TaskType;
  dueDate?: Date;
  assignedTo?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
}

export interface CreateTaskDto {
  claimId: string;
  taskTitle: string;
  taskDescription?: string;
  taskType: TaskType;
  dueDate?: Date;
  assignedTo?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskDto {
  taskTitle?: string;
  taskDescription?: string;
  taskType?: TaskType;
  dueDate?: Date;
  assignedTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

// Claims Fraud Detection Types
export type FraudIndicatorType = 'DUPLICATE_CLAIM' | 'STAGED_LOSS' | 'INFLATED_DAMAGE' | 'SUSPICIOUS_TIMING' | 'UNUSUAL_PATTERN' | 'CLAIMANT_HISTORY';
export type FraudStatus = 'PENDING_REVIEW' | 'FALSE_POSITIVE' | 'CONFIRMED';

export interface ClaimFraudIndicator {
  id: string;
  claimId: string;
  indicatorType: FraudIndicatorType;
  indicatorName: string;
  confidenceScore: number; // 0.0-1.0
  description?: string;
  recommendation?: string;
  flaggedDate: Date;
  reviewedBy?: string;
  reviewDate?: Date;
  status: FraudStatus;
  createdAt: Date;
}

export interface CreateFraudIndicatorDto {
  claimId: string;
  indicatorType: FraudIndicatorType;
  indicatorName: string;
  confidenceScore: number;
  description?: string;
  recommendation?: string;
}

export interface ReviewFraudIndicatorDto {
  status: FraudStatus;
  reviewedBy?: string;
  reviewDate?: Date;
}

// Subrogation & Recovery Types
export type SubrogationStatus = 'IDENTIFIED' | 'IN_PROGRESS' | 'SETTLED' | 'CLOSED';
export type SubrogationActivityType = 'LETTER_SENT' | 'RESPONSE_RECEIVED' | 'DEMAND' | 'NEGOTIATION' | 'SETTLEMENT' | 'LAWSUIT';

export interface ClaimSubrogation {
  id: string;
  claimId: string;
  subrogationCaseNumber?: string;
  defendantId?: string; // Third party at fault
  defendantName?: string;
  defendantInsurerId?: string;
  defendantInsurerName?: string;
  
  // Claim Details
  lossAmount: number;
  recoveryAmount: number;
  recoveryPercentage?: number;
  
  // Status
  status: SubrogationStatus;
  assignedToId?: string; // Subrogation specialist
  
  // Timeline
  identifiedDate: Date;
  recoveryDate?: Date;
  closureDate?: Date;
  
  // Notes
  caseSummary?: string;
  recoveryPlan?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubrogationDto {
  claimId: string;
  defendantId?: string;
  defendantName?: string;
  defendantInsurerId?: string;
  defendantInsurerName?: string;
  lossAmount: number;
  recoveryPercentage?: number;
  caseSummary?: string;
  recoveryPlan?: string;
}

export interface UpdateSubrogationDto {
  subrogationCaseNumber?: string;
  defendantId?: string;
  defendantName?: string;
  defendantInsurerId?: string;
  defendantInsurerName?: string;
  recoveryAmount?: number;
  recoveryPercentage?: number;
  status?: SubrogationStatus;
  assignedToId?: string;
  recoveryDate?: Date;
  closureDate?: Date;
  caseSummary?: string;
  recoveryPlan?: string;
}

export interface SubrogationActivity {
  id: string;
  subrogationId: string;
  activityType: SubrogationActivityType;
  activityDate: Date;
  description: string;
  createdBy?: string;
  createdAt: Date;
}

export interface CreateSubrogationActivityDto {
  subrogationId: string;
  activityType: SubrogationActivityType;
  description: string;
}

// Claims Analytics Types
export type ResolutionStatus = 'TIMELY' | 'DELAYED' | 'EXPEDITED';

export interface ClaimMetrics {
  id: string;
  claimId: string;
  daysToAssignment?: number;
  daysToFirstPayment?: number;
  daysToClosure?: number;
  adjusterEfficiencyScore?: number; // 0-100
  insuredSatisfactionScore?: number; // 0-100
  resolutionStatus: ResolutionStatus;
  createdAt: Date;
}

// Carrier Integration Types
export type SyncDirection = 'TO_CARRIER' | 'FROM_CARRIER' | 'BIDIRECTIONAL';
export type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface CarrierClaimSync {
  id: string;
  claimId: string;
  carrierId: string;
  externalClaimId: string;
  syncDirection: SyncDirection;
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  errorMessage?: string;
  syncCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimWebhook {
  id: string;
  carrierId: string;
  eventType: string; // claim_status_updated, payment_made, etc.
  webhookUrl: string;
  secret?: string;
  isActive: boolean;
  lastReceivedAt?: Date;
  createdAt: Date;
}

export interface CreateWebhookDto {
  carrierId: string;
  eventType: string;
  webhookUrl: string;
  secret?: string;
}

// Claims Search & Filter Types
export interface ClaimFilterParams {
  claimNumber?: string;
  claimType?: ClaimType | ClaimType[];
  status?: ClaimStatus | ClaimStatus[];
  policyId?: string;
  insuredId?: string;
  carrierId?: string;
  lossDateFrom?: Date;
  lossDateTo?: Date;
  reportedDateFrom?: Date;
  reportedDateTo?: Date;
  claimedAmountMin?: number;
  claimedAmountMax?: number;
  riskLevel?: RiskLevel | RiskLevel[];
  fraudIndicator?: boolean;
  thirdPartyInvolved?: boolean;
  search?: string; // Full-text search
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClaimsSearchResult {
  claims: Claim[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Claims Reports Types
export interface ClaimsVolumeReport {
  period: string;
  totalClaims: number;
  claimsByType: Record<ClaimType, number>;
  claimsByStatus: Record<ClaimStatus, number>;
  claimsByCarrier: Array<{ carrierId: string; carrierName: string; count: number }>;
}

export interface ClaimsAgingReport {
  asOfDate: Date;
  claimsByDaysInStatus: Array<{
    status: ClaimStatus;
    daysInStatus: string;
    count: number;
    percentage: number;
  }>;
  averageDaysInStatus: Record<ClaimStatus, number>;
}

export interface ClaimsCostAnalysis {
  period: string;
  totalReserves: number;
  totalPaid: number;
  totalRecovered: number;
  netClaimCost: number;
  averageClaimAmount: number;
  costByType: Record<ClaimType, { reserves: number; paid: number; recovered: number; netCost: number }>;
}

export interface ClaimsClosureRates {
  period: string;
  totalClaims: number;
  closedClaims: number;
  closureRate: number;
  averageDaysToClosure: number;
  closureRatesByType: Record<ClaimType, { closed: number; total: number; rate: number; avgDays: number }>;
}

export interface AdjusterPerformanceReport {
  adjusterId: string;
  adjusterName: string;
  period: string;
  assignedClaims: number;
  closedClaims: number;
  averageDaysToClosure: number;
  averageEfficiencyScore: number;
  caseloadUtilization: number;
}

export interface FraudIndicatorsReport {
  period: string;
  totalClaims: number;
  flaggedClaims: number;
  fraudRate: number;
  indicatorsByType: Record<FraudIndicatorType, number>;
  topSuspiciousClaims: Array<{
    claimId: string;
    claimNumber: string;
    indicators: string[];
    confidenceScore: number;
  }>;
}

export interface SettlementAnalysis {
  period: string;
  totalSettlements: number;
  totalSettlementAmount: number;
  averageSettlementAmount: number;
  settlementTypes: Record<SettlementType, number>;
  averageDaysToSettlement: number;
  settlementSuccessRate: number;
}

export interface ClaimsReportsExport {
  format: 'csv' | 'excel' | 'pdf';
  reportType: string;
  filters: ClaimFilterParams;
  includeCharts?: boolean;
}

// Claims API Response Types
export interface ClaimApiResponse {
  success: boolean;
  data?: Claim;
  error?: string;
  message?: string;
}

export interface ClaimsListApiResponse {
  success: boolean;
  data?: ClaimsSearchResult;
  error?: string;
  message?: string;
}

// Claims State Machine Types
export interface ClaimStateTransition {
  from: ClaimStatus;
  to: ClaimStatus;
  allowed: boolean;
  reason?: string;
  requiresUserAction?: boolean;
  triggers?: string[];
}

export interface ClaimLifecycleConfig {
  autoAssignOnReported: boolean;
  assignmentTimeoutHours: number;
  investigationTimeoutDays: number;
  settlementTimeoutDays: number;
  closureTimeoutDays: number;
  escalationRules: Array<{
    condition: string;
    action: string;
    priority: TaskPriority;
  }>;
}

// Assignment Algorithm Types
export interface AssignmentCriteria {
  expertiseMatch: number; // 0-100
  caseloadUtilization: number; // 0-100
  availability: boolean;
  geographicProximity?: number; // 0-100
  historicalPerformance: number; // 0-100
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface AdjusterScore {
  adjusterId: string;
  totalScore: number;
  criteria: AssignmentCriteria;
  recommendation: 'recommended' | 'acceptable' | 'not_recommended';
}

export interface RecommendAdjusterRequest {
  claimId: string;
  adjusterIds: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  location?: { latitude: number; longitude: number };
}