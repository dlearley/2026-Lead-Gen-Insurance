import React, { useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LeadCard } from "./LeadCard";
import type { Lead, LeadFilter, LeadStatus, LeadPriority } from "@/types/leads";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  List,
  Grid,
  Map,
  SlidersHorizontal,
  X,
  RefreshCw,
} from "lucide-react";

interface LeadListProps {
  leads: Lead[];
  loading?: boolean;
  error?: string | null;
  filters?: LeadFilter;
  onFilterChange?: (filters: LeadFilter) => void;
  onLeadClick?: (lead: Lead) => void;
  onLeadCall?: (lead: Lead) => void;
  onLeadEmail?: (lead: Lead) => void;
  onAddLead?: () => void;
  onRefresh?: () => void;
  viewMode?: "list" | "grid" | "map";
  onViewModeChange?: (mode: "list" | "grid" | "map") => void;
  showAddButton?: boolean;
  showFilters?: boolean;
  showViewToggle?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function LeadList({
  leads,
  loading = false,
  error = null,
  filters = {},
  onFilterChange,
  onLeadClick,
  onLeadCall,
  onLeadEmail,
  onAddLead,
  onRefresh,
  viewMode = "list",
  onViewModeChange,
  showAddButton = true,
  showFilters = true,
  showViewToggle = true,
  emptyMessage = "No leads found",
  className,
}: LeadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [localFilters, setLocalFilters] = useState<LeadFilter>(filters);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onFilterChange?.({ ...localFilters, search: searchQuery });
    },
    [localFilters, searchQuery, onFilterChange]
  );

  const handleStatusFilter = (status: LeadStatus | undefined) => {
    const newFilters = { ...localFilters, status };
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handlePriorityFilter = (priority: LeadPriority | undefined) => {
    const newFilters = { ...localFilters, priority };
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    const cleared = { search: undefined, status: undefined, priority: undefined };
    setLocalFilters(cleared);
    setSearchQuery("");
    onFilterChange?.(cleared);
  };

  const hasActiveFilters =
    searchQuery ||
    localFilters.status ||
    localFilters.priority ||
    localFilters.insuranceType;

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-danger-500 mb-4">
          <Filter className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          Error Loading Leads
        </h3>
        <p className="text-secondary-600 mb-4">{error}</p>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-shrink-0 space-y-3 pb-3">
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-tour="leads-search"
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200",
                "text-sm placeholder:text-secondary-400",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              )}
            />
          </form>

          {showFilters && (
            <button
              type="button"
              data-tour="leads-filters"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                "p-2.5 rounded-xl border transition-colors",
                showFilterPanel
                  ? "bg-primary-50 border-primary-200 text-primary-600"
                  : "bg-white border-secondary-200 text-secondary-600 hover:bg-secondary-50"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          )}

          {showViewToggle && (
            <div className="flex items-center bg-white border border-secondary-200 rounded-xl overflow-hidden">
              <button
                onClick={() => onViewModeChange?.("list")}
                className={cn(
                  "p-2.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary-50 text-primary-600"
                    : "text-secondary-500 hover:bg-secondary-50"
                )}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => onViewModeChange?.("grid")}
                className={cn(
                  "p-2.5 transition-colors border-x border-secondary-200",
                  viewMode === "grid"
                    ? "bg-primary-50 text-primary-600"
                    : "text-secondary-500 hover:bg-secondary-50"
                )}
              >
                <Grid className="h-5 w-5" />
              </button>
            </div>
          )}

          {showAddButton && (
            <Button data-tour="leads-add" onClick={onAddLead}>
              <Plus className="h-5 w-5 mr-1" />
              Add Lead
            </Button>
          )}
        </div>

        {showFilters && showFilterPanel && (
          <div className="bg-white rounded-xl border border-secondary-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-secondary-900">Filters</h4>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: undefined, label: "All" },
                    { value: "new", label: "New" },
                    { value: "contacted", label: "Contacted" },
                    { value: "qualified", label: "Qualified" },
                    { value: "converted", label: "Converted" },
                    { value: "lost", label: "Lost" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        handleStatusFilter(option.value as LeadStatus | undefined)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        localFilters.status === option.value ||
                          (!localFilters.status && option.value === undefined)
                          ? "bg-primary-100 text-primary-700"
                          : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Priority
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: undefined, label: "All" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        handlePriorityFilter(option.value as LeadPriority | undefined)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        localFilters.priority === option.value ||
                          (!localFilters.priority && option.value === undefined)
                          ? "bg-primary-100 text-primary-700"
                          : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {localFilters.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                Status: {localFilters.status}
                <button onClick={() => handleStatusFilter(undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {localFilters.priority && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                Priority: {localFilters.priority}
                <button onClick={() => handlePriorityFilter(undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-secondary-200 p-4 animate-pulse"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="h-4 bg-secondary-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-secondary-200 rounded w-1/4" />
                  </div>
                  <div className="h-6 w-16 bg-secondary-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-secondary-400" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-secondary-600 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Get started by adding your first lead"}
            </p>
            {!hasActiveFilters && showAddButton && (
              <Button onClick={onAddLead}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3 pb-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead)}
                onCall={() => onLeadCall?.(lead)}
                onEmail={() => onLeadEmail?.(lead)}
              />
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead)}
                onCall={() => onLeadCall?.(lead)}
                onEmail={() => onLeadEmail?.(lead)}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary-500">Map view coming soon</p>
          </div>
        )}
      </div>

      {leads.length > 0 && (
        <div className="flex-shrink-0 pt-3 border-t border-secondary-200">
          <p className="text-sm text-secondary-500 text-center">
            Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
