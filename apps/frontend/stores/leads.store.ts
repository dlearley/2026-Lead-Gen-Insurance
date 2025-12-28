import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Lead, LeadFilter } from "@/types/leads";

interface LeadsState {
  leads: Lead[];
  selectedLeadId: string | null;
  filters: LeadFilter;
  viewMode: "list" | "grid" | "map";
  sortBy: "createdAt" | "updatedAt" | "priority" | "status" | "distance";
  sortOrder: "asc" | "desc";
  lastFetched: string | null;
  
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  selectLead: (id: string | null) => void;
  setFilters: (filters: LeadFilter) => void;
  clearFilters: () => void;
  setViewMode: (mode: "list" | "grid" | "map") => void;
  setSortBy: (sortBy: LeadsState["sortBy"]) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  clearLeads: () => void;
}

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set) => ({
      leads: [],
      selectedLeadId: null,
      filters: {},
      viewMode: "list",
      sortBy: "createdAt",
      sortOrder: "desc",
      lastFetched: null,

      setLeads: (leads) =>
        set({
          leads,
          lastFetched: new Date().toISOString(),
        }),

      addLead: (lead) =>
        set((state) => ({
          leads: [lead, ...state.leads],
        })),

      updateLead: (id, data) =>
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? { ...lead, ...data } : lead
          ),
        })),

      removeLead: (id) =>
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
          selectedLeadId:
            state.selectedLeadId === id ? null : state.selectedLeadId,
        })),

      selectLead: (id) => set({ selectedLeadId: id }),

      setFilters: (filters) => set({ filters }),

      clearFilters: () => set({ filters: {} }),

      setViewMode: (viewMode) => set({ viewMode }),

      setSortBy: (sortBy) => set({ sortBy }),

      setSortOrder: (sortOrder) => set({ sortOrder }),

      clearLeads: () =>
        set({
          leads: [],
          selectedLeadId: null,
          lastFetched: null,
        }),
    }),
    {
      name: "leads-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

interface FieldWorkState {
  isOffline: boolean;
  pendingSync: Lead[];
  lastSyncTime: string | null;
  currentLocation: GeolocationPosition | null;
  assignedLeadsCount: number;
  todayTasksCount: number;
  
  setOfflineStatus: (isOffline: boolean) => void;
  addPendingSync: (lead: Lead) => void;
  removePendingSync: (leadId: string) => void;
  clearPendingSync: () => void;
  setCurrentLocation: (location: GeolocationPosition | null) => void;
  setAssignedLeadsCount: (count: number) => void;
  setTodayTasksCount: (count: number) => void;
  updateLastSyncTime: () => void;
}

export const useFieldWorkStore = create<FieldWorkState>()(
  persist(
    (set) => ({
      isOffline: false,
      pendingSync: [],
      lastSyncTime: null,
      currentLocation: null,
      assignedLeadsCount: 0,
      todayTasksCount: 0,

      setOfflineStatus: (isOffline) => set({ isOffline }),

      addPendingSync: (lead) =>
        set((state) => ({
          pendingSync: [...state.pendingSync, lead],
        })),

      removePendingSync: (leadId) =>
        set((state) => ({
          pendingSync: state.pendingSync.filter((l) => l.id !== leadId),
        })),

      clearPendingSync: () => set({ pendingSync: [] }),

      setCurrentLocation: (location) => set({ currentLocation: location }),

      setAssignedLeadsCount: (count) => set({ assignedLeadsCount: count }),

      setTodayTasksCount: (count) => set({ todayTasksCount: count }),

      updateLastSyncTime: () =>
        set({ lastSyncTime: new Date().toISOString() }),
    }),
    {
      name: "field-work-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface LeadCacheState {
  cache: Record<string, { data: Lead; timestamp: number }>;
  maxAge: number;
  
  set: (key: string, data: Lead) => void;
  get: (key: string) => Lead | null;
  remove: (key: string) => void;
  clear: () => void;
  cleanup: () => void;
}

export const useLeadCache = create<LeadCacheState>()((set, get) => ({
  cache: {},
  maxAge: 5 * 60 * 1000,

  set: (key, data) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { data, timestamp: Date.now() },
      },
    })),

  get: (key) => {
    const entry = get().cache[key];
    if (!entry) return null;

    if (Date.now() - entry.timestamp > get().maxAge) {
      get().remove(key);
      return null;
    }

    return entry.data;
  },

  remove: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.cache;
      return { cache: rest };
    }),

  clear: () => set({ cache: {} }),

  cleanup: () => {
    const now = Date.now();
    const maxAge = get().maxAge;
    set((state) => ({
      cache: Object.fromEntries(
        Object.entries(state.cache).filter(
          ([_, entry]) => now - entry.timestamp <= maxAge
        )
      ),
    }));
  },
}));
