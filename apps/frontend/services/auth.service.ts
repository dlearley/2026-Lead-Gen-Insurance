import apiClient from "@/lib/api-client";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
} from "@/types";

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/api/v1/auth/login/", credentials);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/api/v1/auth/register/", userData);
  }

  async logout(): Promise<void> {
    return apiClient.post("/api/v1/auth/logout/");
  }

  async refreshToken(): Promise<{ access: string }> {
    const refreshToken = localStorage.getItem("refresh_token");
    return apiClient.post<{ access: string }>("/api/v1/auth/token/refresh/", {
      refresh: refreshToken,
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    return apiClient.post("/api/v1/auth/password/reset/", data);
  }

  async confirmPasswordReset(data: ConfirmResetPasswordRequest): Promise<void> {
    return apiClient.post("/api/v1/auth/password/reset/confirm/", data);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return apiClient.post("/api/v1/auth/password/change/", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  async getCurrentUser() {
    return apiClient.get("/api/v1/auth/me/");
  }
}

export const authService = new AuthService();
