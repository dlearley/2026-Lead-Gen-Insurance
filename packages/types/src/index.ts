// ========================================
// CDP TYPES (Phase 11.2)
// ========================================
export * from './cdp.js';

// ========================================
// USER TYPES
// ========================================

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// LEAD TYPES
// ========================================

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'commercial';
export type LeadStatus =
  | 'received'
  | 'processing'
  | 'qualified'
  | 'routed'
  | 'converted'
  | 'rejected';

export interface Lead {
  id: string;
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  insuranceType?: InsuranceType;
  qualityScore?: number;
  status: LeadStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// POLICY TYPES
// ========================================

export type PolicyStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'cancelled'
  | 'lapsed'
  | 'expired'
  | 'non_renewed';

export type PolicyBillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface PolicyEndorsement {
  id: string;
  policyId: string;
  type: string;
  effectiveDate: Date;
  description?: string;
  changes?: Record<string, unknown>;
  premiumDelta?: number;
  createdAt: Date;
  createdBy?: string;
}

export type PolicyInvoiceStatus = 'open' | 'paid' | 'void' | 'overdue';

export interface PolicyInvoice {
  id: string;
  policyId: string;
  invoiceNumber: string;
  amount: MoneyAmount;
  dueDate: Date;
  status: PolicyInvoiceStatus;
  paidAt?: Date;
  createdAt: Date;
}

export interface Policy {
  id: string;
  leadId: string;
  agentId?: string;
  insuranceType: InsuranceType;
  policyNumber: string;
  carrier?: string;
  productName?: string;
  status: PolicyStatus;
  effectiveDate: Date;
  expirationDate: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  premium: MoneyAmount;
  billingFrequency: PolicyBillingFrequency;
  coverage?: Record<string, unknown>;
  endorsements: PolicyEndorsement[];
  invoices: PolicyInvoice[];
  renewalOfPolicyId?: string;
  renewedToPolicyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePolicyDto {
  leadId: string;
  agentId?: string;
  insuranceType: InsuranceType;
  carrier?: string;
  productName?: string;
  effectiveDate: Date;
  expirationDate: Date;
  premium: MoneyAmount;
  billingFrequency: PolicyBillingFrequency;
  coverage?: Record<string, unknown>;
}

export interface UpdatePolicyDto {
  agentId?: string;
  carrier?: string;
  productName?: string;
  status?: PolicyStatus;
  effectiveDate?: Date;
  expirationDate?: Date;
  premium?: MoneyAmount;
  billingFrequency?: PolicyBillingFrequency;
  coverage?: Record<string, unknown>;
}

// ========================================
// NOTE TYPES
// ========================================

export type NoteVisibility = 'private' | 'team' | 'public';
export type NoteType = 'general' | 'call' | 'email' | 'meeting' | 'system';

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  visibility: NoteVisibility;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
  attachments?: NoteAttachment[];
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface CreateNoteDto {
  leadId: string;
  content: string;
  visibility?: NoteVisibility;
  type?: NoteType;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface UpdateNoteDto {
  content?: string;
  visibility?: NoteVisibility;
  type?: NoteType;
}

export interface NoteFilterParams {
  leadId?: string;
  authorId?: string;
  visibility?: NoteVisibility;
  type?: NoteType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// ACTIVITY LOG TYPES
// ========================================

export type ActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'status_changed'
  | 'assignment_created'
  | 'assignment_updated'
  | 'note_created'
  | 'note_updated'
  | 'note_deleted'
  | 'email_sent'
  | 'email_received'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'system_action'
  | 'workflow_triggered';

export interface ActivityLog {
  id: string;
  leadId: string;
  userId?: string;
  activityType: ActivityType;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  user?: User;
}

export interface ActivityFilterParams {
  leadId?: string;
  userId?: string;
  activityType?: ActivityType | ActivityType[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// EMAIL TYPES
// ========================================

export type EmailStatus =
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'bounced';

export interface Email {
  id: string;
  leadId: string;
  senderId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  templateId?: string;
  threadId?: string;
  status: EmailStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  scheduledFor?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  template?: EmailTemplate;
  attachments?: EmailAttachment[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAttachment {
  id: string;
  emailId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface SendEmailDto {
  leadId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  templateId?: string;
  scheduledFor?: Date;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface EmailFilterParams {
  leadId?: string;
  senderId?: string;
  threadId?: string;
  status?: EmailStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// TASK TYPES
// ========================================

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  leadId: string;
  creatorId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  assignee?: User;
}

export interface CreateTaskDto {
  leadId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilterParams {
  leadId?: string;
  creatorId?: string;
  assigneeId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'note_mention'
  | 'email_received'
  | 'lead_assigned'
  | 'lead_updated'
  | 'system_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationFilterParams {
  userId?: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// OBSERVABILITY & SLO TYPES
// ========================================

export * from './observability';

// ========================================
// CARRIER TYPES
// ========================================

export type PartnershipTier = 'basic' | 'standard' | 'premium' | 'elite' | 'strategic';
export type PartnershipStatus = 'active' | 'pending' | 'suspended' | 'terminated' | 'renewal_needed';

export interface Carrier {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier: PartnershipTier;
  partnershipStatus: PartnershipStatus;
  contractStartDate: Date;
  contractEndDate?: Date;
  commissionRate: number;
  isActive: boolean;
  integrationEnabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  performanceScore: number;
  conversionRate: number;
  averageResponseTime: number;
  totalLeadsReceived: number;
  totalLeadsConverted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarrierPerformanceMetric {
  id: string;
  carrierId: string;
  month: number;
  year: number;
  leadsReceived: number;
  leadsConverted: number;
  conversionRate: number;
  averageResponseTime: number;
  averageQuoteValue: number;
  customerSatisfaction: number;
  onTimeDeliveryRate: number;
  createdAt: Date;
}

export interface CreateCarrierDto {
  name: string;
  description?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier?: PartnershipTier;
  contractStartDate: Date;
  contractEndDate?: Date;
  commissionRate: number;
  integrationEnabled?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface UpdateCarrierDto {
  name?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier?: PartnershipTier;
  partnershipStatus?: PartnershipStatus;
  contractStartDate?: Date;
  contractEndDate?: Date;
  commissionRate?: number;
  isActive?: boolean;
  integrationEnabled?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface CarrierFilterParams {
  name?: string;
  partnershipTier?: PartnershipTier;
  partnershipStatus?: PartnershipStatus;
  isActive?: boolean;
  integrationEnabled?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

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
  
  // Relationships
  policy?: Policy;
  insured?: Insured;
  carrier?: Carrier;
  statusHistory?: ClaimStatusHistory[];
  assignments?: ClaimAssignment[];
  documents?: ClaimDocument[];
  attachments?: ClaimAttachment[];
  payments?: ClaimPayment[];
  settlements?: ClaimSettlement[];
  communications?: ClaimCommunication[];
  notes?: ClaimNote[];
  taskList?: ClaimTask[];
  fraudIndicators?: ClaimFraudIndicator[];
  subrogation?: ClaimSubrogation;
  metrics?: ClaimMetrics;
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
export type PolicyStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';

export interface Policy {
  id: string;
  policyNumber: string;
  policyType: InsuranceType;
  carrierId: string;
  insuredId: string;
  effectiveDate: Date;
  expirationDate: Date;
  status: PolicyStatus;
  premium?: number;
  coverageLimit?: number;
  deductible?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  carrier?: Carrier;
  claims?: Claim[];
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
  policies?: Policy[];
  claims?: Claim[];
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
  claim?: Claim;
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
  assignments?: ClaimAssignment[];
  availability?: AdjusterAvailability[];
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
  claim?: Claim;
  adjuster?: Adjuster;
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
  adjuster?: Adjuster;
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
  claim?: Claim;
  accessLog?: ClaimDocumentAccessLog[];
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
  claim?: Claim;
}

export interface ClaimDocumentAccessLog {
  id: string;
  documentId: string;
  userId?: string;
  accessType: AccessType;
  accessedAt: Date;
  ipAddress?: string;
  document?: ClaimDocument;
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
  claim?: Claim;
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
  claim?: Claim;
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
  claim?: Claim;
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
export type NoteType = 'INTERNAL' | 'EXTERNAL' | 'INVESTIGATION' | 'DECISION';
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
  claim?: Claim;
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
  noteType: NoteType;
  noteTitle: string;
  noteContent: string;
  isConfidential: boolean;
  priority: NotePriority;
  
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  claim?: Claim;
}

export interface CreateNoteDto {
  claimId: string;
  noteType: NoteType;
  noteTitle: string;
  noteContent: string;
  isConfidential?: boolean;
  priority?: NotePriority;
}

export interface UpdateNoteDto {
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
  claim?: Claim;
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
  claim?: Claim;
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
export type ActivityType = 'LETTER_SENT' | 'RESPONSE_RECEIVED' | 'DEMAND' | 'NEGOTIATION' | 'SETTLEMENT' | 'LAWSUIT';

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
  claim?: Claim;
  activities?: SubrogationActivity[];
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
  activityType: ActivityType;
  activityDate: Date;
  description: string;
  createdBy?: string;
  createdAt: Date;
  subrogation?: ClaimSubrogation;
}

export interface CreateSubrogationActivityDto {
  subrogationId: string;
  activityType: ActivityType;
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
  claim?: Claim;
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
  claim?: Claim;
  carrier?: Carrier;
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
  carrier?: Carrier;
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

// Validation Schemas
export * from './validation.js';
export * from './scoring.js';

// Integration Types
export * from './integrations.js';

// Retention Types
export * from './retention.js';

// VIP & Community
export * from './vip.js';
export * from './community.js';

// Financial Services
export * from './financial-services.js';
