/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing */
import { EventEmitter } from 'node:events';
import { logger } from '../logger.js';
import { gdprAutomationService, ConsentCategory, GDPRArticle } from './gdpr-automation.js';

export interface ConsentBanner {
  id: string;
  title: string;
  description: string;
  purposes: ConsentPurpose[];
  showOnPage: string[];
  position: 'top' | 'bottom' | 'center' | 'modal';
  style: ConsentBannerStyle;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  category: ConsentCategory;
  required: boolean;
  legalBasis: GDPRArticle;
  thirdPartyIntegrations?: ThirdPartyIntegration[];
  dataFields?: string[];
  retentionPeriod?: number;
  showInBanner: boolean;
  order: number;
}

export interface ConsentBannerStyle {
  theme: 'light' | 'dark' | 'auto';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    button: string;
    buttonText: string;
  };
  borderRadius: number;
  fontSize: number;
  showRejectAll: boolean;
  showAcceptAll: boolean;
  showManagePreferences: boolean;
}

export interface ThirdPartyIntegration {
  name: string;
  purpose: string;
  dataShared: string[];
  retentionPeriod: number;
  privacyPolicyUrl: string;
  optOutUrl?: string;
}

export interface ConsentRecord {
  id: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  bannerId: string;
  actions: ConsentAction[];
  preferences: ConsentPreference[];
  version: string;
  geolocation?: string;
  legalBasis: GDPRArticle;
}

export interface ConsentAction {
  purposeId: string;
  action: 'accepted' | 'rejected' | 'withdrawn';
  timestamp: Date;
  method: 'banner' | 'api' | 'email' | 'phone' | 'form';
}

export interface ConsentPreference {
  purposeId: string;
  granted: boolean;
  granular?: GranularPreference[];
  timestamp: Date;
}

export interface GranularPreference {
  field: string;
  granted: boolean;
  restrictions?: string[];
}

export interface ConsentAnalytics {
  totalRecords: number;
  byCategory: Record<ConsentCategory, number>;
  byPurpose: Record<string, number>;
  acceptanceRates: Record<string, number>;
  withdrawalRates: Record<string, number>;
  topReasons: { reason: string; count: number }[];
  geographicDistribution: Record<string, number>;
  complianceScore: number;
  lastUpdated: Date;
}

export interface PrivacyPolicy {
  id: string;
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  lastUpdated: Date;
  isActive: boolean;
  applicableRegions: string[];
  changes: PolicyChange[];
}

export interface PolicyChange {
  section: string;
  changeType: 'added' | 'modified' | 'removed';
  description: string;
  impact: 'low' | 'medium' | 'high';
  userNotification: boolean;
}

export class ConsentManagementService extends EventEmitter {
  private banners: Map<string, ConsentBanner> = new Map();
  private records: Map<string, ConsentRecord> = new Map();
  private policies: Map<string, PrivacyPolicy> = new Map();

  constructor() {
    super();
    this.initializeDefaultBanner();
    this.initializeDefaultPolicy();
    this.startAnalyticsScheduler();
  }

  // Consent Banner Management
  async createConsentBanner(banner: Omit<ConsentBanner, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsentBanner> {
    const id = this.generateId();
    const now = new Date();

    const newBanner: ConsentBanner = {
      ...banner,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.banners.set(id, newBanner);

    logger.info('Consent banner created', { id, title: banner.title });
    this.emit('banner:created', newBanner);

    return newBanner;
  }

  async updateConsentBanner(id: string, updates: Partial<ConsentBanner>): Promise<ConsentBanner> {
    const banner = this.banners.get(id);
    if (!banner) {
      throw new Error(`Consent banner ${id} not found`);
    }

    const updatedBanner: ConsentBanner = {
      ...banner,
      ...updates,
      id,
      updatedAt: new Date()
    };

    this.banners.set(id, updatedBanner);

    logger.info('Consent banner updated', { id });
    this.emit('banner:updated', updatedBanner);

    return updatedBanner;
  }

  async getConsentBanner(id: string): Promise<ConsentBanner | undefined> {
    return this.banners.get(id);
  }

  async getActiveBannersForPage(page: string): Promise<ConsentBanner[]> {
    return Array.from(this.banners.values())
      .filter(banner => banner.isActive && banner.showOnPage.includes(page))
      .sort((a, b) => a.purposes[0]?.order - b.purposes[0]?.order);
  }

  // Consent Recording
  async recordConsent(
    sessionId: string,
    bannerId: string,
    actions: Omit<ConsentAction, 'timestamp'>[],
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    geolocation?: string
  ): Promise<ConsentRecord> {
    const recordId = this.generateId();
    const timestamp = new Date();

    const consentActions: ConsentAction[] = actions.map(action => ({
      ...action,
      timestamp
    }));

    // Get banner to determine purposes
    const banner = this.banners.get(bannerId);
    if (!banner) {
      throw new Error(`Consent banner ${bannerId} not found`);
    }

    // Create preferences from actions
    const preferences: ConsentPreference[] = banner.purposes.map(purpose => {
      const action = actions.find(a => a.purposeId === purpose.id);
      return {
        purposeId: purpose.id,
        granted: action ? action.action === 'accepted' : !purpose.required,
        timestamp
      };
    });

    const record: ConsentRecord = {
      id: recordId,
      userId,
      sessionId,
      timestamp,
      bannerId,
      actions: consentActions,
      preferences,
      version: '1.0',
      ipAddress,
      userAgent,
      geolocation,
      legalBasis: GDPRArticle.ARTICLE_7
    };

    this.records.set(recordId, record);

    // Update GDPR automation service
    if (userId) {
      const consents = banner.purposes.map(purpose => {
        const preference = preferences.find(p => p.purposeId === purpose.id);
        return {
          purpose: purpose.name,
          category: purpose.category,
          specificFields: purpose.dataFields,
          processingActivities: [purpose.purpose],
          thirdPartySharing: purpose.thirdPartyIntegrations?.length > 0,
          retentionPeriod: purpose.retentionPeriod,
          consentGiven: preference?.granted || false,
          legalBasis: purpose.legalBasis
        };
      });

      await gdprAutomationService.recordGranularConsent(userId, consents);
    }

    // Trigger third-party integrations
    await this.processThirdPartyIntegrations(userId, banner.purposes, preferences);

    logger.info('Consent recorded', {
      recordId,
      userId,
      sessionId,
      bannerId,
      actions: actions.length
    });

    this.emit('consent:recorded', record);
    return record;
  }

  async withdrawConsent(userId: string, purposeId: string, method: ConsentAction['method'] = 'api'): Promise<void> {
    // Find active consent for user and purpose
    const userConsents = Array.from(this.records.values())
      .filter(record => record.userId === userId);

    for (const record of userConsents) {
      const preference = record.preferences.find(p => p.purposeId === purposeId);
      if (preference && preference.granted) {
        // Add withdrawal action
        record.actions.push({
          purposeId,
          action: 'withdrawn',
          timestamp: new Date(),
          method
        });

        // Update preference
        preference.granted = false;
        preference.timestamp = new Date();
      }
    }

    // Update GDPR automation service
    const banner = Array.from(this.banners.values())
      .find(b => b.purposes.some(p => p.id === purposeId));
    
    if (banner) {
      const purpose = banner.purposes.find(p => p.id === purposeId);
      if (purpose) {
        await gdprAutomationService.withdrawConsent(userId, purpose.name);
      }
    }

    // Stop third-party integrations
    await this.stopThirdPartyIntegration(userId, purposeId);

    logger.info('Consent withdrawn', { userId, purposeId, method });
    this.emit('consent:withdrawn', { userId, purposeId, method });
  }

  // Consent Validation
  async hasValidConsent(userId: string, purposeName: string): Promise<boolean> {
    const activeConsents = await gdprAutomationService.getActiveConsents(userId);
    return activeConsents.some(consent => 
      consent.purpose === purposeName && consent.consentGiven
    );
  }

  async checkConsentCompliance(userId: string): Promise<{
    compliant: boolean;
    missing: string[];
    withdrawn: string[];
    expired: string[];
  }> {
    const activeConsents = await gdprAutomationService.getActiveConsents(userId);
    const allBanners = Array.from(this.banners.values());
    
    const allRequiredPurposes = allBanners
      .filter(b => b.isActive)
      .flatMap(b => b.purposes.filter(p => p.required));

    const missing: string[] = [];
    const withdrawn: string[] = [];
    const expired: string[] = [];

    for (const purpose of allRequiredPurposes) {
      const consent = activeConsents.find(c => c.purpose === purpose.name);
      
      if (!consent) {
        missing.push(purpose.name);
      } else if (consent.consentWithdrawnAt) {
        withdrawn.push(purpose.name);
      } else if (purpose.retentionPeriod) {
        // Check if consent is expired (simplified - would need original consent date)
        const expiryDate = new Date(); // This would be calculated from original consent date
        if (new Date() > expiryDate) {
          expired.push(purpose.name);
        }
      }
    }

    return {
      compliant: missing.length === 0 && withdrawn.length === 0 && expired.length === 0,
      missing,
      withdrawn,
      expired
    };
  }

  // Privacy Policy Management
  async createPrivacyPolicy(policy: Omit<PrivacyPolicy, 'id' | 'lastUpdated'>): Promise<PrivacyPolicy> {
    const id = this.generateId();

    const newPolicy: PrivacyPolicy = {
      ...policy,
      id,
      lastUpdated: new Date()
    };

    this.policies.set(id, newPolicy);

    // If this is the active policy, notify users of changes
    if (newPolicy.isActive) {
      await this.notifyUsersOfPolicyChanges(newPolicy);
    }

    logger.info('Privacy policy created', { id, version: policy.version });
    this.emit('policy:created', newPolicy);

    return newPolicy;
  }

  async getActivePrivacyPolicy(region?: string): Promise<PrivacyPolicy | undefined> {
    const policies = Array.from(this.policies.values())
      .filter(policy => policy.isActive);

    if (region) {
      const regionalPolicy = policies.find(policy => 
        policy.applicableRegions.includes(region)
      );
      if (regionalPolicy) return regionalPolicy;
    }

    return policies[0]; // Return first active policy
  }

  // Analytics and Reporting
  async generateConsentAnalytics(dateFrom?: Date, dateTo?: Date): Promise<ConsentAnalytics> {
    const records = Array.from(this.records.values());
    
    let filteredRecords = records;
    if (dateFrom || dateTo) {
      filteredRecords = records.filter(record => {
        const timestamp = record.timestamp;
        if (dateFrom && timestamp < dateFrom) return false;
        if (dateTo && timestamp > dateTo) return false;
        return true;
      });
    }

    const byCategory: Record<ConsentCategory, number> = {} as Record<ConsentCategory, number>;
    const byPurpose: Record<string, number> = {};
    const acceptanceRates: Record<string, number> = {};
    const withdrawalRates: Record<string, number> = {};

    // Get all banners for purpose categorization
    const allBanners = Array.from(this.banners.values());
    const allPurposes = allBanners.flatMap(b => b.purposes);

    for (const record of filteredRecords) {
      for (const action of record.actions) {
        const purpose = allPurposes.find(p => p.id === action.purposeId);
        if (purpose) {
          // Count by category
          byCategory[purpose.category] = (byCategory[purpose.category] || 0) + 1;

          // Count by purpose
          byPurpose[purpose.name] = (byPurpose[purpose.name] || 0) + 1;

          // Calculate rates
          if (!acceptanceRates[purpose.name]) {
            const totalActions = record.actions.filter(a => a.purposeId === action.purposeId);
            const accepted = totalActions.filter(a => a.action === 'accepted').length;
            acceptanceRates[purpose.name] = totalActions.length > 0 ? (accepted / totalActions.length) * 100 : 0;
          }

          if (!withdrawalRates[purpose.name]) {
            const totalActions = record.actions.filter(a => a.purposeId === action.purposeId);
            const withdrawn = totalActions.filter(a => a.action === 'withdrawn').length;
            withdrawalRates[purpose.name] = totalActions.length > 0 ? (withdrawn / totalActions.length) * 100 : 0;
          }
        }
      }
    }

    // Calculate compliance score (simplified)
    const totalRequiredPurposes = allPurposes.filter(p => p.required).length;
    const compliantConsents = filteredRecords.filter(record => {
      const banner = this.banners.get(record.bannerId);
      if (!banner) return false;

      const requiredPurposes = banner.purposes.filter(p => p.required);
      const acceptedRequired = requiredPurposes.every(purpose => {
        const action = record.actions.find(a => a.purposeId === purpose.id);
        return action && action.action === 'accepted';
      });

      return acceptedRequired;
    });

    const complianceScore = filteredRecords.length > 0 ? (compliantConsents.length / filteredRecords.length) * 100 : 100;

    return {
      totalRecords: filteredRecords.length,
      byCategory,
      byPurpose,
      acceptanceRates,
      withdrawalRates,
      topReasons: [], // Would be populated from user feedback
      geographicDistribution: {}, // Would be populated from geolocation data
      complianceScore,
      lastUpdated: new Date()
    };
  }

  // Third-party Integration Management
  private async processThirdPartyIntegrations(
    userId: string | undefined,
    purposes: ConsentPurpose[],
    preferences: ConsentPreference[]
  ): Promise<void> {
    for (const purpose of purposes) {
      if (purpose.thirdPartyIntegrations) {
        const preference = preferences.find(p => p.purposeId === purpose.id);
        
        for (const integration of purpose.thirdPartyIntegrations) {
          if (preference?.granted) {
            await this.enableThirdPartyIntegration(userId, integration);
          } else {
            await this.disableThirdPartyIntegration(userId, integration);
          }
        }
      }
    }
  }

  private async enableThirdPartyIntegration(userId: string | undefined, integration: ThirdPartyIntegration): Promise<void> {
    // Implement actual third-party integration enabling
    logger.info('Enabling third-party integration', {
      userId,
      integration: integration.name,
      purpose: integration.purpose
    });
  }

  private async disableThirdPartyIntegration(userId: string | undefined, integration: ThirdPartyIntegration): Promise<void> {
    // Implement actual third-party integration disabling
    logger.info('Disabling third-party integration', {
      userId,
      integration: integration.name,
      purpose: integration.purpose
    });
  }

  private async stopThirdPartyIntegration(userId: string, purposeId: string): Promise<void> {
    // Stop specific third-party integration when consent is withdrawn
    logger.info('Stopping third-party integration', { userId, purposeId });
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultBanner(): void {
    const defaultBanner: Omit<ConsentBanner, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Your Privacy Choices',
      description: 'We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can manage your preferences below.',
      purposes: [
        {
          id: 'essential',
          name: 'Essential',
          description: 'Required for basic website functionality and security.',
          category: ConsentCategory.ESSENTIAL,
          required: true,
          legalBasis: GDPRArticle.ARTICLE_6,
          showInBanner: true,
          order: 1
        },
        {
          id: 'analytics',
          name: 'Analytics',
          description: 'Help us understand how you use our website to improve your experience.',
          category: ConsentCategory.ANALYTICS,
          required: false,
          legalBasis: GDPRArticle.ARTICLE_7,
          showInBanner: true,
          order: 2
        },
        {
          id: 'marketing',
          name: 'Marketing',
          description: 'Used to show you relevant advertisements and measure campaign effectiveness.',
          category: ConsentCategory.MARKETING,
          required: false,
          legalBasis: GDPRArticle.ARTICLE_7,
          showInBanner: true,
          order: 3
        }
      ],
      showOnPage: ['*'], // Show on all pages
      position: 'bottom',
      style: {
        theme: 'auto',
        colors: {
          primary: '#2563eb',
          secondary: '#64748b',
          background: '#ffffff',
          text: '#1f2937',
          button: '#2563eb',
          buttonText: '#ffffff'
        },
        borderRadius: 8,
        fontSize: 14,
        showRejectAll: true,
        showAcceptAll: true,
        showManagePreferences: true
      },
      isActive: true
    };

    this.createConsentBanner(defaultBanner);
  }

  private initializeDefaultPolicy(): void {
    const defaultPolicy: Omit<PrivacyPolicy, 'id' | 'lastUpdated'> = {
      version: '1.0',
      title: 'Privacy Policy',
      content: '# Privacy Policy\n\nThis is our privacy policy...',
      effectiveDate: new Date(),
      isActive: true,
      applicableRegions: ['*'],
      changes: []
    };

    this.createPrivacyPolicy(defaultPolicy);
  }

  private startAnalyticsScheduler(): void {
    // Generate daily analytics reports
    setInterval(async () => {
      try {
        await this.generateConsentAnalytics();
        logger.debug('Daily consent analytics generated');
      } catch (error) {
        logger.error('Error generating consent analytics', { error });
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  private async notifyUsersOfPolicyChanges(policy: PrivacyPolicy): Promise<void> {
    // Notify users of significant policy changes
    const significantChanges = policy.changes.filter(change => 
      change.impact === 'high' && change.userNotification
    );

    if (significantChanges.length > 0) {
      logger.info('Notifying users of policy changes', {
        policyId: policy.id,
        changesCount: significantChanges.length
      });
    }
  }

  // Getters for external access
  getBanners(): ConsentBanner[] {
    return Array.from(this.banners.values());
  }

  getConsentRecords(filters?: { userId?: string; dateFrom?: Date; dateTo?: Date }): ConsentRecord[] {
    let records = Array.from(this.records.values());

    if (filters?.userId) {
      records = records.filter(record => record.userId === filters.userId);
    }

    if (filters?.dateFrom) {
      records = records.filter(record => record.timestamp >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      records = records.filter(record => record.timestamp <= filters.dateTo!);
    }

    return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getPolicies(): PrivacyPolicy[] {
    return Array.from(this.policies.values());
  }
}

export const consentManagementService = new ConsentManagementService();