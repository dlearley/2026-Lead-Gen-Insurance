// ========================================
// PRICING STRATEGY AND MARGIN TYPES
// ========================================

export type InsuranceType = 'AUTO' | 'HOME' | 'LIFE' | 'HEALTH' | 'COMMERCIAL';
export type CoverageTier = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE';
export type QuoteStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type ExperimentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';

// ========================================
// CORE PRICING MODELS
// ========================================

export interface Quote {
  id: string;
  leadId: string;
  agentId: string;
  insuranceType: InsuranceType;
  coverageTier: CoverageTier;
  status: QuoteStatus;
  coverage: CoverageDetails;
  premium: PremiumDetails;
  version: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoverageDetails {
  [key: string]: {
    limit: number;
    deductible: number;
    premium: number;
    description?: string;
  };
}

export interface PremiumDetails {
  base: number;
  adjustments: {
    risk: number;
    location: number;
    coverage: number;
  };
  total: number;
}

// ========================================
// PRICING STRATEGY SYSTEM
// ========================================

export interface PricingStrategy {
  id: string;
  name: string;
  description?: string;
  insuranceType: InsuranceType;
  isActive: boolean;
  rules: PricingRule[];
  marginTarget: number; // target margin percentage
  minMargin: number; // minimum acceptable margin
  maxMargin: number; // maximum margin ceiling
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRule {
  id: string;
  type: 
    | 'BASE_PRICE' 
    | 'RISK_ADJUSTMENT' 
    | 'COMPETITIVE_ADJUSTMENT' 
    | 'DEMAND_ADJUSTMENT'
    | 'CUSTOMER_SEGMENT_ADJUSTMENT';
  conditions?: Condition[];
  adjustments: Adjustment[];
  priority: number;
  isActive: boolean;
}

export interface Condition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'BETWEEN';
  value: any;
}

export interface Adjustment {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MULTIPLIER';
  value: number;
  target?: 'BASE_PREMIUM' | 'RISK_FACTOR' | 'TOTAL';
}

// ========================================
// COMPETITIVE INTELLIGENCE
// ========================================

export interface CompetitivePrice {
  id: string;
  competitor: string;
  insuranceType: InsuranceType;
  coverageTier?: CoverageTier;
  premium: number;
  coverage: Record<string, any>;
  location: {
    city?: string;
    state: string;
    country: string;
    region?: string;
  };
  dateCollected: Date;
  marketShare?: number;
  qualityScore?: number;
  notes?: string;
  createdAt: Date;
}

export interface CompetitiveAnalysis {
  insuranceType: InsuranceType;
  coverageTier?: CoverageTier;
  location: {
    state: string;
    region?: string;
  };
  competitorPrices: CompetitivePrice[];
  marketAverage: number;
  marketMedian: number;
  priceRange: {
    min: number;
    max: number;
  };
  percentile: {
    25: number;
    50: number;
    75: number;
    90: number;
  };
  ourPosition: 'BELOW_MARKET' | 'AT_MARKET' | 'ABOVE_MARKET' | 'SIGNIFICANTLY_ABOVE';
  recommendations: string[];
}

// ========================================
// MARGIN ANALYSIS
// ========================================

export interface MarginAnalysis {
  id: string;
  quoteId: string;
  calculatedPremium: number;
  targetPremium?: number;
  costBreakdown: CostBreakdown;
  margin: number; // percentage
  targetMargin?: number;
  factors: MarginFactor[];
  recommendations: MarginRecommendation[];
  createdAt: Date;
}

export interface CostBreakdown {
  acquisitionCost: number;
  operationalCost: number;
  riskCost: number;
  overhead: number;
  profit: number;
}

export interface MarginFactor {
  type: 
    | 'RISK_FACTOR'
    | 'CUSTOMER_SEGMENT'
    | 'LOCATION'
    | 'COVERAGE_AMOUNT'
    | 'COMPETITIVE_PRESSURE'
    | 'MARKET_CONDITIONS';
  impact: number; // margin impact percentage
  description: string;
  modifiable: boolean;
}

export interface MarginRecommendation {
  type: 'INCREASE_PRICE' | 'REDUCE_COST' | 'ADJUST_COVERAGE' | 'OPTIMIZE_RISK';
  impact: number; // margin improvement percentage
  confidence: number; // 0-1
  reason: string;
  actionItems: string[];
}

// ========================================
// PRICING EXPERIMENTS
// ========================================

export interface PricingExperiment {
  id: string;
  name: string;
  description?: string;
  variantA: PricingVariant; // Control
  variantB: PricingVariant; // Test
  status: ExperimentStatus;
  results?: ExperimentResults;
  startDate?: Date;
  endDate?: Date;
  winner?: 'A' | 'B';
  insights?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingVariant {
  pricingStrategy: string; // Strategy ID
  description: string;
  sampleSize: number;
  conversionRate: number; // percentage
  averageMargin: number; // percentage
  totalRevenue: number;
}

export interface ExperimentResults {
  samples: {
    variantA: number;
    variantB: number;
  };
  conversions: {
    variantA: number;
    variantB: number;
  };
  margins: {
    variantA: number;
    variantB: number;
  };
  revenues: {
    variantA: number;
    variantB: number;
  };
  statisticalSignificance: number;
  winner: 'A' | 'B' | 'NO_SIGNIFICANT_DIFFERENCE';
}

// ========================================
// PRICING OPTIMIZATION
// ========================================

export interface PriceOptimizationRequest {
  quoteId: string;
  constraints: {
    minMargin: number;
    targetMargin: number;
    maxPremium?: number;
    competitiveness?: 'LEAD' | 'MEET' | 'OPTIMIZE'; // below market, match market, optimize for profit
  };
  factors: {
    considerCompetition: boolean;
    considerDemand: boolean;
    considerCustomerSegment: boolean;
  };
}

export interface PriceOptimizationResult {
  currentPrice: number;
  optimizedPrice: number;
  expectedMargin: number;
  expectedConversionRate: number;
  confidence: number;
  factors: {
    competitionImpact: number;
    demandImpact: number;
    segmentImpact: number;
  };
  risks: string[];
}

// ========================================
// MARGIN IMPROVEMENT DASHBOARD
// ========================================

export interface MarginDashboard {
  overall: {
    currentMargin: number;
    targetMargin: number;
    improvementOpportunity: number;
    annualImpact: number;
  };
  byInsuranceType: Record<InsuranceType, MarginMetrics>;
  byCoverageTier: Record<CoverageTier, MarginMetrics>;
  topOpportunities: MarginOpportunity[];
}

export interface MarginMetrics {
  averageMargin: number;
  averagePremium: number;
  volume: number;
  revenue: number;
}

export interface MarginOpportunity {
  quoteId: string;
  estimatedMarginIncrease: number;
  potentialRevenue: number;
  probability: number;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ========================================
// COMPETITIVE BENCHMARKING
// ========================================

export interface MarketBenchmark {
  insuranceType: InsuranceType;
  coverageTier: CoverageTier;
  location: {
    state: string;
    region?: string;
  };
  pricePoints: {
    ourPrice: number;
    marketLow: number;
    marketAverage: number;
    marketHigh: number;
    percentile25: number;
    percentile75: number;
  };
  positioning: {
    percentageFromMarketAverage: number;
    rank: number;
    totalCompetitors: number;
  };
  recommendations: string[];
}

// ========================================
// PRICING INTELLIGENCE ANALYTICS
// ========================================

export interface PricingAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalQuotes: number;
    totalRevenue: number;
    averageMargin: number;
    marginTrend: number; // percentage change
  };
  trends: Array<{
    date: string; // YYYY-MM-DD
    quotes: number;
    revenue: number;
    margin: number;
    conversionRate: number;
  }>;
  segmentation: {
    byInsuranceType: Array<{
      type: InsuranceType;
      volume: number;
      revenue: number;
      margin: number;
    }>;
    byCoverageTier: Array<{
      tier: CoverageTier;
      volume: number;
      revenue: number;
      margin: number;
    }>;
  };
}

// ========================================
// PRICING ANOMALY DETECTION
// ========================================

export interface PricingAnomaly {
  id: string;
  quoteId: string;
  detectedAt: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'OVERPRICED' | 'UNDERPRICED' | 'LOW_MARGIN' | 'COMPETITIVE_THREAT';
  description: string;
  metrics: {
    currentMargin?: number;
    marketAverage?: number;
    deviation: number; // percentage deviation from expected
  };
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

export interface GetMarginAnalysisParams {
  quoteId: string;
  includeFactors?: boolean;
  includeRecommendations?: boolean;
}

export interface ListPricingStrategiesParams {
  insuranceType?: InsuranceType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePricingStrategyDto {
  name: string;
  description?: string;
  insuranceType: InsuranceType;
  rules: PricingRule[];
  marginTarget: number;
  minMargin: number;
  maxMargin: number;
}

export interface UpdatePricingStrategyDto {
  name?: string;
  description?: string;
  rules?: PricingRule[];
  isActive?: boolean;
  marginTarget?: number;
  minMargin?: number;
  maxMargin?: number;
}

export interface GetCompetitivePricesParams {
  insuranceType: InsuranceType;
  coverageTier?: CoverageTier;
  location?: {
    state: string;
    region?: string;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface CreateCompetitivePriceDto {
  competitor: string;
  insuranceType: InsuranceType;
  coverageTier?: CoverageTier;
  premium: number;
  coverage: Record<string, any>;
  location: {
    city?: string;
    state: string;
    country: string;
    region?: string;
  };
  marketShare?: number;
  qualityScore?: number;
  notes?: string;
}

export interface CreatePricingExperimentDto {
  name: string;
  description?: string;
  variantA: {
    pricingStrategy: string;
    description: string;
  };
  variantB: {
    pricingStrategy: string;
    description: string;
  };
}

export interface UpdatePricingExperimentDto {
  status?: ExperimentStatus;
  startDate?: Date;
  endDate?: Date;
  results?: ExperimentResults;
  winner?: 'A' | 'B';
  insights?: string;
}

// ========================================
// REPORTING
// ========================================

export interface MarginReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalQuotes: number;
    totalPremium: number;
    averageMargin: number;
    grossProfit: number;
  };
  byInsuranceType: Record<InsuranceType, MarginMetrics>;
  byCoverageTier: Record<CoverageTier, MarginMetrics>;
  topPerformers: {
    agents: Array<{ id: string; name: string; margin: number; revenue: number }>;
    strategies: Array<{ id: string; name: string; margin: number; revenue: number }>;
  };
  opportunities: MarginOpportunity[];
}