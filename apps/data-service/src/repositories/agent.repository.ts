import { Prisma, Agent, AgentStatus, InsuranceType } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAgentInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber?: string;
  specializations?: InsuranceType[];
  languages?: string[];
  yearsExperience?: number;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: Prisma.Decimal | number;
  longitude?: Prisma.Decimal | number;
  maxLeadsPerDay?: number;
  metadata?: Prisma.InputJsonValue;
  preferences?: Prisma.InputJsonValue;
}

export interface UpdateAgentInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  licenseNumber?: string;
  specializations?: InsuranceType[];
  languages?: string[];
  yearsExperience?: number;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: Prisma.Decimal | number;
  longitude?: Prisma.Decimal | number;
  status?: AgentStatus;
  availabilityZone?: string;
  maxLeadsPerDay?: number;
  currentWorkload?: number;
  performanceScore?: Prisma.Decimal | number;
  conversionRate?: Prisma.Decimal | number;
  averageResponseTime?: number;
  totalLeadsHandled?: number;
  totalConversions?: number;
  customerSatisfaction?: Prisma.Decimal | number;
  metadata?: Prisma.InputJsonValue;
  preferences?: Prisma.InputJsonValue;
  lastActiveAt?: Date;
}

export interface AgentFilters {
  status?: AgentStatus;
  specializations?: InsuranceType[];
  city?: string;
  state?: string;
  performanceScoreMin?: number;
  availableCapacity?: boolean;
}

export class AgentRepository {
  async create(data: CreateAgentInput): Promise<Agent> {
    try {
      const agent = await prisma.agent.create({
        data: {
          ...data,
          status: AgentStatus.ACTIVE,
        },
      });

      logger.info('Agent created', { agentId: agent.id, email: agent.email });
      return agent;
    } catch (error) {
      logger.error('Failed to create agent', { error, data });
      throw error;
    }
  }

  async findById(id: string): Promise<Agent | null> {
    try {
      return await prisma.agent.findUnique({
        where: { id },
        include: {
          assignments: {
            orderBy: { assignedAt: 'desc' },
            take: 10,
          },
          schedules: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find agent by id', { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Agent | null> {
    try {
      return await prisma.agent.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Failed to find agent by email', { error, email });
      throw error;
    }
  }

  async update(id: string, data: UpdateAgentInput): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data,
      });

      logger.info('Agent updated', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent', { error, id, data });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.agent.delete({
        where: { id },
      });

      logger.info('Agent deleted', { agentId: id });
    } catch (error) {
      logger.error('Failed to delete agent', { error, id });
      throw error;
    }
  }

  async findMany(
    filters: AgentFilters = {},
    page = 1,
    limit = 50
  ): Promise<{ agents: Agent[]; total: number; page: number; totalPages: number }> {
    try {
      const where: Prisma.AgentWhereInput = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.specializations && filters.specializations.length > 0) {
        where.specializations = {
          hasSome: filters.specializations,
        };
      }

      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }

      if (filters.state) {
        where.state = filters.state;
      }

      if (filters.performanceScoreMin !== undefined) {
        where.performanceScore = {
          gte: filters.performanceScoreMin,
        };
      }

      const skip = (page - 1) * limit;

      const [agents, total] = await Promise.all([
        prisma.agent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { performanceScore: 'desc' },
        }),
        prisma.agent.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return { agents, total, page, totalPages };
    } catch (error) {
      logger.error('Failed to find agents', { error, filters });
      throw error;
    }
  }

  async findAvailableAgents(
    insuranceType?: InsuranceType,
    limit = 10
  ): Promise<Agent[]> {
    try {
      const where: Prisma.AgentWhereInput = {
        status: AgentStatus.ACTIVE,
      };

      if (insuranceType) {
        where.specializations = {
          has: insuranceType,
        };
      }

      return await prisma.agent.findMany({
        where,
        orderBy: [
          { currentWorkload: 'asc' },
          { performanceScore: 'desc' },
          { conversionRate: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find available agents', { error, insuranceType });
      throw error;
    }
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    return this.update(id, { status, lastActiveAt: new Date() });
  }

  async incrementWorkload(id: string): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          currentWorkload: { increment: 1 },
        },
      });

      logger.info('Agent workload incremented', { agentId: agent.id, currentWorkload: agent.currentWorkload });
      return agent;
    } catch (error) {
      logger.error('Failed to increment agent workload', { error, id });
      throw error;
    }
  }

  async decrementWorkload(id: string): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          currentWorkload: { decrement: 1 },
        },
      });

      logger.info('Agent workload decremented', { agentId: agent.id, currentWorkload: agent.currentWorkload });
      return agent;
    } catch (error) {
      logger.error('Failed to decrement agent workload', { error, id });
      throw error;
    }
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      conversionRate?: number;
      averageResponseTime?: number;
      totalLeadsHandled?: number;
      totalConversions?: number;
      customerSatisfaction?: number;
    }
  ): Promise<Agent> {
    try {
      const updates: any = {};

      if (metrics.conversionRate !== undefined) {
        updates.conversionRate = metrics.conversionRate;
      }
      if (metrics.averageResponseTime !== undefined) {
        updates.averageResponseTime = metrics.averageResponseTime;
      }
      if (metrics.totalLeadsHandled !== undefined) {
        updates.totalLeadsHandled = { increment: metrics.totalLeadsHandled };
      }
      if (metrics.totalConversions !== undefined) {
        updates.totalConversions = { increment: metrics.totalConversions };
      }
      if (metrics.customerSatisfaction !== undefined) {
        updates.customerSatisfaction = metrics.customerSatisfaction;
      }

      const agent = await prisma.agent.update({
        where: { id },
        data: updates,
      });

      logger.info('Agent performance metrics updated', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent performance metrics', { error, id, metrics });
      throw error;
    }
  }

  async getAgentStats(): Promise<{
    total: number;
    byStatus: { status: AgentStatus; count: number }[];
    averagePerformanceScore: number;
    averageConversionRate: number;
    totalActiveAgents: number;
  }> {
    try {
      const [total, byStatus, aggregates] = await Promise.all([
        prisma.agent.count(),
        prisma.agent.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.agent.aggregate({
          _avg: {
            performanceScore: true,
            conversionRate: true,
          },
          where: {
            status: AgentStatus.ACTIVE,
          },
        }),
      ]);

      const totalActiveAgents = byStatus.find((s) => s.status === AgentStatus.ACTIVE)?._count || 0;

      return {
        total,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        averagePerformanceScore: Number(aggregates._avg.performanceScore) || 0,
        averageConversionRate: Number(aggregates._avg.conversionRate) || 0,
        totalActiveAgents,
      };
    } catch (error) {
      logger.error('Failed to get agent stats', { error });
      throw error;
    }
  }
}

export const agentRepository = new AgentRepository();
