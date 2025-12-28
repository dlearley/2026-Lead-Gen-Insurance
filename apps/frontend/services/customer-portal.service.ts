import axios from 'axios';
import Cookies from 'js-cookie';
import type {
  Customer,
  CustomerRegisterRequest,
  CustomerLoginRequest,
  CustomerAuthResponse,
  CustomerUpdateProfileDto,
  ChangePasswordDto,
  CustomerDocumentUpload,
  SendMessageDto,
  CustomerDocument,
  CustomerMessage,
} from '@insurance/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/customers';

// ========================================
// AUTH HELPERS
// ========================================

const getAuthToken = (): string | undefined => {
  return Cookies.get('customer_token');
};

const setAuthToken = (token: string): void => {
  Cookies.set('customer_token', token, { expires: 7 });
};

const clearAuthToken = (): void => {
  Cookies.remove('customer_token');
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
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  },
);

// ========================================
// AUTHENTICATION
// ========================================

export const customerPortalService = {
  /**
   * Register a new customer
   */
  async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    const response = await apiClient.post<CustomerAuthResponse>('/register', data);
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Login customer
   */
  async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    const response = await apiClient.post<CustomerAuthResponse>('/login', data);
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Logout customer
   */
  logout(): void {
    clearAuthToken();
  },

  /**
   * Get current customer
   */
  async getCurrentCustomer(): Promise<Customer> {
    const response = await apiClient.get<Customer>('/me');
    return response.data;
  },

  /**
   * Check if customer is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  // ========================================
  // PROFILE MANAGEMENT
  // ========================================

  /**
   * Get customer profile
   */
  async getProfile(): Promise<Customer> {
    const response = await apiClient.get<Customer>('/profile');
    return response.data;
  },

  /**
   * Update customer profile
   */
  async updateProfile(data: CustomerUpdateProfileDto): Promise<Customer> {
    const response = await apiClient.put<Customer>('/profile', data);
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordDto): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/change-password', data);
    return response.data;
  },

  // ========================================
  // DOCUMENT MANAGEMENT
  // ========================================

  /**
   * Get customer documents
   */
  async getDocuments(): Promise<{ documents: CustomerDocument[]; total: number }> {
    const response = await apiClient.get<{ documents: CustomerDocument[]; total: number }>(
      '/documents',
    );
    return response.data;
  },

  /**
   * Upload a document
   */
  async uploadDocument(data: CustomerDocumentUpload): Promise<Customer> {
    const response = await apiClient.post<Customer>('/documents', data);
    return response.data;
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  },

  // ========================================
  // MESSAGES
  // ========================================

  /**
   * Get customer messages
   */
  async getMessages(): Promise<{ messages: CustomerMessage[]; total: number }> {
    const response = await apiClient.get<{ messages: CustomerMessage[]; total: number }>(
      '/messages',
    );
    return response.data;
  },

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageDto): Promise<CustomerMessage> {
    const response = await apiClient.post<CustomerMessage>('/messages', data);
    return response.data;
  },

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string): Promise<CustomerMessage> {
    const response = await apiClient.put<CustomerMessage>(`/messages/${messageId}/read`);
    return response.data;
  },

  /**
   * Mark all messages as read
   */
  async markAllMessagesAsRead(): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>('/messages/read-all');
    return response.data;
  },

  // ========================================
  // DASHBOARD
  // ========================================

  /**
   * Get customer dashboard
   */
  async getDashboard(): Promise<any> {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
};

// Export auth helpers for use in components
export { getAuthToken, setAuthToken, clearAuthToken };
