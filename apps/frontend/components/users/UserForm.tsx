"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
} from "@/lib/validation/users";

const roleOptions = [
  { value: "agent", label: "Agent" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
  { value: "superuser", label: "Superuser" },
];

interface BaseProps {
  submitLabel?: string;
}

interface UserCreateFormProps extends BaseProps {
  defaultValues?: Partial<UserCreateValues>;
  onSubmit: (values: UserCreateValues) => Promise<void>;
}

export function UserCreateForm({ defaultValues, onSubmit, submitLabel = "Create User" }: UserCreateFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "agent",
      password: "",
      confirmPassword: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        email: "",
        firstName: "",
        lastName: "",
        role: "agent",
        password: "",
        confirmPassword: "",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setSubmitError(message);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {submitError && <Alert variant="error">{submitError}</Alert>}

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

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          error={errors.password?.message}
          disabled={isSubmitting}
          autoComplete="new-password"
          {...register("password")}
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          id="role"
          label="Role"
          options={roleOptions}
          error={errors.role?.message}
          disabled={isSubmitting}
          {...register("role")}
        />

        <Input
          id="organizationId"
          label="Organization ID (optional)"
          placeholder="org_123"
          error={errors.organizationId?.message}
          disabled={isSubmitting}
          {...register("organizationId")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface UserUpdateFormProps extends BaseProps {
  defaultValues?: Partial<UserUpdateValues>;
  onSubmit: (values: UserUpdateValues) => Promise<void>;
  emailDisabled?: boolean;
}

export function UserUpdateForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Changes",
  emailDisabled = true,
}: UserUpdateFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "agent",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        email: "",
        firstName: "",
        lastName: "",
        role: "agent",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setSubmitError(message);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {submitError && <Alert variant="error">{submitError}</Alert>}

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

      <Input
        id="email"
        type="email"
        label="Email"
        placeholder="jane@example.com"
        error={errors.email?.message}
        disabled={emailDisabled || isSubmitting}
        autoComplete="email"
        {...register("email")}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          id="role"
          label="Role"
          options={roleOptions}
          error={errors.role?.message}
          disabled={isSubmitting}
          {...register("role")}
        />

        <Input
          id="organizationId"
          label="Organization ID (optional)"
          placeholder="org_123"
          error={errors.organizationId?.message}
          disabled={isSubmitting}
          {...register("organizationId")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
