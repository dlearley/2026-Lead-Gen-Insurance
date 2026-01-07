"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function QuickReferenceGuidePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Quick Reference Cards">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Printable Quick Reference Cards</CardTitle>
              <CardDescription>Print these as a one-page cheat sheet (or save as PDF).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Lead status cheat sheet</h2>
                  <ul className="mt-2 text-sm text-secondary-700 space-y-1">
                    <li><span className="font-medium">New</span>: not yet contacted</li>
                    <li><span className="font-medium">Contacted</span>: first attempt made</li>
                    <li><span className="font-medium">Qualified</span>: needs confirmed + next step agreed</li>
                    <li><span className="font-medium">Converted</span>: policy bound</li>
                    <li><span className="font-medium">Lost</span>: not pursuing</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">5-minute lead triage</h2>
                  <ol className="mt-2 list-decimal pl-5 text-sm text-secondary-700 space-y-1">
                    <li>Open lead</li>
                    <li>Confirm contact fields</li>
                    <li>Attempt contact</li>
                    <li>Update status</li>
                    <li>Log next step + time</li>
                  </ol>
                </div>

                <div className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Call opener (example)</h2>
                  <p className="mt-2 text-sm text-secondary-700">
                    “Hi {"{name}"}, this is {"{agent}"}. You requested info about {"{type}"} coverage.\n
                    I can help with a quick quote — do you have 2 minutes right now?”
                  </p>
                </div>

                <div className="rounded-xl border border-secondary-200 p-4">
                  <h2 className="font-semibold text-secondary-900">Follow-up note format</h2>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-secondary-700">
Outcome: Left voicemail
Next step: Text in 2 hours
Time: Today 3:30pm
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
