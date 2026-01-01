// ========================================
// LEAD ENRICHMENT & REAL-TIME PERSONALIZATION TYPES
// Phase 16.3.7
// ========================================

// ========================================
// DATA PROVIDER TYPES
// ========================================

export type DataProviderType =
  | 'zoominfo'
  | 'apollo'
  | 'clearbit'
  | 'dun_bradstreet'
  | 'linkedin_sales_navigator'
  | 'custom';

export type DataProviderStatus = 'active' | 'inactive' | 'rate_limited' | 'error';

export interface DataProvider {
  id: string;
  name: string;
  type: DataProviderType;
  description?: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  status: DataProviderStatus;
  priority: number; // Lower number = higher priority
  cacheTtlMinutes: number;
  isEnabled: boolean;
  lastSuccessfulAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  totalCalls: number;
  failedCalls: number;
  successRate: number;
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataProviderDto {
  name: string;
  type: DataProviderType;
  description?: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  priority?: number;
  cacheTtlMinutes?: number;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

export interface UpdateDataProviderDto {
  name?: string;
  description?: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  priority?: number;
  cacheTtlMinutes?: number;
  isEnabled?: boolean;
  status?: DataProviderStatus;
  config?: Record<string, unknown>;
}

// ========================================
// LEAD ENRICHMENT PROFILE TYPES
// ========================================

export interface EnrichmentDemographics {
  age?: number;
  ageRange?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dependentsCount?: number;
  educationLevel?: string;
  occupation?: string;
  industry?: string;
  incomeRange?: string;
  estimatedIncome?: number;
  homeownerStatus?: 'owns' | 'rents' | 'unknown';
  yearsAtCurrentResidence?: number;
}

export interface EnrichmentFirmographics {
  companyName?: string;
  companySize?: string; // e.g., "1-10", "11-50", "51-200", "201-500", "500+"
  companyIndustry?: string;
  companyRevenue?: string;
  companyStage?: 'startup' | 'growth' | 'mature' | 'enterprise';
  employeeCount?: number;
  yearsInBusiness?: number;
  businessType?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    headquarters?: string;
  };
}

export interface EnrichmentBehavioral {
  websiteVisits?: number;
  lastWebsiteVisit?: Date;
  contentEngaged?: string[];
  lastContentEngagement?: Date;
  emailOpens?: number;
  emailClicks?: number;
  lastEmailEngagement?: Date;
  intentSignals?: IntentSignal[];
  leadSource?: string;
  campaignId?: string;
  deviceTypes?: string[];
  browsingPatterns?: string[];
}

export interface IntentSignal {
  type: 'quote_request' | 'comparison_shopping' | 'price_inquiry' | 'coverage_question' | 'renewal_inquiry';
  strength: 'high' | 'medium' | 'low';
  detectedAt: Date;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface EnrichmentRisk {
  fraudRiskScore?: number; // 0-100
  creditScoreProxy?: number;
  financialStabilityScore?: number;
  riskFlags?: RiskFlag[];
  addressVerified?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  syntheticIdentityRisk?: 'low' | 'medium' | 'high';
}

export interface RiskFlag {
  type: 'high_risk_location' | 'previous_claims' | 'payment_issues' | 'suspicious_activity' | 'data_inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EnrichmentProperty {
  propertyType?: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'apartment';
  ownership?: 'owned' | 'rented' | 'mortgaged';
  yearBuilt?: number;
  squareFootage?: number;
  estimatedValue?: number;
  address?: string;
  hasPool?: boolean;
  hasSecuritySystem?: boolean;
  hasClaimsHistory?: boolean;
  numberOfClaims?: number;
}

export interface EnrichmentVehicle {
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  ownership?: 'owned' | 'leased' | 'financed';
  estimatedValue?: number;
  hasCoverage?: boolean;
  coverageType?: string;
}

export interface LeadEnrichmentProfile {
  id: string;
  leadId: string;
  enrichmentVersion: number;
  demographics?: EnrichmentDemographics;
  firmographics?: EnrichmentFirmographics;
  behavioral?: EnrichmentBehavioral;
  risk?: EnrichmentRisk;
  propertyData?: EnrichmentProperty;
  vehicleData?: EnrichmentVehicle[];
  confidenceScore: number; // 0-100
  dataSources: string[]; // IDs of providers used
  dataFreshness: {
    [key: string]: {
      enrichedAt: Date;
      providerId: string;
      expiresAt: Date;
    };
  };
  dataConflicts?: DataConflict[];
  enrichmentMetadata: {
    totalDataPoints: number;
    enrichmentDuration: number; // milliseconds
    providersAttempted: number;
    providersSuccessful: number;
    cachedDataUsed: number;
    freshDataFetched: number;
  };
  lastEnrichedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataConflict {
  field: string;
  values: Array<{
    value: unknown;
    source: string;
    timestamp: Date;
  }>;
  resolvedValue?: unknown;
  resolutionRule: 'most_recent' | 'highest_priority' | 'most_complete' | 'manual';
  resolvedAt?: Date;
}

export interface CreateEnrichmentProfileDto {
  leadId: string;
}

export interface UpdateEnrichmentProfileDto {
  demographics?: Partial<EnrichmentDemographics>;
  firmographics?: Partial<EnrichmentFirmographics>;
  behavioral?: Partial<EnrichmentBehavioral>;
  risk?: Partial<EnrichmentRisk>;
  propertyData?: Partial<EnrichmentProperty>;
  vehicleData?: EnrichmentVehicle[];
  confidenceScore?: number;
  dataSources?: string[];
  dataFreshness?: LeadEnrichmentProfile['dataFreshness'];
  dataConflicts?: DataConflict[];
  enrichmentMetadata?: Partial<LeadEnrichmentProfile['enrichmentMetadata']>;
}

export interface EnrichmentResult {
  success: boolean;
  leadId: string;
  profileId: string;
  enrichmentDuration: number;
  providersUsed: string[];
  confidenceScore: number;
  dataPointsEnriched: number;
  errors?: string[];
  warnings?: string[];
}

// ========================================
// PERSONALIZED OFFER TYPES
// ========================================

export type OfferTier = 'primary' | 'secondary' | 'tertiary';
export type OfferStatus = 'suggested' | 'presented' | 'accepted' | 'rejected' | 'expired';
export type OfferType = 'auto' | 'home' | 'life' | 'health' | 'commercial' | 'bundle';

export interface PersonalizedOffer {
  id: string;
  leadId: string;
  callId?: string;
  tier: OfferTier;
  offerType: OfferType;
  title: string;
  description: string;
  coverageDetails: Record<string, unknown>;
  premium: {
    amount: number;
    currency: string;
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  };
  coverageLimits: {
    [key: string]: number;
  };
  deductibles: {
    [key: string]: number;
  };
  reasoning: OfferReasoning[];
  fitScore: number; // 0-100
  confidence: number; // 0-100
  estimatedConversionProbability: number; // 0-100
  competitiveAdvantages: string[];
  abTestVariant?: string;
  validUntil: Date;
  status: OfferStatus;
  metadata?: Record<string, unknown>;
  presentedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferReasoning {
  category: 'demographic_fit' | 'intent_match' | 'risk_profile' | 'competitive_positioning' | 'value_proposition';
  reason: string;
  impact: 'positive' | 'neutral' | 'negative';
  weight: number;
  dataPoints?: string[];
}

export interface OfferAcceptanceHistory {
  id: string;
  offerId: string;
  leadId: string;
  agentId?: string;
  callId?: string;
  status: OfferStatus;
  presentedAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  agentFeedback?: string;
  outcomeMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePersonalizedOfferDto {
  leadId: string;
  callId?: string;
  offerType: OfferType;
  abTestVariant?: string;
}

export interface PresentOfferDto {
  callId?: string;
}

export interface AcceptOfferDto {
  agentId?: string;
  callId?: string;
  agentFeedback?: string;
}

export interface RejectOfferDto {
  agentId?: string;
  callId?: string;
  reason: string;
  agentFeedback?: string;
}

// ========================================
// COACHING SUGGESTION TYPES
// ========================================

export type SuggestionType =
  | 'sentiment_adjustment'
  | 'objection_handling'
  | 'pain_point_response'
  | 'competitive_positioning'
  | 'risk_awareness'
  | 'upsell_opportunity'
  | 'cross_sell_opportunity'
  | 'compliance_reminder';

export type SuggestionConfidence = 'high' | 'medium' | 'low';

export interface CoachingSuggestion {
  id: string;
  leadId: string;
  callId?: string;
  agentId?: string;
  type: SuggestionType;
  title: string;
  content: string;
  suggestedScript?: string;
  talkingPoints?: string[];
  confidence: SuggestionConfidence;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  triggeredBy: SuggestionTrigger[];
  context: SuggestionContext;
  estimatedImpact: string;
  expiresAt: Date;
  status: 'pending' | 'acknowledged' | 'used' | 'dismissed';
  acknowledgedAt?: Date;
  usedAt?: Date;
  dismissedAt?: Date;
  feedback?: SuggestionFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestionTrigger {
  type: 'sentiment' | 'intent' | 'risk_flag' | 'pain_point' | 'objection' | 'opportunity';
  value: string;
  detectedAt: Date;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface SuggestionContext {
  currentSentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'interested';
  detectedIntents?: string[];
  painPoints?: string[];
  objections?: string[];
  riskFlags?: string[];
  conversationStage?: string;
  agentBehavioralCues?: string[];
}

export interface SuggestionFeedback {
  helpful: boolean;
  usedScript: boolean;
  effectivenessRating?: number; // 1-5
  notes?: string;
  providedAt: Date;
}

export interface CreateCoachingSuggestionDto {
  leadId: string;
  callId?: string;
  agentId?: string;
}

export interface AcknowledgeSuggestionDto {
  used: boolean;
  usedScript?: boolean;
  effectivenessRating?: number;
  notes?: string;
}

// ========================================
// RISK VALIDATION TYPES
// ========================================

export type RiskValidationType = 'fraud' | 'compliance' | 'quality';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskValidationResult {
  id: string;
  leadId: string;
  validationType: RiskValidationType;
  overallRiskScore: number; // 0-100
  severity: RiskSeverity;
  isApproved: boolean;
  requiresReview: boolean;
  autoEscalate: boolean;
  validationChecks: ValidationCheck[];
  validationMetadata: {
    checksPerformed: number;
    checksPassed: number;
    checksFailed: number;
    checksWarning: number;
    validationDuration: number;
  };
  validatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface ValidationCheck {
  name: string;
  category: 'identity' | 'contact' | 'behavioral' | 'compliance' | 'financial';
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  severity: RiskSeverity;
  result: boolean;
  message: string;
  details?: Record<string, unknown>;
  dataSources?: string[];
  checkedAt: Date;
}

export interface CreateRiskValidationDto {
  leadId: string;
  validationType?: RiskValidationType;
}

// ========================================
// PERSONALIZATION ANALYTICS TYPES
// ========================================

export interface PersonalizationEffectivenessMetrics {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  leadsWithPersonalization: number;
  leadsWithoutPersonalization: number;
  conversionWithPersonalization: number;
  conversionWithoutPersonalization: number;
  conversionUplift: number; // percentage
  conversionUpliftAbsolute: number; // percentage points

  offerMetrics: {
    totalOffers: number;
    primaryOffers: number;
    secondaryOffers: number;
    tertiaryOffers: number;
    primaryOfferAcceptanceRate: number;
    secondaryOfferAcceptanceRate: number;
    tertiaryOfferAcceptanceRate: number;
    averageOfferResponseTime: number;
  };

  suggestionMetrics: {
    totalSuggestions: number;
    acknowledgedSuggestions: number;
    usedSuggestions: number;
    dismissedSuggestions: number;
    agentUtilizationRate: number; // percentage of suggestions engaged with
    averageSuggestionEffectivenessRating: number;
  };

  sentimentMetrics: {
    averageSentimentImprovement: number;
    sentimentPositiveOutcomes: number;
    sentimentNeutralOutcomes: number;
    sentimentNegativeOutcomes: number;
  };

  costMetrics: {
    totalEnrichmentCost: number;
    averageCostPerLead: number;
    costPerConversionUplift: number;
    roi: number; // return on investment
  };

  topPerformingCombinations: Array<{
    combination: string;
    conversions: number;
    conversionRate: number;
    sampleSize: number;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalizationAnalyticsRequest {
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
  includeComparison?: boolean;
}

// ========================================
// ENRICHMENT REQUEST TYPES
// ========================================

export interface EnrichLeadRequest {
  leadId: string;
  forceRefresh?: boolean;
  includeProviders?: string[]; // Specific provider IDs to use
  excludeProviders?: string[]; // Specific provider IDs to skip
  enrichmentPriority?: 'low' | 'normal' | 'high';
  callbackUrl?: string;
}

export interface GetEnrichedProfileRequest {
  leadId: string;
  includeExpired?: boolean;
  minimalData?: boolean; // Return only essential fields for privacy
}

export interface PersonalizedOffersRequest {
  leadId: string;
  callId?: string;
  maxOffers?: number;
  includeTiers?: OfferTier[];
  abTestGroup?: string;
}

export interface CoachingSuggestionsRequest {
  leadId: string;
  callId?: string;
  maxSuggestions?: number;
  suggestionTypes?: SuggestionType[];
  minConfidence?: SuggestionConfidence;
}

// ========================================
// DATA PROVIDER API TYPES
// ========================================

export interface EnrichmentQuery {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  company?: string;
  domain?: string;
  linkedInUrl?: string;
  [key: string]: unknown;
}

export interface EnrichmentResponse {
  success: boolean;
  data?: Record<string, unknown>;
  source: string;
  confidence: number;
  cached: boolean;
  rateLimitRemaining?: number;
  cost?: number;
  error?: string;
  processingTime: number;
}

export interface DataProviderStats {
  providerId: string;
  providerName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageResponseTime: number;
  totalCost: number;
  averageCostPerCall: number;
  cacheHitRate: number;
  rateLimitHits: number;
  lastCallAt: Date;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface EnrichLeadResponse {
  success: boolean;
  result: EnrichmentResult;
  error?: string;
}

export interface GetEnrichedProfileResponse {
  success: boolean;
  profile?: LeadEnrichmentProfile;
  error?: string;
}

export interface GetPersonalizedOffersResponse {
  success: boolean;
  offers: PersonalizedOffer[];
  total: number;
  recommendationSummary: string;
  error?: string;
}

export interface GetCoachingSuggestionsResponse {
  success: boolean;
  suggestions: CoachingSuggestion[];
  total: number;
  summary: {
    priorityCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    confidenceCounts: Record<SuggestionConfidence, number>;
  };
  error?: string;
}

export interface RiskValidationResponse {
  success: boolean;
  result?: RiskValidationResult;
  error?: string;
}

export interface PersonalizationAnalyticsResponse {
  success: boolean;
  metrics?: PersonalizationEffectivenessMetrics;
  error?: string;
}

// ========================================
// FILTER PARAMS
// ========================================

export interface DataProviderFilterParams {
  type?: DataProviderType;
  status?: DataProviderStatus;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EnrichmentProfileFilterParams {
  leadId?: string;
  minConfidenceScore?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PersonalizedOfferFilterParams {
  leadId?: string;
  callId?: string;
  offerType?: OfferType;
  tier?: OfferTier;
  status?: OfferStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface CoachingSuggestionFilterParams {
  leadId?: string;
  callId?: string;
  agentId?: string;
  type?: SuggestionType;
  status?: CoachingSuggestion['status'];
  confidence?: SuggestionConfidence;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}
