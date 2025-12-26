// User-related types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  team_id?: number;
  team_name?: string;
  created_at: string;
  updated_at: string;
}

// Lead Source types
export interface LeadSource {
  id: number;
  name: string;
  type: LeadSourceType;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lead_count: number;
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

// Campaign types
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  source_id?: number;
  team_id?: number;
  start_date?: string;
  end_date?: string;
  budget: number;
  status: CampaignStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source_name?: string;
  team_name?: string;
  lead_count: number;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Team types
export interface Team {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

// API Response types
export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}
