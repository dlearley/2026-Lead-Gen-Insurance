import { PrismaClient } from '@prisma/client';
import { CustomerEvent, EventQueryFilters, TrackEventDto } from '@insurance/types';

export class CDPEventsService {
  constructor(private prisma: PrismaClient) {}

  async trackEvent(data: TrackEventDto): Promise<CustomerEvent> {
    const event = await this.prisma.customerEvent.create({
      data: {
        customerId: data.customerId,
        anonymousId: data.anonymousId,
        sessionId: data.sessionId,
        eventType: data.eventType,
        eventName: data.eventName,
        eventCategory: data.eventCategory,
        properties: data.properties as any,
        context: data.context as any,
        timestamp: data.timestamp || new Date(),
        deviceType: data.deviceType,
        browser: data.browser,
        os: data.os,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        country: data.country,
        region: data.region,
        city: data.city,
        metadata: data.metadata as any,
      },
    });

    return this.mapToEvent(event);
  }

  async listEvents(filters: EventQueryFilters): Promise<{ events: CustomerEvent[]; total: number }> {
    const where: any = {};

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.anonymousId) where.anonymousId = filters.anonymousId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.eventName) where.eventName = { contains: filters.eventName, mode: 'insensitive' };
    if (filters.eventCategory) {
      where.eventCategory = { contains: filters.eventCategory, mode: 'insensitive' };
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const [events, total] = await Promise.all([
      this.prisma.customerEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerEvent.count({ where }),
    ]);

    return {
      events: events.map((e) => this.mapToEvent(e)),
      total,
    };
  }

  async getRecentEvents(customerId: string, limit = 25): Promise<CustomerEvent[]> {
    const events = await this.prisma.customerEvent.findMany({
      where: { customerId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events.map((e) => this.mapToEvent(e));
  }

  private mapToEvent(event: any): CustomerEvent {
    return {
      id: event.id,
      customerId: event.customerId || undefined,
      anonymousId: event.anonymousId || undefined,
      sessionId: event.sessionId || undefined,
      eventType: event.eventType,
      eventName: event.eventName,
      eventCategory: event.eventCategory || undefined,
      properties: event.properties || undefined,
      context: event.context || undefined,
      timestamp: event.timestamp,
      deviceType: event.deviceType || undefined,
      browser: event.browser || undefined,
      os: event.os || undefined,
      ipAddress: event.ipAddress || undefined,
      userAgent: event.userAgent || undefined,
      country: event.country || undefined,
      region: event.region || undefined,
      city: event.city || undefined,
      metadata: event.metadata || undefined,
    };
  }
}
