import { Prisma, LeadEvent } from '@prisma/client';
import prisma from '../db/prisma.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateLeadEventInput {
  leadId: string;
  eventType: string;
  eventData: Prisma.InputJsonValue;
  actorType?: string;
  actorId?: string;
}

export interface LeadEventFilters {
  leadId?: string;
  eventType?: string | string[];
  actorType?: string;
  actorId?: string;
  timestampAfter?: Date;
  timestampBefore?: Date;
}

export class LeadEventRepository {
  async create(input: CreateLeadEventInput): Promise<LeadEvent> {
    try {
      logger.info('Creating lead event', { leadId: input.leadId, eventType: input.eventType });

      const event = await prisma.leadEvent.create({
        data: input,
      });

      logger.info('Lead event created successfully', { eventId: event.id });
      return event;
    } catch (error) {
      logger.error('Failed to create lead event', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<LeadEvent | null> {
    try {
      return await prisma.leadEvent.findUnique({
        where: { id },
        include: {
          lead: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find lead event by ID', { error, id });
      throw error;
    }
  }

  async findMany(filters?: LeadEventFilters, skip = 0, take = 50): Promise<LeadEvent[]> {
    try {
      const where: Prisma.LeadEventWhereInput = {};

      if (filters) {
        if (filters.leadId) {
          where.leadId = filters.leadId;
        }

        if (filters.eventType) {
          where.eventType = Array.isArray(filters.eventType)
            ? { in: filters.eventType }
            : filters.eventType;
        }

        if (filters.actorType) {
          where.actorType = filters.actorType;
        }

        if (filters.actorId) {
          where.actorId = filters.actorId;
        }

        if (filters.timestampAfter || filters.timestampBefore) {
          where.timestamp = {};
          if (filters.timestampAfter) {
            where.timestamp.gte = filters.timestampAfter;
          }
          if (filters.timestampBefore) {
            where.timestamp.lte = filters.timestampBefore;
          }
        }
      }

      return await prisma.leadEvent.findMany({
        where,
        skip,
        take,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          lead: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find lead events', { error, filters });
      throw error;
    }
  }

  async getEventsByLead(leadId: string, limit = 50): Promise<LeadEvent[]> {
    try {
      return await prisma.leadEvent.findMany({
        where: { leadId },
        take: limit,
        orderBy: {
          timestamp: 'desc',
        },
      });
    } catch (error) {
      logger.error('Failed to get events by lead', { error, leadId });
      throw error;
    }
  }

  async getEventsByType(eventType: string, limit = 100): Promise<LeadEvent[]> {
    try {
      return await prisma.leadEvent.findMany({
        where: { eventType },
        take: limit,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          lead: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get events by type', { error, eventType });
      throw error;
    }
  }

  async createStatusChangeEvent(
    leadId: string,
    oldStatus: string,
    newStatus: string,
    actorType?: string,
    actorId?: string
  ): Promise<LeadEvent> {
    return this.create({
      leadId,
      eventType: 'status_change',
      eventData: {
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
      },
      actorType,
      actorId,
    });
  }

  async createAssignmentEvent(
    leadId: string,
    agentId: string,
    assignmentId: string,
    actorType?: string,
    actorId?: string
  ): Promise<LeadEvent> {
    return this.create({
      leadId,
      eventType: 'assigned',
      eventData: {
        agentId,
        assignmentId,
        timestamp: new Date().toISOString(),
      },
      actorType,
      actorId,
    });
  }

  async createScoreChangeEvent(
    leadId: string,
    oldScore: number | null,
    newScore: number,
    reason?: string
  ): Promise<LeadEvent> {
    return this.create({
      leadId,
      eventType: 'score_change',
      eventData: {
        oldScore,
        newScore,
        reason,
        timestamp: new Date().toISOString(),
      },
      actorType: 'system',
    });
  }

  async createNoteEvent(
    leadId: string,
    note: string,
    actorType: string,
    actorId: string
  ): Promise<LeadEvent> {
    return this.create({
      leadId,
      eventType: 'note_added',
      eventData: {
        note,
        timestamp: new Date().toISOString(),
      },
      actorType,
      actorId,
    });
  }

  async createContactEvent(
    leadId: string,
    contactMethod: string,
    contactData: Record<string, any>,
    actorType?: string,
    actorId?: string
  ): Promise<LeadEvent> {
    return this.create({
      leadId,
      eventType: 'contacted',
      eventData: {
        contactMethod,
        ...contactData,
        timestamp: new Date().toISOString(),
      },
      actorType,
      actorId,
    });
  }

  async getLeadTimeline(leadId: string): Promise<LeadEvent[]> {
    return this.getEventsByLead(leadId, 100);
  }
}

export const leadEventRepository = new LeadEventRepository();
