"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserCreateForm } from "@/components/users/UserForm";
import { userService } from "@/services/user.service";
import type { UserCreateValues } from "@/lib/validation/users";

export default function NewUserPage() {
  const router = useRouter();

  const handleCreate = async (values: UserCreateValues) => {
    await userService.createUser({
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      role: values.role,
      organizationId: values.organizationId,
      password: values.password,
    });

    router.push("/users");
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="New User">
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Create a new user account and assign role and organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserCreateForm onSubmit={handleCreate} />
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
