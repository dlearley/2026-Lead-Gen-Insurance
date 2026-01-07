"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BestPracticesGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Best Practices">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
              <CardDescription>
                Practical playbooks that consistently improve speed-to-lead and conversion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                <Link href="/analytics">
                  <Button variant="outline">Open Analytics</Button>
                </Link>
              </div>

              <div className="space-y-5 text-sm text-secondary-800 leading-6">
                <section>
                  <h2 className="text-base font-semibold text-secondary-900">1) Speed-to-lead wins</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Target first contact within 5–15 minutes</li>
                    <li>Use notifications + templates to reduce friction</li>
                    <li>Log status updates immediately after each touch</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">2) Follow-up cadence</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Day 0: 3 attempts (call/text/email)</li>
                    <li>Days 1–3: 2 attempts/day</li>
                    <li>Days 4–7: 1 attempt/day + value message</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">3) Clean data = clean reporting</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Standardize note format (Outcome → Next step → Date/time)</li>
                    <li>Use consistent status definitions</li>
                    <li>Fix missing phone/email early</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">4) Weekly manager loop</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Review conversion by agent</li>
                    <li>Review stale leads and reassign</li>
                    <li>Generate a weekly PDF report for coaching</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">5) Onboarding maturity milestones</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Milestone 1: first lead created/imported</li>
                    <li>Milestone 2: first lead contacted within SLA</li>
                    <li>Milestone 3: first qualified lead with next step</li>
                    <li>Milestone 4: weekly analytics/reporting cadence established</li>
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
