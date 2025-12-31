"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MetricCard } from "@/components/analytics/MetricCard";
import { SimpleBarChart } from "@/components/analytics/SimpleBarChart";
import { Target, Users, TrendingUp, Brain, DollarSign, Clock } from "lucide-react";
import { useAnalytics, useLeadFunnel, useAgentLeaderboard, useAIMetrics } from "@/hooks/use-analytics";
import type { TimeRange } from "@/types/analytics";

function AnalyticsDashboardContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: dashboard, loading: dashboardLoading } = useAnalytics(timeRange);
  const { data: funnel, loading: funnelLoading } = useLeadFunnel(timeRange);
  const { data: agents, loading: agentsLoading } = useAgentLeaderboard(timeRange, 5);
  const { data: aiMetrics, loading: aiLoading } = useAIMetrics(timeRange);

  const timeRangeOptions = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "1y", label: "Last Year" },
    { value: "all", label: "All Time" },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Prepare funnel data for chart
  const funnelChartData = funnel
    ? [
        { label: "New", value: funnel.byStage.new, color: "bg-blue-500" },
        { label: "Contacted", value: funnel.byStage.contacted, color: "bg-indigo-500" },
        { label: "Qualified", value: funnel.byStage.qualified, color: "bg-purple-500" },
        { label: "Proposal", value: funnel.byStage.proposal, color: "bg-pink-500" },
        { label: "Closed", value: funnel.byStage.closed, color: "bg-green-500" },
      ]
    : [];

  // Prepare agent performance data for chart
  const agentChartData = agents.map((agent) => ({
    label: agent.agentName,
    value: agent.conversionRate,
    color: "bg-primary-500",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Analytics Dashboard</h2>
          <p className="text-secondary-600">Track performance and insights across your platform</p>
        </div>
        <div data-tour="analytics-time-range" className="w-48">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            options={timeRangeOptions}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={formatNumber(dashboard?.leads.total || 0)}
          change={dashboard?.leads.trend}
          icon={<Target className="h-6 w-6" />}
          color="bg-blue-500"
          loading={dashboardLoading}
        />
        <MetricCard
          title="Conversion Rate"
          value={formatPercentage(dashboard?.leads.conversionRate || 0)}
          change={dashboard?.leads.trend}
          icon={<TrendingUp className="h-6 w-6" />}
          color="bg-green-500"
          loading={dashboardLoading}
        />
        <MetricCard
          title="Active Agents"
          value={dashboard?.agents.active || 0}
          change={undefined}
          icon={<Users className="h-6 w-6" />}
          color="bg-purple-500"
          loading={dashboardLoading}
        />
        <MetricCard
          title="AI Accuracy"
          value={formatPercentage(dashboard?.ai.accuracy || 0)}
          change={undefined}
          icon={<Brain className="h-6 w-6" />}
          color="bg-pink-500"
          loading={dashboardLoading}
        />
      </div>

      {/* Lead Funnel and Agent Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleBarChart
          title="Lead Funnel"
          description="Distribution of leads across pipeline stages"
          data={funnelChartData}
          valueFormatter={formatNumber}
          loading={funnelLoading}
        />

        <SimpleBarChart
          title="Top Agents"
          description="Best performing agents by conversion rate"
          data={agentChartData}
          valueFormatter={formatPercentage}
          loading={agentsLoading}
        />
      </div>

      {/* AI and System Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Model Performance
            </CardTitle>
            <CardDescription>Machine learning metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-secondary-200 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Leads Scored</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatNumber(aiMetrics?.totalScored || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Avg Score</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {aiMetrics?.averageScore.toFixed(1) || "0.0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Accuracy</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatPercentage(aiMetrics?.scoringAccuracy || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Error Rate</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatPercentage(aiMetrics?.errorRate || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Times
            </CardTitle>
            <CardDescription>Latency percentiles</CardDescription>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-secondary-200 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">P50 (Median)</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatDuration(aiMetrics?.modelLatency.p50 || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">P95</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatDuration(aiMetrics?.modelLatency.p95 || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">P99</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatDuration(aiMetrics?.modelLatency.p99 || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              AI Costs
            </CardTitle>
            <CardDescription>API usage and costs</CardDescription>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-secondary-200 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Total Cost</span>
                  <span className="text-sm font-semibold text-secondary-900">
                    {formatCurrency(aiMetrics?.apiCosts.total || 0)}
                  </span>
                </div>
                {aiMetrics?.apiCosts.byModel &&
                  Object.entries(aiMetrics.apiCosts.byModel).map(([model, cost]) => (
                    <div key={model} className="flex justify-between">
                      <span className="text-sm text-secondary-600 capitalize">{model}</span>
                      <span className="text-sm font-semibold text-secondary-900">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      {funnel && !funnelLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Funnel Conversion Rates</CardTitle>
            <CardDescription>Stage-to-stage conversion percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Contact Rate</div>
                <div className="text-2xl font-bold text-secondary-900">
                  {formatPercentage(funnel.conversionRates.contactedRate)}
                </div>
              </div>
              <div className="text-center p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Qualification Rate</div>
                <div className="text-2xl font-bold text-secondary-900">
                  {formatPercentage(funnel.conversionRates.qualifiedRate)}
                </div>
              </div>
              <div className="text-center p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Proposal Rate</div>
                <div className="text-2xl font-bold text-secondary-900">
                  {formatPercentage(funnel.conversionRates.proposalRate)}
                </div>
              </div>
              <div className="text-center p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm text-secondary-600 mb-1">Close Rate</div>
                <div className="text-2xl font-bold text-secondary-900">
                  {formatPercentage(funnel.conversionRates.closedRate)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Analytics">
        <AnalyticsDashboardContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
