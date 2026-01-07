// ML Router Package Types

export interface BrokerPredictionInput {
  brokerId: string;
  leadCharacteristics: {
    insuranceTypes: string[];
    urgency: string;
    geographicLocation: {
      state: string;
      city?: string;
    };
    estimatedValue: number;
    complexity: number;
    specialRequirements: string[];
  };
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    season: string;
    marketConditions: Record<string, any>;
  };
}

export interface BrokerPredictionOutput {
  brokerId: string;
  expectedConversionRate: number;
  expectedProcessingTime: number;
  expectedRevenue: number;
  confidence: number;
  factors: {
    specialtyMatch: number;
    capacityMatch: number;
    performanceHistory: number;
    contextualFit: number;
  };
  alternatives: Array<{
    brokerId: string;
    score: number;
    reasoning: string;
  }>;
}

export interface LeadEmbeddingInput {
  leadId: string;
  leadData: {
    insuranceTypes: string[];
    urgency: string;
    geographicLocation: {
      state: string;
      city?: string;
      zipCode?: string;
    };
    personalInfo: {
      age?: number;
      income?: number;
      profession?: string;
    };
    coverage: {
      currentProvider?: string;
      policyExpiryDate?: Date;
      claims?: number;
    };
    requirements: {
      specialFeatures: string[];
      budget?: number;
      riskFactors: string[];
    };
  };
  context?: {
    source: string;
    campaign?: string;
    referrer?: string;
  };
}

export interface LeadEmbeddingOutput {
  leadId: string;
  vector: number[];
  embeddingModel: string;
  features: {
    insuranceType: string[];
    urgency: number;
    geographic: number[];
    demographics: number[];
    coverage: number[];
    requirements: number[];
  };
  metadata: {
    embeddingDimensions: number;
    createdAt: Date;
    confidence: number;
    processingTime: number;
  };
}

export interface RoutingPredictionInput {
  leadId: string;
  leadData: any;
  availableBrokers: string[];
  context?: {
    timeOfDay: number;
    dayOfWeek: number;
    season: string;
    marketConditions?: Record<string, any>;
  };
  constraints?: {
    maxProcessingTime?: number;
    requiredSpecialties?: string[];
    excludeBrokers?: string[];
    maxLeadValue?: number;
  };
}

export interface RoutingPredictionOutput {
  leadId: string;
  predictions: Array<{
    brokerId: string;
    expectedConversionRate: number;
    expectedProcessingTime: number;
    expectedRevenue: number;
    confidence: number;
    reasoning: string;
    factors: Record<string, number>;
  }>;
  recommendedBroker: string;
  alternativeOptions: string[];
  predictionMetadata: {
    modelVersion: string;
    confidenceScore: number;
    processingTime: number;
    dataQuality: number;
  };
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  r2Score: number; // R-squared
  trainingTime: number;
  predictionTime: number;
  dataPoints: number;
  lastTrained: Date;
}

export interface ModelVersion {
  version: string;
  modelType: 'broker-performance' | 'lead-embedding' | 'routing-optimization';
  createdAt: Date;
  metrics: ModelPerformanceMetrics;
  parameters: Record<string, any>;
  isActive: boolean;
}

export interface OptimizationParameters {
  conversionWeight: number;
  speedWeight: number;
  capacityWeight: number;
  fairnessWeight: number;
  maxProcessingTime: number;
  minConfidenceThreshold: number;
  capacityBuffer: number;
}

export interface RoutingOptimizationInput {
  brokerId: string;
  optimizationGoals: {
    maximizeConversion: boolean;
    minimizeProcessingTime: boolean;
    balanceCapacity: boolean;
    ensureFairness: boolean;
  };
  constraints: OptimizationParameters;
  historicalData: Array<{
    leadId: string;
    outcome: 'converted' | 'rejected' | 'expired';
    processingTime: number;
    revenue: number;
    leadCharacteristics: Record<string, any>;
  }>;
}

export interface RoutingOptimizationOutput {
  brokerId: string;
  optimizedWeights: OptimizationParameters;
  expectedImprovement: {
    conversionRateIncrease: number;
    processingTimeReduction: number;
    capacityUtilizationImprovement: number;
    overallScoreIncrease: number;
  };
  modelInsights: {
    keyFactors: string[];
    performanceDrivers: string[];
    optimizationRecommendations: string[];
  };
  validationMetrics: {
    crossValidationScore: number;
    outOfSamplePerformance: number;
    stabilityScore: number;
  };
}

// Training and Data Types

export interface TrainingData {
  features: number[][];
  labels: {
    conversionRate: number[];
    processingTime: number[];
    revenue: number[];
    confidence: number[];
  };
  metadata: {
    dataSource: string;
    collectionPeriod: {
      start: Date;
      end: Date;
    };
    totalSamples: number;
    qualityScore: number;
  };
}

export interface DataValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  qualityScore: number;
  recommendedActions: string[];
}

export interface FeatureImportance {
  featureName: string;
  importance: number;
  category: 'insurance' | 'geographic' | 'demographic' | 'contextual' | 'broker';
  description: string;
}

// Experiment and A/B Testing Types

export interface ExperimentConfig {
  name: string;
  description: string;
  hypothesis: string;
  controlGroup: {
    modelVersion: string;
    parameters: Record<string, any>;
  };
  treatmentGroup: {
    modelVersion: string;
    parameters: Record<string, any>;
  };
  trafficAllocation: number;
  successMetrics: string[];
  duration: number; // days
  sampleSize: number;
}

export interface ExperimentResult {
  experimentId: string;
  status: 'running' | 'completed' | 'stopped';
  controlMetrics: {
    conversionRate: number;
    avgProcessingTime: number;
    avgRevenue: number;
    sampleSize: number;
  };
  treatmentMetrics: {
    conversionRate: number;
    avgProcessingTime: number;
    avgRevenue: number;
    sampleSize: number;
  };
  statisticalAnalysis: {
    pValue: number;
    confidenceInterval: [number, number];
    effectSize: number;
    power: number;
  };
  conclusion: 'treatment_wins' | 'control_wins' | 'inconclusive';
  recommendation: string;
}

// API Response Types

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: Date;
    processingTime: number;
    modelVersion: string;
  };
}

export interface BatchPredictionRequest {
  requests: Array<{
    leadId: string;
    leadData: any;
    availableBrokers: string[];
    context?: any;
    constraints?: any;
  }>;
  options?: {
    parallelProcessing: boolean;
    maxConcurrency: number;
    timeoutMs: number;
  };
}

export interface BatchPredictionResponse {
  results: Array<{
    leadId: string;
    success: boolean;
    prediction?: RoutingPredictionOutput;
    error?: string;
  }>;
  summary: {
    totalRequests: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
  };
}

// Configuration Types

export interface MLConfig {
  modelPaths: {
    brokerPerformance: string;
    leadEmbedding: string;
    routingOptimization: string;
  };
  embedding: {
    model: string;
    dimension: number;
    batchSize: number;
  };
  training: {
    epochs: number;
    batchSize: number;
    validationSplit: number;
    learningRate: number;
  };
  prediction: {
    timeoutMs: number;
    maxConcurrency: number;
    fallbackEnabled: boolean;
  };
  vectorDatabase: {
    url: string;
    collectionName: string;
    distanceMetric: 'cosine' | 'euclidean' | 'dot';
  };
}

// Error Types

export interface MLServiceError {
  code: 'MODEL_NOT_LOADED' | 'PREDICTION_FAILED' | 'TRAINING_FAILED' | 'DATA_VALIDATION_FAILED' | 'VECTOR_DB_ERROR';
  message: string;
  details?: any;
  timestamp: Date;
  service: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    brokerModel: 'online' | 'offline' | 'training';
    leadPipeline: 'online' | 'offline' | 'processing';
    predictionEngine: 'online' | 'offline' | 'initializing';
    vectorDatabase: 'online' | 'offline' | 'connecting';
  };
  metrics: {
    uptime: number;
    totalPredictions: number;
    averageLatency: number;
    errorRate: number;
  };
  lastCheck: Date;
}