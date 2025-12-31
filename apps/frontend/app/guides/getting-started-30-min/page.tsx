"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function GettingStarted30MinGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Getting Started in 30 Minutes">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started in 30 Minutes</CardTitle>
              <CardDescription>
                Use this as a printable quick-start (File → Print → Save as PDF).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                <Link href="/onboarding">
                  <Button variant="outline">Back to onboarding</Button>
                </Link>
              </div>

              <div className="space-y-4 text-sm text-secondary-800 leading-6">
                <section>
                  <h2 className="text-base font-semibold text-secondary-900">0–5 min: Confirm access</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Log in successfully</li>
                    <li>Open Profile and confirm email + phone</li>
                    <li>Know where Help Center lives (header Help icon)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">5–15 min: Learn the workflow</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Run the product tour from the dashboard</li>
                    <li>Open Leads and practice searching/filtering</li>
                    <li>Open Analytics and switch time ranges</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">15–25 min: Create your first lead</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Create a lead manually (Dashboard → Add New Lead)</li>
                    <li>Update status (New → Contacted)</li>
                    <li>Add a note with next step (call back, quote, document request)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">25–30 min: Set cadence</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Block follow-up time on your calendar</li>
                    <li>Generate a first report (Reports → Generate)</li>
                    <li>Schedule a live onboarding call if you want a guided kickoff</li>
                  </ul>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
