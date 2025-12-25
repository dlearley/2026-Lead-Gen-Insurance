import { Prisma, LeadAssignment, AssignmentStatus } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAssignmentInput {
  leadId: string;
  agentId: string;
  assignedBy?: string;
  assignmentReason?: string;
  routingScore?: Prisma.Decimal | number;
  metadata?: Prisma.InputJsonValue;
  expiredAt?: Date;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
  completedAt?: Date;
  expiredAt?: Date;
  metadata?: Prisma.InputJsonValue;
}

export class AssignmentRepository {
  async create(data: CreateAssignmentInput): Promise<LeadAssignment> {
    try {
      const assignment = await prisma.leadAssignment.create({
        data: {
          ...data,
          status: AssignmentStatus.PENDING,
        },
        include: {
          lead: true,
          agent: true,
        },
      });

      logger.info('Lead assignment created', {
        assignmentId: assignment.id,
        leadId: assignment.leadId,
        agentId: assignment.agentId,
      });
      return assignment;
    } catch (error) {
      logger.error('Failed to create lead assignment', { error, data });
      throw error;
    }
  }

  async findById(id: string): Promise<LeadAssignment | null> {
    try {
      return await prisma.leadAssignment.findUnique({
        where: { id },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find assignment by id', { error, id });
      throw error;
    }
  }

  async findByLeadId(leadId: string): Promise<LeadAssignment[]> {
    try {
      return await prisma.leadAssignment.findMany({
        where: { leadId },
        include: {
          agent: true,
        },
        orderBy: { assignedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to find assignments by lead id', { error, leadId });
      throw error;
    }
  }

  async findByAgentId(agentId: string, status?: AssignmentStatus): Promise<LeadAssignment[]> {
    try {
      const where: Prisma.LeadAssignmentWhereInput = { agentId };
      if (status) {
        where.status = status;
      }

      return await prisma.leadAssignment.findMany({
        where,
        include: {
          lead: true,
        },
        orderBy: { assignedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to find assignments by agent id', { error, agentId });
      throw error;
    }
  }

  async update(id: string, data: UpdateAssignmentInput): Promise<LeadAssignment> {
    try {
      const assignment = await prisma.leadAssignment.update({
        where: { id },
        data,
        include: {
          lead: true,
          agent: true,
        },
      });

      logger.info('Lead assignment updated', { assignmentId: assignment.id, status: assignment.status });
      return assignment;
    } catch (error) {
      logger.error('Failed to update lead assignment', { error, id, data });
      throw error;
    }
  }

  async accept(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: AssignmentStatus.ACCEPTED,
      acceptedAt: new Date(),
    });
  }

  async reject(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: AssignmentStatus.REJECTED,
      rejectedAt: new Date(),
    });
  }

  async complete(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: AssignmentStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async expire(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: AssignmentStatus.EXPIRED,
      expiredAt: new Date(),
    });
  }

  async cancel(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: AssignmentStatus.CANCELLED,
    });
  }

  async findPendingAssignments(): Promise<LeadAssignment[]> {
    try {
      return await prisma.leadAssignment.findMany({
        where: {
          status: AssignmentStatus.PENDING,
        },
        include: {
          lead: true,
          agent: true,
        },
        orderBy: { assignedAt: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to find pending assignments', { error });
      throw error;
    }
  }

  async findExpiredAssignments(): Promise<LeadAssignment[]> {
    try {
      return await prisma.leadAssignment.findMany({
        where: {
          status: AssignmentStatus.PENDING,
          expiredAt: {
            lte: new Date(),
          },
        },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find expired assignments', { error });
      throw error;
    }
  }

  async getAssignmentStats(): Promise<{
    total: number;
    byStatus: { status: AssignmentStatus; count: number }[];
    averageAcceptanceTime: number;
    acceptanceRate: number;
  }> {
    try {
      const [total, byStatus] = await Promise.all([
        prisma.leadAssignment.count(),
        prisma.leadAssignment.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

      const acceptedAssignments = await prisma.leadAssignment.findMany({
        where: {
          status: AssignmentStatus.ACCEPTED,
          acceptedAt: { not: null },
        },
        select: {
          assignedAt: true,
          acceptedAt: true,
        },
      });

      let totalAcceptanceTime = 0;
      acceptedAssignments.forEach((assignment) => {
        if (assignment.acceptedAt) {
          const timeDiff = assignment.acceptedAt.getTime() - assignment.assignedAt.getTime();
          totalAcceptanceTime += timeDiff;
        }
      });

      const averageAcceptanceTime = acceptedAssignments.length > 0 
        ? totalAcceptanceTime / acceptedAssignments.length / 1000 / 60
        : 0;

      const acceptedCount = byStatus.find((s) => s.status === AssignmentStatus.ACCEPTED)?._count || 0;
      const acceptanceRate = total > 0 ? (acceptedCount / total) * 100 : 0;

      return {
        total,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        averageAcceptanceTime,
        acceptanceRate,
      };
    } catch (error) {
      logger.error('Failed to get assignment stats', { error });
      throw error;
    }
  }
}

export const assignmentRepository = new AssignmentRepository();
