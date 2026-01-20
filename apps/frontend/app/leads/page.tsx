"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LeadList } from "@/components/leads/LeadList";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { useLeads, useLeadDetail, useLeadMutations } from "@/hooks/use-leads";
import { useLeadsStore, useFieldWorkStore } from "@/stores/leads.store";
import type { Lead, LeadFilter } from "@/types/leads";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Wifi, WifiOff, CloudOff, Zap } from "lucide-react";

export default function LeadsPage() {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const { leads, loading, error, filters, setFilters, refetch, pagination } =
    useLeads({ autoFetch: true });
  const { lead: selectedLead, loading: detailLoading, update } = useLeadDetail(
    selectedLeadId
  );
  const {
    createLead,
    updateLead,
    deleteLead,
    updateStatus,
    assignLead,
    isLoading: mutationLoading,
  } = useLeadMutations();
  const { isOffline, pendingSync, lastSyncTime } = useFieldWorkStore();
  const { setViewMode: setListViewMode } = useLeadsStore();

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id);
    setViewMode("detail");
  }, []);

  const handleBack = useCallback(() => {
    setSelectedLeadId(null);
    setViewMode("list");
  }, []);

  const handleCall = useCallback((lead: Lead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
  }, []);

  const handleEmail = useCallback((lead: Lead) => {
    if (lead.email) {
      window.location.href = `mailto:${lead.email}`;
    }
  }, []);

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!selectedLeadId) return;
      try {
        await updateStatus(selectedLeadId, status);
        refetch();
        if (selectedLead) {
          update({ status: status as any });
        }
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    },
    [selectedLeadId, updateStatus, refetch, update, selectedLead]
  );

  const handleFilterChange = useCallback((newFilters: LeadFilter) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handleAddLead = useCallback(() => {
    router.push("/leads/new");
  }, [router]);

  const formatPendingSync = () => {
    if (pendingSync.length === 0) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 border border-warning-200 rounded-lg">
        <CloudOff className="h-4 w-4 text-warning-600" />
        <span className="text-sm text-warning-700">
          {pendingSync.length} changes pending sync
        </span>
      </div>
    );
  };

  const formatSyncTime = () => {
    if (!lastSyncTime) return null;
    const date = new Date(lastSyncTime);
    return (
      <span className="text-xs text-secondary-500">
        Last synced: {date.toLocaleTimeString()}
      </span>
    );
  };

  if (viewMode === "detail" && selectedLead) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout title="Lead Details">
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-4">
              {isOffline && (
                <div className="flex items-center gap-2 px-3 py-2 bg-danger-50 border border-danger-200 rounded-lg mb-4">
                  <WifiOff className="h-4 w-4 text-danger-600" />
                  <span className="text-sm text-danger-700">
                    You&apos;re offline. Changes will sync when connected.
                  </span>
                </div>
              )}
              {formatPendingSync()}
            </div>

            <div className="flex-1 overflow-hidden">
              <LeadDetail
                lead={selectedLead}
                onBack={handleBack}
                onCall={() => handleCall(selectedLead)}
                onEmail={() => handleEmail(selectedLead)}
                onEdit={() => router.push(`/leads/${selectedLead.id}/edit`)}
                onStatusChange={handleStatusChange}
                loading={detailLoading}
              />
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Leads">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 mb-4">
            {isOffline ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-danger-50 border border-danger-200 rounded-lg mb-3">
                <WifiOff className="h-4 w-4 text-danger-600" />
                <span className="text-sm text-danger-700">
                  Offline Mode
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-success-50 border border-success-200 rounded-lg mb-3">
                <Wifi className="h-4 w-4 text-success-600" />
                <span className="text-sm text-success-700">Online</span>
              </div>
            )}

            {formatPendingSync()}
          </div>

          <div className="flex-1 min-h-0">
            <LeadList
              leads={leads}
              loading={loading}
              error={error}
              filters={filters}
              onFilterChange={handleFilterChange}
              onLeadClick={handleLeadClick}
              onLeadCall={handleCall}
              onLeadEmail={handleEmail}
              onAddLead={handleAddLead}
              onRefresh={refetch}
              viewMode="list"
              onViewModeChange={setListViewMode}
              showAddButton
              showFilters
              showViewToggle
            />
          </div>

          {/* Advanced Finder Floating Button */}
          <div className="fixed bottom-6 right-6 z-40">
            <Button
              onClick={() => router.push("/leads/advanced-finder")}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              title="Open Advanced Finder (Power User Interface)"
            >
              <Zap className="h-6 w-6" />
            </Button>
          </div>

          {lastSyncTime && (
            <div className="flex-shrink-0 pt-2 border-t border-secondary-200">
              {formatSyncTime()}
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
