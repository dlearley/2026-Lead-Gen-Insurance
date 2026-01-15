"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  organizationFormSchema,
  type OrganizationFormValues,
} from "@/lib/validation/organizations";

interface OrganizationFormProps {
  defaultValues?: Partial<OrganizationFormValues>;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
  submitLabel?: string;
}

export function OrganizationForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Organization",
}: OrganizationFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: "",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save organization";
      setSubmitError(message);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <Input
        id="name"
        label="Organization Name"
        placeholder="Acme Insurance"
        error={errors.name?.message}
        disabled={isSubmitting}
        {...register("name")}
      />

      <Input
        id="domain"
        label="Domain (optional)"
        placeholder="acme.com"
        error={errors.domain?.message}
        disabled={isSubmitting}
        {...register("domain")}
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
