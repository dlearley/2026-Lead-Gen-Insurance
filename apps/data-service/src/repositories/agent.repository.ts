import { PrismaClient, Agent } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type { Agent as AgentType } from '@insurance-lead-gen/types';

export class AgentRepository {
  constructor(private prisma: PrismaClient) {}

  async createAgent(agentData: Omit<AgentType, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.create({
        data: {
          firstName: agentData.firstName,
          lastName: agentData.lastName,
          email: agentData.email,
          phone: agentData.phone,
          licenseNumber: agentData.licenseNumber,
          specializations: agentData.specializations,
          city: agentData.location.city,
          state: agentData.location.state,
          country: agentData.location.country,
          rating: agentData.rating || 0,
          isActive: agentData.isActive || true,
          maxLeadCapacity: agentData.maxLeadCapacity || 10,
          currentLeadCount: agentData.currentLeadCount || 0,
          averageResponseTime: agentData.averageResponseTime || 0,
          conversionRate: agentData.conversionRate || 0,
        },
      });

      logger.info('Agent created successfully', { agentId: agent.id });
      return agent;
    } catch (error) {
      logger.error('Failed to create agent', { error, agentData });
      throw error;
    }
  }

  async getAgentById(agentId: string): Promise<Agent | null> {
    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          assignments: true,
        },
      });

      if (!agent) {
        logger.warn('Agent not found', { agentId });
        return null;
      }

      logger.debug('Agent retrieved successfully', { agentId });
      return agent;
    } catch (error) {
      logger.error('Failed to get agent', { error, agentId });
      throw error;
    }
  }

  async updateAgent(agentId: string, updateData: Partial<AgentType>): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          phone: updateData.phone,
          licenseNumber: updateData.licenseNumber,
          specializations: updateData.specializations,
          city: updateData.location?.city,
          state: updateData.location?.state,
          country: updateData.location?.country,
          rating: updateData.rating,
          isActive: updateData.isActive,
          maxLeadCapacity: updateData.maxLeadCapacity,
          currentLeadCount: updateData.currentLeadCount,
          averageResponseTime: updateData.averageResponseTime,
          conversionRate: updateData.conversionRate,
        },
      });

      logger.info('Agent updated successfully', { agentId });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent', { error, agentId });
      throw error;
    }
  }

  async getAgentsBySpecialization(specialization: string): Promise<Agent[]> {
    try {
      const agents = await this.prisma.agent.findMany({
        where: {
          specializations: { has: specialization },
          isActive: true,
        },
        orderBy: { rating: 'desc' },
      });

      logger.debug('Retrieved agents by specialization', { specialization, count: agents.length });
      return agents;
    } catch (error) {
      logger.error('Failed to get agents by specialization', { error, specialization });
      throw error;
    }
  }

  async getAvailableAgents(): Promise<Agent[]> {
    try {
      const agents = await this.prisma.agent.findMany({
        where: {
          isActive: true,
          currentLeadCount: {
            lt: this.prisma.agent.fields.maxLeadCapacity,
          },
        },
        orderBy: { rating: 'desc' },
      });

      logger.debug('Retrieved available agents', { count: agents.length });
      return agents;
    } catch (error) {
      logger.error('Failed to get available agents', { error });
      throw error;
    }
  }

  async updateAgentPerformance(agentId: string, performanceData: {
    conversionRate?: number;
    averageResponseTime?: number;
    rating?: number;
  }): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          conversionRate: performanceData.conversionRate,
          averageResponseTime: performanceData.averageResponseTime,
          rating: performanceData.rating,
        },
      });

      logger.info('Agent performance updated', { agentId });
      return agent;
    } catch (error) {
      logger.error('Failed to update agent performance', { error, agentId });
      throw error;
    }
  }
}