import { create } from "zustand";
import { Organization, PaginatedResponse } from "@/types";

interface OrganizationState {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  setOrganizations: (organizations: Organization[]) => void;
  setSelectedOrganization: (organization: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (count: number, page: number, pageSize: number) => void;
  updateLocalOrganization: (orgId: string, data: Partial<Organization>) => void;
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  selectedOrganization: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 20,
  },
  setOrganizations: (organizations) => set({ organizations }),
  setSelectedOrganization: (organization) => set({ selectedOrganization: organization }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPagination: (count, page, pageSize) => set({ pagination: { count, page, pageSize } }),
  updateLocalOrganization: (orgId, data) =>
    set((state) => ({
      organizations: state.organizations.map((org) =>
        org.id === orgId ? { ...org, ...data } : org
      ),
      selectedOrganization:
        state.selectedOrganization?.id === orgId
          ? { ...state.selectedOrganization, ...data }
          : state.selectedOrganization,
    })),
}));
