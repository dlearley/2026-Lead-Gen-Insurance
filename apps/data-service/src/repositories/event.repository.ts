import { PrismaClient, Event } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type { Event as EventType } from '@insurance-lead-gen/types';

export class EventRepository {
  constructor(private prisma: PrismaClient) {}

  async createEvent(eventData: Omit<EventType, 'id' | 'timestamp'>): Promise<Event> {
    try {
      const event = await this.prisma.event.create({
        data: {
          type: eventData.type,
          source: eventData.source,
          entityType: eventData.entityType,
          entityId: eventData.entityId,
          data: eventData.data as any,
          metadata: eventData.metadata as any,
        },
      });

      logger.debug('Event created successfully', { eventId: event.id, type: event.type });
      return event;
    } catch (error) {
      logger.error('Failed to create event', { error, eventData });
      throw error;
    }
  }

  async getEventsByEntity(entityType: string, entityId: string): Promise<Event[]> {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
      });

      logger.debug('Retrieved events by entity', { entityType, entityId, count: events.length });
      return events;
    } catch (error) {
      logger.error('Failed to get events by entity', { error, entityType, entityId });
      throw error;
    }
  }

  async getEventsByType(type: string, limit: number = 100): Promise<Event[]> {
    try {
      const events = await this.prisma.event.findMany({
        where: { type },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      logger.debug('Retrieved events by type', { type, count: events.length });
      return events;
    } catch (error) {
      logger.error('Failed to get events by type', { error, type });
      throw error;
    }
  }

  async getRecentEvents(limit: number = 50): Promise<Event[]> {
    try {
      const events = await this.prisma.event.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      logger.debug('Retrieved recent events', { count: events.length });
      return events;
    } catch (error) {
      logger.error('Failed to get recent events', { error });
      throw error;
    }
  }
}