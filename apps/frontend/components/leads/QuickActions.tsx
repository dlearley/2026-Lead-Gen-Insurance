import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import type { Lead } from "@/types/leads";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  MoreHorizontal,
  Navigation,
} from "lucide-react";

interface QuickActionsProps {
  lead: Lead;
  onCall?: () => void;
  onEmail?: () => void;
  onSms?: () => void;
  onSchedule?: () => void;
  onDirections?: () => void;
  onStatusChange?: (status: string) => void;
  onAssign?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
  className?: string;
}

export function QuickActions({
  lead,
  onCall,
  onEmail,
  onSms,
  onSchedule,
  onDirections,
  onStatusChange,
  onAssign,
  onRefresh,
  compact = false,
  className,
}: QuickActionsProps) {
  const actions = [
    {
      id: "call",
      label: "Call",
      icon: <Phone className="h-5 w-5" />,
      onClick: onCall,
      disabled: !lead.phone,
      variant: "success" as const,
      show: !!lead.phone,
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail className="h-5 w-5" />,
      onClick: onEmail,
      disabled: !lead.email,
      variant: "primary" as const,
      show: !!lead.email,
    },
    {
      id: "sms",
      label: "SMS",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: onSms,
      disabled: !lead.phone,
      variant: "secondary" as const,
      show: !!lead.phone,
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      onClick: onSchedule,
      variant: "outline" as const,
      show: true,
    },
    {
      id: "directions",
      label: "Navigate",
      icon: <Navigation className="h-5 w-5" />,
      onClick: onDirections,
      variant: "outline" as const,
      show: !!(lead.latitude && lead.longitude) || !!(lead.address || lead.city),
    },
  ];

  const statusActions = [
    {
      id: "qualified",
      label: "Qualify",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => onStatusChange?.("qualified"),
      show: lead.status === "new" || lead.status === "contacted",
    },
    {
      id: "unqualified",
      label: "Reject",
      icon: <XCircle className="h-4 w-4" />,
      onClick: () => onStatusChange?.("unqualified"),
      show: lead.status === "new",
    },
    {
      id: "converted",
      label: "Convert",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => onStatusChange?.("converted"),
      show: lead.status === "qualified",
    },
  ];

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 p-1.5 bg-secondary-50 rounded-xl",
          className
        )}
      >
        {actions.filter((a) => a.show).slice(0, 4).map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-colors",
              action.variant === "success" && "text-success-600 hover:bg-success-50",
              action.variant === "primary" && "text-primary-600 hover:bg-primary-50",
              action.variant === "secondary" && "text-secondary-600 hover:bg-secondary-100",
              action.variant === "outline" && "text-secondary-600 hover:bg-white",
              action.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {action.icon}
            <span className="text-[10px] mt-0.5 font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {actions
          .filter((a) => a.show)
          .map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95",
                "min-w-[72px]",
                action.variant === "success" && "bg-success-50 text-success-600 hover:bg-success-100",
                action.variant === "primary" && "bg-primary-50 text-primary-600 hover:bg-primary-100",
                action.variant === "secondary" && "bg-secondary-100 text-secondary-600 hover:bg-secondary-200",
                action.variant === "outline" && "bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50",
                action.disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="mb-1.5">{action.icon}</div>
              <span className="text-xs font-semibold">{action.label}</span>
            </button>
          ))}
      </div>

      {statusActions.filter((a) => a.show).length > 0 && (
        <div className="border-t border-secondary-100 pt-4">
          <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">
            Quick Status
          </p>
          <div className="flex flex-wrap gap-2">
            {statusActions
              .filter((a) => a.show)
              .map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "success" | "warning" | "danger" | "default";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  loading = false,
  className,
}: ActionButtonProps) {
  const variantClasses = {
    primary: "bg-primary-500 text-white hover:bg-primary-600",
    success: "bg-success-500 text-white hover:bg-success-600",
    warning: "bg-warning-500 text-white hover:bg-warning-600",
    danger: "bg-danger-500 text-white hover:bg-danger-600",
    default: "bg-secondary-500 text-white hover:bg-secondary-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95",
        variantClasses[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <RefreshCw className="h-5 w-5 animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

interface ActionGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ActionGrid({ children, columns = 2, className }: ActionGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {children}
    </div>
  );
}
