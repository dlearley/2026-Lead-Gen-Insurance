// ========================================
// INSURANCE LEAD SCORING TYPES
// ========================================

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'commercial';

export type LeadQualificationLevel = 'hot' | 'warm' | 'cold' | 'unqualified';

export type LeadIntent = 'quote' | 'purchase' | 'comparison' | 'information' | 'renewal';

export type LeadUrgency = 'immediate' | 'high' | 'medium' | 'low';

export type ScoringDimension = 
  | 'contact_completeness'
  | 'engagement_level'
  | 'budget_alignment'
  | 'timeline_urgency'
  | 'insurance_knowledge'
  | 'competitive_position';

// ========================================
// LEAD DATA TYPES
// ========================================

export interface LeadBasicInfo {
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
  insuranceType?: InsuranceType;
  metadata?: Record<string, unknown>;
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  vin?: string;
  ownership: 'owned' | 'leased' | 'financed';
  currentCoverage: boolean;
  yearsWithCurrentProvider?: number;
  accidentsLast5Years: number;
  violationsLast3Years: number;
  annualMileage: number;
  primaryUse: 'commute' | 'business' | 'pleasure' | 'mixed';
}

export interface PropertyInfo {
  ownership: 'owned' | 'mortgaged' | 'rented';
  propertyType: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'mobile';
  yearBuilt: number;
  squareFootage?: number;
  value?: number;
  hasSecuritySystem: boolean;
  hasSwimmingPool: boolean;
  hasClaimsLast5Years: number;
  monthsOccupiedPerYear: number;
  numberOfUnits?: number;
}

export interface LifeInsuranceInfo {
  age: number;
  gender: 'male' | 'female';
  coverageAmount: number;
  termLength: 10 | 15 | 20 | 25 | 30 | 'permanent';
  healthClass: 'excellent' | 'good' | 'standard' | 'substandard';
  tobaccoUse: boolean;
  familyHistoryConditions?: string[];
  existingConditions?: string[];
  currentMedications?: string[];
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  occupation?: string;
  hobbies?: string[];
  militaryService?: boolean;
}

export interface HealthInsuranceInfo {
  age: number;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependentsCount: number;
  currentCoverage: boolean;
  coverageType?: 'employer' | 'individual' | 'medicare' | 'medicaid' | 'none';
  desiredCoverageType?: 'individual' | 'family' | 'catastrophic';
  preExistingConditions?: string[];
  currentMedications?: string[];
  preferredNetwork?: string;
  budget?: number;
  tobaccoUse: boolean;
  existingDisabilities?: boolean;
}

export interface CommercialInsuranceInfo {
  businessType: string;
  yearsInBusiness: number;
  annualRevenue: number;
  numberOfEmployees: number;
  locationCount: number;
  industryRisk: 'low' | 'medium' | 'high';
  hasLossHistory: boolean;
  lossAmount5Years?: number;
  currentCoverage: boolean;
  currentPremium?: number;
  desiredCoverageTypes?: string[];
  hasPKCoverage: boolean;
  hasWorkersComp: boolean;
  hasCommercialAuto: boolean;
  hasCyberLiability: boolean;
  squareFootage?: number;
  isNewLocation?: boolean;
}

// ========================================
// SCORING WEIGHTS & CONFIGURATION
// ========================================

export interface ScoringWeights {
  contactCompleteness: number;
  engagementLevel: number;
  budgetAlignment: number;
  timelineUrgency: number;
  insuranceKnowledge: number;
  competitivePosition: number;
}

export interface InsuranceTypeWeights {
  auto: ScoringWeights;
  home: ScoringWeights;
  life: ScoringWeights;
  health: ScoringWeights;
  commercial: ScoringWeights;
}

export interface ScoringThresholds {
  hot: number;
  warm: number;
  cold: number;
}

export interface ScoringConfig {
  weights: InsuranceTypeWeights;
  thresholds: ScoringThresholds;
  bonuses: {
    multiplePolicies: number;
    referral: number;
    repeatCustomer: number;
    completeProfile: number;
  };
}

// ========================================
// SCORING RESULTS
// ========================================

export interface DimensionScore {
  dimension: ScoringDimension;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
  factors: string[];
}

export interface InsuranceSpecificScore {
  insuranceType: InsuranceType;
  overallScore: number;
  maxScore: number;
  dimensions: DimensionScore[];
  factors: InsuranceSpecificFactor[];
}

export interface InsuranceSpecificFactor {
  category: string;
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  description: string;
}

export interface LeadScoringResult {
  leadId: string;
  overallScore: number;
  maxScore: number;
  normalizedScore: number; // 0-100
  qualificationLevel: LeadQualificationLevel;
  intent: LeadIntent;
  urgency: LeadUrgency;
  confidence: number;
  insuranceTypeScores: InsuranceSpecificScore[];
  primaryInsuranceType: InsuranceType;
  scoringFactors: ScoringFactor[];
  recommendations: string[];
  createdAt: Date;
}

export interface ScoringFactor {
  category: string;
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  description: string;
}

// ========================================
// QUALIFICATION RESULTS
// ========================================

export interface QualificationResult {
  leadId: string;
  isQualified: boolean;
  qualificationLevel: LeadQualificationLevel;
  recommendation: 'immediate_contact' | 'priority_followup' | 'nurture' | 'disqualify';
  keyQualifiers: string[];
  riskFactors: string[];
  suggestedAction: string;
  estimatedValue: number;
  conversionProbability: number;
  suggestedInsuranceProducts: InsuranceType[];
  nextBestSteps: string[];
  qualificationDetails: QualificationDetails;
  createdAt: Date;
}

export interface QualificationDetails {
  eligibilityScore: number;
  affordabilityScore: number;
  needScore: number;
  authorityScore: number;
  timingScore: number;
  buyingSignals: BuyingSignal[];
  objections: string[];
}

export interface BuyingSignal {
  signal: string;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

// ========================================
// QUALIFICATION RULES
// ========================================

export interface QualificationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';
  value: unknown;
  logicalOperator?: 'and' | 'or';
  conditions?: RuleCondition[];
}

export interface RuleAction {
  type: 'qualify' | 'disqualify' | 'adjust_score' | 'set_urgency' | 'add_tag' | 'add_note';
  params: Record<string, unknown>;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  insuranceType: InsuranceType | 'all';
  rules: QualificationRule[];
  isActive: boolean;
  priority: number;
}

// ========================================
// SCORING API TYPES
// ========================================

export interface ScoreLeadRequest {
  leadId: string;
  leadData: LeadBasicInfo;
  vehicleInfo?: VehicleInfo;
  propertyInfo?: PropertyInfo;
  lifeInsuranceInfo?: LifeInsuranceInfo;
  healthInsuranceInfo?: HealthInsuranceInfo;
  commercialInfo?: CommercialInsuranceInfo;
}

export interface ScoreLeadResponse {
  success: boolean;
  result: LeadScoringResult;
  error?: string;
}

export interface QualifyLeadRequest {
  leadId: string;
  leadData: LeadBasicInfo;
  scoringResult?: LeadScoringResult;
  vehicleInfo?: VehicleInfo;
  propertyInfo?: PropertyInfo;
  lifeInsuranceInfo?: LifeInsuranceInfo;
  healthInsuranceInfo?: HealthInsuranceInfo;
  commercialInfo?: CommercialInsuranceInfo;
}

export interface QualifyLeadResponse {
  success: boolean;
  result: QualificationResult;
  error?: string;
}

export interface UpdateWeightsRequest {
  insuranceType: InsuranceType | 'all';
  weights: Partial<ScoringWeights>;
}

export interface GetRulesResponse {
  success: boolean;
  rules: RuleSet[];
  total: number;
}

// ========================================
// ANALYTICS TYPES FOR SCORING
// ========================================

export interface ScoringAnalytics {
  totalLeadsScored: number;
  averageScore: number;
  scoreDistribution: {
    hot: number;
    warm: number;
    cold: number;
    unqualified: number;
  };
  byInsuranceType: Record<InsuranceType, {
    count: number;
    avgScore: number;
  }>;
  topScoringFactors: Array<{
    factor: string;
    count: number;
    avgImpact: number;
  }>;
  conversionByScore: Array<{
    scoreRange: string;
    count: number;
    conversions: number;
    rate: number;
  }>;
}
