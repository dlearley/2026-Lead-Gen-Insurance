import axios from 'axios';
import Cookies from 'js-cookie';
import type {
  BrokerNetwork,
  NetworkMetrics,
  NetworkLeaderboardEntry,
} from '@insurance/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ========================================
// AUTH HELPERS
// ========================================

const getAuthToken = (): string | undefined => {
  return Cookies.get('agency_token');
};

const setAuthToken = (token: string): void => {
  Cookies.set('agency_token', token, { expires: 7 });
};

const clearAuthToken = (): void => {
  Cookies.remove('agency_token');
};

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/agency-portal/login';
      }
    }
    return Promise.reject(error);
  },
);

export const agencyPortalService = {
  /**
   * Login agency
   */
  async login(email: string, password: string): Promise<{ token: string; agencyId: string }> {
    // In a real implementation, this would call an agency auth endpoint
    // For demo purposes, we'll use the broker auth endpoint
    const response = await apiClient.post<{ token: string; brokerId: string }>('/brokers/login', {
      email,
      password,
    });
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return {
      token: response.data.token,
      agencyId: response.data.brokerId, // Using brokerId as agencyId for demo
    };
  },

  /**
   * Logout agency
   */
  logout(): void {
    clearAuthToken();
  },

  /**
   * Check if agency is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Get current agency info
   */
  async getCurrentAgency(): Promise<{ id: string; email: string; name: string }> {
    const response = await apiClient.get<{ id: string; email: string; name: string }>('/brokers/me');
    return response.data;
  },

  // ========================================
  // AGENCY NETWORK MANAGEMENT
  // ========================================

  /**
   * Get agency network overview
   */
  async getAgencyNetworkOverview(agencyId: string): Promise<any> {
    const [profile, metrics, leaderboard] = await Promise.all([
      this.getNetworkProfile(agencyId),
      this.getNetworkMetrics(agencyId),
      this.getLeaderboard(10),
    ]);

    return {
      profile,
      metrics,
      leaderboard,
      topPerformers: leaderboard.slice(0, 5),
    };
  },

  /**
   * Get network profile
   */
  async getNetworkProfile(agencyId: string): Promise<BrokerNetwork> {
    const response = await apiClient.get<BrokerNetwork>(`/broker-network/profile/${agencyId}`);
    return response.data;
  },

  /**
   * Get network metrics
   */
  async getNetworkMetrics(agencyId: string): Promise<NetworkMetrics> {
    const response = await apiClient.get<NetworkMetrics>(`/broker-network/metrics/${agencyId}`);
    return response.data;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<NetworkLeaderboardEntry[]> {
    const response = await apiClient.get<NetworkLeaderboardEntry[]>(`/broker-network/leaderboard`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get network value
   */
  async getNetworkValue(agencyId: string): Promise<any> {
    const response = await apiClient.get(`/broker-network/value/${agencyId}`);
    return response.data;
  },

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(agencyId: string, period: 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    const response = await apiClient.get(`/broker-network/growth/${agencyId}`, {
      params: { period },
    });
    return response.data;
  },

  // ========================================
  // DASHBOARD
  // ========================================

  /**
   * Get agency dashboard data
   */
  async getDashboard(agencyId: string): Promise<any> {
    const [networkOverview, networkValue, growthMetrics] = await Promise.all([
      this.getAgencyNetworkOverview(agencyId),
      this.getNetworkValue(agencyId),
      this.getGrowthMetrics(agencyId),
    ]);

    return {
      networkOverview,
      networkValue,
      growthMetrics,
    };
  },
};

// Export auth helpers for use in components
export { getAuthToken, setAuthToken, clearAuthToken };