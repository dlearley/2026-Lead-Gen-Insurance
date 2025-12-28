import apiClient from "@/lib/api-client";
import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadFilter,
  LeadListResponse,
  LeadDetail,
} from "@/types/leads";

interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  insuranceType?: string;
}

class LeadService {
  private basePath = "/api/v1/leads";

  async list(params: ListParams = {}): Promise<LeadListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set("page", params.page.toString());
    if (params.pageSize) queryParams.set("page_size", params.pageSize.toString());
    if (params.sortBy) queryParams.set("sort_by", params.sortBy);
    if (params.sortOrder) queryParams.set("sort_order", params.sortOrder);
    if (params.status) queryParams.set("status", params.status);
    if (params.priority) queryParams.set("priority", params.priority);
    if (params.assigneeId) queryParams.set("assignee_id", params.assigneeId);
    if (params.search) queryParams.set("search", params.search);
    if (params.insuranceType) queryParams.set("insurance_type", params.insuranceType);

    const query = queryParams.toString();
    const url = query ? `${this.basePath}?${query}` : this.basePath;

    return apiClient.get<LeadListResponse>(url);
  }

  async getById(id: string): Promise<LeadDetail> {
    return apiClient.get<LeadDetail>(`${this.basePath}/${id}`);
  }

  async create(data: LeadCreate): Promise<Lead> {
    return apiClient.post<Lead>(this.basePath, data);
  }

  async update(id: string, data: LeadUpdate): Promise<Lead> {
    return apiClient.put<Lead>(`${this.basePath}/${id}`, data);
  }

  async partialUpdate(id: string, data: Partial<LeadUpdate>): Promise<Lead> {
    return apiClient.patch<Lead>(`${this.basePath}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete(`${this.basePath}/${id}`);
  }

  async updateStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<Lead> {
    return apiClient.patch<Lead>(`${this.basePath}/${id}/status`, { status, reason });
  }

  async assign(id: string, assigneeId: string, reason?: string): Promise<Lead> {
    return apiClient.post<Lead>(`${this.basePath}/${id}/assign`, {
      assignee_id: assigneeId,
      reason,
    });
  }

  async bulkUpdate(
    ids: string[],
    updates: Partial<LeadUpdate>
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    return apiClient.post(`${this.basePath}/bulk/update`, {
      lead_ids: ids,
      updates,
    });
  }

  async bulkAssign(
    ids: string[],
    assigneeId: string,
    reason?: string
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    return apiClient.post(`${this.basePath}/bulk/assign`, {
      lead_ids: ids,
      assignee_id: assigneeId,
      reason,
    });
  }

  async bulkStatusUpdate(
    ids: string[],
    status: string,
    reason?: string
  ): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    return apiClient.post(`${this.basePath}/bulk/status`, {
      lead_ids: ids,
      status,
      reason,
    });
  }

  async export(
    filters?: LeadFilter,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${this.basePath}/export`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify({ filters, format }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export leads');
    }

    return response.blob();
  }

  async search(query: string, filters?: LeadFilter): Promise<LeadListResponse> {
    return apiClient.post<LeadListResponse>(`${this.basePath}/search`, {
      query,
      filters,
    });
  }

  async getNearby(
    latitude: number,
    longitude: number,
    radiusMiles: number = 50
  ): Promise<Lead[]> {
    return apiClient.get(`${this.basePath}/nearby`, {
      params: {
        lat: latitude,
        lng: longitude,
        radius: radiusMiles,
      },
    });
  }

  private getToken(): string {
    if (typeof window === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
    return match ? match[2] : '';
  }
}

export const leadService = new LeadService();
