import type { Agent } from '../types';

const API_BASE = '/api/v1';

export interface AgentFilters {
  active?: boolean;
  specialization?: string;
  limit?: number;
}

class AgentApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || error.detail || 'An error occurred');
    }
    return response.json();
  }

  // Get all agents with optional filters
  async getAgents(filters?: AgentFilters): Promise<{ agents: Agent[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters?.active !== undefined) {
      params.set('active', filters.active.toString());
    }
    
    if (filters?.specialization) {
      params.set('specialization', filters.specialization);
    }
    
    if (filters?.limit) {
      params.set('limit', filters.limit.toString());
    }

    const response = await fetch(`${API_BASE}/agents?${params.toString()}`);
    return this.handleResponse<{ agents: Agent[]; total: number }>(response);
  }

  // Get a single agent by ID
  async getAgentById(agentId: string): Promise<Agent> {
    const response = await fetch(`${API_BASE}/agents/${agentId}`);
    return this.handleResponse<Agent>(response);
  }

  // Get agent specializations
  async getAgentSpecializations(agentId: string): Promise<{ agentId: string; specializations: string[] }> {
    const response = await fetch(`${API_BASE}/agents/${agentId}/specializations`);
    return this.handleResponse<{ agentId: string; specializations: string[] }>(response);
  }

  // Get agent performance metrics
  async getAgentMetrics(agentId: string): Promise<{
    agentId: string;
    rating: number;
    conversionRate: number;
    averageResponseTime: number;
    currentLeadCount: number;
    maxLeadCapacity: number;
    availableCapacity: number;
    utilizationPercentage: number;
    isActive: boolean;
  }> {
    const response = await fetch(`${API_BASE}/agents/${agentId}/metrics`);
    return this.handleResponse(response);
  }

  // Create a new agent
  async createAgent(agentData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    licenseNumber: string;
    specializations: string[];
    location: {
      city: string;
      state: string;
      country?: string;
    };
    rating?: number;
    maxLeadCapacity?: number;
  }): Promise<Agent> {
    const response = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(agentData),
    });
    return this.handleResponse<Agent>(response);
  }

  // Update an agent
  async updateAgent(agentId: string, agentData: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    licenseNumber: string;
    specializations: string[];
    location: {
      city: string;
      state: string;
      country?: string;
    };
    rating: number;
    isActive: boolean;
    maxLeadCapacity: number;
  }>): Promise<Agent> {
    const response = await fetch(`${API_BASE}/agents/${agentId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(agentData),
    });
    return this.handleResponse<Agent>(response);
  }

  // Deactivate an agent
  async deactivateAgent(agentId: string): Promise<{ message: string; agentId: string }> {
    const response = await fetch(`${API_BASE}/agents/${agentId}`, {
      method: 'DELETE',
    });
    return this.handleResponse<{ message: string; agentId: string }>(response);
  }
}

export const agentApi = new AgentApiService();
