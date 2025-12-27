// ========================================
// CHURN PREVENTION & WIN-BACK TYPES
// Phase 9.6b: Churn Prevention & Win-Back System
// ========================================

// ========================================
// CHURN PREDICTION TYPES
// ========================================

export type ChurnRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChurnPrediction {
  id: string;
  leadId: string;
  churnProbability: number; // 0.0 to 1.0
  churnRisk: ChurnRisk;
  primaryReason?: string;
  accuracyScore?: number; // model confidence
  predictionDate: string;
  lastEngagementDate?: string;
  daysSinceLastActivity: number;
  keyRiskFactors: string[]; // List of risk indicators
  lead?: Lead;
}

export interface ChurnPredictionInput {
  leadId: string;
  engagementHistory: CustomerEngagement;
  interactionData: TouchpointInteraction[];
  quoteHistory: QuoteActivity[];
  demographicFactors: Record<string, unknown>;
}

export interface ChurnPredictionResponse {
  predictions: ChurnPrediction[];
  modelVersion: string;
  generatedAt: string;
  totalAnalyzed: number;
  highRiskCount: number;
}

export interface BatchChurnPredictionRequest {
  leadIds: string[];
  includeEngagementData: boolean;
}

// ========================================
// RETENTION CAMPAIGN TYPES
// ========================================

export type CampaignType = 'EMAIL' | 'SMS' | 'CALL' | 'MULTI_CHANNEL' | 'WIN_BACK' | 'RETENTION' | 'REACTIVATION';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface RetentionCampaign {
  id: string;
  churnPredictionId?: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  targetAudience: CampaignAudience;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Campaign metrics
  leadsTargeted: number;
  leadsEngaged: number;
  leadsConverted: number;
  totalCost: number;
  roi?: number;
  
  // Relationships
  churnPrediction?: ChurnPrediction;
  touchpoints: CustomerTouchpoint[];
  offers: WinBackOffer[];
}

export interface CampaignAudience {
  churnRiskLevels: ChurnRisk[];
  insuranceTypes?: string[];
  minDaysInactive?: number;
  maxDaysInactive?: number;
  minEngagementScore?: number;
  maxEngagementScore?: number;
  geographicFilters?: Record<string, unknown>;
  customFilters?: Record<string, unknown>;
}

export interface CampaignPerformance {
  campaignId: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  conversionRate: number;
  costPerConversion: number;
  engagementRate: number;
  revenueGenerated: number;
}

// ========================================
// CUSTOMER TOUCHPOINT TYPES
// ========================================

export type ContactChannel = 'EMAIL' | 'SMS' | 'CALL' | 'WHATSAPP' | 'DIRECT_MAIL' | 'IN_APP';
export type TouchpointType = 'WELCOME' | 'REMINDER' | 'FOLLOWUP' | 'EDUCATIONAL' | 'PROMOTIONAL' | 'SURVEY' | 'WIN_BACK' | 'RETENTION';
export type TouchpointStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'RESPONDED' | 'BOUNCED' | 'FAILED';

export interface CustomerTouchpoint {
  id: string;
  leadId: string;
  retentionCampaignId?: string;
  channel: ContactChannel;
  touchpointType: TouchpointType;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  responseAt?: string;
  status: TouchpointStatus;
  subject?: string;
  content?: TouchpointContent;
  metadata?: Record<string, unknown>;
  
  // Relationships
  lead?: Lead;
  retentionCampaign?: RetentionCampaign;
}

export interface TouchpointContent {
  body: string;
  htmlBody?: string;
  attachmentUrls?: string[];
  personalizationData?: Record<string, unknown>;
}

export interface TouchpointInteraction {
  leadId: string;
  touchpointId: string;
  interactionType: TouchpointStatus;
  timestamp: string;
  channel: ContactChannel;
  duration?: number; // for calls
  responseContent?: string;
}

// ========================================
// WIN-BACK OFFER TYPES
// ========================================

export type OfferType = 'DISCOUNT' | 'PREMIUM_REDUCTION' | 'COVERAGE_ENHANCEMENT' | 'CASHBACK' | 'REFERRAL_BONUS' | 'LOYALTY_REWARD';
export type OfferStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REDEEMED' | 'EXPIRED' | 'REJECTED';

export interface WinBackOffer {
  id: string;
  retentionCampaignId?: string;
  leadId: string;
  offerType: OfferType;
  title: string;
  description?: string;
  discountPercentage?: number;
  discountAmount?: number;
  premiumAdjustment?: number;
  coverageEnhancement?: CoverageEnhancement;
  conditions: string[];
  validFrom: string;
  validUntil: string;
  status: OfferStatus;
  createdAt: string;
  redeemedAt?: string;
  acceptedAt?: string;
  rejectionReason?: string;
  
  // Metrics
  viewedCount: number;
  sharedCount: number;
  
  // Relationships
  lead?: Lead;
  retentionCampaign?: RetentionCampaign;
}

export interface CoverageEnhancement {
  coverageType: string;
  additionalCoverage: string[];
  deductibleReduction?: number;
  benefitIncrease?: number;
}

export interface DynamicOfferConfig {
  minDiscountPercentage: number;
  maxDiscountPercentage: number;
  offerTypes: OfferType[];
  minPremiumThreshold?: number;
  maxPremiumThreshold?: number;
  coverageEnhancements?: string[];
  personalizationRules: Record<string, unknown>;
}

// ========================================
// CUSTOMER ENGAGEMENT TYPES
// ========================================

export interface CustomerEngagement {
  id: string;
  leadId: string;
  engagementScore: number; // 0-100
  lastActivityDate: string;
  activityCount30d: number;
  activityCount90d: number;
  emailOpenRate: number; // Percentage
  clickThroughRate: number; // Percentage
  quoteRequests: number;
  proposalViews: number;
  websiteVisits: number;
  preferredChannel?: ContactChannel;
  preferredTime?: string; // e.g., "morning", "afternoon"
  interests: string[];
  lead?: Lead;
}

export interface EngagementTrend {
  leadId: string;
  date: string;
  engagementScore: number;
  activityEvents: ActivityEvent[];
}

export interface ActivityEvent {
  type: string;
  timestamp: string;
  channel?: ContactChannel;
  metadata?: Record<string, unknown>;
}

export interface QuoteActivity {
  quoteId: string;
  leadId: string;
  insuranceType: string;
  premium: number;
  coverage: Record<string, unknown>;
  createdAt: string;
  status: string;
  viewedAt?: string;
  viewedCount: number;
}

// ========================================
// RETENTION ALERT TYPES
// ========================================

export type AlertType = 'HIGH_CHURN_RISK' | 'LOW_ENGAGEMENT' | 'STALE_LEAD' | 'COMPETITOR_ALERT' | 'PRICE_SENSITIVITY' | 'SERVICE_COMPLAINT';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'SNOOZED' | 'RESOLVED' | 'DISMISSED';

export interface RetentionAlert {
  id: string;
  leadId: string;
  agentId?: string;
  churnPredictionId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  actionableSteps: string[];
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  snoozeUntil?: string;
  
  // Relationships
  lead?: Lead;
  agent?: Agent;
  churnPrediction?: ChurnPrediction;
}

// ========================================
// RETENTION ANALYTICS TYPES
// ========================================

export interface RetentionMetrics {
  period: string;
  totalLeads: number;
  churnRiskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  retentionRate: number;
  winBackRate: number;
  averageTimeToChurn: number;
  earlyWarningAccuracy: number;
  campaignEffectiveness: CampaignPerformance[];
}

export interface ChurnInsights {
  topChurnReasons: ChurnReason[];
  highRiskSegments: RiskSegment[];
  behavioralPatterns: PatternAnalysis[];
  seasonalityTrends: SeasonalityTrend[];
  competitiveFactors: CompetitiveFactor[];
}

export interface ChurnReason {
  reason: string;
  impactScore: number;
  affectedLeadsCount: number;
  percentageOfChurn: number;
}

export interface RiskSegment {
  segment: string;
  churnRate: number;
  avgEngagement: number;
  avgPremium: number;
  characteristics: string[];
}

export interface PatternAnalysis {
  pattern: string;
  confidence: number;
  description: string;
  recommendations: string[];
}

export interface SeasonalityTrend {
  period: string;
  churnRate: number;
  avgPremiumChange: number;
  factors: string[];
}

export interface CompetitiveFactor {
  competitor: string;
  winRateAgainst: number;
  priceDifference: number;
  strengthFactors: string[];
}

// ========================================
// CAMPAIGN AUTOMATION TYPES
// ========================================

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerCondition;
  actions: AutomationAction[];
  conditions: RuleCondition[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecutedAt?: string;
  successRate: number;
}

export interface TriggerCondition {
  type: 'CHURN_RISK_CHANGE' | 'ENGAGEMENT_DROP' | 'TIME_SINCE_LAST_ACTIVITY' | 'QUOTE_EXPIRED' | 'COMPETITOR_MENTION' | 'PRICE_SENSITIVITY';
  threshold: number;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  timeWindow?: number;
}

export interface AutomationAction {
  type: 'SEND_EMAIL' | 'SEND_SMS' | 'CREATE_CALL_TASK' | 'GENERATE_OFFER' | 'ENGAGE_AGENT' | 'UPDATE_LEAD_STATUS';
  config: Record<string, unknown>;
}

export interface RuleCondition {
  field: string;
  operator: 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE' | 'IN' | 'NOT_IN' | 'CONTAINS';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

// ========================================
// RETENTION API REQUEST/RESPONSE TYPES
// ========================================

export interface GetChurnPredictionsRequest {
  churnRiskLevels?: ChurnRisk[];
  minPredictionScore?: number;
  daysSincePrediction?: number;
  page?: number;
  limit?: number;
  includeLeadData?: boolean;
}

export interface CreateRetentionCampaignRequest {
  name: string;
  description?: string;
  type: CampaignType;
  targetAudience: CampaignAudience;
  startDate?: string;
  endDate?: string;
}

export interface UpdateTouchpointRequest {
  touchpointId: string;
  status?: TouchpointStatus;
  responseAt?: string;
  responseContent?: string;
}

export interface CreateWinBackOfferRequest {
  leadId: string;
  offerType: OfferType;
  title: string;
  description?: string;
  discountPercentage?: number;
  discountAmount?: number;
  premiumAdjustment?: number;
  conditions?: string[];
  validFrom: string;
  validUntil: string;
}

export interface RetentionAlertRequest {
  leadId: string;
  alertType: AlertType;
  severity?: AlertSeverity;
  message: string;
  actionableSteps?: string[];
}

export interface EngagementUpdateRequest {
  leadId: string;
  activityType: string;
  channel?: ContactChannel;
  activityData: Record<string, unknown>;
}

// ========================================
// UTILITY TYPES
// ========================================

export interface Lead {
  id: string;
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  insuranceType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}