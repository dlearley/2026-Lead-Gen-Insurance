import apiClient from "@/lib/api-client";
import { Organization, PaginatedResponse, PaginationParams } from "@/types";

class OrganizationService {
  async getOrganizations(params?: PaginationParams): Promise<PaginatedResponse<Organization>> {
    return apiClient.get<PaginatedResponse<Organization>>("/api/v1/organizations/", { params });
  }

  async getOrganizationById(id: string): Promise<Organization> {
    return apiClient.get<Organization>(`/api/v1/organizations/${id}/`);
  }

  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    return apiClient.post<Organization>("/api/v1/organizations/", data);
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
    return apiClient.patch<Organization>(`/api/v1/organizations/${id}/`, data);
  }

  async deleteOrganization(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/organizations/${id}/`);
  }
}

export const organizationService = new OrganizationService();
