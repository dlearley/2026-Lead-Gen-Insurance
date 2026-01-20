import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLeads } from "@/hooks/use-leads";
import { useFieldWork } from "@/hooks/use-field-work";
import { useAuthStore } from "@/stores/auth.store";
import { useFieldWorkStore } from "@/stores/leads.store";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Wifi,
  WifiOff,
  CloudOff,
  CheckCircle,
  AlertCircle,
  Target,
  Users,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface FieldWorkWidgetProps {
  compact?: boolean;
}

export function FieldWorkWidget({ compact = false }: FieldWorkWidgetProps) {
  const { user } = useAuthStore();
  const { assignedLeadsCount, todayTasksCount } = useFieldWorkStore();
  const { leads, loading, filters, setFilters } = useLeads({
    autoFetch: true,
    initialPageSize: 10,
  });
  const { isOnline, pendingSyncCount, lastSyncFormatted, getCurrentLocation } =
    useFieldWork();
  const [showLocationAlert, setShowLocationAlert] = useState(false);

  const myLeads = leads.filter(
    (lead) =>
      lead.status !== "converted" &&
      lead.status !== "lost"
  );

  const todaysFollowUps = leads.filter((lead) => {
    if (!lead.followUpDate) return false;
    const followUp = new Date(lead.followUpDate);
    const today = new Date();
    return (
      followUp.toDateString() === today.toDateString()
    );
  });

  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      setShowLocationAlert(false);
    } catch (err) {
      setShowLocationAlert(true);
    }
  };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="flex items-center gap-1.5 text-success-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-danger-600">
                  <CloudOff className="h-4 w-4" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {pendingSyncCount > 0 && (
                <span className="text-sm text-warning-600">
                  {pendingSyncCount} pending
                </span>
              )}
              <Link href="/leads/nearby">
                <Button variant="outline" size="sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  Nearby
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          Field Work
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary-50">
          {isOnline ? (
            <>
              <Wifi className="h-5 w-5 text-success-600" />
              <div>
                <p className="text-sm font-medium text-secondary-900">
                  Connected
                </p>
                <p className="text-xs text-secondary-500">
                  Last sync: {lastSyncFormatted}
                </p>
              </div>
            </>
          ) : (
            <>
              <CloudOff className="h-5 w-5 text-danger-600" />
              <div>
                <p className="text-sm font-medium text-secondary-900">
                  Offline Mode
                </p>
                <p className="text-xs text-secondary-500">
                  Changes will sync when connected
                </p>
              </div>
            </>
          )}
        </div>

        {showLocationAlert && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-50 border border-warning-200">
            <AlertCircle className="h-5 w-5 text-warning-600" />
            <p className="text-sm text-warning-700">
              Enable location for nearby leads
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetLocation}
              className="ml-auto"
            >
              Enable
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary-50">
            <div className="flex items-center gap-2 text-primary-700 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">My Leads</span>
            </div>
            <p className="text-2xl font-bold text-primary-700">
              {myLeads.length}
            </p>
            <Link
              href="/leads"
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              View all →
            </Link>
          </div>

          <div className="p-3 rounded-lg bg-warning-50">
            <div className="flex items-center gap-2 text-warning-700 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Follow-ups</span>
            </div>
            <p className="text-2xl font-bold text-warning-700">
              {todaysFollowUps.length}
            </p>
            <span className="text-xs text-warning-600">
              Due today
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/leads/nearby" className="flex-1">
            <Button variant="outline" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Nearby Leads
            </Button>
          </Link>
          <Button variant="outline" onClick={handleGetLocation}>
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {todaysFollowUps.length > 0 && (
          <div className="pt-3 border-t border-secondary-200">
            <h4 className="text-sm font-medium text-secondary-700 mb-2">
              Today&apos;s Follow-ups
            </h4>
            <div className="space-y-2">
              {todaysFollowUps.slice(0, 3).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary-50"
                >
                  <div>
                    <p className="text-sm font-medium text-secondary-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {lead.city}, {lead.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-1.5 rounded-lg hover:bg-secondary-200 text-success-600"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-1.5 rounded-lg hover:bg-secondary-200 text-primary-600"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MobileQuickActions() {
  const actions = [
    {
      id: "new-lead",
      label: "New Lead",
      icon: <Target className="h-6 w-6" />,
      href: "/leads/new",
      color: "bg-primary-500",
    },
    {
      id: "nearby",
      label: "Nearby",
      icon: <MapPin className="h-6 w-6" />,
      href: "/leads/nearby",
      color: "bg-success-500",
    },
    {
      id: "calls",
      label: "Calls",
      icon: <Phone className="h-6 w-6" />,
      href: "/calls",
      color: "bg-blue-500",
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="h-6 w-6" />,
      href: "/schedule",
      color: "bg-warning-500",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 p-4 bg-white border-t border-secondary-200">
      {actions.map((action) => (
        <Link key={action.id} href={action.href}>
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center text-white mb-1.5 active:scale-95 transition-transform`}
            >
              {action.icon}
            </div>
            <span className="text-xs font-medium text-secondary-700">
              {action.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
