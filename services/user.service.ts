import apiClient from "@/lib/api-client";
import { User, PaginatedResponse, PaginationParams } from "@/types";

class UserService {
  async getProfile(): Promise<User> {
    return apiClient.get<User>("/api/v1/users/me/");
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiClient.patch<User>("/api/v1/users/me/", data);
  }

  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>("/api/v1/users/", { params });
  }

  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`/api/v1/users/${id}/`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return apiClient.patch<User>(`/api/v1/users/${id}/`, data);
  }

  async deleteUser(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/users/${id}/`);
  }
}

export const userService = new UserService();
