import type { Campaign, CampaignStatus } from '../types/user';

const API_BASE = '/api/v1';

class CampaignApiService {
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

  // Get all campaigns
  async getCampaigns(
    activeOnly: boolean = true,
    sourceId?: number,
    teamId?: number
  ): Promise<Campaign[]> {
    const params = new URLSearchParams({ active_only: activeOnly.toString() });
    if (sourceId) params.set('source_id', sourceId.toString());
    if (teamId) params.set('team_id', teamId.toString());

    const response = await fetch(`${API_BASE}/campaigns?${params.toString()}`);
    return this.handleResponse<Campaign[]>(response);
  }

  // Get a single campaign
  async getCampaignById(campaignId: number): Promise<Campaign> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}`);
    return this.handleResponse<Campaign>(response);
  }

  // Create a new campaign
  async createCampaign(campaign: {
    name: string;
    description?: string;
    source_id?: number;
    team_id?: number;
    start_date?: string;
    end_date?: string;
    budget?: number;
    status?: CampaignStatus;
  }): Promise<Campaign> {
    const response = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(campaign),
    });
    return this.handleResponse<Campaign>(response);
  }

  // Update a campaign
  async updateCampaign(
    campaignId: number,
    campaign: {
      name?: string;
      description?: string;
      source_id?: number;
      team_id?: number;
      start_date?: string;
      end_date?: string;
      budget?: number;
      status?: CampaignStatus;
      is_active?: boolean;
    }
  ): Promise<Campaign> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(campaign),
    });
    return this.handleResponse<Campaign>(response);
  }

  // Delete a campaign
  async deleteCampaign(campaignId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete campaign');
    }
  }

  // Get campaign performance metrics
  async getCampaignPerformance(campaignId: number): Promise<{
    campaign_id: number;
    campaign_name: string;
    total_leads: number;
    by_status: Record<string, number>;
    total_value: number;
    budget: number;
    budget_remaining: number | null;
  }> {
    const response = await fetch(`${API_BASE}/campaigns/${campaignId}/performance`);
    return this.handleResponse(response);
  }
}

export const campaignApi = new CampaignApiService();
