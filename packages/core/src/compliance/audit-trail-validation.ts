// Audit trail validation and integrity checking module
import {
  ComplianceDomain,
  ComplianceStatus,
  ComplianceSeverity,
  AuditTrailEntry,
  EvidenceRecord,
} from './types.js';
import { logger } from '../logger.js';

export class AuditTrailValidationService {
  private auditEntries: AuditTrailEntry[] = [];
  private validationRules: Map<string, any> = new Map();
  private integrityChecks: Map<string, any> = new Map();

  constructor() {
    this.initializeValidationRules();
    this.initializeSampleAuditTrail();
  }

  private initializeValidationRules(): void {
    const rules = [
      {
        id: 'RULE-001',
        name: 'Required Fields Validation',
        description: 'Ensure all required fields are present in audit entries',
        severity: ComplianceSeverity.HIGH,
        check: (entry: AuditTrailEntry) => {
          const requiredFields = ['id', 'eventType', 'userId', 'action', 'timestamp', 'success'];
          return requiredFields.every(field => entry[field as keyof AuditTrailEntry] !== undefined);
        },
      },
      {
        id: 'RULE-002',
        name: 'Timestamp Validity',
        description: 'Ensure timestamps are valid and within acceptable range',
        severity: ComplianceSeverity.MEDIUM,
        check: (entry: AuditTrailEntry) => {
          const now = new Date();
          const timestamp = new Date(entry.timestamp);
          const maxAge = 2555 * 24 * 60 * 60 * 1000; // 7 years in milliseconds
          return timestamp <= now && (now.getTime() - timestamp.getTime()) <= maxAge;
        },
      },
      {
        id: 'RULE-003',
        name: 'User Authentication Consistency',
        description: 'Ensure user authentication events are consistent',
        severity: ComplianceSeverity.MEDIUM,
        check: (entry: AuditTrailEntry) => {
          if (entry.eventType === 'authentication') {
            return entry.userId && entry.userName && entry.ipAddress;
          }
          return true;
        },
      },
      {
        id: 'RULE-004',
        name: 'Data Access Authorization',
        description: 'Ensure data access events have proper authorization',
        severity: ComplianceSeverity.HIGH,
        check: (entry: AuditTrailEntry) => {
          if (entry.eventType === 'data_access') {
            return entry.userId && entry.resource && entry.action;
          }
          return true;
        },
      },
      {
        id: 'RULE-005',
        name: 'Critical Action Logging',
        description: 'Ensure critical actions are properly logged',
        severity: ComplianceSeverity.CRITICAL,
        check: (entry: AuditTrailEntry) => {
          const criticalActions = ['delete', 'admin', 'system', 'config', 'security'];
          const isCritical = criticalActions.some(action => 
            entry.action.toLowerCase().includes(action) || 
            entry.resource?.toLowerCase().includes(action)
          );
          return !isCritical || (entry.details && entry.details.ipAddress);
        },
      },
    ];

    for (const rule of rules) {
      this.validationRules.set(rule.id, rule);
    }
  }

  private initializeSampleAuditTrail(): void {
    // Generate sample audit trail entries with realistic data
    const now = new Date();
    const eventTypes = ['authentication', 'data_access', 'data_modification', 'admin_action', 'system_event'];
    const actions = ['login', 'logout', 'view_lead', 'create_lead', 'update_lead', 'delete_lead', 'admin_panel', 'config_change'];
    const resources = ['leads', 'users', 'policies', 'claims', 'system', 'reports'];
    const users = Array.from({ length: 50 }, (_, i) => ({
      id: `user-${(i % 20) + 1}`,
      name: `User ${(i % 20) + 1}`,
    }));

    for (let i = 0; i < 2000; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      const timestamp = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Within last year
      const success = Math.random() > 0.1; // 90% success rate

      // Add some integrity issues for testing
      const hasIssues = Math.random() < 0.05; // 5% have issues
      let entry = {
        id: `audit-${i.toString().padStart(6, '0')}`,
        eventType,
        userId: user.id,
        userName: user.name,
        action,
        resource,
        resourceId: resource !== 'system' ? `${resource.slice(0, -1)}-${i}` : undefined,
        timestamp,
        ipAddress: `192.168.1.${(i % 255) + 1}`,
        userAgent: 'Mozilla/5.0 (compatible; AuditSystem/1.0)',
        success,
        details: hasIssues ? { testIssue: Math.random() > 0.5 } : { requestId: `req-${i}` },
      };

      // Introduce specific issues for testing
      if (hasIssues && Math.random() > 0.5) {
        delete entry.ipAddress; // Missing required field
      }

      this.auditEntries.push(entry);
    }
  }

  async validateAuditTrailCompleteness(): Promise<{
    compliant: boolean;
    score: number;
    statistics: any;
    gaps: any[];
    recommendations: string[];
  }> {
    logger.info('Validating audit trail completeness');

    const totalEntries = this.auditEntries.length;
    const completeEntries = this.auditEntries.filter(entry => {
      return this.validationRules.get('RULE-001').check(entry);
    }).length;

    const completenessScore = totalEntries > 0 ? (completeEntries / totalEntries) * 100 : 100;

    // Check for specific completeness issues
    const missingFields: any[] = [];
    const fieldCounts = new Map<string, number>();

    for (const entry of this.auditEntries) {
      const fields = Object.keys(entry);
      for (const field of fields) {
        fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
      }
    }

    // Identify missing fields
    const requiredFields = ['id', 'eventType', 'userId', 'action', 'timestamp', 'success'];
    for (const field of requiredFields) {
      const count = fieldCounts.get(field) || 0;
      if (count < totalEntries) {
        missingFields.push({
          field,
          missing: totalEntries - count,
          percentage: ((totalEntries - count) / totalEntries) * 100,
        });
      }
    }

    const gaps: any[] = [];
    for (const missing of missingFields) {
      if (missing.percentage > 0) {
        gaps.push({
          type: 'missing_field',
          field: missing.field,
          count: missing.missing,
          severity: missing.percentage > 5 ? ComplianceSeverity.HIGH : ComplianceSeverity.MEDIUM,
          description: `${missing.missing} entries missing required field: ${missing.field}`,
        });
      }
    }

    const compliant = completenessScore >= 95 && gaps.length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Address all audit trail completeness gaps immediately');
      recommendations.push('Implement automated validation for audit trail entries');
      recommendations.push('Review and fix data collection processes');
    } else {
      recommendations.push('Continue monitoring audit trail completeness');
      recommendations.push('Implement regular completeness audits');
    }

    const statistics = {
      totalEntries,
      completeEntries,
      completenessScore: Math.round(completenessScore * 100) / 100,
      missingFields,
      gaps: gaps.length,
    };

    return {
      compliant,
      score: completenessScore,
      statistics,
      gaps,
      recommendations,
    };
  }

  async validateAuditTrailIntegrity(): Promise<{
    compliant: boolean;
    score: number;
    integrityStats: any;
    violations: any[];
    recommendations: string[];
  }> {
    logger.info('Validating audit trail integrity');

    const violations: any[] = [];
    let passedChecks = 0;
    let totalChecks = 0;

    // Run validation rules
    for (const [ruleId, rule] of this.validationRules.entries()) {
      totalChecks++;
      
      for (const entry of this.auditEntries) {
        if (rule.check(entry)) {
          passedChecks++;
        } else {
          violations.push({
            ruleId,
            ruleName: rule.name,
            entryId: entry.id,
            severity: rule.severity,
            description: rule.description,
            entryDetails: {
              eventType: entry.eventType,
              userId: entry.userId,
              action: entry.action,
              timestamp: entry.timestamp,
            },
          });
        }
      }
    }

    const integrityScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    // Additional integrity checks
    const chronologicalOrder = this.validateChronologicalOrder();
    const duplicateDetection = this.detectDuplicates();
    const dataConsistency = this.validateDataConsistency();

    const additionalChecks = [
      { name: 'Chronological Order', ...chronologicalOrder },
      { name: 'Duplicate Detection', ...duplicateDetection },
      { name: 'Data Consistency', ...dataConsistency },
    ];

    // Add violations from additional checks
    for (const check of additionalChecks) {
      if (!check.passed) {
        violations.push({
          type: check.name.toLowerCase().replace(/\s+/g, '_'),
          severity: ComplianceSeverity.MEDIUM,
          description: check.description,
          count: check.violations.length,
        });
      }
    }

    const compliant = integrityScore >= 90 && violations.filter(v => v.severity === ComplianceSeverity.CRITICAL).length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Address all critical audit trail integrity violations immediately');
      recommendations.push('Implement integrity validation checks in real-time');
      recommendations.push('Review and fix data collection and storage processes');
    } else {
      recommendations.push('Continue monitoring audit trail integrity');
      recommendations.push('Implement quarterly integrity audits');
    }

    const integrityStats = {
      totalEntries: this.auditEntries.length,
      totalChecks,
      passedChecks,
      integrityScore: Math.round(integrityScore * 100) / 100,
      criticalViolations: violations.filter(v => v.severity === ComplianceSeverity.CRITICAL).length,
      highViolations: violations.filter(v => v.severity === ComplianceSeverity.HIGH).length,
      mediumViolations: violations.filter(v => v.severity === ComplianceSeverity.MEDIUM).length,
      totalViolations: violations.length,
      additionalChecks,
    };

    return {
      compliant,
      score: integrityScore,
      integrityStats,
      violations,
      recommendations,
    };
  }

  private validateChronologicalOrder(): {
    passed: boolean;
    violations: any[];
    description: string;
  } {
    const sortedEntries = [...this.auditEntries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const violations: any[] = [];

    for (let i = 1; i < sortedEntries.length; i++) {
      const prev = sortedEntries[i - 1];
      const curr = sortedEntries[i];
      
      if (curr.timestamp < prev.timestamp) {
        violations.push({
          entryId: curr.id,
          timestamp: curr.timestamp,
          previousTimestamp: prev.timestamp,
        });
      }
    }

    const passed = violations.length === 0;
    
    return {
      passed,
      violations,
      description: passed ? 'All entries are in chronological order' : `${violations.length} entries are not in chronological order`,
    };
  }

  private detectDuplicates(): {
    passed: boolean;
    violations: any[];
    description: string;
  } {
    const duplicateGroups = new Map<string, AuditTrailEntry[]>();
    
    for (const entry of this.auditEntries) {
      const key = `${entry.userId}-${entry.action}-${entry.resource}-${entry.timestamp.getTime()}`;
      const group = duplicateGroups.get(key) || [];
      group.push(entry);
      duplicateGroups.set(key, group);
    }

    const duplicates: AuditTrailEntry[] = [];
    for (const group of duplicateGroups.values()) {
      if (group.length > 1) {
        duplicates.push(...group);
      }
    }

    const passed = duplicates.length === 0;
    
    return {
      passed,
      violations: duplicates,
      description: passed ? 'No duplicate audit entries found' : `${duplicates.length} duplicate entries detected`,
    };
  }

  private validateDataConsistency(): {
    passed: boolean;
    violations: any[];
    description: string;
  } {
    const violations: any[] = [];

    // Check for inconsistent data patterns
    for (const entry of this.auditEntries) {
      // Check IP address format
      if (entry.ipAddress && !/^192\.168\.\d+\.\d+$/.test(entry.ipAddress)) {
        violations.push({
          entryId: entry.id,
          type: 'invalid_ip_format',
          value: entry.ipAddress,
        });
      }

      // Check user ID format
      if (entry.userId && !/^user-\d+$/.test(entry.userId)) {
        violations.push({
          entryId: entry.id,
          type: 'invalid_user_id_format',
          value: entry.userId,
        });
      }

      // Check timestamp is not in the future
      if (entry.timestamp > new Date()) {
        violations.push({
          entryId: entry.id,
          type: 'future_timestamp',
          timestamp: entry.timestamp,
        });
      }
    }

    const passed = violations.length === 0;
    
    return {
      passed,
      violations,
      description: passed ? 'All data is consistent' : `${violations.length} data consistency violations found`,
    };
  }

  async validateRetentionCompliance(): Promise<{
    compliant: boolean;
    score: number;
    retentionStats: any;
    violations: any[];
    recommendations: string[];
  }> {
    logger.info('Validating audit trail retention compliance');

    const now = new Date();
    const retentionPeriod = 2555; // 7 years in days
    const retentionPeriodMs = retentionPeriod * 24 * 60 * 60 * 1000;

    // Categorize entries by age
    const categories = {
      current: 0, // 0-1 year
      recent: 0, // 1-3 years
      aging: 0, // 3-5 years
      old: 0, // 5-7 years
      expired: 0, // >7 years
    };

    const expiredEntries: AuditTrailEntry[] = [];
    const retentionViolations: any[] = [];

    for (const entry of this.auditEntries) {
      const ageInDays = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays <= 365) {
        categories.current++;
      } else if (ageInDays <= 1095) {
        categories.recent++;
      } else if (ageInDays <= 1825) {
        categories.aging++;
      } else if (ageInDays <= 2555) {
        categories.old++;
      } else {
        categories.expired++;
        expiredEntries.push(entry);
      }
    }

    // Check for retention policy violations
    if (expiredEntries.length > 0) {
      retentionViolations.push({
        type: 'expired_records',
        count: expiredEntries.length,
        severity: ComplianceSeverity.HIGH,
        description: `${expiredEntries.length} audit records exceed retention period`,
        impact: 'Regulatory compliance violation',
      });
    }

    // Check for records that should be archived but aren't
    const shouldArchive = categories.old + categories.expired;
    if (shouldArchive > 0) {
      retentionViolations.push({
        type: 'missing_archival',
        count: shouldArchive,
        severity: ComplianceSeverity.MEDIUM,
        description: `${shouldArchive} old records should be in archival storage`,
        impact: 'Storage and compliance management',
      });
    }

    const retentionScore = categories.expired === 0 ? 100 : Math.max(0, 100 - (categories.expired / this.auditEntries.length) * 100);
    const compliant = retentionScore >= 95 && retentionViolations.length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Immediately address expired audit trail records');
      recommendations.push('Implement automated retention policy enforcement');
      recommendations.push('Establish archival procedures for old records');
    } else {
      recommendations.push('Continue monitoring retention compliance');
      recommendations.push('Implement regular retention audits');
    }

    const retentionStats = {
      totalEntries: this.auditEntries.length,
      categories,
      expiredCount: categories.expired,
      retentionScore: Math.round(retentionScore * 100) / 100,
      retentionPeriod: `${retentionPeriod} days (${Math.round(retentionPeriod / 365 * 10) / 10} years)`,
    };

    return {
      compliant,
      score: retentionScore,
      retentionStats,
      violations: retentionViolations,
      recommendations,
    };
  }

  async validateEventLoggingRequirements(): Promise<{
    compliant: boolean;
    score: number;
    eventStats: any;
    missingEvents: any[];
    recommendations: string[];
  }> {
    logger.info('Validating event logging requirements');

    // Define required event types for insurance industry
    const requiredEventTypes = [
      'authentication',
      'authorization_failure',
      'data_access',
      'data_modification',
      'data_deletion',
      'admin_action',
      'security_event',
      'privacy_event',
      'system_configuration',
      'backup_operation',
    ];

    // Count occurrences of each event type
    const eventCounts = new Map<string, number>();
    for (const eventType of requiredEventTypes) {
      eventCounts.set(eventType, 0);
    }

    for (const entry of this.auditEntries) {
      const count = eventCounts.get(entry.eventType) || 0;
      eventCounts.set(entry.eventType, count + 1);
    }

    // Check for missing critical events
    const criticalEvents = ['authentication', 'data_access', 'data_modification', 'admin_action'];
    const missingEvents: any[] = [];

    for (const eventType of criticalEvents) {
      const count = eventCounts.get(eventType) || 0;
      if (count === 0) {
        missingEvents.push({
          eventType,
          severity: ComplianceSeverity.CRITICAL,
          description: `No ${eventType} events logged in audit trail`,
          impact: 'Cannot trace critical activities',
        });
      } else if (count < 10) {
        missingEvents.push({
          eventType,
          severity: ComplianceSeverity.MEDIUM,
          description: `Very few ${eventType} events logged (${count})`,
          impact: 'Insufficient audit coverage',
        });
      }
    }

    // Calculate event logging score
    const totalRequiredEvents = requiredEventTypes.length;
    const loggedEvents = requiredEventTypes.filter(eventType => (eventCounts.get(eventType) || 0) > 0).length;
    const eventScore = (loggedEvents / totalRequiredEvents) * 100;

    const compliant = eventScore >= 90 && missingEvents.filter(m => m.severity === ComplianceSeverity.CRITICAL).length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Implement logging for all required event types');
      recommendations.push('Enhance audit trail coverage for critical events');
      recommendations.push('Review event logging configuration');
    } else {
      recommendations.push('Continue comprehensive event logging');
      recommendations.push('Monitor event logging completeness');
    }

    const eventStats = {
      totalEntries: this.auditEntries.length,
      requiredEventTypes: totalRequiredEvents,
      loggedEventTypes: loggedEvents,
      eventScore: Math.round(eventScore * 100) / 100,
      eventCounts: Object.fromEntries(eventCounts),
      missingEvents: missingEvents.length,
    };

    return {
      compliant,
      score: eventScore,
      eventStats,
      missingEvents,
      recommendations,
    };
  }

  async generateAuditTrailValidationReport(): Promise<{
    summary: any;
    completeness: any;
    integrity: any;
    retention: any;
    eventLogging: any;
    overallScore: number;
    recommendations: string[];
  }> {
    const [completeness, integrity, retention, eventLogging] = await Promise.all([
      this.validateAuditTrailCompleteness(),
      this.validateAuditTrailIntegrity(),
      this.validateRetentionCompliance(),
      this.validateEventLoggingRequirements(),
    ]);

    // Calculate overall score
    const scores = [completeness.score, integrity.score, retention.score, eventLogging.score];
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const summary = {
      compliant: completeness.compliant && integrity.compliant && retention.compliant && eventLogging.compliant,
      score: Math.round(overallScore * 100) / 100,
      totalEntries: this.auditEntries.length,
      criticalIssues: 
        completeness.gaps.filter(g => g.severity === ComplianceSeverity.CRITICAL).length +
        integrity.violations.filter(v => v.severity === ComplianceSeverity.CRITICAL).length +
        retention.violations.filter(v => v.severity === ComplianceSeverity.CRITICAL).length +
        eventLogging.missingEvents.filter(m => m.severity === ComplianceSeverity.CRITICAL).length,
      highIssues: 
        completeness.gaps.filter(g => g.severity === ComplianceSeverity.HIGH).length +
        integrity.violations.filter(v => v.severity === ComplianceSeverity.HIGH).length +
        retention.violations.filter(v => v.severity === ComplianceSeverity.HIGH).length +
        eventLogging.missingEvents.filter(m => m.severity === ComplianceSeverity.HIGH).length,
    };

    const allRecommendations: string[] = [];
    allRecommendations.push(...completeness.recommendations);
    allRecommendations.push(...integrity.recommendations);
    allRecommendations.push(...retention.recommendations);
    allRecommendations.push(...eventLogging.recommendations);

    // Remove duplicates
    const recommendations = [...new Set(allRecommendations)];

    return {
      summary,
      completeness,
      integrity,
      retention,
      eventLogging,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendations,
    };
  }

  // Utility methods
  getAuditEntries(from?: Date, to?: Date, eventType?: string): AuditTrailEntry[] {
    return this.auditEntries.filter(entry => {
      if (from && entry.timestamp < from) return false;
      if (to && entry.timestamp > to) return false;
      if (eventType && entry.eventType !== eventType) return false;
      return true;
    });
  }

  getValidationRules(): any[] {
    return Array.from(this.validationRules.values());
  }

  addAuditEntry(entry: AuditTrailEntry): void {
    this.auditEntries.push(entry);
  }

  updateValidationRule(ruleId: string, rule: any): void {
    this.validationRules.set(ruleId, rule);
  }
}

export const auditTrailValidationService = new AuditTrailValidationService();