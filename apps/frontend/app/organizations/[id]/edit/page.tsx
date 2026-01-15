"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { organizationService } from "@/services/organization.service";
import type { Organization } from "@/types";
import type { OrganizationFormValues } from "@/lib/validation/organizations";

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orgId = params?.id;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        setError(null);
        const org = await organizationService.getOrganizationById(orgId);
        setOrganization(org);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organization");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgId]);

  const defaultValues = useMemo(() => {
    if (!organization) return undefined;
    return {
      name: organization.name,
      domain: organization.domain,
    };
  }, [organization]);

  const handleUpdate = async (values: OrganizationFormValues) => {
    if (!orgId) throw new Error("Missing organization id");

    await organizationService.updateOrganization(orgId, {
      name: values.name.trim(),
      domain: values.domain,
    });

    router.push("/organizations");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Edit Organization">
        <Card>
          <CardHeader>
            <CardTitle>Edit Organization</CardTitle>
            <CardDescription>Update organization name and domain.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="text-sm text-error-600 mb-4">{error}</div>}
            {loading ? (
              <div className="text-sm text-secondary-600">Loading...</div>
            ) : (
              <OrganizationForm
                defaultValues={defaultValues}
                onSubmit={handleUpdate}
                submitLabel="Save Changes"
              />
            )}
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
