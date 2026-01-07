"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function FirstLead1HourGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="First Lead in 1 Hour">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>First Lead in 1 Hour</CardTitle>
              <CardDescription>
                A practical checklist from lead creation/import to first contact attempt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                <Link href="/leads">
                  <Button variant="outline">Open Leads</Button>
                </Link>
              </div>

              <div className="space-y-4 text-sm text-secondary-800 leading-6">
                <section>
                  <h2 className="text-base font-semibold text-secondary-900">0–10 min: Create or import</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Create a lead manually (Leads → Add Lead)</li>
                    <li>Or import a small CSV sample (10 leads) to validate mapping</li>
                    <li>Confirm phone/email fields populated</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">10–25 min: First contact attempt</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Open the lead and call/text/email based on preference</li>
                    <li>Update status to Contacted</li>
                    <li>Log notes: outcome + next attempt time</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">25–45 min: Qualification</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Confirm key needs (coverage type, timing, budget)</li>
                    <li>Move status to Qualified when confirmed</li>
                    <li>Schedule follow-up (quote, underwriting, documents)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">45–60 min: Reporting loop</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Open Analytics and check baseline conversion</li>
                    <li>Generate a simple report for review</li>
                    <li>Repeat daily: speed-to-lead + consistent status updates</li>
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
