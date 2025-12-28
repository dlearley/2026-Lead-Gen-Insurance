// ========================================
// PREDICTIVE MAINTENANCE TYPES
// Phase 11.3: Customer Success - Predictive Maintenance
// ========================================

// ========================================
// CUSTOMER HEALTH SCORING TYPES
// ========================================

export type ChurnRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ScoreTrend = 'DECLINING' | 'STABLE' | 'IMPROVING';

export interface CustomerHealthScore {
  id: string;
  customerId: string;
  overallScore: number; // 0-100
  lastCalculated: Date;
  previousScore?: number;
  scoreChange?: number; // Change from previous score
  calculationVersion: string;
  churnRisk: ChurnRiskLevel;
  churnProbability: number; // 0.0 to 1.0
  riskFactors?: Record<string, unknown>;
  recommendedActions: string[];
  autoTriggerActions: string[];
  scoringCategories?: Record<string, unknown>; // Detailed category scores
  engagementScore?: number; // 0-100
  satisfactionScore?: number; // 0-100
  usageScore?: number; // 0-100
  supportScore?: number; // 0-100
  financialScore?: number; // 0-100
  trend: ScoreTrend;
  nextReviewDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerHealthScoreInput {
  customerId: string;
  engagementData: CustomerEngagementData;
  satisfactionData: CustomerSatisfactionData;
  usageData: CustomerUsageData;
  supportData: CustomerSupportData;
  financialData: CustomerFinancialData;
}

export interface CustomerEngagementData {
  lastLoginDaysAgo: number;
  emailOpenRate: number; // percentage
  emailClickRate: number; // percentage
  portalVisits30d: number;
  documentViews30d: number;
  messagesExchanged30d: number;
  averageSessionDuration: number; // seconds
  preferredCommunicationChannel?: string;
}

export interface CustomerSatisfactionData {
  lastSurveyDate?: Date;
  satisfactionScore?: number; // 0-100
  npsScore?: number; // -100 to 100
  complaintCount30d: number;
  complimentCount30d: number;
  supportTickets30d: number;
  supportTicketsResolved30d: number;
}

export interface CustomerUsageData {
  policyCount: number;
  activePolicyCount: number;
  claimsFiled30d: number;
  quotesRequested30d: number;
  policyChangesRequested30d: number;
  renewalRate: number; // percentage
}

export interface CustomerSupportData {
  averageResponseTimeHours: number;
  escalations30d: number;
  repeatContactRate: number; // percentage
  satisfactionRating: number; // 0-100
  pendingTickets: number;
  ticketsTrend: number; // percentage change vs last period
}

export interface CustomerFinancialData {
  lifetimeValue: number;
  policyPremiumTotal: number;
  paymentDelinquencies30d: number;
  paymentFailures30d: number;
  claimsTotalPaid: number;
  profitabilityScore: number; // 0-100
}

export interface HealthScoreCalculationResult {
  overallScore: number;
  componentScores: {
    engagement: number;
    satisfaction: number;
    usage: number;
    support: number;
    financial: number;
  };
  riskFactors: string[];
  recommendedActions: string[];
  autoTriggerActions: string[];
  churnRisk: ChurnRiskLevel;
  churnProbability: number;
  calculationVersion: string;
}

// ========================================
// INTERVENTION MANAGEMENT TYPES
// ========================================

export type InterventionType =
  | 'PROACTIVE_OUTREACH'
  | 'APPRECIATION_CALL'
  | 'RENEWAL_REMINDER'
  | 'POLICY_REVIEW'
  | 'PREMIUM_ANALYSIS'
  | 'CUSTOMER_FEEDBACK'
  | 'RELATIONSHIP_BUILDING'
  | 'EDUCATIONAL_TOUCHPOINT'
  | 'REFERRAL_REQUEST'
  | 'SPECIAL_OFFER'
  | 'SURVEY_INVITATION'
  | 'ACCOUNT_MANAGER_ASSIGNMENT'
  | 'SWOOP_SAVE';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type InterventionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DELAYED';

export interface CustomerIntervention {
  id: string;
  healthScoreId: string;
  customerId: string;
  interventionType: InterventionType;
  priority: PriorityLevel;
  status: InterventionStatus;
  title: string;
  description?: string;
  assignedTo?: string; // Agent or team member ID
  assignedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  notes?: string;
  outcome?: string;
  outcomeNotes?: string;
  cost?: number; // Resource cost of intervention
  effectivenessScore?: number; // 0-100
  triggerSource: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// PREDICTIVE ANALYTICS TYPES
// ========================================

export interface HealthScoreTrend {
  customerId: string;
  scores: Array<{
    date: Date;
    score: number;
    riskLevel: ChurnRiskLevel;
    trend: ScoreTrend;
  }>;
  averageScore: number;
  maxScore: number;
  minScore: number;
  improvements: number; // Count of periods with improvement
  declines: number; // Count of periods with decline
  stability: number; // 0-100, higher means more stable
}

export interface PredictiveHealthAnalytics {
  totalCustomers: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  averageScore: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    average: number; // 50-69
    poor: number; // 30-49
    atRisk: number; // 0-29
  };
  trendingValues: {
    improving: number;
    stable: number;
    declining: number;
  };
  interventionEfficacy: {
    totalInterventions: number;
    successfulInterventions: number;
    averageEffectiveness: number;
    mostEffectiveTypes: Array<{
      type: InterventionType;
      avgEffectiveness: number;
      count: number;
    }>;
  };
  predictionAccuracy?: {
    modelVersion: string;
    accuracyRate: number;
    predictionsMade: number;
    correctPredictions: number;
    falsePositives: number;
    falseNegatives: number;
  };
}

export interface RiskFactorAnalysis {
  topRiskFactors: Array<{
    factor: string;
    impact: number; // -100 to 100
    frequency: number; // How often this factor appears
    affectedCustomers: number;
  }>;
  highRiskPatterns: string[];
  recommendedSystemChanges: string[];
}

// ========================================
// INTERVENTION WORKFLOW TYPES
// ========================================

export interface InterventionWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerConditions: WorkflowTrigger[];
  actions: WorkflowAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  successRate: number;
  lastTriggered?: Date;
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  threshold: number;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  timeWindow?: number;
}

export type WorkflowTriggerType =
  | 'HEALTH_SCORE_CHANGE'
  | 'CHURN_RISK_INCREASE'
  | 'SCORE_DECLINE_RATE'
  | 'TIME_SINCE_LAST_ACTIVITY'
  | 'COMPONENT_SCORE_DROPS';

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export type WorkflowActionType =
  | 'CREATE_INTERVENTION'
  | 'ASSIGN_TO_AGENT'
  | 'SEND_NOTIFICATION'
  | 'SCHEDULE_FOLLOWUP'
  | 'UPDATE_CUSTOMER_STATUS'
  | 'TRIGGER_CAMPAIGN';

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  customerId: string;
  triggeredAt: Date;
  completedAt?: Date;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  actionsExecuted: Array<{
    actionType: WorkflowActionType;
    status: 'SUCCESS' | 'FAILED';
    result?: Record<string, unknown>;
  }>;
  error?: string;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface CalculateHealthScoreRequest {
  customerId: string;
  useAiPrediction?: boolean;
  overrideManualScore?: boolean;
  forceRecalculate?: boolean;
}

export interface CalculateHealthScoreResponse {
  healthScore: CustomerHealthScore;
  calculationResult: HealthScoreCalculationResult;
  createdNew: boolean;
}

export interface BatchHealthScoreRequest {
  customerIds: string[];
  includeHistoricalData?: boolean;
  calculateIfMissing?: boolean;
}

export interface BatchHealthScoreResponse {
  scores: CustomerHealthScore[];
  summary: {
    totalProcessed: number;
    newlyCalculated: number;
    failed: number;
    averageScore: number;
  };
}

export interface HealthScoreFilterParams {
  churnRiskLevels?: ChurnRiskLevel[];
  minScore?: number;
  maxScore?: number;
  trending?: ScoreTrend[];
  includeCustomerData?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateInterventionRequest {
  customerId: string;
  healthScoreId: string;
  interventionType: InterventionType;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  assignedTo?: string;
  dueDate?: Date;
  triggerSource: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateInterventionRequest {
  status?: InterventionStatus;
  outcome?: string;
  outcomeNotes?: string;
  notes?: string;
  effectivenessScore?: number;
  assignedTo?: string;
  completedAt?: Date;
}

export interface InterventionFilterParams {
  customerId?: string;
  healthScoreId?: string;
  interventionType?: InterventionType[];
  status?: InterventionStatus[];
  priority?: PriorityLevel[];
  assignedTo?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  outcome?: string[];
  page?: number;
  limit?: number;
}

export interface PredictiveAnalyticsDashboard {
  healthMetrics: PredictiveHealthAnalytics;
  trendAnalysis: RiskFactorAnalysis;
  workflowPerformance: {
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    automatedSaves: number; // Customers saved by automatic intervention
  };
  recommendations: string[];
}

export interface InterventionsDashboard {
  openInterventions: CustomerIntervention[];
  summary: {
    totalOpen: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    byPriority: Record<PriorityLevel, number>;
    byStatus: Record<InterventionStatus, number>;
  };
  effectiveness: {
    completionRate: number;
    averageEffectiveness: number;
    topPerformingTypes: Array<{
      type: InterventionType;
      avgScore: number;
      count: number;
    }>;
  };
  assignedToMe?: CustomerIntervention[];
}

export interface AutoTriggerConfig {
  enabled: boolean;
  riskThreshold: ChurnRiskLevel;
  scoreThreshold: number;
  maxConcurrentInterventions: number;
  coolDownPeriodDays: number;
  triggerActions: InterventionType[];
  exclusionRules: string[];
  notifyOnTrigger: boolean;
  assignToRoles: string[];
  escalationRules: {
    afterHours: number;
    escalationAction: WorkflowActionType;
    escalationTarget: string;
  };
}