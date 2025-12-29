// ========================================
// ADVANCED AI & VERTICALS
// Phase 13: Industry-specific AI models and multi-modal processing
// ========================================

import { InsuranceType } from './scoring';

// ========================================
// VERTICAL AI CONFIGURATION
// ========================================

export interface VerticalAIConfig {
  id: string;
  insuranceType: InsuranceType;
  mlModelId: string;
  isActive: boolean;
  confidenceThreshold: number;
  autoTrainEnabled: boolean;
  lastTrainedAt: Date;
  trainingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  accuracyMetrics: ModelAccuracyMetrics;
  features: string[];
  hyperparameters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelAccuracyMetrics {
  precision: number; // 0-1
  recall: number; // 0-1
  f1Score: number; // 0-1
  accuracy: number; // 0-1
  auc: number; // 0-1
  trainingDataSize: number;
  validationDataSize: number;
  deployedAt: Date;
  version: string;
}

// ========================================
// PREDICTIVE ANALYTICS
// ========================================

export interface PredictiveModels {
  conversionProbability: number; // 0-1
  conversionConfidence: number; // 0-1
  churnProbability?: number; // 0-1
  lifetimeValue?: number; // USD
  nextActionProbability: Record<string, number>;
  riskScore?: number; // 0-100
  riskFactors: string[];
}

export interface ConversionPrediction {
  leadId: string;
  insuranceType: InsuranceType;
  probability: number; // 0-1
  confidence: number; // 0-1
  primaryFactors: ConversionFactor[];
  timelinePrediction: {
    immediate: number;
    week: number;
    month: number;
    quarter: number;
  };
  recommendations: ConversionRecommendation[];
  similarLeads: {
    converted: number;
    total: number;
    conversionRate: number;
  };
  createdAt: Date;
}

export interface ConversionFactor {
  factor: string;
  weight: number; // -1 to 1
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ConversionRecommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number; // percentage improvement
  timeframe: string;
  channel?: 'phone' | 'email' | 'sms' | 'chat';
}

// ========================================
// CHURN DETECTION
// ========================================

export interface ChurnPrediction {
  clientId: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  riskLevel: 'high' | 'medium' | 'low';
  primaryIndicators: ChurnIndicator[];
  retentionRecommendations: RetentionRecommendation[];
  policyPredictions: PolicyChurnPrediction[];
  createdAt: Date;
}

export interface ChurnIndicator {
  indicator: string;
  severity: number; // 0-1
  description: string;
  timeframe: string;
}

export interface RetentionRecommendation {
  strategy: string;
  cost: number; // USD
  expectedImpact: number; // percentage
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  personalizations: string[];
}

export interface PolicyChurnPrediction {
  policyId: string;
  policyType: InsuranceType;
  renewalProbability: number; // 0-1
  priceSensitivity: number; // 0-1
  competitorRisk: 'high' | 'medium' | 'low';
  factors: string[];
}

// ========================================
// LIFETIME VALUE PREDICTION
// ========================================

export interface LifetimeValuePrediction {
  clientId: string;
  predictedValue: number; // USD
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  timeline: {
    year1: number;
    year2: number;
    year3: number;
    year5: number;
  };
  contributingFactors: ValueFactor[];
  crossSellOpportunities: CrossSellOpportunity[];
  createdAt: Date;
}

export interface ValueFactor {
  factor: string;
  contribution: number; // USD
  description: string;
}

export interface CrossSellOpportunity {
  insuranceType: InsuranceType;
  probability: number; // 0-1
  estimatedValue: number; // USD
  timeframe: string;
  recommendedApproach: string;
}

// ========================================
// VERTICAL-SPECIFIC DATA MODELS
// ========================================

// AUTO INSURANCE VERTICAL
export interface AutoVerticalData extends VerticalData {
  vehicleDetails: VehicleDetails;
  driverProfile: DriverProfile;
  usagePatterns: UsagePatterns;
  riskAssessment: AutoRiskAssessment;
  recommendedProducts: AutoProductRecommendation[];
  pricingFactors: AutoPricingFactor[];
}

export interface VehicleDetails {
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  value: number;
  safetyRating: number; // 0-5
  theftRisk: 'low' | 'medium' | 'high';
  repairCostCategory: 'low' | 'medium' | 'high';
}

export interface DriverProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  maritalStatus: string;
  drivingExperience: number; // years
  licenseStatus: 'valid' | 'suspended' | 'expired';
  education?: string;
  occupation?: string;
  creditScoreRange?: 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';
}

export interface UsagePatterns {
  annualMileage: number;
  commuteDistance: number;
  primaryUse: 'commute' | 'business' | 'pleasure' | 'mixed';
  garageParking: boolean;
  antiTheftDevice: boolean;
  multiVehicle: boolean;
}

export interface AutoRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  accidentProbability: number; // 0-1
  claimProbability: number; // 0-1
  claimSeverityEstimate: number; // USD
  factors: RiskFactor[];
}

export interface AutoProductRecommendation {
  productType: 'liability' | 'collision' | 'comprehensive' | 'full_coverage' | 'gap';
  recommendation: 'required' | 'recommended' | 'optional';
  reasoning: string;
  estimatedCost: number; // USD per year
  coverageLimits: Record<string, string>;
}

export interface AutoPricingFactor {
  factor: string;
  impact: number; // percentage impact on premium
  description: string;
}

// HOME INSURANCE VERTICAL
export interface HomeVerticalData extends VerticalData {
  propertyDetails: PropertyDetails;
  locationRisk: LocationRisk;
  coverageAssessment: CoverageAssessment;
  recommendedProducts: HomeProductRecommendation[];
  replacementCost: ReplacementCostEstimate;
}

export interface PropertyDetails {
  yearBuilt: number;
  squareFootage: number;
  constructionType: string;
  numberOfStories: number;
  foundationType: string;
  roofType: string;
  roofAge: number;
  garage: boolean;
  numberOfUnits?: number;
}

export interface LocationRisk {
  floodZone: string;
  wildfireRisk: 'low' | 'moderate' | 'high' | 'very_high';
  earthquakeRisk: 'low' | 'moderate' | 'high';
  hurricaneRisk: 'low' | 'moderate' | 'high';
  tornadoRisk: 'low' | 'moderate' | 'high';
  crimeRate: 'low' | 'medium' | 'high';
  distanceToFireStation: number; // km
  fireHydrantAccess: boolean;
}

export interface CoverageAssessment {
  currentCoverageAdequacy: 'adequate' | 'inadequate' | 'excessive';
  recommendedCoverage: number; // USD
  coverageGaps: string[];
  deductibleRecommendation: {
    recommended: number;
    savingsVsDeductible: number;
  };
}

export interface HomeProductRecommendation {
  productType: 'dwelling' | 'other_structures' | 'personal_property' | 'liability' | 'additional_living' | 'endorsements';
  recommendedAmount: number; // USD
  reasoning: string;
  optionalEndorsements: string[];
}

export interface ReplacementCostEstimate {
  totalCost: number; // USD
  breakdown: Record<string, number>;
  inflationGuard: boolean;
  marketValue: number; // USD
}

// LIFE INSURANCE VERTICAL
export interface LifeVerticalData extends VerticalData {
  applicantProfile: ApplicantProfile;
  medicalAssessment: MedicalAssessment;
  financialNeeds: FinancialNeedsAnalysis;
  recommendedProducts: LifeProductRecommendation[];
  underwritingFactors: UnderwritingFactor[];
}

export interface ApplicantProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  height: {
    feet: number;
    inches: number;
  };
  weight: number;
  tobaccoUse: boolean;
  alcoholUse: 'none' | 'occasional' | 'moderate' | 'heavy';
  occupation: string;
  hobbies: string[];
  foreignTravel: boolean;
  militaryService: boolean;
  citizenship: string;
}

export interface MedicalAssessment {
  healthClass: 'preferred_plus' | 'preferred' | 'standard_plus' | 'standard' | 'substandard';
  bmi: number;
  bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese';
  familyHistory: string[];
  medicalConditions: string[];
  currentMedications: string[];
  recentHospitalizations: number;
  riskyBehavior: string[];
}

export interface FinancialNeedsAnalysis {
  incomeReplacement: number; // USD
  debtCoverage: number; // USD
  educationFunding: number; // USD
  finalExpenses: number; // USD
  emergencyFund: number; // USD
  totalNeed: number; // USD
  existingCoverage: number; // USD
  recommendedCoverage: number; // USD
}

export interface LifeProductRecommendation {
  productType: 'term' | 'whole_life' | 'universal_life' | 'variable_life';
  recommendation: 'highly_recommended' | 'recommended' | 'limited';
  faceAmount: number; // USD
  termLength?: number; // years
  estimatedPremium: number; // USD/year
  reasoning: string;
  riders: string[];
}

export interface UnderwritingFactor {
  factor: string;
  impact: 'favorable' | 'neutral' | 'unfavorable';
  description: string;
  estimatedRatingImpact: number;
}

// HEALTH INSURANCE VERTICAL
export interface HealthVerticalData extends VerticalData {
  demographics: HealthDemographics;
  healthStatus: HealthStatus;
  coverageAnalysis: HealthCoverageAnalysis;
  networkAssessment: ProviderNetworkAssessment;
  recommendedPlans: HealthPlanRecommendation[];
  wellnessScore: WellnessScore;
}

export interface HealthDemographics {
  age: number;
  gender: 'male' | 'female' | 'other';
  maritalStatus: string;
  householdSize: number;
  location: {
    state: string;
    county: string;
    zipCode: string;
  };
  incomeBracket: string;
  subsidyEligibility: boolean;
  estimatedSubsidy: number; // USD
}

export interface HealthStatus {
  overallHealth: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
  chronicConditions: string[];
  currentPrescriptions: string[];
  recentHospitalizations: number;
  emergencyRoomVisits: number;
  preventiveCareUsage: 'regular' | 'occasional' | 'never';
  lifestyleFactors: {
    exercise: 'regular' | 'occasional' | 'none';
    diet: 'healthy' | 'average' | 'poor';
    smoking: 'never' | 'former' | 'current';
    alcohol: 'none' | 'moderate' | 'heavy';
  };
}

export interface HealthCoverageAnalysis {
  currentCoverage: 'employer' | 'individual' | 'medicare' | 'medicaid' | 'none';
  affordability: {
    subsidizedPremium: number;
    outOfPocketMax: number;
    estimatedTotalCost: number;
  };
  coverageGaps: string[];
  essentialHealthBenefits: string[];
}

export interface ProviderNetworkAssessment {
  primaryCareAccess: 'good' | 'moderate' | 'limited';
  specialistAccess: 'good' | 'moderate' | 'limited';
  hospitalQuality: string[];
  outOfNetworkCoverage: boolean;
  networkSize: number;
  telehealthAvailable: boolean;
}

export interface HealthPlanRecommendation {
  planType: 'hcp' | 'hmop' | 'ppos' | 'eopp' | 'hdhp';
  planLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  estimatedPremium: number; // USD
  averageCopay: number; // USD
  averageCoinsurance: number; // percentage
  deductible: number; // USD
  outOfPocketMax: number; // USD
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable';
  reasoning: string;
  providerNetwork: string;
}

export interface WellnessScore {
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  improvementOpportunities: {
    area: string;
    potentialImpact: number; // percentage improvement
  }[];
  estimatedSavings: number; // USD
}

// BASE VERTICAL DATA INTERFACE
export interface VerticalData {
  insuranceType: InsuranceType;
  dataQuality: 'high' | 'medium' | 'low';
  completenessScore: number; // 0-100
  confidenceLevel: number; // 0-1
  extractedDataPoints: number;
  requiresManualReview: boolean;
  reviewPriority: 'high' | 'medium' | 'low';
  verticalAIInsights: VerticalAIInsight[];
  complianceFlags: ComplianceFlag[];
}

export interface VerticalAIInsight {
  category: string;
  insight: string;
  confidence: number; // 0-1
  evidence: string[];
  action: string;
}

export interface ComplianceFlag {
  type: 'missing_info' | 'inconsistent_data' | 'risk_indicator' | 'regulatory_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  field: string;
  recommendedAction: string;
}

// ========================================
// MULTI-MODAL AI PROCESSING
// ========================================

export interface DocumentProcessingResult {
  documentId: string;
  documentType: 'license' | 'registration' | 'policy' | 'claim_form' | 'medical_record' | 'inspection_report' | 'photo' | 'other';
  insuranceType: InsuranceType;
  extractedFields: Record<string, unknown>;
  confidenceScores: Record<string, number>;
  extractedText: string;
  entities: EntityExtraction[];
  classification: DocumentClassification;
  validationResult: DocumentValidation;
  ocrQuality: {
    score: number; // 0-1
    issues: string[];
    enhancementApplied: string[];
  };
  processingTime: number; // ms
  requiresReview: boolean;
  reviewerNotes: string[];
}

export interface EntityExtraction {
  entityType: 'person' | 'date' | 'amount' | 'address' | 'vehicle' | 'policy_number' | 'location' | 'medical_term' | 'other';
  value: string;
  confidence: number; // 0-1
  position?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DocumentClassification {
  primaryType: string;
  secondaryTypes: string[];
  confidence: number; // 0-1
  reasoning: string;
}

export interface DocumentValidation {
  isValid: boolean;
  completenessScore: number; // 0-100
  missingFields: string[];
  inconsistencies: ValidationError[];
  suggestedCorrections: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  error: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface ImageAnalysisResult {
  imageId: string;
  analysisType: 'vehicle_damage' | 'property_damage' | 'document_photo' | 'id_verification' | 'property_inspection';
  insuranceType: InsuranceType;
  detectedObjects: DetectedObject[];
  classification: ImageClassification;
  damageAssessment?: DamageAssessment;
  qualityAssessment: ImageQualityAssessment;
  confidence: number; // 0-1
  requiresExpertReview: boolean;
}

export interface DetectedObject {
  objectType: string;
  confidence: number; // 0-1
  location: {
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
  };
  attributes: Record<string, unknown>;
}

export interface ImageClassification {
  primaryCategory: string;
  secondaryCategories: string[];
  confidence: number; // 0-1
  severity?: 'minor' | 'moderate' | 'severe' | 'catastrophic';
}

export interface DamageAssessment {
  damageDetected: boolean;
  damageTypes: string[];
  severity: 'minor' | 'moderate' | 'severe';
  estimatedRepairCost: number; // USD
  costRange: {
    min: number;
    max: number;
  };
  totalLossProbability: number; // 0-1
  factors: DamageFactor[];
}

export interface DamageFactor {
  factor: string;
  impact: 'increases' | 'decreases' | 'neutral';
  severityContribution: number; // 0-1
}

export interface ImageQualityAssessment {
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  qualityScore: number; // 0-1
  issues: string[];
  recommendations: string[];
}

export interface VoiceProcessingResult {
  audioId: string;
  transcript: string;
  confidence: number; // 0-1
  speakerDiarization?: SpeakerDiarization[];
  sentimentAnalysis: SentimentAnalysis;
  intentRecognition: IntentRecognition;
  callQuality: {
    score: number; // 0-1
    issues: string[];
  };
  keywords: string[];
  entities: EntityExtraction[];
  actionItems: string[];
  duration: number; // seconds
  silencePercentage: number; // percentage
}

export interface SpeakerDiarization {
  speaker: string; // 'agent' or 'client'
  segments: {
    startTime: number; // seconds
    endTime: number; // seconds
    text: string;
  }[];
  sentiment: SentimentAnalysis;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 (negative) to 1 (positive)
  aspects: Array<{
    aspect: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }>;
}

export interface IntentRecognition {
  primaryIntent: string;
  confidence: number; // 0-1
  secondaryIntents: string[];
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  actionsRequired: string[];
}

// ========================================
// CONVERSATIONAL AI
// ========================================

export interface ChatbotConversation {
  conversationId: string;
  leadId?: string;
  agentId?: string;
  status: 'active' | 'completed' | 'escalated' | 'abandoned';
  channel: 'web' | 'mobile' | 'sms' | 'whatsapp' | 'messenger';
  startedAt: Date;
  endedAt?: Date;
  messages: ChatMessage[];
  summary: ConversationSummary;
  nextActions: RecommendedAction[];
  handoffRequired: boolean;
  handoffReason?: string;
}

export interface ChatMessage {
  messageId: string;
  sender: 'user' | 'bot' | 'agent';
  content: string;
  timestamp: Date;
  intent: string;
  entities: EntityExtraction[];
  confidence: number; // 0-1
  responseTime?: number; // milliseconds
}

export interface ConversationSummary {
  primaryTopic: string;
  topics: string[];
  questionsAnswered: number;
  pendingQuestions: string[];
  leadQualification?: {
    level: 'hot' | 'warm' | 'cold';
    reasoning: string;
  };
  recommendedProducts: InsuranceType[];
  scheduleFollowUp: boolean;
  followUpPriority: 'immediate' | 'high' | 'medium' | 'low';
}

export interface RecommendedAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo: 'agent' | 'system';
  dueBy?: Date;
}

export interface ChatbotAnalytics {
  totalConversations: number;
  avgConversationDuration: number; // minutes
  containmentRate: number; // percentage
  escalationRate: number; // percentage
  satisfactionScore: number; // 0-5
  topIntents: Array<{
    intent: string;
    count: number;
    avgConfidence: number;
  }>;
  responseTime: {
    p50: number; // milliseconds
    p95: number; // milliseconds
    p99: number; // milliseconds
  };
}

// ========================================
// ANALYTICS & INSIGHTS
// ========================================

export interface AIAnalyticsDashboard {
  modelPerformance: ModelPerformanceMetrics;
  predictionAccuracy: PredictionAccuracyMetrics;
  processingStats: ProcessingStatistics;
  businessImpact: BusinessImpactMetrics;
  alerts: AIAlert[];
}

export interface ModelPerformanceMetrics {
  models: Array<{
    modelId: string;
    insuranceType: InsuranceType;
    accuracy: number; // 0-1
    precision: number; // 0-1
    recall: number; // 0-1
    f1Score: number; // 0-1
    predictions: number;
    lastUpdated: Date;
  }>;
  avgAccuracy: number; // 0-1
  trendingUp: boolean;
}

export interface PredictionAccuracyMetrics {
  conversionPredictions: {
    total: number;
    accuracy: number; // 0-1
    byInsuranceType: Record<InsuranceType, number>;
  };
  churnPredictions: {
    total: number;
    accuracy: number; // 0-1
  };
  ltvPredictions: {
    total: number;
    meanAbsoluteError: number; // USD
  };
}

export interface ProcessingStatistics {
  documentsProcessed: number;
  avgProcessingTime: number; // ms
  successRate: number; // 0-1
  qualityScore: number; // 0-1
  byDocumentType: Record<string, {
    count: number;
    avgConfidence: number;
    avgProcessingTime: number;
  }>;
}

export interface BusinessImpactMetrics {
  conversionRateImprovement: number; // percentage
  avgSaleValueIncrease: number; // USD
  retentionImprovement: number; // percentage
  costPerLeadReduction: number; // USD
  estimatedRoi: number; // percentage
}

export interface AIAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'model_degradation' | 'prediction_anomaly' | 'processing_error' | 'compliance_issue';
  message: string;
  modelId?: string;
  insuranceType?: InsuranceType;
  triggeredAt: Date;
  acknowledged: boolean;
}

// ========================================
// COMPLIANCE & REGULATIONS
// ========================================

export interface ComplianceCheckResult {
  checkId: string;
  insuranceType: InsuranceType;
  regulationType: string;
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checkedAt: Date;
}

export interface ComplianceViolation {
  regulation: string;
  section: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation: string;
}

export interface ComplianceWarning {
  area: string;
  message: string;
  suggestion: string;
}

export interface RegulatoryUpdate {
  id: string;
  jurisdiction: string;
  regulation: string;
  effectiveDate: Date;
  description: string;
  impact: 'low' | 'medium' | 'high';
  requiredActions: string[];
  complianceDeadline: Date;
  status: 'pending' | 'review' | 'implemented';
}

// ========================================
// API REQUEST & RESPONSE TYPES
// ========================================

export interface PredictConversionRequest {
  leadId: string;
  insuranceType: InsuranceType;
  leadData: Record<string, unknown>;
  verticalData?: VerticalData;
}

export interface PredictConversionResponse {
  success: boolean;
  prediction: ConversionPrediction;
  error?: string;
}

export interface PredictChurnRequest {
  clientId: string;
  policyIds: string[];
  historicalData: Record<string, unknown>;
}

export interface PredictChurnResponse {
  success: boolean;
  prediction: ChurnPrediction;
  error?: string;
}

export interface PredictLifetimeValueRequest {
  clientId: string;
  currentPolicies: Array<{
    type: InsuranceType;
    premium: number;
    renewalDate: Date;
  }>;
  demographicData: Record<string, unknown>;
}

export interface PredictLifetimeValueResponse {
  success: boolean;
  prediction: LifetimeValuePrediction;
  error?: string;
}

export interface ProcessDocumentRequest {
  documentId: string;
  fileUri: string;
  documentType: string;
  insuranceType: InsuranceType;
  extractionConfig: Record<string, unknown>;
}

export interface ProcessDocumentResponse {
  success: boolean;
  result: DocumentProcessingResult;
  error?: string;
}

export interface AnalyzeImageRequest {
  imageId: string;
  imageUri: string;
  analysisType: string;
  insuranceType: InsuranceType;
  context?: Record<string, unknown>;
}

export interface AnalyzeImageResponse {
  success: boolean;
  result: ImageAnalysisResult;
  error?: string;
}

export interface ProcessVoiceRequest {
  audioId: string;
  audioUri: string;
  settings: {
    language: string;
    enableDiarization: boolean;
    enableSentiment: boolean;
  };
}

export interface ProcessVoiceResponse {
  success: boolean;
  result: VoiceProcessingResult;
  error?: string;
}

export interface ChatbotMessageRequest {
  conversationId: string;
  message: string;
  leadId?: string;
  context: Record<string, unknown>;
}

export interface ChatbotMessageResponse {
  success: boolean;
  reply: string;
  confidence: number;
  actions: RecommendedAction[];
  shouldEscalate: boolean;
  escalatedTo?: string;
  error?: string;
}

export interface GetAIAnalyticsRequest {
  timeframe: {
    start: Date;
    end: Date;
  };
  insuranceType?: InsuranceType;
  modelIds?: string[];
}

export interface GetAIAnalyticsResponse {
  success: boolean;
  analytics: AIAnalyticsDashboard;
  error?: string;
}

export interface RunComplianceCheckRequest {
  insuranceType: InsuranceType;
  jurisdiction: string;
  data: Record<string, unknown>;
}

export interface RunComplianceCheckResponse {
  success: boolean;
  result: ComplianceCheckResult;
  error?: string;
}

export interface GetVerticalDataRequest {
  leadId: string;
  insuranceType: InsuranceType;
}

export interface GetVerticalDataResponse {
  success: boolean;
  data: VerticalData;
  error?: string;
}

export interface UpdateModelConfigRequest {
  configId: string;
  updates: Partial<VerticalAIConfig>;
}

export interface UpdateModelConfigResponse {
  success: boolean;
  config: VerticalAIConfig;
  error?: string;
}

export interface TrainModelRequest {
  modelId: string;
  insuranceType: InsuranceType;
  trainingData: {
    positiveSamples: number;
    negativeSamples: number;
  };
}

export interface TrainModelResponse {
  success: boolean;
  modelId: string;
  trainingJobId: string;
  estimatedCompletion: Date;
  error?: string;
}

export interface GetModelAccuracyRequest {
  insuranceType: InsuranceType;
  timeframe?: {
    start: Date;
    end: Date;
  };
}

export interface GetModelAccuracyResponse {
  success: boolean;
  metrics: ModelAccuracyMetrics;
  error?: string;
}

// RISK ASSESSMENT INTERFACE
export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  severity: number; // 0-1
  probability: number; // 0-1
  impact: number; // 0-1
  weightedScore: number; // 0-1
  mitigationStrategies: string[];
  regulatoryImplications: string[];
}

export interface RiskAssessment {
  assessmentId: string;
  entityId: string;
  entityType: 'lead' | 'client' | 'policy' | 'claim';
  insuranceType: InsuranceType;
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: RiskMitigationRecommendation[];
  assessedAt: Date;
  nextReviewDate: Date;
}

export interface RiskMitigationRecommendation {
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffectiveness: number; // 0-1
  cost: number; // USD
  implementationTime: string;
  responsibleParty: string;
  successMetrics: string[];
}
