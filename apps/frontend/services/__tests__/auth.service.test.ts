import { describe, it, expect, beforeEach, vi } from "vitest";
import { authService } from "../auth.service";
import apiClient from "@/lib/api-client";

vi.mock("@/lib/api-client");

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login should call API with correct credentials", async () => {
    const mockResponse = {
      access: "test-access-token",
      refresh: "test-refresh-token",
      user: {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      },
    };

    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await authService.login({
      email: "test@example.com",
      password: "password123",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/login/", {
      email: "test@example.com",
      password: "password123",
    });
    expect(result).toEqual(mockResponse);
  });

  it("register should call API with correct user data", async () => {
    const mockResponse = {
      access: "test-access-token",
      refresh: "test-refresh-token",
      user: {
        id: "1",
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
      },
    };

    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await authService.register({
      email: "new@example.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/register/", {
      email: "new@example.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
    });
    expect(result).toEqual(mockResponse);
  });

  it("logout should call API endpoint", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    await authService.logout();

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/logout/");
  });
});
