export type TimeRange = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export interface LeadFunnelMetrics {
  total: number;
  byStage: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
    closed: number;
    lost: number;
  };
  conversionRates: {
    contactedRate: number;
    qualifiedRate: number;
    proposalRate: number;
    closedRate: number;
  };
  averageTimeInStage: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
  };
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  leadsAssigned: number;
  leadsAccepted: number;
  leadsConverted: number;
  conversionRate: number;
  averageResponseTime: number;
  averageHandlingTime: number;
  revenueGenerated: number;
  satisfactionScore: number;
  rank?: number;
}

export interface AIModelMetrics {
  totalScored: number;
  averageScore: number;
  scoringAccuracy: number;
  modelLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  apiCosts: {
    total: number;
    byModel: Record<string, number>;
  };
  errorRate: number;
}

export interface SystemHealthMetrics {
  uptime: number;
  apiLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  databaseConnections: {
    active: number;
    idle: number;
    max: number;
  };
  queueDepth: {
    processing: number;
    pending: number;
    failed: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  errorRate: number;
  requestsPerSecond: number;
}

export interface DashboardSummary {
  timeRange: TimeRange;
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    conversionRate: number;
    trend: number;
  };
  agents: {
    total: number;
    active: number;
    averagePerformance: number;
    topPerformer: {
      id: string;
      name: string;
      conversionRate: number;
    };
  };
  ai: {
    leadsScored: number;
    averageScore: number;
    accuracy: number;
    totalCost: number;
  };
  system: {
    health: "healthy" | "degraded" | "critical";
    uptime: number;
    errorRate: number;
  };
}

export interface LeadVolumeData {
  date: string;
  count: number;
  source?: string;
  insuranceType?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}
