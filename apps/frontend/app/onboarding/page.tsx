"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Onboarding">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kickoff</CardTitle>
              <CardDescription>
                Use the checklist for a complete setup, schedule a kickoff call, and watch short tutorials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/onboarding/calls">
                  <Button>Schedule onboarding call</Button>
                </Link>
                <Link href="/training">
                  <Button variant="outline">Watch videos</Button>
                </Link>
                <Link href="/guides">
                  <Button variant="outline">Open quick-start guides</Button>
                </Link>
                <Link href="/help">
                  <Button variant="outline">Help Center</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <OnboardingChecklist />
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
