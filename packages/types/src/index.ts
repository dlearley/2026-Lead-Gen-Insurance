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
// INSURANCE COMPLIANCE TYPES
// ========================================

export * from './insurance-compliance.types.js';
