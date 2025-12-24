"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { User, Mail, Building, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { userService } from "@/services/user.service";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organizationId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        organizationId: user.organizationId || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await userService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      await refreshUser();
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update profile" });
    } finally {
      setIsLoading(false);
    }
  };

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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {formData.firstName?.[0]}{formData.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900">
                      {formData.firstName} {formData.lastName}
                    </h3>
                    <p className="text-sm text-secondary-600">{formData.email}</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <User className="h-4 w-4 mr-2" />
                      First Name
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <User className="h-4 w-4 mr-2" />
                      Last Name
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-secondary-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    disabled={true}
                  />
                  <p className="text-xs text-secondary-500">Contact support to change your email</p>
                </div>

                {user?.organizationId && (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-secondary-700">
                      <Building className="h-4 w-4 mr-2" />
                      Organization ID
                    </label>
                    <Input
                      value={formData.organizationId}
                      disabled={true}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-secondary-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Member Since
                  </label>
                  <Input
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                    disabled={true}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (user) {
                        setFormData({
                          firstName: user.firstName || "",
                          lastName: user.lastName || "",
                          email: user.email || "",
                          organizationId: user.organizationId || "",
                        });
                      }
                      setMessage(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading}>
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
