// ========================================
// CUSTOMER DATA PLATFORM (CDP) TYPES
// Phase 11.2: Foundation for Personalization
// ========================================

// ========================================
// IDENTITY TYPES
// ========================================

export type IdentityType = 
  | 'EMAIL'
  | 'PHONE'
  | 'DEVICE_ID'
  | 'SESSION_ID'
  | 'EXTERNAL_ID'
  | 'COOKIE_ID'
  | 'IP_ADDRESS';

export interface CustomerIdentity {
  id: string;
  customerId: string;
  identityType: IdentityType;
  identityValue: string;
  provider?: string;
  verifiedAt?: Date;
  isPrimary: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIdentityDto {
  identityType: IdentityType;
  identityValue: string;
  provider?: string;
  verifiedAt?: Date;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

export interface IdentityMergeRequest {
  sourceCustomerId: string;
  targetCustomerId: string;
  mergeStrategy: 'merge' | 'replace';
}

// ========================================
// EVENT TRACKING TYPES
// ========================================

export type EventType = 
  | 'PAGE_VIEW'
  | 'BUTTON_CLICK'
  | 'FORM_SUBMIT'
  | 'QUOTE_REQUEST'
  | 'QUOTE_VIEW'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VIEW'
  | 'MESSAGE_SENT'
  | 'MESSAGE_READ'
  | 'PROFILE_UPDATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PURCHASE'
  | 'POLICY_VIEW'
  | 'CLAIM_SUBMIT'
  | 'SEARCH'
  | 'CUSTOM';

export interface CustomerEvent {
  id: string;
  customerId?: string;
  anonymousId?: string;
  sessionId?: string;
  eventType: EventType;
  eventName: string;
  eventCategory?: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
  timestamp: Date;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  metadata?: Record<string, any>;
}

export interface TrackEventDto {
  customerId?: string;
  anonymousId?: string;
  sessionId?: string;
  eventType: EventType;
  eventName: string;
  eventCategory?: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: Date;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  metadata?: Record<string, any>;
}

export interface EventQueryFilters {
  customerId?: string;
  anonymousId?: string;
  sessionId?: string;
  eventType?: EventType;
  eventName?: string;
  eventCategory?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// TRAITS & ATTRIBUTES TYPES
// ========================================

export type TraitType = 
  | 'DEMOGRAPHIC'
  | 'BEHAVIORAL'
  | 'COMPUTED'
  | 'TRANSACTIONAL'
  | 'PREFERENCE'
  | 'ENGAGEMENT'
  | 'RISK'
  | 'LIFECYCLE';

export interface CustomerTrait {
  id: string;
  customerId: string;
  traitKey: string;
  traitValue: any;
  traitType: TraitType;
  source: string;
  computedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetTraitDto {
  traitKey: string;
  traitValue: any;
  traitType: TraitType;
  source?: string;
  computedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SetTraitsDto {
  traits: SetTraitDto[];
}

// ========================================
// SEGMENTATION TYPES
// ========================================

export type SegmentType = 
  | 'STATIC'
  | 'DYNAMIC'
  | 'BEHAVIORAL'
  | 'PREDICTIVE'
  | 'LIFECYCLE'
  | 'RFM';

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  segmentType: SegmentType;
  rules?: SegmentRules;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentRules {
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  segmentType: SegmentType;
  rules?: SegmentRules;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CustomerSegmentMembership {
  id: string;
  customerId: string;
  segmentId: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface SegmentMembershipDto {
  customerId: string;
  segmentId: string;
  metadata?: Record<string, any>;
}

// ========================================
// CONSENT & PRIVACY TYPES
// ========================================

export type ConsentType = 
  | 'MARKETING_EMAIL'
  | 'MARKETING_SMS'
  | 'MARKETING_PUSH'
  | 'DATA_PROCESSING'
  | 'THIRD_PARTY_SHARING'
  | 'ANALYTICS_TRACKING'
  | 'PERSONALIZATION'
  | 'PROFILING';

export interface CustomerConsent {
  id: string;
  customerId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  source?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetConsentDto {
  consentType: ConsentType;
  granted: boolean;
  source?: string;
  ipAddress?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ConsentPreferences {
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingPush: boolean;
  dataProcessing: boolean;
  thirdPartySharing: boolean;
  analyticsTracking: boolean;
  personalization: boolean;
  profiling: boolean;
}

// ========================================
// CUSTOMER 360 VIEW TYPES
// ========================================

export interface Customer360View {
  customer: {
    id: string;
    email: string;
    phoneNumber?: string;
    isVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
  };
  profile?: {
    dateOfBirth?: Date;
    preferredContact: string;
    address?: any;
    emergencyContact?: any;
    preferences?: any;
  };
  identities: CustomerIdentity[];
  traits: CustomerTrait[];
  segments: Array<{
    id: string;
    name: string;
    segmentType: SegmentType;
    joinedAt: Date;
  }>;
  consents: CustomerConsent[];
  engagementScore?: CustomerEngagementScore;
  lifetimeValue?: CustomerLifetimeValue;
  recentEvents: CustomerEvent[];
  journeySteps: CustomerJourneyStep[];
}

// ========================================
// JOURNEY & ANALYTICS TYPES
// ========================================

export interface CustomerJourneyStep {
  id: string;
  customerId: string;
  stepName: string;
  stepType: string;
  stepOrder: number;
  timestamp: Date;
  duration?: number;
  completed: boolean;
  exitPoint: boolean;
  metadata?: Record<string, any>;
}

export interface TrackJourneyStepDto {
  customerId: string;
  stepName: string;
  stepType: string;
  stepOrder: number;
  duration?: number;
  completed?: boolean;
  exitPoint?: boolean;
  metadata?: Record<string, any>;
}

export interface CustomerEngagementScore {
  id: string;
  customerId: string;
  overallScore: number;
  emailScore: number;
  webScore: number;
  portalScore: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  computedAt: Date;
  metadata?: Record<string, any>;
}

export interface CustomerLifetimeValue {
  id: string;
  customerId: string;
  currentValue: number;
  predictedValue: number;
  totalPurchases: number;
  averagePurchaseValue: number;
  purchaseFrequency: number;
  customerTenure: number;
  churnProbability?: number;
  computedAt: Date;
  metadata?: Record<string, any>;
}

// ========================================
// CDP ANALYTICS & INSIGHTS TYPES
// ========================================

export interface CustomerActivitySummary {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  lastActivity: Date;
  activeDays: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
  topActions: Array<{ action: string; count: number }>;
}

export interface FunnelAnalysis {
  funnelName: string;
  steps: Array<{
    stepName: string;
    entered: number;
    completed: number;
    conversionRate: number;
    averageDuration: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
}

export interface CustomerCohort {
  cohortId: string;
  cohortName: string;
  startDate: Date;
  endDate: Date;
  customers: number;
  retentionRate: number;
  averageLTV: number;
  churnRate: number;
}

export interface RFMScore {
  customerId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: string;
  segment: string;
}

// ========================================
// CDP QUERY & FILTER TYPES
// ========================================

export interface CDPQueryFilters {
  segmentIds?: string[];
  traitFilters?: Array<{
    traitKey: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }>;
  eventFilters?: Array<{
    eventType: EventType;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    minCount?: number;
    maxCount?: number;
  }>;
  engagementScoreMin?: number;
  engagementScoreMax?: number;
  lifetimeValueMin?: number;
  lifetimeValueMax?: number;
  page?: number;
  limit?: number;
}

export interface CDPCustomerList {
  customers: Array<{
    id: string;
    email: string;
    segments: string[];
    engagementScore?: number;
    lifetimeValue?: number;
    lastActivity?: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}
