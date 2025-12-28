"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/analytics/MetricCard";
import { FieldWorkWidget } from "@/components/leads/FieldWorkWidget";
import { MobileQuickActions } from "@/components/leads/FieldWorkWidget";
import { Target, Users, TrendingUp, FileText, Brain, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";
import { useAnalytics } from "@/hooks/use-analytics";
import { useState, useEffect } from "react";

function DashboardContent() {
  const { data: dashboard, loading } = useAnalytics("7d");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const recentActivity = [
    { id: 1, action: "New lead created", time: "2 minutes ago", user: "John Doe" },
    { id: 2, action: "User registered", time: "15 minutes ago", user: "Jane Smith" },
    { id: 3, action: "Document uploaded", time: "1 hour ago", user: "Bob Johnson" },
    { id: 4, action: "Report generated", time: "3 hours ago", user: "Alice Brown" },
    { id: 5, action: "Settings updated", time: "5 hours ago", user: "System" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Dashboard</h2>
          <p className="text-secondary-600">Welcome back! Here's what's happening today.</p>
        </div>
        <Button>
          <Link href="/leads/new">Add New Lead</Link>
        </Button>
      </div>

      {isMobile && (
        <div className="lg:hidden">
          <FieldWorkWidget compact />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={formatNumber(dashboard?.leads.total || 0)}
          change={dashboard?.leads.trend}
          icon={<Target className="h-6 w-6" />}
          color="bg-primary-500"
          loading={loading}
        />
        <MetricCard
          title="Active Agents"
          value={dashboard?.agents.active || 0}
          icon={<Users className="h-6 w-6" />}
          color="bg-success-500"
          loading={loading}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${(dashboard?.leads.conversionRate || 0).toFixed(1)}%`}
          change={dashboard?.leads.trend}
          icon={<TrendingUp className="h-6 w-6" />}
          color="bg-warning-500"
          loading={loading}
        />
        <MetricCard
          title="AI Accuracy"
          value={`${(dashboard?.ai.accuracy || 0).toFixed(1)}%`}
          icon={<Brain className="h-6 w-6" />}
          color="bg-purple-500"
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-1 xl:col-span-1 hidden lg:block">
          <FieldWorkWidget />
        </div>

        <Card className="lg:col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900">{activity.action}</p>
                    <p className="text-xs text-secondary-500">
                      by {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/leads/new">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Create New Lead
                </Button>
              </Link>
              <Link href="/leads/nearby">
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Nearby Leads
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
              <Link href="/documents/upload">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {isMobile && <MobileQuickActions />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Dashboard">
        <DashboardContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
