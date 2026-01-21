// ========================================
// ANALYTICS TYPES
// ========================================

import type { InsuranceType } from './scoring.js';
export type LeadStatus = 'received' | 'processing' | 'qualified' | 'routed' | 'converted' | 'rejected';

// Lead Funnel Metrics
export interface LeadFunnelMetrics {
  totalLeads: number;
  received: number;
  processing: number;
  qualified: number;
  routed: number;
  converted: number;
  rejected: number;
  conversionRate: number;
  averageProcessingTime: number;
  stageDurations: {
    receivedToProcessing: number;
    processingToQualified: number;
    qualifiedToRouted: number;
    routedToConverted: number;
  };
  byInsuranceType: Record<InsuranceType, number>;
  bySource: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
}

// Agent Performance Metrics
export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalAssigned: number;
  accepted: number;
  rejected: number;
  pending: number;
  converted: number;
  conversionRate: number;
  averageResponseTime: number;
  averageHandlingTime: number;
  qualityScore: number;
  customerSatisfaction: number;
  revenueGenerated: number;
  trend: Array<{ date: string; conversions: number; revenue: number }>;
}

// Agent Leaderboard Entry
export interface AgentLeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  totalConverted: number;
  conversionRate: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  qualityScore: number;
}

// AI Model Metrics
export interface AIModelMetrics {
  modelName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  averageCost: number;
  totalCost: number;
  accuracyScore: number;
  precision: number;
  recall: number;
  f1Score: number;
  scoringDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  trend: Array<{ date: string; latency: number; accuracy: number }>;
}

// AI Processing Statistics
export interface AIProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  averageProcessingTime: number;
  byInsuranceType: Record<InsuranceType, { count: number; avgTime: number }>;
  enrichmentStats: {
    enriched: number;
    failed: number;
    averageEnrichmentTime: number;
  };
  embeddingStats: {
    generated: number;
    stored: number;
    averageGenerationTime: number;
  };
}

// System Health Metrics
export interface SystemHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    api: ServiceHealth;
    dataService: ServiceHealth;
    orchestrator: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
    neo4j: ServiceHealth;
    qdrant: ServiceHealth;
    nats: ServiceHealth;
  };
  performance: {
    apiResponseTime: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
    };
    databaseQueryTime: {
      average: number;
      p50: number;
      p95: number;
    };
    queueDepth: {
      leadIngestion: number;
      aiProcessing: number;
      notifications: number;
    };
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastChecked: string;
  error?: string;
}

// Dashboard Summary
export interface DashboardSummary {
  period: 'day' | 'week' | 'month';
  generatedAt: string;
  overview: {
    totalLeads: number;
    totalConversions: number;
    conversionRate: number;
    averageScore: number;
    totalRevenue: number;
  };
  leadMetrics: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    trend: number;
  };
  topPerformingAgents: AgentLeaderboardEntry[];
  recentLeads: Array<{
    id: string;
    source: string;
    qualityScore: number;
    status: LeadStatus;
    createdAt: string;
  }>;
  systemStatus: SystemHealthMetrics['status'];
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

// Event Tracking Types
export interface AnalyticsEvent {
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
  source: string;
}

export interface LeadTrackingEvent {
  leadId: string;
  previousStatus: LeadStatus;
  newStatus: LeadStatus;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTrackingEvent {
  agentId: string;
  eventType: 'assignment' | 'acceptance' | 'rejection' | 'conversion';
  leadId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AIPerformanceEvent {
  model: string;
  operation: string;
  latency: number;
  success: boolean;
  error?: string;
  cost?: number;
  timestamp: string;
}

// Query Parameters
export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  insuranceType?: InsuranceType;
  source?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface TrendQueryParams {
  metric: string;
  period: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}
