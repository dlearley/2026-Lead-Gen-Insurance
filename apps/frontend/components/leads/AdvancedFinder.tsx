/**
 * Advanced Finder Component - Power User Interface for Lead Search
 * Optimized for laptop/desktop users with advanced filtering and bulk operations
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LeadCard } from "./LeadCard";
import type { Lead, LeadFilter, LeadStatus, LeadPriority } from "@/types/leads";
import {
  Search,
  Filter,
  ChevronDown,
  X,
  RefreshCw,
  Command,
  ArrowUpDown,
  Download,
  Upload,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Star,
  Archive,
  Eye,
  Edit,
  Trash2,
  Zap,
  Keyboard,
  User,
} from "lucide-react";

interface AdvancedFinderProps {
  leads: Lead[];
  loading?: boolean;
  error?: string | null;
  filters?: LeadFilter;
  onFilterChange?: (filters: LeadFilter) => void;
  onLeadClick?: (lead: Lead) => void;
  onLeadCall?: (lead: Lead) => void;
  onLeadEmail?: (lead: Lead) => void;
  onBulkAction?: (action: string, leadIds: string[]) => void;
  onRefresh?: () => void;
  showKeyboardShortcuts?: boolean;
  className?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: LeadFilter;
  createdAt: Date;
}

const STATUS_OPTIONS = [
  { value: undefined, label: "All Statuses", count: 0 },
  { value: "new", label: "New", count: 0 },
  { value: "contacted", label: "Contacted", count: 0 },
  { value: "qualified", label: "Qualified", count: 0 },
  { value: "converted", label: "Converted", count: 0 },
  { value: "lost", label: "Lost", count: 0 },
];

const PRIORITY_OPTIONS = [
  { value: undefined, label: "All Priorities", count: 0 },
  { value: "high", label: "High Priority", count: 0 },
  { value: "medium", label: "Medium Priority", count: 0 },
  { value: "low", label: "Low Priority", count: 0 },
];

const INSURANCE_TYPES = [
  { value: undefined, label: "All Types", count: 0 },
  { value: "auto", label: "Auto Insurance", count: 0 },
  { value: "home", label: "Home Insurance", count: 0 },
  { value: "life", label: "Life Insurance", count: 0 },
  { value: "health", label: "Health Insurance", count: 0 },
  { value: "commercial", label: "Commercial Insurance", count: 0 },
];

export function AdvancedFinder({
  leads,
  loading = false,
  error = null,
  filters = {},
  onFilterChange,
  onLeadClick,
  onLeadCall,
  onLeadEmail,
  onBulkAction,
  onRefresh,
  showKeyboardShortcuts = true,
  className,
}: AdvancedFinderProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<keyof Lead>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");

  // Advanced filter states
  const [advancedFilters, setAdvancedFilters] = useState({
    status: filters.status,
    priority: filters.priority,
    insuranceType: filters.insuranceType,
    dateRange: {
      from: filters.dateFrom,
      to: filters.dateTo,
    },
    location: filters.location,
    minScore: filters.score?.min,
    maxScore: filters.score?.max,
    hasEmail: filters.hasEmail,
    hasPhone: filters.hasPhone,
    isReturning: filters.isReturning,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl/Cmd + F: Toggle advanced filters
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowAdvancedFilters(!showAdvancedFilters);
      }

      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (leads.length > 0) {
          const allIds = new Set(leads.map(lead => lead.id));
          setSelectedLeads(allIds);
        }
      }

      // Escape: Clear selection
      if (e.key === "Escape") {
        setSelectedLeads(new Set());
        setShowKeyboardHelp(false);
      }

      // Ctrl/Cmd + /: Show keyboard help
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowKeyboardHelp(!showKeyboardHelp);
      }

      // Ctrl/Cmd + R: Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        onRefresh?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAdvancedFilters, showKeyboardHelp, leads, onRefresh]);

  // Filter logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery) ||
      lead.insuranceType?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !advancedFilters.status || lead.status === advancedFilters.status;
    const matchesPriority = !advancedFilters.priority || lead.priority === advancedFilters.priority;
    const matchesInsuranceType = !advancedFilters.insuranceType || lead.insuranceType === advancedFilters.insuranceType;

    const matchesDateRange = (!advancedFilters.dateRange.from || new Date(lead.createdAt) >= new Date(advancedFilters.dateRange.from)) &&
      (!advancedFilters.dateRange.to || new Date(lead.createdAt) <= new Date(advancedFilters.dateRange.to));

    const matchesLocation = !advancedFilters.location || 
      lead.location?.toLowerCase().includes(advancedFilters.location.toLowerCase());

    const matchesScoreRange = (!advancedFilters.minScore || (lead.score || 0) >= advancedFilters.minScore) &&
      (!advancedFilters.maxScore || (lead.score || 0) <= advancedFilters.maxScore);

    const matchesEmail = advancedFilters.hasEmail === undefined || 
      (advancedFilters.hasEmail ? !!lead.email : !lead.email);

    const matchesPhone = advancedFilters.hasPhone === undefined ||
      (advancedFilters.hasPhone ? !!lead.phone : !lead.phone);

    const matchesReturning = advancedFilters.isReturning === undefined ||
      lead.isReturning === advancedFilters.isReturning;

    return matchesSearch && matchesStatus && matchesPriority && matchesInsuranceType &&
      matchesDateRange && matchesLocation && matchesScoreRange &&
      matchesEmail && matchesPhone && matchesReturning;
  });

  // Sort logic
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Event handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onFilterChange?.({ ...filters, search: query });
  }, [filters, onFilterChange]);

  const handleSort = useCallback((field: keyof Lead) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }, [sortBy, sortOrder]);

  const handleSelectLead = useCallback((leadId: string, selected: boolean) => {
    const newSelection = new Set(selectedLeads);
    if (selected) {
      newSelection.add(leadId);
    } else {
      newSelection.delete(leadId);
    }
    setSelectedLeads(newSelection);
  }, [selectedLeads]);

  const handleSelectAll = useCallback(() => {
    if (selectedLeads.size === paginatedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(paginatedLeads.map(lead => lead.id)));
    }
  }, [selectedLeads.size, paginatedLeads]);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedLeads.size > 0) {
      onBulkAction?.(action, Array.from(selectedLeads));
    }
  }, [selectedLeads, onBulkAction]);

  const handleAdvancedFilterChange = useCallback((key: string, value: any) => {
    const updated = { ...advancedFilters, [key]: value };
    setAdvancedFilters(updated);

    // Convert advanced filters to standard filter format
    const standardFilters: LeadFilter = {
      search: searchQuery,
      status: updated.status,
      priority: updated.priority,
      insuranceType: updated.insuranceType,
      dateFrom: updated.dateRange.from,
      dateTo: updated.dateRange.to,
      location: updated.location,
      score: updated.minScore || updated.maxScore ? {
        min: updated.minScore,
        max: updated.maxScore,
      } : undefined,
      hasEmail: updated.hasEmail,
      hasPhone: updated.hasPhone,
      isReturning: updated.isReturning,
    };

    onFilterChange?.(standardFilters);
  }, [advancedFilters, searchQuery, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setAdvancedFilters({
      status: undefined,
      priority: undefined,
      insuranceType: undefined,
      dateRange: { from: undefined, to: undefined },
      location: undefined,
      minScore: undefined,
      maxScore: undefined,
      hasEmail: undefined,
      hasPhone: undefined,
      isReturning: undefined,
    });
    onFilterChange?.({});
  }, [onFilterChange]);

  const saveCurrentSearch = useCallback(() => {
    if (newSearchName.trim()) {
      const search: SavedSearch = {
        id: Date.now().toString(),
        name: newSearchName.trim(),
        filters: {
          search: searchQuery,
          status: advancedFilters.status,
          priority: advancedFilters.priority,
          insuranceType: advancedFilters.insuranceType,
          dateFrom: advancedFilters.dateRange.from,
          dateTo: advancedFilters.dateRange.to,
          location: advancedFilters.location,
          score: advancedFilters.minScore || advancedFilters.maxScore ? {
            min: advancedFilters.minScore,
            max: advancedFilters.maxScore,
          } : undefined,
          hasEmail: advancedFilters.hasEmail,
          hasPhone: advancedFilters.hasPhone,
          isReturning: advancedFilters.isReturning,
        },
        createdAt: new Date(),
      };
      setSavedSearches([...savedSearches, search]);
      setNewSearchName("");
      setShowSaveSearch(false);
    }
  }, [newSearchName, searchQuery, advancedFilters, savedSearches]);

  const loadSavedSearch = useCallback((search: SavedSearch) => {
    setSearchQuery(search.filters.search || "");
    setAdvancedFilters({
      status: search.filters.status,
      priority: search.filters.priority,
      insuranceType: search.filters.insuranceType,
      dateRange: { from: search.filters.dateFrom, to: search.filters.dateTo },
      location: search.filters.location,
      minScore: search.filters.score?.min,
      maxScore: search.filters.score?.max,
      hasEmail: search.filters.hasEmail,
      hasPhone: search.filters.hasPhone,
      isReturning: search.filters.isReturning,
    });
    onFilterChange?.(search.filters);
  }, [onFilterChange]);

  const hasActiveFilters = searchQuery || Object.values(advancedFilters).some(value => {
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some(v => v !== undefined);
    }
    return value !== undefined;
  });

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-danger-500 mb-4">
          <AlertCircle className="h-12 w-12 mx-auto" />
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
    <div className={cn("flex flex-col h-full bg-secondary-50", className)}>
      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardHelp(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Focus Search</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Ctrl+K</kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle Advanced Filters</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Ctrl+F</kbd>
              </div>
              <div className="flex justify-between">
                <span>Select All</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Ctrl+A</kbd>
              </div>
              <div className="flex justify-between">
                <span>Refresh</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Ctrl+R</kbd>
              </div>
              <div className="flex justify-between">
                <span>Show This Help</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Ctrl+/</kbd>
              </div>
              <div className="flex justify-between">
                <span>Clear Selection</span>
                <kbd className="px-2 py-1 bg-secondary-100 rounded">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Search and Actions */}
      <div className="bg-white border-b border-secondary-200 p-4 space-y-3">
        {/* Primary Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search leads by name, email, phone, or insurance type... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border border-secondary-200",
                "text-sm placeholder:text-secondary-400",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            {showKeyboardShortcuts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardHelp(true)}
                title="Keyboard Shortcuts (Ctrl+/)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Advanced Filters (Ctrl+F)"
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced
              <ChevronDown className={cn(
                "h-4 w-4 ml-2 transition-transform",
                showAdvancedFilters && "rotate-180"
              )} />
            </Button>

            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} title="Refresh (Ctrl+R)">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Status
                </label>
                <select
                  value={advancedFilters.status || ""}
                  onChange={(e) => handleAdvancedFilterChange("status", e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value || "all"} value={option.value || ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Priority
                </label>
                <select
                  value={advancedFilters.priority || ""}
                  onChange={(e) => handleAdvancedFilterChange("priority", e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value || "all"} value={option.value || ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Insurance Type */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Insurance Type
                </label>
                <select
                  value={advancedFilters.insuranceType || ""}
                  onChange={(e) => handleAdvancedFilterChange("insuranceType", e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {INSURANCE_TYPES.map(option => (
                    <option key={option.value || "all"} value={option.value || ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Location
                </label>
                <Input
                  placeholder="City, State, or ZIP"
                  value={advancedFilters.location || ""}
                  onChange={(e) => handleAdvancedFilterChange("location", e.target.value || undefined)}
                  className="text-sm"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Date From
                </label>
                <Input
                  type="date"
                  value={advancedFilters.dateRange.from || ""}
                  onChange={(e) => handleAdvancedFilterChange("dateRange", {
                    ...advancedFilters.dateRange,
                    from: e.target.value || undefined
                  })}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Date To
                </label>
                <Input
                  type="date"
                  value={advancedFilters.dateRange.to || ""}
                  onChange={(e) => handleAdvancedFilterChange("dateRange", {
                    ...advancedFilters.dateRange,
                    to: e.target.value || undefined
                  })}
                  className="text-sm"
                />
              </div>

              {/* Score Range */}
              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Min Score
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={advancedFilters.minScore || ""}
                  onChange={(e) => handleAdvancedFilterChange("minScore", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Max Score
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={advancedFilters.maxScore || ""}
                  onChange={(e) => handleAdvancedFilterChange("maxScore", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="text-sm"
                />
              </div>

              {/* Boolean Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary-700 block">
                  Contact Info
                </label>
                <div className="space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={advancedFilters.hasEmail === true}
                      onChange={(e) => handleAdvancedFilterChange("hasEmail", e.target.checked ? true : undefined)}
                      className="mr-2"
                    />
                    <span className="text-sm">Has Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={advancedFilters.hasPhone === true}
                      onChange={(e) => handleAdvancedFilterChange("hasPhone", e.target.checked ? true : undefined)}
                      className="mr-2"
                    />
                    <span className="text-sm">Has Phone</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700 mb-2 block">
                  Returning Customer
                </label>
                <select
                  value={advancedFilters.isReturning === undefined ? "" : advancedFilters.isReturning.toString()}
                  onChange={(e) => handleAdvancedFilterChange("isReturning", 
                    e.target.value === "" ? undefined : e.target.value === "true"
                  )}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-secondary-200">
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveSearch(!showSaveSearch)}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Save Search
                </Button>
              </div>
            </div>

            {showSaveSearch && (
              <div className="mt-3 pt-3 border-t border-secondary-200">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search name..."
                    value={newSearchName}
                    onChange={(e) => setNewSearchName(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" onClick={saveCurrentSearch}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowSaveSearch(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Filters & Bulk Actions */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Search: {searchQuery}
                  <button onClick={() => handleSearch("")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {Object.entries(advancedFilters).map(([key, value]) => {
                if (value === undefined || value === null) return null;
                if (typeof value === "object" && "from" in value) {
                  if (!value.from && !value.to) return null;
                }
                return (
                  <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    <button onClick={() => handleAdvancedFilterChange(key, undefined)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            {selectedLeads.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary-600">
                  {selectedLeads.size} selected
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("export")}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("assign")}>
                    <User className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("archive")}>
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Header with Sort and Selection */}
      <div className="bg-white border-b border-secondary-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-secondary-600 hover:text-secondary-900"
              >
                {selectedLeads.size === paginatedLeads.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select All ({paginatedLeads.length})
              </button>
            </div>
            <span className="text-sm text-secondary-500">
              Showing {paginatedLeads.length} of {sortedLeads.length} leads
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-secondary-200 rounded text-sm"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={250}>250 per page</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("createdAt")}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Sort by Date
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-secondary-200 p-4 animate-pulse">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-4 w-4 bg-secondary-200 rounded mt-1" />
                    <div className="flex-1">
                      <div className="h-4 bg-secondary-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-secondary-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-secondary-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-secondary-400" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              {hasActiveFilters ? "No leads match your criteria" : "No leads found"}
            </h3>
            <p className="text-secondary-600 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms"
                : "Get started by adding your first lead"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {paginatedLeads.map((lead) => (
              <div
                key={lead.id}
                className={cn(
                  "bg-white rounded-lg border transition-all hover:shadow-sm",
                  selectedLeads.has(lead.id) ? "border-primary-300 bg-primary-50" : "border-secondary-200"
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleSelectLead(lead.id, !selectedLeads.has(lead.id))}
                      className="mt-1"
                    >
                      {selectedLeads.has(lead.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary-600" />
                      ) : (
                        <Square className="h-4 w-4 text-secondary-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-secondary-900 truncate">
                            {lead.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-secondary-600">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                            {lead.score && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Score: {lead.score}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-secondary-100 rounded-full">
                              {lead.insuranceType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            lead.status === "new" && "bg-blue-100 text-blue-700",
                            lead.status === "contacted" && "bg-yellow-100 text-yellow-700",
                            lead.status === "qualified" && "bg-purple-100 text-purple-700",
                            lead.status === "converted" && "bg-green-100 text-green-700",
                            lead.status === "lost" && "bg-red-100 text-red-700"
                          )}>
                            {lead.status}
                          </span>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onLeadClick?.(lead)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onLeadCall?.(lead)}
                              disabled={!lead.phone}
                              title="Call Lead"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onLeadEmail?.(lead)}
                              disabled={!lead.email}
                              title="Email Lead"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-secondary-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}