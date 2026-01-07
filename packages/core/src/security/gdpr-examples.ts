// Integration Examples for GDPR Automation Services
// Phase 25.1B - Data Privacy & GDPR Automation

import { 
  gdprAutomationService,
  consentManagementService, 
  dataRetentionService,
  gdprApiService,
  gdprMiddleware,
  GDPRArticle,
  DSARType,
  ConsentCategory,
  DataCategory,
  DeletionMethod
} from '@insurance/core';

// Example 1: Setting up GDPR Automation in a NestJS Application
export class GDPRModule {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // DSAR request event handlers
    gdprAutomationService.on('dsar:created', async (request) => {
      console.log('New DSAR request created:', request.id);
      await this.sendDSARConfirmationEmail(request);
    });

    gdprAutomationService.on('dsar:completed', async (request) => {
      console.log('DSAR request completed:', request.id);
      await this.sendDSARCompletionEmail(request);
    });

    // Consent management event handlers
    consentManagementService.on('consent:recorded', async (record) => {
      console.log('Consent recorded for user:', record.userId);
      await this.updateUserPreferences(record.userId);
    });

    consentManagementService.on('consent:withdrawn', async (data) => {
      console.log('Consent withdrawn:', data);
      await this.stopProcessingForUser(data.userId, data.purpose);
    });

    // Data retention event handlers
    dataRetentionService.on('batch:completed', async (batch) => {
      console.log('Deletion batch completed:', batch.id);
      await this.sendRetentionReport(batch);
    });

    dataRetentionService.on('compliance:warning', async (report) => {
      console.warn('Compliance warning:', report);
      await this.alertComplianceTeam(report);
    });
  }

  private async sendDSARConfirmationEmail(request: any): Promise<void> {
    // Implementation would send actual email
    console.log(`Sending DSAR confirmation email to ${request.email}`);
  }

  private async sendDSARCompletionEmail(request: any): Promise<void> {
    // Implementation would send completion email with data package
    console.log(`Sending DSAR completion email to ${request.email}`);
  }

  private async updateUserPreferences(userId: string): Promise<void> {
    // Update user preferences based on consent
    console.log(`Updating preferences for user ${userId}`);
  }

  private async stopProcessingForUser(userId: string, purpose: string): Promise<void> {
    // Stop processing activities for withdrawn consent
    console.log(`Stopping ${purpose} processing for user ${userId}`);
  }

  private async sendRetentionReport(batch: any): Promise<void> {
    // Send retention execution report
    console.log(`Retention report: ${batch.progress.successful}/${batch.progress.total} records processed`);
  }

  private async alertComplianceTeam(report: any): Promise<void> {
    // Alert compliance team of issues
    console.warn(`Alerting compliance team: ${report.compliance.gdprCompliance.violations.join(', ')}`);
  }
}

// Example 2: Express/NestJS Middleware Integration
export function setupGDPRMiddleware(app: any): void {
  // Extract GDPR context from all requests
  app.use(gdprMiddleware.extractContext());

  // Rate limiting for GDPR endpoints
  app.use('/gdpr', gdprMiddleware.rateLimit());

  // Require consent for analytics
  app.get('/api/analytics', 
    gdprMiddleware.requireConsent('analytics', false),
    gdprMiddleware.auditLog('analytics_access'),
    (req: any, res: any) => {
      // Analytics endpoint logic
      res.json({ data: 'analytics data' });
    }
  );

  // Require consent for marketing
  app.post('/api/marketing/send',
    gdprMiddleware.requireConsent('marketing', true),
    gdprMiddleware.auditLog('marketing_send'),
    (req: any, res: any) => {
      // Marketing endpoint logic
      res.json({ status: 'sent' });
    }
  );

  // Data portability endpoint
  app.get('/api/data/export/:userId',
    gdprMiddleware.dataPortability(),
    gdprMiddleware.auditLog('data_export'),
    (req: any, res: any) => {
      // Data export logic
      res.json({ data: 'exported data' });
    }
  );
}

// Example 3: Frontend Consent Banner Integration
export class ConsentBannerManager {
  constructor(private bannerId: string) {}

  async initializeBanner(): Promise<void> {
    try {
      // Load active banners for current page
      const response = await gdprApiService.getActiveConsentBanners();
      const banner = response.banners.find(b => b.id === this.bannerId);

      if (banner && this.shouldShowBanner()) {
        this.displayBanner(banner);
      }
    } catch (error) {
      console.error('Failed to initialize consent banner:', error);
    }
  }

  private shouldShowBanner(): boolean {
    // Check if user has already made consent choices
    const consentChoice = localStorage.getItem('consent_choice');
    return !consentChoice;
  }

  private displayBanner(banner: any): void {
    // Create and display banner UI (implementation depends on framework)
    const bannerElement = this.createBannerElement(banner);
    document.body.appendChild(bannerElement);
  }

  private createBannerElement(banner: any): HTMLElement {
    const element = document.createElement('div');
    element.className = 'gdpr-consent-banner';
    element.innerHTML = `
      <div class="banner-content">
        <h3>${banner.title}</h3>
        <p>${banner.description}</p>
        <div class="banner-actions">
          <button onclick="window.acceptAllConsent()">Accept All</button>
          <button onclick="window.rejectAllConsent()">Reject All</button>
          <button onclick="window.manageConsent()">Manage Preferences</button>
        </div>
      </div>
    `;
    return element;
  }

  async recordChoice(choices: Record<string, boolean>): Promise<void> {
    try {
      const actions = Object.entries(choices).map(([purposeId, granted]) => ({
        purposeId,
        action: granted ? 'accepted' : 'rejected',
        timestamp: new Date(),
        method: 'banner' as const
      }));

      await gdprApiService.recordConsent({
        bannerId: this.bannerId,
        actions,
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        geolocation: await this.getGeolocation()
      });

      // Store choice to prevent banner from showing again
      localStorage.setItem('consent_choice', JSON.stringify({
        timestamp: new Date().toISOString(),
        choices
      }));

      this.hideBanner();
    } catch (error) {
      console.error('Failed to record consent choice:', error);
    }
  }

  private getCurrentUserId(): string | undefined {
    // Get current user ID from auth context
    return localStorage.getItem('user_id') || undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  private async getGeolocation(): Promise<string | undefined> {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      // Return country based on coordinates (simplified)
      return 'US'; // This would use a geolocation service in practice
    } catch {
      return undefined;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hideBanner(): void {
    const banner = document.querySelector('.gdpr-consent-banner');
    if (banner) {
      banner.remove();
    }
  }
}

// Example 4: Backend DSAR Processing Workflow
export class DSARProcessor {
  async processAccessRequest(request: any): Promise<any> {
    const userId = request.userId;

    // Collect all user data from various systems
    const userData = await this.collectUserData(userId);
    const consentData = await this.getConsentData(userId);
    const processingActivities = await this.getProcessingActivities(userId);
    const thirdPartySharing = await this.getThirdPartySharing(userId);

    // Create comprehensive data package
    const accessPackage = {
      userId,
      requestId: request.id,
      generatedAt: new Date(),
      personalData: userData,
      consents: consentData,
      processingActivities,
      thirdPartySharing,
      dataCategories: this.categorizeUserData(userData),
      retentionPeriods: await this.getRetentionPeriods(userId),
      legalBasis: this.getLegalBasis(userId),
      rightsExercised: await this.getRightsExerciseHistory(userId),
      technicalFormat: this.generateTechnicalFormat(userData)
    };

    // Store package for delivery
    await this.storeAccessPackage(request.id, accessPackage);

    // Send notification
    await this.sendDataAvailableNotification(request, accessPackage);

    return accessPackage;
  }

  private async collectUserData(userId: string): Promise<any> {
    // This would collect data from all relevant systems
    return {
      profile: await this.getUserProfile(userId),
      leads: await this.getUserLeads(userId),
      activities: await this.getUserActivities(userId),
      communications: await this.getUserCommunications(userId),
      analytics: await this.getUserAnalytics(userId)
    };
  }

  private async getConsentData(userId: string): Promise<any> {
    const status = await gdprApiService.getConsentStatus(userId);
    return status.consents;
  }

  private async getProcessingActivities(userId: string): Promise<any[]> {
    // Return all processing activities involving the user
    return [
      {
        purpose: 'Service delivery',
        legalBasis: GDPRArticle.ARTICLE_6,
        categories: ['Personal data', 'Contact information'],
        recipients: ['Internal systems'],
        retention: '2 years after service termination'
      }
    ];
  }

  private async getThirdPartySharing(userId: string): Promise<any> {
    return {
      shared: false,
      parties: []
    };
  }

  private categorizeUserData(data: any): string[] {
    return ['Personal identification', 'Contact information', 'Behavioral data'];
  }

  private async getRetentionPeriods(userId: string): Promise<any> {
    return {
      'Customer data': '2 years',
      'Analytics data': '1 year',
      'Communication data': '3 years'
    };
  }

  private getLegalBasis(userId: string): any {
    return {
      'Service delivery': GDPRArticle.ARTICLE_6,
      'Marketing': GDPRArticle.ARTICLE_7,
      'Analytics': GDPRArticle.ARTICLE_7
    };
  }

  private async getRightsExerciseHistory(userId: string): Promise<any[]> {
    // Return history of previously exercised rights
    return [];
  }

  private generateTechnicalFormat(data: any): any {
    return {
      format: 'JSON',
      schema: 'GDPR Data Export Schema v1.0',
      encoding: 'UTF-8'
    };
  }

  private async storeAccessPackage(requestId: string, packageData: any): Promise<void> {
    // Store package for secure download
    console.log(`Storing access package for request ${requestId}`);
  }

  private async sendDataAvailableNotification(request: any, packageData: any): Promise<void> {
    console.log(`Sending data available notification to ${request.email}`);
  }

  // Placeholder methods for data collection
  private async getUserProfile(userId: string): Promise<any> {
    return { id: userId, name: 'John Doe', email: 'john@example.com' };
  }

  private async getUserLeads(userId: string): Promise<any[]> {
    return [];
  }

  private async getUserActivities(userId: string): Promise<any[]> {
    return [];
  }

  private async getUserCommunications(userId: string): Promise<any[]> {
    return [];
  }

  private async getUserAnalytics(userId: string): Promise<any> {
    return { pageViews: 0, sessionDuration: 0 };
  }
}

// Example 5: Data Retention Policy Setup
export class RetentionPolicyManager {
  async setupDefaultPolicies(): Promise<void> {
    // Customer Personal Data Policy
    await dataRetentionService.createRetentionPolicy({
      name: 'Customer Personal Data',
      description: 'Standard retention for customer personal information',
      dataType: 'customer',
      category: DataCategory.PERSONAL_DATA,
      retentionPeriod: {
        duration: 2,
        unit: 'years',
        trigger: 'creation'
      },
      deletionMethod: DeletionMethod.ANONYMIZE,
      legalBasis: 'Legitimate interest',
      gdprArticle: 'Article 6(1)(f)',
      isActive: true
    });

    // Financial Records Policy
    await dataRetentionService.createRetentionPolicy({
      name: 'Financial Records',
      description: 'Long-term retention for financial and tax records',
      dataType: 'financial',
      category: DataCategory.FINANCIAL_DATA,
      retentionPeriod: {
        duration: 7,
        unit: 'years',
        trigger: 'creation'
      },
      deletionMethod: DeletionMethod.SOFT_DELETE,
      legalBasis: 'Legal obligation',
      gdprArticle: 'Article 6(1)(c)',
      isActive: true
    });

    // Analytics Data Policy
    await dataRetentionService.createRetentionPolicy({
      name: 'Analytics Data',
      description: 'Short-term retention for usage analytics',
      dataType: 'analytics',
      category: DataCategory.ANALYTICS_DATA,
      retentionPeriod: {
        duration: 1,
        unit: 'years',
        trigger: 'creation'
      },
      deletionMethod: DeletionMethod.ANONYMIZE,
      legalBasis: 'Consent',
      gdprArticle: 'Article 6(1)(a)',
      isActive: true
    });
  }

  async registerDataRecord(data: {
    dataType: string;
    userId?: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    const policy = await this.getPolicyForDataType(data.dataType);
    
    await dataRetentionService.registerDataRecord({
      dataType: data.dataType,
      category: policy.category,
      userId: data.userId,
      createdAt: new Date(),
      retentionPolicyId: policy.id,
      metadata: data.metadata
    });
  }

  private async getPolicyForDataType(dataType: string): Promise<any> {
    const policies = dataRetentionService.getPolicies();
    return policies.find(p => p.dataType === dataType && p.isActive);
  }
}

// Example 6: Compliance Monitoring
export class ComplianceMonitor {
  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Daily compliance checks
    setInterval(async () => {
      await this.runDailyComplianceCheck();
    }, 24 * 60 * 60 * 1000);

    // Real-time SLA monitoring
    setInterval(async () => {
      await this.checkDSARSLAs();
    }, 60 * 60 * 1000); // Every hour
  }

  private async runDailyComplianceCheck(): Promise<void> {
    try {
      const audit = await gdprAutomationService.runComplianceAudit([
        {
          area: 'DSAR Processing',
          description: 'Check DSAR request processing compliance',
          controls: ['SLA compliance', 'Data accuracy', 'Legal basis verification']
        },
        {
          area: 'Consent Management',
          description: 'Verify consent management compliance',
          controls: ['Consent recording', 'Withdrawal handling', 'Third-party integration']
        },
        {
          area: 'Data Retention',
          description: 'Check data retention policy compliance',
          controls: ['Policy enforcement', 'Automated deletion', 'Legal hold management']
        }
      ]);

      if (audit.riskLevel === 'high' || audit.riskLevel === 'critical') {
        await this.alertComplianceTeam(audit);
      }
    } catch (error) {
      console.error('Daily compliance check failed:', error);
    }
  }

  private async checkDSARSLAs(): Promise<void> {
    const requests = gdprAutomationService.getDSARRequests({
      status: 'in_progress' as any
    });

    const now = new Date();
    for (const request of requests) {
      if (now > request.dueDate) {
        console.warn(`SLA breach detected for request ${request.id}`);
        await gdprAutomationService.handleSLABreach(request);
      }
    }
  }

  private async alertComplianceTeam(audit: any): Promise<void> {
    console.error(`Compliance Alert: ${audit.riskLevel} risk level detected`);
    // In production, this would send alerts to compliance team
  }
}

// Export all examples
export const gdprExamples = {
  GDPRModule,
  setupGDPRMiddleware,
  ConsentBannerManager,
  DSARProcessor,
  RetentionPolicyManager,
  ComplianceMonitor
};