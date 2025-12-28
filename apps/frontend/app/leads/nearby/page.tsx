"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LeadCard } from "@/components/leads/LeadCard";
import { Button } from "@/components/ui/Button";
import { useNearbyLeads, useLeadMutations } from "@/hooks/use-leads";
import { useFieldWork } from "@/hooks/use-field-work";
import type { Lead } from "@/types/leads";
import {
  MapPin,
  Navigation,
  RefreshCw,
  Filter,
  ChevronRight,
  Clock,
  CloudOff,
  Wifi,
} from "lucide-react";

export default function NearbyLeadsPage() {
  const {
    leads: nearbyLeads,
    loading,
    error,
    location,
    refreshLocation,
    fetchNearby,
  } = useNearbyLeads();
  const { updateStatus, isLoading } = useLeadMutations();
  const { isOnline, lastSyncFormatted, pendingSyncCount } = useFieldWork();
  const [selectedRadius, setSelectedRadius] = useState(25);

  const handleRefreshLocation = async () => {
    await refreshLocation();
    fetchNearby(selectedRadius);
  };

  const handleStatusChange = async (lead: Lead, status: string) => {
    await updateStatus(lead.id, status);
  };

  const sortedLeads = [...nearbyLeads].sort((a, b) => {
    const getDistance = (l: Lead) =>
      l.latitude && location
        ? Math.sqrt(
            Math.pow(l.latitude - location.coords.latitude, 2) +
              Math.pow(l.longitude - location.coords.longitude, 2)
          )
        : Infinity;
    return getDistance(a) - getDistance(b);
  });

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Nearby Leads">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 text-success-600">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-danger-600">
                    <CloudOff className="h-4 w-4" />
                    <span className="text-sm">Offline</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-secondary-500">
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} pending sync`
                  : `Last sync: ${lastSyncFormatted}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-primary-50 rounded-xl border border-primary-200">
                <div className="flex items-center gap-2 text-primary-700">
                  <MapPin className="h-5 w-5" />
                  {location ? (
                    <div>
                      <p className="text-sm font-medium">
                        {location.coords.latitude.toFixed(4)},{" "}
                        {location.coords.longitude.toFixed(4)}
                      </p>
                      <p className="text-xs text-primary-600">
                        {nearbyLeads.length} leads nearby
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm">Getting location...</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLocation}
                disabled={loading}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {[10, 25, 50, 100].map((radius) => (
                <button
                  key={radius}
                  onClick={() => {
                    setSelectedRadius(radius);
                    fetchNearby(radius);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedRadius === radius
                      ? "bg-primary-500 text-white"
                      : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                  }`}
                >
                  {radius} miles
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-secondary-200 p-4 animate-pulse"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-secondary-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-secondary-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-secondary-200 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-danger-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Unable to load nearby leads
                </h3>
                <p className="text-secondary-600 mb-4">{error}</p>
                <Button variant="outline" onClick={handleRefreshLocation}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : nearbyLeads.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  No leads nearby
                </h3>
                <p className="text-secondary-600">
                  Expand your search radius to find more leads
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {sortedLeads.map((lead) => {
                  const distance = location
                    ? calculateDistance(
                        location.coords.latitude,
                        location.coords.longitude,
                        lead.latitude || 0,
                        lead.longitude || 0
                      )
                    : null;

                  return (
                    <div key={lead.id} className="relative">
                      <LeadCard
                        lead={lead}
                        onClick={() => {
                          window.location.href = `/leads/${lead.id}`;
                        }}
                        showActions={false}
                      />
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-100 rounded-full text-xs font-medium text-secondary-600">
                          <MapPin className="h-3 w-3" />
                          {distance ? `${distance.toFixed(1)} mi` : "Unknown"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          window.location.href = `/leads/${lead.id}`;
                        }}
                        className="absolute inset-0"
                        aria-label={`View ${lead.firstName} ${lead.lastName}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
