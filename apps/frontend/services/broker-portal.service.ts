import axios from 'axios';
import Cookies from 'js-cookie';
import type {
  BrokerNetwork,
  BrokerConnection,
  BrokerReferral,
  NetworkMetrics,
  NetworkLeaderboardEntry,
  NetworkValueCalculation,
  BrokerConnectionRequest,
  CreateBrokerReferralDto,
} from '@insurance/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ========================================
// AUTH HELPERS
// ========================================

const getAuthToken = (): string | undefined => {
  return Cookies.get('broker_token');
};

const setAuthToken = (token: string): void => {
  Cookies.set('broker_token', token, { expires: 7 });
};

const clearAuthToken = (): void => {
  Cookies.remove('broker_token');
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
        window.location.href = '/broker-portal/login';
      }
    }
    return Promise.reject(error);
  },
);

export const brokerPortalService = {
  /**
   * Login broker
   */
  async login(email: string, password: string): Promise<{ token: string; brokerId: string }> {
    const response = await apiClient.post<{ token: string; brokerId: string }>('/brokers/login', {
      email,
      password,
    });
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Logout broker
   */
  logout(): void {
    clearAuthToken();
  },

  /**
   * Check if broker is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Get current broker profile
   */
  async getCurrentBroker(): Promise<{ id: string; email: string; name: string }> {
    const response = await apiClient.get<{ id: string; email: string; name: string }>('/brokers/me');
    return response.data;
  },

  // ========================================
  // NETWORK MANAGEMENT
  // ========================================

  /**
   * Get broker network profile
   */
  async getNetworkProfile(brokerId: string): Promise<BrokerNetwork> {
    const response = await apiClient.get<BrokerNetwork>(`/broker-network/profile/${brokerId}`);
    return response.data;
  },

  /**
   * Get broker connections
   */
  async getConnections(brokerId: string): Promise<BrokerConnection[]> {
    const response = await apiClient.get<BrokerConnection[]>(`/broker-network/connections/${brokerId}`);
    return response.data;
  },

  /**
   * Create a new connection
   */
  async createConnection(data: BrokerConnectionRequest): Promise<BrokerConnection> {
    const response = await apiClient.post<BrokerConnection>('/broker-network/connections', data);
    return response.data;
  },

  /**
   * Update a connection
   */
  async updateConnection(connectionId: string, data: Partial<BrokerConnection>): Promise<BrokerConnection> {
    const response = await apiClient.patch<BrokerConnection>(`/broker-network/connections/${connectionId}`, data);
    return response.data;
  },

  // ========================================
  // REFERRAL MANAGEMENT
  // ========================================

  /**
   * Get broker referrals
   */
  async getReferrals(brokerId: string): Promise<{ sent: BrokerReferral[]; received: BrokerReferral[] }> {
    const response = await apiClient.get<{ sent: BrokerReferral[]; received: BrokerReferral[] }>(`/broker-network/referrals/${brokerId}`);
    return response.data;
  },

  /**
   * Create a new referral
   */
  async createReferral(data: CreateBrokerReferralDto & { referringBrokerId: string }): Promise<BrokerReferral> {
    const response = await apiClient.post<BrokerReferral>('/broker-network/referrals', data);
    return response.data;
  },

  /**
   * Update referral status
   */
  async updateReferralStatus(
    referralId: string,
    status: 'accepted' | 'converted' | 'declined' | 'expired',
    commissionAmount?: number,
  ): Promise<BrokerReferral> {
    const response = await apiClient.patch<BrokerReferral>(`/broker-network/referrals/${referralId}/status`, {
      status,
      commissionAmount,
    });
    return response.data;
  },

  // ========================================
  // METRICS & ANALYTICS
  // ========================================

  /**
   * Get network metrics
   */
  async getNetworkMetrics(brokerId: string): Promise<NetworkMetrics> {
    const response = await apiClient.get<NetworkMetrics>(`/broker-network/metrics/${brokerId}`);
    return response.data;
  },

  /**
   * Get network value
   */
  async getNetworkValue(brokerId: string): Promise<NetworkValueCalculation> {
    const response = await apiClient.get<NetworkValueCalculation>(`/broker-network/value/${brokerId}`);
    return response.data;
  },

  /**
   * Get referral multiplier
   */
  async getReferralMultiplier(brokerId: string): Promise<{ multiplier: number }> {
    const response = await apiClient.get<{ multiplier: number }>(`/broker-network/multiplier/${brokerId}`);
    return response.data;
  },

  /**
   * Get network score
   */
  async getNetworkScore(brokerId: string): Promise<{ score: number }> {
    const response = await apiClient.get<{ score: number }>(`/broker-network/score/${brokerId}`);
    return response.data;
  },

  /**
   * Get network reach
   */
  async getNetworkReach(brokerId: string, maxDepth: number = 3): Promise<{ reach: number; maxDepth: number }> {
    const response = await apiClient.get<{ reach: number; maxDepth: number }>(`/broker-network/reach/${brokerId}`, {
      params: { maxDepth },
    });
    return response.data;
  },

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(brokerId: string, period: 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    const response = await apiClient.get(`/broker-network/growth/${brokerId}`, {
      params: { period },
    });
    return response.data;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 20): Promise<NetworkLeaderboardEntry[]> {
    const response = await apiClient.get<NetworkLeaderboardEntry[]>(`/broker-network/leaderboard`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get network effectiveness analysis
   */
  async getNetworkEffectiveness(brokerId: string): Promise<any> {
    const response = await apiClient.get(`/broker-network/effectiveness/${brokerId}`);
    return response.data;
  },

  /**
   * Get network growth prediction
   */
  async getNetworkPrediction(brokerId: string, months: number = 6): Promise<any> {
    const response = await apiClient.get(`/broker-network/prediction/${brokerId}`, {
      params: { months },
    });
    return response.data;
  },

  // ========================================
  // DASHBOARD
  // ========================================

  /**
   * Get broker dashboard data
   */
  async getDashboard(brokerId: string): Promise<any> {
    const [profile, metrics, referrals, connections] = await Promise.all([
      this.getNetworkProfile(brokerId),
      this.getNetworkMetrics(brokerId),
      this.getReferrals(brokerId),
      this.getConnections(brokerId),
    ]);

    return {
      profile,
      metrics,
      referrals,
      connections,
      pendingReferrals: referrals.received.filter(r => r.status === 'pending').length,
      activeConnections: connections.filter(c => c.isActive).length,
    };
  },
};

// Export auth helpers for use in components
export { getAuthToken, setAuthToken, clearAuthToken };