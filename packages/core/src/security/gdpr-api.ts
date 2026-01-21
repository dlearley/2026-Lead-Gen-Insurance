// GDPR API Service for TypeScript Applications
// Phase 25.1B - Data Privacy & GDPR Automation

import type {
  DSARRequest,
  DSARType,
  DSARStatus,
  ConsentBanner,
  ConsentAction,
  RetentionPolicy,
  ComplianceAudit,
  ConsentCategory,
  GDPRArticle
} from '@insurance-lead-gen/types';

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

export interface ConsentWithdrawalRequest {
  userId: string;
  purposeId: string;
  method?: 'api' | 'email' | 'phone' | 'form';
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
    byCategory: Record<ConsentCategory, number>;
    byPurpose: Record<string, number>;
    topReasons: Array<{ reason: string; count: number }>;
    geographicDistribution: Record<string, number>;
    complianceScore: number;
  };
  lastUpdated: Date;
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

export interface DataPortabilityValidation {
  valid: boolean;
  portableFormats: string[];
  estimatedSize: number;
  restrictions?: string[];
}

class GDPRApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // DSAR (Data Subject Access Request) Methods
  async createDSARRequest(request: CreateDSARRequest): Promise<DSARRequest> {
    return this.request<DSARRequest>('/gdpr/dsar/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDSARRequests(filters?: {
    status?: DSARStatus;
    type?: DSARType;
    userId?: string;
    limit?: number;
  }): Promise<DSARRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.userId) params.append('user_id', filters.userId);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request<DSARRequest[]>(`/gdpr/dsar/requests?${params.toString()}`);
  }

  async getDSARRequest(id: string): Promise<DSARRequest> {
    return this.request<DSARRequest>(`/gdpr/dsar/requests/${id}`);
  }

  async verifyDSARRequest(id: string, verificationData: any): Promise<{
    status: string;
    verifiedAt: Date;
    message: string;
  }> {
    return this.request(`/gdpr/dsar/requests/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  async processDSARRequest(id: string): Promise<{ status: string; message: string }> {
    return this.request(`/gdpr/dsar/requests/${id}/process`, {
      method: 'POST',
    });
  }

  async downloadDSARData(requestId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/gdpr/dsar/requests/${requestId}/download`);
    if (!response.ok) {
      throw new Error('Failed to download DSAR data');
    }
    return response.blob();
  }

  // Consent Management Methods
  async recordConsent(request: RecordConsentRequest): Promise<{
    status: string;
    recordId: string;
    message: string;
  }> {
    return this.request('/gdpr/consents/record', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async withdrawConsent(request: ConsentWithdrawalRequest): Promise<{
    status: string;
    message: string;
  }> {
    return this.request('/gdpr/consents/withdraw', {
      method: 'DELETE',
      body: JSON.stringify(request),
    });
  }

  async getConsentStatus(userId: string): Promise<{
    userId: string;
    consents: Array<{
      purposeId: string;
      status: 'active' | 'withdrawn' | 'expired';
      grantedAt: Date;
      withdrawnAt?: Date;
      category: ConsentCategory;
    }>;
    complianceStatus: 'full' | 'partial' | 'non_compliant';
  }> {
    return this.request(`/gdpr/consents/${userId}/status`);
  }

  async getActiveConsentBanners(): Promise<{ banners: ConsentBanner[] }> {
    return this.request('/gdpr/consents/banners/active');
  }

  async exportConsentData(userId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/gdpr/consents/${userId}/export`);
    if (!response.ok) {
      throw new Error('Failed to export consent data');
    }
    return response.blob();
  }

  // Data Retention Methods
  async createRetentionPolicy(policy: CreateRetentionPolicy): Promise<{
    status: string;
    policyId: string;
    message: string;
  }> {
    return this.request('/gdpr/retention/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async getRetentionPolicies(): Promise<{ policies: RetentionPolicy[] }> {
    return this.request('/gdpr/retention/policies');
  }

  async executeRetentionPolicies(): Promise<{ status: string; message: string }> {
    return this.request('/gdpr/retention/execute', {
      method: 'POST',
    });
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
    return this.request('/gdpr/retention/jobs');
  }

  // Compliance and Audit Methods
  async runComplianceAudit(scope: Array<{
    area: string;
    description: string;
    controls: string[];
  }>): Promise<{
    auditId: string;
    status: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    findingsCount: number;
    recommendations: string[];
    completedAt: Date;
  }> {
    return this.request('/gdpr/compliance/audit', {
      method: 'POST',
      body: JSON.stringify({ scope, auditor: 'system' }),
    });
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
    return this.request('/gdpr/compliance/audits');
  }

  async getComplianceStatus(): Promise<ComplianceStatus> {
    return this.request('/gdpr/compliance/status');
  }

  // Analytics Methods
  async getConsentAnalytics(dateFrom?: Date, dateTo?: Date): Promise<ConsentAnalytics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom.toISOString());
    if (dateTo) params.append('date_to', dateTo.toISOString());

    return this.request(`/gdpr/analytics/consent?${params.toString()}`);
  }

  async getDSARAnalytics(): Promise<DSARAnalytics> {
    return this.request('/gdpr/analytics/dsar');
  }

  // Utility Methods
  async validateDataPortability(userId: string): Promise<DataPortabilityValidation> {
    return this.request(`/gdpr/data-portability/validate/${userId}`);
  }

  async hasValidConsent(userId: string, purposeName: string): Promise<boolean> {
    try {
      const status = await this.getConsentStatus(userId);
      const consent = status.consents.find(c => c.purposeId === purposeName);
      return consent?.status === 'active';
    } catch (error) {
      console.error('Failed to check consent status:', error);
      return false;
    }
  }

  async checkConsentCompliance(userId: string): Promise<{
    compliant: boolean;
    missing: string[];
    withdrawn: string[];
    expired: string[];
  }> {
    const status = await this.getConsentStatus(userId);
    
    const missing: string[] = [];
    const withdrawn: string[] = [];
    const expired: string[] = [];
    
    for (const consent of status.consents) {
      if (consent.status === 'withdrawn') {
        withdrawn.push(consent.purposeId);
      } else if (consent.status === 'expired') {
        expired.push(consent.purposeId);
      }
    }
    
    return {
      compliant: status.complianceStatus === 'full',
      missing,
      withdrawn,
      expired
    };
  }
}

export const gdprApiService = new GDPRApiService();