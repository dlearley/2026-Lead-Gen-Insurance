"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Clock,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

function AnalyticsContent() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("leads");
  const [loading, setLoading] = useState(false);

  const { data: analytics, refetch } = useAnalytics(timeRange);

  const timeRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ];

  const metricOptions = [
    { value: "leads", label: "Lead Performance" },
    { value: "agents", label: "Agent Performance" },
    { value: "revenue", label: "Revenue Analytics" },
    { value: "conversion", label: "Conversion Funnel" },
    { value: "ai", label: "AI Model Performance" },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  const refreshData = async () => {
    setLoading(true);
    await refetch();
    setLoading(false);
  };

  const kpiCards = [
    {
      title: "Total Leads",
      value: formatNumber(analytics?.leads?.total || 0),
      change: analytics?.leads?.trend || 0,
      icon: <Target className="h-6 w-6" />,
      color: "bg-blue-500",
      description: "New leads generated"
    },
    {
      title: "Conversion Rate",
      value: formatPercentage(analytics?.leads?.conversionRate || 0),
      change: analytics?.leads?.conversionTrend || 0,
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-green-500",
      description: "Lead to customer conversion"
    },
    {
      title: "Active Agents",
      value: analytics?.agents?.active || 0,
      change: analytics?.agents?.trend || 0,
      icon: <Users className="h-6 w-6" />,
      color: "bg-purple-500",
      description: "Currently active agents"
    },
    {
      title: "Revenue",
      value: `$${formatNumber(analytics?.revenue?.total || 0)}`,
      change: analytics?.revenue?.trend || 0,
      icon: <DollarSign className="h-6 w-6" />,
      color: "bg-yellow-500",
      description: "Total revenue generated"
    },
    {
      title: "Avg Response Time",
      value: `${analytics?.performance?.avgResponseTime || 0}h`,
      change: analytics?.performance?.responseTrend || 0,
      icon: <Clock className="h-6 w-6" />,
      color: "bg-red-500",
      description: "Average agent response time"
    },
    {
      title: "AI Accuracy",
      value: formatPercentage(analytics?.ai?.accuracy || 0),
      change: analytics?.ai?.trend || 0,
      icon: <BarChart3 className="h-6 w-6" />,
      color: "bg-indigo-500",
      description: "AI model prediction accuracy"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Analytics Dashboard</h2>
          <p className="text-secondary-600">Track performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={timeRangeOptions}
            className="w-40"
          />
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-secondary-900 mt-1">{kpi.value}</p>
                  <div className="flex items-center mt-2">
                    {kpi.change > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(kpi.change)}%
                    </span>
                    <span className="text-sm text-secondary-500 ml-1">vs last period</span>
                  </div>
                  <p className="text-xs text-secondary-500 mt-1">{kpi.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.color}`}>
                  <div className="text-white">
                    {kpi.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Performance Trends</CardTitle>
            <CardDescription>Lead generation and conversion over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600">Chart visualization would go here</p>
                <p className="text-sm text-secondary-500">Lead trends, conversion rates, source analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Top performing agents and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <Users className="h-12 w-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600">Agent performance charts</p>
                <p className="text-sm text-secondary-500">Response times, conversion rates, rankings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Revenue breakdown and projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600">Revenue visualization</p>
                <p className="text-sm text-secondary-500">Monthly revenue, growth trends, forecasts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Model Performance</CardTitle>
            <CardDescription>AI accuracy and prediction metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
              <div className="text-center">
                <Eye className="h-12 w-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600">AI performance metrics</p>
                <p className="text-sm text-secondary-500">Model accuracy, prediction confidence, optimization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
          <CardDescription>Comprehensive data breakdown and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input placeholder="Search analytics..." className="w-64" />
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              options={metricOptions}
              className="w-48"
            />
          </div>
          
          <div className="border border-secondary-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-secondary-700">Metric</th>
                  <th className="text-left p-3 text-sm font-medium text-secondary-700">Current</th>
                  <th className="text-left p-3 text-sm font-medium text-secondary-700">Previous</th>
                  <th className="text-left p-3 text-sm font-medium text-secondary-700">Change</th>
                  <th className="text-left p-3 text-sm font-medium text-secondary-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-secondary-200">
                  <td className="p-3 text-sm text-secondary-900">Total Leads</td>
                  <td className="p-3 text-sm text-secondary-900">{analytics?.leads?.total || 0}</td>
                  <td className="p-3 text-sm text-secondary-600">{(analytics?.leads?.total || 0) * 0.85}</td>
                  <td className="p-3 text-sm text-green-600">+15%</td>
                  <td className="p-3"><ArrowUp className="h-4 w-4 text-green-500" /></td>
                </tr>
                <tr className="border-t border-secondary-200">
                  <td className="p-3 text-sm text-secondary-900">Conversion Rate</td>
                  <td className="p-3 text-sm text-secondary-900">{formatPercentage(analytics?.leads?.conversionRate || 0)}</td>
                  <td className="p-3 text-sm text-secondary-600">18.5%</td>
                  <td className="p-3 text-sm text-green-600">+2.3%</td>
                  <td className="p-3"><ArrowUp className="h-4 w-4 text-green-500" /></td>
                </tr>
                <tr className="border-t border-secondary-200">
                  <td className="p-3 text-sm text-secondary-900">Avg Response Time</td>
                  <td className="p-3 text-sm text-secondary-900">{analytics?.performance?.avgResponseTime || 0}h</td>
                  <td className="p-3 text-sm text-secondary-600">2.8h</td>
                  <td className="p-3 text-sm text-red-600">-0.3h</td>
                  <td className="p-3"><ArrowDown className="h-4 w-4 text-red-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Analytics">
        <AnalyticsContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}