"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Target, Users, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";

function DashboardContent() {
  const stats = [
    {
      title: "Total Leads",
      value: "1,234",
      change: "+12.5%",
      icon: <Target className="h-6 w-6" />,
      color: "bg-primary-500",
    },
    {
      title: "Active Users",
      value: "89",
      change: "+3.2%",
      icon: <Users className="h-6 w-6" />,
      color: "bg-success-500",
    },
    {
      title: "Conversion Rate",
      value: "24.5%",
      change: "+5.1%",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-warning-500",
    },
    {
      title: "Documents",
      value: "456",
      change: "+8.3%",
      icon: <FileText className="h-6 w-6" />,
      color: "bg-secondary-500",
    },
  ];

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <div className="text-white">{stat.icon}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-900">{stat.value}</div>
              <p className="text-xs text-success-600 mt-1">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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

        <Card>
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
              <Link href="/users/new">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Add Team Member
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
