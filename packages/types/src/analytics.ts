// ========================================
// ANALYTICS TYPES
// ========================================

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'commercial';
export type LeadStatus = 'received' | 'processing' | 'qualified' | 'routed' | 'converted' | 'rejected';

// Lead Funnel Metrics
export interface LeadFunnelMetrics {
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  conversionRate: number;
  averageTimeInFunnel: number; // in milliseconds
  dropoffRates: Record<LeadStatus, number>;
  trendData: Array<{
    date: string;
    count: number;
    conversions: number;
  }>;
}

export interface LeadVolumeMetrics {
  total: number;
  bySource: Record<string, number>;
  byInsuranceType: Record<InsuranceType, number>;
  byHour: number[];
  trend: Array<{
    date: string;
    volume: number;
    conversions: number;
  }>;
}

// Agent Performance Metrics
export interface AgentPerformanceMetrics {
  agentId: string;
  totalAssigned: number;
  totalAccepted: number;
  totalRejected: number;
  totalConverted: number;
  conversionRate: number;
  averageResponseTime: number; // in milliseconds
  averageProcessingTime: number; // in milliseconds
  revenueGenerated: number;
  customerSatisfactionScore: number;
  ranking: number;
  trendData: Array<{
    date: string;
    assigned: number;
    converted: number;
    responseTime: number;
  }>;
}

export interface AgentLeaderboardEntry {
  agentId: string;
  agentName: string;
  totalAssigned: number;
  totalConverted: number;
  conversionRate: number;
  averageResponseTime: number;
  ranking: number;
}

// AI Model Metrics
export interface AIModelMetrics {
  totalScored: number;
  scoringAccuracy: number; // percentage
  averageConfidence: number;
  apiCalls: number;
  apiCosts: number;
  averageLatency: number; // in milliseconds
  promptTokens: number;
  completionTokens: number;
  costPerCall: number;
}

export interface AIProcessingStats {
  queueDepth: number;
  averageWaitTime: number;
  processingRate: number; // per minute
  successRate: number;
  errorRate: number;
  modelBreakdown: Record<string, {
    calls: number;
    averageLatency: number;
    cost: number;
  }>;
}

// System Health Metrics
export interface SystemHealthMetrics {
  api: {
    uptime: number;
    requestRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  database: {
    connectionsActive: number;
    connectionsIdle: number;
    queryRate: number;
    averageQueryTime: number;
  };
  redis: {
    connected: boolean;
    memoryUsed: number;
    operationsPerSecond: number;
  };
  queues: {
    leadIngestion: {
      depth: number;
      processing: number;
      deadLetter: number;
    };
    aiProcessing: {
      depth: number;
      processing: number;
      deadLetter: number;
    };
    routing: {
      depth: number;
      processing: number;
      deadLetter: number;
    };
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
  }>;
  timestamp: string;
}

// Dashboard Summary
export interface DashboardSummary {
  overview: {
    totalLeads: number;
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    conversionRate: number;
    averageQualityScore: number;
  };
  funnel: {
    received: number;
    processing: number;
    qualified: number;
    routed: number;
    converted: number;
    rejected: number;
    conversionRate: number;
  };
  topAgents: AgentLeaderboardEntry[];
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  systemHealth: HealthStatus;
  aiMetrics: {
    modelsActive: number;
    averageScore: number;
    processingQueue: number;
  };
}

// Event Tracking
export type AnalyticsEventType =
  | 'lead.created'
  | 'lead.status_changed'
  | 'lead.qualified'
  | 'lead.routed'
  | 'lead.converted'
  | 'lead.rejected'
  | 'agent.assigned'
  | 'agent.accepted'
  | 'agent.rejected'
  | 'agent.converted'
  | 'ai.scored'
  | 'ai.processed'
  | 'api.request'
  | 'api.error'
  | 'system.alert';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    userId?: string;
    leadId?: string;
    agentId?: string;
  };
}

// Filter Types for Analytics Queries
export interface AnalyticsDateRange {
  from?: string;
  to?: string;
}

export interface LeadAnalyticsFilters extends AnalyticsDateRange {
  source?: string;
  insuranceType?: InsuranceType;
  status?: LeadStatus;
}

export interface AgentAnalyticsFilters extends AnalyticsDateRange {
  specialization?: string;
  location?: string;
  minConversionRate?: number;
  maxConversionRate?: number;
}
