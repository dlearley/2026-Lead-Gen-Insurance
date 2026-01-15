import { cn } from "@/utils/cn";
import type { LeadStatus } from "@/types/leads";

interface StatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  LeadStatus,
  { label: string; bgColor: string; textColor: string; icon?: React.ReactNode }
> = {
  new: {
    label: "New",
    bgColor: "bg-primary-50",
    textColor: "text-primary-700",
  },
  contacted: {
    label: "Contacted",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  qualified: {
    label: "Qualified",
    bgColor: "bg-success-50",
    textColor: "text-success-700",
  },
  unqualified: {
    label: "Unqualified",
    bgColor: "bg-danger-50",
    textColor: "text-danger-700",
  },
  converted: {
    label: "Converted",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
  lost: {
    label: "Lost",
    bgColor: "bg-secondary-50",
    textColor: "text-secondary-700",
  },
};

export function StatusBadge({
  status,
  size = "md",
  showIcon = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <span className="mr-1.5">{config.icon}</span>}
      {config.label}
    </span>
  );
}

interface StatusButtonProps {
  status: LeadStatus;
  currentStatus: LeadStatus;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function StatusButton({
  status,
  currentStatus,
  onClick,
  disabled = false,
  className,
}: StatusButtonProps) {
  const isActive = status === currentStatus;
  const config = statusConfig[status];

  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      className={cn(
        "inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-sm transition-all",
        isActive
          ? `${config.bgColor} ${config.textColor}`
          : "bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {config.label}
    </button>
  );
}

interface StatusGridProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  className?: string;
}

export function StatusGrid({
  currentStatus,
  onStatusChange,
  className,
}: StatusGridProps) {
  const statuses: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "unqualified",
    "converted",
    "lost",
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {statuses.map((status) => (
        <StatusButton
          key={status}
          status={status}
          currentStatus={currentStatus}
          onClick={() => onStatusChange(status)}
        />
      ))}
    </div>
  );
}
