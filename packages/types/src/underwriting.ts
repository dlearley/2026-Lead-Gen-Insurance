// ========================================
// UNDERWRITING & RECOMMENDATION TYPES
// ========================================

export type UnderwritingDecision = 'approved' | 'denied' | 'manual_review' | 'conditional';

export type GapSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type UnderwritingRecommendationType =
  | 'new_policy'
  | 'coverage_upgrade'
  | 'cross_sell'
  | 'upsell'
  | 'retention';

export type RecommendationStatus = 'identified' | 'recommended' | 'accepted' | 'declined';

export type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type RuleType = 'approval' | 'risk_assessment' | 'coverage_requirement';

export type DecisionAction = 'auto_approve' | 'auto_deny' | 'manual_review' | 'flag_exception';

export type ExceptionSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

// ========================================
// UNDERWRITING RULES
// ========================================

export interface UnderwritingRule {
  id: string;
  ruleName: string;
  insuranceLine?: string;
  ruleType: RuleType;
  conditionLogic: UnderwritingRuleCondition[];
  riskScoreAdjustment: number;
  decisionAction: DecisionAction;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnderwritingRuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

export interface CreateUnderwritingRuleDto {
  ruleName: string;
  insuranceLine?: string;
  ruleType: RuleType;
  conditionLogic: UnderwritingRuleCondition[];
  riskScoreAdjustment: number;
  decisionAction: DecisionAction;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateUnderwritingRuleDto {
  ruleName?: string;
  insuranceLine?: string;
  ruleType?: RuleType;
  conditionLogic?: UnderwritingRuleCondition[];
  riskScoreAdjustment?: number;
  decisionAction?: DecisionAction;
  priority?: number;
  isActive?: boolean;
}

// ========================================
// UNDERWRITING DECISIONS
// ========================================

export interface UnderwritingDecisionRecord {
  id: string;
  leadId: string;
  policyType?: string;
  riskScore: number;
  riskScoreComponents: Record<string, number>;
  decision: UnderwritingDecision;
  decisionReason?: string;
  appliedRules: string[];
  exceptionsFlagged: Exception[];
  coverageRecommended: RecommendedCoverage;
  premiumCalculated: number;
  underwriterId?: string;
  underwriterNotes?: string;
  decisionTimestamp: Date;
  decisionEffectiveDate?: Date;
  createdAt: Date;
}

export interface Exception {
  exceptionType: string;
  severity: ExceptionSeverity;
  description?: string;
}

export interface RecommendedCoverage {
  limits: Record<string, number>;
  deductibles: Record<string, number>;
  options: string[];
}

export interface UnderwritingRequest {
  leadId: string;
  applicationData: ApplicationData;
}

export interface ApplicationData {
  insuranceType: string;
  applicant: ApplicantData;
  riskFactors: RiskFactor[];
  coverageRequested: CoverageRequested;
}

export interface ApplicantData {
  age?: number;
  driverLicenseNumber?: string;
  mvrViolations?: number;
  accidentHistory?: Accident[];
  healthStatus?: string;
  smokerStatus?: boolean;
  annualIncome?: number;
  occupation?: string;
  maritalStatus?: string;
  dependents?: number;
}

export interface Accident {
  date: Date;
  type: string;
  severity: 'minor' | 'major' | 'severe';
  atFault: boolean;
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  impact: number;
}

export interface CoverageRequested {
  coverageType: string;
  coverageAmount: number;
  deductible?: number;
}

export interface MakeUnderwritingDecisionDto {
  leadId: string;
  decision: UnderwritingDecision;
  reason?: string;
  coverageRecommended?: RecommendedCoverage;
  premiumCalculated?: number;
  underwriterNotes?: string;
}

// ========================================
// COVERAGE GAPS
// ========================================

export interface CoverageGap {
  id: string;
  customerId: string;
  gapType: string;
  insuranceLine?: string;
  currentCoverage: Record<string, unknown>;
  recommendedCoverage: Record<string, unknown>;
  financialExposure: number;
  gapSeverity: GapSeverity;
  identifiedDate: Date;
  recommendationStatus: RecommendationStatus;
  createdAt: Date;
}

export interface GapAnalysis {
  gaps: CoverageGap[];
  totalExposure: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
}

export interface GapRecommendation {
  gapId: string;
  insuranceLine: string;
  currentCoverage: Record<string, unknown>;
  recommendedCoverage: Record<string, unknown>;
  exposureAmount: number;
  estimatedPremium: number;
  urgency: UrgencyLevel;
  reasoning: string;
}

// ========================================
// POLICY RECOMMENDATIONS
// ========================================

export interface PolicyRecommendation {
  id: string;
  customerId: string;
  insuranceLine: string;
  recommendationType: UnderwritingRecommendationType;
  recommendedCoverage: Record<string, unknown>;
  estimatedPremium: number;
  recommendationScore: number;
  relevanceScore: number;
  conversionProbability: number;
  urgencyLevel: UrgencyLevel;
  reasonText?: string;
  influencingFactors: string[];
  agentCommissionAmount: number;
  createdAt: Date;
  recommendationExpiry?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  createdBy: string;
}

export interface RecommendationContext {
  budgetConstraints?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  lifeStage?: string;
  assetValue?: number;
  liabilities?: number;
  season?: string;
}

export interface RecommendationScore {
  recommendationId: string;
  relevanceScore: number;
  customerValueScore: number;
  urgencyScore: number;
  conversionProbability: number;
  commissionPotential: number;
  totalScore: number;
}

// ========================================
// RECOMMENDATION PERFORMANCE
// ========================================

export interface RecommendationPerformance {
  id: string;
  recommendationId: string;
  recommendedAt: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  conversionOutcome: boolean;
  policyId?: string;
  actualPremium?: number;
  expectedPremium?: number;
  recommendationAccuracyScore?: number;
  createdAt: Date;
}

// ========================================
// RISK ASSESSMENT
// ========================================

export interface RiskScore {
  totalScore: number; // 0-100
  components: RiskComponents;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  explainableFactors: RiskFactorExplanation[];
}

export interface RiskComponents {
  driver: number; // 0-100
  property: number; // 0-100
  health: number; // 0-100
  occupational: number; // 0-100
  financial: number; // 0-100
  location: number; // 0-100
}

export interface RiskFactorExplanation {
  factor: string;
  impact: number; // SHAP value
  direction: 'positive' | 'negative';
  description: string;
}

export interface RiskAssessment {
  leadId: string;
  riskScore: RiskScore;
  decision: UnderwritingDecision;
  exceptions: Exception[];
  recommendedCoverage: RecommendedCoverage;
  premiumEstimate: number;
}

export interface RiskPrediction {
  predictedScore: number;
  confidence: number;
  modelVersion: string;
  timestamp: Date;
}

// ========================================
// CROSS-SELL & UPSELL
// ========================================

export interface CrossSellRecommendation {
  targetLine: string;
  probability: number;
  estimatedPremium: number;
  bundleDiscount?: number;
  reasoning: string;
}

export interface UpsellRecommendation {
  policyId: string;
  currentCoverage: Record<string, unknown>;
  recommendedCoverage: Record<string, unknown>;
  additionalPremium: number;
  expectedValue: number;
  reasoning: string;
}

export interface Bundle {
  bundleId: string;
  name: string;
  policies: string[];
  discountPercentage: number;
  discountAmount: number;
  totalPremium: number;
}

export interface BundleRecommendation {
  bundle: Bundle;
  savingsAmount: number;
  savingsPercentage: number;
  urgency: UrgencyLevel;
  reasoning: string;
}

// ========================================
// UNDERWRITING ANALYTICS
// ========================================

export interface UnderwritingMetrics {
  period: DateRange;
  totalApplications: number;
  autoApproved: number;
  manualReview: number;
  denied: number;
  approvalRate: number;
  averageDecisionTime: number; // minutes
  exceptionsRate: number;
  averagePremium: number;
  byInsuranceLine: InsuranceLineMetrics[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface InsuranceLineMetrics {
  insuranceLine: string;
  totalApplications: number;
  approved: number;
  manualReview: number;
  denied: number;
  approvalRate: number;
  averageDecisionTime: number;
  averagePremium: number;
}

export interface ApprovalRate {
  insuranceLine: string;
  date: Date;
  approvalRate: number;
  totalApplications: number;
}

export interface DecisionTimeMetrics {
  averageTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  byInsuranceLine: Record<string, number>;
}

export interface ExceptionAnalytics {
  totalExceptions: number;
  byType: Record<string, number>;
  bySeverity: Record<ExceptionSeverity, number>;
  resolutionTime: {
    average: number;
    median: number;
  };
  byInsuranceLine: Record<string, number>;
}

export interface AcceptanceMetrics {
  totalRecommendations: number;
  viewed: number;
  accepted: number;
  declined: number;
  acceptanceRate: number;
  conversionRate: number;
  averageRevenue: number;
  byUnderwritingRecommendationType: Record<UnderwritingRecommendationType, AcceptanceByType>;
}

export interface AcceptanceByType {
  total: number;
  accepted: number;
  acceptanceRate: number;
  averageRevenue: number;
}

export interface AccuracyMetrics {
  premiumPrediction: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
  riskPrediction: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface Bottleneck {
  type: string;
  description: string;
  impact: number;
  suggestions: string[];
}

// ========================================
// A/B TESTING
// ========================================

export interface RecommendationExperiment {
  id: string;
  name: string;
  recommendationStrategy: string;
  variantAStrategy: Record<string, unknown>;
  variantBStrategy: Record<string, unknown>;
  status: 'active' | 'paused' | 'completed';
  trafficPercentage: number;
  startDate: Date;
  endDate?: Date;
  successMetric: string;
  controlGroupPerformance: number;
  createdAt: Date;
}

export interface ExperimentConfig {
  name: string;
  recommendationStrategy: string;
  variantAStrategy: Record<string, unknown>;
  variantBStrategy: Record<string, unknown>;
  trafficPercentage: number;
  startDate: Date;
  endDate?: Date;
  successMetric: string;
}

export interface ExperimentMetrics {
  experimentId: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  totalParticipants: number;
  variantAParticipants: number;
  variantBParticipants: number;
  variantAMetrics: ExperimentVariantMetrics;
  variantBMetrics: ExperimentVariantMetrics;
  statisticalSignificance: number;
  winner: 'A' | 'B' | 'inconclusive' | null;
}

export interface ExperimentVariantMetrics {
  totalRecommendations: number;
  acceptanceRate: number;
  conversionRate: number;
  averageRevenue: number;
  customerSatisfaction: number;
}

export interface WinnerAnalysis {
  winner: 'A' | 'B' | 'inconclusive';
  confidenceLevel: number;
  improvementPercentage: number;
  revenueImpact: number;
  recommendation: 'promote' | 'continue' | 'abort';
}

export interface SegmentMetrics {
  segment: string;
  totalCustomers: number;
  acceptanceRate: number;
  conversionRate: number;
  averageRevenue: number;
  topPerformingStrategies: string[];
  improvementOpportunities: string[];
}

export interface Optimization {
  type: string;
  description: string;
  expectedImprovement: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: number;
}

// ========================================
// MANUAL REVIEW QUEUE
// ========================================

export interface UnderwritingCase {
  id: string;
  leadId: string;
  policyType: string;
  riskScore: number;
  decision: UnderwritingDecision;
  exceptions: Exception[];
  createdAt: Date;
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

// ========================================
// FILTERS & PAGINATION
// ========================================

export interface UnderwritingRuleFilterParams {
  insuranceLine?: string;
  ruleType?: RuleType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UnderwritingDecisionFilterParams {
  leadId?: string;
  policyType?: string;
  decision?: UnderwritingDecision;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface CoverageGapFilterParams {
  customerId?: string;
  insuranceLine?: string;
  gapSeverity?: GapSeverity;
  recommendationStatus?: RecommendationStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PolicyRecommendationFilterParams {
  customerId?: string;
  insuranceLine?: string;
  recommendationType?: UnderwritingRecommendationType;
  urgencyLevel?: UrgencyLevel;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface UnderwritingExceptionFilterParams {
  leadId?: string;
  policyType?: string;
  exceptionType?: string;
  severity?: ExceptionSeverity;
  flaggedForReview?: boolean;
  page?: number;
  limit?: number;
}

// PaginatedResponse is imported from api-ecosystem.ts

export type UnderwritingRequested = {
  underwritingId: string;
  agentId: string;
  leadId: string;
  requestedAt: Date;
}

export type UnderwritingCompleted = {
  underwritingId: string;
  agentId: string;
  leadId: string;
  completedAt: Date;
  decision: UnderwritingDecision;
  recommendedCoverage: RecommendedCoverage[];
  exceptions: Exception[];
}
