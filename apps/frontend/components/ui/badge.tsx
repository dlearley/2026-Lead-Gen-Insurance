import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-primary-600 text-white",
    secondary: "bg-secondary-100 text-secondary-800",
    outline: "border border-secondary-200 text-secondary-800",
    destructive: "bg-error-600 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
