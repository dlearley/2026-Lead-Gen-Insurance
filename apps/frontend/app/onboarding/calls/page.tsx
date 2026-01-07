"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { OnboardingCallScheduler } from "@/components/onboarding/OnboardingCallScheduler";

export default function OnboardingCallsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Onboarding Calls">
        <OnboardingCallScheduler />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
