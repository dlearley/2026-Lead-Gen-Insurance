import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthService, type LoginCredentials, type AuthState } from '../auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    authService = new AuthService();
    // Clear any stored tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            role: 'ADMIN',
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authService.login(credentials);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on invalid credentials', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Invalid credentials' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const credentials: LoginCredentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should store tokens in localStorage', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          user: { id: 'user-1', email: 'test@example.com', role: 'ADMIN' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(localStorage.getItem('auth_token')).toBe('access_token_123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh_token_456');
    });
  });

  describe('logout', () => {
    it('should clear tokens from localStorage', async () => {
      localStorage.setItem('auth_token', 'test_token');
      localStorage.setItem('refresh_token', 'refresh_token');

      await authService.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should call logout API', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);

      await authService.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.any(Object)
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from state', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          role: 'ADMIN',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const user = await authService.getCurrentUser();

      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when not authenticated', async () => {
      localStorage.removeItem('auth_token');
      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('auth_token', 'valid_token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      localStorage.removeItem('auth_token');
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      localStorage.setItem('refresh_token', 'valid_refresh');
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'new_access_token',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const newToken = await authService.refreshToken();

      expect(newToken).toBe('new_access_token');
      expect(localStorage.getItem('auth_token')).toBe('new_access_token');
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          role: 'ADMIN',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await authService.getCurrentUser();
      
      expect(authService.hasRole('ADMIN')).toBe(true);
      expect(authService.hasRole('AGENT')).toBe(false);
    });
  });
});
