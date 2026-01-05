// GDPR API Service for Frontend
// Phase 25.1B - Data Privacy & GDPR Automation

import { apiClient } from '../lib/api-client';
import type {
  DSARRequest,
  DSARType,
  DSARStatus,
  ConsentBanner,
  ConsentAction,
  RetentionPolicy,
  ComplianceAudit
} from '../types';

export interface CreateDSARRequest {
  userId: string;
  type: DSARType;
  email: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  legalBasis: string;
}

export interface RecordConsentRequest {
  userId?: string;
  sessionId?: string;
  bannerId: string;
  actions: ConsentAction[];
  ipAddress?: string;
  userAgent?: string;
  geolocation?: string;
}

export interface CreateRetentionPolicy {
  name: string;
  description: string;
  dataType: string;
  category: string;
  retentionPeriod: {
    duration: number;
    unit: 'days' | 'months' | 'years';
    trigger: 'creation' | 'last_access' | 'account_closure' | 'consent_withdrawal' | 'legal_hold';
  };
  deletionMethod: 'hard_delete' | 'soft_delete' | 'anonymize' | 'pseudonymize' | 'archive';
  legalBasis?: string;
  gdprArticle?: string;
}

export interface ConsentAnalytics {
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    totalRecords: number;
    acceptanceRate: number;
    withdrawalRate: number;
    byCategory: Record<string, { accepted: number; rejected: number }>;
    geographicDistribution: Record<string, number>;
  };
  generatedAt: Date;
}

export interface DSARAnalytics {
  metrics: {
    totalRequests: number;
    averageProcessingTime: number;
    onTimeRate: number;
    byType: Record<DSARType, number>;
    byStatus: Record<DSARStatus, number>;
  };
  generatedAt: Date;
}

export interface ComplianceStatus {
  overallScore: number;
  compliant: boolean;
  areas: Array<{
    area: string;
    score: number;
    status: 'compliant' | 'warning' | 'critical';
  }>;
  lastAudit: Date;
  nextAuditDue: Date;
}

class GDPRApiService {
  // DSAR (Data Subject Access Request) Methods
  async createDSARRequest(request: CreateDSARRequest): Promise<DSARRequest> {
    const response = await apiClient.post('/gdpr/dsar/requests', request);
    return response.data;
  }

  async getDSARRequests(filters?: {
    status?: DSARStatus;
    userId?: string;
    limit?: number;
  }): Promise<DSARRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('user_id', filters.userId);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/gdpr/dsar/requests?${params.toString()}`);
    return response.data;
  }

  async getDSARRequest(id: string): Promise<DSARRequest> {
    const response = await apiClient.get(`/gdpr/dsar/requests/${id}`);
    return response.data;
  }

  async verifyDSARRequest(id: string, verificationData: any): Promise<{ status: string; verifiedAt: Date; message: string }> {
    const response = await apiClient.post(`/gdpr/dsar/requests/${id}/verify`, verificationData);
    return response.data;
  }

  async processDSARRequest(id: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`/gdpr/dsar/requests/${id}/process`);
    return response.data;
  }

  // Consent Management Methods
  async recordConsent(request: RecordConsentRequest): Promise<{ status: string; recordId: string; message: string }> {
    const response = await apiClient.post('/gdpr/consents/record', request);
    return response.data;
  }

  async withdrawConsent(userId: string, purposeId: string, method: string = 'api'): Promise<{ status: string; message: string }> {
    const response = await apiClient.delete('/gdpr/consents/withdraw', {
      data: { user_id: userId, purpose_id: purposeId, method }
    });
    return response.data;
  }

  async getConsentStatus(userId: string): Promise<{
    userId: string;
    consents: Array<{
      purposeId: string;
      status: 'active' | 'withdrawn' | 'expired';
      grantedAt: Date;
      withdrawnAt?: Date;
      category: string;
    }>;
    complianceStatus: 'full' | 'partial' | 'non_compliant';
  }> {
    const response = await apiClient.get(`/gdpr/consents/${userId}/status`);
    return response.data;
  }

  async getActiveConsentBanners(): Promise<{ banners: ConsentBanner[] }> {
    const response = await apiClient.get('/gdpr/consents/banners/active');
    return response.data;
  }

  // Data Retention Methods
  async createRetentionPolicy(policy: CreateRetentionPolicy): Promise<{ status: string; policyId: string; message: string }> {
    const response = await apiClient.post('/gdpr/retention/policies', policy);
    return response.data;
  }

  async getRetentionPolicies(): Promise<{ policies: RetentionPolicy[] }> {
    const response = await apiClient.get('/gdpr/retention/policies');
    return response.data;
  }

  async executeRetentionPolicies(): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/gdpr/retention/execute');
    return response.data;
  }

  async getRetentionJobs(): Promise<{
    jobs: Array<{
      id: string;
      dataType: string;
      status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
      affectedRecords: number;
      executedAt?: Date;
      deletionMethod: string;
    }>;
  }> {
    const response = await apiClient.get('/gdpr/retention/jobs');
    return response.data;
  }

  // Compliance and Audit Methods
  async runComplianceAudit(scope: Array<{ area: string; description: string; controls: string[] }>): Promise<{
    auditId: string;
    status: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    findingsCount: number;
    recommendations: string[];
    completedAt: Date;
  }> {
    const response = await apiClient.post('/gdpr/compliance/audit', { scope, auditor: 'system' });
    return response.data;
  }

  async getComplianceAudits(): Promise<{
    audits: Array<{
      id: string;
      date: Date;
      status: string;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      findingsCount: number;
      auditor: string;
    }>;
  }> {
    const response = await apiClient.get('/gdpr/compliance/audits');
    return response.data;
  }

  async getComplianceStatus(): Promise<ComplianceStatus> {
    const response = await apiClient.get('/gdpr/compliance/status');
    return response.data;
  }

  // Analytics Methods
  async getConsentAnalytics(dateFrom?: Date, dateTo?: Date): Promise<ConsentAnalytics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom.toISOString());
    if (dateTo) params.append('date_to', dateTo.toISOString());

    const response = await apiClient.get(`/gdpr/analytics/consent?${params.toString()}`);
    return response.data;
  }

  async getDSARAnalytics(): Promise<DSARAnalytics> {
    const response = await apiClient.get('/gdpr/analytics/dsar');
    return response.data;
  }

  // Utility Methods
  async downloadDSARData(requestId: string): Promise<Blob> {
    const response = await apiClient.get(`/gdpr/dsar/requests/${requestId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async exportConsentData(userId: string): Promise<Blob> {
    const response = await apiClient.get(`/gdpr/consents/${userId}/export`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async validateDataPortability(userId: string): Promise<{
    valid: boolean;
    portableFormats: string[];
    estimatedSize: number;
  }> {
    const response = await apiClient.get(`/gdpr/data-portability/validate/${userId}`);
    return response.data;
  }
}

export const gdprApiService = new GDPRApiService();