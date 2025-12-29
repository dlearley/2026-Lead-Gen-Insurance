import { PrismaClient, MentorshipStatus, MentorshipSessionStatus } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class MentorshipRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createRelationship(mentorId: string, menteeId: string) {
    return this.prisma.mentorshipRelationship.create({
      data: {
        mentorId,
        menteeId,
        status: MentorshipStatus.PENDING,
      },
      include: {
        mentor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mentee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async acceptRelationship(relationshipId: string) {
    return this.prisma.mentorshipRelationship.update({
      where: { id: relationshipId },
      data: {
        status: MentorshipStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
  }

  async getMentorRelationships(mentorId: string) {
    return this.prisma.mentorshipRelationship.findMany({
      where: { mentorId },
      include: {
        mentee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMenteeRelationships(menteeId: string) {
    return this.prisma.mentorshipRelationship.findMany({
      where: { menteeId },
      include: {
        mentor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async scheduleSession(relationshipId: string, data: {
    scheduledAt: Date;
    duration: number;
    topic?: string;
    notes?: string;
  }) {
    return this.prisma.mentorshipSession.create({
      data: {
        relationshipId,
        ...data,
        status: MentorshipSessionStatus.SCHEDULED,
      },
    });
  }

  async completeSession(sessionId: string, notes?: string) {
    return this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: {
        status: MentorshipSessionStatus.COMPLETED,
        notes,
      },
    });
  }

  async getSessions(relationshipId: string) {
    return this.prisma.mentorshipSession.findMany({
      where: { relationshipId },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

export const mentorshipRepository = new MentorshipRepository();
