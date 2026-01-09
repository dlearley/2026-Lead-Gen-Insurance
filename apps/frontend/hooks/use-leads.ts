import { useState, useEffect, useCallback } from "react";
import { leadService } from "@/services/leads.service";
import type {
  Lead,
  LeadDetail,
  LeadFilter,
  LeadListResponse,
  PaginatedLeads,
} from "@/types/leads";

interface UseLeadsOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: LeadFilter;
  autoFetch?: boolean;
}

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: LeadFilter;
  setFilters: (filters: LeadFilter) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const {
    initialPage = 1,
    initialPageSize = 20,
    initialFilters = {},
    autoFetch = true,
  } = options;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilter>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | undefined> = {
        page: page > 1 ? page.toString() : undefined,
        page_size: pageSize.toString(),
        search: filters.search,
        status: Array.isArray(filters.status)
          ? filters.status.join(',')
          : filters.status,
        priority: Array.isArray(filters.priority)
          ? filters.priority.join(',')
          : filters.priority,
        assignee_id: filters.assigneeId,
        insurance_type: filters.insuranceType,
      };

      const response = await leadService.list(params);

      setLeads(response.results || response.items || []);
      setTotal(response.count || response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leads");
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
    }
  }, [autoFetch, fetchLeads]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    leads,
    loading,
    error,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    filters,
    setFilters: (newFilters) => {
      setFilters(newFilters);
      setPage(1);
    },
    setPage: (newPage) => {
      setPage(newPage);
    },
    setPageSize: (newSize) => {
      setPageSize(newSize);
      setPage(1);
    },
    refetch: fetchLeads,
    refresh: fetchLeads,
  };
}

interface UseLeadDetailReturn {
  lead: LeadDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (data: Partial<LeadDetail>) => Promise<void>;
}

export function useLeadDetail(leadId: string | null): UseLeadDetailReturn {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await leadService.getById(leadId);
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lead");
      console.error("Error fetching lead:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const update = useCallback(
    async (data: Partial<LeadDetail>) => {
      if (!leadId) return;

      try {
        const updated = await leadService.update(leadId, data);
        setLead((prev) => (prev ? { ...prev, ...updated } : updated));
      } catch (err) {
        throw err;
      }
    },
    [leadId]
  );

  return { lead, loading, error, refetch: fetchLead, update };
}

interface UseLeadMutationsReturn {
  createLead: (data: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<LeadUpdate>) => Promise<Lead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: string, reason?: string) => Promise<Lead | null>;
  assignLead: (id: string, assigneeId: string, reason?: string) => Promise<Lead | null>;
  bulkUpdateStatus: (leadIds: string[], status: string, reason?: string) => Promise<Lead[]>;
  bulkAssignLeads: (leadIds: string[], assigneeId: string, reason?: string) => Promise<Lead[]>;
  exportLeads: (leadIds?: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useLeadMutations(): UseLeadMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLead = useCallback(async (data: Partial<Lead>): Promise<Lead | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const lead = await leadService.create(data as any);
      return lead;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLead = useCallback(
    async (id: string, data: Partial<LeadUpdate>): Promise<Lead | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const lead = await leadService.update(id, data);
        return lead;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update lead");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await leadService.delete(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: string, reason?: string): Promise<Lead | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const lead = await leadService.updateStatus(id, status, reason);
        return lead;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const assignLead = useCallback(
    async (id: string, assigneeId: string, reason?: string): Promise<Lead | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const lead = await leadService.assign(id, assigneeId, reason);
        return lead;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign lead");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const bulkUpdateStatus = useCallback(
    async (leadIds: string[], status: string, reason?: string): Promise<Lead[]> => {
      try {
        setIsLoading(true);
        setError(null);
        
        const promises = leadIds.map(id => 
          leadService.updateStatus(id, status, reason)
        );
        
        const results = await Promise.all(promises);
        return results.filter(Boolean) as Lead[];
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update leads");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const bulkAssignLeads = useCallback(
    async (leadIds: string[], assigneeId: string, reason?: string): Promise<Lead[]> => {
      try {
        setIsLoading(true);
        setError(null);
        
        const promises = leadIds.map(id => 
          leadService.assign(id, assigneeId, reason)
        );
        
        const results = await Promise.all(promises);
        return results.filter(Boolean) as Lead[];
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign leads");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const exportLeads = useCallback(async (leadIds?: string[]): Promise<void> => {
    try {
      setError(null);
      
      // Use the lead service to export leads
      const exportData = await leadService.export(leadIds);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export leads");
    }
  }, []);

  return {
    createLead,
    updateLead,
    deleteLead,
    updateStatus,
    assignLead,
    bulkUpdateStatus,
    bulkAssignLeads,
    exportLeads,
    isLoading,
    error,
  };
}

export function useLeadSearch() {
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: LeadFilter) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await leadService.search(query, filters);
      setResults(response.results || response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}

export function useNearbyLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);

  const getLocation = useCallback(() => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }, []);

  const fetchNearby = useCallback(async (radiusMiles?: number) => {
    try {
      setLoading(true);
      setError(null);

      let position: GeolocationPosition;
      if (!location) {
        position = await getLocation();
        setLocation(position);
      } else {
        position = location;
      }

      const nearby = await leadService.getNearby(
        position.coords.latitude,
        position.coords.longitude,
        radiusMiles
      );

      setLeads(nearby);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch nearby leads"
      );
      console.error("Error fetching nearby leads:", err);
    } finally {
      setLoading(false);
    }
  }, [location, getLocation]);

  return {
    leads,
    loading,
    error,
    location,
    refreshLocation: getLocation,
    fetchNearby,
  };
}
