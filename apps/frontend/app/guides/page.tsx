"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { quickStartGuides } from "@/lib/guides/guides";

export default function GuidesIndexPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const guides = useMemo(() => {
    if (!q) return quickStartGuides;
    return quickStartGuides.filter((g) => {
      const haystack = `${g.title} ${g.description} ${g.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [q]);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Quick-start Guides">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Searchable Guide Index</CardTitle>
              <CardDescription>
                Open a guide, print/save as PDF, and use the quick reference cards during calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-lg">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guides (e.g., first lead, integrations)…"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="text-base">{g.title}</CardTitle>
                  <CardDescription>
                    ~{g.estimatedMinutes} min • {g.tags.map((t) => `#${t}`).join(" ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-secondary-700 mb-4">{g.description}</p>
                  <Link href={g.href}>
                    <Button>Open guide</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
