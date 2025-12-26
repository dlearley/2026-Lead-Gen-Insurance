import { useState, useEffect, useCallback } from "react";
import { analyticsService } from "@/services/analytics.service";
import type {
  DashboardSummary,
  LeadFunnelMetrics,
  AgentPerformanceMetrics,
  AIModelMetrics,
  SystemHealthMetrics,
  TimeRange,
} from "@/types/analytics";

export function useAnalytics(timeRange: TimeRange = "30d") {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getDashboardSummary(timeRange);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data: dashboardData,
    loading,
    error,
    refetch: fetchDashboard,
  };
}

export function useLeadFunnel(timeRange: TimeRange = "30d") {
  const [data, setData] = useState<LeadFunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getLeadFunnelMetrics(timeRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch funnel data");
      console.error("Error fetching funnel:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAgentLeaderboard(timeRange: TimeRange = "30d", limit = 10) {
  const [data, setData] = useState<AgentPerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getAgentLeaderboard({ timeRange, limit });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent data");
      console.error("Error fetching agents:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAIMetrics(timeRange: TimeRange = "30d") {
  const [data, setData] = useState<AIModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getAIModelMetrics(timeRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI metrics");
      console.error("Error fetching AI metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useSystemHealth() {
  const [data, setData] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getSystemHealth();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch system health");
      console.error("Error fetching system health:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll system health every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
