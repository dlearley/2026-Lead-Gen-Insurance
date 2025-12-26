"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/Card";

export default function OrganizationsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Organizations">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-secondary-900">Organization Management</h3>
              <p className="text-secondary-600 mt-2">
                Manage organizations and their settings
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
