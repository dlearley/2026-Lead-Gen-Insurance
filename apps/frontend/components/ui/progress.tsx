import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const v = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full rounded-full bg-secondary-100 overflow-hidden", className)} {...props}>
      <div className="h-full bg-primary-600" style={{ width: `${v}%` }} />
    </div>
  );
}
