"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from "@/components/ui/Table";
import { organizationService } from "@/services/organization.service";
import type { Organization } from "@/types";
import { Building2, Plus } from "lucide-react";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await organizationService.getOrganizations();
        setOrganizations(response.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Organizations">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900">Organizations</h2>
              <p className="text-secondary-600">Manage organizations and their settings</p>
            </div>
            <Link href="/organizations/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                New Organization
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>Create and edit organizations used for multi-tenant routing.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="text-sm text-error-600 mb-4">{error}</div>}

              {loading ? (
                <div className="text-sm text-secondary-600">Loading...</div>
              ) : organizations.length === 0 ? (
                <EmptyState
                  title="No organizations"
                  description="Create your first organization to get started."
                  icon={<Building2 className="h-12 w-12" />}
                  action={
                    <Link href="/organizations/new">
                      <Button leftIcon={<Plus className="h-4 w-4" />}>Create Organization</Button>
                    </Link>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.domain || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/organizations/${org.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
