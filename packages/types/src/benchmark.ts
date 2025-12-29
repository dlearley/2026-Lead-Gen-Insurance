// ========================================
// BROKER BENCHMARK TYPES
// ========================================

export type BenchmarkPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type BenchmarkType = 'peer' | 'industry' | 'historical' | 'target';
export type PerformanceCategory = 'conversion' | 'response_time' | 'revenue' | 'retention' | 'customer_satisfaction';

export interface BrokerBenchmarkMetrics {
  brokerId: string;
  period: BenchmarkPeriod;
  generatedAt: Date;
  
  // Conversion Metrics
  conversionRate: {
    value: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  };
  
  // Response Time Metrics
  responseTime: {
    averageMinutes: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  };
  
  // Revenue Metrics
  revenue: {
    totalRevenue: number;
    averagePerLead: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  };
  
  // Retention Metrics
  retention: {
    retentionRate: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  };
  
  // Customer Satisfaction Metrics
  customerSatisfaction: {
    score: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  };
}

export interface BenchmarkComparison {
  brokerId: string;
  category: PerformanceCategory;
  brokerValue: number;
  peerAverage: number;
  industryAverage: number;
  peerPercentile: number;
  industryPercentile: number;
  gapFromPeer: number;
  gapFromIndustry: number;
  status: 'above' | 'at' | 'below';
}

export interface PeerGroup {
  id: string;
  name: string;
  description: string;
  criteria: {
    minLeads?: number;
    maxLeads?: number;
    region?: string;
    specialization?: string[];
    networkTier?: string[];
  };
  brokerCount: number;
  averageMetrics: {
    conversionRate: number;
    responseTime: number;
    revenue: number;
    retention: number;
    customerSatisfaction: number;
  };
}

export interface BenchmarkTrend {
  date: string;
  brokerValue: number;
  peerAverage: number;
  industryAverage: number;
}

export interface BenchmarkInsight {
  id: string;
  brokerId: string;
  category: PerformanceCategory;
  type: 'strength' | 'opportunity' | 'warning';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  gap: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface IndustryBenchmark {
  id: string;
  category: PerformanceCategory;
  metric: string;
  value: number;
  source: string;
  dataPeriod: {
    start: Date;
    end: Date;
  };
  sampleSize: number;
  breakdown?: Record<string, number>;
}

export interface BrokerRanking {
  brokerId: string;
  brokerName: string;
  overallScore: number;
  rank: number;
  totalBrokers: number;
  categoryRankings: {
    category: PerformanceCategory;
    score: number;
    percentile: number;
    rank: number;
  }[];
  trend: 'up' | 'down' | 'stable';
}

export interface BenchmarkReport {
  id: string;
  brokerId: string;
  period: BenchmarkPeriod;
  generatedAt: Date;
  summary: {
    overallScore: number;
    overallPercentile: number;
    strengths: string[];
    weaknesses: string[];
    topOpportunities: string[];
  };
  comparisons: BenchmarkComparison[];
  trends: Record<PerformanceCategory, BenchmarkTrend[]>;
  insights: BenchmarkInsight[];
  recommendations: {
    category: PerformanceCategory;
    action: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
    priority: number;
  }[];
}

export interface CreateBenchmarkReportDto {
  brokerId: string;
  period: BenchmarkPeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface BenchmarkQueryParams {
  brokerId?: string;
  period?: BenchmarkPeriod;
  category?: PerformanceCategory;
  startDate?: string;
  endDate?: string;
}

export interface PerformanceGoal {
  id: string;
  brokerId: string;
  category: PerformanceCategory;
  targetValue: number;
  currentValue: number;
  progress: number;
  deadline: Date;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalDto {
  brokerId: string;
  category: PerformanceCategory;
  targetValue: number;
  deadline: Date;
}

export interface UpdateGoalDto {
  targetValue?: number;
  currentValue?: number;
  deadline?: Date;
}
