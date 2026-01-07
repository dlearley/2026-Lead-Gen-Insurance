/**
 * Phase 30: Partner Ecosystem & Integrations
 * Event Service - Handles platform event publishing and management
 */

import { PrismaClient } from '@prisma/client';
import type { EventType, PlatformEvent } from '@insurance-platform/types';

export class EventService {
  constructor(
    private prisma: PrismaClient,
    private webhookService: any // WebhookService - to avoid circular dependency
  ) {}

  /**
   * Register a new event type
   */
  async registerEventType(
    eventName: string,
    description: string,
    eventCategory: string,
    payloadSchema?: Record<string, any>
  ): Promise<EventType> {
    const eventType = await this.prisma.eventType.create({
      data: {
        eventName,
        description,
        eventCategory,
        payloadSchema,
        version: 1,
      },
    });

    return eventType as EventType;
  }

  /**
   * Publish a platform event
   */
  async publishEvent(
    eventName: string,
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    organizationId?: string
  ): Promise<PlatformEvent> {
    // Get or create event type
    let eventType = await this.prisma.eventType.findUnique({
      where: { eventName },
    });

    if (!eventType) {
      // Auto-register event type
      eventType = await this.prisma.eventType.create({
        data: {
          eventName,
          description: `Auto-registered event: ${eventName}`,
          eventCategory: entityType,
          version: 1,
        },
      });
    }

    // Create event
    const event = await this.prisma.platformEvent.create({
      data: {
        eventTypeId: eventType.id,
        organizationId,
        entityType,
        entityId,
        payload,
      },
      include: {
        eventType: true,
      },
    });

    // Trigger webhook delivery asynchronously
    this.deliverEventAsync(event.id);

    return event as PlatformEvent;
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<PlatformEvent | null> {
    const event = await this.prisma.platformEvent.findUnique({
      where: { id },
      include: {
        eventType: true,
      },
    });

    return event as PlatformEvent | null;
  }

  /**
   * List events with filters
   */
  async listEvents(filters: {
    eventType?: string;
    entityType?: string;
    entityId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: PlatformEvent[]; total: number }> {
    const where: any = {};

    if (filters.eventType) {
      const eventType = await this.prisma.eventType.findUnique({
        where: { eventName: filters.eventType },
      });
      if (eventType) {
        where.eventTypeId = eventType.id;
      }
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.platformEvent.findMany({
        where,
        include: {
          eventType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.platformEvent.count({ where }),
    ]);

    return {
      events: events as PlatformEvent[],
      total,
    };
  }

  /**
   * Replay event to webhooks
   */
  async replayEvent(eventId: string): Promise<void> {
    const event = await this.prisma.platformEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    await this.webhookService.deliverEvent(eventId);
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    eventsByType: Array<{ eventType: string; count: number }>;
    eventsByCategory: Array<{ category: string; count: number }>;
  }> {
    const events = await this.prisma.platformEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        eventType: true,
      },
    });

    const totalEvents = events.length;

    // Group by event type
    const eventTypeMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();

    events.forEach((event) => {
      const typeName = event.eventType.eventName;
      const category = event.eventType.eventCategory;

      eventTypeMap.set(typeName, (eventTypeMap.get(typeName) || 0) + 1);
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    return {
      totalEvents,
      eventsByType: Array.from(eventTypeMap.entries()).map(([eventType, count]) => ({
        eventType,
        count,
      })),
      eventsByCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
    };
  }

  /**
   * List available event types
   */
  async listEventTypes(category?: string): Promise<EventType[]> {
    const where: any = {};
    if (category) {
      where.eventCategory = category;
    }

    const eventTypes = await this.prisma.eventType.findMany({
      where,
      orderBy: { eventName: 'asc' },
    });

    return eventTypes as EventType[];
  }

  /**
   * Initialize standard event types
   */
  async initializeStandardEvents(): Promise<void> {
    const standardEvents = [
      // Lead events
      { name: 'lead.created', category: 'lead', description: 'A new lead was created' },
      { name: 'lead.updated', category: 'lead', description: 'A lead was updated' },
      { name: 'lead.qualified', category: 'lead', description: 'A lead was qualified' },
      { name: 'lead.assigned', category: 'lead', description: 'A lead was assigned to an agent' },
      { name: 'lead.converted', category: 'lead', description: 'A lead was converted to a policy' },
      
      // Policy events
      { name: 'policy.created', category: 'policy', description: 'A new policy was created' },
      { name: 'policy.updated', category: 'policy', description: 'A policy was updated' },
      { name: 'policy.renewed', category: 'policy', description: 'A policy was renewed' },
      { name: 'policy.cancelled', category: 'policy', description: 'A policy was cancelled' },
      
      // Claim events
      { name: 'claim.filed', category: 'claim', description: 'A claim was filed' },
      { name: 'claim.approved', category: 'claim', description: 'A claim was approved' },
      { name: 'claim.denied', category: 'claim', description: 'A claim was denied' },
      { name: 'claim.paid', category: 'claim', description: 'A claim was paid' },
      
      // User events
      { name: 'user.created', category: 'user', description: 'A new user was created' },
      { name: 'user.updated', category: 'user', description: 'A user was updated' },
      { name: 'user.role_changed', category: 'user', description: 'A user role was changed' },
      
      // Integration events
      { name: 'integration.connected', category: 'integration', description: 'An integration was connected' },
      { name: 'integration.disconnected', category: 'integration', description: 'An integration was disconnected' },
      { name: 'integration.failed', category: 'integration', description: 'An integration encountered an error' },
      
      // Billing events
      { name: 'billing.usage_updated', category: 'billing', description: 'Partner usage was updated' },
      { name: 'billing.invoice_generated', category: 'billing', description: 'An invoice was generated' },
      { name: 'billing.payment_received', category: 'billing', description: 'A payment was received' },
    ];

    for (const event of standardEvents) {
      const existing = await this.prisma.eventType.findUnique({
        where: { eventName: event.name },
      });

      if (!existing) {
        await this.prisma.eventType.create({
          data: {
            eventName: event.name,
            description: event.description,
            eventCategory: event.category,
            version: 1,
          },
        });
      }
    }
  }

  /**
   * Deliver event asynchronously (non-blocking)
   */
  private deliverEventAsync(eventId: string): void {
    // In production, this should use a message queue
    setImmediate(() => {
      this.webhookService.deliverEvent(eventId).catch((error: Error) => {
        console.error(`Failed to deliver event ${eventId}:`, error);
      });
    });
  }
}
