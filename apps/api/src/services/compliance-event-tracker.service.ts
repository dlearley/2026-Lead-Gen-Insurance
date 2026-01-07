/**
 * Phase 25.1E: Compliance Event Tracking Service
 * 
 * Tracks and manages compliance-related events and their lifecycle.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  ComplianceEventData,
  ComplianceEvent,
  EventFilters,
} from '@insurance-lead-gen/types';

export class ComplianceEventTrackerService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Track a compliance event
   */
  async trackComplianceEvent(event: ComplianceEventData): Promise<ComplianceEvent> {
    try {
      const complianceEvent = await this.prisma.complianceEvent.create({
        data: {
          eventId: event.eventId,
          eventType: event.eventType,
          jurisdiction: event.jurisdiction,
          description: event.description,
          entityType: event.entityType,
          entityId: event.entityId,
          status: event.status,
          initiatedDate: event.initiatedDate,
          completedDate: event.completedDate,
          relatedAuditLogs: event.relatedAuditLogs || [],
          evidence: event.evidence,
          assignedTo: event.assignedTo,
          notes: event.notes,
        },
      });

      logger.info('Compliance event tracked', {
        eventId: complianceEvent.eventId,
        eventType: complianceEvent.eventType,
        jurisdiction: complianceEvent.jurisdiction,
      });

      return complianceEvent;
    } catch (error) {
      logger.error('Failed to track compliance event', { error, event });
      throw new Error('Compliance event tracking failed');
    }
  }

  /**
   * Get compliance events with filters
   */
  async getComplianceEvents(filters: EventFilters): Promise<ComplianceEvent[]> {
    const where: any = {};

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.jurisdiction) {
      where.jurisdiction = filters.jurisdiction;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.dateRange) {
      where.initiatedDate = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return this.prisma.complianceEvent.findMany({
      where,
      orderBy: { initiatedDate: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Get a single compliance event by ID
   */
  async getComplianceEvent(id: string): Promise<ComplianceEvent | null> {
    return this.prisma.complianceEvent.findUnique({
      where: { id },
    });
  }

  /**
   * Update compliance event status
   */
  async updateComplianceEventStatus(
    id: string,
    status: string,
    completedDate?: Date
  ): Promise<ComplianceEvent> {
    return this.prisma.complianceEvent.update({
      where: { id },
      data: {
        status,
        completedDate,
      },
    });
  }

  /**
   * Generate compliance timeline for an entity
   */
  async generateComplianceTimeline(entityId: string): Promise<ComplianceEvent[]> {
    return this.prisma.complianceEvent.findMany({
      where: { entityId },
      orderBy: { initiatedDate: 'asc' },
    });
  }

  /**
   * Get compliance status for an entity
   */
  async getComplianceStatusForEntity(entityId: string): Promise<{
    entityId: string;
    totalEvents: number;
    activeEvents: number;
    completedEvents: number;
    pendingEvents: number;
    latestEvent: ComplianceEvent | null;
  }> {
    const events = await this.prisma.complianceEvent.findMany({
      where: { entityId },
      orderBy: { initiatedDate: 'desc' },
    });

    const activeEvents = events.filter((e) => e.status === 'InProgress').length;
    const completedEvents = events.filter((e) => e.status === 'Completed').length;
    const pendingEvents = events.filter((e) => e.status === 'Initiated').length;

    return {
      entityId,
      totalEvents: events.length,
      activeEvents,
      completedEvents,
      pendingEvents,
      latestEvent: events.length > 0 ? events[0] : null,
    };
  }

  /**
   * Get compliance attestation for a period
   */
  async generateComplianceAttestation(dateRange: {
    start: Date;
    end: Date;
  }): Promise<{
    period: { start: Date; end: Date };
    totalEvents: number;
    byJurisdiction: Record<string, number>;
    byStatus: Record<string, number>;
    criticalEvents: ComplianceEvent[];
    summary: string;
  }> {
    const events = await this.prisma.complianceEvent.findMany({
      where: {
        initiatedDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    const byJurisdiction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    events.forEach((event) => {
      byJurisdiction[event.jurisdiction] = (byJurisdiction[event.jurisdiction] || 0) + 1;
      byStatus[event.status] = (byStatus[event.status] || 0) + 1;
    });

    const criticalEvents = events.filter(
      (e) => e.eventType === 'BreachNotified' || e.eventType === 'ViolationDetected'
    );

    return {
      period: dateRange,
      totalEvents: events.length,
      byJurisdiction,
      byStatus,
      criticalEvents,
      summary: `${events.length} compliance events tracked during this period`,
    };
  }
}
