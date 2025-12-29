import { PrismaClient, MentorStatus, MentorshipRequestStatus, SessionStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { logger } from '@insurance-lead-gen/core';

export class MentorshipService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createMentor(agentId: string, data: {
    specialties: string[];
    bio: string;
    yearsOfExperience: number;
    maxMentees?: number;
  }) {
    const existing = await this.prisma.mentor.findUnique({
      where: { agentId },
    });

    if (existing) {
      throw new Error('Agent is already registered as a mentor');
    }

    return this.prisma.mentor.create({
      data: {
        agentId,
        specialties: data.specialties,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        maxMentees: data.maxMentees || 5,
      },
    });
  }

  async updateMentor(mentorId: string, data: {
    specialties?: string[];
    bio?: string;
    yearsOfExperience?: number;
    maxMentees?: number;
    status?: MentorStatus;
  }) {
    return this.prisma.mentor.update({
      where: { id: mentorId },
      data,
    });
  }

  async getMentor(mentorId: string) {
    return this.prisma.mentor.findUnique({
      where: { id: mentorId },
    });
  }

  async getMentorByAgentId(agentId: string) {
    return this.prisma.mentor.findUnique({
      where: { agentId },
    });
  }

  async listMentors(filters?: {
    status?: MentorStatus;
    specialty?: string;
    minRating?: number;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.specialty) {
      where.specialties = {
        has: filters.specialty,
      };
    }

    if (filters?.minRating) {
      where.rating = {
        gte: filters.minRating,
      };
    }

    return this.prisma.mentor.findMany({
      where,
      orderBy: [
        { rating: 'desc' },
        { totalSessions: 'desc' },
      ],
    });
  }

  async createMentorshipRequest(mentorId: string, menteeId: string, message: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { id: mentorId },
    });

    if (!mentor) {
      throw new Error('Mentor not found');
    }

    if (mentor.agentId === menteeId) {
      throw new Error('Cannot request mentorship from yourself');
    }

    if (mentor.currentMentees >= mentor.maxMentees) {
      throw new Error('Mentor has reached maximum mentee capacity');
    }

    const existingRequest = await this.prisma.mentorshipRequest.findFirst({
      where: {
        mentorId,
        menteeId,
        status: {
          in: [MentorshipRequestStatus.PENDING, MentorshipRequestStatus.ACCEPTED],
        },
      },
    });

    if (existingRequest) {
      throw new Error('Active mentorship request already exists');
    }

    return this.prisma.mentorshipRequest.create({
      data: {
        mentorId,
        menteeId,
        message,
      },
      include: {
        mentor: true,
      },
    });
  }

  async updateMentorshipRequest(requestId: string, status: MentorshipRequestStatus) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      include: { mentor: true },
    });

    if (!request) {
      throw new Error('Mentorship request not found');
    }

    if (status === MentorshipRequestStatus.ACCEPTED) {
      await this.prisma.mentor.update({
        where: { id: request.mentorId },
        data: {
          currentMentees: {
            increment: 1,
          },
        },
      });
    } else if (status === MentorshipRequestStatus.COMPLETED || status === MentorshipRequestStatus.REJECTED || status === MentorshipRequestStatus.CANCELLED) {
      if (request.status === MentorshipRequestStatus.ACCEPTED) {
        await this.prisma.mentor.update({
          where: { id: request.mentorId },
          data: {
            currentMentees: {
              decrement: 1,
            },
          },
        });
      }
    }

    return this.prisma.mentorshipRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        mentor: true,
      },
    });
  }

  async getMentorshipRequest(requestId: string) {
    return this.prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      include: {
        mentor: true,
        sessions: true,
      },
    });
  }

  async getMentorshipsByMentor(mentorId: string, status?: MentorshipRequestStatus) {
    const where: any = { mentorId };
    if (status) {
      where.status = status;
    }

    return this.prisma.mentorshipRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMentorshipsByMentee(menteeId: string, status?: MentorshipRequestStatus) {
    const where: any = { menteeId };
    if (status) {
      where.status = status;
    }

    return this.prisma.mentorshipRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        mentor: true,
      },
    });
  }

  async createSession(data: {
    mentorshipRequestId: string;
    scheduledAt: Date;
    durationMinutes: number;
  }) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id: data.mentorshipRequestId },
    });

    if (!request) {
      throw new Error('Mentorship request not found');
    }

    if (request.status !== MentorshipRequestStatus.ACCEPTED) {
      throw new Error('Mentorship request must be accepted to schedule sessions');
    }

    return this.prisma.mentorshipSession.create({
      data,
    });
  }

  async updateSession(sessionId: string, data: {
    status?: SessionStatus;
    notes?: string;
    rating?: number;
    feedback?: string;
  }) {
    const session = await this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: { mentorshipRequest: { include: { mentor: true } } },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const updated = await this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data,
    });

    if (data.status === SessionStatus.COMPLETED && data.rating) {
      await this.prisma.mentor.update({
        where: { id: session.mentorshipRequest.mentorId },
        data: {
          totalSessions: { increment: 1 },
        },
      });

      const mentor = session.mentorshipRequest.mentor;
      const newRating = (mentor.rating * mentor.totalSessions + data.rating) / (mentor.totalSessions + 1);

      await this.prisma.mentor.update({
        where: { id: session.mentorshipRequest.mentorId },
        data: {
          rating: newRating,
        },
      });
    }

    return updated;
  }

  async getSession(sessionId: string) {
    return this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: {
        mentorshipRequest: {
          include: {
            mentor: true,
          },
        },
      },
    });
  }

  async getSessionsByRequest(mentorshipRequestId: string) {
    return this.prisma.mentorshipSession.findMany({
      where: { mentorshipRequestId },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

export const mentorshipService = new MentorshipService();
