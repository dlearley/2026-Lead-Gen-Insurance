/**
 * Machine Learning Types (Phase 16.3.3 - Predictive)
 *
 * TypeScript definitions for ML model training, serving, and metadata
 */

export type ModelType =
  | 'churn'
  | 'conversion'
  | 'lead_score'
  | 'agent_performance'
  | 'pricing_optimization';

export type ModelStatus =
  | 'training'
  | 'trained'
  | 'validating'
  | 'production'
  | 'archived'
  | 'failed';

export interface ModelConfig {
  modelType: ModelType;
  targetColumn: string;
  featureColumns: string[];
  useXgboost?: boolean;
  hyperparameterTuning?: boolean;
  testSize?: number;
  randomState?: number;
  maxTrainingSamples?: number;
}

export interface ModelMetadata {
  modelId: string;
  modelType: ModelType;
  version: string;
  createdAt: string;
  trainingStartedAt: string;
  trainingCompletedAt?: string;
  metrics: ModelMetrics;
  featureImportance: Record<string, number>;
  trainingSamples: number;
  testSamples: number;
  validationSamples: number;
  isProduction: boolean;
  status: ModelStatus;
  hyperparameters: Record<string, any>;
  featureSchema: FeatureSchema;
  trainingConfig: ModelConfig;
  trainingDurationSeconds: number;
  modelSizeBytes: number;
  trainingDataHash?: string;
  validationDataHash?: string;
}

export interface ModelMetrics {
  trainAccuracy?: number;
  testAccuracy?: number;
  cvScoreMean?: number;
  cvScoreStd?: number;
  rocAuc?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2Score?: number;
  calibrationScore?: number;
  predictionLatencyP50?: number;
  predictionLatencyP95?: number;
  predictionLatencyP99?: number;
}

export interface FeatureSchema {
  features: Array<{
    name: string;
    type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
    dataType: string;
    description?: string;
    nullable?: boolean;
    cardinality?: number;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    missingPercentage?: number;
  }>;
  target: {
    name: string;
    type: string;
    classes?: string[];
    description?: string;
  };
}

export interface PredictionRequest {
  entityId: string;
  modelType: ModelType;
  featureValues?: Record<string, any>;
  includeExplanation?: boolean;
  includeFeatureValues?: boolean;
}

export interface PredictionResult {
  entityId: string;
  modelType: ModelType;
  modelVersion: string;
  prediction: number;
  predictionTimestamp: string;
  probability?: number;
  probabilities?: Record<string, number>;
  explanation?: PredictionExplanation;
  featureValues?: Record<string, any>;
  confidenceInterval?: [number, number];
  predictionId: string;
}

export interface BatchPredictionRequest {
  modelType: ModelType;
  entityIds: string[];
  includeExplanations?: boolean;
  includeFeatureValues?: boolean;
  maxBatchSize?: number;
}

export interface BatchPredictionResult {
  modelType: ModelType;
  modelVersion: string;
  predictions: PredictionResult[];
  batchId: string;
  generatedAt: string;
  totalProcessed: number;
  failedCount: number;
  averageLatencyMs: number;
}

export interface PredictionExplanation {
  method: 'shap' | 'lime' | 'tree_interpreter' | 'permutation_importance';
  featureContributions: Array<{
    featureName: string;
    contribution: number;
    value: any;
    description?: string;
  }>;
  baselineValue: number;
  predictionValue: number;
  expectedValue: number;
}

export interface TrainingJob {
  jobId: string;
  modelType: ModelType;
  config: ModelConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  progress?: {
    stage: string;
    percentage: number;
    estimatedTimeRemainingSeconds?: number;
  };
  result?: {
    modelId: string;
    metrics: ModelMetrics;
    metadata: ModelMetadata;
  };
}

export interface TrainingRequest {
  modelType: ModelType;
  hyperparameterTuning?: boolean;
  maxTrainingSamples?: number;
  customConfig?: Partial<ModelConfig>;
}

export interface ABTest {
  testId: string;
  name: string;
  description?: string;
  modelType: ModelType;
  controlModelId: string;
  treatmentModelId: string;
  trafficSplit: number; // 0-1, percentage to treatment
  status: 'draft' | 'running' | 'paused' | 'completed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  successMetric: string; // e.g., 'conversion_rate', 'churn_rate'
  minimumSampleSize?: number;
  confidenceLevel?: number; // e.g., 0.95
  results?: {
    controlMetrics: ModelMetrics;
    treatmentMetrics: ModelMetrics;
    winner?: 'control' | 'treatment' | 'inconclusive';
    statisticalSignificance?: number;
    sampleSizeReached: boolean;
  };
}

export interface ModelPerformanceMonitor {
  modelId: string;
  modelType: ModelType;
  window: '1h' | '24h' | '7d' | '30d' | '90d';
  predictionsCount: number;
  averageLatencySeconds: number;
  dataDriftScore?: number;
  conceptDriftScore?: number;
  predictionDistribution?: {
    mean: number;
    std: number;
    histogram: Array<{ bin: string; count: number }>;
  };
  actualsMatchRate?: number; // Percentage of predictions with actual outcomes
  accuracy?: number;
  precision?: number;
  recall?: number;
  alertTriggers?: Array<{
    type: 'drift' | 'performance' | 'latency' | 'availability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

export interface ModelRetrainingTrigger {
  triggerId: string;
  modelType: ModelType;
  triggerType: 'schedule' | 'performance' | 'data_drift' | 'manual';
  conditions: {
    minExamplesSinceLastTrain?: number;
    performanceDropThreshold?: number;
    dataDriftThreshold?: number;
    schedule?: string; // cron expression
  };
  lastTriggeredAt?: string;
  nextScheduledAt?: string;
  isEnabled: boolean;
  metadata?: Record<string, any>;
}

export interface HyperparameterSpace {
  paramName: string;
  paramType: 'integer' | 'float' | 'categorical' | 'logarithmic';
  min?: number;
  max?: number;
  choices?: any[];
  scaling?: 'linear' | 'log' | 'uniform';
}

export interface HyperparameterTuningResult {
  tuningId: string;
  modelType: ModelType;
  bestHyperparameters: Record<string, any>;
  bestScore: number;
  totalTrials: number;
  trials: Array<{
    trialId: string;
    hyperparameters: Record<string, any>;
    score: number;
    trainingTimeSeconds: number;
  }>;
  completedAt: string;
  durationHours: number;
}

export interface FeatureImportanceAnalysis {
  modelId: string;
  modelType: ModelType;
  globalImportance: Array<{
    featureName: string;
    importanceScore: number;
    rank: number;
  }>;
  partialDependencePlots?: Record<string, any>;
  featureInteractions?: Array<{
    featurePair: [string, string];
    interactionStrength: number;
  }>;
}

export interface ModelExplainabilityResult {
  entityId: string;
  modelType: ModelType;
  modelVersion: string;
  prediction: number;
  explanation: PredictionExplanation;
  counterfactuals?: Array<{
    featureChanges: Record<string, number>;
    newPrediction: number;
    probabilityChange: number;
  }>;
  similarCases?: Array<{
    entityId: string;
    similarityScore: number;
    outcome: string;
  }>;
}

export interface MLOperationsDashboard {
  models: {
    total: number;
    byStatus: Record<ModelStatus, number>;
    byType: Record<ModelType, number>;
  };
  predictions: {
    totalToday: number;
    totalWeek: number;
    averageLatency: number;
    successRate: number;
  };
  trainingJobs: {
    active: number;
    completedToday: number;
    failedToday: number;
  };
  aBTests: {
    running: number;
    completed: number;
    winnersFound: number;
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Training Data Versioning
export interface TrainingDataset {
  datasetId: string;
  modelType: ModelType;
  version: string;
  createdAt: string;
  rowCount: number;
  featureCount: number;
  positiveSamples?: number;
  negativeSamples?: number;
  dataHash: string;
  featureHash: string;
  labelDistribution: Record<string, number>;
  dataQualityReport: DataQualityReport;
  sourceTables: string[];
  featureGenerationConfig: any;
}

export interface DataQualityReport {
  missingValues: Array<{
    feature: string;
    count: number;
    percentage: number;
  }>;
  outliers: Array<{
    feature: string;
    count: number;
    percentage: number;
  }>;
  duplicates: number;
  duplicatesPercentage: number;
  anomalies: Array<{
    type: string;
    description: string;
  }>;
}

// Model Deployment & Serving
export interface ModelDeployment {
  deploymentId: string;
  modelId: string;
  modelType: ModelType;
  version: string;
  environment: 'staging' | 'production' | 'shadow';
  status: 'deploying' | 'ready' | 'failed' | 'archived';
  deployedAt: string;
  endpointUrl: string;
  trafficSplit: number;
  canaryConfig?: {
    enabled: boolean;
    trafficRampUp: 'gradual' | 'immediate';
    evaluationWindow: string; // e.g., '1h', '24h'
    autoPromote: boolean;
    successCriteria: Record<string, number>;
  };
}

export interface ModelServingMetrics {
  deploymentId: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  lastRequestAt?: string;
  errorRate: number;
  throughput: number; // requests per second
}
