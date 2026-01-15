"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { LeadForm } from "@/components/leads/LeadForm";
import { useLeadMutations } from "@/hooks/use-leads";
import type { LeadCreate } from "@/types/leads";
import type { LeadFormValues } from "@/lib/validation/leads";

export default function NewLeadPage() {
  const router = useRouter();
  const { createLead } = useLeadMutations();

  const handleCreate = async (values: LeadFormValues) => {
    const payload: LeadCreate = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone,
      company: values.company,
      jobTitle: values.jobTitle,
      insuranceType: values.insuranceType,
      priority: values.priority,
      address: values.address,
      city: values.city,
      state: values.state,
      zipCode: values.zipCode,
      country: values.country,
      notes: values.notes,
      valueEstimate: values.valueEstimate,
    };

    const created = await createLead(payload as any);
    if (!created) {
      throw new Error("Failed to create lead");
    }

    router.push("/leads");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="New Lead">
        <Card>
          <CardHeader>
            <CardTitle>Create Lead</CardTitle>
            <CardDescription>Capture lead details for follow-up and routing.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadForm onSubmit={handleCreate} submitLabel="Create Lead" />
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
