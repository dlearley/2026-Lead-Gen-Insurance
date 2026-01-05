/**
 * Phase 25.1E: Compliance Violation Detection Engine
 *
 * Automatically detects compliance violations based on audit events
 * and predefined policies.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  ImmutableAuditLog,
  ComplianceViolation,
  ViolationData,
} from '@insurance-lead-gen/types';

export class ComplianceViolationDetectorService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Detect violations in an audit log entry
   */
  async detectViolations(auditLog: ImmutableAuditLog): Promise<ComplianceViolation[]> {
    const violations: ViolationData[] = [];

    // Check for unauthorized access
    if (auditLog.action === 'Read' && auditLog.complianceStatus === 'Violation') {
      violations.push({
        violationId: `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        auditLogId: auditLog.id,
        violationType: 'UnauthorizedAccess',
        severityLevel: auditLog.riskLevel === 'Critical' ? 'Critical' : 'High',
        policy: 'Data Access Policy',
        jurisdiction: 'GDPR',
        occurredDate: auditLog.timestamp,
        detectedBy: 'System',
        affectedEntities: 1,
        affectedFields: ['PII'],
        riskAssessment: auditLog.riskLevel,
        owner: 'compliance-officer@example.com',
      });
    }

    // Check for bulk data export
    if (auditLog.action === 'Export' && auditLog.resourceType === 'Lead') {
      const recentExports = await this.prisma.immutableAuditLog.count({
        where: {
          actorId: auditLog.actorId,
          action: 'Export',
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      if (recentExports > 100) {
        violations.push({
          violationId: `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          auditLogId: auditLog.id,
          violationType: 'DataBreach',
          severityLevel: 'Critical',
          policy: 'Data Export Policy',
          jurisdiction: 'CCPA',
          occurredDate: auditLog.timestamp,
          detectedBy: 'System',
          affectedEntities: recentExports,
          affectedFields: ['PII', 'FinancialData'],
          riskAssessment: 'Critical',
          owner: 'security-team@example.com',
        });
      }
    }

    // Check for after-hours administrative actions
    const hour = auditLog.timestamp.getHours();
    if (
      (hour < 6 || hour > 22) &&
      auditLog.actorType === 'User' &&
      ['Delete', 'Update'].includes(auditLog.action)
    ) {
      violations.push({
        violationId: `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        auditLogId: auditLog.id,
        violationType: 'PolicyViolation',
        severityLevel: 'Medium',
        policy: 'Administrative Hours Policy',
        jurisdiction: 'Internal',
        occurredDate: auditLog.timestamp,
        detectedBy: 'System',
        affectedEntities: 1,
        affectedFields: [],
        riskAssessment: 'Medium',
        owner: 'compliance-officer@example.com',
      });
    }

    // Store detected violations
    const storedViolations: ComplianceViolation[] = [];
    for (const violation of violations) {
      const stored = await this.logViolation(violation);
      storedViolations.push(stored);
    }

    return storedViolations;
  }

  /**
   * Log a violation to the database
   */
  async logViolation(violation: ViolationData): Promise<ComplianceViolation> {
    return this.prisma.complianceViolationLog.create({
      data: {
        violationId: violation.violationId,
        auditLogId: violation.auditLogId,
        violationType: violation.violationType,
        severityLevel: violation.severityLevel,
        policy: violation.policy,
        jurisdiction: violation.jurisdiction,
        regulation: violation.regulation,
        occurredDate: violation.occurredDate,
        detectedBy: violation.detectedBy,
        affectedEntities: violation.affectedEntities,
        affectedFields: violation.affectedFields,
        riskAssessment: violation.riskAssessment,
        status: 'Detected',
        owner: violation.owner,
        notes: violation.notes,
      },
    });
  }

  /**
   * Evaluate action against policies
   */
  async evaluateAgainstPolicies(auditLog: ImmutableAuditLog): Promise<
    Array<{
      policyName: string;
      violated: boolean;
      severity: string;
      reason: string;
    }>
  > {
    const results: Array<{
      policyName: string;
      violated: boolean;
      severity: string;
      reason: string;
    }> = [];

    // Policy 1: Data Minimization
    if (auditLog.action === 'Read' && auditLog.resourceType === 'Lead') {
      const frequentAccess = await this.prisma.immutableAuditLog.count({
        where: {
          actorId: auditLog.actorId,
          resourceId: auditLog.resourceId,
          action: 'Read',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (frequentAccess > 10) {
        results.push({
          policyName: 'Data Minimization Policy',
          violated: true,
          severity: 'Low',
          reason: `User accessed same resource ${frequentAccess} times in 24 hours`,
        });
      }
    }

    // Policy 2: Segregation of Duties
    if (auditLog.action === 'Approve' && auditLog.resourceType === 'Policy') {
      // Check if the approver was also the creator
      const creationLog = await this.prisma.immutableAuditLog.findFirst({
        where: {
          resourceId: auditLog.resourceId,
          action: 'Create',
        },
      });

      if (creationLog && creationLog.actorId === auditLog.actorId) {
        results.push({
          policyName: 'Segregation of Duties',
          violated: true,
          severity: 'High',
          reason: 'User cannot approve their own creation',
        });
      }
    }

    // Policy 3: Data Retention
    // This would be checked in a scheduled job

    return results;
  }

  /**
   * Calculate risk score for an action
   */
  async calculateRiskScore(auditLog: ImmutableAuditLog): Promise<number> {
    let riskScore = 0;

    // Base score by action type
    const actionScores: Record<string, number> = {
      Read: 1,
      Create: 2,
      Update: 3,
      Delete: 5,
      Export: 8,
      Download: 8,
    };
    riskScore += actionScores[auditLog.action] || 0;

    // Increase for sensitive resources
    if (auditLog.resourceType === 'Lead' || auditLog.resourceType === 'Document') {
      riskScore += 5;
    }

    // Increase for after-hours
    const hour = auditLog.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 10;
    }

    // Increase for high-volume activity
    const recentActivity = await this.prisma.immutableAuditLog.count({
      where: {
        actorId: auditLog.actorId,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (recentActivity > 100) {
      riskScore += 20;
    }

    // Increase for failures
    if (!auditLog.success) {
      riskScore += 5;
    }

    // Normalize to 0-100
    return Math.min(riskScore, 100);
  }

  /**
   * Flag action for manual review
   */
  async flagForReview(auditLog: ImmutableAuditLog, reason: string): Promise<void> {
    logger.warn('Action flagged for compliance review', {
      auditLogId: auditLog.id,
      actorId: auditLog.actorId,
      resourceId: auditLog.resourceId,
      reason,
    });

    // Create a compliance event for review
    await this.prisma.complianceEvent.create({
      data: {
        eventId: `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'AuditInitiated',
        jurisdiction: 'Internal',
        description: reason,
        entityType: auditLog.resourceType,
        entityId: auditLog.resourceId,
        status: 'Initiated',
        initiatedDate: new Date(),
        relatedAuditLogs: [auditLog.id],
        assignedTo: 'compliance-officer@example.com',
      },
    });
  }
}
