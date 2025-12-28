import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Lead, LeadFilters } from '../types/lead';

interface LeadState {
  // Data
  leads: Lead[];
  selectedLead: Lead | null;
  filters: LeadFilters;
  
  // Pagination
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  
  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Selection
  selectedLeadIds: number[];
  
  // Search
  searchQuery: string;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: number, lead: Partial<Lead>) => void;
  removeLead: (id: number) => void;
  setSelectedLead: (lead: Lead | null) => void;
  
  setFilters: (filters: Partial<LeadFilters>) => void;
  clearFilters: () => void;
  
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  setTotalPages: (totalPages: number) => void;
  
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  
  toggleLeadSelection: (id: number) => void;
  selectAllLeads: () => void;
  clearSelection: () => void;
  setSelectedLeadIds: (ids: number[]) => void;
  
  setSearchQuery: (query: string) => void;
  
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  reset: () => void;
}

const initialState = {
  leads: [],
  selectedLead: null,
  filters: {},
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  sortBy: 'created_at',
  sortOrder: 'desc' as const,
  selectedLeadIds: [],
  searchQuery: '',
  isLoading: false,
  error: null,
};

export const useLeadStore = create<LeadState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setLeads: (leads) => set({ leads }),
        
        addLead: (lead) =>
          set((state) => ({
            leads: [lead, ...state.leads],
            total: state.total + 1,
          })),
        
        updateLead: (id, leadData) =>
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id ? { ...lead, ...leadData } : lead
            ),
            selectedLead:
              state.selectedLead?.id === id
                ? { ...state.selectedLead, ...leadData }
                : state.selectedLead,
          })),
        
        removeLead: (id) =>
          set((state) => ({
            leads: state.leads.filter((lead) => lead.id !== id),
            total: state.total - 1,
            selectedLeadIds: state.selectedLeadIds.filter((leadId) => leadId !== id),
          })),
        
        setSelectedLead: (lead) => set({ selectedLead: lead }),
        
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
            page: 1, // Reset to first page when filters change
          })),
        
        clearFilters: () => set({ filters: {}, page: 1 }),
        
        setPage: (page) => set({ page }),
        setPageSize: (pageSize) => set({ pageSize, page: 1 }),
        setTotal: (total) => set({ total }),
        setTotalPages: (totalPages) => set({ totalPages }),
        
        setSortBy: (sortBy) => set({ sortBy }),
        setSortOrder: (sortOrder) => set({ sortOrder }),
        
        toggleLeadSelection: (id) =>
          set((state) => ({
            selectedLeadIds: state.selectedLeadIds.includes(id)
              ? state.selectedLeadIds.filter((leadId) => leadId !== id)
              : [...state.selectedLeadIds, id],
          })),
        
        selectAllLeads: () =>
          set((state) => ({
            selectedLeadIds: state.leads.map((lead) => lead.id),
          })),
        
        clearSelection: () => set({ selectedLeadIds: [] }),
        
        setSelectedLeadIds: (ids) => set({ selectedLeadIds: ids }),
        
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        
        reset: () => set(initialState),
      }),
      {
        name: 'lead-store',
        partialize: (state) => ({
          pageSize: state.pageSize,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }),
      }
    ),
    { name: 'LeadStore' }
  )
);
