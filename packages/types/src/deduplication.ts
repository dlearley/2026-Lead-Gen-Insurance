// ========================================
// DEDUPLICATION ENGINE TYPES
// ========================================

export type DeduplicationStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MatchAlgorithm = 
  | 'EXACT'
  | 'FUZZY'
  | 'ML'
  | 'HYBRID';

export type DeduplicationAction = 
  | 'MERGE'
  | 'SKIP'
  | 'FLAG'
  | 'REVIEW'
  | 'AUTO_RESOLVE';

export type DeduplicationRuleType = 
  | 'EXACT_MATCH'
  | 'FUZZY_MATCH'
  | 'PHONE_NORMALIZATION'
  | 'EMAIL_NORMALIZATION'
  | 'NAME_MATCHING'
  | 'ADDRESS_MATCHING'
  | 'CUSTOM_FUNCTION';

export type MatchConfidenceLevel = 
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNCERTAIN';

// ========================================
// FUZZY MATCHING ENGINE
// ========================================

export interface FuzzyMatchConfig {
  algorithm: MatchAlgorithm;
  weights: Record<string, number>;
  threshold: number;
  maxResults: number;
  enableML?: boolean;
  mlModelId?: string;
}

export interface FuzzyMatchResult {
  matchId: string;
  score: number;
  confidence: MatchConfidenceLevel;
  matchedFields: Array<{
    field: string;
    score: number;
    value1: string;
    value2: string;
  }>;
  explanation: string;
  metadata?: Record<string, unknown>;
}

// ========================================
// ML-BASED DEDUPLICATION
// ========================================

export interface MLDedupeConfig {
  modelId: string;
  features: Array<string>;
  threshold: number;
  trainingData?: Array<Record<string, unknown>>;
  retrainInterval?: number; // days
  confidenceThresholds: {
    autoMerge: number;
    needsReview: number;
  };
}

export interface MLDedupeResult {
  pairId: string;
  record1Id: string;
  record2Id: string;
  similarity: number;
  confidence: number;
  prediction: boolean;
  features: Array<{
    name: string;
    similarity: number;
    weight: number;
  }>;
}

// ========================================
// RULE-BASED DEDUPLICATION
// ========================================

export interface DeduplicationRule {
  id: string;
  name: string;
  type: DeduplicationRuleType;
  priority: number;
  enabled: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value?: string;
    threshold?: number;
  }>;
  transformations?: Array<{
    field: string;
    function: string;
    params?: Record<string, unknown>;
  }>;
  action: DeduplicationAction;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeduplicationRuleDto {
  name: string;
  type: DeduplicationRuleType;
  priority: number;
  enabled?: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value?: string;
    threshold?: number;
  }>;
  transformations?: Array<{
    field: string;
    function: string;
    params?: Record<string, unknown>;
  }>;
  action: DeduplicationAction;
  metadata?: Record<string, unknown>;
}

export interface UpdateDeduplicationRuleDto {
  name?: string;
  priority?: number;
  enabled?: boolean;
  conditions?: Array<{
    field: string;
    operator: string;
    value?: string;
    threshold?: number;
  }>;
  transformations?: Array<{
    field: string;
    function: string;
    params?: Record<string, unknown>;
  }>;
  action?: DeduplicationAction;
  metadata?: Record<string, unknown>;
}

// ========================================
// DEDUPLICATION JOB
// ========================================

export interface DeduplicationJob {
  id: string;
  name: string;
  description?: string;
  source: string;
  sourceType: 'CRM' | 'CSV' | 'API' | 'DATABASE';
  status: DeduplicationStatus;
  algorithm: MatchAlgorithm;
  rules: Array<string>; // rule IDs
  config: Record<string, unknown>;
  totalRecords: number;
  processedRecords: number;
  duplicateGroups: number;
  matchesFound: number;
  autoMerged: number;
  needsReview: number;
  failedRecords: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeduplicationJobDto {
  name: string;
  description?: string;
  source: string;
  sourceType: 'CRM' | 'CSV' | 'API' | 'DATABASE';
  algorithm: MatchAlgorithm;
  rules?: Array<string>;
  config?: Record<string, unknown>;
  scheduledFor?: Date;
}

export interface UpdateDeduplicationJobDto {
  status?: DeduplicationStatus;
  totalRecords?: number;
  processedRecords?: number;
  duplicateGroups?: number;
  matchesFound?: number;
  autoMerged?: number;
  needsReview?: number;
  failedRecords?: number;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

// ========================================
// DUPLICATE GROUP
// ========================================

export interface DuplicateGroup {
  id: string;
  jobId: string;
  masterRecordId: string;
  recordIds: Array<string>;
  matchScore: number;
  confidence: MatchConfidenceLevel;
  algorithm: MatchAlgorithm;
  matchedFields: string[];
  suggestedAction: DeduplicationAction;
  reviewed: boolean;
  reviewStatus?: 'APPROVED' | 'REJECTED' | 'MANUAL';
  reviewedBy?: string;
  reviewedAt?: Date;
  mergeResult?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DuplicateGroupDetails extends DuplicateGroup {
  records: Array<Record<string, unknown>>;
  fieldComparisons: Array<{
    field: string;
    values: Array<string>;
    matchScore: number;
  }>;
}

// ========================================
// DEDUPLICATION REPORT
// ========================================

export interface DeduplicationReport {
  jobId: string;
  jobName: string;
  summary: {
    totalRecords: number;
    duplicateGroups: number;
    uniqueRecords: number;
    autoMerged: number;
    needsReview: number;
    failedRecords: number;
    accuracy: number;
  };
  details: {
    byAlgorithm: Record<string, {
      matches: number;
      confidence: number;
    }>;
    byField: Record<string, {
      matches: number;
      accuracy: number;
    }>;
    byConfidence: Record<MatchConfidenceLevel, number>;
  };
  processingStats: {
    duration: number;
    recordsPerSecond: number;
    peakMemory: number;
    errors: Array<{
      recordId: string;
      error: string;
    }>;
  };
}

// ========================================
// DEDUPLICATION ANALYTICS
// ========================================

export interface DeduplicationAnalytics {
  overview: {
    totalJobs: number;
    activeJobs: number;
    totalDuplicatesFound: number;
    autoResolved: number;
    manualReview: number;
    accuracy: number;
  };
  trends: Array<{
    date: string;
    duplicatesFound: number;
    autoMerged: number;
    manualReview: number;
    accuracy: number;
  }>;
  qualityMetrics: {
    dataQuality: number;
    matchAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
  algorithmPerformance: Record<string, {
    matches: number;
    accuracy: number;
    averageScore: number;
  }>;
}

// ========================================
// DEDUPLICATION SETTINGS
// ========================================

export interface DeduplicationSettings {
  id: string;
  organizationId: string;
  defaultAlgorithm: MatchAlgorithm;
  defaultThreshold: number;
  autoMergeEnabled: boolean;
  autoMergeThreshold: number;
  reviewQueueEnabled: boolean;
  notificationSettings: {
    onDuplicateFound: boolean;
    onAutoMerge: boolean;
    onHighConfidenceMatch: boolean;
  };
  fieldWeights: Record<string, number>;
  customRules: Array<string>;
  mlModelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDeduplicationSettingsDto {
  defaultAlgorithm?: MatchAlgorithm;
  defaultThreshold?: number;
  autoMergeEnabled?: boolean;
  autoMergeThreshold?: number;
  reviewQueueEnabled?: boolean;
  notificationSettings?: {
    onDuplicateFound?: boolean;
    onAutoMerge?: boolean;
    onHighConfidenceMatch?: boolean;
  };
  fieldWeights?: Record<string, number>;
  customRules?: Array<string>;
  mlModelId?: string;
}

// ========================================
// DEDUPLICATION COMPARISON
// ========================================

export interface FieldComparison {
  field: string;
  value1: string;
  value2: string;
  similarity: number;
  match: boolean;
  algorithm?: string;
}

export interface RecordComparison {
  record1Id: string;
  record2Id: string;
  overallSimilarity: number;
  fieldComparisons: FieldComparison[];
  weightedScore: number;
  matchedFields: string[];
  explanation: string;
}

// ========================================
// BATCH OPERATIONS
// ========================================

export interface BatchMergeRequest {
  duplicateGroupIds: Array<string>;
  mergeStrategy: 'prefer_newest' | 'prefer_oldest' | 'prefer_highest_score' | 'custom';
  customMergeRules?: Record<string, string>;
  reviewMode: boolean;
}

export interface BatchMergeResult {
  success: boolean;
  merged: number;
  failed: number;
  skipped: number;
  errors: Array<{
    groupId: string;
    error: string;
    details?: Record<string, unknown>;
  }>;
  mergedRecords: Array<{
    groupId: string;
    masterRecordId: string;
    mergedRecordIds: string[];
  }>;
}

// ========================================
// FILTER & PAGINATION
// ========================================

export interface DeduplicationJobFilters {
  status?: DeduplicationStatus;
  sourceType?: 'CRM' | 'CSV' | 'API' | 'DATABASE';
  algorithm?: MatchAlgorithm;
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DuplicateGroupFilters {
  jobId?: string;
  confidence?: MatchConfidenceLevel;
  reviewed?: boolean;
  reviewStatus?: 'APPROVED' | 'REJECTED' | 'MANUAL';
  minScore?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeduplicationRuleFilters {
  type?: DeduplicationRuleType;
  enabled?: boolean;
  priorityFrom?: number;
  priorityTo?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
