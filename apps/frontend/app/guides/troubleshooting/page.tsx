"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TroubleshootingGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Troubleshooting">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Quick Reference</CardTitle>
              <CardDescription>Fast fixes for the most common onboarding issues.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
                <Link href="/help">
                  <Button variant="outline">Open Help Center</Button>
                </Link>
              </div>

              <div className="space-y-4 text-sm text-secondary-800 leading-6">
                <section className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">I can’t log in</h2>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-secondary-700">
                    <li>Use Forgot Password</li>
                    <li>Check spam/junk folders</li>
                    <li>Confirm your user is active</li>
                  </ul>
                </section>

                <section className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Imported leads are missing fields</h2>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-secondary-700">
                    <li>Confirm CSV headers match the template</li>
                    <li>Remove extra whitespace</li>
                    <li>Normalize phone numbers and state codes</li>
                  </ul>
                </section>

                <section className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Notifications aren’t arriving</h2>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-secondary-700">
                    <li>Verify profile email/phone</li>
                    <li>Check Settings notifications</li>
                    <li>Confirm email deliverability (spam filters)</li>
                  </ul>
                </section>

                <section className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Analytics numbers don’t match expectations</h2>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-secondary-700">
                    <li>Check the time range selector</li>
                    <li>Confirm consistent status updates</li>
                    <li>Ensure you’re using consistent definitions (Qualified vs Converted)</li>
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
