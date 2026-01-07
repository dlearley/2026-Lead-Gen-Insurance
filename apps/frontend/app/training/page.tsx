"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { VideoLibrary } from "@/components/training/VideoLibrary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";

export default function TrainingPage() {
  const user = useAuthStore((s) => s.user);
  const role = useMemo(() => normalizeOnboardingRole(user?.role), [user?.role]);
  const startTour = useOnboardingStore((s) => s.startTour);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Training">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Library</CardTitle>
              <CardDescription>
                Short, role-friendly videos with transcripts. Pair these with the onboarding checklist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/onboarding">
                  <Button>Go to onboarding checklist</Button>
                </Link>
                <Link href="/guides">
                  <Button variant="outline">Quick-start guides</Button>
                </Link>
                <Link href="/help">
                  <Button variant="outline">Help Center</Button>
                </Link>
                <Button variant="outline" onClick={() => startTour(role)}>
                  Replay product tour
                </Button>
              </div>
            </CardContent>
          </Card>

          <VideoLibrary />
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
