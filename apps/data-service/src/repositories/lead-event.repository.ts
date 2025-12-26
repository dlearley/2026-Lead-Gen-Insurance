import type { PrismaClient, Event } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

export interface CreateLeadEventInput {
  leadId: string;
  type: string;
  source: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export class LeadEventRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateLeadEventInput): Promise<Event> {
    try {
      const event = await this.prisma.event.create({
        data: {
          type: input.type,
          source: input.source,
          entityType: 'lead',
          entityId: input.leadId,
          data: input.data as any,
          metadata: (input.metadata ?? null) as any,
        },
      });

      logger.debug('Lead event created', {
        eventId: event.id,
        leadId: input.leadId,
        type: input.type,
      });
      return event;
    } catch (error) {
      logger.error('Failed to create lead event', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async findManyByLeadId(leadId: string, limit: number = 50): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { entityType: 'lead', entityId: leadId },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }
}
