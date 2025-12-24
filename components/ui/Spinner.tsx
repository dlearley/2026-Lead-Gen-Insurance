import { cn } from "@/utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div className={cn("inline-block animate-spin rounded-full border-2 border-solid border-current", "border-r-transparent", sizeClasses[size], className)} role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" className="text-primary-600" />
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-secondary-200", className)} />;
}
