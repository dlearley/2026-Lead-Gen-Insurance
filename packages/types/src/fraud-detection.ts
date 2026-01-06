// ========================================
// FRAUD DETECTION TYPES - Phase 27.4
// ========================================

/**
 * Fraud assessment result for a claim
 */
export interface FraudAssessment {
  id: string;
  claimId: string;
  assessmentDate: Date;
  fraudProbability: number; // 0-1
  fraudRiskLevel: 'High' | 'Medium' | 'Low';
  riskFactors: RiskFactor[];
  ruleTriggers: string[];
  behavioralAnomalies: Anomaly[];
  networkRisk: boolean;
  fraudNetworkId?: string;
  investigatorNotes?: string;
  flagForInvestigation: boolean;
  createdAt: Date;
}

/**
 * Individual risk factor contributing to fraud score
 */
export interface RiskFactor {
  factor: string;
  score: number; // 0-100
  explanation: string;
  weight?: number;
}

/**
 * Rule violation from rule-based fraud detection
 */
export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  triggeredValue: any;
  expectedValue?: any;
  impactScore: number; // 0-100
}

/**
 * Behavioral anomaly detected
 */
export interface Anomaly {
  id: string;
  anomalyType: 'size' | 'timing' | 'frequency' | 'network' | 'document' | 'behavioral';
  anomalyScore: number; // 0-100
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  detectedValue: any;
  expectedValue?: any;
  confidence: number; // 0-1
}

/**
 * Fraud detection score from ML model
 */
export interface FraudScore {
  probability: number; // 0-1
  confidence: number; // 0-1
  modelVersion: string;
  featureContributions: FeatureContribution[];
  calibrationStatus: 'calibrated' | 'uncalibrated';
}

/**
 * Feature contribution to fraud score
 */
export interface FeatureContribution {
  feature: string;
  value: any;
  contribution: number; // -1 to 1
  importance: number; // 0-1
}

/**
 * Network connection for fraud ring detection
 */
export interface NetworkConnection {
  sourceId: string;
  targetId: string;
  sourceType: 'claimant' | 'provider' | 'witness' | 'beneficiary';
  targetType: 'claimant' | 'provider' | 'witness' | 'beneficiary';
  connectionStrength: number; // 0-1
  connectionType: string; // same_address, same_provider, shared_witness, etc.
  evidenceCount: number;
  fraudProbability: number;
}

/**
 * Fraud explanation for investigators
 */
export interface FraudExplanation {
  claimId: string;
  overallRisk: 'High' | 'Medium' | 'Low';
  keyFactors: RiskFactor[];
  triggeredRules: RuleViolation[];
  networkRisks: NetworkConnection[];
  recommendedActions: string[];
  investigatorNotes?: string;
}

/**
 * Suspicious claim for batch review
 */
export interface SuspiciousClaim {
  claimId: string;
  claimNumber: string;
  claimantName?: string;
  fraudProbability: number;
  fraudRiskLevel: 'High' | 'Medium' | 'Low';
  claimedAmount: number;
  submittedDate: Date;
  keyRedFlags: string[];
  requiresImmediateReview: boolean;
}

/**
 * Claim filter for suspicious claims query
 */
export interface ClaimFilter {
  minFraudScore?: number;
  fraudRiskLevel?: 'High' | 'Medium' | 'Low';
  insuranceType?: string;
  claimType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  requiresInvestigation?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Size anomaly (claim amount is unusual)
 */
export interface SizeAnomaly {
  claimAmount: number;
  historicalAverage: number;
  deviation: number; // percentage from average
  percentile: number; // 0-100
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Timing anomaly (unusual timing patterns)
 */
export interface TimingAnomaly {
  daysSinceLastClaim: number;
  historicalAverage: number;
  daysSincePolicyStart: number;
  timeOfDay: string;
  dayOfWeek: string;
  unusualPatterns: string[];
}

/**
 * Frequency anomaly (too many claims)
 */
export interface FrequencyAnomaly {
  customerId: string;
  claimsInPeriod: number;
  averageClaims: number;
  period: '30_days' | '90_days' | '1_year';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Network anomaly analysis
 */
export interface NetworkAnomaly {
  networkId: string;
  memberCount: number;
  connectedClaims: number[];
  totalClaimedAmount: number;
  fraudProbability: number;
  networkType: 'organized_ring' | 'family_network' | 'provider_conspiracy';
}

/**
 * Document anomaly (issues with uploaded documents)
 */
export interface DocumentAnomaly {
  documentId: string;
  documentType: string;
  issues: string[];
  imageQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  metadataIssues?: string[];
  ocrConfidence?: number;
  tamperingIndicators?: string[];
}

/**
 * Anomaly explanation
 */
export interface AnomalyExplanation {
  anomalyId: string;
  anomalyType: string;
  description: string;
  severity: string;
  detectedAt: Date;
  rootCauses: string[];
  recommendedActions: string[];
  similarCases: string[];
}

// ========================================
// FRAUD NETWORK TYPES
// ========================================

/**
 * Fraud network
 */
export interface FraudNetwork {
  id: string;
  networkType: 'organized_ring' | 'family_network' | 'provider_conspiracy';
  memberCount: number;
  totalFraudLoss: number;
  confidenceScore: number;
  status: 'active' | 'under_investigation' | 'closed';
  lawEnforcementReported: boolean;
  reportDate?: Date;
  notes?: string;
  createdAt: Date;
}

/**
 * Network member
 */
export interface NetworkMember {
  id: string;
  networkId: string;
  memberType: 'claimant' | 'provider' | 'witness' | 'beneficiary';
  memberId?: string;
  memberInfo: {
    name?: string;
    contact?: string;
    details?: Record<string, unknown>;
  };
  connectionStrength: number;
  addedDate: Date;
  createdAt: Date;
}

/**
 * Network analysis results
 */
export interface NetworkAnalysis {
  networkId: string;
  members: NetworkMember[];
  connections: NetworkConnection[];
  totalClaimedAmount: number;
  fraudProbability: number;
  keyFigures: string[];
  suspiciousPatterns: string[];
  lawEnforcementRecommendation: boolean;
}

/**
 * Report result for law enforcement
 */
export interface ReportResult {
  networkId: string;
  reportId: string;
  submitted: boolean;
  submittedAt?: Date;
  caseNumber?: string;
  receivingAgency?: string;
}

/**
 * Network statistics
 */
export interface NetworkStatistics {
  totalNetworks: number;
  activeNetworks: number;
  closedNetworks: number;
  totalMembers: number;
  totalFraudLoss: number;
  averageMemberCount: number;
  networksByType: Record<string, number>;
  recentActivity: FraudNetwork[];
}

/**
 * Prediction for future fraud from network
 */
export interface PredictionResult {
  networkId: string;
  futureFraudProbability: number;
  expectedLossRange: [number, number];
  timeframe: string;
  confidence: number;
  recommendedActions: string[];
}

// ========================================
// FRAUD MODEL TYPES
// ========================================

/**
 * Fraud detection model configuration
 */
export interface FraudDetectionModel {
  id: string;
  name: string;
  modelType: 'behavioral' | 'ml_classifier' | 'rule_based' | 'network';
  insuranceLine?: 'Auto' | 'Home' | 'Life' | 'Health' | 'Commercial';
  modelVersion: number;
  trainingDate: Date;
  performanceMetrics: {
    precision: number;
    recall: number;
    f1: number;
    auc: number;
    fraudCatchRate: number;
  };
  featureImportance: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Claim data for fraud analysis
 */
export interface ClaimData {
  claimId: string;
  claimNumber: string;
  customerId: string;
  policyNumber?: string;
  insuranceType: string;
  claimType: string;
  claimedAmount: number;
  incidentDate: Date;
  submittedDate: Date;
  claimantInfo: {
    age?: number;
    address?: string;
    phone?: string;
    email?: string;
  };
  policyInfo?: {
    startDate: Date;
    coverageAmount: number;
    deductible: number;
  };
  providerInfo?: {
    providerId: string;
    providerName: string;
    providerType: string;
  };
  previousClaims?: any[];
  documents?: any[];
}
