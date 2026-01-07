// ========================================
// AGENT CONFIGURATION & CUSTOMIZATION TYPES
// ========================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export type LeadPreferenceLevel = 'preferred' | 'neutral' | 'avoid';

export type CertificationStatus = 'active' | 'expired' | 'pending_renewal' | 'suspended';

export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline';

// Agent Work Hours Configuration
export interface WorkHours {
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  isEnabled: boolean;
  timezone?: string;
}

// Agent Availability Schedule
export interface AgentAvailability {
  id: string;
  agentId: string;
  status: AvailabilityStatus;
  workHours: WorkHours[];
  breakTimes?: Array<{
    startTime: string;
    endTime: string;
    description?: string;
  }>;
  timeOff?: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;
  maxConcurrentLeads?: number;
  autoAcceptLeads: boolean;
  updatedAt: Date;
}

// Agent Lead Preferences
export interface AgentLeadPreferences {
  id: string;
  agentId: string;
  insuranceTypes: {
    [key: string]: LeadPreferenceLevel; // e.g., { "auto": "preferred", "life": "neutral" }
  };
  minLeadQualityScore?: number; // Minimum quality score to accept (0-100)
  maxLeadQualityScore?: number; // Maximum quality score to accept
  preferredLocations?: string[]; // State codes or zip codes
  excludedLocations?: string[];
  minBudget?: number;
  maxBudget?: number;
  preferredLeadSources?: string[];
  excludedLeadSources?: string[];
  languages?: string[]; // e.g., ["en", "es", "fr"]
  updatedAt: Date;
}

// Agent Notification Preferences
export interface AgentNotificationPreferences {
  id: string;
  agentId: string;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  leadAssignment: {
    enabled: boolean;
    channels: NotificationChannel[];
    quietHours?: {
      startTime: string;
      endTime: string;
    };
  };
  leadUpdates: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
  performanceAlerts: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
  systemNotifications: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
  updatedAt: Date;
}

// Agent Profile Customization
export interface AgentProfileCustomization {
  id: string;
  agentId: string;
  bio?: string;
  profileImageUrl?: string;
  headline?: string; // e.g., "Experienced Auto Insurance Specialist"
  yearsOfExperience?: number;
  languages?: string[];
  awards?: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  videoIntroUrl?: string;
  tagline?: string;
  updatedAt: Date;
}

// Agent Skills & Certifications
export interface AgentCertification {
  id: string;
  agentId: string;
  name: string;
  issuingOrganization: string;
  certificationNumber?: string;
  issueDate: Date;
  expirationDate?: Date;
  status: CertificationStatus;
  documentUrl?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSkill {
  id: string;
  agentId: string;
  skillName: string;
  category: string; // e.g., "insurance_type", "sales", "technical"
  proficiencyLevel: number; // 1-5 scale
  yearsOfExperience?: number;
  endorsements?: number; // Count of endorsements from clients/colleagues
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Agent Performance Thresholds & Goals
export interface AgentPerformanceThresholds {
  id: string;
  agentId: string;
  targets: {
    monthlyLeadGoal?: number;
    monthlyConversionGoal?: number;
    targetConversionRate?: number; // Percentage (e.g., 25 for 25%)
    targetResponseTime?: number; // In minutes
    minQualityRating?: number; // 1-5 scale
  };
  alerts: {
    lowConversionRate?: {
      enabled: boolean;
      threshold: number; // Percentage
    };
    slowResponseTime?: {
      enabled: boolean;
      threshold: number; // In minutes
    };
    capacityWarning?: {
      enabled: boolean;
      threshold: number; // Percentage of max capacity
    };
  };
  updatedAt: Date;
}

// Complete Agent Configuration
export interface AgentConfiguration {
  agentId: string;
  availability: AgentAvailability;
  leadPreferences: AgentLeadPreferences;
  notificationPreferences: AgentNotificationPreferences;
  profileCustomization: AgentProfileCustomization;
  performanceThresholds: AgentPerformanceThresholds;
  updatedAt: Date;
}

// DTO Types for API
export interface CreateAgentAvailabilityDto {
  status?: AvailabilityStatus;
  workHours: WorkHours[];
  breakTimes?: Array<{
    startTime: string;
    endTime: string;
    description?: string;
  }>;
  timeOff?: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;
  maxConcurrentLeads?: number;
  autoAcceptLeads?: boolean;
}

export interface UpdateAgentAvailabilityDto {
  status?: AvailabilityStatus;
  workHours?: WorkHours[];
  breakTimes?: Array<{
    startTime: string;
    endTime: string;
    description?: string;
  }>;
  timeOff?: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;
  maxConcurrentLeads?: number;
  autoAcceptLeads?: boolean;
}

export interface CreateAgentLeadPreferencesDto {
  insuranceTypes: {
    [key: string]: LeadPreferenceLevel;
  };
  minLeadQualityScore?: number;
  maxLeadQualityScore?: number;
  preferredLocations?: string[];
  excludedLocations?: string[];
  minBudget?: number;
  maxBudget?: number;
  preferredLeadSources?: string[];
  excludedLeadSources?: string[];
  languages?: string[];
}

export interface UpdateAgentLeadPreferencesDto extends Partial<CreateAgentLeadPreferencesDto> {}

export interface CreateAgentNotificationPreferencesDto {
  channels?: {
    [key in NotificationChannel]?: boolean;
  };
  leadAssignment?: {
    enabled: boolean;
    channels: NotificationChannel[];
    quietHours?: {
      startTime: string;
      endTime: string;
    };
  };
  leadUpdates?: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
  performanceAlerts?: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
  systemNotifications?: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
}

export interface UpdateAgentNotificationPreferencesDto extends Partial<CreateAgentNotificationPreferencesDto> {}

export interface CreateAgentProfileCustomizationDto {
  bio?: string;
  profileImageUrl?: string;
  headline?: string;
  yearsOfExperience?: number;
  languages?: string[];
  awards?: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  videoIntroUrl?: string;
  tagline?: string;
}

export interface UpdateAgentProfileCustomizationDto extends Partial<CreateAgentProfileCustomizationDto> {}

export interface CreateAgentCertificationDto {
  name: string;
  issuingOrganization: string;
  certificationNumber?: string;
  issueDate: Date;
  expirationDate?: Date;
  documentUrl?: string;
}

export interface UpdateAgentCertificationDto extends Partial<CreateAgentCertificationDto> {
  status?: CertificationStatus;
}

export interface CreateAgentSkillDto {
  skillName: string;
  category: string;
  proficiencyLevel: number;
  yearsOfExperience?: number;
}

export interface UpdateAgentSkillDto extends Partial<CreateAgentSkillDto> {
  endorsements?: number;
  lastUsedAt?: Date;
}

export interface CreateAgentPerformanceThresholdsDto {
  targets?: {
    monthlyLeadGoal?: number;
    monthlyConversionGoal?: number;
    targetConversionRate?: number;
    targetResponseTime?: number;
    minQualityRating?: number;
  };
  alerts?: {
    lowConversionRate?: {
      enabled: boolean;
      threshold: number;
    };
    slowResponseTime?: {
      enabled: boolean;
      threshold: number;
    };
    capacityWarning?: {
      enabled: boolean;
      threshold: number;
    };
  };
}

export interface UpdateAgentPerformanceThresholdsDto extends Partial<CreateAgentPerformanceThresholdsDto> {}

// Query/Filter Parameters
export interface AgentConfigurationFilterParams {
  agentId?: string;
  availabilityStatus?: AvailabilityStatus;
  insuranceType?: string;
  minQualityScore?: number;
  location?: string;
  language?: string;
  certificationStatus?: CertificationStatus;
}
