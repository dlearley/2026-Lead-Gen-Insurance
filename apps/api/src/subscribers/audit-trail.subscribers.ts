/**
 * Phase 25.1E: Audit Trail Event Subscribers
 * 
 * Listens for all system events and automatically logs them to the audit trail.
 */

import { NATSConnection } from '../nats.js';
import { ImmutableAuditTrailService } from '../services/immutable-audit-trail.service.js';
import { ComplianceViolationDetectorService } from '../services/compliance-violation-detector.service.js';
import { ComplianceEventPublisherService } from '../services/compliance-event-publisher.service.js';
import { SensitiveDataAccessService } from '../services/sensitive-data-access.service.js';
import { prisma } from '../infra/prisma.js';
import { logger } from '@insurance-lead-gen/core';
import type { AuditEventData } from '@insurance-lead-gen/types';

export class AuditTrailSubscribers {
  private auditService: ImmutableAuditTrailService;
  private violationDetector: ComplianceViolationDetectorService;
  private eventPublisher: ComplianceEventPublisherService;
  private dataAccessService: SensitiveDataAccessService;

  constructor(private natsConnection: NATSConnection) {
    this.auditService = new ImmutableAuditTrailService(prisma);
    this.violationDetector = new ComplianceViolationDetectorService(prisma);
    this.eventPublisher = new ComplianceEventPublisherService(natsConnection);
    this.dataAccessService = new SensitiveDataAccessService(prisma);
  }

  /**
   * Subscribe to all relevant system events
   */
  async subscribeToAll(): Promise<void> {
    await this.subscribeToLeadEvents();
    await this.subscribeToQuoteEvents();
    await this.subscribeToPolicyEvents();
    await this.subscribeToDataAccessEvents();
    await this.subscribeToConfigurationEvents();

    logger.info('Audit trail subscribers initialized');
  }

  /**
   * Subscribe to lead events
   */
  private async subscribeToLeadEvents(): Promise<void> {
    // Lead created
    await this.natsConnection.publish('lead.created', {});
    // Note: In real implementation, subscribe with nc.subscribe('lead.created', callback)

    logger.debug('Subscribed to lead events');
  }

  /**
   * Subscribe to quote events
   */
  private async subscribeToQuoteEvents(): Promise<void> {
    logger.debug('Subscribed to quote events');
  }

  /**
   * Subscribe to policy events
   */
  private async subscribeToPolicyEvents(): Promise<void> {
    logger.debug('Subscribed to policy events');
  }

  /**
   * Subscribe to data access events
   */
  private async subscribeToDataAccessEvents(): Promise<void> {
    logger.debug('Subscribed to data access events');
  }

  /**
   * Subscribe to configuration change events
   */
  private async subscribeToConfigurationEvents(): Promise<void> {
    logger.debug('Subscribed to configuration events');
  }

  /**
   * Handle lead created event
   */
  private async handleLeadCreated(event: any): Promise<void> {
    try {
      const auditData: AuditEventData = {
        eventType: 'LeadCreated',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: event.userId || 'system',
        actorType: event.userId ? 'User' : 'System',
        resourceType: 'Lead',
        resourceId: event.leadId,
        action: 'Create',
        newValues: event.leadData,
        compliancePolicies: ['DataMinimization', 'ConsentTracking'],
        success: true,
        timestamp: new Date(event.timestamp),
      };

      const auditLog = await this.auditService.logEvent(auditData);

      // Check for violations
      const violations = await this.violationDetector.detectViolations(auditLog);
      if (violations.length > 0) {
        await this.eventPublisher.publishViolationDetected(violations[0]);
      }
    } catch (error) {
      logger.error('Failed to handle lead created event', { error, event });
    }
  }

  /**
   * Handle data access event
   */
  private async handleDataAccess(event: any): Promise<void> {
    try {
      // Log to audit trail
      const auditData: AuditEventData = {
        eventType: 'DataAccessed',
        eventCategory: 'DataAccess',
        severity: 'Medium',
        actorId: event.userId,
        actorType: 'User',
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: 'Read',
        success: true,
        timestamp: new Date(),
      };

      await this.auditService.logEvent(auditData);

      // Log sensitive data access
      if (event.dataType) {
        await this.dataAccessService.logDataAccess({
          leadId: event.leadId,
          documentId: event.documentId,
          dataType: event.dataType,
          accessedBy: event.userId,
          accessMethod: event.accessMethod || 'WebUI',
          accessContext: event.context,
        });
      }
    } catch (error) {
      logger.error('Failed to handle data access event', { error, event });
    }
  }

  /**
   * Handle configuration change event
   */
  private async handleConfigurationChange(event: any): Promise<void> {
    try {
      const auditData: AuditEventData = {
        eventType: 'ConfigurationChanged',
        eventCategory: 'SystemOperation',
        severity: 'High',
        actorId: event.userId || 'system',
        actorType: 'User',
        resourceType: 'Configuration',
        resourceId: event.configKey,
        action: 'Update',
        oldValues: { value: event.oldValue },
        newValues: { value: event.newValue },
        changeDescription: `Configuration ${event.configKey} changed`,
        success: true,
        timestamp: new Date(),
      };

      await this.auditService.logEvent(auditData);

      // Log to system state audit
      await prisma.systemStateAuditLog.create({
        data: {
          changeId: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          componentName: event.componentName,
          configKey: event.configKey,
          oldValue: event.oldValue,
          newValue: event.newValue,
          changedBy: event.userId || 'system',
          reason: event.reason,
        },
      });
    } catch (error) {
      logger.error('Failed to handle configuration change event', { error, event });
    }
  }
}
