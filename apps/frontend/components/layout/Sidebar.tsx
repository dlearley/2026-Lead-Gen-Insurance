"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  FileText,
  Target,
  BarChart3,
  FolderOpen,
  MapPin,
  ClipboardList,
  GraduationCap,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";
import { getAccessibleNavModules } from "@/lib/navigation/modules";
import type { AppModuleKey } from "@/lib/navigation/modules";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  mobileOnly?: boolean;
}

function iconForModule(key: AppModuleKey) {
  switch (key) {
    case "dashboard":
      return <LayoutDashboard className="h-5 w-5" />;
    case "leads":
      return <Target className="h-5 w-5" />;
    case "nearbyLeads":
      return <MapPin className="h-5 w-5" />;
    case "analytics":
      return <BarChart3 className="h-5 w-5" />;
    case "reports":
      return <FolderOpen className="h-5 w-5" />;
    case "users":
      return <Users className="h-5 w-5" />;
    case "organizations":
      return <Building2 className="h-5 w-5" />;
    case "documents":
      return <FileText className="h-5 w-5" />;
    case "settings":
      return <Settings className="h-5 w-5" />;
    case "onboarding":
      return <ClipboardList className="h-5 w-5" />;
    case "training":
      return <GraduationCap className="h-5 w-5" />;
    case "guides":
      return <BookOpen className="h-5 w-5" />;
    case "help":
      return <LifeBuoy className="h-5 w-5" />;
    default:
      return null;
  }
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileMenuOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const role = useMemo(() => normalizeOnboardingRole(user?.role), [user?.role]);

  const navItems = useMemo<NavItem[]>(() => {
    return getAccessibleNavModules(role).map((m) => ({
      label: m.label,
      href: m.href,
      icon: iconForModule(m.key),
      badge: m.nav.badge,
      mobileOnly: m.nav.mobileOnly,
    }));
  }, [role]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const tourId = `nav-${item.href.replace(/\//g, "-").slice(1)}`;

    return (
      <Link
        href={item.href}
        data-tour={tourId}
        onClick={onCloseMobile}
        className={cn(
          "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900"
        )}
      >
        <div className="flex items-center space-x-3">
          <div className={cn(isActive ? "text-primary-600" : "text-secondary-500")}>{item.icon}</div>
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <aside
        data-tour="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 px-3 py-6 overflow-y-auto">
            <nav className="space-y-1">
              {navItems
                .filter((item) => !item.mobileOnly || isMobile)
                .map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
            </nav>
          </div>

          <div className="p-4 border-t border-secondary-200">
            <div className="bg-secondary-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-secondary-900 mb-2">Need Help?</h4>
              <p className="text-xs text-secondary-600 mb-3">Check our documentation or contact support.</p>
              <Link
                href="/help"
                onClick={onCloseMobile}
                className="block w-full text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                View Documentation →
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-20 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
    </>
  );
}
