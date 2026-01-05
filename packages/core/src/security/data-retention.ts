/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing */
import { EventEmitter } from 'node:events';
import { logger } from '../logger.js';
import { dataPrivacyService } from './data-privacy.js';
import { gdprAutomationService, RetentionJob } from './gdpr-automation.js';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: string;
  category: DataCategory;
  retentionPeriod: RetentionPeriod;
  deletionMethod: DeletionMethod;
  legalBasis?: string;
  gdprArticle?: string;
  conditions?: RetentionCondition[];
  exceptions?: RetentionException[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface RetentionPeriod {
  duration: number;
  unit: 'days' | 'months' | 'years';
  trigger: 'creation' | 'last_access' | 'account_closure' | 'consent_withdrawal' | 'legal_hold';
  maxDuration?: number;
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  description: string;
}

export interface RetentionException {
  condition: RetentionCondition;
  action: 'exclude' | 'extend' | 'anonymize';
  newPeriod?: RetentionPeriod;
  description: string;
}

export enum DataCategory {
  PERSONAL_DATA = 'personal_data',
  SENSITIVE_DATA = 'sensitive_data',
  FINANCIAL_DATA = 'financial_data',
  HEALTH_DATA = 'health_data',
  BIOMETRIC_DATA = 'biometric_data',
  LOCATION_DATA = 'location_data',
  BEHAVIORAL_DATA = 'behavioral_data',
  ANALYTICS_DATA = 'analytics_data',
  SYSTEM_DATA = 'system_data',
  AUDIT_DATA = 'audit_data'
}

export enum DeletionMethod {
  HARD_DELETE = 'hard_delete',      // Complete removal from all systems
  SOFT_DELETE = 'soft_delete',      // Mark as deleted, retain for legal reasons
  ANONYMIZE = 'anonymize',          // Remove PII, keep anonymized data
  PSEUDONYMIZE = 'pseudonymize',    // Replace identifying information
  ARCHIVE = 'archive'               // Move to long-term storage
}

export interface DataRecord {
  id: string;
  dataType: string;
  category: DataCategory;
  userId?: string;
  createdAt: Date;
  lastAccessedAt?: Date;
  retentionPolicyId: string;
  legalHold?: boolean;
  metadata: Record<string, any>;
  deletionScheduled?: Date;
  deletionExecuted?: Date;
  deletionMethod?: DeletionMethod;
  status: 'active' | 'pending_deletion' | 'deleted' | 'archived' | 'legal_hold';
}

export interface DeletionBatch {
  id: string;
  policyId: string;
  scheduledFor: Date;
  executedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  records: DataRecord[];
  deletionMethod: DeletionMethod;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  logs: string[];
  createdAt: Date;
}

export interface RetentionReport {
  id: string;
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalRecords: number;
    deletedRecords: number;
    archivedRecords: number;
    anonymizedRecords: number;
    legalHolds: number;
    policyViolations: number;
  };
  byPolicy: PolicyReport[];
  byCategory: CategoryReport[];
  compliance: ComplianceReport;
  recommendations: string[];
}

export interface PolicyReport {
  policyId: string;
  policyName: string;
  recordsAffected: number;
  deletionsExecuted: number;
  averageProcessingTime: number;
  successRate: number;
  issues: string[];
}

export interface CategoryReport {
  category: DataCategory;
  totalRecords: number;
  retentionRate: number;
  deletionRate: number;
  averageAge: number;
  largestDataset: string;
}

export interface ComplianceReport {
  gdprCompliance: {
    score: number;
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  };
  policyAdherence: {
    score: number;
    violations: number;
    overdueDeletions: number;
  };
  legalRequirements: {
    met: boolean;
    gaps: string[];
    risks: string[];
  };
}

export class DataRetentionService extends EventEmitter {
  private policies: Map<string, RetentionPolicy> = new Map();
  private records: Map<string, DataRecord> = new Map();
  private batches: Map<string, DeletionBatch> = new Map();
  private reports: Map<string, RetentionReport> = new Map();
  private legalHolds: Map<string, { reason: string; startDate: Date; endDate?: Date }> = new Map();

  // Default retention periods (in days)
  private readonly DEFAULT_RETENTION: Record<DataCategory, number> = {
    [DataCategory.PERSONAL_DATA]: 365 * 2, // 2 years
    [DataCategory.SENSITIVE_DATA]: 365 * 7, // 7 years
    [DataCategory.FINANCIAL_DATA]: 365 * 7, // 7 years (tax requirements)
    [DataCategory.HEALTH_DATA]: 365 * 10, // 10 years
    [DataCategory.BIOMETRIC_DATA]: 365, // 1 year
    [DataCategory.LOCATION_DATA]: 90, // 90 days
    [DataCategory.BEHAVIORAL_DATA]: 365, // 1 year
    [DataCategory.ANALYTICS_DATA]: 365 * 3, // 3 years
    [DataCategory.SYSTEM_DATA]: 90, // 90 days
    [DataCategory.AUDIT_DATA]: 365 * 7 // 7 years
  };

  constructor() {
    super();
    this.initializeDefaultPolicies();
    this.startRetentionScheduler();
    this.startComplianceWatcher();
  }

  // Policy Management
  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<RetentionPolicy> {
    const id = this.generateId();
    const now = new Date();

    const newPolicy: RetentionPolicy = {
      ...policy,
      id,
      createdAt: now,
      updatedAt: now,
      version: '1.0'
    };

    this.policies.set(id, newPolicy);

    logger.info('Retention policy created', {
      id,
      name: policy.name,
      dataType: policy.dataType,
      category: policy.category
    });

    this.emit('policy:created', newPolicy);
    return newPolicy;
  }

  async updateRetentionPolicy(id: string, updates: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Retention policy ${id} not found`);
    }

    // Increment version for significant changes
    const version = updates.retentionPeriod || updates.deletionMethod || updates.legalBasis
      ? this.incrementVersion(policy.version)
      : policy.version;

    const updatedPolicy: RetentionPolicy = {
      ...policy,
      ...updates,
      id,
      version,
      updatedAt: new Date()
    };

    this.policies.set(id, updatedPolicy);

    // Re-evaluate existing records if retention period changed
    if (updates.retentionPeriod) {
      await this.reEvaluateExistingRecords(id, updatedPolicy);
    }

    logger.info('Retention policy updated', { id, version });
    this.emit('policy:updated', updatedPolicy);

    return updatedPolicy;
  }

  async applyRetentionPolicy(policyId: string, recordIds: string[]): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Retention policy ${policyId} not found`);
    }

    for (const recordId of recordIds) {
      const record = this.records.get(recordId);
      if (record) {
        record.retentionPolicyId = policyId;
        this.records.set(recordId, record);
      }
    }

    logger.info('Retention policy applied', {
      policyId,
      recordCount: recordIds.length
    });

    this.emit('policy:applied', { policyId, recordIds });
  }

  // Record Management
  async registerDataRecord(record: Omit<DataRecord, 'id' | 'status'>): Promise<DataRecord> {
    const id = this.generateId();
    
    const newRecord: DataRecord = {
      ...record,
      id,
      status: 'active'
    };

    this.records.set(id, newRecord);

    // Schedule for deletion based on policy
    const policy = this.policies.get(record.retentionPolicyId);
    if (policy) {
      const deletionDate = this.calculateDeletionDate(record, policy);
      newRecord.deletionScheduled = deletionDate;
      this.records.set(id, newRecord);

      // Register with GDPR automation service
      await gdprAutomationService.scheduleRetentionJob(record.dataType, record.createdAt);
    }

    logger.info('Data record registered', {
      id,
      dataType: record.dataType,
      category: record.category,
      deletionScheduled: newRecord.deletionScheduled
    });

    this.emit('record:registered', newRecord);
    return newRecord;
  }

  async updateRecordAccess(recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (record) {
      record.lastAccessedAt = new Date();
      this.records.set(recordId, record);

      // Re-evaluate deletion date if trigger is 'last_access'
      const policy = this.policies.get(record.retentionPolicyId);
      if (policy && policy.retentionPeriod.trigger === 'last_access') {
        record.deletionScheduled = this.calculateDeletionDate(record, policy);
        this.records.set(recordId, record);
      }
    }
  }

  async placeLegalHold(recordId: string, reason: string, durationDays?: number): Promise<void> {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Data record ${recordId} not found`);
    }

    record.legalHold = true;
    record.status = 'legal_hold';
    this.records.set(recordId, record);

    const holdInfo = {
      reason,
      startDate: new Date(),
      endDate: durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : undefined
    };

    this.legalHolds.set(recordId, holdInfo);

    logger.info('Legal hold placed', {
      recordId,
      reason,
      endDate: holdInfo.endDate
    });

    this.emit('record:legal_hold', { recordId, reason, holdInfo });
  }

  async removeLegalHold(recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (record && record.legalHold) {
      record.legalHold = false;
      record.status = 'active';
      this.records.set(recordId, record);

      this.legalHolds.delete(recordId);

      logger.info('Legal hold removed', { recordId });
      this.emit('record:legal_hold_removed', { recordId });
    }
  }

  // Automated Deletion Management
  async executeScheduledDeletions(): Promise<void> {
    const now = new Date();
    const candidatesForDeletion = Array.from(this.records.values())
      .filter(record => {
        if (record.status !== 'active' || record.legalHold) return false;
        if (!record.deletionScheduled) return false;
        return record.deletionScheduled <= now;
      });

    if (candidatesForDeletion.length === 0) {
      return;
    }

    // Group by deletion method and policy for efficient processing
    const groupedRecords = this.groupRecordsForDeletion(candidatesForDeletion);

    for (const [key, records] of groupedRecords) {
      const [policyId, deletionMethod] = key.split(':');
      await this.createAndExecuteDeletionBatch(policyId, deletionMethod as DeletionMethod, records);
    }
  }

  private async createAndExecuteDeletionBatch(
    policyId: string,
    deletionMethod: DeletionMethod,
    records: DataRecord[]
  ): Promise<void> {
    const batchId = this.generateId();
    const batch: DeletionBatch = {
      id: batchId,
      policyId,
      scheduledFor: new Date(),
      status: 'pending',
      records,
      deletionMethod,
      progress: {
        total: records.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      logs: [],
      createdAt: new Date()
    };

    this.batches.set(batchId, batch);
    batch.status = 'running';

    logger.info('Starting deletion batch', {
      batchId,
      recordCount: records.length,
      deletionMethod
    });

    // Process records in parallel with rate limiting
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batchRecords = records.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batchRecords.map(record => this.processRecordDeletion(batchId, record))
      );

      batch.progress.processed += batchRecords.length;
      this.batches.set(batchId, batch);

      // Log progress
      batch.logs.push(`Processed ${batch.progress.processed}/${batch.progress.total} records`);
      
      // Brief pause to avoid overwhelming systems
      if (i + BATCH_SIZE < records.length) {
        await this.sleep(100);
      }
    }

    batch.status = 'completed';
    batch.executedAt = new Date();
    this.batches.set(batchId, batch);

    logger.info('Deletion batch completed', {
      batchId,
      successful: batch.progress.successful,
      failed: batch.progress.failed
    });

    this.emit('batch:completed', batch);
  }

  private async processRecordDeletion(batchId: string, record: DataRecord): Promise<void> {
    try {
      const batch = this.batches.get(batchId);
      if (!batch) return;

      // Double-check legal hold before deletion
      if (record.legalHold) {
        batch.progress.skipped++;
        batch.logs.push(`Skipped record ${record.id}: Legal hold in effect`);
        return;
      }

      // Perform deletion based on method
      switch (batch.deletionMethod) {
        case DeletionMethod.HARD_DELETE:
          await this.performHardDeletion(record);
          break;
        case DeletionMethod.SOFT_DELETE:
          await this.performSoftDeletion(record);
          break;
        case DeletionMethod.ANONYMIZE:
          await this.performAnonymization(record);
          break;
        case DeletionMethod.PSEUDONYMIZE:
          await this.performPseudonymization(record);
          break;
        case DeletionMethod.ARCHIVE:
          await this.performArchiving(record);
          break;
      }

      // Update record status
      record.status = 'deleted';
      record.deletionExecuted = new Date();
      record.deletionMethod = batch.deletionMethod;
      this.records.set(record.id, record);

      batch.progress.successful++;
      batch.logs.push(`Successfully deleted record ${record.id}`);

    } catch (error) {
      const batch = this.batches.get(batchId);
      if (batch) {
        batch.progress.failed++;
        batch.logs.push(`Failed to delete record ${record.id}: ${(error as Error).message}`);
      }
    }
  }

  private async performHardDeletion(record: DataRecord): Promise<void> {
    // Remove from all databases and storage systems
    logger.debug('Performing hard deletion', { recordId: record.id });
    
    // Implementation would include:
    // - Database deletion
    // - File system deletion
    // - Cache invalidation
    // - Search index removal
  }

  private async performSoftDeletion(record: DataRecord): Promise<void> {
    // Mark as deleted but retain for legal/compliance reasons
    logger.debug('Performing soft deletion', { recordId: record.id });
    
    // Implementation would include:
    // - Set deleted_at timestamp
    // - Mark as deleted in database
    // - Remove from active queries
    // - Retain for legal hold purposes
  }

  private async performAnonymization(record: DataRecord): Promise<void> {
    // Remove identifying information while preserving data utility
    logger.debug('Performing anonymization', { recordId: record.id });
    
    // Use dataPrivacyService for anonymization
    const anonymizedData = dataPrivacyService.anonymizeData(record.metadata, 
      dataPrivacyService.identifyPII(record.metadata)
    );
    
    record.metadata = anonymizedData;
    record.status = 'archived';
  }

  private async performPseudonymization(record: DataRecord): Promise<void> {
    // Replace identifying information with pseudonyms
    logger.debug('Performing pseudonymization', { recordId: record.id });
    
    // Implementation would include:
    // - Replace direct identifiers with pseudonyms
    // - Maintain pseudonym mapping table
    // - Update all references
  }

  private async performArchiving(record: DataRecord): Promise<void> {
    // Move to long-term, low-cost storage
    logger.debug('Performing archiving', { recordId: record.id });
    
    // Implementation would include:
    // - Transfer to archive storage
    // - Update access patterns
    // - Maintain metadata for retrieval
  }

  // Reporting and Analytics
  async generateRetentionReport(dateFrom: Date, dateTo: Date): Promise<RetentionReport> {
    const reportId = this.generateId();
    
    // Collect data for report
    const records = Array.from(this.records.values());
    const batches = Array.from(this.batches.values())
      .filter(batch => batch.executedAt && 
        batch.executedAt >= dateFrom && batch.executedAt <= dateTo);

    const report: RetentionReport = {
      id: reportId,
      generatedAt: new Date(),
      period: { from: dateFrom, to: dateTo },
      summary: this.calculateSummary(records, batches),
      byPolicy: await this.generatePolicyReports(batches),
      byCategory: this.generateCategoryReports(records),
      compliance: await this.generateComplianceReport(records, batches),
      recommendations: this.generateRecommendations(records, batches)
    };

    this.reports.set(reportId, report);
    
    logger.info('Retention report generated', {
      reportId,
      period: report.period,
      summary: report.summary
    });

    return report;
  }

  private calculateSummary(records: DataRecord[], batches: DeletionBatch[]): RetentionReport['summary'] {
    const deletedRecords = records.filter(r => r.status === 'deleted').length;
    const archivedRecords = records.filter(r => r.status === 'archived').length;
    const legalHolds = records.filter(r => r.legalHold).length;

    return {
      totalRecords: records.length,
      deletedRecords,
      archivedRecords,
      anonymizedRecords: records.filter(r => r.deletionMethod === DeletionMethod.ANONYMIZE).length,
      legalHolds,
      policyViolations: 0 // Would be calculated based on compliance checks
    };
  }

  private async generatePolicyReports(batches: DeletionBatch[]): Promise<PolicyReport[]> {
    const reports: PolicyReport[] = [];
    
    for (const [policyId, policy] of this.policies) {
      const policyBatches = batches.filter(b => b.policyId === policyId);
      
      if (policyBatches.length > 0) {
        const totalRecords = policyBatches.reduce((sum, b) => sum + b.progress.total, 0);
        const totalDeletions = policyBatches.reduce((sum, b) => sum + b.progress.successful, 0);
        const avgProcessingTime = policyBatches.reduce((sum, b) => {
          if (b.executedAt) {
            const duration = b.executedAt.getTime() - b.createdAt.getTime();
            return sum + duration;
          }
          return sum;
        }, 0) / policyBatches.length;
        
        const successRate = totalRecords > 0 ? (totalDeletions / totalRecords) * 100 : 0;

        reports.push({
          policyId,
          policyName: policy.name,
          recordsAffected: totalRecords,
          deletionsExecuted: totalDeletions,
          averageProcessingTime: avgProcessingTime,
          successRate,
          issues: [] // Would collect actual issues from batch logs
        });
      }
    }

    return reports;
  }

  private generateCategoryReports(records: DataRecord[]): CategoryReport[] {
    const reports: CategoryReport[] = [];
    
    for (const category of Object.values(DataCategory)) {
      const categoryRecords = records.filter(r => r.category === category);
      
      if (categoryRecords.length > 0) {
        const totalRecords = categoryRecords.length;
        const activeRecords = categoryRecords.filter(r => r.status === 'active').length;
        const deletedRecords = categoryRecords.filter(r => r.status === 'deleted').length;
        
        const retentionRate = (activeRecords / totalRecords) * 100;
        const deletionRate = (deletedRecords / totalRecords) * 100;
        const averageAge = categoryRecords.reduce((sum, r) => {
          return sum + (Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / totalRecords;

        reports.push({
          category,
          totalRecords,
          retentionRate,
          deletionRate,
          averageAge,
          largestDataset: 'Dataset A' // Would be determined from actual data
        });
      }
    }

    return reports;
  }

  private async generateComplianceReport(records: DataRecord[], batches: DeletionBatch[]): Promise<ComplianceReport> {
    // Calculate GDPR compliance
    const gdprCompliance = this.calculateGDPRCompliance(records);
    
    // Calculate policy adherence
    const policyAdherence = this.calculatePolicyAdherence(records);
    
    // Check legal requirements
    const legalRequirements = this.checkLegalRequirements(records);

    return {
      gdprCompliance,
      policyAdherence,
      legalRequirements
    };
  }

  private calculateGDPRCompliance(records: DataRecord[]): ComplianceReport['gdprCompliance'] {
    // Check for proper legal basis
    const recordsWithLegalBasis = records.filter(r => {
      const policy = this.policies.get(r.retentionPolicyId);
      return policy?.legalBasis;
    });

    const complianceScore = records.length > 0 ? (recordsWithLegalBasis.length / records.length) * 100 : 100;

    return {
      score: complianceScore,
      compliant: complianceScore >= 95,
      violations: complianceScore < 95 ? ['Missing legal basis for some records'] : [],
      recommendations: complianceScore < 95 ? ['Add legal basis to all retention policies'] : []
    };
  }

  private calculatePolicyAdherence(records: DataRecord[]): ComplianceReport['policyAdherence'] {
    const overdueDeletions = records.filter(r => 
      r.deletionScheduled && r.deletionScheduled < new Date() && r.status === 'active'
    ).length;

    const totalRecords = records.length;
    const violationRate = totalRecords > 0 ? (overdueDeletions / totalRecords) * 100 : 0;

    return {
      score: 100 - violationRate,
      violations: overdueDeletions,
      overdueDeletions
    };
  }

  private checkLegalRequirements(records: DataRecord[]): ComplianceReport['legalRequirements'] {
    // Check for compliance with various legal requirements
    const hasAuditTrail = records.every(r => r.metadata.auditTrail);
    const hasDeletionCapability = records.some(r => r.deletionMethod);

    return {
      met: hasAuditTrail && hasDeletionCapability,
      gaps: !hasAuditTrail ? ['Missing audit trail'] : [],
      risks: !hasDeletionCapability ? ['No deletion capability'] : []
    };
  }

  private generateRecommendations(records: DataRecord[], batches: DeletionBatch[]): string[] {
    const recommendations: string[] = [];
    
    // Check for overdue deletions
    const overdueCount = records.filter(r => 
      r.deletionScheduled && r.deletionScheduled < new Date() && r.status === 'active'
    ).length;
    
    if (overdueCount > 0) {
      recommendations.push(`Process ${overdueCount} overdue deletions`);
    }

    // Check for policy violations
    const violationRate = this.calculatePolicyAdherence(records).violations;
    if (violationRate > 0) {
      recommendations.push('Review and update retention policies');
    }

    // Check for high failure rates
    const highFailureBatches = batches.filter(b => 
      b.progress.failed > b.progress.successful
    );
    
    if (highFailureBatches.length > 0) {
      recommendations.push('Investigate high failure rate batches');
    }

    return recommendations;
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private calculateDeletionDate(record: DataRecord, policy: RetentionPolicy): Date {
    const { retentionPeriod } = policy;
    const baseDate = this.getTriggerDate(record, retentionPeriod.trigger);
    
    const multiplier = retentionPeriod.unit === 'days' ? 1 :
                      retentionPeriod.unit === 'months' ? 30 :
                      365; // years

    const duration = retentionPeriod.duration * multiplier;
    const deletionDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);

    // Apply exceptions if conditions are met
    if (policy.exceptions) {
      for (const exception of policy.exceptions) {
        if (this.evaluateCondition(record, exception.condition)) {
          if (exception.action === 'extend' && exception.newPeriod) {
            const extendMultiplier = exception.newPeriod.unit === 'days' ? 1 :
                                   exception.newPeriod.unit === 'months' ? 30 :
                                   365;
            const extendDuration = exception.newPeriod.duration * extendMultiplier;
            return new Date(deletionDate.getTime() + extendDuration * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    return deletionDate;
  }

  private getTriggerDate(record: DataRecord, trigger: RetentionPeriod['trigger']): Date {
    switch (trigger) {
      case 'creation':
        return record.createdAt;
      case 'last_access':
        return record.lastAccessedAt || record.createdAt;
      case 'account_closure':
        // Would be retrieved from user account data
        return new Date();
      case 'consent_withdrawal':
        // Would be retrieved from consent records
        return new Date();
      default:
        return record.createdAt;
    }
  }

  private evaluateCondition(record: DataRecord, condition: RetentionCondition): boolean {
    const value = record.metadata[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private groupRecordsForDeletion(records: DataRecord[]): Map<string, DataRecord[]> {
    const grouped = new Map<string, DataRecord[]>();
    
    for (const record of records) {
      const key = `${record.retentionPolicyId}:${record.deletionMethod}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }
    
    return grouped;
  }

  private async reEvaluateExistingRecords(policyId: string, policy: RetentionPolicy): Promise<void> {
    const affectedRecords = Array.from(this.records.values())
      .filter(r => r.retentionPolicyId === policyId);

    for (const record of affectedRecords) {
      record.deletionScheduled = this.calculateDeletionDate(record, policy);
      this.records.set(record.id, record);
    }

    logger.info('Re-evaluated existing records for policy update', {
      policyId,
      affectedCount: affectedRecords.length
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startRetentionScheduler(): void {
    // Check for scheduled deletions every hour
    setInterval(async () => {
      try {
        await this.executeScheduledDeletions();
      } catch (error) {
        logger.error('Error in retention scheduler', { error });
      }
    }, 60 * 60 * 1000);
  }

  private startComplianceWatcher(): void {
    // Check compliance every day
    setInterval(async () => {
      try {
        const report = await this.generateRetentionReport(
          new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          new Date()
        );
        
        // Emit compliance events for significant issues
        if (report.compliance.gdprCompliance.score < 90) {
          this.emit('compliance:warning', report);
        }
        
        if (report.compliance.policyAdherence.overdueDeletions > 100) {
          this.emit('compliance:critical', report);
        }
      } catch (error) {
        logger.error('Error in compliance watcher', { error });
      }
    }, 24 * 60 * 60 * 1000);
  }

  private initializeDefaultPolicies(): void {
    // Initialize default retention policies for different data types
    const defaultPolicies: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'version'>[] = [
      {
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
      },
      {
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
      },
      {
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
      }
    ];

    for (const policy of defaultPolicies) {
      this.createRetentionPolicy(policy);
    }
  }

  // Getters for external access
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  getRecords(filters?: { dataType?: string; category?: DataCategory; status?: string }): DataRecord[] {
    let records = Array.from(this.records.values());
    
    if (filters?.dataType) {
      records = records.filter(r => r.dataType === filters.dataType);
    }
    
    if (filters?.category) {
      records = records.filter(r => r.category === filters.category);
    }
    
    if (filters?.status) {
      records = records.filter(r => r.status === filters.status);
    }
    
    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getBatches(filters?: { status?: string; policyId?: string }): DeletionBatch[] {
    let batches = Array.from(this.batches.values());
    
    if (filters?.status) {
      batches = batches.filter(b => b.status === filters.status);
    }
    
    if (filters?.policyId) {
      batches = batches.filter(b => b.policyId === filters.policyId);
    }
    
    return batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getReports(): RetentionReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  getLegalHolds(): Map<string, { reason: string; startDate: Date; endDate?: Date }> {
    return new Map(this.legalHolds);
  }
}

export const dataRetentionService = new DataRetentionService();