"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split("/").filter(Boolean);
    
    if (segments.length === 0) {
      return [{ label: "Dashboard" }];
    }

    const items: BreadcrumbItem[] = [];
    
    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      items.push({
        label,
        href: isLast ? undefined : href,
      });
    });

    return items;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center text-secondary-500 hover:text-secondary-700 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-secondary-400" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-secondary-500 hover:text-secondary-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-secondary-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
