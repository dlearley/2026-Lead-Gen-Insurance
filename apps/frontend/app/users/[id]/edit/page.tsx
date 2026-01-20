"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserUpdateForm } from "@/components/users/UserForm";
import { userService } from "@/services/user.service";
import type { User } from "@/types";
import type { UserUpdateValues } from "@/lib/validation/users";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await userService.getUserById(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const defaultValues = useMemo(() => {
    if (!user) return undefined;
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    };
  }, [user]);

  const handleUpdate = async (values: UserUpdateValues) => {
    if (!userId) throw new Error("Missing user id");

    await userService.updateUser(userId, {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      role: values.role,
      organizationId: values.organizationId,
    });

    router.push("/users");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Edit User">
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>Update user profile, role, and organization assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="text-sm text-error-600 mb-4">{error}</div>}
            {loading ? (
              <div className="text-sm text-secondary-600">Loading...</div>
            ) : (
              <UserUpdateForm defaultValues={defaultValues} onSubmit={handleUpdate} />
            )}
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
