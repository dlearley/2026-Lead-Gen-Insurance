import { cn } from "@/utils/cn";
import type { Lead, LeadStatus, LeadPriority } from "@/types/leads";
import { StatusBadge } from "./StatusBadge";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  MoreVertical,
  Building2,
} from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onAssign?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function LeadCard({
  lead,
  onClick,
  onCall,
  onEmail,
  onAssign,
  showActions = true,
  compact = false,
  className,
}: LeadCardProps) {
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const hasLocation = lead.city || lead.state || lead.address;
  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-secondary-200 shadow-sm",
        "hover:shadow-md transition-shadow duration-200",
        "active:scale-[0.98] touch-active",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-secondary-900 truncate">
                {fullName}
              </h3>
              <PriorityIndicator priority={lead.priority} size="sm" />
            </div>

            {(lead.company || lead.jobTitle) && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-secondary-500">
                {lead.company && (
                  <>
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{lead.company}</span>
                  </>
                )}
                {lead.jobTitle && (
                  <>
                    <span className="text-secondary-300">•</span>
                    <span className="truncate">{lead.jobTitle}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} size="sm" />
            {showActions && (
              <button
                className="p-1.5 rounded-lg hover:bg-secondary-100 active:bg-secondary-200"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-secondary-500" />
              </button>
            )}
          </div>
        </div>

        {!compact && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.insuranceType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                  {lead.insuranceType.charAt(0).toUpperCase() +
                    lead.insuranceType.slice(1)}
                </span>
              )}
              {lead.valueEstimate && lead.valueEstimate > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                  <DollarSign className="h-3 w-3" />
                  ${lead.valueEstimate.toLocaleString()}
                </span>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-secondary-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-secondary-500">
                  {hasLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  )}
                  {lead.assigneeName && (
                    <span className="text-xs">
                      Assigned: {lead.assigneeName}
                    </span>
                  )}
                </div>

                {showActions && (hasPhone || hasEmail) && (
                  <div className="flex items-center gap-1">
                    {hasPhone && (
                      <button
                        className="p-2 rounded-lg bg-success-50 text-success-600 hover:bg-success-100 active:bg-success-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall?.();
                        }}
                        aria-label="Call lead"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    )}
                    {hasEmail && (
                      <button
                        className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmail?.();
                        }}
                        aria-label="Email lead"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-secondary-400">
              <span>Created {formatDate(lead.createdAt)}</span>
              {lead.followUpDate && (
                <span className="flex items-center gap-1 text-primary-600">
                  <Calendar className="h-3 w-3" />
                  Follow-up: {formatDate(lead.followUpDate)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

interface PriorityIndicatorProps {
  priority: LeadPriority;
  size?: "sm" | "md";
}

export function PriorityIndicator({ priority, size = "md" }: PriorityIndicatorProps) {
  const sizeClasses = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const colorClasses = {
    high: "bg-danger-500",
    medium: "bg-warning-500",
    low: "bg-success-500",
  };

  return (
    <div
      className={cn(
        "rounded-full",
        sizeClasses,
        colorClasses[priority]
      )}
      title={`Priority: ${priority}`}
    />
  );
}

interface SwipeableLeadCardProps extends LeadCardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function SwipeableLeadCard({
  onSwipeLeft,
  onSwipeRight,
  children,
  className,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;

        const handleTouchMove = (moveEvent: TouchEvent) => {
          const touch = moveEvent.touches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;

          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 50 && onSwipeRight) {
              onSwipeRight();
              document.removeEventListener("touchmove", handleTouchMove);
            } else if (deltaX < -50 && onSwipeLeft) {
              onSwipeLeft();
              document.removeEventListener("touchmove", handleTouchMove);
            }
          }
        };

        document.addEventListener("touchmove", handleTouchMove, { once: true });
      }}
    >
      {children}
    </div>
  );
}
