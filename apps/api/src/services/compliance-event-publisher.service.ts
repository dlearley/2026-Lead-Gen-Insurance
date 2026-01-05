/**
 * Phase 25.1E: Compliance Event Publisher Service
 * 
 * Publishes compliance events to message broker for real-time notifications
 * and downstream processing.
 */

import { NATSConnection } from '../nats.js';
import { logger } from '@insurance-lead-gen/core';
import type { ComplianceEvent, ComplianceViolation } from '@insurance-lead-gen/types';

export const COMPLIANCE_EVENT_TOPICS = {
  VIOLATION_DETECTED: 'compliance.violation.detected',
  POLICY_VIOLATED: 'compliance.policy.violated',
  BREACH_DETECTED: 'compliance.breach.detected',
  REMEDIATION_STARTED: 'compliance.remediation.started',
  REMEDIATION_COMPLETED: 'compliance.remediation.completed',
  AUDIT_REQUIRED: 'compliance.audit.required',
  CERTIFICATION_EXPIRING: 'compliance.certification.expiring',
  SUSPICIOUS_ACTIVITY: 'compliance.suspicious.activity',
  DATA_ACCESS_ALERT: 'compliance.data.access.alert',
} as const;

export class ComplianceEventPublisherService {
  constructor(private readonly natsConnection: NATSConnection) {}

  /**
   * Publish violation detected event
   */
  async publishViolationDetected(violation: ComplianceViolation): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.VIOLATION_DETECTED, {
        violationId: violation.violationId,
        violationType: violation.violationType,
        severityLevel: violation.severityLevel,
        policy: violation.policy,
        jurisdiction: violation.jurisdiction,
        detectedBy: violation.detectedBy,
        affectedEntities: violation.affectedEntities,
        timestamp: new Date().toISOString(),
      });

      logger.info('Published violation detected event', {
        violationId: violation.violationId,
        violationType: violation.violationType,
      });
    } catch (error) {
      logger.error('Failed to publish violation detected event', { error, violation });
    }
  }

  /**
   * Publish policy violation event
   */
  async publishPolicyViolated(violation: ComplianceViolation): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.POLICY_VIOLATED, {
        violationId: violation.violationId,
        policy: violation.policy,
        severityLevel: violation.severityLevel,
        status: violation.status,
        owner: violation.owner,
        timestamp: new Date().toISOString(),
      });

      logger.info('Published policy violated event', {
        violationId: violation.violationId,
        policy: violation.policy,
      });
    } catch (error) {
      logger.error('Failed to publish policy violated event', { error, violation });
    }
  }

  /**
   * Publish data breach detected event
   */
  async publishBreachDetected(details: {
    violationId: string;
    affectedEntities: number;
    affectedFields: string[];
    detectedBy: string;
    severity: string;
  }): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.BREACH_DETECTED, {
        ...details,
        timestamp: new Date().toISOString(),
        requiresImmediateAction: true,
      });

      logger.warn('Published data breach detected event', {
        violationId: details.violationId,
        affectedEntities: details.affectedEntities,
      });
    } catch (error) {
      logger.error('Failed to publish breach detected event', { error, details });
    }
  }

  /**
   * Publish remediation started event
   */
  async publishRemediationStarted(violationId: string, plan: string): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.REMEDIATION_STARTED, {
        violationId,
        plan,
        startedAt: new Date().toISOString(),
      });

      logger.info('Published remediation started event', { violationId });
    } catch (error) {
      logger.error('Failed to publish remediation started event', { error, violationId });
    }
  }

  /**
   * Publish remediation completed event
   */
  async publishRemediationCompleted(
    violationId: string,
    details: string
  ): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.REMEDIATION_COMPLETED, {
        violationId,
        details,
        completedAt: new Date().toISOString(),
      });

      logger.info('Published remediation completed event', { violationId });
    } catch (error) {
      logger.error('Failed to publish remediation completed event', {
        error,
        violationId,
      });
    }
  }

  /**
   * Publish audit required event
   */
  async publishAuditRequired(details: {
    reason: string;
    entityType: string;
    entityId: string;
    priority: string;
  }): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.AUDIT_REQUIRED, {
        ...details,
        timestamp: new Date().toISOString(),
      });

      logger.info('Published audit required event', details);
    } catch (error) {
      logger.error('Failed to publish audit required event', { error, details });
    }
  }

  /**
   * Publish certification expiring event
   */
  async publishCertificationExpiring(details: {
    certificationId: string;
    certificationName: string;
    expiryDate: Date;
    daysUntilExpiry: number;
  }): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.CERTIFICATION_EXPIRING, {
        ...details,
        timestamp: new Date().toISOString(),
      });

      logger.info('Published certification expiring event', {
        certificationName: details.certificationName,
        daysUntilExpiry: details.daysUntilExpiry,
      });
    } catch (error) {
      logger.error('Failed to publish certification expiring event', { error, details });
    }
  }

  /**
   * Publish suspicious activity detected event
   */
  async publishSuspiciousActivity(details: {
    userId: string;
    activityType: string;
    description: string;
    riskLevel: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.SUSPICIOUS_ACTIVITY, {
        ...details,
        timestamp: details.timestamp.toISOString(),
        requiresReview: true,
      });

      logger.warn('Published suspicious activity event', {
        userId: details.userId,
        activityType: details.activityType,
        riskLevel: details.riskLevel,
      });
    } catch (error) {
      logger.error('Failed to publish suspicious activity event', { error, details });
    }
  }

  /**
   * Publish data access alert event
   */
  async publishDataAccessAlert(details: {
    userId: string;
    resourceId: string;
    dataType: string;
    reason: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await this.natsConnection.publish(COMPLIANCE_EVENT_TOPICS.DATA_ACCESS_ALERT, {
        ...details,
        timestamp: details.timestamp.toISOString(),
      });

      logger.info('Published data access alert event', {
        userId: details.userId,
        dataType: details.dataType,
      });
    } catch (error) {
      logger.error('Failed to publish data access alert event', { error, details });
    }
  }

  /**
   * Publish general compliance event
   */
  async publishComplianceEvent(
    topic: string,
    event: ComplianceEvent
  ): Promise<void> {
    try {
      await this.natsConnection.publish(topic, {
        eventId: event.eventId,
        eventType: event.eventType,
        jurisdiction: event.jurisdiction,
        entityType: event.entityType,
        entityId: event.entityId,
        status: event.status,
        timestamp: new Date().toISOString(),
      });

      logger.info('Published compliance event', {
        topic,
        eventType: event.eventType,
      });
    } catch (error) {
      logger.error('Failed to publish compliance event', { error, topic, event });
    }
  }
}
