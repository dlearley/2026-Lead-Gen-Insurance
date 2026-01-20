"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Access denied">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>You don’t have access to that module</CardTitle>
              <CardDescription>
                Your current role does not have permission to view this page. If you think this is a mistake,
                contact your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard">
                  <Button>Back to Dashboard</Button>
                </Link>
                <Link href="/help">
                  <Button variant="outline">Open Help Center</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
