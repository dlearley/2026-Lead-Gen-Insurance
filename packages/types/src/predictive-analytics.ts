export type MLModelType = 'conversion' | 'ltv' | 'churn' | 'roi';

export interface MLModel {
  id: string;
  name: string;
  modelType: MLModelType;
  version: number;
  trainingDate: Date;
  evaluationDate?: Date;
  performanceMetrics?: Record<string, any>;
  featureImportance?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadPrediction {
  id: string;
  leadId: string;
  modelId: string;
  predictionType: string;
  predictedValue: number;
  confidence?: number;
  explanation?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface LTVSegment {
  id: string;
  customerId: string;
  segmentTier: number;
  calculatedLTV: number;
  confidence?: number;
  lastCalculated?: Date;
  nextRecalculation?: Date;
  updatedAt: Date;
}

export interface ChurnRiskScore {
  id: string;
  customerId: string;
  churnProbability: number;
  riskLevel?: string;
  daysToChurn?: number;
  contributingFactors?: Record<string, any>;
  interventionRecommended?: boolean;
  lastScored?: Date;
  createdAt: Date;
}

export interface ROIMetrics {
  id: string;
  leadSource: string;
  period: Date;
  totalLeads?: number;
  convertedLeads?: number;
  conversionRate?: number;
  totalAcquisitionCost?: number;
  totalLTV?: number;
  roiPercentage?: number;
  paybackDays?: number;
  forecastRevenue30d?: number;
  forecastRevenue60d?: number;
  forecastRevenue90d?: number;
  updatedAt: Date;
}

export interface ModelTrainingJob {
  id: string;
  modelType: MLModelType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trainingStart?: Date;
  trainingEnd?: Date;
  trainingSamples?: number;
  testSamples?: number;
  validationSamples?: number;
  performanceMetrics?: Record<string, any>;
  errorLog?: string;
  createdAt: Date;
}

export interface PredictionAuditLog {
  id: string;
  leadId: string;
  modelType: string;
  actualOutcome?: string;
  predictedValue?: number;
  predictionTimestamp?: Date;
  outcomeTimestamp?: Date;
  accuracyError?: number;
  createdAt: Date;
}

// Service-specific types

export interface ConversionPrediction {
  leadId: string;
  probability: number;
  confidence: number;
  explanation?: Record<string, any>;
}

export interface LTVPrediction {
  customerId: string;
  predictedLTV: number;
  confidence: number;
  tier: number;
}

export interface ROIForecast {
  leadSource: string;
  expectedROI: number;
  paybackPeriod: number;
  breakEvenAnalysis: any;
  projectedRevenue: {
    '30d': number;
    '60d': number;
    '90d': number;
  };
}

export interface SegmentAnalytics {
  distribution: Record<number, number>;
  averageLTV: Record<number, number>;
  retentionRate: Record<number, number>;
}

export interface SegmentTrend {
  date: Date;
  tierDistribution: Record<number, number>;
}

export interface ChurnFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface Intervention {
  customerId: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export interface RevenueForecast {
  leadSource: string;
  days: number;
  expectedRevenue: number;
  confidenceInterval: [number, number];
}

export interface SourceComparison {
  leadSource: string;
  roi: number;
  conversionRate: number;
  averageLTV: number;
}

export interface PaybackAnalysis {
  leadSource: string;
  paybackDays: number;
  isProfitable: boolean;
}

export interface BreakEvenAnalysis {
  leadSource: string;
  leadsNeeded: number;
  revenueNeeded: number;
}

export interface CostTrend {
  date: Date;
  acquisitionCost: number;
}

export interface TrainingConfig {
  hyperparameters?: Record<string, any>;
  features?: string[];
  validationSplit?: number;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  auc?: number;
  rmse?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}
