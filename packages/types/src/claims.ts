// ========================================
// CLAIMS TYPES - Phase 10.1
// ========================================

/**
 * Types of insurance claims
 */
export type ClaimType =
  | 'auto_accident'
  | 'auto_theft'
  | 'auto_vandalism'
  | 'home_property_damage'
  | 'home_theft'
  | 'home_fire'
  | 'home_water_damage'
  | 'home_natural_disaster'
  | 'life_death'
  | 'life_terminal_illness'
  | 'health_medical'
  | 'health_hospitalization'
  | 'health_surgery'
  | 'liability_personal'
  | 'liability_professional'
  | 'other';

/**
 * Claim status workflow
 */
export type ClaimStatus =
  | 'draft' // Initial creation, not yet submitted
  | 'submitted' // Submitted by customer
  | 'under_review' // Initial review by claims department
  | 'investigating' // Active investigation in progress
  | 'awaiting_information' // Waiting for additional info from customer
  | 'approved' // Claim has been approved
  | 'denied' // Claim has been denied
  | 'in_payment' // Payment is being processed
  | 'paid' // Payment has been completed
  | 'closed' // Claim is closed
  | 'disputed' // Claim is under dispute/appeal
  | 'cancelled'; // Claim was cancelled

/**
 * Claim priority levels
 */
export type ClaimPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Claim severity assessment
 */
export type ClaimSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

/**
 * Document types for claims
 */
export type ClaimDocumentType =
  | 'police_report'
  | 'medical_record'
  | 'photo_evidence'
  | 'repair_estimate'
  | 'invoice'
  | 'receipt'
  | 'witness_statement'
  | 'insurance_card'
  | 'drivers_license'
  | 'incident_report'
  | 'other';

/**
 * Main Claim interface
 */
export interface Claim {
  id: string;
  claimNumber: string; // Auto-generated unique claim number
  leadId: string; // Link to the lead/customer
  agentId?: string; // Assigned claims adjuster/agent
  policyNumber?: string; // Associated policy number
  insuranceType: string; // auto, home, life, health, commercial
  claimType: ClaimType;
  status: ClaimStatus;
  priority: ClaimPriority;
  severity: ClaimSeverity;

  // Incident details
  incidentDate: Date;
  incidentLocation?: string;
  incidentDescription: string;

  // Financial information
  claimedAmount: number;
  approvedAmount?: number;
  deductible?: number;
  paidAmount?: number;

  // Dates and timeline
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  deniedAt?: Date;
  paidAt?: Date;
  closedAt?: Date;

  // Additional information
  denialReason?: string;
  adjusterNotes?: string;
  fraudScore?: number; // 0-100, higher = more likely fraud
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;

  // Relationships
  documents?: ClaimDocument[];
  notes?: ClaimNote[];
  activities?: ClaimActivity[];
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
}

/**
 * Claim documents/attachments
 */
export interface ClaimDocument {
  id: string;
  claimId: string;
  documentType: ClaimDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  description?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

/**
 * Notes and comments on claims
 */
export interface ClaimNote {
  id: string;
  claimId: string;
  authorId: string;
  content: string;
  isInternal: boolean; // Internal notes vs customer-visible
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Claim activity log for audit trail
 */
export interface ClaimActivity {
  id: string;
  claimId: string;
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
 * Create new claim
 */
export interface CreateClaimDto {
  leadId: string;
  policyNumber?: string;
  insuranceType: string;
  claimType: ClaimType;
  incidentDate: Date | string;
  incidentLocation?: string;
  incidentDescription: string;
  claimedAmount: number;
  deductible?: number;
  priority?: ClaimPriority;
  severity?: ClaimSeverity;
  metadata?: Record<string, unknown>;
}

/**
 * Update existing claim
 */
export interface UpdateClaimDto {
  agentId?: string;
  policyNumber?: string;
  claimType?: ClaimType;
  status?: ClaimStatus;
  priority?: ClaimPriority;
  severity?: ClaimSeverity;
  incidentDate?: Date | string;
  incidentLocation?: string;
  incidentDescription?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  deductible?: number;
  paidAmount?: number;
  denialReason?: string;
  adjusterNotes?: string;
  fraudScore?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Add document to claim
 */
export interface AddClaimDocumentDto {
  documentType: ClaimDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string;
}

/**
 * Add note to claim
 */
export interface AddClaimNoteDto {
  content: string;
  isInternal?: boolean;
}

/**
 * Update claim note
 */
export interface UpdateClaimNoteDto {
  content?: string;
  isInternal?: boolean;
}

/**
 * Filter parameters for querying claims
 */
export interface ClaimFilterParams {
  leadId?: string;
  agentId?: string;
  policyNumber?: string;
  insuranceType?: string;
  claimType?: ClaimType | ClaimType[];
  status?: ClaimStatus | ClaimStatus[];
  priority?: ClaimPriority | ClaimPriority[];
  severity?: ClaimSeverity | ClaimSeverity[];
  incidentDateFrom?: Date | string;
  incidentDateTo?: Date | string;
  submittedDateFrom?: Date | string;
  submittedDateTo?: Date | string;
  minAmount?: number;
  maxAmount?: number;
  search?: string; // Search in claim number, description, location
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// CLAIM STATISTICS & ANALYTICS
// ========================================

/**
 * Claim statistics summary
 */
export interface ClaimStatistics {
  totalClaims: number;
  claimsByStatus: Partial<Record<ClaimStatus, number>>;
  claimsByType: Partial<Record<ClaimType, number>>;
  claimsByPriority: Partial<Record<ClaimPriority, number>>;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  averageClaimAmount: number;
  averageProcessingTime: number; // in days
  approvalRate: number; // percentage
  denialRate: number; // percentage
  averageFraudScore: number;
}

/**
 * Claim timeline event
 */
export interface ClaimTimelineEvent {
  id: string;
  timestamp: Date;
  eventType: 'status_change' | 'document_added' | 'note_added' | 'payment' | 'assignment' | 'other';
  title: string;
  description: string;
  actor?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
}
