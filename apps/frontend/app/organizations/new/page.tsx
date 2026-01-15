"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { organizationService } from "@/services/organization.service";
import type { OrganizationFormValues } from "@/lib/validation/organizations";

export default function NewOrganizationPage() {
  const router = useRouter();

  const handleCreate = async (values: OrganizationFormValues) => {
    await organizationService.createOrganization({
      name: values.name.trim(),
      domain: values.domain,
    });

    router.push("/organizations");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="New Organization">
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>Add a new organization for multi-tenant access control.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationForm onSubmit={handleCreate} submitLabel="Create Organization" />
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
