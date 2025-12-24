// Lead-related types
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  CONVERTED = 'converted',
  LOST = 'lost'
}

export enum LeadPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum LeadSourceType {
  WEB_FORM = 'web_form',
  CALL = 'call',
  REFERRAL = 'referral',
  PAID_ADS = 'paid_ads',
  ORGANIC = 'organic',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  PARTNER = 'partner',
  OTHER = 'other'
}

export enum ActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted',
  VIEWED = 'viewed',
  EXPORTED = 'exported',
  BULK_UPDATED = 'bulk_updated',
  REASSIGNED = 'reassigned'
}

export interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  source_id?: number;
  campaign_id?: number;
  status: LeadStatus;
  priority: LeadPriority;
  assignee_id?: number;
  notes?: string;
  follow_up_date?: string;
  value_estimate: number;
  insurance_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  tags?: string;
  created_by_id?: number;
  created_at: string;
  updated_at: string;
  source_name?: string;
  campaign_name?: string;
  assignee_name?: string;
  full_name: string;
}

export interface LeadDetail extends Lead {
  activities: Activity[];
  status_history: StatusHistory[];
  assignment_history: AssignmentHistory[];
}

export interface LeadCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  source_id?: number;
  campaign_id?: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignee_id?: number;
  notes?: string;
  follow_up_date?: string;
  value_estimate?: number;
  insurance_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tags?: string;
}

export interface LeadUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  source_id?: number;
  campaign_id?: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignee_id?: number;
  notes?: string;
  follow_up_date?: string;
  value_estimate?: number;
  insurance_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tags?: string;
}

export interface LeadAssign {
  assignee_id: number;
  reason?: string;
}

export interface LeadStatusUpdate {
  status: LeadStatus;
  reason?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Filter types
export interface LeadFilters {
  status?: LeadStatus[];
  priority?: LeadPriority[];
  source_id?: number;
  campaign_id?: number;
  assignee_id?: number;
  unassigned?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  insurance_type?: string;
  tags?: string;
}

// Bulk operations
export interface BulkUpdateRequest {
  lead_ids: number[];
  updates: LeadUpdate;
}

export interface BulkAssignRequest {
  lead_ids: number[];
  assignee_id: number;
  reason?: string;
}

export interface BulkStatusUpdateRequest {
  lead_ids: number[];
  status: LeadStatus;
  reason?: string;
}

export interface BulkDeleteRequest {
  lead_ids: number[];
}

export interface BulkOperationResponse {
  success: number[];
  failed: Array<{ id: number; error: string }>;
  message: string;
}

// Activity types
export interface Activity {
  id: number;
  lead_id: number;
  user_id?: number;
  activity_type: ActivityType;
  description?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user_name?: string;
}

export interface StatusHistory {
  id: number;
  lead_id: number;
  old_status?: string;
  new_status: string;
  changed_by_id?: number;
  reason?: string;
  created_at: string;
  changed_by_name?: string;
}

export interface AssignmentHistory {
  id: number;
  lead_id: number;
  agent_id: number;
  assigned_by_id?: number;
  assignment_type?: string;
  reason?: string;
  created_at: string;
  agent_name?: string;
  assigned_by_name?: string;
}

// Export types
export type ExportFormat = 'csv' | 'json';

export interface ExportRequest {
  filters?: LeadFilters;
  format?: ExportFormat;
  include_activities?: boolean;
}

// Stats
export interface LeadStats {
  total: number;
  by_status: Record<LeadStatus, number>;
  by_priority: Record<LeadPriority, number>;
  unassigned: number;
  by_source: Record<string, number>;
}
