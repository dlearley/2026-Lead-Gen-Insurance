// ========================================
// POLICY TYPES - Phase 26.3
// ========================================

/**
 * Policy status workflow
 */
export type PolicyStatus =
  | 'draft' // Initial creation, not yet issued
  | 'pending_payment' // Awaiting initial premium payment
  | 'active' // Policy is active and in force
  | 'cancelled' // Policy cancelled by customer or carrier
  | 'lapsed' // Policy lapsed due to non-payment
  | 'expired' // Policy reached expiration date
  | 'non_renewed'; // Policy not renewed

/**
 * Policy billing frequency options
 */
export type PolicyBillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

/**
 * Policy endorsement types
 */
export type PolicyEndorsementType =
  | 'coverage_change'
  | 'driver_addition'
  | 'vehicle_change'
  | 'address_change'
  | 'premium_adjustment'
  | 'other';

/**
 * Policy endorsement status
 */
export type PolicyEndorsementStatus = 'pending' | 'approved' | 'issued' | 'rejected';

/**
 * Policy document types
 */
export type PolicyDocumentType =
  | 'policy_document'
  | 'declarations_page'
  | 'insurance_card'
  | 'endorsement'
  | 'invoice'
  | 'receipt'
  | 'cancellation_notice'
  | 'renewal_notice'
  | 'certificate_of_insurance'
  | 'other';

/**
 * Payment methods
 */
export type PaymentMethod = 'credit_card' | 'ach' | 'check' | 'cash' | 'wire';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/**
 * Renewal status
 */
export type RenewalStatus = 'pending' | 'offered' | 'accepted' | 'rejected' | 'completed';

/**
 * Money amount interface
 */
export interface MoneyAmount {
  amount: number;
  currency: string;
}

/**
 * Main Policy interface
 */
export interface Policy {
  id: string;
  policyNumber: string; // Auto-generated unique policy number
  leadId: string; // Link to lead/customer
  agentId?: string; // Assigned agent
  carrier?: string; // Insurance carrier
  productName?: string; // Product name
  insuranceType: string; // auto, home, life, health, commercial
  status: PolicyStatus;

  // Policy dates
  effectiveDate: Date;
  expirationDate: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  // Financial information
  premiumAmount: number;
  billingFrequency: PolicyBillingFrequency;
  commissionRate: number; // Agent commission rate
  totalPremiumCollected: number;

  // Coverage details
  coverage?: Record<string, unknown>;
  deductible?: number;
  policyholderInfo?: Record<string, unknown>;

  // Renewal links
  renewalOfPolicyId?: string; // This policy is a renewal of...
  renewedToPolicyId?: string; // This policy was renewed to...

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  endorsements?: PolicyEndorsement[];
  documents?: PolicyDocument[];
  payments?: PolicyPayment[];
  renewals?: PolicyRenewal[];
  activities?: PolicyActivity[];
}

/**
 * Policy endorsements for policy changes
 */
export interface PolicyEndorsement {
  id: string;
  policyId: string;
  type: PolicyEndorsementType;
  effectiveDate: Date;
  description?: string;
  changes?: Record<string, unknown>;
  premiumDelta?: number; // Change in premium
  newPremium?: number; // New premium amount
  status: PolicyEndorsementStatus;
  issuedAt?: Date;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Policy documents/attachments
 */
export interface PolicyDocument {
  id: string;
  policyId: string;
  documentType: PolicyDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  description?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  version: number;
  createdAt: Date;
}

/**
 * Policy payments and billing
 */
export interface PolicyPayment {
  id: string;
  policyId: string;
  paymentNumber: string; // Unique payment number
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  failureReason?: string;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Policy renewals
 */
export interface PolicyRenewal {
  id: string;
  policyId: string;
  renewalPolicyId?: string; // ID of the new/renewed policy
  renewalQuoteAmount?: number; // Initial renewal quote
  renewalPremium?: number; // Final renewal premium
  offeredDate?: Date;
  acceptedDate?: Date;
  rejectedDate?: Date;
  rejectionReason?: string;
  status: RenewalStatus;
  createdAt: Date;
}

/**
 * Policy activity log for audit trail
 */
export interface PolicyActivity {
  id: string;
  policyId: string;
  userId?: string;
  activityType: string;
  action: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ========================================
// DTOs - Data Transfer Objects
// ========================================

/**
 * Create new policy
 */
export interface CreatePolicyDto {
  leadId: string;
  agentId?: string;
  insuranceType: string;
  carrier?: string;
  productName?: string;
  effectiveDate: Date | string;
  expirationDate: Date | string;
  premiumAmount: number;
  billingFrequency: PolicyBillingFrequency;
  commissionRate?: number;
  coverage?: Record<string, unknown>;
  deductible?: number;
  policyholderInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Update existing policy
 */
export interface UpdatePolicyDto {
  agentId?: string;
  carrier?: string;
  productName?: string;
  status?: PolicyStatus;
  effectiveDate?: Date | string;
  expirationDate?: Date | string;
  premiumAmount?: number;
  billingFrequency?: PolicyBillingFrequency;
  commissionRate?: number;
  coverage?: Record<string, unknown>;
  deductible?: number;
  policyholderInfo?: Record<string, unknown>;
  cancellationReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create policy endorsement
 */
export interface CreateEndorsementDto {
  type: PolicyEndorsementType;
  effectiveDate: Date | string;
  description?: string;
  changes?: Record<string, unknown>;
  premiumDelta?: number;
  newPremium?: number;
}

/**
 * Update endorsement
 */
export interface UpdateEndorsementDto {
  type?: PolicyEndorsementType;
  effectiveDate?: Date | string;
  description?: string;
  changes?: Record<string, unknown>;
  premiumDelta?: number;
  newPremium?: number;
  status?: PolicyEndorsementStatus;
}

/**
 * Add document to policy
 */
export interface AddPolicyDocumentDto {
  documentType: PolicyDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string;
}

/**
 * Update policy document
 */
export interface UpdatePolicyDocumentDto {
  documentType?: PolicyDocumentType;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  isVerified?: boolean;
}

/**
 * Record policy payment
 */
export interface CreatePolicyPaymentDto {
  amount: number;
  dueDate: Date | string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Update policy payment
 */
export interface UpdatePolicyPaymentDto {
  amount?: number;
  dueDate?: Date | string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  notes?: string;
}

/**
 * Renew policy
 */
export interface RenewPolicyDto {
  renewalPremium: number;
  effectiveDate: Date | string;
  expirationDate: Date | string;
}

/**
 * Update renewal
 */
export interface UpdatePolicyRenewalDto {
  renewalPolicyId?: string;
  renewalQuoteAmount?: number;
  renewalPremium?: number;
  status?: RenewalStatus;
  rejectionReason?: string;
}

/**
 * Filter parameters for querying policies
 */
export interface PolicyFilterParams {
  leadId?: string;
  agentId?: string;
  carrier?: string;
  insuranceType?: string;
  status?: PolicyStatus | PolicyStatus[];
  policyNumber?: string;
  effectiveDateFrom?: Date | string;
  effectiveDateTo?: Date | string;
  expirationDateFrom?: Date | string;
  expirationDateTo?: Date | string;
  minPremium?: number;
  maxPremium?: number;
  renewalOfPolicyId?: string;
  renewedToPolicyId?: string;
  search?: string; // Search in policy number, policyholder name
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters for endorsements
 */
export interface EndorsementFilterParams {
  policyId?: string;
  type?: PolicyEndorsementType | PolicyEndorsementType[];
  status?: PolicyEndorsementStatus | PolicyEndorsementStatus[];
  effectiveDateFrom?: Date | string;
  effectiveDateTo?: Date | string;
  page?: number;
  limit?: number;
}

/**
 * Filter parameters for documents
 */
export interface PolicyDocumentFilterParams {
  policyId?: string;
  documentType?: PolicyDocumentType | PolicyDocumentType[];
  uploadedBy?: string;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Filter parameters for payments
 */
export interface PolicyPaymentFilterParams {
  policyId?: string;
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  paymentMethod?: PaymentMethod | PaymentMethod[];
  status?: PaymentStatus | PaymentStatus[];
  page?: number;
  limit?: number;
}

/**
 * Filter parameters for renewals
 */
export interface PolicyRenewalFilterParams {
  policyId?: string;
  renewalPolicyId?: string;
  status?: RenewalStatus | RenewalStatus[];
  offeredDateFrom?: Date | string;
  offeredDateTo?: Date | string;
  page?: number;
  limit?: number;
}

// ========================================
// POLICY STATISTICS & ANALYTICS
// ========================================

/**
 * Policy statistics summary
 */
export interface PolicyStatistics {
  totalPolicies: number;
  policiesByStatus: Partial<Record<PolicyStatus, number>>;
  policiesByInsuranceType: Partial<Record<string, number>>;
  policiesByCarrier: Partial<Record<string, number>>;

  // Financial metrics
  totalWrittenPremium: number;
  totalPremiumCollected: number;
  averagePremiumPerPolicy: number;
  totalCommissions: number;

  // Renewal metrics
  renewalRate: number; // percentage
  retentionRate: number; // percentage
  nonRenewalRate: number; // percentage

  // Lifecycle metrics
  averagePolicyAge: number; // in days
  cancellationRate: number; // percentage
  lapseRate: number; // percentage
  expirationRate: number; // percentage;
}

/**
 * Policy payment summary
 */
export interface PolicyPaymentSummary {
  totalPayments: number;
  totalPaid: number;
  totalPending: number;
  totalFailed: number;
  totalRefunded: number;
  averagePaymentAmount: number;
  paymentRate: number; // percentage
}

/**
 * Expiring policies summary
 */
export interface ExpiringPoliciesSummary {
  policiesExpiringIn30Days: number;
  policiesExpiringIn60Days: number;
  policiesExpiringIn90Days: number;
  totalPremiumAtRisk: number;
  renewalEligibleCount: number;
  nonRenewalPredictedCount: number;
}

/**
 * Policy timeline event
 */
export interface PolicyTimelineEvent {
  id: string;
  timestamp: Date;
  eventType: 'created' | 'updated' | 'status_change' | 'endorsement' | 'payment' | 'renewal' | 'cancellation' | 'document_added' | 'other';
  title: string;
  description: string;
  actor?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
}
