import type { PrismaClient, Agent, Prisma } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAgentInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specializations?: string[];
  city: string;
  state: string;
  country: string;
  rating?: number;
  isActive?: boolean;
  maxLeadCapacity?: number;
}

export interface UpdateAgentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specializations?: string[];
  city?: string;
  state?: string;
  country?: string;
  rating?: number;
  isActive?: boolean;
  maxLeadCapacity?: number;
  currentLeadCount?: number;
  averageResponseTime?: number;
  conversionRate?: number;
}

export interface AgentFilters {
  isActive?: boolean;
  state?: string;
  specialization?: string;
  specializationsAny?: string[];
}

export class AgentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateAgentInput): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          licenseNumber: input.licenseNumber,
          specializations: input.specializations ?? [],
          city: input.city,
          state: input.state,
          country: input.country,
          rating: input.rating ?? 0,
          isActive: input.isActive ?? true,
          maxLeadCapacity: input.maxLeadCapacity ?? 10,
        },
      });

      logger.info('Agent created', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to create agent', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({ where: { id } });
  }

  async findMany(
    filters?: AgentFilters,
    skip: number = 0,
    take: number = 20
  ): Promise<Agent[]> {
    const where: Prisma.AgentWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.state) {
      where.state = filters.state;
    }

    if (filters?.specialization) {
      where.specializations = { has: filters.specialization };
    }

    if (filters?.specializationsAny && filters.specializationsAny.length > 0) {
      where.specializations = { hasSome: filters.specializationsAny };
    }

    return this.prisma.agent.findMany({
      where,
      skip,
      take,
      orderBy: [{ rating: 'desc' }, { conversionRate: 'desc' }],
    });
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.update({
        where: { id },
        data: {
          ...input,
          specializations: input.specializations,
        },
      });

      logger.info('Agent updated', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent', { error, id, input });
      throw error;
    }
  }

  async delete(id: string): Promise<Agent> {
    return this.prisma.agent.delete({ where: { id } });
  }

  async incrementCurrentLeadCount(id: string): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: {
        currentLeadCount: { increment: 1 },
      },
    });
  }

  async decrementCurrentLeadCount(id: string): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: {
        currentLeadCount: { decrement: 1 },
      },
    });
  }
}
