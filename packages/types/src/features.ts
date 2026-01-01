// ========================================
// FEATURE STORE TYPES
// ========================================

export type FeatureType =
  | 'behavioral'
  | 'demographic'
  | 'temporal'
  | 'nlp'
  | 'competitive'
  | 'firmographic';

export type FeatureDataType =
  | 'numeric'
  | 'categorical'
  | 'boolean'
  | 'string'
  | 'array'
  | 'json';

export type FeatureStoreType = 'online' | 'offline' | 'both';

export type FeatureQualityLevel = 'high' | 'medium' | 'low';

export interface FeatureMetadata {
  name: string;
  description: string;
  category: FeatureType;
  dataType: FeatureDataType;
  storeType: FeatureStoreType;
  quality: FeatureQualityLevel;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
  dependencies: string[];
  source: string;
  ttl?: number; // Time-to-live in seconds for online features
  retentionDays?: number;
  documentationUrl?: string;
}

export interface FeatureValue {
  value: unknown;
  timestamp: Date;
  version: string;
}

export interface FeatureSet {
  name: string;
  description: string;
  features: string[];
  version: string;
  createdAt: Date;
  createdBy?: string;
  tags: string[];
}

export interface FeatureRequest {
  entityId: string;
  entityName: string;
  featureNames: string[];
  features?: Record<string, FeatureValue>;
  timestamp?: Date;
}

export interface FeatureResponse {
  entityId: string;
  entityName: string;
  features: Record<string, FeatureValue>;
  metadata: {
    fetchedAt: Date;
    storeType: FeatureStoreType;
    version: string;
  };
}

export interface FeatureBatchRequest {
  entityIds: string[];
  entityName: string;
  featureNames: string[];
  timestamp?: Date;
}

export interface FeatureBatchResponse {
  features: Record<string, FeatureResponse>;
  metadata: {
    fetchedAt: Date;
    totalEntities: number;
    successful: number;
    failed: number;
  };
}

// ========================================
// FEATURE VALIDATION TYPES
// ========================================

export interface FeatureValidationRule {
  featureName: string;
  ruleName: string;
  ruleType: 'range' | 'regex' | 'enum' | 'custom';
  configuration: Record<string, unknown>;
  severity: 'error' | 'warning' | 'info';
}

export interface FeatureValidationResult {
  featureName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  validatedAt: Date;
}

export interface FeatureQualityReport {
  featureName: string;
  completeness: number; // 0-100
  accuracy: number; // 0-100
  consistency: number; // 0-100
  timeliness: number; // 0-100
  validity: number; // 0-100
  uniqueness: number; // 0-100
  overallQuality: number; // 0-100
  totalRecords: number;
  nullRecords: number;
  duplicateRecords: number;
  outlierRecords: number;
  generatedAt: Date;
}

// ========================================
// FEATURE ENGINEERING TYPES
// ========================================

export interface FeatureEngineeringConfig {
  behavioral: BehavioralFeatureConfig;
  demographic: DemographicFeatureConfig;
  temporal: TemporalFeatureConfig;
  nlp: NLPFeatureConfig;
  competitive: CompetitiveFeatureConfig;
  firmographic: FirmographicFeatureConfig;
}

export interface BehavioralFeatureConfig {
  enabled: boolean;
  features: string[];
  windows: string[]; // e.g., '1d', '7d', '30d'
  aggregationMethods: string[];
}

export interface DemographicFeatureConfig {
  enabled: boolean;
  features: string[];
  enrichmentSources: string[];
}

export interface TemporalFeatureConfig {
  enabled: boolean;
  features: string[];
  timeZones: string[];
  businessHoursOnly: boolean;
}

export interface NLPFeatureConfig {
  enabled: boolean;
  features: string[];
  languages: string[];
  models: string[];
  confidenceThreshold: number;
}

export interface CompetitiveFeatureConfig {
  enabled: boolean;
  features: string[];
  competitors: string[];
  marketSegments: string[];
}

export interface FirmographicFeatureConfig {
  enabled: boolean;
  features: string[];
  enrichmentSources: string[];
}

// ========================================
// DATA PIPELINE TYPES
// ========================================

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

export type PipelineType =
  | 'extraction'
  | 'transformation'
  | 'feature_engineering'
  | 'data_quality'
  | 'full';

export interface PipelineJob {
  id: string;
  name: string;
  type: PipelineType;
  status: PipelineStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  error?: string;
  metadata?: Record<string, unknown>;
  logs: PipelineLog[];
}

export interface PipelineLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown>;
}

export interface PipelineConfig {
  name: string;
  type: PipelineType;
  schedule?: string; // Cron expression
  enabled: boolean;
  source: DataSource;
  destination: DataSource;
  transformations: TransformationStep[];
  qualityChecks: DataQualityCheck[];
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  batchSize: number;
}

export interface DataSource {
  type: 'database' | 'api' | 'file' | 'stream' | 'warehouse';
  connection: string;
  table?: string;
  query?: string;
  format?: string;
}

export interface TransformationStep {
  name: string;
  type: string;
  configuration: Record<string, unknown>;
  order: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ========================================
// DATA QUALITY TYPES
// ========================================

export type DataQualityCheckType =
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'consistency'
  | 'timeliness'
  | 'accuracy'
  | 'range'
  | 'pattern'
  | 'custom';

export interface DataQualityCheck {
  id: string;
  name: string;
  type: DataQualityCheckType;
  table: string;
  column: string;
  configuration: Record<string, unknown>;
  threshold: number; // Pass threshold (0-100)
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DataQualityResult {
  checkId: string;
  checkName: string;
  type: DataQualityCheckType;
  passed: boolean;
  score: number; // 0-100
  expected: number;
  actual: number;
  recordsChecked: number;
  recordsFailed: number;
  failedRecords?: string[]; // Sample of failed record IDs
  timestamp: Date;
  message?: string;
}

export interface DataQualityReport {
  reportId: string;
  generatedAt: Date;
  table: string;
  overallScore: number; // 0-100
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  totalRecords: number;
  results: DataQualityResult[];
  trends: QualityTrend[];
  recommendations: string[];
}

export interface QualityTrend {
  checkName: string;
  scores: number[];
  dates: Date[];
  direction: 'improving' | 'declining' | 'stable';
}

// ========================================
// FEATURE LINEAGE TYPES
// ========================================

export interface FeatureLineage {
  featureName: string;
  version: string;
  upstreamFeatures: string[];
  downstreamFeatures: string[];
  sourceData: DataSourceInfo[];
  transformations: TransformationInfo[];
  createdBy: string;
  createdAt: Date;
  modifiedBy: string;
  modifiedAt: Date;
}

export interface DataSourceInfo {
  type: string;
  name: string;
  query?: string;
  lastUpdated: Date;
}

export interface TransformationInfo {
  step: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ========================================
// FEATURE MONITORING TYPES
// ========================================

export interface FeatureDriftMetric {
  featureName: string;
  currentDistribution: DistributionStats;
  referenceDistribution: DistributionStats;
  driftScore: number; // 0-1, higher means more drift
  driftType: 'none' | 'low' | 'medium' | 'high' | 'severe';
  pValue?: number;
  timestamp: Date;
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  histogram?: {
    bins: number[];
    counts: number[];
  };
}

export interface FeatureStatistics {
  featureName: string;
  dataType: FeatureDataType;
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  numericStats?: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
  categoricalStats?: {
    valueCounts: Record<string, number>;
    topValues: Array<{ value: string; count: number }>;
  };
  lastUpdated: Date;
}

// ========================================
// FEATURE VERSIONING TYPES
// ========================================

export interface FeatureVersion {
  featureName: string;
  version: string;
  description: string;
  definition: FeatureDefinition;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  deprecatedAt?: Date;
  deprecationReason?: string;
  replacedByVersion?: string;
}

export interface FeatureDefinition {
  type: FeatureDataType;
  default: unknown;
  nullable: boolean;
  validation?: FeatureValidationRule[];
  transformation?: string;
  dependencies: string[];
}

// ========================================
// FEATURE GOVERNANCE TYPES
// ========================================

export type AccessLevel = 'public' | 'internal' | 'restricted' | 'confidential';

export interface FeatureAccessControl {
  featureName: string;
  accessLevel: AccessLevel;
  allowedRoles: string[];
  allowedUsers: string[];
  auditLog: AccessLogEntry[];
}

export interface AccessLogEntry {
  userId: string;
  userRole: string;
  action: 'read' | 'write' | 'delete';
  timestamp: Date;
  success: boolean;
  reason?: string;
}

export interface DataGovernancePolicy {
  id: string;
  name: string;
  description: string;
  type: 'retention' | 'privacy' | 'quality' | 'access';
  scope: string[]; // Feature names or patterns
  configuration: Record<string, unknown>;
  enabled: boolean;
  enforcedAt: Date;
  createdBy: string;
}

// ========================================
// SPECIFIC FEATURE TYPES
// ========================================

// Behavioral Features
export interface BehavioralFeatures {
  emailOpensCount: number;
  emailClicksCount: number;
  emailOpensLast7d: number;
  emailClicksLast7d: number;
  pageViewsCount: number;
  timeOnSiteAvg: number;
  sessionCount: number;
  sessionDurationAvg: number;
  scrollDepthAvg: number;
  formCompletionsCount: number;
  demoRequestsCount: number;
  loginFrequency: number;
  lastLoginDays: number;
  searchQueriesCount: number;
  contentDownloadsCount: number;
  videoWatchCount: number;
  videoWatchDurationTotal: number;
  mobileSessionRatio: number;
  desktopSessionRatio: number;
  featureAdoptionScore: number;
  engagementVelocity7d: number;
  engagementVelocity30d: number;
  peakEngagementHour: number;
  peakEngagementDay: number;
  timeSinceLastInteraction: number;
  interactionDiversityScore: number;
  repeatInteractionRate: number;
  bounceRate: number;
  pagesPerSession: number;
  averageSessionDuration: number;
  channelEngagementMap: Record<string, number>;
}

// Demographic & Firmographic Features
export interface DemographicFeatures {
  companySize: number;
  companyRevenue: number;
  industry: string;
  industryVertical: string;
  country: string;
  state: string;
  metroArea: string;
  timeZone: string;
  companyAge: number;
  growthStage: string;
  employeeCount: number;
  departmentSize: number;
  decisionMakerLevel: string;
  roleTitle: string;
  organizationalLevel: string;
  hiringTrendScore: number;
  fundingStage: string;
  totalFunding: number;
  lastFundingDate: Date;
  technologyStack: string[];
  hasCompetitorTech: boolean;
  integrationReadinessScore: number;
  budgetIndicators: string[];
}

// Temporal Features
export interface TemporalFeatures {
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
  quarter: number;
  year: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isBusinessHours: boolean;
  daysSinceLastActivity: number;
  daysSinceFirstActivity: number;
  activityCountLast1d: number;
  activityCountLast7d: number;
  activityCountLast30d: number;
  activityCountLast90d: number;
  activityVelocity1d: number;
  activityVelocity7d: number;
  activityVelocity30d: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: string;
  trend7d: number;
  trend30d: number;
  seasonalityIndex: number;
  timeSinceLeadCreation: number;
}

// NLP Features
export interface NLPFeatures {
  textLength: number;
  wordCount: number;
  sentenceCount: number;
  avgWordLength: number;
  sentimentScore: number;
  sentimentLabel: string;
  questionCount: number;
  urgencyKeywordsCount: number;
  buyingSignalKeywordsCount: number;
  competitorMentionsCount: number;
  competitorMentions: string[];
  painPointKeywordsCount: number;
  painPointKeywords: string[];
  topicDistribution: Record<string, number>;
  primaryTopic: string;
  intentLabel: string;
  intentConfidence: number;
  namedEntities: Array<{ text: string; label: string }>;
  complexityScore: number;
  formalityScore: number;
  tone: string;
  language: string;
}

// Competitive & Market Features
export interface CompetitiveFeatures {
  competitorMentions: string[];
  competitorMentionsCount: number;
  competitorWinHistory: Record<string, boolean>;
  competitorLossHistory: Record<string, boolean>;
  marketSegment: string;
  totalAddressableMarket: number;
  pricingTier: string;
  productFitScore: number;
  integrationEcosystemScore: number;
  verticalSpecificScore: number;
  marketShareIndicator: number;
  budgetAvailabilityScore: number;
  decisionTimelineScore: number;
  dealSizePotential: number;
  competitiveIntensity: number;
  marketPositionScore: number;
  valuePropositionMatch: number;
}
