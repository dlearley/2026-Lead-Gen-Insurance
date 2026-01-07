/**
 * Feature Store Types (Phase 16.3.3 - Predictive)
 * 
 * TypeScript definitions for the central feature repository
 * that serves ML features across the platform
 */

export type FeatureValue = number | string | boolean | Date | null;
export type FeatureType = 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'embedding';
export type EntityType = 'lead' | 'agent' | 'policy' | 'customer' | 'carrier' | 'campaign';

export interface FeatureMetadata {
  id?: string;
  description: string;
  featureType: FeatureType;
  entityType: EntityType;
  owner: string;  // Team/person responsible
  tags: string[];  // For discovery and categorization
  isPublic: boolean;  // Can be used by other teams
  isProductionReady: boolean;
  defaultValue?: FeatureValue;
  computationConfig: FeatureComputationConfig;
  freshnessRequirements: FreshnessRequirements;
  dataValidationRules: ValidationRule[];
  createdAt?: string;
  updatedAt?: string;
  version: string;
  dependencies: string[];  // Other features this depends on
  lineage: FeatureLineage[];
  statistics?: FeatureStatistics;
  backfillConfig?: BackfillConfig;
}

export interface FeatureComputationConfig {
  method: 'sql' | 'python' | 'graph' | 'api';  // How the feature is computed
  query?: string;  // SQL query or Python function name
  pythonFunction?: string;
  apiEndpoint?: string;
  cypherQuery?: string;  // For graph-based features
  parameters: Record<string, any>;
  executionMode: 'batch' | 'streaming' | 'on_demand';
  schedule?: string;  // Cron expression for batch features
  dependencies: string[];  // Upstream dependencies
}

export interface FreshnessRequirements {
  stalenessThresholdMinutes: number;  // How fresh the feature needs to be
  updateFrequencyMinutes: number;  // How often to recompute
  criticality: 'low' | 'medium' | 'high' | 'critical';  // Business impact
  fallbackStrategy: 'use_stale' | 'recompute_sync' | 'return_error';
}

export interface ValidationRule {
  ruleType: 'range' | 'domain' | 'custom';
  constraint: Record<string, any>;
  severity: 'error' | 'warning';
  description?: string;
}

export interface FeatureLineage {
  source: string;  // Table, API, or service name
  sourceType: 'table' | 'api' | 'stream' | 'model';
  transformation: string;  // Description of transformation applied
  timestamp: string;
  version: string;
}

export interface FeatureStatistics {
  computedAt: string;
  totalEntities: number;
  missingValuePercentage: number;
  cardinality: number;
  forNumeric?: NumericStatistics;
  forCategorical?: CategoricalStatistics;
  forDatetime?: DatetimeStatistics;
  distribution?: DistributionData;
}

export interface NumericStatistics {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  p95: number;
  p99: number;
  zeroCount: number;
  negativeCount: number;
  outlierCount: number;
  histogram: Bucket[];
}

export interface CategoricalStatistics {
  topValues: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
  uniqueCount: number;
  mostFrequent: string;
  entropy: number;
}

export interface DatetimeStatistics {
  earliest: string;
  latest: string;
  rangeDays: number;
  mostFrequentDayOfWeek: string;
  mostFrequentHour: number;
  seasonalPatterns?: any;
}

export interface DistributionData {
  histogram?: Bucket[];
  kde?: any;  // Kernel density estimation data
  empiricalCdf?: Array<[number, number]>;  // For numeric features
}

export interface Bucket {
  lowerBound: number;
  upperBound: number;
  count: number;
  percentage: number;
}

export interface BackfillConfig {
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  batchSize: number;
  parallelJobs: number;
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  retryableErrors: string[];
}

export interface FeatureSet {
  [featureName: string]: FeatureValue;
}

export interface FeatureValueRecord {
  id?: string;
  entityId: string;
  entityType: EntityType;
  featureName: string;
  featureType: FeatureType;
  value: FeatureValue;
  timestamp: string;  // When this feature value was computed
  eventTimestamp?: string;  // For event-based features
  version: string;
  dataSource: string;
  metadata?: Record<string, any>;
}

export interface GetFeaturesRequest {
  entityIds: string[];
  featureNames: string[];
  entityType: EntityType;
  asOfTimestamp?: string;  // For point-in-time correct features
  fromFeatureStore?: boolean;  // Get from online vs offline store
}

export interface GetFeaturesResponse {
  features: Record<string, FeatureSet>;  // entityId -> featureName -> value
  metadata: {
    requestId: string;
    computedAt: string;
    latencyMs: number;
    cacheHitRate: number;
    missingFeatures: string[];  // Features that couldn't be computed
    staleFeatures: Array<{
      featureName: string;
      stalenessMinutes: number;
    }>;
  };
}

export interface BatchFeatureRequest {
  requests: GetFeaturesRequest[];
  parallel: boolean;
  maxParallelism?: number;
}

export interface BatchFeatureResponse {
  results: Array<{
    request: GetFeaturesRequest;
    response: GetFeaturesResponse;
    error?: string;
  }>;
  batchId: string;
  processedAt: string;
  totalRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
}

export interface StoreFeaturesRequest {
  entityId: string;
  entityType: EntityType;
  featureSet: FeatureSet;
  eventTimestamp?: string;
  version?: string;
}

export interface StoreFeaturesResponse {
  success: boolean;
  storedCount: number;
  entityId: string;
  entityType: EntityType;
  timestamp: string;
}

export interface FeatureHistoryRequest {
  entityId: string;
  featureName: string;
  entityType: EntityType;
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
}

export interface FeatureHistoryResponse {
  entityId: string;
  featureName: string;
  history: Array<{
    timestamp: string;
    value: FeatureValue;
    eventTimestamp?: string;
    version: string;
  }>;
  metadata: {
    totalRecords: number;
    rangeStart?: string;
    rangeEnd?: string;
    hasMore: boolean;
  };
}

export interface FeatureEngineeringConfig {
  entityType: EntityType;
  leadIds?: string[];
  agentIds?: string[];
  policyIds?: string[];
  customerIds?: string[];
  carrierIds?: string[];
  campaignIds?: string[];
  includeGraphFeatures?: boolean;
  includeTemporalFeatures?: boolean;
  includeAggregations?: boolean;
  featureWindowDays?: number;
  customTransformations?: Array<{
    name: string;
    script: string;  // Inlined transformation code
    outputFeatures: string[];
  }>;
  labelColumn?: string;  // For training datasets
}

export interface FeatureEngineeringResult {
  config: FeatureEngineeringConfig;
  generatedFeatures: {
    totalFeatures: number;
    featuresByType: Record<FeatureType, number>;
    sampleFeatures: FeatureValueRecord[];
  };
  processingStats: {
    entitiesProcessed: number;
    featuresComputed: number;
    errors: number;
    durationSeconds: number;
    averageLatencyMs: number;
  };
  dataQualityReport: DataQualityReport;
  outputLocation?: string;  // For large datasets
  schema: FeatureSet;
}

export interface DataQualityReport {
  entityCount: number;
  missingValueSummary: {
    total: number;
    byFeature: Record<string, number>;
    byEntity: Record<string, number>;
  };
  outlierSummary: {
    total: number;
    byFeature: Record<string, number>;
  };
  duplicates: {
    entityDuplicates: number;
    featureDuplicates: number;
  };
  validationErrors: Array<{
    featureName: string;
    entityId: string;
    rule: string;
    severity: 'error' | 'warning';
  }>;
  dataFreshness: {
    staleFeatures: number;
    averageStalenessMinutes: number;
    freshPercentage: number;
  };
}

export interface FeatureDependencies {
  [featureName: string]: {
    dependsOn: string[];
    usedBy: string[];
    upstreamLatencyMs: number;
    downstreamFeatures: string[];
  };
}

export interface FeatureSearchRequest {
  query?: string;  // Full-text search across name, description, tags
  entityType?: EntityType;
  featureType?: FeatureType;
  tags?: string[];
  owner?: string;
  isProductionReady?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface FeatureSearchResponse {
  results: FeatureMetadata[];
  total: number;
  filters: {
    query?: string;
    entityType?: EntityType;
    featureType?: FeatureType;
    tags?: string[];
  };
}

export interface FeatureUsageStats {
  featureName: string;
  requestsLast24h: number;
  requestsLast7d: number;
  requestsLast30d: number;
  averageLatencyMs: number;
  cacheHitRate: number;
  consumerCount: number;
  consumers: string[];  // Names of services/models using this feature
  lastRequestedAt: string;
  dataFreshnessPercentage: number;
}

export interface FeatureGovernance {
  featureName: string;
  owner: string;
  reviewers: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  complianceTags: string[];  // PII, GDPR, CCPA, etc.
  retentionPolicy?: {
    durationDays: number;
    anonymizeAfterDays?: number;
  };
  accessControl: {
    allowedRoles: string[];
    allowedServices: string[];
  };
}

export interface FeatureVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  changeDescription: string;
  breakingChange: boolean;
  schemaDiff?: {
    addedFeatures: string[];
    removedFeatures: string[];
    modifiedFeatures: Array<{
      name: string;
      oldType: string;
      newType: string;
    }>;
  };
  statistics?: FeatureStatistics;
  validationResults?: ValidationResults;
}

export interface ValidationResults {
  validationDate: string;
  passed: boolean;
  errors: Array<{
    entityId: string;
    featureName: string;
    rule: string;
    actualValue: any;
    expectedConstraint: any;
  }>;
  warnings: Array<{
    entityId: string;
    featureName: string;
    rule: string;
    actualValue: any;
    message: string;
  }>;
}

export interface FeatureStoreHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    redis: 'connected' | 'disconnected' | 'error';
    postgres: 'connected' | 'disconnected' | 'error';
    neo4j: 'connected' | 'disconnected' | 'error' | 'not_configured';
    featureStore: 'online' | 'offline' | 'error';
  };
  metrics: {
    totalFeatures: number;
    entitiesServedLast24h: number;
    averageLatencyMs: number;
    cacheHitRate: number;
    staleFeaturePercentage: number;
  };
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    component: string;
    timestamp: string;
  }>;
}

export interface FeatureBackfillJob {
  jobId: string;
  featureName: string;
  entityType: EntityType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  entitiesProcessed: number;
  entitiesTotal: number;
  errorsCount: number;
  estimatedCompletionAt?: string;
  progressPercentage: number;
}

export interface FeatureStoreOperations {
  // Feature metadata management
  registerFeature(metadata: FeatureMetadata): Promise<FeatureMetadata>;
  updateFeature(name: string, updates: Partial<FeatureMetadata>): Promise<FeatureMetadata>;
  getFeatureMetadata(name: string): Promise<FeatureMetadata | null>;
  searchFeatures(request: FeatureSearchRequest): Promise<FeatureSearchResponse>;
  listFeatures(entityType?: EntityType): Promise<FeatureMetadata[]>;
  
  // Feature value operations
  getFeatures(request: GetFeaturesRequest): Promise<GetFeaturesResponse>;
  getFeaturesBatch(request: BatchFeatureRequest): Promise<BatchFeatureResponse>;
  storeFeatures(request: StoreFeaturesRequest): Promise<StoreFeaturesResponse>;
  getFeatureHistory(request: FeatureHistoryRequest): Promise<FeatureHistoryResponse>;
  
  // Feature engineering
  engineerFeatures(config: FeatureEngineeringConfig): Promise<FeatureEngineeringResult>;
  getGraphFeatures(entityId: string, entityType?: EntityType): Promise<FeatureSet>;
  
  // Caching management
  clearCache(entityId?: string, entityType?: EntityType): Promise<void>;
  clearFeatureCache(featureName: string): Promise<void>;
  
  // Analytics and monitoring
  getFeatureUsageStats(featureName: string): Promise<FeatureUsageStats>;
  getFeatureDependencies(featureName: string): Promise<FeatureDependencies>;
  healthCheck(): Promise<FeatureStoreHealth>;
  
  // Backfill and maintenance
  triggerBackfill(featureName: string, config: BackfillConfig): Promise<FeatureBackfillJob>;
  getBackfillJob(jobId: string): Promise<FeatureBackfillJob>;
  
  // Quality and validation
  validateFeatureData(featureName: string, entityIds?: string[]): Promise<ValidationResults>;
  generateDataQualityReport(entityIds?: string[]): Promise<DataQualityReport>;
}