"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmPasswordReset, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or expired reset link");
    }
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or expired reset link");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const result = await confirmPasswordReset(token, formData.password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else if (result.error) {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success-600" />
                </div>
                <h1 className="text-2xl font-bold text-secondary-900 mb-2">Password Reset</h1>
                <p className="text-secondary-600">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900">Set New Password</h1>
          <p className="text-secondary-600 mt-2">Enter your new password below</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={cn("input", errors.password && "input-error")}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.password && <p className="text-sm text-error-600">{errors.password}</p>}
              </div>

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
                disabled={isLoading}
                autoComplete="new-password"
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
