// ========================================
// ATTRIBUTION TYPES
// ========================================

export type AttributionModel = 
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven';

export type TouchpointType = 
  | 'organic_search'
  | 'paid_search'
  | 'social_media'
  | 'email'
  | 'display_ad'
  | 'referral'
  | 'direct'
  | 'partner_referral'
  | 'broker_referral'
  | 'affiliate'
  | 'webinar'
  | 'event'
  | 'phone_call'
  | 'chat'
  | 'other';

export type AttributionStatus = 
  | 'pending'
  | 'calculated'
  | 'approved'
  | 'disputed'
  | 'paid';

// ========================================
// TOUCHPOINT TYPES
// ========================================

export interface Touchpoint {
  id: string;
  leadId: string;
  sessionId?: string;
  channel: TouchpointType;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referralCode?: string;
  partnerId?: string;
  brokerId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  converted: boolean;
  conversionValue?: number;
  conversionTimestamp?: Date;
}

export interface CreateTouchpointDto {
  leadId: string;
  sessionId?: string;
  channel: TouchpointType;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referralCode?: string;
  partnerId?: string;
  brokerId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTouchpointDto {
  converted?: boolean;
  conversionValue?: number;
  conversionTimestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface TouchpointFilterParams {
  leadId?: string;
  sessionId?: string;
  channel?: TouchpointType;
  source?: string;
  campaign?: string;
  partnerId?: string;
  brokerId?: string;
  converted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// ATTRIBUTION RECORD TYPES
// ========================================

export interface AttributionRecord {
  id: string;
  leadId: string;
  conversionId?: string;
  touchpointId: string;
  channel: TouchpointType;
  model: AttributionModel;
  credit: number;
  percentage: number;
  revenueAttributed?: number;
  commissionAmount?: number;
  partnerId?: string;
  brokerId?: string;
  campaignId?: string;
  calculatedAt: Date;
  status: AttributionStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttributionDto {
  leadId: string;
  conversionId?: string;
  touchpointId: string;
  channel: TouchpointType;
  model: AttributionModel;
  credit: number;
  percentage: number;
  revenueAttributed?: number;
  commissionAmount?: number;
  partnerId?: string;
  brokerId?: string;
  campaignId?: string;
  status?: AttributionStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateAttributionDto {
  revenueAttributed?: number;
  commissionAmount?: number;
  status?: AttributionStatus;
  metadata?: Record<string, unknown>;
}

export interface AttributionFilterParams {
  leadId?: string;
  conversionId?: string;
  channel?: TouchpointType;
  model?: AttributionModel;
  partnerId?: string;
  brokerId?: string;
  campaignId?: string;
  status?: AttributionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// CONVERSION TYPES
// ========================================

export interface Conversion {
  id: string;
  leadId: string;
  type: 'sale' | 'signup' | 'quote_request' | 'policy_bound' | 'renewal';
  value: number;
  currency: string;
  policyId?: string;
  policyNumber?: string;
  commissionRate?: number;
  commissionAmount?: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversionDto {
  leadId: string;
  type: Conversion['type'];
  value: number;
  currency?: string;
  policyId?: string;
  policyNumber?: string;
  commissionRate?: number;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateConversionDto {
  type?: Conversion['type'];
  value?: number;
  currency?: string;
  policyId?: string;
  policyNumber?: string;
  commissionRate?: number;
  commissionAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface ConversionFilterParams {
  leadId?: string;
  type?: Conversion['type'];
  policyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// ATTRIBUTION REPORT TYPES
// ========================================

export interface ChannelAttributionSummary {
  channel: TouchpointType;
  totalTouchpoints: number;
  convertingTouchpoints: number;
  conversionRate: number;
  totalRevenue: number;
  averageRevenuePerConversion: number;
  attributionPercentage: number;
  partnerAttributions: number;
  brokerAttributions: number;
}

export interface PartnerAttributionSummary {
  partnerId: string;
  partnerName: string;
  totalTouchpoints: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  averageCommission: number;
  attributionPercentage: number;
  topChannels: Array<{
    channel: TouchpointType;
    count: number;
    revenue: number;
  }>;
}

export interface BrokerAttributionSummary {
  brokerId: string;
  brokerName: string;
  totalTouchpoints: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  averageCommission: number;
  attributionPercentage: number;
  topChannels: Array<{
    channel: TouchpointType;
    count: number;
    revenue: number;
  }>;
}

export interface CampaignAttributionSummary {
  campaignId: string;
  campaignName: string;
  source: string;
  medium: string;
  totalTouchpoints: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  cost?: number;
  roi?: number;
  attributionPercentage: number;
}

export interface AttributionReport {
  reportId: string;
  period: {
    start: Date;
    end: Date;
  };
  model: AttributionModel;
  generatedAt: Date;
  summary: {
    totalConversions: number;
    totalRevenue: number;
    totalCommission: number;
    attributedRevenue: number;
    attributionRate: number;
  };
  byChannel: ChannelAttributionSummary[];
  byPartner: PartnerAttributionSummary[];
  byBroker: BrokerAttributionSummary[];
  byCampaign: CampaignAttributionSummary[];
  topPerformingChannels: Array<{
    channel: TouchpointType;
    conversionRate: number;
    revenue: number;
  }>;
  trend: Array<{
    date: string;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
}

export interface AttributionReportParams {
  startDate: Date;
  endDate: Date;
  model?: AttributionModel;
  channel?: TouchpointType;
  partnerId?: string;
  brokerId?: string;
  campaignId?: string;
  includeDetails?: boolean;
}

// ========================================
// ATTRIBUTION CALCULATION TYPES
// ========================================

export interface AttributionCalculation {
  leadId: string;
  conversionValue: number;
  touchpoints: Array<{
    touchpointId: string;
    channel: TouchpointType;
    timestamp: Date;
    isPartner: boolean;
    isBroker: boolean;
    weight: number;
  }>;
  model: AttributionModel;
  attributions: Array<{
    touchpointId: string;
    channel: TouchpointType;
    percentage: number;
    revenue: number;
    partnerId?: string;
    brokerId?: string;
  }>;
  calculatedAt: Date;
}

export interface CalculateAttributionDto {
  leadId: string;
  model?: AttributionModel;
  conversionValue: number;
  commissionRate?: number;
}

// ========================================
// MULTI-TOUCH ATTRIBUTION WEIGHTS
// ========================================

export interface PositionBasedWeights {
  first: number;
  middle: number;
  last: number;
}

export interface TimeDecayWeights {
  halfLifeDays: number;
}

export interface AttributionModelConfig {
  model: AttributionModel;
  positionBasedWeights?: PositionBasedWeights;
  timeDecayConfig?: TimeDecayWeights;
  customWeights?: Record<string, number>;
}

export interface SetAttributionModelDto {
  model: AttributionModel;
  positionBasedWeights?: PositionBasedWeights;
  timeDecayConfig?: TimeDecayConfig;
  isDefault?: boolean;
}

export interface TimeDecayConfig {
  halfLifeDays: number;
}

export interface AttributionModelFilterParams {
  isDefault?: boolean;
  page?: number;
  limit?: number;
}

// ========================================
// ATTRIBUTION DISPUTE TYPES
// ========================================

export interface AttributionDispute {
  id: string;
  attributionId: string;
  disputedBy: string;
  disputeType: 'partner' | 'broker' | 'internal';
  reason: string;
  evidence?: Record<string, unknown>;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttributionDisputeDto {
  attributionId: string;
  disputeType: AttributionDispute['disputeType'];
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface ResolveAttributionDisputeDto {
  status: 'resolved' | 'rejected';
  resolution: string;
  resolvedBy: string;
}

export interface AttributionDisputeFilterParams {
  attributionId?: string;
  disputedBy?: string;
  disputeType?: AttributionDispute['disputeType'];
  status?: AttributionDispute['status'];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface AttributionAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  totalAttributions: number;
  totalRevenue: number;
  totalCommission: number;
  averageAttributionValue: number;
  modelDistribution: Record<AttributionModel, number>;
  channelPerformance: Array<{
    channel: TouchpointType;
    touchpoints: number;
    conversions: number;
    revenue: number;
    percentage: number;
  }>;
  topPartners: Array<{
    partnerId: string;
    revenue: number;
    commission: number;
    conversions: number;
  }>;
  topBrokers: Array<{
    brokerId: string;
    revenue: number;
    commission: number;
    conversions: number;
  }>;
  conversionJourney: {
    averageTouchpoints: number;
    medianTouchpoints: number;
    distribution: Record<number, number>;
  };
}

export interface AttributionTrendParams {
  metric: 'revenue' | 'conversions' | 'commission' | 'attributions';
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: Date;
  endDate?: Date;
  channel?: TouchpointType;
  partnerId?: string;
  brokerId?: string;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface AttributionResponse {
  success: boolean;
  data?: {
    touchpoints?: Touchpoint[];
    attributions?: AttributionRecord[];
    conversion?: Conversion;
    report?: AttributionReport;
    analytics?: AttributionAnalytics;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BatchAttributionDto {
  leadIds: string[];
  model: AttributionModel;
  conversionValue: number;
  commissionRate?: number;
}

export interface BatchAttributionResult {
  processed: number;
  successful: number;
  failed: number;
  attributions: Array<{
    leadId: string;
    success: boolean;
    error?: string;
  }>;
}
