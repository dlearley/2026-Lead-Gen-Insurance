// ========================================
// CLAIMS OUTCOME PREDICTION TYPES - Phase 27.4
// ========================================

/**
 * Outcome prediction for a claim
 */
export interface OutcomePrediction {
  id: string;
  claimId: string;
  predictedSettlementAmount: number;
  settlementConfidence: number; // 0-1
  predictedResolutionDays: number;
  likelihoodDispute: number; // 0-1
  litigationRiskProbability: number; // 0-1
  reserveRecommendation: number;
  predictionTimestamp: Date;
  keyFactors: PredictionFactor[];
  confidenceInterval: {
    low: number;
    high: number;
  };
  createdAt: Date;
}

/**
 * Factor contributing to prediction
 */
export interface PredictionFactor {
  factor: string;
  value: any;
  impact: number; // -1 to 1, negative reduces settlement, positive increases
  importance: number; // 0-1
  explanation: string;
}

/**
 * Settlement prediction
 */
export interface SettlementPrediction {
  claimId: string;
  predictedAmount: number;
  confidence: number;
  lowEstimate: number;
  highEstimate: number;
  medianEstimate: number;
  factors: PredictionFactor[];
  comparableCases: ComparableCase[];
  confidenceInterval: [number, number];
}

/**
 * Resolution time prediction
 */
export interface ResolutionTimePrediction {
  claimId: string;
  predictedDays: number;
  confidence: number;
  minDays: number;
  maxDays: number;
  factors: string[];
  milestones: MilestonePrediction[];
}

/**
 * Milestone prediction
 */
export interface MilestonePrediction {
  milestone: string;
  predictedDate: Date;
  confidence: number;
}

/**
 * Litigation risk assessment
 */
export interface LitigationRisk {
  claimId: string;
  litigationProbability: number; // 0-1
  confidence: number;
  riskFactors: LitigationRiskFactor[];
  estimatedLitigationCost: number;
  estimatedDuration: number;
  recommendedActions: string[];
}

/**
 * Factor contributing to litigation risk
 */
export interface LitigationRiskFactor {
  factor: string;
  riskLevel: 'high' | 'medium' | 'low';
  description: string;
  impact: number;
}

/**
 * Reserve recommendation
 */
export interface ReserveRecommendation {
  claimId: string;
  recommendedAmount: number;
  confidence: number;
  justification: string;
  riskAdjustment: number;
  coverageLimit: number;
  remainingCoverage: number;
  factors: PredictionFactor[];
}

/**
 * Outcome explanation
 */
export interface OutcomeExplanation {
  claimId: string;
  settlementAmount: number;
  confidenceLevel: number;
  keyFactors: PredictionFactor[];
  comparableCases: ComparableCase[];
  marketConditions: MarketCondition[];
  recommendations: string[];
}

/**
 * Accuracy metrics for predictions
 */
export interface AccuracyMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalPredictions: number;
  settlementAccuracy: number; // percentage within 10%
  settlementMAE: number; // Mean Absolute Error
  settlementRMSE: number; // Root Mean Square Error
  resolutionTimeAccuracy: number;
  litigationAccuracy: number;
  modelVersion: string;
  calibrationStatus: 'calibrated' | 'uncalibrated' | 'recalibrating';
}

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Comparable case
 */
export interface ComparableCase {
  claimId: string;
  claimType: string;
  claimedAmount: number;
  settledAmount: number;
  settlementRatio: number;
  resolutionDays: number;
  similarity: number; // 0-1
  differences: string[];
}

/**
 * Market condition
 */
export interface MarketCondition {
  factor: string;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: number;
  description: string;
}

// ========================================
// SETTLEMENT OPTIMIZATION TYPES
// ========================================

/**
 * Settlement recommendation
 */
export interface SettlementRecommendation {
  id: string;
  claimId: string;
  recommendedAmount: number;
  confidenceLevel: number;
  negotiationStrategy: 'aggressive' | 'balanced' | 'conservative';
  litigationCostEstimate: number;
  subrogationPotential: number;
  justification: string;
  createdAt: Date;
  recommendedTimestamp: Date;
}

/**
 * Optimal settlement calculation
 */
export interface OptimalSettlement {
  claimId: string;
  basePolicyLimit: number;
  validClaimAmount: number;
  coverageAdjustment: number;
  disputeRiskAdjustment: number;
  subrogationPotential: number;
  litigationCostAvoidance: number;
  optimalAmount: number;
  confidenceInterval: [number, number];
  strategy: 'aggressive' | 'balanced' | 'conservative';
  factors: SettlementFactor[];
}

/**
 * Settlement factor
 */
export interface SettlementFactor {
  factor: string;
  value: number;
  weight: number;
  description: string;
}

/**
 * Negotiation strategy
 */
export interface NegotiationStrategy {
  claimId: string;
  strategy: 'aggressive' | 'balanced' | 'conservative';
  rationale: string;
  openingOffer: number;
  targetAmount: number;
  walkAwayPoint: number;
  concessions: Concession[];
  timeline: NegotiationTimeline;
}

/**
 * Concession option
 */
export interface Concession {
  item: string;
  amount: number;
  condition: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Negotiation timeline
 */
export interface NegotiationTimeline {
  expectedRounds: number;
  estimatedDuration: number; // days
  keyMilestones: Milestone[];
}

/**
 * Milestone
 */
export interface Milestone {
  milestone: string;
  estimatedDays: number;
  action: string;
}

/**
 * Litigation cost estimate
 */
export interface LitigationCostEstimate {
  claimId: string;
  attorneyFees: number;
  courtCosts: number;
  expertWitnessFees: number;
  discoveryCosts: number;
  miscellaneous: number;
  totalEstimatedCost: number;
  confidenceInterval: [number, number];
  riskAdjustment: number;
}

/**
 * Subrogation potential
 */
export interface SubrogationPotential {
  claimId: string;
  hasSubrogationPotential: boolean;
  responsibleParty?: string;
  estimatedRecoveryAmount: number;
  confidence: number;
  recoveryProbability: number;
  estimatedTimeframe: number; // months
  costs: RecoveryCosts;
  netRecovery: number;
  recommendedActions: string[];
}

/**
 * Recovery costs
 */
export interface RecoveryCosts {
  attorneyFees: number;
  investigationCosts: number;
  courtCosts: number;
  otherCosts: number;
  totalCosts: number;
}

/**
 * Settlement justification
 */
export interface Justification {
  claimId: string;
  recommendedAmount: number;
  basis: string[];
  policyLimits: {
    coverageType: string;
    limit: number;
    remaining: number;
  }[];
  benchmarks: {
    averageSettlement: number;
    medianSettlement: number;
    percentile: number;
  };
  riskFactors: string[];
  mitigatingFactors: string[];
  comparableCases: ComparableCase[];
  conclusion: string;
}

/**
 * Comparable case result
 */
export interface ComparableCases {
  claimId: string;
  totalFound: number;
  comparableCases: ComparableCase[];
  averageSettlement: number;
  medianSettlement: number;
  settlementRange: [number, number];
  recommendations: string[];
}

// ========================================
// CLAIMS AUTOMATION TYPES
// ========================================

/**
 * Auto-approval result
 */
export interface AutoApprovalResult {
  claimId: string;
  canAutoApprove: boolean;
  autoApproved: boolean;
  reasons: string[];
  blockingFactors: string[];
  processedAt: Date;
  processedBy: string;
}

/**
 * Routing decision
 */
export interface RoutingDecision {
  claimId: string;
  routedTo: {
    type: 'agent' | 'team' | 'queue';
    id: string;
    name: string;
  };
  routingRules: string[];
  priority: string;
  estimatedProcessingTime: number;
  routedAt: Date;
}

/**
 * Document request
 */
export interface DocumentRequest {
  documentType: string;
  description: string;
  deadline: Date;
  priority: 'high' | 'medium' | 'low';
  sentAt: Date;
  status: 'pending' | 'received' | 'overdue';
}

/**
 * Vendor assignment
 */
export interface VendorAssignment {
  claimId: string;
  vendorType: 'repair' | 'medical' | 'inspection' | 'legal';
  vendorId: string;
  vendorName: string;
  assignedAt: Date;
  assignmentCriteria: string[];
  estimatedCost?: number;
}

/**
 * Payment result
 */
export interface PaymentResult {
  claimId: string;
  paymentProcessed: boolean;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: Date;
  transactionId?: string;
  errors?: string[];
}

/**
 * Automation rule result
 */
export interface AutomationRuleResult {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  matched: boolean;
  executed: boolean;
  actionTaken: string;
  result?: any;
  executedAt: Date;
  error?: string;
}

/**
 * Eligibility status
 */
export interface EligibilityStatus {
  claimId: string;
  canAutoApprove: boolean;
  canAutoRoute: boolean;
  canAutoPay: boolean;
  eligibility: {
    criterion: string;
    met: boolean;
    reason?: string;
  }[];
  recommendations: string[];
  assessedAt: Date;
}

// ========================================
// INVESTIGATION TYPES
// ========================================

/**
 * Investigation recommendation
 */
export interface InvestigationRec {
  claimId: string;
  recommendedInvestigation: boolean;
  investigationType: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  keyAreas: string[];
  estimatedDuration: number;
  estimatedCost: number;
  resources: string[];
}

/**
 * Investigation type
 */
export interface InvestigationType {
  type: string;
  description: string;
  triggers: string[];
  requiredSteps: string[];
  typicalDuration: number;
}

/**
 * Prioritized investigation
 */
export interface PrioritizedInvestigation {
  claimId: string;
  claimNumber: string;
  investigationType: string;
  priority: number; // higher = more urgent
  fraudScore: number;
  claimAmount: number;
  urgencyFactors: string[];
  recommendedInvestigator?: string;
}

/**
 * Investigator assignment
 */
export interface InvestigatorAssignment {
  claimId: string;
  investigationId: string;
  investigatorId: string;
  investigatorName: string;
  assignedAt: Date;
  dueDate: Date;
  specialization: string[];
  workload: number;
}

/**
 * Investigation results
 */
export interface InvestigationResults {
  investigationId: string;
  claimId: string;
  investigatorId: string;
  status: string;
  findings: string;
  fraudConfirmed: boolean;
  fraudConfirmedAmount?: number;
  evidenceCollected: EvidenceItem[];
  recommendations: string[];
  nextSteps: string[];
  completedAt?: Date;
}

/**
 * Evidence item
 */
export interface EvidenceItem {
  type: string;
  description: string;
  source: string;
  dateCollected: Date;
  collectedBy: string;
  importance: 'high' | 'medium' | 'low';
}

// ========================================
// CLAIMS ANALYTICS TYPES
// ========================================

/**
 * Claims metrics
 */
export interface ClaimsMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalClaims: number;
  claimsByStatus: Record<string, number>;
  claimsByType: Record<string, number>;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  averageClaimAmount: number;
  averageProcessingDays: number;
  approvalRate: number;
  denialRate: number;
  fraudDetectionRate: number;
  litigationRate: number;
  settlementRatio: number;
}

/**
 * Processing analytics
 */
export interface ProcessingAnalytics {
  averageProcessingDays: number;
  medianProcessingDays: number;
  processingDaysDistribution: {
    under7: number;
    under14: number;
    under30: number;
    under60: number;
    over60: number;
  };
  bottlenecks: Bottleneck[];
  averageTimeByStage: {
    stage: string;
    averageDays: number;
  }[];
}

/**
 * Settlement analysis
 */
export interface SettlementAnalysis {
  averageSettlementAmount: number;
  medianSettlementAmount: number;
  settlementRatio: number; // settled / claimed
  settlementRatioDistribution: {
    under50: number;
    under75: number;
    under100: number;
    over100: number;
  };
  settlementByType: Record<string, {
    average: number;
    count: number;
  }>;
}

/**
 * Subrogation metrics
 */
export interface SubrogationMetrics {
  totalRecoverableClaims: number;
  totalRecoveryAmount: number;
  recoveryRate: number;
  averageRecoveryTime: number;
  successfulRecoveryClaims: number;
  failedRecoveryClaims: number;
  recoveryByType: Record<string, number>;
}

/**
 * Litigation statistics
 */
export interface LitigationStatistics {
  totalLitigationCases: number;
  litigationRate: number;
  averageLitigationCost: number;
  averageLitigationDuration: number;
  winRate: number;
  settlementInLitigation: number;
  dismissedCases: number;
  litigationByType: Record<string, number>;
}

/**
 * Processing bottleneck
 */
export interface Bottleneck {
  stage: string;
  averageDelay: number;
  claimsDelayed: number;
  percentageOfClaims: number;
  rootCauses: string[];
  recommendations: string[];
}

/**
 * Claim queue
 */
export interface ClaimQueue {
  queueType: string;
  claims: {
    claimId: string;
    claimNumber: string;
    priority: string;
    inQueueDays: number;
  }[];
  totalClaims: number;
  averageWaitTime: number;
  longestWaiting: number;
}

/**
 * Analytics by queue
 */
export interface ClaimsByQueue {
  queue: ClaimQueue;
  trends: {
    date: Date;
    count: number;
  }[];
  forecasts: {
    date: Date;
    predicted: number;
  }[];
}
