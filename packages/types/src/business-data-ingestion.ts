/**
 * Business Data Ingestion Pipeline Types
 * TypeScript definitions for business intelligence data ingestion and processing
 */

import { z } from 'zod';

// ========================================
// BUSINESS DATA SOURCE TYPES
// ========================================

export const BusinessDataSourceType = z.enum([
  'zoominfo',
  'apollo',
  'clearbit',
  'dun_bradstreet',
  'linkedin_sales_navigator',
  'custom'
]);

export const BusinessDataProcessingStatus = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'partial_success'
]);

// Business Data Source Configuration
export const BusinessDataSource = z.object({
  id: z.string(),
  name: z.string(),
  type: BusinessDataSourceType,
  description: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
  status: z.enum(['active', 'inactive', 'error', 'rate_limited']),
  priority: z.number().default(1),
  qualityThreshold: z.number().min(0).max(100).default(80),
  enabledFields: z.array(z.string()),
  config: z.record(z.any()).optional(),
  lastSuccessfulAt: z.date().optional(),
  lastErrorAt: z.date().optional(),
  totalCalls: z.number().default(0),
  successfulCalls: z.number().default(0),
  failedCalls: z.number().default(0),
  averageResponseTime: z.number().default(0),
  dataQualityScore: z.number().min(0).max(100).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ========================================
// BUSINESS INTELLIGENCE DATA TYPES
// ========================================

// Company Profile Information
export const CompanyProfile = z.object({
  companyName: z.string(),
  industry: z.string(),
  employeeCount: z.number(),
  annualRevenue: z.number(),
  headquarters: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  founded: z.number(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  businessType: z.string(),
  status: z.enum(['Active', 'Inactive', 'Acquired', 'Merged']),
  subsidiaries: z.array(z.string()).optional(),
  parentCompany: z.string().optional(),
});

// Financial Metrics
export const CompanyFinancialMetrics = z.object({
  revenue: z.number(),
  employeeCount: z.number(),
  growth: z.object({
    revenueGrowth: z.number(), // percentage
    employeeGrowth: z.number().optional(), // percentage
    marketExpansion: z.boolean(),
  }),
  profitability: z.object({
    profitMargin: z.number().optional(), // percentage
    ebitdaMargin: z.number().optional(), // percentage
    grossMargin: z.number().optional(), // percentage
  }),
  creditRating: z.string().optional(),
  riskScore: z.number().min(0).max(100),
  financialHealth: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
  cashFlow: z.enum(['Positive', 'Neutral', 'Negative']),
  debtToEquity: z.number().optional(),
  roi: z.number().optional(), // percentage
});

// Industry Intelligence
export const IndustryData = z.object({
  sector: z.string(),
  marketPosition: z.enum(['Leader', 'Challenger', 'Follower', 'Niche']),
  competitiveLandscape: z.enum(['Consolidated', 'Fragmented', 'Emerging']),
  growthTrend: z.enum(['Growing', 'Stable', 'Declining']),
  regulatoryEnvironment: z.enum(['Light', 'Moderate', 'Heavy']),
  keyTrends: z.array(z.string()),
  marketSize: z.number(),
  marketShare: z.number().optional(), // percentage
  barriersToEntry: z.array(z.string()),
  customerSegments: z.array(z.string()),
  pricingPressure: z.enum(['Low', 'Medium', 'High']),
});

// Risk Profile
export const BusinessRiskProfile = z.object({
  overallRiskScore: z.number().min(0).max(100),
  financialRisk: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
    trend: z.enum(['Improving', 'Stable', 'Deteriorating']),
  }),
  operationalRisk: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
    trend: z.enum(['Improving', 'Stable', 'Deteriorating']),
  }),
  industryRisk: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
    trend: z.enum(['Improving', 'Stable', 'Deteriorating']),
  }),
  marketRisk: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
    trend: z.enum(['Improving', 'Stable', 'Deteriorating']),
  }),
  riskMitigationStrategies: z.array(z.string()),
});

// Market Intelligence
export const MarketIntelligence = z.object({
  competitors: z.array(z.object({
    companyName: z.string(),
    marketShare: z.number().optional(),
    strength: z.string(),
    weakness: z.string(),
    threat: z.enum(['Low', 'Medium', 'High']),
  })),
  marketShare: z.number().optional(), // percentage
  pricingStrategy: z.enum(['Premium', 'Competitive', 'Value', 'Penetration']),
  customerSegments: z.array(z.string()),
  geographicReach: z.array(z.string()),
  partnerships: z.array(z.enum(['Strategic', 'Technology', 'Distribution', 'Reseller'])),
  recentNews: z.array(z.object({
    title: z.string(),
    date: z.date(),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative']),
    impact: z.enum(['Low', 'Medium', 'High']),
    source: z.string().optional(),
  })),
  funding: z.object({
    lastRound: z.enum(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'IPO', 'None']).optional(),
    totalRaised: z.number().optional(),
    lastFundingDate: z.date().optional(),
    investors: z.array(z.string()).optional(),
  }).optional(),
});

// Data Quality Metrics
export const BusinessDataQuality = z.object({
  completeness: z.number().min(0).max(100), // percentage of fields populated
  accuracy: z.number().min(0).max(100), // percentage accuracy score
  freshness: z.number().min(0).max(100), // how recent the data is
  source: z.string(),
  lastUpdated: z.date(),
  confidence: z.number().min(0).max(100), // overall confidence score
  verificationStatus: z.enum(['Verified', 'Partially Verified', 'Unverified']),
  validationErrors: z.array(z.string()).optional(),
});

// Complete Business Intelligence Data Structure
export const BusinessIntelligenceData = z.object({
  companyProfile: CompanyProfile,
  financialMetrics: CompanyFinancialMetrics,
  industryIntelligence: IndustryData,
  riskProfile: BusinessRiskProfile,
  marketIntelligence: MarketIntelligence,
  dataQuality: BusinessDataQuality,
});

// Competitor Analysis
export const CompetitorAnalysis = z.object({
  companyName: z.string(),
  marketShare: z.number().optional(),
  strength: z.string(),
  weakness: z.string(),
  threat: z.enum(['Low', 'Medium', 'High']),
});

// ========================================
// PROCESSING AND PIPELINE TYPES
// ========================================

// Business Data Enrichment Result
export const BusinessEnrichmentResult = z.object({
  success: z.boolean(),
  leadId: z.string(),
  businessDataSource: z.string(),
  dataQuality: z.number().min(0).max(100),
  enrichmentDuration: z.number(),
  recordsEnriched: z.number(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

// Business Data Processing Job
export const BusinessDataProcessingJob = z.object({
  id: z.string(),
  sourceId: z.string(),
  status: BusinessDataProcessingStatus,
  startedAt: z.date(),
  completedAt: z.date().optional(),
  recordsProcessed: z.number().default(0),
  recordsEnriched: z.number().default(0),
  recordsFailed: z.number().default(0),
  qualityScore: z.number().min(0).max(100).default(0),
  processingTime: z.number().optional(), // milliseconds
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  config: z.record(z.any()).optional(),
});

// Business Data Quality Metrics
export const BusinessDataQualityMetrics = z.object({
  totalRecords: z.number(),
  enrichedRecords: z.number(),
  failedRecords: z.number(),
  averageQualityScore: z.number().min(0).max(100),
  dataCompleteness: z.number().min(0).max(100),
  dataAccuracy: z.number().min(0).max(100),
  dataFreshness: z.number().min(0).max(100),
  sourcePerformance: z.record(z.object({
    successRate: z.number().min(0).max(100),
    averageResponseTime: z.number(),
    recordsProcessed: z.number(),
    qualityScore: z.number().min(0).max(100),
  })),
});

// Pipeline Configuration
export const BusinessDataIngestionPipelineConfig = z.object({
  enabledSources: z.array(z.string()),
  processingIntervalHours: z.number().min(1).max(168).default(24),
  batchSize: z.number().min(1).max(1000).default(100),
  retryAttempts: z.number().min(0).max(10).default(3),
  qualityThreshold: z.number().min(0).max(100).default(80),
  enrichmentEnabled: z.boolean().default(true),
  realtimeProcessing: z.boolean().default(false),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    requestsPerMinute: z.number().default(60),
    requestsPerHour: z.number().default(1000),
  }),
  dataRetention: z.object({
    keepRawDataDays: z.number().default(90),
    keepProcessedDataDays: z.number().default(365),
    archiveAfterDays: z.number().default(730),
  }),
});

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

// Create Business Data Source
export const CreateBusinessDataSourceDto = z.object({
  name: z.string(),
  type: BusinessDataSourceType,
  description: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
  priority: z.number().optional(),
  qualityThreshold: z.number().optional(),
  enabledFields: z.array(z.string()),
  config: z.record(z.any()).optional(),
});

// Update Business Data Source
export const UpdateBusinessDataSourceDto = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
  priority: z.number().optional(),
  qualityThreshold: z.number().optional(),
  enabledFields: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'error', 'rate_limited']).optional(),
});

// Create Pipeline Configuration
export const CreateBusinessDataPipelineDto = z.object({
  name: z.string(),
  description: z.string().optional(),
  sources: z.array(z.string()),
  config: BusinessDataIngestionPipelineConfig.optional(),
  schedule: z.object({
    enabled: z.boolean().default(true),
    cronExpression: z.string().default('0 2 * * *'), // Daily at 2 AM
    timezone: z.string().default('UTC'),
  }),
});

// Manual Ingestion Request
export const ManualIngestionRequest = z.object({
  sourceIds: z.array(z.string()).optional(),
  leadIds: z.array(z.string()).optional(),
  forceRefresh: z.boolean().default(false),
  batchSize: z.number().optional(),
});

// Pipeline Execution Result
export const PipelineExecutionResult = z.object({
  executionId: z.string(),
  status: z.enum(['started', 'completed', 'failed', 'partial_success']),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  sources: z.array(z.object({
    sourceId: z.string(),
    status: BusinessDataProcessingStatus,
    recordsProcessed: z.number(),
    recordsEnriched: z.number(),
    recordsFailed: z.number(),
    qualityScore: z.number(),
    errors: z.array(z.string()),
  })),
  totalRecordsProcessed: z.number(),
  totalRecordsEnriched: z.number(),
  totalRecordsFailed: z.number(),
  averageQualityScore: z.number(),
  processingTime: z.number().optional(),
  errors: z.array(z.string()),
});

// ========================================
// ANALYTICS AND REPORTING TYPES
// ========================================

// Business Data Analytics
export const BusinessDataAnalytics = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  totalLeadsProcessed: z.number(),
  leadsWithBusinessData: z.number(),
  enrichmentRate: z.number(), // percentage
  averageQualityScore: z.number(),
  sourceBreakdown: z.record(z.object({
    recordsProcessed: z.number(),
    successRate: z.number(),
    averageQualityScore: z.number(),
    responseTime: z.number(),
  })),
  industryBreakdown: z.record(z.number()),
  revenueBreakdown: z.record(z.number()),
  growthTrends: z.object({
    leadsWithBusinessData: z.array(z.object({
      date: z.date(),
      count: z.number(),
    })),
    averageQualityScore: z.array(z.object({
      date: z.date(),
      score: z.number(),
    })),
  }),
});

// Pipeline Health Metrics
export const PipelineHealthMetrics = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  lastExecution: z.date().optional(),
  nextScheduledExecution: z.date().optional(),
  uptime: z.number(), // percentage
  averageExecutionTime: z.number(), // milliseconds
  errorRate: z.number(), // percentage
  sourcesHealth: z.record(z.enum(['healthy', 'degraded', 'unhealthy'])),
  alerts: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
    timestamp: z.date(),
  })),
});

// ========================================
// EXPORT ALL TYPES
// ========================================

export type BusinessDataSourceType = z.infer<typeof BusinessDataSourceType>;
export type BusinessDataProcessingStatus = z.infer<typeof BusinessDataProcessingStatus>;
export type BusinessDataSource = z.infer<typeof BusinessDataSource>;
export type CompanyProfile = z.infer<typeof CompanyProfile>;
export type CompanyFinancialMetrics = z.infer<typeof CompanyFinancialMetrics>;
export type IndustryData = z.infer<typeof IndustryData>;
export type BusinessRiskProfile = z.infer<typeof BusinessRiskProfile>;
export type MarketIntelligence = z.infer<typeof MarketIntelligence>;
export type BusinessDataQuality = z.infer<typeof BusinessDataQuality>;
export type BusinessIntelligenceData = z.infer<typeof BusinessIntelligenceData>;
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysis>;
export type BusinessEnrichmentResult = z.infer<typeof BusinessEnrichmentResult>;
export type BusinessDataProcessingJob = z.infer<typeof BusinessDataProcessingJob>;
export type BusinessDataQualityMetrics = z.infer<typeof BusinessDataQualityMetrics>;
export type BusinessDataIngestionPipelineConfig = z.infer<typeof BusinessDataIngestionPipelineConfig>;
export type CreateBusinessDataSourceDto = z.infer<typeof CreateBusinessDataSourceDto>;
export type UpdateBusinessDataSourceDto = z.infer<typeof UpdateBusinessDataSourceDto>;
export type CreateBusinessDataPipelineDto = z.infer<typeof CreateBusinessDataPipelineDto>;
export type ManualIngestionRequest = z.infer<typeof ManualIngestionRequest>;
export type PipelineExecutionResult = z.infer<typeof PipelineExecutionResult>;
export type BusinessDataAnalytics = z.infer<typeof BusinessDataAnalytics>;
export type PipelineHealthMetrics = z.infer<typeof PipelineHealthMetrics>;