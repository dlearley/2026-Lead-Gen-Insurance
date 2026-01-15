import { useState } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "./StatusBadge";
import { QuickActions } from "./QuickActions";
import type { LeadDetail } from "@/types/leads";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  Edit,
  Share2,
  Printer,
  MoreVertical,
  User,
  FileText,
  Activity,
  Tag,
} from "lucide-react";

interface LeadDetailProps {
  lead: LeadDetail;
  onBack?: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onEdit?: () => void;
  onStatusChange?: (status: string) => void;
  onAssign?: () => void;
  onSchedule?: () => void;
  loading?: boolean;
  className?: string;
}

export function LeadDetail({
  lead,
  onBack,
  onCall,
  onEmail,
  onEdit,
  onStatusChange,
  onAssign,
  onSchedule,
  loading = false,
  className,
}: LeadDetailProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "history">(
    "details"
  );

  if (loading) {
    return (
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-secondary-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-secondary-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-secondary-200 rounded w-1/4" />
          </div>
        </div>
        <div className="h-32 bg-secondary-200 rounded-xl" />
        <div className="h-48 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  const fullName = `${lead.firstName} ${lead.lastName}`;
  const location = [lead.city, lead.state].filter(Boolean).join(", ");

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary-100 active:bg-secondary-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-secondary-900 truncate">
              {fullName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              {lead.company && (
                <>
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{lead.company}</span>
                </>
              )}
              {location && (
                <>
                  <span className="text-secondary-300">•</span>
                  <span className="truncate">{location}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-secondary-100 active:bg-secondary-200">
              <Share2 className="h-5 w-5 text-secondary-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary-100 active:bg-secondary-200">
              <Printer className="h-5 w-5 text-secondary-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary-100 active:bg-secondary-200">
              <MoreVertical className="h-5 w-5 text-secondary-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={lead.status} size="lg" />
          {lead.priority && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold uppercase",
                lead.priority === "high" && "bg-danger-100 text-danger-700",
                lead.priority === "medium" && "bg-warning-100 text-warning-700",
                lead.priority === "low" && "bg-success-100 text-success-700"
              )}
            >
              {lead.priority}
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={onCall}
            disabled={!lead.phone}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors",
              lead.phone
                ? "bg-success-50 text-success-700 hover:bg-success-100"
                : "bg-secondary-100 text-secondary-400 cursor-not-allowed"
            )}
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
          <button
            onClick={onEmail}
            disabled={!lead.email}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors",
              lead.email
                ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                : "bg-secondary-100 text-secondary-400 cursor-not-allowed"
            )}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={onSchedule}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm bg-secondary-100 text-secondary-700 hover:bg-secondary-200 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 py-4">
        <QuickActions
          lead={lead}
          onCall={onCall}
          onEmail={onEmail}
          onSchedule={onSchedule}
          onStatusChange={onStatusChange}
          onAssign={onAssign}
        />

        <div className="mt-6">
          <div className="flex border-b border-secondary-200">
            {[
              { id: "details", label: "Details", icon: User },
              { id: "activity", label: "Activity", icon: Activity },
              { id: "history", label: "History", icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-secondary-500 hover:text-secondary-700"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-4">
            {activeTab === "details" && (
              <LeadDetailsTab lead={lead} onEdit={onEdit} />
            )}
            {activeTab === "activity" && (
              <ActivityTab activities={lead.activities || []} />
            )}
            {activeTab === "history" && (
              <HistoryTab
                statusHistory={lead.status_history || []}
                assignmentHistory={lead.assignments || []}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadDetailsTab({
  lead,
  onEdit,
}: {
  lead: LeadDetail;
  onEdit?: () => void;
}) {
  const details = [
    { label: "Email", value: lead.email, icon: Mail, href: `mailto:${lead.email}` },
    {
      label: "Phone",
      value: lead.phone,
      icon: Phone,
      href: `tel:${lead.phone}`,
    },
    {
      label: "Address",
      value: lead.address,
      icon: MapPin,
      subtitle: [lead.city, lead.state, lead.zipCode].filter(Boolean).join(", "),
    },
    {
      label: "Insurance Type",
      value: lead.insuranceType
        ? lead.insuranceType.charAt(0).toUpperCase() + lead.insuranceType.slice(1)
        : null,
      icon: FileText,
    },
    {
      label: "Value Estimate",
      value: lead.valueEstimate
        ? `$${lead.valueEstimate.toLocaleString()}`
        : null,
      icon: DollarSign,
    },
    {
      label: "Source",
      value: lead.source,
      icon: Tag,
    },
    {
      label: "Follow-up Date",
      value: lead.followUpDate
        ? new Date(lead.followUpDate).toLocaleDateString()
        : null,
      icon: Calendar,
    },
  ].filter((d) => d.value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-secondary-900">Contact Information</h3>
        <button
          onClick={onEdit}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Edit className="h-4 w-4 inline mr-1" />
          Edit
        </button>
      </div>

      <div className="space-y-2">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary-50"
          >
            <detail.icon className="h-5 w-5 text-secondary-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-secondary-500">{detail.label}</p>
              {detail.href ? (
                <a
                  href={detail.href}
                  className="text-sm font-medium text-secondary-900 hover:text-primary-600"
                >
                  {detail.value}
                </a>
              ) : (
                <p className="text-sm font-medium text-secondary-900">
                  {detail.value}
                </p>
              )}
              {detail.subtitle && (
                <p className="text-xs text-secondary-500">{detail.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {lead.notes && (
        <div>
          <h4 className="font-semibold text-secondary-900 mb-2">Notes</h4>
          <div className="p-3 rounded-lg bg-secondary-50 text-sm text-secondary-700 whitespace-pre-wrap">
            {lead.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ activities }: { activities: LeadDetail["activities"] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-500">
        <Activity className="h-12 w-12 mx-auto mb-3 text-secondary-300" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary-500" />
            <div className="flex-1 w-px bg-secondary-200" />
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm text-secondary-900">{activity.description}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
              {activity.userName && <span>{activity.userName}</span>}
              <span>•</span>
              <span>{formatTimeAgo(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({
  statusHistory,
  assignmentHistory,
}: {
  statusHistory: LeadDetail["status_history"];
  assignmentHistory: any[];
}) {
  const allHistory = [
    ...(statusHistory || []).map((h) => ({
      type: "status" as const,
      date: h.createdAt,
      title: `Status changed to ${h.newStatus}`,
      subtitle: h.reason || `From ${h.oldStatus || "unknown"}`,
      by: h.changedByName,
    })),
    ...(assignmentHistory || []).map((h) => ({
      type: "assignment" as const,
      date: h.createdAt,
      title: `Assigned to ${h.agentName}`,
      subtitle: h.reason || `By ${h.assignedByName || "System"}`,
      by: h.assignedByName,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allHistory.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-secondary-300" />
        <p>No history recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allHistory.map((item, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                item.type === "status" ? "bg-primary-500" : "bg-success-500"
              )}
            />
            <div className="flex-1 w-px bg-secondary-200" />
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-secondary-900">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-secondary-500">{item.subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
              {item.by && <span>by {item.by}</span>}
              <span>•</span>
              <span>{formatTimeAgo(item.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
