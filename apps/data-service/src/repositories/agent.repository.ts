import { Prisma, Agent, AgentStatus, InsuranceType } from '@prisma/client';
import prisma from '../db/prisma.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateAgentInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  yearsOfExperience?: number;
  specializations?: InsuranceType[];
  status?: AgentStatus;
  maxCapacity?: number;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  serviceArea?: string[];
  passwordHash?: string;
  metadata?: Prisma.InputJsonValue;
  availabilityHours?: Prisma.InputJsonValue;
}

export interface UpdateAgentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  yearsOfExperience?: number;
  specializations?: InsuranceType[];
  conversionRate?: number;
  averageResponseTime?: number;
  totalLeadsHandled?: number;
  totalConversions?: number;
  performanceScore?: number;
  status?: AgentStatus;
  currentCapacity?: number;
  maxCapacity?: number;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  serviceArea?: string[];
  passwordHash?: string;
  lastLoginAt?: Date;
  metadata?: Prisma.InputJsonValue;
  availabilityHours?: Prisma.InputJsonValue;
}

export interface AgentFilters {
  status?: AgentStatus | AgentStatus[];
  specializations?: InsuranceType | InsuranceType[];
  minPerformanceScore?: number;
  maxPerformanceScore?: number;
  hasCapacity?: boolean;
  state?: string;
  serviceArea?: string[];
}

export class AgentRepository {
  async create(input: CreateAgentInput): Promise<Agent> {
    try {
      logger.info('Creating new agent', { email: input.email });

      const agent = await prisma.agent.create({
        data: input,
      });

      logger.info('Agent created successfully', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to create agent', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Agent | null> {
    try {
      return await prisma.agent.findUnique({
        where: { id },
        include: {
          assignments: {
            include: {
              lead: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find agent by ID', { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Agent | null> {
    try {
      return await prisma.agent.findUnique({
        where: { email },
        include: {
          assignments: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find agent by email', { error, email });
      throw error;
    }
  }

  async findMany(filters?: AgentFilters, skip = 0, take = 20): Promise<Agent[]> {
    try {
      const where: Prisma.AgentWhereInput = {};

      if (filters) {
        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.specializations) {
          if (Array.isArray(filters.specializations)) {
            where.specializations = {
              hasSome: filters.specializations,
            };
          } else {
            where.specializations = {
              has: filters.specializations,
            };
          }
        }

        if (
          filters.minPerformanceScore !== undefined ||
          filters.maxPerformanceScore !== undefined
        ) {
          where.performanceScore = {};
          if (filters.minPerformanceScore !== undefined) {
            where.performanceScore.gte = filters.minPerformanceScore;
          }
          if (filters.maxPerformanceScore !== undefined) {
            where.performanceScore.lte = filters.maxPerformanceScore;
          }
        }

        if (filters.hasCapacity) {
          where.currentCapacity = {
            lt: prisma.agent.fields.maxCapacity,
          };
          where.status = AgentStatus.ACTIVE;
        }

        if (filters.state) {
          where.state = filters.state;
        }

        if (filters.serviceArea && filters.serviceArea.length > 0) {
          where.serviceArea = {
            hasSome: filters.serviceArea,
          };
        }
      }

      return await prisma.agent.findMany({
        where,
        skip,
        take,
        orderBy: {
          performanceScore: 'desc',
        },
        include: {
          assignments: {
            take: 5,
            orderBy: {
              assignedAt: 'desc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find agents', { error, filters });
      throw error;
    }
  }

  async count(filters?: AgentFilters): Promise<number> {
    try {
      const where: Prisma.AgentWhereInput = {};

      if (filters) {
        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }
      }

      return await prisma.agent.count({ where });
    } catch (error) {
      logger.error('Failed to count agents', { error, filters });
      throw error;
    }
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    try {
      logger.info('Updating agent', { agentId: id });

      const agent = await prisma.agent.update({
        where: { id },
        data: input,
      });

      logger.info('Agent updated successfully', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent', { error, id, input });
      throw error;
    }
  }

  async delete(id: string): Promise<Agent> {
    try {
      logger.info('Deleting agent', { agentId: id });

      const agent = await prisma.agent.delete({
        where: { id },
      });

      logger.info('Agent deleted successfully', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to delete agent', { error, id });
      throw error;
    }
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    return this.update(id, { status });
  }

  async incrementCapacity(id: string): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          currentCapacity: {
            increment: 1,
          },
        },
      });

      logger.info('Agent capacity incremented', {
        agentId: id,
        newCapacity: agent.currentCapacity,
      });
      return agent;
    } catch (error) {
      logger.error('Failed to increment agent capacity', { error, id });
      throw error;
    }
  }

  async decrementCapacity(id: string): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          currentCapacity: {
            decrement: 1,
          },
        },
      });

      logger.info('Agent capacity decremented', {
        agentId: id,
        newCapacity: agent.currentCapacity,
      });
      return agent;
    } catch (error) {
      logger.error('Failed to decrement agent capacity', { error, id });
      throw error;
    }
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      totalLeadsHandled?: number;
      totalConversions?: number;
      conversionRate?: number;
      averageResponseTime?: number;
      performanceScore?: number;
    }
  ): Promise<Agent> {
    return this.update(id, metrics);
  }

  async getAvailableAgentsByInsuranceType(
    insuranceType: InsuranceType,
    limit = 20
  ): Promise<Agent[]> {
    try {
      return await prisma.agent.findMany({
        where: {
          status: AgentStatus.ACTIVE,
          specializations: {
            has: insuranceType,
          },
          currentCapacity: {
            lt: prisma.agent.fields.maxCapacity,
          },
        },
        take: limit,
        orderBy: [{ performanceScore: 'desc' }, { currentCapacity: 'asc' }],
      });
    } catch (error) {
      logger.error('Failed to get available agents', { error, insuranceType });
      throw error;
    }
  }

  async getTopPerformingAgents(limit = 10): Promise<Agent[]> {
    try {
      return await prisma.agent.findMany({
        where: {
          status: AgentStatus.ACTIVE,
        },
        take: limit,
        orderBy: [{ performanceScore: 'desc' }, { conversionRate: 'desc' }],
      });
    } catch (error) {
      logger.error('Failed to get top performing agents', { error });
      throw error;
    }
  }

  async getAgentsByLocation(state: string, zipCode?: string): Promise<Agent[]> {
    try {
      const where: Prisma.AgentWhereInput = {
        status: AgentStatus.ACTIVE,
        state,
      };

      if (zipCode) {
        where.OR = [{ zipCode }, { serviceArea: { has: zipCode } }];
      }

      return await prisma.agent.findMany({
        where,
        orderBy: {
          performanceScore: 'desc',
        },
      });
    } catch (error) {
      logger.error('Failed to get agents by location', { error, state, zipCode });
      throw error;
    }
  }

  async updateLoginTime(id: string): Promise<Agent> {
    return this.update(id, { lastLoginAt: new Date() });
  }
}

export const agentRepository = new AgentRepository();
