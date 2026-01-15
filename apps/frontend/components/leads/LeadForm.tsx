"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { LeadFormValues, leadFormSchema } from "@/lib/validation/leads";

const insuranceTypeOptions = [
  { value: "auto", label: "Auto" },
  { value: "home", label: "Home" },
  { value: "life", label: "Life" },
  { value: "health", label: "Health" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface LeadFormProps {
  defaultValues?: Partial<LeadFormValues>;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  submitLabel?: string;
}

export function LeadForm({ defaultValues, onSubmit, submitLabel = "Save Lead" }: LeadFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      priority: "medium",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        priority: "medium",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save lead";
      setSubmitError(message);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {submitError && (
        <Alert variant="error" className="mb-4">
          {submitError}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="firstName"
          label="First Name"
          placeholder="Jane"
          error={errors.firstName?.message}
          disabled={isSubmitting}
          {...register("firstName")}
        />

        <Input
          id="lastName"
          label="Last Name"
          placeholder="Doe"
          error={errors.lastName?.message}
          disabled={isSubmitting}
          {...register("lastName")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="jane@example.com"
          error={errors.email?.message}
          disabled={isSubmitting}
          autoComplete="email"
          {...register("email")}
        />

        <Input
          id="phone"
          label="Phone"
          placeholder="+1 555 555 5555"
          error={errors.phone?.message}
          disabled={isSubmitting}
          {...register("phone")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="company"
          label="Company"
          placeholder="Acme Insurance"
          error={errors.company?.message}
          disabled={isSubmitting}
          {...register("company")}
        />

        <Input
          id="jobTitle"
          label="Job Title"
          placeholder="Owner"
          error={errors.jobTitle?.message}
          disabled={isSubmitting}
          {...register("jobTitle")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Select
          id="insuranceType"
          label="Insurance Type"
          options={insuranceTypeOptions}
          placeholder="Select type"
          error={errors.insuranceType?.message}
          disabled={isSubmitting}
          {...register("insuranceType")}
        />

        <Select
          id="priority"
          label="Priority"
          options={priorityOptions}
          error={errors.priority?.message}
          disabled={isSubmitting}
          {...register("priority")}
        />

        <Input
          id="valueEstimate"
          type="number"
          step="0.01"
          label="Value Estimate"
          placeholder="0"
          error={errors.valueEstimate?.message}
          disabled={isSubmitting}
          {...register("valueEstimate")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="followUpDate"
          type="date"
          label="Follow-up Date"
          error={errors.followUpDate?.message}
          disabled={isSubmitting}
          {...register("followUpDate")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="address"
          label="Address"
          placeholder="123 Main St"
          error={errors.address?.message}
          disabled={isSubmitting}
          {...register("address")}
        />

        <Input
          id="city"
          label="City"
          placeholder="Austin"
          error={errors.city?.message}
          disabled={isSubmitting}
          {...register("city")}
        />

        <Input
          id="state"
          label="State"
          placeholder="TX"
          error={errors.state?.message}
          disabled={isSubmitting}
          {...register("state")}
        />

        <Input
          id="zipCode"
          label="ZIP Code"
          placeholder="78701"
          error={errors.zipCode?.message}
          disabled={isSubmitting}
          {...register("zipCode")}
        />

        <Input
          id="country"
          label="Country"
          placeholder="USA"
          error={errors.country?.message}
          disabled={isSubmitting}
          {...register("country")}
        />
      </div>

      <Textarea
        id="notes"
        label="Notes"
        placeholder="Add any helpful context..."
        error={errors.notes?.message}
        disabled={isSubmitting}
        rows={5}
        {...register("notes")}
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
