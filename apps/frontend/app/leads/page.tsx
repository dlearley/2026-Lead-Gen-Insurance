"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/Card";

export default function LeadsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Leads">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-secondary-900">Lead Management</h3>
              <p className="text-secondary-600 mt-2">
                This feature is coming in Phase 1.5
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
