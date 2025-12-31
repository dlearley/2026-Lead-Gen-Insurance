"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function IntegrationSetupGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Integration Setup">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Setup</CardTitle>
              <CardDescription>
                A lightweight checklist to connect lead sources and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                <Link href="/settings">
                  <Button variant="outline">Open Settings</Button>
                </Link>
              </div>

              <div className="space-y-4 text-sm text-secondary-800 leading-6">
                <section>
                  <h2 className="text-base font-semibold text-secondary-900">1) Identify lead sources</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Website form(s)</li>
                    <li>Lead vendors / marketplaces</li>
                    <li>Manual entry and CSV imports</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">2) Define required fields</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Name, phone, email</li>
                    <li>State/ZIP for routing</li>
                    <li>Insurance type</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">3) Validate notifications</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Ensure each user has correct email/phone</li>
                    <li>Send a test notification (new lead)</li>
                    <li>Confirm deliverability (spam filters, SMS provider)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">4) Run a test lead</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Create/import one lead</li>
                    <li>Confirm it appears in Leads</li>
                    <li>Confirm an agent can contact + update status</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-base font-semibold text-secondary-900">Troubleshooting</h2>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Missing fields after import: check CSV headers and formatting</li>
                    <li>No notifications: verify profile + settings</li>
                    <li>Wrong routing: confirm geo and specialization inputs</li>
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
