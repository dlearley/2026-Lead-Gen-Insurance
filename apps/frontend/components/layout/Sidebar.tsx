"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  mobileOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Leads",
    href: "/leads",
    icon: <Target className="h-5 w-5" />,
    badge: "New",
  },
  {
    label: "Nearby Leads",
    href: "/leads/nearby",
    icon: <MapPin className="h-5 w-5" />,
    mobileOnly: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileMenuOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    
    return (
      <Link
        href={item.href}
        onClick={onCloseMobile}
        className={cn(
          "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900"
        )}
      >
        <div className="flex items-center space-x-3">
          <div className={cn(isActive ? "text-primary-600" : "text-secondary-500")}>
            {item.icon}
          </div>
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 px-3 py-6 overflow-y-auto">
            <nav className="space-y-1">
              {navItems
                .filter(item => !item.mobileOnly || isMobile)
                .map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
            </nav>
          </div>

          <div className="p-4 border-t border-secondary-200">
            <div className="bg-secondary-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-secondary-900 mb-2">
                Need Help?
              </h4>
              <p className="text-xs text-secondary-600 mb-3">
                Check our documentation or contact support.
              </p>
              <button className="w-full text-xs font-medium text-primary-600 hover:text-primary-700">
                View Documentation →
              </button>
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
