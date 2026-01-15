"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { userService } from "@/services/user.service";
import type { User } from "@/types";
import { Plus, Users as UsersIcon } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await userService.getUsers();
        setUsers(response.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Users">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900">Users</h2>
              <p className="text-secondary-600">Manage team members and user accounts</p>
            </div>
            <Link href="/users/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>New User</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Create and edit user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="text-sm text-error-600 mb-4">{error}</div>}

              {loading ? (
                <div className="text-sm text-secondary-600">Loading...</div>
              ) : users.length === 0 ? (
                <EmptyState
                  title="No users"
                  description="Create your first user to get started."
                  icon={<UsersIcon className="h-12 w-12" />}
                  action={
                    <Link href="/users/new">
                      <Button leftIcon={<Plus className="h-4 w-4" />}>Create User</Button>
                    </Link>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/users/${user.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
