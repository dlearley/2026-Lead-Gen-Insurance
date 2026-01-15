"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { settingsSchema, type SettingsValues } from "@/lib/validation/settings";

const STORAGE_KEY = "insurance_leads_settings";

export default function SettingsPage() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notifications: {
        emailNotifications: true,
        weeklySummary: true,
      },
      security: {
        mfaEnabled: false,
      },
    },
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = settingsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        reset(parsed.data);
      }
    } catch {
      // ignore
    }
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      setMessage({ type: "success", text: "Settings saved" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    }
  });

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Settings">
        <div className="space-y-6 max-w-2xl">
          {message && <Alert variant={message.type}>{message.text}</Alert>}

          <form onSubmit={onSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Checkbox
                  id="emailNotifications"
                  label="Email notifications"
                  disabled={isSubmitting}
                  {...register("notifications.emailNotifications")}
                />
                <Checkbox
                  id="weeklySummary"
                  label="Weekly summary"
                  disabled={isSubmitting}
                  {...register("notifications.weeklySummary")}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Checkbox
                  id="mfaEnabled"
                  label="Enable multi-factor authentication (MFA)"
                  disabled={isSubmitting}
                  {...register("security.mfaEnabled")}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
