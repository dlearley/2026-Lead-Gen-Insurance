export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted'
  | 'lost';

export type LeadPriority = 'high' | 'medium' | 'low';

export type InsuranceType = 
  | 'auto'
  | 'home'
  | 'life'
  | 'health'
  | 'commercial'
  | 'other';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Computed full name
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: LeadStatus;
  priority: LeadPriority;
  insuranceType?: InsuranceType;
  valueEstimate?: number;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  location?: string; // Computed location string
  source?: string;
  campaign?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  lastContactedAt?: string;
  score?: number; // Lead score for advanced filtering
  isReturning?: boolean; // Returning customer flag
  hasEmail?: boolean; // Computed from email field
  hasPhone?: boolean; // Computed from phone field
}

export interface LeadCreate {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  insuranceType?: InsuranceType;
  priority?: LeadPriority;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  valueEstimate?: number;
  sourceId?: number;
  campaignId?: number;
}

export interface LeadUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  insuranceType?: InsuranceType;
  notes?: string;
  valueEstimate?: number;
  assigneeId?: string;
  followUpDate?: string;
}

export interface LeadFilter {
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  assigneeId?: string;
  unassigned?: boolean;
  search?: string;
  insuranceType?: InsuranceType;
  dateFrom?: string;
  dateTo?: string;
  location?: string; // Location-based filtering
  score?: {
    min?: number;
    max?: number;
  };
  hasEmail?: boolean; // Filter by email presence
  hasPhone?: boolean; // Filter by phone presence
  isReturning?: boolean; // Filter by returning customer status
}

export interface LeadListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Lead[];
}

export interface PaginatedLeads {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  userName?: string;
  type: 'created' | 'updated' | 'status_changed' | 'assigned' | 'viewed' | 'note_added' | 'called' | 'emailed';
  description: string;
  createdAt: string;
}

export interface LeadDetail extends Lead {
  activities: LeadActivity[];
  statusHistory: {
    id: string;
    oldStatus?: string;
    newStatus: string;
    changedByName?: string;
    reason?: string;
    createdAt: string;
  }[];
  assignmentHistory: {
    id: string;
    agentId: string;
    agentName: string;
    assignedByName?: string;
    reason?: string;
    createdAt: string;
  }[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'default';
}

export interface FieldLocation {
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number;
}
