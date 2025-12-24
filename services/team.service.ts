import apiClient from "@/lib/api-client";
import { Team, PaginatedResponse, PaginationParams } from "@/types";

class TeamService {
  async getTeams(params?: PaginationParams): Promise<PaginatedResponse<Team>> {
    return apiClient.get<PaginatedResponse<Team>>("/api/v1/teams/", { params });
  }

  async getTeamsByOrganization(orgId: string, params?: PaginationParams): Promise<PaginatedResponse<Team>> {
    return apiClient.get<PaginatedResponse<Team>>(`/api/v1/organizations/${orgId}/teams/`, { params });
  }

  async getTeamById(id: string): Promise<Team> {
    return apiClient.get<Team>(`/api/v1/teams/${id}/`);
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    return apiClient.post<Team>("/api/v1/teams/", data);
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    return apiClient.patch<Team>(`/api/v1/teams/${id}/`, data);
  }

  async deleteTeam(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/teams/${id}/`);
  }
}

export const teamService = new TeamService();
