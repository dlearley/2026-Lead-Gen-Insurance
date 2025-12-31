"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { HelpCenter } from "@/components/help/HelpCenter";

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Help Center">
        <HelpCenter />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
