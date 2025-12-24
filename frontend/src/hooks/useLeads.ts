import React, { useState, useEffect, useCallback } from 'react';
import { useLeadStore } from '../store/leadStore';
import { leadApi } from '../services/leadApi';
import type { Lead, LeadStatus, LeadPriority } from '../types/lead';

interface UseLeadsOptions {
  autoFetch?: boolean;
  debounceMs?: number;
}

export function useLeads(options: UseLeadsOptions = {}) {
  const { autoFetch = true, debounceMs = 300 } = options;
  
  const {
    leads,
    setLeads,
    selectedLead,
    setSelectedLead,
    filters,
    setFilters,
    clearFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    setTotal,
    totalPages,
    setTotalPages,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    isLoading,
    setLoading,
    error,
    setError,
  } = useLeadStore();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (debouncedSearchQuery) {
        const response = await leadApi.searchLeads(
          debouncedSearchQuery,
          filters,
          page,
          pageSize
        );
        setLeads(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);
      } else {
        const response = await leadApi.getLeads(
          filters,
          page,
          pageSize,
          sortBy,
          sortOrder
        );
        setLeads(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchQuery,
    filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
    setLeads,
    setTotal,
    setTotalPages,
    setLoading,
    setError,
  ]);

  // Auto-fetch on mount or when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
    }
  }, [autoFetch, fetchLeads]);

  // Actions
  const createLead = async (leadData: Partial<Lead>) => {
    setLoading(true);
    setError(null);

    try {
      const newLead = await leadApi.createLead(leadData as any);
      setLeads([newLead, ...leads]);
      setTotal(total + 1);
      return newLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (leadId: number, leadData: Partial<Lead>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedLead = await leadApi.updateLead(leadId, leadData as any);
      setLeads(leads.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      if (selectedLead?.id === leadId) {
        setSelectedLead(updatedLead);
      }
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (leadId: number) => {
    setLoading(true);
    setError(null);

    try {
      await leadApi.deleteLead(leadId);
      setLeads(leads.filter((lead) => lead.id !== leadId));
      setTotal(total - 1);
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignLead = async (leadId: number, assigneeId: number, reason?: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedLead = await leadApi.assignLead(leadId, { assignee_id: assigneeId, reason });
      setLeads(leads.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      if (selectedLead?.id === leadId) {
        setSelectedLead(updatedLead);
      }
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: number, status: LeadStatus, reason?: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedLead = await leadApi.updateLeadStatus(leadId, { status, reason });
      setLeads(leads.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      if (selectedLead?.id === leadId) {
        setSelectedLead(updatedLead);
      }
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Filter actions
  const setStatusFilter = (statuses: LeadStatus[]) => {
    setFilters({ status: statuses.length > 0 ? statuses : undefined });
  };

  const setPriorityFilter = (priorities: LeadPriority[]) => {
    setFilters({ priority: priorities.length > 0 ? priorities : undefined });
  };

  const setSourceFilter = (sourceId: number | undefined) => {
    setFilters({ source_id: sourceId });
  };

  const setCampaignFilter = (campaignId: number | undefined) => {
    setFilters({ campaign_id: campaignId });
  };

  const setAssigneeFilter = (assigneeId: number | undefined) => {
    setFilters({ assignee_id: assigneeId });
  };

  const setUnassignedFilter = (unassigned: boolean | undefined) => {
    setFilters({ unassigned });
  };

  const setDateRangeFilter = (dateFrom: string | undefined, dateTo: string | undefined) => {
    setFilters({ date_from: dateFrom, date_to: dateTo });
  };

  // Pagination actions
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return {
    // Data
    leads,
    selectedLead,
    filters,
    page,
    pageSize,
    total,
    totalPages,
    sortBy,
    sortOrder,
    searchQuery,
    isLoading,
    error,

    // Actions
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    assignLead,
    updateLeadStatus,

    // Filter actions
    setFilters,
    clearFilters,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setCampaignFilter,
    setAssigneeFilter,
    setUnassignedFilter,
    setDateRangeFilter,

    // Pagination actions
    setPage,
    setPageSize,
    goToPage,
    nextPage,
    prevPage,

    // Sorting actions
    setSortBy,
    setSortOrder,

    // Search actions
    setSearchQuery,
  };
}
