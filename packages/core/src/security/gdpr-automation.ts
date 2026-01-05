/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing */
import { EventEmitter } from 'node:events';
import { logger } from '../logger.js';
import { dataPrivacyService, DataPrivacyService } from './data-privacy.js';

export interface DSARRequest {
  id: string;
  userId: string;
  type: DSARType;
  status: DSARStatus;
  requestedAt: Date;
  completedAt?: Date;
  dueDate: Date;
  email: string;
  legalBasis: GDPRArticle;
  description?: string;
  verificationMethod: VerificationMethod;
  verifiedAt?: Date;
  notes?: string;
  attachments?: string[];
  priority: DSARPriority;
}

export enum DSARType {
  ACCESS = 'access',           // Article 15 - Right of access
  RECTIFICATION = 'rectification', // Article 16 - Right to rectification
  ERASURE = 'erasure',         // Article 17 - Right to erasure
  RESTRICTION = 'restriction', // Article 18 - Right to restriction
  PORTABILITY = 'portability', // Article 20 - Right to data portability
  OBJECTION = 'objection',     // Article 21 - Right to object
  AUTOMATED_DECISION = 'automated_decision' // Article 22 - Automated decision-making
}

export enum DSARStatus {
  PENDING = 'pending',
  VERIFICATION_PENDING = 'verification_pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  ESCALATED = 'escalated'
}

export enum GDPRArticle {
  ARTICLE_15 = 'Article 15',  // Right of access
  ARTICLE_16 = 'Article 16',  // Right to rectification
  ARTICLE_17 = 'Article 17',  // Right to erasure
  ARTICLE_18 = 'Article 18',  // Right to restriction
  ARTICLE_20 = 'Article 20',  // Right to data portability
  ARTICLE_21 = 'Article 21',  // Right to object
  ARTICLE_22 = 'Article 22',  // Automated decision-making
  ARTICLE_6 = 'Article 6',    // Lawfulness of processing
  ARTICLE_7 = 'Article 7'     // Conditions for consent
}

export enum VerificationMethod {
  EMAIL_VERIFICATION = 'email_verification',
  PHONE_VERIFICATION = 'phone_verification',
  ID_VERIFICATION = 'id_verification',
  SECURITY_QUESTIONS = 'security_questions',
  BIOMETRIC = 'biometric'
}

export enum DSARPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export interface ConsentGranularity {
  purpose: string;
  category: ConsentCategory;
  specificFields?: string[];
  processingActivities?: string[];
  thirdPartySharing?: boolean;
  retentionPeriod?: number;
  consentGiven: boolean;
  consentWithdrawnAt?: Date;
  legalBasis: GDPRArticle;
}

export enum ConsentCategory {
  ESSENTIAL = 'essential',           // Legitimate interests, contract performance
  FUNCTIONAL = 'functional',         // Analytics, personalization
  MARKETING = 'marketing',           // Direct marketing, profiling
  ANALYTICS = 'analytics',           // Website analytics, usage tracking
  PERSONALIZATION = 'personalization', // Content personalization
  THIRD_PARTY = 'third_party',       // Third-party data sharing
  AUTOMATED_PROCESSING = 'automated_processing', // AI/ML processing
  RESEARCH = 'research'              // Scientific research
}

export interface RetentionJob {
  id: string;
  dataType: string;
  retentionPolicy: string;
  scheduledFor: Date;
  executedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  affectedRecords: number;
  deletionMethod: 'hard' | 'soft' | 'anonymize';
  logs: string[];
  createdAt: Date;
}

export interface ComplianceAudit {
  id: string;
  date: Date;
  scope: ComplianceScope[];
  findings: ComplianceFinding[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'in_progress' | 'completed' | 'requires_action';
  auditor: string;
}

export interface ComplianceScope {
  area: string;
  description: string;
  controls: string[];
}

export interface ComplianceFinding {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  gdprArticle?: GDPRArticle;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export class GDPRAutomationService extends EventEmitter {
  private dsarRequests: Map<string, DSARRequest> = new Map();
  private retentionJobs: Map<string, RetentionJob> = new Map();
  private complianceAudits: Map<string, ComplianceAudit> = new Map();
  private consentRecords: Map<string, ConsentGranularity[]> = new Map();

  // SLA timeframes (in hours) as per GDPR requirements
  private readonly SLA_TIMEFRAMES: Record<DSARType, number> = {
    [DSARType.ACCESS]: 30 * 24,           // 30 days
    [DSARType.RECTIFICATION]: 30 * 24,    // 30 days
    [DSARType.ERASURE]: 30 * 24,          // 30 days
    [DSARType.RESTRICTION]: 30 * 24,      // 30 days
    [DSARType.PORTABILITY]: 30 * 24,      // 30 days
    [DSARType.OBJECTION]: 30 * 24,        // 30 days
    [DSARType.AUTOMATED_DECISION]: 30 * 24 // 30 days
  };

  constructor() {
    super();
    this.startRetentionScheduler();
    this.startSLAWatcher();
    this.initializeDefaultConsents();
  }

  // DSAR Management
  async createDSARRequest(request: Omit<DSARRequest, 'id' | 'status' | 'requestedAt' | 'dueDate'>): Promise<DSARRequest> {
    const id = this.generateId();
    const requestedAt = new Date();
    const dueDate = new Date(requestedAt.getTime() + this.SLA_TIMEFRAMES[request.type] * 60 * 60 * 1000);

    const dsarRequest: DSARRequest = {
      ...request,
      id,
      status: DSARStatus.VERIFICATION_PENDING,
      requestedAt,
      dueDate
    };

    this.dsarRequests.set(id, dsarRequest);

    // Send verification email
    await this.sendVerificationEmail(dsarRequest);

    logger.info('DSAR request created', {
      id,
      userId: request.userId,
      type: request.type,
      dueDate
    });

    this.emit('dsar:created', dsarRequest);
    return dsarRequest;
  }

  async verifyDSARRequest(requestId: string, verificationData: any): Promise<boolean> {
    const request = this.dsarRequests.get(requestId);
    if (!request) {
      throw new Error(`DSAR request ${requestId} not found`);
    }

    // Implement verification logic based on verification method
    const verified = await this.performVerification(request, verificationData);
    
    if (verified) {
      request.status = DSARStatus.IN_PROGRESS;
      request.verifiedAt = new Date();
      this.dsarRequests.set(requestId, request);

      // Start processing
      await this.processDSARRequest(request);
    }

    logger.info('DSAR request verification completed', {
      requestId,
      verified
    });

    return verified;
  }

  async processDSARRequest(request: DSARRequest): Promise<void> {
    try {
      logger.info('Processing DSAR request', { id: request.id, type: request.type });

      switch (request.type) {
        case DSARType.ACCESS:
          await this.processAccessRequest(request);
          break;
        case DSARType.RECTIFICATION:
          await this.processRectificationRequest(request);
          break;
        case DSARType.ERASURE:
          await this.processErasureRequest(request);
          break;
        case DSARType.RESTRICTION:
          await this.processRestrictionRequest(request);
          break;
        case DSARType.PORTABILITY:
          await this.processPortabilityRequest(request);
          break;
        case DSARType.OBJECTION:
          await this.processObjectionRequest(request);
          break;
        case DSARType.AUTOMATED_DECISION:
          await this.processAutomatedDecisionRequest(request);
          break;
      }

      request.status = DSARStatus.COMPLETED;
      request.completedAt = new Date();
      this.dsarRequests.set(request.id, request);

      // Send completion notification
      await this.sendCompletionNotification(request);

      logger.info('DSAR request processed successfully', { id: request.id });

    } catch (error) {
      logger.error('Error processing DSAR request', { id: request.id, error });
      request.status = DSARStatus.ESCALATED;
      this.dsarRequests.set(request.id, request);
      
      // Escalate to DPO
      await this.escalateToDPO(request, error as Error);
    }
  }

  private async processAccessRequest(request: DSARRequest): Promise<void> {
    // Collect all user data from various systems
    const userData = await this.collectUserData(request.userId);
    const consentData = this.consentRecords.get(request.userId) || [];
    const processingActivities = await this.getProcessingActivities(request.userId);

    const accessPackage = {
      userId: request.userId,
      requestId: request.id,
      generatedAt: new Date(),
      personalData: userData,
      consents: consentData,
      processingActivities,
      dataCategories: this.categorizeUserData(userData),
      thirdPartySharing: await this.getThirdPartySharing(request.userId),
      retentionPeriods: await this.getRetentionPeriods(request.userId),
      legalBasis: this.getLegalBasis(request.userId),
      rightsExercised: await this.getRightsExerciseHistory(request.userId)
    };

    // Store the access package for delivery
    await this.storeAccessPackage(request.id, accessPackage);
  }

  private async processErasureRequest(request: DSARRequest): Promise<void> {
    // Check if erasure is legally possible
    const erasureCheck = await this.checkErasureEligibility(request.userId);
    
    if (!erasureCheck.allowed) {
      request.status = DSARStatus.REJECTED;
      request.notes = `Erasure not allowed: ${erasureCheck.reason}`;
      return;
    }

    // Create deletion job
    const deletionJob: RetentionJob = {
      id: this.generateId(),
      dataType: 'all',
      retentionPolicy: 'user_requested_deletion',
      scheduledFor: new Date(),
      status: 'scheduled',
      affectedRecords: erasureCheck.affectedRecords,
      deletionMethod: 'hard',
      logs: [],
      createdAt: new Date()
    };

    this.retentionJobs.set(deletionJob.id, deletionJob);
    await this.executeRetentionJob(deletionJob.id);
  }

  private async processPortabilityRequest(request: DSARRequest): Promise<void> {
    // Export data in portable format (JSON, CSV)
    const portableData = await this.exportPortableData(request.userId);
    
    const portabilityPackage = {
      userId: request.userId,
      requestId: request.id,
      generatedAt: new Date(),
      format: 'json',
      data: portableData,
      technicalFormat: this.generateTechnicalFormat(portableData),
      instructions: this.generateImportInstructions(portableData)
    };

    await this.storePortabilityPackage(request.id, portabilityPackage);
  }

  // Enhanced Consent Management
  async recordGranularConsent(userId: string, consents: ConsentGranularity[]): Promise<void> {
    const existingConsents = this.consentRecords.get(userId) || [];
    
    // Merge with existing consents, updating timestamps
    const updatedConsents = this.mergeConsents(existingConsents, consents);
    this.consentRecords.set(userId, updatedConsents);

    logger.info('Granular consent recorded', {
      userId,
      consentCount: consents.length,
      purposes: consents.map(c => c.purpose)
    });

    this.emit('consent:updated', { userId, consents });
  }

  async getActiveConsents(userId: string, category?: ConsentCategory): Promise<ConsentGranularity[]> {
    const consents = this.consentRecords.get(userId) || [];
    
    return consents.filter(consent => {
      if (category && consent.category !== category) {
        return false;
      }
      
      if (consent.consentWithdrawnAt) {
        return false;
      }

      if (consent.retentionPeriod) {
        // Check if consent is still within retention period
        const consentDate = new Date(); // This would be the original consent date
        const expiryDate = new Date(consentDate.getTime() + consent.retentionPeriod * 24 * 60 * 60 * 1000);
        return new Date() < expiryDate;
      }

      return true;
    });
  }

  async withdrawConsent(userId: string, purpose: string): Promise<void> {
    const consents = this.consentRecords.get(userId) || [];
    
    for (const consent of consents) {
      if (consent.purpose === purpose && !consent.consentWithdrawnAt) {
        consent.consentWithdrawnAt = new Date();
      }
    }

    this.consentRecords.set(userId, consents);

    // Stop processing for this purpose
    await this.stopProcessingForConsent(userId, purpose);

    logger.info('Consent withdrawn', { userId, purpose });
    this.emit('consent:withdrawn', { userId, purpose });
  }

  // Automated Retention Management
  async scheduleRetentionJob(dataType: string, createdAt: Date): Promise<string> {
    const policy = dataPrivacyService.getRetentionPolicy(dataType);
    if (!policy) {
      throw new Error(`No retention policy found for data type: ${dataType}`);
    }

    const scheduledFor = new Date(createdAt.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000);
    
    const job: RetentionJob = {
      id: this.generateId(),
      dataType,
      retentionPolicy: `${dataType}_policy`,
      scheduledFor,
      status: 'scheduled',
      affectedRecords: 0, // Will be determined at execution
      deletionMethod: policy.deletionMethod,
      logs: [],
      createdAt: new Date()
    };

    this.retentionJobs.set(job.id, job);
    
    logger.info('Retention job scheduled', {
      jobId: job.id,
      dataType,
      scheduledFor
    });

    return job.id;
  }

  private startRetentionScheduler(): void {
    // Check for jobs to execute every hour
    setInterval(async () => {
      const now = new Date();
      const pendingJobs = Array.from(this.retentionJobs.values())
        .filter(job => job.status === 'scheduled' && job.scheduledFor <= now);

      for (const job of pendingJobs) {
        await this.executeRetentionJob(job.id);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async executeRetentionJob(jobId: string): Promise<void> {
    const job = this.retentionJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      this.retentionJobs.set(jobId, job);

      logger.info('Executing retention job', { jobId });

      switch (job.deletionMethod) {
        case 'hard':
          await this.performHardDeletion(job);
          break;
        case 'soft':
          await this.performSoftDeletion(job);
          break;
        case 'anonymize':
          await this.performAnonymization(job);
          break;
      }

      job.status = 'completed';
      job.executedAt = new Date();
      this.retentionJobs.set(jobId, job);

      logger.info('Retention job completed', { jobId, affectedRecords: job.affectedRecords });

    } catch (error) {
      job.status = 'failed';
      job.logs.push(`Error: ${(error as Error).message}`);
      this.retentionJobs.set(jobId, job);

      logger.error('Retention job failed', { jobId, error });
    }
  }

  private async performHardDeletion(job: RetentionJob): Promise<void> {
    // Hard delete all data records
    const deletedCount = await this.deleteDataRecords(job.dataType);
    job.affectedRecords = deletedCount;
    job.logs.push(`Hard deleted ${deletedCount} records`);
  }

  private async performSoftDeletion(job: RetentionJob): Promise<void> {
    // Mark records as deleted (set deleted_at timestamp)
    const deletedCount = await this.softDeleteDataRecords(job.dataType);
    job.affectedRecords = deletedCount;
    job.logs.push(`Soft deleted ${deletedCount} records`);
  }

  private async performAnonymization(job: RetentionJob): Promise<void> {
    // Anonymize PII while keeping analytics value
    const anonymizedCount = await this.anonymizeDataRecords(job.dataType);
    job.affectedRecords = anonymizedCount;
    job.logs.push(`Anonymized ${deletedCount} records`);
  }

  // Compliance and Audit
  async runComplianceAudit(scope: ComplianceScope[]): Promise<ComplianceAudit> {
    const audit: ComplianceAudit = {
      id: this.generateId(),
      date: new Date(),
      scope,
      findings: [],
      recommendations: [],
      riskLevel: 'low',
      status: 'in_progress',
      auditor: 'system'
    };

    // Check DSAR compliance
    const dsarCompliance = await this.checkDSARCompliance();
    audit.findings.push(...dsarCompliance.findings);

    // Check consent compliance
    const consentCompliance = await this.checkConsentCompliance();
    audit.findings.push(...consentCompliance.findings);

    // Check retention compliance
    const retentionCompliance = await this.checkRetentionCompliance();
    audit.findings.push(...retentionCompliance.findings);

    // Calculate overall risk level
    audit.riskLevel = this.calculateOverallRisk(audit.findings);

    // Generate recommendations
    audit.recommendations = this.generateRecommendations(audit.findings);

    audit.status = 'completed';
    this.complianceAudits.set(audit.id, audit);

    logger.info('Compliance audit completed', {
      auditId: audit.id,
      riskLevel: audit.riskLevel,
      findingsCount: audit.findings.length
    });

    return audit;
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendVerificationEmail(request: DSARRequest): Promise<void> {
    // Implement email verification logic
    logger.info('Sending verification email', { requestId: request.id, email: request.email });
  }

  private async sendCompletionNotification(request: DSARRequest): Promise<void> {
    // Implement completion notification logic
    logger.info('Sending completion notification', { requestId: request.id, email: request.email });
  }

  private async performVerification(request: DSARRequest, verificationData: any): Promise<boolean> {
    // Implement verification logic based on method
    switch (request.verificationMethod) {
      case VerificationMethod.EMAIL_VERIFICATION:
        return verificationData.email === request.email;
      // Add other verification methods
      default:
        return false;
    }
  }

  private startSLAWatcher(): void {
    // Check for SLA breaches every hour
    setInterval(() => {
      const now = new Date();
      for (const request of this.dsarRequests.values()) {
        if (request.status === DSARStatus.IN_PROGRESS && now > request.dueDate) {
          this.handleSLABreach(request);
        }
      }
    }, 60 * 60 * 1000);
  }

  private async handleSLABreach(request: DSARRequest): Promise<void> {
    logger.warn('SLA breach detected', { requestId: request.id, dueDate: request.dueDate });
    
    // Escalate to DPO
    request.status = DSARStatus.ESCALATED;
    this.dsarRequests.set(request.id, request);
    
    await this.escalateToDPO(request, new Error('SLA breach'));
  }

  private async escalateToDPO(request: DSARRequest, error: Error): Promise<void> {
    // Implement DPO escalation logic
    logger.error('Escalating to DPO', { requestId: request.id, error: error.message });
  }

  private initializeDefaultConsents(): void {
    // Initialize default consent categories and purposes
    const defaultConsents: ConsentGranularity[] = [
      {
        purpose: 'contract_performance',
        category: ConsentCategory.ESSENTIAL,
        consentGiven: true,
        legalBasis: GDPRArticle.ARTICLE_6
      },
      {
        purpose: 'legal_compliance',
        category: ConsentCategory.ESSENTIAL,
        consentGiven: true,
        legalBasis: GDPRArticle.ARTICLE_6
      }
    ];

    this.consentRecords.set('default', defaultConsents);
  }

  // Placeholder methods - would be implemented with actual data sources
  private async collectUserData(userId: string): Promise<any> {
    return { userId, data: [] };
  }

  private async getProcessingActivities(userId: string): Promise<any[]> {
    return [];
  }

  private async getThirdPartySharing(userId: string): Promise<any> {
    return { shared: false, parties: [] };
  }

  private async getRetentionPeriods(userId: string): Promise<any> {
    return {};
  }

  private getLegalBasis(userId: string): any {
    return {};
  }

  private async getRightsExerciseHistory(userId: string): Promise<any[]> {
    return [];
  }

  private categorizeUserData(data: any): string[] {
    return ['personal_data'];
  }

  private async storeAccessPackage(requestId: string, packageData: any): Promise<void> {
    // Store access package for delivery
  }

  private async checkErasureEligibility(userId: string): Promise<{ allowed: boolean; reason?: string; affectedRecords: number }> {
    return { allowed: true, affectedRecords: 0 };
  }

  private async exportPortableData(userId: string): Promise<any> {
    return {};
  }

  private generateTechnicalFormat(data: any): any {
    return {};
  }

  private generateImportInstructions(data: any): string {
    return 'Import instructions';
  }

  private async storePortabilityPackage(requestId: string, packageData: any): Promise<void> {
    // Store portability package for delivery
  }

  private mergeConsents(existing: ConsentGranularity[], newConsents: ConsentGranularity[]): ConsentGranularity[] {
    return [...existing, ...newConsents];
  }

  private async stopProcessingForConsent(userId: string, purpose: string): Promise<void> {
    // Stop processing activities for withdrawn consent
  }

  private async deleteDataRecords(dataType: string): Promise<number> {
    return 0;
  }

  private async softDeleteDataRecords(dataType: string): Promise<number> {
    return 0;
  }

  private async anonymizeDataRecords(dataType: string): Promise<number> {
    return 0;
  }

  private async checkDSARCompliance(): Promise<{ findings: ComplianceFinding[] }> {
    return { findings: [] };
  }

  private async checkConsentCompliance(): Promise<{ findings: ComplianceFinding[] }> {
    return { findings: [] };
  }

  private async checkRetentionCompliance(): Promise<{ findings: ComplianceFinding[] }> {
    return { findings: [] };
  }

  private calculateOverallRisk(findings: ComplianceFinding[]): 'low' | 'medium' | 'high' | 'critical' {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    return findings.map(f => f.recommendation);
  }

  // Getters for external access
  getDSARRequests(filters?: { status?: DSARStatus; type?: DSARType }): DSARRequest[] {
    let requests = Array.from(this.dsarRequests.values());
    
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    
    if (filters?.type) {
      requests = requests.filter(r => r.type === filters.type);
    }
    
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  getRetentionJobs(filters?: { status?: string }): RetentionJob[] {
    let jobs = Array.from(this.retentionJobs.values());
    
    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }
    
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getComplianceAudits(): ComplianceAudit[] {
    return Array.from(this.complianceAudits.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

export const gdprAutomationService = new GDPRAutomationService();