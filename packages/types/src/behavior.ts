// ========================================
// BEHAVIOR TRACKING TYPES
// ========================================

export type BehaviorEventType = 
  | 'page_view'
  | 'form_start'
  | 'form_submit'
  | 'form_abandon'
  | 'email_open'
  | 'email_click'
  | 'email_reply'
  | 'phone_call'
  | 'text_interaction'
  | 'social_share'
  | 'download'
  | 'video_play'
  | 'scroll_depth'
  | 'time_on_page'
  | 'click_outbound'
  | 'search_query'
  | 'filter_usage'
  | 'quote_request'
  | 'application_start'
  | 'application_complete';

export type BehaviorCategory = 
  | 'engagement'
  | 'interest'
  | 'intent'
  | 'conversion'
  | 'retention'
  | 'advocacy';

export interface BehaviorEvent {
  id: string;
  leadId?: string;
  sessionId: string;
  userId?: string;
  eventType: BehaviorEventType;
  category: BehaviorCategory;
  timestamp: Date;
  source: string;
  page?: {
    url: string;
    title: string;
    referrer?: string;
  };
  properties: Record<string, unknown>;
  context?: {
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    device?: string;
    browser?: string;
    os?: string;
  };
  value?: number;
  metadata?: Record<string, unknown>;
}

// ========================================
// BEHAVIORAL SEGMENTATION TYPES
// ========================================

export type SegmentType = 'static' | 'dynamic' | 'behavioral';
export type SegmentStatus = 'active' | 'inactive' | 'draft';

export interface BehavioralSegment {
  id: string;
  name: string;
  description?: string;
  type: SegmentType;
  status: SegmentStatus;
  criteria: BehavioralCriteria;
  leadCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastCalculated?: Date;
  isPublic: boolean;
  tags: string[];
}

export interface BehavioralCriteria {
  timeRange?: {
    start: Date;
    end: Date;
  };
  eventFilters: EventFilter[];
  frequencyFilters: FrequencyFilter[];
  sequenceFilters: SequenceFilter[];
  aggregationFilters: AggregationFilter[];
  logicOperator: 'AND' | 'OR';
}

export interface EventFilter {
  eventType: BehaviorEventType;
  category?: BehaviorCategory;
  source?: string;
  minFrequency?: number;
  maxFrequency?: number;
  properties?: Record<string, unknown>;
  timeWindow?: {
    duration: number; // in minutes
    within: number; // within this time window
  };
}

export interface FrequencyFilter {
  eventTypes: BehaviorEventType[];
  minCount: number;
  maxCount?: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SequenceFilter {
  steps: Array<{
    eventType: BehaviorEventType;
    delay?: number; // delay in minutes
    within?: number; // within this time window
  }>;
  strict: boolean; // true for exact sequence, false for partial
}

export interface AggregationFilter {
  metric: 'total_events' | 'unique_events' | 'session_count' | 'time_spent' | 'conversion_rate';
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
  eventTypes?: BehaviorEventType[];
}

// ========================================
// PERSONALIZATION TYPES
// ========================================

export type PersonalizationType = 
  | 'content'
  | 'offer'
  | 'message'
  | 'cta'
  | 'timing'
  | 'channel';

export type PersonalizationStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface PersonalizationRule {
  id: string;
  name: string;
  description?: string;
  type: PersonalizationType;
  status: PersonalizationStatus;
  priority: number;
  targetSegments: string[];
  conditions: PersonalizationCondition[];
  actions: PersonalizationAction[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isActive: boolean;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface PersonalizationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
  logicOperator?: 'AND' | 'OR';
}

export interface PersonalizationAction {
  id: string;
  type: PersonalizationType;
  template: string;
  variables: Record<string, unknown>;
  delay?: number; // in minutes
  channel?: 'email' | 'sms' | 'push' | 'web' | 'phone';
}

export interface PersonalizationContext {
  leadId: string;
  sessionId: string;
  currentPage?: string;
  recentEvents: BehaviorEvent[];
  segmentIds: string[];
  availableRules: PersonalizationRule[];
  triggeredActions: PersonalizationAction[];
}

// ========================================
// A/B TESTING TYPES
// ========================================

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type ExperimentType = 'content' | 'offer' | 'layout' | 'timing' | 'channel';

export interface BehaviorExperiment {
  id: string;
  name: string;
  description?: string;
  type: ExperimentType;
  status: ExperimentStatus;
  hypothesis: string;
  successMetrics: string[];
  targetSegments: string[];
  trafficAllocation: TrafficAllocation;
  variants: ExperimentVariant[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface TrafficAllocation {
  total: number; // percentage 0-100
  variants: Array<{
    variantId: string;
    percentage: number;
  }>;
  allocationMethod: 'random' | 'segment_based' | 'behavior_based';
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  content: Record<string, unknown>;
  isControl: boolean;
  trafficPercentage: number;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  metrics: ExperimentMetrics;
  statisticalSignificance: StatisticalSignificance;
  confidenceLevel: number;
  sampleSize: number;
  conversionRate: number;
  generatedAt: Date;
}

export interface ExperimentMetrics {
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  timeOnPage: number;
  bounceRate: number;
  customMetrics: Record<string, number>;
}

export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  zScore: number;
  effectSize: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// ========================================
// BEHAVIORAL TRIGGERS TYPES
// ========================================

export type TriggerEvent = 
  | 'high_engagement'
  | 'low_engagement'
  | 'form_abandon'
  | 'email_engagement'
  | 'price_view'
  | 'application_start'
  | 'time_based'
  | 'sequence_complete'
  | 'segment_enter'
  | 'segment_exit';

export type TriggerAction = 
  | 'send_email'
  | 'send_sms'
  | 'assign_agent'
  | 'create_task'
  | 'add_to_segment'
  | 'remove_from_segment'
  | 'update_score'
  | 'send_notification'
  | 'trigger_workflow';

export type TriggerStatus = 'active' | 'inactive' | 'paused';

export interface BehavioralTrigger {
  id: string;
  name: string;
  description?: string;
  event: TriggerEvent;
  status: TriggerStatus;
  conditions: TriggerCondition[];
  actions: TriggerActionConfig[];
  targetSegments: string[];
  cooldown: number; // in minutes
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastTriggered?: Date;
  triggerCount: number;
  metadata?: Record<string, unknown>;
}

export interface TriggerCondition {
  id: string;
  type: 'behavior' | 'time' | 'segment' | 'score';
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: unknown;
  logicOperator?: 'AND' | 'OR';
}

export interface TriggerActionConfig {
  id: string;
  action: TriggerAction;
  parameters: Record<string, unknown>;
  delay?: number; // in minutes
  conditions?: TriggerCondition[];
}

export interface TriggerExecution {
  id: string;
  triggerId: string;
  leadId: string;
  executedAt: Date;
  actions: Array<{
    actionId: string;
    status: 'success' | 'failed' | 'skipped';
    result?: unknown;
    error?: string;
  }>;
  context: Record<string, unknown>;
}

// ========================================
// ANALYTICS & INSIGHTS TYPES
// ========================================

export interface BehaviorAnalytics {
  leadId: string;
  sessionId: string;
  totalEvents: number;
  uniqueEventTypes: number;
  totalTimeSpent: number;
  averageSessionDuration: number;
  engagementScore: number;
  interestScore: number;
  intentScore: number;
  conversionProbability: number;
  segments: string[];
  recentEvents: BehaviorEvent[];
  behaviorPattern: string;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BehaviorInsights {
  leadId: string;
  insights: Array<{
    id: string;
    type: 'pattern' | 'anomaly' | 'opportunity' | 'risk';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number;
    recommendation?: string;
    data: Record<string, unknown>;
    createdAt: Date;
  }>;
  generatedAt: Date;
}

export interface CohortAnalysis {
  cohortType: 'signup' | 'first_event' | 'first_conversion';
  period: 'day' | 'week' | 'month';
  cohorts: Array<{
    cohortId: string;
    period: string;
    size: number;
    retentionRates: number[];
    conversionRates: number[];
    averageRevenue: number;
  }>;
  generatedAt: Date;
}

export interface FunnelAnalysis {
  name: string;
  steps: Array<{
    stepId: string;
    name: string;
    eventType: BehaviorEventType;
    count: number;
    rate: number;
    dropoffRate: number;
    averageTime: number;
  }>;
  totalUsers: number;
  overallConversionRate: number;
  generatedAt: Date;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface TrackBehaviorEventRequest {
  eventType: BehaviorEventType;
  category: BehaviorCategory;
  properties?: Record<string, unknown>;
  context?: Partial<BehaviorEvent['context']>;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface GetBehaviorAnalyticsRequest {
  leadId?: string;
  sessionId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeEvents?: boolean;
}

export interface CreateSegmentRequest {
  name: string;
  description?: string;
  type: SegmentType;
  criteria: BehavioralCriteria;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateSegmentRequest {
  name?: string;
  description?: string;
  criteria?: BehavioralCriteria;
  status?: SegmentStatus;
  isPublic?: boolean;
  tags?: string[];
}

export interface CreatePersonalizationRuleRequest {
  name: string;
  description?: string;
  type: PersonalizationType;
  priority: number;
  targetSegments: string[];
  conditions: PersonalizationCondition[];
  actions: PersonalizationAction[];
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}

export interface CreateExperimentRequest {
  name: string;
  description?: string;
  type: ExperimentType;
  hypothesis: string;
  successMetrics: string[];
  targetSegments: string[];
  trafficAllocation: TrafficAllocation;
  variants: Omit<ExperimentVariant, 'id'>[];
  metadata?: Record<string, unknown>;
}

export interface CreateTriggerRequest {
  name: string;
  description?: string;
  event: TriggerEvent;
  conditions: TriggerCondition[];
  actions: TriggerActionConfig[];
  targetSegments: string[];
  cooldown: number;
  priority: number;
}

// ========================================
// RESPONSE TYPES
// ========================================

export interface BehaviorAnalyticsResponse {
  analytics: BehaviorAnalytics;
  insights: BehaviorInsights;
  segments: BehavioralSegment[];
  activeRules: PersonalizationRule[];
}

export interface SegmentListResponse {
  segments: BehavioralSegment[];
  total: number;
  page: number;
  limit: number;
}

export interface PersonalizationRulesResponse {
  rules: PersonalizationRule[];
  total: number;
  page: number;
  limit: number;
}

export interface ExperimentResultsResponse {
  experiments: BehaviorExperiment[];
  results: ExperimentResult[];
  total: number;
}

export interface TriggerListResponse {
  triggers: BehavioralTrigger[];
  executions: TriggerExecution[];
  total: number;
}

export interface AnalyticsDashboardResponse {
  behavior: {
    totalEvents: number;
    uniqueUsers: number;
    averageEngagement: number;
    topEvents: Array<{
      eventType: BehaviorEventType;
      count: number;
      percentage: number;
    }>;
    segments: {
      total: number;
      active: number;
      totalMembers: number;
    };
  };
  personalization: {
    activeRules: number;
    runningExperiments: number;
    triggeredActions: number;
    successRate: number;
  };
  triggers: {
    activeTriggers: number;
    executionsToday: number;
    successRate: number;
  };
  trends: {
    engagementTrend: Array<{ date: string; score: number }>;
    conversionTrend: Array<{ date: string; rate: number }>;
    segmentGrowth: Array<{ date: string; members: number }>;
  };
}