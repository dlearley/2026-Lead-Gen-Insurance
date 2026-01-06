// ========================================
// LEAD PRIORITIZATION & ROUTING TYPES
// ========================================

export type LeadTier = 'Tier1' | 'Tier2' | 'Tier3' | 'Tier4';

export type AgentTier = 'Elite' | 'Senior' | 'Standard' | 'Junior';

export type RoutingStrategy = 'greedy' | 'optimal' | 'reinforcement' | 'manual' | 'hybrid';

export type AgentStatus = 'Available' | 'In_Call' | 'Break' | 'Training' | 'Offline';

export type QueueType = 'hot' | 'active' | 'nurture' | 'waiting' | 'reassignment';

export type RoutingEventType =
  | 'assigned'
  | 'reassigned'
  | 'escalated'
  | 'failed_assignment'
  | 'sla_warning'
  | 'sla_breached'
  | 'agent_unavailable'
  | 'queue_reordered';

// ========================================
// LEAD PRIORITIZATION TYPES
// ========================================

export interface LeadScore {
  leadId: string;
  score: number; // 0-100
  tier: LeadTier;
  conversionProbability?: number;
  ltvPrediction?: number;
  churnRisk?: number;
  sourceQualityScore?: number;
  dynamicAdjustments: DynamicAdjustment;
  factors: ScoreFactor[];
  createdAt: Date;
}

export interface DynamicAdjustment {
  timeInQueueBonus: number;
  competitorActivityBoost: number;
  marketConditionMultiplier: number;
  commissionOpportunityBonus: number;
  crossSellUpsellPotential: number;
  totalAdjustment: number;
}

export interface ScoreFactor {
  category: string;
  factor: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface LeadPriority {
  leadId: string;
  queuePriority: number;
  tier: LeadTier;
  slaExpiry?: Date;
  timeInQueue: number; // seconds
  score: number;
  queuePosition?: number;
}

// ========================================
// AGENT SPECIALIZATION TYPES
// ========================================

export type InsuranceLine = 'Auto' | 'Home' | 'Life' | 'Health' | 'Commercial';

export type CustomerSegment = 'Individual' | 'SMB' | 'Enterprise';

export interface AgentSpecialization {
  id: string;
  agentId: string;
  insuranceLine: InsuranceLine;
  customerSegment: CustomerSegment;
  proficiencyLevel: number; // 1-5
  maxConcurrentLeads: number;
  languages: string[];
  territories: string[]; // State codes
  isEliteAgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCapability {
  agentId: string;
  specializations: AgentSpecialization[];
  tier: AgentTier;
  overallPerformance: number;
  languages: string[];
  territories: string[];
  canHandleComplexCases: boolean;
  isRetentionSpecialist: boolean;
  claimsExpertise: boolean;
  renewalExpertise: boolean;
}

export interface AgentMatch {
  agentId: string;
  fitnessScore: number;
  specializationMatch: number;
  performanceScore: number;
  availabilityScore: number;
  capacityUtilization: number;
  matchFactors: MatchFactor[];
  estimatedResponseTime: number;
}

export interface MatchFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
}

// ========================================
// AGENT PERFORMANCE TYPES
// ========================================

export interface PerformanceMetrics {
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  avgHandlingTimeMinutes: number;
  avgDealSize: number;
  customerSatisfactionRating: number;
  crossSellRate: number;
  upsellRate: number;
  repeatCustomerRate: number;
  avgLeadScore: number;
  tier1ConversionRate: number;
  tier2ConversionRate: number;
  tier3ConversionRate: number;
  complaintRate: number;
}

export interface AgentPerformance {
  agentId: string;
  periodDate: Date;
  metrics: PerformanceMetrics;
  overallRating: number;
  trend: 'improving' | 'stable' | 'declining';
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// CAPACITY MANAGEMENT TYPES
// ========================================

export interface AgentCapacity {
  agentId: string;
  currentLoad: number;
  maxCapacity: number;
  availableCapacity: number;
  predictedCapacity: number;
  utilizationRate: number;
  status: AgentStatus;
  lastUpdated: Date;
}

export interface CapacityHeatmap {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  utilization: number; // 0-100
  availableSlots: number;
  specializations: InsuranceLine[];
  territories: string[];
}

export interface CapacityForecast {
  agentId: string;
  timeSlot: string; // e.g., "2024-01-15 09:00-10:00"
  predictedLoad: number;
  predictedAvailableCapacity: number;
  confidence: number;
}

// ========================================
// ROUTING ENGINE TYPES
// ========================================

export interface RoutingResult {
  success: boolean;
  leadId: string;
  assignedAgentId?: string;
  queueType?: QueueType;
  strategy: RoutingStrategy;
  score: number;
  assignmentReason?: AssignmentReason;
  estimatedWaitTime?: number;
  slaMet: boolean;
  createdAt: Date;
}

export interface AssignmentReason {
  specializationMatch: number;
  capacityScore: number;
  performanceScore: number;
  availabilityBonus: number;
  totalScore: number;
  explanation: string[];
}

export interface RoutingExplanation {
  leadId: string;
  assignedAgentId: string;
  leadScore: number;
  agentMatchScore: number;
  factors: RoutingFactor[];
  alternatives: AlternativeAssignment[];
  confidence: number;
}

export interface RoutingFactor {
  factor: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  contribution: number;
}

export interface AlternativeAssignment {
  agentId: string;
  agentName: string;
  score: number;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  warnings: string[];
}

export interface ValidationViolation {
  type: 'conflict' | 'unavailable' | 'over_capacity' | 'incompatible';
  message: string;
  severity: 'error' | 'warning';
}

// ========================================
// QUEUE MANAGEMENT TYPES
// ========================================

export interface QueueMetrics {
  queueType: QueueType;
  totalLeads: number;
  avgWaitTime: number; // minutes
  maxWaitTime: number; // minutes
  slaComplianceRate: number; // 0-100
  assignmentRate: number; // assignments per hour
  abandonmentRate: number; // 0-100
  avgLeadScore: number;
  leadsApproachingSLA: number;
  slaBreachedCount: number;
  updatedAt: Date;
}

export interface AssignmentQueue {
  id: string;
  queueType: QueueType;
  leadId: string;
  leadScore: number;
  timeInQueue: number; // seconds
  assignmentAttempts: number;
  lastAttempted?: Date;
  estimatedWaitMinutes: number;
  slaExpiry?: Date;
  queuePosition: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SLAStatus {
  leadId: string;
  tier: LeadTier;
  slaLimit: number; // hours
  timeElapsed: number; // hours
  timeRemaining: number; // hours
  status: 'compliant' | 'warning' | 'critical' | 'breached';
  expiryDate?: Date;
}

// ========================================
// ROUTING RULES TYPES
// ========================================

export type RuleType = 'matching' | 'capacity' | 'geographic' | 'business_logic' | 'temporal';

export type RuleOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'exists'
  | 'between';

export interface RoutingRule {
  id: string;
  ruleName: string;
  ruleType: RuleType;
  condition: RuleCondition;
  action: string;
  priority: number; // 1-100, higher = more important
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
  logicalOperator?: 'and' | 'or';
  conditions?: RuleCondition[];
}

export interface RoutingAction {
  type: 'assign_to' | 'escalate' | 'hold' | 'reroute' | 'move_queue';
  params: Record<string, unknown>;
}

// ========================================
// ROUTING ANALYTICS TYPES
// ========================================

export interface RoutingMetrics {
  period: { start: Date; end: Date };
  totalAssignments: number;
  successfulAssignments: number;
  failedAssignments: number;
  firstAttemptSuccessRate: number; // 0-100
  avgAssignmentTime: number; // seconds
  avgWaitTimeByTier: Record<LeadTier, number>;
  slaComplianceByTier: Record<LeadTier, number>;
  conversionRateByMatchQuality: Record<string, number>;
  agentUtilizationRate: number;
  routingEfficiencyScore: number; // 0-100
}

export interface QualityMetrics {
  agentId: string;
  period: { start: Date; end: Date };
  totalAssignments: number;
  avgMatchQuality: number; // 0-100
  conversionRate: number;
  avgHandlingTime: number;
  customerSatisfaction: number;
  repeatCustomerRate: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
}

export interface StrategyComparison {
  strategy1: { name: string; metrics: RoutingMetrics };
  strategy2: { name: string; metrics: RoutingMetrics };
  improvementAreas: string[];
  winner?: string;
  confidence: number;
}

export interface MatchQuality {
  leadTier: LeadTier;
  agentTier: AgentTier;
  specializationMatch: number;
  conversionRate: number;
  avgHandlingTime: number;
  sampleSize: number;
}

export interface Improvement {
  category: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  estimatedImprovement: string;
}

// ========================================
// A/B TESTING TYPES
// ========================================

export interface ExperimentConfig {
  name: string;
  strategyType: RoutingStrategy;
  description: string;
  trafficPercentage: number; // 0-100
  startDate: Date;
  endDate?: Date;
  controlStrategyId?: string;
  successMetric: 'conversion_rate' | 'avg_handling_time' | 'sla_compliance' | 'customer_satisfaction';
  minSampleSize: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
}

export interface Experiment {
  id: string;
  config: ExperimentConfig;
  status: 'active' | 'paused' | 'completed' | 'archived';
  variants: ExperimentVariant[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  strategy: RoutingStrategy;
  parameters: Record<string, unknown>;
  trafficAllocation: number; // 0-100
  metrics: VariantMetrics;
}

export interface VariantMetrics {
  totalLeads: number;
  conversions: number;
  conversionRate: number;
  avgHandlingTime: number;
  slaCompliance: number;
  customerSatisfaction: number;
  statisticalSignificance?: number;
}

export interface ExperimentMetrics {
  experimentId: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  totalLeads: number;
  variants: VariantMetrics[];
  statisticalTest?: StatisticalTestResult;
}

export interface StatisticalTestResult {
  testType: 'z_test' | 't_test' | 'chi_square';
  pValue: number;
  isSignificant: boolean;
  confidenceInterval: { lower: number; upper: number };
  winner?: string;
  margin: number;
}

export interface WinnerAnalysis {
  experimentId: string;
  winner: string;
  runnerUp?: string;
  winningMargin: number;
  confidence: number;
  recommendation: 'promote' | 'continue' | 'inconclusive';
  risks: string[];
  nextSteps: string[];
}

// ========================================
// ROUTING HISTORY & EVENTS
// ========================================

export interface LeadRoutingHistory {
  id: string;
  leadId: string;
  assignedAgentId: string;
  routingStrategy: RoutingStrategy;
  leadScore: number;
  assignmentReason: AssignmentReason;
  routingTimestamp: Date;
  assignmentDurationHours?: number;
  conversionOutcome?: boolean;
  assignmentQualityScore?: number;
  feedback?: string;
  createdAt: Date;
}

export interface RoutingEvent {
  id: string;
  leadId: string;
  eventType: RoutingEventType;
  agentId?: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface GetLeadScoreRequest {
  leadId: string;
}

export interface GetLeadScoreResponse {
  leadId: string;
  score: number;
  tier: LeadTier;
  factors: ScoreFactor[];
  slaStatus: SLAStatus;
  createdAt: Date;
}

export interface RescoreLeadsResponse {
  totalLeadsRescored: number;
  avgScoreChange: number;
  tierChanges: {
    from: LeadTier;
    to: LeadTier;
    count: number;
  }[];
  timestamp: Date;
}

export interface UpdateAgentSpecializationRequest {
  agentId: string;
  specializations: Partial<AgentSpecialization>[];
}

export interface UpdateAgentStatusRequest {
  status: AgentStatus;
  maxCapacity?: number;
  currentLoad?: number;
}

export interface RouteLeadRequest {
  leadId: string;
  strategy?: RoutingStrategy;
  preferredAgentId?: string;
  force?: boolean;
}

export interface BatchRouteLeadsRequest {
  leadIds: string[];
  strategy: 'greedy' | 'optimal';
}

export interface RerouteLeadRequest {
  leadId: string;
  reason: string;
  preferredAgentId?: string;
}

export interface ProcessQueueRequest {
  queueType: QueueType;
  maxAssignments?: number;
}

export interface MoveLeadToQueueRequest {
  leadId: string;
  newQueueType: QueueType;
  reason: string;
}

export interface CreateExperimentRequest {
  config: ExperimentConfig;
  variants: Omit<ExperimentVariant, 'id' | 'metrics'>[];
}

export interface AssignLeadToVariantRequest {
  leadId: string;
  experimentId: string;
}

export interface PromoteWinnerRequest {
  experimentId: string;
  variantId: string;
}

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface RoutingConfig {
  leadScoringWeights: {
    conversionProbability: number;
    ltvPrediction: number;
    churnRisk: number;
    sourceQualityScore: number;
  };
  agentMatchingWeights: {
    specializationMatch: number;
    performanceScore: number;
    capacityUtilization: number;
    availabilityBonus: number;
  };
  queueSettings: {
    tier1MaxWaitHours: number;
    tier2MaxWaitHours: number;
    tier3MaxWaitHours: number;
    tier4MaxWaitHours: number;
  };
  slaThresholds: {
    warning: number; // percentage of time elapsed
    critical: number; // percentage of time elapsed
  };
  capacitySettings: {
    defaultMaxConcurrentLeads: number;
    eliteAgentMaxConcurrentLeads: number;
    capacityUtilizationTarget: number; // 0-100
  };
}
