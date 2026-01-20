"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PageSpinner } from "@/components/ui/Spinner";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";
import type { OnboardingRole } from "@/lib/onboarding/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: OnboardingRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const role = useMemo(() => normalizeOnboardingRole(user?.role), [user?.role]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      router.replace("/unauthorized");
    }
  }, [isAuthenticated, isLoading, requiredRoles, role, router]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
