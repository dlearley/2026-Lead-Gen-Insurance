import type {
  Lead,
  LeadDetail,
  LeadCreate,
  LeadUpdate,
  LeadAssign,
  LeadStatusUpdate,
  LeadFilters,
  PaginatedResponse,
  BulkOperationResponse,
  ExportFormat,
  LeadStats
} from '../types/lead';

const API_BASE = '/api/v1';

class LeadApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }
    return response.json();
  }

  // Create a new lead
  async createLead(lead: LeadCreate): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(lead),
    });
    return this.handleResponse<Lead>(response);
  }

  // Get leads with filtering and pagination
  async getLeads(
    filters?: LeadFilters,
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Lead>> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('page_size', pageSize.toString());
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);

    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(p => params.append('priority', p));
      }
      if (filters.source_id) params.set('source_id', filters.source_id.toString());
      if (filters.campaign_id) params.set('campaign_id', filters.campaign_id.toString());
      if (filters.assignee_id) params.set('assignee_id', filters.assignee_id.toString());
      if (filters.unassigned !== undefined) params.set('unassigned', filters.unassigned.toString());
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.search) params.set('search', filters.search);
      if (filters.insurance_type) params.set('insurance_type', filters.insurance_type);
      if (filters.tags) params.set('tags', filters.tags);
    }

    const response = await fetch(`${API_BASE}/leads?${params.toString()}`);
    return this.handleResponse<PaginatedResponse<Lead>>(response);
  }

  // Search leads
  async searchLeads(
    query: string,
    filters?: LeadFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Lead>> {
    const params = new URLSearchParams({ q: query });
    params.set('page', page.toString());
    params.set('page_size', pageSize.toString());

    if (filters?.status?.length) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters?.priority?.length) {
      filters.priority.forEach(p => params.append('priority', p));
    }

    const response = await fetch(`${API_BASE}/leads/search?${params.toString()}`);
    return this.handleResponse<PaginatedResponse<Lead>>(response);
  }

  // Get a single lead by ID
  async getLeadById(leadId: number): Promise<LeadDetail> {
    const response = await fetch(`${API_BASE}/leads/${leadId}`);
    return this.handleResponse<LeadDetail>(response);
  }

  // Update a lead
  async updateLead(leadId: number, lead: LeadUpdate): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${leadId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(lead),
    });
    return this.handleResponse<Lead>(response);
  }

  // Delete a lead
  async deleteLead(leadId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${leadId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete lead');
    }
  }

  // Assign a lead
  async assignLead(leadId: number, assignment: LeadAssign): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/assign`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(assignment),
    });
    return this.handleResponse<Lead>(response);
  }

  // Update lead status
  async updateLeadStatus(leadId: number, statusUpdate: LeadStatusUpdate): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(statusUpdate),
    });
    return this.handleResponse<Lead>(response);
  }

  // Bulk update leads
  async bulkUpdate(leadIds: number[], updates: LeadUpdate): Promise<BulkOperationResponse> {
    const response = await fetch(`${API_BASE}/leads/bulk/update`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ lead_ids: leadIds, updates }),
    });
    return this.handleResponse<BulkOperationResponse>(response);
  }

  // Bulk assign leads
  async bulkAssign(leadIds: number[], assigneeId: number, reason?: string): Promise<BulkOperationResponse> {
    const response = await fetch(`${API_BASE}/leads/bulk/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ lead_ids: leadIds, assignee_id: assigneeId, reason }),
    });
    return this.handleResponse<BulkOperationResponse>(response);
  }

  // Bulk update lead status
  async bulkStatusUpdate(
    leadIds: number[],
    status: LeadStatus,
    reason?: string
  ): Promise<BulkOperationResponse> {
    const response = await fetch(`${API_BASE}/leads/bulk/status`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ lead_ids: leadIds, status, reason }),
    });
    return this.handleResponse<BulkOperationResponse>(response);
  }

  // Bulk delete leads
  async bulkDelete(leadIds: number[]): Promise<BulkOperationResponse> {
    const response = await fetch(`${API_BASE}/leads/bulk/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ lead_ids: leadIds }),
    });
    return this.handleResponse<BulkOperationResponse>(response);
  }

  // Export leads
  async exportLeads(filters?: LeadFilters, format: ExportFormat = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({ format });
    
    if (filters) {
      if (filters.status?.length) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(p => params.append('priority', p));
      }
      if (filters.source_id) params.set('source_id', filters.source_id.toString());
      if (filters.campaign_id) params.set('campaign_id', filters.campaign_id.toString());
      if (filters.assignee_id) params.set('assignee_id', filters.assignee_id.toString());
      if (filters.unassigned !== undefined) params.set('unassigned', filters.unassigned.toString());
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.search) params.set('search', filters.search);
    }

    const response = await fetch(`${API_BASE}/leads/export?${params.toString()}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ filters }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Get lead stats
  async getLeadStats(): Promise<LeadStats> {
    const response = await fetch(`${API_BASE}/leads/stats`);
    return this.handleResponse<LeadStats>(response);
  }
}

export const leadApi = new LeadApiService();
