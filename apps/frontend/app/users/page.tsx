"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/Card";

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Users">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-secondary-900">User Management</h3>
              <p className="text-secondary-600 mt-2">
                Manage team members and user accounts
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
