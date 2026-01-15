"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { LeadForm } from "@/components/leads/LeadForm";
import { useLeadDetail, useLeadMutations } from "@/hooks/use-leads";
import type { LeadUpdate } from "@/types/leads";
import type { LeadFormValues } from "@/lib/validation/leads";

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params?.id;

  const { lead, loading } = useLeadDetail(leadId || null);
  const { updateLead } = useLeadMutations();

  const defaultValues = useMemo(() => {
    if (!lead) return undefined;
    return {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email || "",
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      insuranceType: lead.insuranceType,
      priority: lead.priority,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zipCode: lead.zipCode,
      country: lead.country,
      notes: lead.notes,
      valueEstimate: lead.valueEstimate,
      followUpDate: lead.followUpDate,
    };
  }, [lead]);

  const handleUpdate = async (values: LeadFormValues) => {
    if (!leadId) {
      throw new Error("Missing lead id");
    }

    const payload: LeadUpdate = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone,
      company: values.company,
      jobTitle: values.jobTitle,
      insuranceType: values.insuranceType,
      priority: values.priority,
      notes: values.notes,
      valueEstimate: values.valueEstimate,
      followUpDate: values.followUpDate,
    };

    const updated = await updateLead(leadId, payload as any);
    if (!updated) {
      throw new Error("Failed to update lead");
    }

    router.push("/leads");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Edit Lead">
        <Card>
          <CardHeader>
            <CardTitle>Edit Lead</CardTitle>
            <CardDescription>Update lead details and follow-up information.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-secondary-600">Loading...</div>}
            {!loading && <LeadForm defaultValues={defaultValues} onSubmit={handleUpdate} submitLabel="Save Changes" />}
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
