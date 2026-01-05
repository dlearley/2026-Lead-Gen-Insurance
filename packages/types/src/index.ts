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
  partnershipStatus?: PartnershipStatus;
  contractStartDate: Date;
  contractEndDate?: Date;
  commissionRate?: number;
  isActive?: boolean;
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
  partnershipStatus?: PartnershipStatus | PartnershipStatus[];
  partnershipTier?: PartnershipTier | PartnershipTier[];
  isActive?: boolean;
  integrationEnabled?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCarrierPerformanceMetricDto {
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
}

export interface UpdateCarrierPerformanceMetricDto {
  leadsReceived?: number;
  leadsConverted?: number;
  conversionRate?: number;
  averageResponseTime?: number;
  averageQuoteValue?: number;
  customerSatisfaction?: number;
  onTimeDeliveryRate?: number;
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specializations: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  isActive: boolean;
  maxLeadCapacity: number;
  currentLeadCount: number;
  averageResponseTime: number;
  conversionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  agentId: string;
  assignedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'timeout';
  acceptedAt?: Date;
  notes?: string;
}

export interface Event {
  id: string;
  type: string;
  source: string;
  data: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ========================================
// REFERRAL PROGRAM TYPES
// ========================================

export type PartnerStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export type ReferralSource = 
  | 'website'
  | 'mobile_app'
  | 'email'
  | 'phone'
  | 'in_person'
  | 'social_media'
  | 'other';

export type ReferralStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'paid'
  | 'expired';

export type RewardStatus = 
  | 'pending'
  | 'calculated'
  | 'approved'
  | 'paid'
  | 'cancelled';

export interface Partner {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  referralCode: string;
  status: PartnerStatus;
  commissionRate: number;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Referral {
  id: string;
  partnerId: string;
  leadId?: string;
  referralCode: string;
  source: ReferralSource;
  status: ReferralStatus;
  referredAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  convertedAt?: Date;
  conversionValue?: number;
  notes?: string;
  partner?: Partner;
  lead?: Lead;
  reward?: Reward;
}

export interface Reward {
  id: string;
  partnerId: string;
  referralId: string;
  amount: number;
  currency: string;
  status: RewardStatus;
  calculatedAt: Date;
  paidAt?: Date;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  partner?: Partner;
  referral?: Referral;
}

export interface CreatePartnerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  commissionRate?: number;
  userId?: string;
}

export interface UpdatePartnerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  commissionRate?: number;
  status?: PartnerStatus;
}

export interface CreateReferralDto {
  partnerId: string;
  referralCode: string;
  source: ReferralSource;
  leadId?: string;
  notes?: string;
}

export interface UpdateReferralDto {
  status?: ReferralStatus;
  leadId?: string;
  notes?: string;
  conversionValue?: number;
}

export interface CreateRewardDto {
  partnerId: string;
  referralId: string;
  amount: number;
  currency?: string;
  notes?: string;
}

export interface UpdateRewardDto {
  status?: RewardStatus;
  amount?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

export interface PartnerFilterParams {
  status?: PartnerStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ReferralFilterParams {
  partnerId?: string;
  leadId?: string;
  status?: ReferralStatus;
  source?: ReferralSource;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RewardFilterParams {
  partnerId?: string;
  referralId?: string;
  status?: RewardStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReferralAnalytics {
  totalReferrals: number;
  successfulReferrals: number;
  conversionRate: number;
  totalRevenue: number;
  averageConversionValue: number;
  topPartners: Array<{
    partnerId: string;
    partnerName: string;
    referralCount: number;
    conversionCount: number;
    earnings: number;
  }>;
  sourceDistribution: Record<ReferralSource, number>;
  statusDistribution: Record<ReferralStatus, number>;
}

export interface ProcessingResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  processingTime: number;
}

// Claims Management (Phase 10.1)
export * from './claims.js';

export * from './events.js';
export * from './analytics.js';

// Customer Types
export * from './customers.js';

// Report Types
export * from './reports.js';

// Business Intelligence Types
export * from './bi.js';

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

// ========================================
// GDPR & DATA PRIVACY TYPES (Phase 25.1B)
// ========================================

// DSAR Types
export type DSARType = 
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'
  | 'automated_decision';

export type DSARStatus = 
  | 'pending'
  | 'verification_pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'escalated';

export type GDPRArticle = 
  | 'Article 15'
  | 'Article 16'
  | 'Article 17'
  | 'Article 18'
  | 'Article 20'
  | 'Article 21'
  | 'Article 22'
  | 'Article 6'
  | 'Article 7';

export type VerificationMethod = 
  | 'email_verification'
  | 'phone_verification'
  | 'id_verification'
  | 'security_questions'
  | 'biometric';

export type DSARPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

export interface DSARRequest {
  id: string;
  userId: string;
  type: DSARType;
  status: DSARStatus;
  requestedAt: Date;
  completedAt?: Date;
  dueDate: Date;
  email: string;
  legalBasis: GDPRArticle;
  description?: string;
  verificationMethod: VerificationMethod;
  verifiedAt?: Date;
  notes?: string;
  attachments?: string[];
  priority: DSARPriority;
}

// Consent Management Types
export type ConsentCategory = 
  | 'essential'
  | 'functional'
  | 'marketing'
  | 'analytics'
  | 'personalization'
  | 'third_party'
  | 'automated_processing'
  | 'research';

export interface ConsentGranularity {
  purpose: string;
  category: ConsentCategory;
  specificFields?: string[];
  processingActivities?: string[];
  thirdPartySharing?: boolean;
  retentionPeriod?: number;
  consentGiven: boolean;
  consentWithdrawnAt?: Date;
  legalBasis: GDPRArticle;
}

export interface ConsentBanner {
  id: string;
  title: string;
  description: string;
  purposes: ConsentPurpose[];
  showOnPage: string[];
  position: 'top' | 'bottom' | 'center' | 'modal';
  style: ConsentBannerStyle;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  category: ConsentCategory;
  required: boolean;
  legalBasis: GDPRArticle;
  thirdPartyIntegrations?: ThirdPartyIntegration[];
  dataFields?: string[];
  retentionPeriod?: number;
  showInBanner: boolean;
  order: number;
}

export interface ConsentBannerStyle {
  theme: 'light' | 'dark' | 'auto';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    button: string;
    buttonText: string;
  };
  borderRadius: number;
  fontSize: number;
  showRejectAll: boolean;
  showAcceptAll: boolean;
  showManagePreferences: boolean;
}

export interface ThirdPartyIntegration {
  name: string;
  purpose: string;
  dataShared: string[];
  retentionPeriod: number;
  privacyPolicyUrl: string;
  optOutUrl?: string;
}

export interface ConsentAction {
  purposeId: string;
  action: 'accepted' | 'rejected' | 'withdrawn';
  timestamp: Date;
  method: 'banner' | 'api' | 'email' | 'phone' | 'form';
}

// Data Retention Types
export type DataCategory = 
  | 'personal_data'
  | 'sensitive_data'
  | 'financial_data'
  | 'health_data'
  | 'biometric_data'
  | 'location_data'
  | 'behavioral_data'
  | 'analytics_data'
  | 'system_data'
  | 'audit_data';

export type DeletionMethod = 
  | 'hard_delete'
  | 'soft_delete'
  | 'anonymize'
  | 'pseudonymize'
  | 'archive';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: string;
  category: DataCategory;
  retentionPeriod: RetentionPeriod;
  deletionMethod: DeletionMethod;
  legalBasis?: string;
  gdprArticle?: string;
  conditions?: RetentionCondition[];
  exceptions?: RetentionException[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface RetentionPeriod {
  duration: number;
  unit: 'days' | 'months' | 'years';
  trigger: 'creation' | 'last_access' | 'account_closure' | 'consent_withdrawal' | 'legal_hold';
  maxDuration?: number;
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  description: string;
}

export interface RetentionException {
  condition: RetentionCondition;
  action: 'exclude' | 'extend' | 'anonymize';
  newPeriod?: RetentionPeriod;
  description: string;
}

export interface DataRecord {
  id: string;
  dataType: string;
  category: DataCategory;
  userId?: string;
  createdAt: Date;
  lastAccessedAt?: Date;
  retentionPolicyId: string;
  legalHold?: boolean;
  metadata: Record<string, any>;
  deletionScheduled?: Date;
  deletionExecuted?: Date;
  deletionMethod?: DeletionMethod;
  status: 'active' | 'pending_deletion' | 'deleted' | 'archived' | 'legal_hold';
}

// Compliance Types
export interface ComplianceAudit {
  id: string;
  date: Date;
  scope: ComplianceScope[];
  findings: ComplianceFinding[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'in_progress' | 'completed' | 'requires_action';
  auditor: string;
}

export interface ComplianceScope {
  area: string;
  description: string;
  controls: string[];
}

export interface ComplianceFinding {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  gdprArticle?: GDPRArticle;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface RetentionJob {
  id: string;
  dataType: string;
  retentionPolicy: string;
  scheduledFor: Date;
  executedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  affectedRecords: number;
  deletionMethod: 'hard' | 'soft' | 'anonymize';
  logs: string[];
  createdAt: Date;
}
