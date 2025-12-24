import { Prisma, Assignment, AssignmentStatus } from '@prisma/client';
import prisma from '../db/prisma.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAssignmentInput {
  leadId: string;
  agentId: string;
  status?: AssignmentStatus;
  priority?: number;
  matchScore?: number;
  matchReason?: string;
  expiresAt?: Date;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  priority?: number;
  matchScore?: number;
  matchReason?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  converted?: boolean;
  conversionValue?: number;
  rejectionReason?: string;
  notes?: string;
  agentNotes?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface AssignmentFilters {
  leadId?: string;
  agentId?: string;
  status?: AssignmentStatus | AssignmentStatus[];
  assignedAfter?: Date;
  assignedBefore?: Date;
  converted?: boolean;
}

export class AssignmentRepository {
  async create(input: CreateAssignmentInput): Promise<Assignment> {
    try {
      logger.info('Creating new assignment', { leadId: input.leadId, agentId: input.agentId });

      const assignment = await prisma.assignment.create({
        data: input,
        include: {
          lead: true,
          agent: true,
        },
      });

      logger.info('Assignment created successfully', { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      logger.error('Failed to create assignment', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Assignment | null> {
    try {
      return await prisma.assignment.findUnique({
        where: { id },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find assignment by ID', { error, id });
      throw error;
    }
  }

  async findByLeadAndAgent(leadId: string, agentId: string): Promise<Assignment | null> {
    try {
      return await prisma.assignment.findUnique({
        where: {
          leadId_agentId: {
            leadId,
            agentId,
          },
        },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find assignment by lead and agent', { error, leadId, agentId });
      throw error;
    }
  }

  async findMany(filters?: AssignmentFilters, skip = 0, take = 20): Promise<Assignment[]> {
    try {
      const where: Prisma.AssignmentWhereInput = {};

      if (filters) {
        if (filters.leadId) {
          where.leadId = filters.leadId;
        }

        if (filters.agentId) {
          where.agentId = filters.agentId;
        }

        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.assignedAfter || filters.assignedBefore) {
          where.assignedAt = {};
          if (filters.assignedAfter) {
            where.assignedAt.gte = filters.assignedAfter;
          }
          if (filters.assignedBefore) {
            where.assignedAt.lte = filters.assignedBefore;
          }
        }

        if (filters.converted !== undefined) {
          where.converted = filters.converted;
        }
      }

      return await prisma.assignment.findMany({
        where,
        skip,
        take,
        orderBy: {
          assignedAt: 'desc',
        },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find assignments', { error, filters });
      throw error;
    }
  }

  async count(filters?: AssignmentFilters): Promise<number> {
    try {
      const where: Prisma.AssignmentWhereInput = {};

      if (filters) {
        if (filters.leadId) {
          where.leadId = filters.leadId;
        }

        if (filters.agentId) {
          where.agentId = filters.agentId;
        }

        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.converted !== undefined) {
          where.converted = filters.converted;
        }
      }

      return await prisma.assignment.count({ where });
    } catch (error) {
      logger.error('Failed to count assignments', { error, filters });
      throw error;
    }
  }

  async update(id: string, input: UpdateAssignmentInput): Promise<Assignment> {
    try {
      logger.info('Updating assignment', { assignmentId: id });

      const assignment = await prisma.assignment.update({
        where: { id },
        data: input,
        include: {
          lead: true,
          agent: true,
        },
      });

      logger.info('Assignment updated successfully', { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      logger.error('Failed to update assignment', { error, id, input });
      throw error;
    }
  }

  async delete(id: string): Promise<Assignment> {
    try {
      logger.info('Deleting assignment', { assignmentId: id });

      const assignment = await prisma.assignment.delete({
        where: { id },
      });

      logger.info('Assignment deleted successfully', { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      logger.error('Failed to delete assignment', { error, id });
      throw error;
    }
  }

  async acceptAssignment(id: string, agentNotes?: string): Promise<Assignment> {
    return this.update(id, {
      status: AssignmentStatus.ACCEPTED,
      acceptedAt: new Date(),
      agentNotes,
    });
  }

  async rejectAssignment(
    id: string,
    rejectionReason: string,
    agentNotes?: string
  ): Promise<Assignment> {
    return this.update(id, {
      status: AssignmentStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason,
      agentNotes,
    });
  }

  async completeAssignment(
    id: string,
    converted: boolean,
    conversionValue?: number,
    agentNotes?: string
  ): Promise<Assignment> {
    return this.update(id, {
      status: converted ? AssignmentStatus.CONVERTED : AssignmentStatus.COMPLETED,
      completedAt: new Date(),
      converted,
      conversionValue,
      agentNotes,
    });
  }

  async getAssignmentsByLead(leadId: string): Promise<Assignment[]> {
    try {
      return await prisma.assignment.findMany({
        where: { leadId },
        orderBy: {
          assignedAt: 'desc',
        },
        include: {
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get assignments by lead', { error, leadId });
      throw error;
    }
  }

  async getAssignmentsByAgent(agentId: string, status?: AssignmentStatus[]): Promise<Assignment[]> {
    try {
      const where: Prisma.AssignmentWhereInput = { agentId };

      if (status) {
        where.status = { in: status };
      }

      return await prisma.assignment.findMany({
        where,
        orderBy: {
          assignedAt: 'desc',
        },
        include: {
          lead: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get assignments by agent', { error, agentId });
      throw error;
    }
  }

  async getPendingAssignments(agentId?: string): Promise<Assignment[]> {
    try {
      const where: Prisma.AssignmentWhereInput = {
        status: AssignmentStatus.PENDING,
      };

      if (agentId) {
        where.agentId = agentId;
      }

      return await prisma.assignment.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { assignedAt: 'asc' }],
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get pending assignments', { error, agentId });
      throw error;
    }
  }

  async getExpiredAssignments(): Promise<Assignment[]> {
    try {
      return await prisma.assignment.findMany({
        where: {
          status: AssignmentStatus.PENDING,
          expiresAt: {
            lte: new Date(),
          },
        },
        include: {
          lead: true,
          agent: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get expired assignments', { error });
      throw error;
    }
  }

  async markExpiredAssignments(): Promise<number> {
    try {
      const result = await prisma.assignment.updateMany({
        where: {
          status: AssignmentStatus.PENDING,
          expiresAt: {
            lte: new Date(),
          },
        },
        data: {
          status: AssignmentStatus.EXPIRED,
        },
      });

      logger.info('Expired assignments marked', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to mark expired assignments', { error });
      throw error;
    }
  }

  async getConversionRate(agentId: string): Promise<number> {
    try {
      const [total, converted] = await Promise.all([
        prisma.assignment.count({
          where: {
            agentId,
            status: {
              in: [AssignmentStatus.COMPLETED, AssignmentStatus.CONVERTED],
            },
          },
        }),
        prisma.assignment.count({
          where: {
            agentId,
            converted: true,
          },
        }),
      ]);

      return total > 0 ? (converted / total) * 100 : 0;
    } catch (error) {
      logger.error('Failed to calculate conversion rate', { error, agentId });
      throw error;
    }
  }
}

export const assignmentRepository = new AssignmentRepository();
