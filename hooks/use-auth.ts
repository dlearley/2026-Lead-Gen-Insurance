import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";

export function useAuth() {
  const router = useRouter();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    setUser,
    clearAuth,
    setLoading,
    setError,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authService.login({ email, password });
        setAuth(response.user, response.access, response.refresh);
        localStorage.setItem("access_token", response.access);
        localStorage.setItem("refresh_token", response.refresh);
        router.push("/dashboard");
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || "Login failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setAuth, router]
  );

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authService.register({ email, password, firstName, lastName });
        setAuth(response.user, response.access, response.refresh);
        localStorage.setItem("access_token", response.access);
        localStorage.setItem("refresh_token", response.refresh);
        router.push("/dashboard");
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || "Registration failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setAuth, router]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuth();
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setLoading(false);
      router.push("/login");
    }
  }, [clearAuth, setLoading, router]);

  const resetPassword = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await authService.resetPassword({ email });
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || "Password reset failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  const confirmPasswordReset = useCallback(
    async (token: string, newPassword: string) => {
      setLoading(true);
      setError(null);
      try {
        await authService.confirmPasswordReset({ token, newPassword });
        router.push("/login");
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || "Password reset confirmation failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, router]
  );

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      setUser(user);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setLoading, setUser]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      refreshUser();
    }
  }, [isAuthenticated, user, refreshUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    resetPassword,
    confirmPasswordReset,
    refreshUser,
  };
}
