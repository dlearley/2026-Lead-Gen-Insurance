"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Breadcrumb } from "./Breadcrumb";
import { HelpCenterModal } from "@/components/help/HelpCenterModal";
import { ProductTourOverlay } from "@/components/onboarding/ProductTourOverlay";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AuthenticatedLayout({ children, title }: AuthenticatedLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = useMemo(() => normalizeOnboardingRole(user?.role), [user?.role]);

  const { activeTour, startTour, tourCompletedAtByRole, tourSkippedAtByRole } = useOnboardingStore();

  useEffect(() => {
    if (!user) return;
    if (pathname !== "/dashboard") return;
    if (activeTour) return;

    const completedAt = tourCompletedAtByRole[role];
    const skippedAt = tourSkippedAtByRole[role];
    if (completedAt || skippedAt) return;

    const timer = window.setTimeout(() => startTour(role), 800);
    return () => window.clearTimeout(timer);
  }, [user, pathname, activeTour, role, startTour, tourCompletedAtByRole, tourSkippedAtByRole]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header
        onMobileMenuToggle={handleMobileMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex">
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-0">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Breadcrumb className="mb-2" />
              {title && (
                <h1 className="text-2xl font-bold text-secondary-900">{title}</h1>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>

      <HelpCenterModal />
      <ProductTourOverlay />
    </div>
  );
}
