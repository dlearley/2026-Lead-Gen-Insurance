import apiClient from "@/lib/api-client";
import type {
  DashboardSummary,
  LeadFunnelMetrics,
  AgentPerformanceMetrics,
  AIModelMetrics,
  SystemHealthMetrics,
  TimeRange,
} from "@/types/analytics";

class AnalyticsService {
  /**
   * Get dashboard summary with key KPIs
   */
  async getDashboardSummary(timeRange?: TimeRange): Promise<DashboardSummary> {
    const params = timeRange ? { timeRange } : {};
    return apiClient.get<DashboardSummary>("/api/v1/analytics/dashboard", { params });
  }

  /**
   * Get lead funnel metrics
   */
  async getLeadFunnelMetrics(timeRange?: TimeRange): Promise<LeadFunnelMetrics> {
    const params = timeRange ? { timeRange } : {};
    return apiClient.get<LeadFunnelMetrics>("/api/v1/analytics/leads/funnel", { params });
  }

  /**
   * Get lead volume by time period
   */
  async getLeadVolume(params: {
    timeRange?: TimeRange;
    source?: string;
    insuranceType?: string;
  }): Promise<Array<{ date: string; count: number }>> {
    return apiClient.get("/api/v1/analytics/leads/volume", { params });
  }

  /**
   * Get agent performance leaderboard
   */
  async getAgentLeaderboard(params: {
    limit?: number;
    timeRange?: TimeRange;
  }): Promise<AgentPerformanceMetrics[]> {
    return apiClient.get("/api/v1/analytics/agents/leaderboard", { params });
  }

  /**
   * Get individual agent performance metrics
   */
  async getAgentPerformance(
    agentId: string,
    timeRange?: TimeRange
  ): Promise<AgentPerformanceMetrics> {
    const params = timeRange ? { timeRange } : {};
    return apiClient.get(`/api/v1/analytics/agents/${agentId}/performance`, { params });
  }

  /**
   * Get AI model metrics
   */
  async getAIModelMetrics(timeRange?: TimeRange): Promise<AIModelMetrics> {
    const params = timeRange ? { timeRange } : {};
    return apiClient.get<AIModelMetrics>("/api/v1/analytics/ai/metrics", { params });
  }

  /**
   * Get AI processing statistics
   */
  async getAIProcessingStats(timeRange?: TimeRange): Promise<{
    totalProcessed: number;
    averageLatency: number;
    successRate: number;
    costByModel: Record<string, number>;
  }> {
    const params = timeRange ? { timeRange } : {};
    return apiClient.get("/api/v1/analytics/ai/processing", { params });
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    return apiClient.get<SystemHealthMetrics>("/api/v1/analytics/system/health");
  }

  /**
   * Track custom analytics event
   */
  async trackEvent(event: string, data: Record<string, unknown>): Promise<void> {
    return apiClient.post(`/api/v1/analytics/track/${event}`, data);
  }
}

export const analyticsService = new AnalyticsService();
