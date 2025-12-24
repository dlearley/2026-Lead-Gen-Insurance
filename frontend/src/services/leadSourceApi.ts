import type { LeadSource, LeadSourceType } from '../types/user';

const API_BASE = '/api/v1';

class LeadSourceApiService {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }
    return response.json();
  }

  // Get all lead sources
  async getSources(activeOnly: boolean = true): Promise<LeadSource[]> {
    const response = await fetch(`${API_BASE}/lead-sources?active_only=${activeOnly}`);
    return this.handleResponse<LeadSource[]>(response);
  }

  // Get a single lead source
  async getSourceById(sourceId: number): Promise<LeadSource> {
    const response = await fetch(`${API_BASE}/lead-sources/${sourceId}`);
    return this.handleResponse<LeadSource>(response);
  }

  // Create a new lead source
  async createSource(source: { name: string; type: LeadSourceType; description?: string }): Promise<LeadSource> {
    const response = await fetch(`${API_BASE}/lead-sources`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(source),
    });
    return this.handleResponse<LeadSource>(response);
  }

  // Update a lead source
  async updateSource(
    sourceId: number,
    source: { name?: string; type?: LeadSourceType; description?: string; is_active?: boolean }
  ): Promise<LeadSource> {
    const response = await fetch(`${API_BASE}/lead-sources/${sourceId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(source),
    });
    return this.handleResponse<LeadSource>(response);
  }

  // Delete a lead source
  async deleteSource(sourceId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/lead-sources/${sourceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete lead source');
    }
  }
}

export const leadSourceApi = new LeadSourceApiService();
