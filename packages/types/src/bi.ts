import { z } from 'zod';

// Prediction Types
export const PredictionType = z.enum([
  'lead_conversion',
  'agent_performance', 
  'market_trends',
  'risk_assessment',
  'conversion_rate'
]);

// Insight Types
export const InsightType = z.enum([
  'lead_quality',
  'agent_performance',
  'market_trends',
  'system_health',
  'conversion_patterns'
]);

// Recommendation Types
export const RecommendationType = z.enum([
  'routing_optimization',
  'performance_improvement',
  'resource_allocation',
  'process_optimization',
  'agent_training'
]);

// Visualization Types
export const VisualizationType = z.enum([
  'line_chart',
  'bar_chart',
  'pie_chart',
  'scatter_plot',
  'map',
  'table',
  'gauge',
  'heatmap'
]);

// Time Range for Analytics
export const TimeRange = z.enum([
  '24h',
  '7d',
  '30d',
  '90d',
  '1y',
  'all',
  'custom'
]);

// Prediction Result
export const PredictionResult = z.object({
  id: z.string(),
  type: PredictionType,
  probability: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.number().min(-1).max(1),
    description: z.string()
  })),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

// Insight
export const Insight = z.object({
  id: z.string(),
  type: InsightType,
  title: z.string(),
  description: z.string(),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  recommendation: z.string(),
  data: z.record(z.any()),
  createdAt: z.string().datetime()
});

// Recommendation
export const Recommendation = z.object({
  id: z.string(),
  type: RecommendationType,
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedImpact: z.number().min(0).max(100),
  implementationSteps: z.array(z.string()),
  relatedData: z.record(z.any()),
  createdAt: z.string().datetime()
});

// Dashboard Configuration
export const DashboardConfig = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  widgets: z.array(z.object({
    id: z.string(),
    type: VisualizationType,
    title: z.string(),
    dataSource: z.string(),
    configuration: z.record(z.any()),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    })
  })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Data Query for Exploration
export const DataQuery = z.object({
  query: z.string().optional(),
  filters: z.record(z.any()).optional(),
  aggregations: z.array(z.object({
    field: z.string(),
    function: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct'])
  })).optional(),
  groupBy: z.array(z.string()).optional(),
  sort: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  limit: z.number().optional(),
  offset: z.number().optional()
});

// Time Series Data
export const TimeSeriesData = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  metadata: z.record(z.any()).optional()
});

// Prediction Model Configuration
export const PredictionModel = z.object({
  id: z.string(),
  name: z.string(),
  type: PredictionType,
  version: z.string(),
  description: z.string(),
  inputFeatures: z.array(z.string()),
  outputFeatures: z.array(z.string()),
  performance: z.object({
    accuracy: z.number().min(0).max(1),
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1Score: z.number().min(0).max(1)
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Forecast Result
export const ForecastResult = z.object({
  id: z.string(),
  type: PredictionType,
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  forecastValues: z.array(TimeSeriesData),
  confidenceInterval: z.object({
    lower: z.array(z.number()),
    upper: z.array(z.number())
  }),
  modelUsed: z.string(),
  createdAt: z.string().datetime()
});

// Anomaly Detection Result
export const AnomalyDetection = z.object({
  id: z.string(),
  metric: z.string(),
  timestamp: z.string().datetime(),
  actualValue: z.number(),
  expectedValue: z.number(),
  deviation: z.number(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  recommendation: z.string().optional()
});

// Model Performance Metrics
export const ModelPerformance = z.object({
  modelId: z.string(),
  modelName: z.string(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  metrics: z.object({
    accuracy: z.number().min(0).max(1),
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1Score: z.number().min(0).max(1),
    rmse: z.number().min(0),
    mae: z.number().min(0)
  }),
  predictionCount: z.number(),
  averagePredictionTime: z.number()
});

// What-if Analysis Result
export const WhatIfAnalysis = z.object({
  scenarioId: z.string(),
  scenarioName: z.string(),
  parameters: z.record(z.any()),
  baseline: z.record(z.any()),
  projected: z.record(z.any()),
  impact: z.number(),
  roi: z.number(),
  confidence: z.number().min(0).max(1),
  recommendations: z.array(Recommendation),
  createdAt: z.string().datetime()
});

// Export Types
export type PredictionType = z.infer<typeof PredictionType>;
export type InsightType = z.infer<typeof InsightType>;
export type RecommendationType = z.infer<typeof RecommendationType>;
export type VisualizationType = z.infer<typeof VisualizationType>;
export type TimeRange = z.infer<typeof TimeRange>;
export type PredictionResult = z.infer<typeof PredictionResult>;
export type Insight = z.infer<typeof Insight>;
export type Recommendation = z.infer<typeof Recommendation>;
export type DashboardConfig = z.infer<typeof DashboardConfig>;
export type DataQuery = z.infer<typeof DataQuery>;
export type TimeSeriesData = z.infer<typeof TimeSeriesData>;
export type PredictionModel = z.infer<typeof PredictionModel>;
export type ForecastResult = z.infer<typeof ForecastResult>;
export type AnomalyDetection = z.infer<typeof AnomalyDetection>;
export type ModelPerformance = z.infer<typeof ModelPerformance>;
export type WhatIfAnalysis = z.infer<typeof WhatIfAnalysis>;