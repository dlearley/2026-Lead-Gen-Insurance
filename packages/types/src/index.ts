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
  insuranceType?: 'auto' | 'home' | 'life' | 'health' | 'commercial';
  qualityScore?: number;
  status: 'received' | 'processing' | 'qualified' | 'routed' | 'converted' | 'rejected';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
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

export interface ProcessingResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  processingTime: number;
}
