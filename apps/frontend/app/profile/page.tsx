"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { User, Mail, Building, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { userService } from "@/services/user.service";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || "";
    const last = user?.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });
  }, [user, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    try {
      await userService.updateProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
      await refreshUser();
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      });
    }
  });

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Profile">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert variant={message.type} className="mb-4">
                  {message.text}
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900">
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <p className="text-sm text-secondary-600">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <User className="h-4 w-4 mr-2" />
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      error={errors.firstName?.message}
                      disabled={isSubmitting}
                      {...register("firstName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <User className="h-4 w-4 mr-2" />
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      error={errors.lastName?.message}
                      disabled={isSubmitting}
                      {...register("lastName")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-secondary-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </label>
                  <Input id="email" type="email" value={user?.email || ""} disabled />
                  <p className="text-xs text-secondary-500">Contact support to change your email</p>
                </div>

                {user?.organizationId && (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <Building className="h-4 w-4 mr-2" />
                      Organization ID
                    </label>
                    <Input value={user.organizationId} disabled />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-secondary-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Member Since
                  </label>
                  <Input
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                    disabled
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!user) return;
                      reset({
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                      });
                      setMessage(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
