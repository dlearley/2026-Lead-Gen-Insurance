import type { AssignmentStatus, LeadAssignment, Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAssignmentInput {
  leadId: string;
  agentId: string;
  status?: AssignmentStatus;
  notes?: string;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  acceptedAt?: Date | null;
  notes?: string | null;
}

export interface AssignmentFilters {
  leadId?: string;
  agentId?: string;
  status?: AssignmentStatus | AssignmentStatus[];
}

export class AssignmentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateAssignmentInput): Promise<LeadAssignment> {
    try {
      const assignment = await this.prisma.leadAssignment.create({
        data: {
          leadId: input.leadId,
          agentId: input.agentId,
          status: input.status ?? 'PENDING',
          notes: input.notes ?? null,
        },
      });

      logger.info('Assignment created', {
        assignmentId: assignment.id,
        leadId: input.leadId,
        agentId: input.agentId,
      });
      return assignment;
    } catch (error) {
      logger.error('Failed to create assignment', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<LeadAssignment | null> {
    return this.prisma.leadAssignment.findUnique({ where: { id } });
  }

  async findByLeadAndAgent(leadId: string, agentId: string): Promise<LeadAssignment | null> {
    return this.prisma.leadAssignment.findFirst({ where: { leadId, agentId } });
  }

  async findMany(
    filters?: AssignmentFilters,
    skip: number = 0,
    take: number = 20
  ): Promise<LeadAssignment[]> {
    const where: Prisma.LeadAssignmentWhereInput = {};

    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters?.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
    }

    return this.prisma.leadAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { assignedAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateAssignmentInput): Promise<LeadAssignment> {
    return this.prisma.leadAssignment.update({
      where: { id },
      data: {
        status: input.status,
        acceptedAt: input.acceptedAt,
        notes: input.notes,
      },
    });
  }

  async delete(id: string): Promise<LeadAssignment> {
    return this.prisma.leadAssignment.delete({ where: { id } });
  }

  async acceptAssignment(id: string, notes?: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      notes: notes ?? null,
    });
  }

  async rejectAssignment(id: string, notes?: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: 'REJECTED',
      notes: notes ?? null,
    });
  }

  async timeoutAssignment(id: string): Promise<LeadAssignment> {
    return this.update(id, {
      status: 'TIMEOUT',
    });
  }
}
