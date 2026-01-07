/**
 * Type definitions for Competitive Intelligence Platform
 */

export enum CompetitorTier {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  EMERGING = 'EMERGING',
  ADJACENT = 'ADJACENT',
}

export enum CompetitorCategory {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  ALTERNATIVE = 'ALTERNATIVE',
}

export enum MonitoringLevel {
  INTENSIVE = 'INTENSIVE',
  STANDARD = 'STANDARD',
  LIGHT = 'LIGHT',
}

export enum ActivityType {
  FEATURE_LAUNCH = 'FEATURE_LAUNCH',
  PRICING_CHANGE = 'PRICING_CHANGE',
  FUNDING_ANNOUNCEMENT = 'FUNDING_ANNOUNCEMENT',
  HIRING_EXPANSION = 'HIRING_EXPANSION',
  PARTNERSHIP_ANNOUNCEMENT = 'PARTNERSHIP_ANNOUNCEMENT',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  PRESS_RELEASE = 'PRESS_RELEASE',
  NEWS_MENTION = 'NEWS_MENTION',
  CUSTOMER_WIN = 'CUSTOMER_WIN',
  EXECUTIVE_CHANGE = 'EXECUTIVE_CHANGE',
  ACQUISITION = 'ACQUISITION',
  MARKET_ENTRY = 'MARKET_ENTRY',
  LEGAL_ACTION = 'LEGAL_ACTION',
  WEBSITE_UPDATE = 'WEBSITE_UPDATE',
  SOCIAL_MEDIA_ACTIVITY = 'SOCIAL_MEDIA_ACTIVITY',
}

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ActivityImpact {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
}

export enum WinLossOutcome {
  WON = 'WON',
  LOST = 'LOST',
  TIED = 'TIED',
  NO_DECISION = 'NO_DECISION',
}

export enum WinLossReason {
  PRICE = 'PRICE',
  FEATURES = 'FEATURES',
  RELATIONSHIP = 'RELATIONSHIP',
  TIMING = 'TIMING',
  PRODUCT_MARKET_FIT = 'PRODUCT_MARKET_FIT',
  INTEGRATION = 'INTEGRATION',
  SUPPORT = 'SUPPORT',
  BRAND_RECOGNITION = 'BRAND_RECOGNITION',
  TECHNICAL_CAPABILITIES = 'TECHNICAL_CAPABILITIES',
  IMPLEMENTATION_SPEED = 'IMPLEMENTATION_SPEED',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  CONTRACT_TERMS = 'CONTRACT_TERMS',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  PERFORMANCE = 'PERFORMANCE',
  SCALABILITY = 'SCALABILITY',
  EASE_OF_USE = 'EASE_OF_USE',
  CUSTOMIZATION = 'CUSTOMIZATION',
  PARTNERSHIP = 'PARTNERSHIP',
  GEOGRAPHIC_PRESENCE = 'GEOGRAPHIC_PRESENCE',
}

export enum AlertType {
  NEW_FEATURE = 'NEW_FEATURE',
  PRICING_DROP = 'PRICING_DROP',
  PRICING_INCREASE = 'PRICING_INCREASE',
  MAJOR_FUNDING = 'MAJOR_FUNDING',
  AGGRESSIVE_EXPANSION = 'AGGRESSIVE_EXPANSION',
  NEW_VERTICAL_ENTRY = 'NEW_VERTICAL_ENTRY',
  PARTNERSHIP_ANNOUNCEMENT = 'PARTNERSHIP_ANNOUNCEMENT',
  CUSTOMER_WIN_ANNOUNCEMENT = 'CUSTOMER_WIN_ANNOUNCEMENT',
  EXECUTIVE_CHANGE = 'EXECUTIVE_CHANGE',
  MARKET_SHARE_SHIFT = 'MARKET_SHARE_SHIFT',
  WIN_LOSS_PATTERN = 'WIN_LOSS_PATTERN',
  FEATURE_GAP = 'FEATURE_GAP',
  COMPETITIVE_WEAKNESS = 'COMPETITIVE_WEAKNESS',
  MARKET_OPPORTUNITY = 'MARKET_OPPORTUNITY',
  THREAT_ASSESSMENT = 'THREAT_ASSESSMENT',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum InsightType {
  MARKET_MOVEMENT = 'MARKET_MOVEMENT',
  WIN_LOSS_PATTERN = 'WIN_LOSS_PATTERN',
  FEATURE_GAP_ANALYSIS = 'FEATURE_GAP_ANALYSIS',
  PRICING_STRATEGY = 'PRICING_STRATEGY',
  GO_TO_MARKET = 'GO_TO_MARKET',
  VERTICAL_OPPORTUNITY = 'VERTICAL_OPPORTUNITY',
  COMPETITIVE_THREAT = 'COMPETITIVE_THREAT',
  SWOT_ANALYSIS = 'SWOT_ANALYSIS',
  CUSTOMER_SENTIMENT = 'CUSTOMER_SENTIMENT',
  TREND_ANALYSIS = 'TREND_ANALYSIS',
}

export enum ImpactLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum Priority {
  IMMEDIATE = 'IMMEDIATE',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Competitor interfaces
export interface Competitor {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  tier: CompetitorTier;
  category: CompetitorCategory;
  description?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: number;
  fundingTotal?: number;
  lastFundingDate?: Date;
  marketShare?: number;
  annualRevenue?: number;
  isActive: boolean;
  threatScore: number;
  opportunityScore: number;
  monitoringLevel: MonitoringLevel;
  lastWebsiteScan?: Date;
  lastNewsScan?: Date;
  lastPricingCheck?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitorCreateInput {
  name: string;
  website?: string;
  industry?: string;
  tier?: CompetitorTier;
  category?: CompetitorCategory;
  description?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: number;
  fundingTotal?: number;
  lastFundingDate?: Date;
  marketShare?: number;
  annualRevenue?: number;
  monitoringLevel?: MonitoringLevel;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CompetitorUpdateInput {
  name?: string;
  website?: string;
  industry?: string;
  tier?: CompetitorTier;
  category?: CompetitorCategory;
  description?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: number;
  fundingTotal?: number;
  lastFundingDate?: Date;
  marketShare?: number;
  annualRevenue?: number;
  isActive?: boolean;
  threatScore?: number;
  opportunityScore?: number;
  monitoringLevel?: MonitoringLevel;
  lastWebsiteScan?: Date;
  lastNewsScan?: Date;
  lastPricingCheck?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

// CompetitorActivity interfaces
export interface CompetitorActivity {
  id: string;
  competitorId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  url?: string;
  source: string;
  detectedAt: Date;
  severity: AlertSeverity;
  impact?: ActivityImpact;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CompetitorActivityCreateInput {
  competitorId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  url?: string;
  source: string;
  severity?: AlertSeverity;
  impact?: ActivityImpact;
  notes?: string;
  metadata?: Record<string, any>;
}

// WinLoss interfaces
export interface WinLoss {
  id: string;
  competitorId?: string;
  dealId?: string;
  dealAmount?: number;
  outcome: WinLossOutcome;
  primaryReason?: WinLossReason;
  secondaryReason?: WinLossReason;
  salesRep?: string;
  salesRepId?: string;
  customerCompany?: string;
  industry?: string;
  vertical?: string;
  dealDurationDays?: number;
  buyingCriteria: string[];
  decisionCriteria?: string;
  competitorStrengths: string[];
  competitorWeaknesses: string[];
  ourStrengths: string[];
  ourWeaknesses: string[];
  pricingFactor?: string;
  relationshipFactor?: string;
  timingFactor?: string;
  customerFeedback?: string;
  lessonsLearned?: string;
  actionItems: string[];
  createdAt: Date;
}

export interface WinLossCreateInput {
  competitorId?: string;
  dealId?: string;
  dealAmount?: number;
  outcome: WinLossOutcome;
  primaryReason?: WinLossReason;
  secondaryReason?: WinLossReason;
  salesRep?: string;
  salesRepId?: string;
  customerCompany?: string;
  industry?: string;
  vertical?: string;
  dealDurationDays?: number;
  buyingCriteria?: string[];
  decisionCriteria?: string;
  competitorStrengths?: string[];
  competitorWeaknesses?: string[];
  ourStrengths?: string[];
  ourWeaknesses?: string[];
  pricingFactor?: string;
  relationshipFactor?: string;
  timingFactor?: string;
  customerFeedback?: string;
  lessonsLearned?: string;
  actionItems?: string[];
}

// PricingData interfaces
export interface PricingData {
  id: string;
  competitorId: string;
  productName?: string;
  tier?: string;
  planName?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  currency: string;
  billingFrequency?: string;
  features: string[];
  limitations: string[];
  discountAvailable: boolean;
  maxDiscount?: number;
  volumeDiscount: boolean;
  freeTierAvailable: boolean;
  freeTierLimits?: string;
  trialDays?: number;
  notes?: string;
  detectedAt: Date;
  createdAt: Date;
}

export interface PricingDataCreateInput {
  competitorId: string;
  productName?: string;
  tier?: string;
  planName?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  currency?: string;
  billingFrequency?: string;
  features?: string[];
  limitations?: string[];
  discountAvailable?: boolean;
  maxDiscount?: number;
  volumeDiscount?: boolean;
  freeTierAvailable?: boolean;
  freeTierLimits?: string;
  trialDays?: number;
  notes?: string;
}

// MarketShare interfaces
export interface MarketShare {
  id: string;
  competitorId?: string;
  market: string;
  vertical?: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  customerCount?: number;
  estimatedRevenue?: number;
  marketShare?: number;
  growthRate?: number;
  customerAcquisition?: number;
  customerChurn?: number;
  dataConfidence?: number;
  dataSource?: string;
  notes?: string;
  createdAt: Date;
}

export interface MarketShareCreateInput {
  competitorId?: string;
  market: string;
  vertical?: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  customerCount?: number;
  estimatedRevenue?: number;
  marketShare?: number;
  growthRate?: number;
  customerAcquisition?: number;
  customerChurn?: number;
  dataConfidence?: number;
  dataSource?: string;
  notes?: string;
}

// CompetitiveAlert interfaces
export interface CompetitiveAlert {
  id: string;
  competitorId?: string;
  activityId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  recommendation?: string;
  targetAudience: string[];
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actionTaken?: string;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CompetitiveAlertCreateInput {
  competitorId?: string;
  activityId?: string;
  alertType: AlertType;
  severity?: AlertSeverity;
  title: string;
  description?: string;
  recommendation?: string;
  targetAudience?: string[];
  metadata?: Record<string, any>;
}

export interface CompetitiveAlertUpdateInput {
  status?: AlertStatus;
  acknowledgedBy?: string;
  actionTaken?: string;
  resolvedAt?: Date;
}

// CompetitiveInsight interfaces
export interface CompetitiveInsight {
  id: string;
  competitorId?: string;
  insightType: InsightType;
  title: string;
  description?: string;
  keyPoints: string[];
  dataSources: string[];
  confidence?: number;
  impact: ImpactLevel;
  priority: Priority;
  actionable: boolean;
  recommendations: string[];
  targetTeam: string[];
  relatedInsights: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export interface CompetitiveInsightCreateInput {
  competitorId?: string;
  insightType: InsightType;
  title: string;
  description?: string;
  keyPoints: string[];
  dataSources: string[];
  confidence?: number;
  impact: ImpactLevel;
  priority: Priority;
  actionable?: boolean;
  recommendations: string[];
  targetTeam: string[];
  relatedInsights?: string[];
  expiresAt?: Date;
}

// BattleCard interfaces
export interface BattleCard {
  id: string;
  competitorId: string;
  title: string;
  competitorName: string;
  tagline?: string;
  overview?: string;
  strengths: string[];
  weaknesses: string[];
  typicalObjections: string[];
  objectionResponses?: Record<string, string>;
  winStrategies: string[];
  talkingPoints: string[];
  proofPoints: string[];
  dealSizeRange?: string;
  typicalSalesCycle?: string;
  keyDecisionMakers: string[];
  pricingPosition?: string;
  targetCustomers: string[];
  verticalFocus: string[];
  recentMoves: string[];
  actionItems: string[];
  lastUpdated: Date;
  createdAt: Date;
}

export interface BattleCardCreateInput {
  competitorId: string;
  title: string;
  competitorName: string;
  tagline?: string;
  overview?: string;
  strengths: string[];
  weaknesses: string[];
  typicalObjections: string[];
  objectionResponses?: Record<string, string>;
  winStrategies: string[];
  talkingPoints: string[];
  proofPoints: string[];
  dealSizeRange?: string;
  typicalSalesCycle?: string;
  keyDecisionMakers: string[];
  pricingPosition?: string;
  targetCustomers: string[];
  verticalFocus: string[];
  recentMoves: string[];
  actionItems: string[];
}

// Analysis and scoring interfaces
export interface ThreatScoreInput {
  recentActivity: number;
  marketMovement: number;
  winLossTrend: number;
  fundingResources: number;
}

export interface OpportunityScoreInput {
  competitorWeakness: number;
  marketGap: number;
  customerSentiment: number;
}

export interface WinLossAnalysis {
  totalDeals: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  competitorWinLoss: Record<string, { wins: number; losses: number; winRate: number }>;
  winRateByVertical: Record<string, { total: number; wins: number; winRate: number }>;
  winRateByReason: Record<string, { count: number; percentage: number }>;
  averageDealSize: number;
  averageDealDuration: number;
}

export interface MarketPositioning {
  competitorId: string;
  competitorName: string;
  pricePosition: 'PREMIUM' | 'STANDARD' | 'BUDGET';
  featurePosition: 'LEADER' | 'COMPETITIVE' | 'FOLLOWER';
  customerSegment: string[];
  verticalStrength: string[];
  marketShare: number;
  growthRate: number;
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Dashboard interfaces
export interface ExecutiveDashboard {
  totalCompetitors: number;
  activeCompetitors: number;
  marketShareSummary: Record<string, number>;
  competitiveWinRate: number;
  threatLevel: AlertSeverity;
  recentDevelopments: CompetitorActivity[];
  topThreats: CompetitiveAlert[];
  opportunities: CompetitiveInsight[];
  period: string;
}

export interface SalesDashboard {
  currentCompetitiveDeals: number;
  winRateByCompetitor: Record<string, number>;
  competitorStrengths: Record<string, string[]>;
  competitorWeaknesses: Record<string, string[]>;
  recentWinLossReasons: WinLossReason[];
  competitiveStrategyByVertical: Record<string, string>;
}

export interface ProductDashboard {
  featureComparisonMatrix: Record<string, Record<string, boolean>>;
  featureGaps: string[];
  roadmapPriorities: string[];
  competitiveAdvantages: string[];
  customerFeedbackOnAlternatives: string[];
}

export interface MarketingDashboard {
  competitivePositioning: Record<string, MarketPositioning>;
  messagingEffectiveness: Record<string, number>;
  marketOpportunitySizing: Record<string, number>;
  verticalMarketTrends: Record<string, { trend: string; opportunity: boolean }>;
}

// Monitoring and alerting interfaces
export interface MonitoringConfig {
  competitorsToMonitor: string[];
  websitesToScan: string[];
  newsKeywords: string[];
  socialMediaHandles: Record<string, string>;
  reviewSites: string[];
  scanFrequencies: {
    website: string;
    news: string;
    social: string;
    pricing: string;
  };
  alertThresholds: {
    pricingChange: number;
    fundingAmount: number;
    marketEntry: boolean;
    featureLaunch: boolean;
  };
}

export interface AlertNotification {
  alertId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  competitor?: string;
  recommendation?: string;
  actionUrl?: string;
  createdAt: Date;
}

// Integration interfaces
export interface ScrapingResult {
  url: string;
  success: boolean;
  content?: string;
  changes?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  timestamp: Date;
}

export interface NewsArticle {
  source: string;
  title: string;
  url: string;
  publishedAt: Date;
  summary?: string;
  mentions: string[];
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface SocialMediaPost {
  platform: string;
  handle: string;
  content: string;
  url: string;
  publishedAt: Date;
  likes?: number;
  shares?: number;
  comments?: number;
  mentions?: string[];
}

export interface ReviewData {
  platform: string;
  competitor: string;
  rating: number;
  review: string;
  author: string;
  date: Date;
  verified?: boolean;
}
