"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { AdvancedFinder } from "@/components/leads/AdvancedFinder";
import { useLeads, useLeadDetail, useLeadMutations } from "@/hooks/use-leads";
import { useFieldWorkStore } from "@/stores/leads.store";
import type { Lead, LeadFilter } from "@/types/leads";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Zap } from "lucide-react";

export default function AdvancedFinderPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<LeadFilter>({});
  const { leads, loading, error, refetch } = useLeads({ 
    autoFetch: true,
    filters 
  });
  const { 
    bulkUpdateStatus, 
    bulkAssignLeads, 
    exportLeads,
    isLoading: mutationLoading 
  } = useLeadMutations();
  const { isOffline } = useFieldWorkStore();

  const handleFilterChange = useCallback((newFilters: LeadFilter) => {
    setFilters(newFilters);
  }, []);

  const handleLeadClick = useCallback((lead: Lead) => {
    router.push(`/leads/${lead.id}`);
  }, [router]);

  const handleLeadCall = useCallback((lead: Lead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
  }, []);

  const handleLeadEmail = useCallback((lead: Lead) => {
    if (lead.email) {
      window.location.href = `mailto:${lead.email}`;
    }
  }, []);

  const handleBulkAction = useCallback(async (action: string, leadIds: string[]) => {
    try {
      switch (action) {
        case "export":
          await exportLeads(leadIds);
          break;
        case "assign":
          // TODO: Show assignment modal
          console.log("Assign leads:", leadIds);
          break;
        case "archive":
          await bulkUpdateStatus(leadIds, "archived");
          refetch();
          break;
        default:
          console.warn("Unknown bulk action:", action);
      }
    } catch (err) {
      console.error(`Failed to perform bulk action ${action}:`, err);
    }
  }, [bulkUpdateStatus, exportLeads, refetch]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout 
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/leads")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-6 w-6 text-primary-600" />
            <span>Advanced Finder</span>
          </div>
        }
        description="Power user interface for advanced lead search and bulk operations"
      >
        <div className="h-full flex flex-col">
          {isOffline && (
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 border border-warning-200 rounded-lg">
                <span className="text-sm text-warning-700">
                  You're offline. Some features may be limited.
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <AdvancedFinder
              leads={leads}
              loading={loading}
              error={error}
              filters={filters}
              onFilterChange={handleFilterChange}
              onLeadClick={handleLeadClick}
              onLeadCall={handleLeadCall}
              onLeadEmail={handleLeadEmail}
              onBulkAction={handleBulkAction}
              onRefresh={handleRefresh}
              showKeyboardShortcuts={true}
              className="h-full"
            />
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}