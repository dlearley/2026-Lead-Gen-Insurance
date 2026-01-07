import { PrismaClient, EventAttendeeStatus } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class CommunityEventsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createEvent(hostId: string, data: {
    title: string;
    description: string;
    eventType: any;
    startTime: Date;
    endTime: Date;
    location?: string;
    isVirtual?: boolean;
    meetingLink?: string;
    maxAttendees?: number;
    coverImage?: string;
  }) {
    return this.prisma.communityEvent.create({
      data: {
        ...data,
        hostId,
      },
      include: {
        host: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });
  }

  async getEvents(params: {
    eventType?: any;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.communityEvent.findMany({
      where: {
        eventType: params.eventType,
        startTime: {
          gte: params.from,
          lte: params.to,
        },
      },
      orderBy: { startTime: 'asc' },
      skip: params.skip || 0,
      take: params.take || 20,
      include: {
        host: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });
  }

  async getEventById(id: string) {
    return this.prisma.communityEvent.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        attendees: {
          include: {
            agent: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async registerForEvent(eventId: string, agentId: string) {
    return this.prisma.communityEventAttendee.upsert({
      where: {
        eventId_agentId: {
          eventId,
          agentId,
        },
      },
      create: {
        eventId,
        agentId,
        status: EventAttendeeStatus.REGISTERED,
      },
      update: {
        status: EventAttendeeStatus.REGISTERED,
      },
    });
  }

  async cancelEventRegistration(eventId: string, agentId: string) {
    return this.prisma.communityEventAttendee.update({
      where: {
        eventId_agentId: {
          eventId,
          agentId,
        },
      },
      data: {
        status: EventAttendeeStatus.CANCELLED,
      },
    });
  }
}

export const communityEventsRepository = new CommunityEventsRepository();
