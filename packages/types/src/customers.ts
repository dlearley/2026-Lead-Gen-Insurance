// ========================================
// CUSTOMER TYPES
// ========================================

// Local type references to avoid circular imports
type CustomerInsuranceType = 'auto' | 'home' | 'life' | 'health' | 'commercial';

interface CustomerLeadRef {
  id: string;
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  insuranceType?: CustomerInsuranceType;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerLeadAssignmentRef {
  id: string;
  leadId: string;
  agentId: string;
  assignedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'timeout';
}

interface CustomerQuoteRef {
  id: string;
  insuranceType: CustomerInsuranceType;
  status: string;
  premium: number;
  totalCoverage: number;
  validUntil: Date;
  createdAt: Date;
}

interface CustomerProposalRef {
  id: string;
  title: string;
  status: string;
  totalPremium: number;
  totalCoverage: number;
  validUntil: Date;
  createdAt: Date;
}

interface CustomerActivityLogRef {
  id: string;
  leadId: string;
  activityType: string;
  action: string;
  description?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  leadId: string;
  email: string;
  phoneNumber?: string;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lead?: CustomerLeadRef;
  profile?: CustomerProfile;
  documents?: CustomerDocument[];
}

export interface CustomerProfile {
  id: string;
  customerId: string;
  dateOfBirth?: Date;
  preferredContact: 'email' | 'phone' | 'both';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: 'id_proof' | 'income' | 'address' | 'insurance_card' | 'other';
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMessage {
  id: string;
  customerId: string;
  agentId?: string;
  senderType: 'customer' | 'agent' | 'system';
  subject?: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// ========================================
// CUSTOMER AUTH TYPES
// ========================================

export interface CustomerRegisterRequest {
  leadId: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface CustomerLoginRequest {
  email: string;
  password: string;
}

export interface CustomerAuthResponse {
  customer: Customer;
  token: string;
}

export interface CustomerUpdateProfileDto {
  dateOfBirth?: Date;
  preferredContact?: 'email' | 'phone' | 'both';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ========================================
// CUSTOMER PORTAL TYPES
// ========================================

export interface CustomerDashboard {
  lead: CustomerLeadRef;
  assignments: CustomerLeadAssignmentRef[];
  quotes: CustomerQuoteRef[];
  proposals: CustomerProposalRef[];
  pendingDocuments: number;
  unreadMessages: number;
  recentActivity: CustomerActivityLogRef[];
}

export interface CustomerQuote {
  id: string;
  quoteId: string;
  insuranceType: CustomerInsuranceType;
  coverageTier: string;
  status: string;
  premium: number;
  totalCoverage: number;
  validUntil: Date;
  createdAt: Date;
}

export interface CustomerProposal {
  id: string;
  proposalId: string;
  title: string;
  status: string;
  totalPremium: number;
  totalCoverage: number;
  validUntil: Date;
  createdAt: Date;
}

export interface CustomerDocumentUpload {
  fileName: string;
  fileData: string; // base64 encoded
  mimeType: string;
  documentType: 'id_proof' | 'income' | 'address' | 'insurance_card' | 'other';
}

export interface SendMessageDto {
  agentId?: string;
  subject?: string;
  message: string;
}

// ========================================
// CUSTOMER FILTER TYPES
// ========================================

export interface CustomerFilterParams {
  customerId?: string;
  leadId?: string;
  email?: string;
  isVerified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CustomerDocumentFilterParams {
  customerId?: string;
  documentType?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface CustomerMessageFilterParams {
  customerId?: string;
  agentId?: string;
  senderType?: string;
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}
