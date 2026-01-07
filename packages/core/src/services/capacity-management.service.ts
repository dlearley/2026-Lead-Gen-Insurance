import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  AgentCapacity,
  AgentStatus,
  CapacityHeatmap,
  CapacityForecast,
} from '@insurance-lead-gen/types';

const DEFAULT_CAPACITY = {
  defaultMaxConcurrentLeads: 5,
  eliteMaxConcurrentLeads: 8,
  capacityUtilizationTarget: 80,
};

export class CapacityManagementService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAvailableCapacity(agentId: string): Promise<number> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
      include: {
        agent: true,
      },
    });

    if (!availability) {
      throw new Error(`Agent availability not found: ${agentId}`);
    }

    const maxCapacity = availability.maxCapacity || DEFAULT_CAPACITY.defaultMaxConcurrentLeads;
    const available = Math.max(0, maxCapacity - availability.currentLoad);

    return available;
  }

  async updateAgentStatus(
    agentId: string,
    status: AgentStatus,
    maxCapacity?: number
  ): Promise<void> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        availability: true,
      },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Calculate max capacity based on agent tier if not provided
    let finalMaxCapacity = maxCapacity;
    if (!finalMaxCapacity) {
      const rating = agent.rating || 0.5;
      if (rating >= 0.9) {
        finalMaxCapacity = DEFAULT_CAPACITY.eliteMaxConcurrentLeads;
      } else {
        finalMaxCapacity = DEFAULT_CAPACITY.defaultMaxConcurrentLeads;
      }
    }

    if (agent.availability) {
      // Update existing availability
      await this.prisma.agentAvailability.update({
        where: { agentId },
        data: {
          status,
          maxCapacity: finalMaxCapacity,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new availability record
      await this.prisma.agentAvailability.create({
        data: {
          agentId,
          status,
          currentLoad: 0,
          maxCapacity: finalMaxCapacity,
          lastUpdated: new Date(),
        },
      });
    }

    logger.info('Agent status updated', {
      agentId,
      status,
      maxCapacity: finalMaxCapacity,
    });
  }

  async canAcceptLead(agentId: string): Promise<boolean> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
    });

    if (!availability) {
      return false;
    }

    return (
      availability.status === 'Available' &&
      availability.currentLoad < availability.maxCapacity
    );
  }

  async getAgentsForLoadBalancing(specialization?: string): Promise<any[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        isActive: true,
      },
      include: {
        availability: true,
        specializationsDetail: {
          where: specialization ? { insuranceLine: specialization } : undefined,
        },
      },
    });

    // Filter by availability
    const availableAgents = agents.filter(agent => {
      if (!agent.availability) return false;
      if (agent.availability.status !== 'Available') return false;
      if (agent.availability.currentLoad >= agent.availability.maxCapacity) return false;
      return true;
    });

    // Sort by utilization (lowest first) and performance (highest first)
    availableAgents.sort((a, b) => {
      const aUtilization = this.calculateUtilization(a.availability!);
      const bUtilization = this.calculateUtilization(b.availability!);

      if (Math.abs(aUtilization - bUtilization) < 5) {
        // If utilization is similar, prefer higher performance
        return b.rating - a.rating;
      }

      return aUtilization - bUtilization;
    });

    return availableAgents;
  }

  async getPredictedCapacity(agentId: string, minutes: number): Promise<number> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
      include: {
        agent: {
          include: {
            assignments: {
              where: {
                status: 'PENDING',
                assignedAt: {
                  gte: new Date(Date.now() - 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!availability) {
      return 0;
    }

    const currentLoad = availability.currentLoad;
    const maxCapacity = availability.maxCapacity;

    // Predict load based on average handling time
    const avgHandlingTime = 30; // minutes (default estimate)
    const avgCompletionRate = 2 / avgHandlingTime; // leads completed per minute
    const predictedCompletions = Math.floor(avgCompletionRate * minutes);

    // Predict incoming load based on historical patterns
    const hour = new Date().getHours();
    const peakHours = [9, 10, 11, 14, 15, 16];
    const isPeakHour = peakHours.includes(hour);
    const predictedIncoming = isPeakHour ? Math.floor(minutes / 20) : Math.floor(minutes / 40);

    const predictedLoad = Math.max(0, currentLoad - predictedCompletions + predictedIncoming);
    const predictedAvailableCapacity = Math.max(0, maxCapacity - predictedLoad);

    return predictedAvailableCapacity;
  }

  async getCapacityHeatmap(): Promise<CapacityHeatmap[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        isActive: true,
      },
      include: {
        availability: true,
        specializationsDetail: true,
      },
    });

    const heatmap: CapacityHeatmap[] = agents.map(agent => {
      const utilization = agent.availability
        ? this.calculateUtilization(agent.availability)
        : 0;

      const availableSlots = agent.availability
        ? Math.max(0, agent.availability.maxCapacity - agent.availability.currentLoad)
        : 0;

      const specializations = agent.specializationsDetail.map(
        spec => spec.insuranceLine
      ) as string[];

      return {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        status: (agent.availability?.status || 'Offline') as AgentStatus,
        utilization,
        availableSlots,
        specializations,
        territories: agent.state ? [agent.state] : [],
      };
    });

    // Sort by utilization (descending)
    heatmap.sort((a, b) => b.utilization - a.utilization);

    return heatmap;
  }

  async updateAgentLoad(agentId: string, delta: number): Promise<void> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
    });

    if (!availability) {
      throw new Error(`Agent availability not found: ${agentId}`);
    }

    const newLoad = Math.max(0, availability.currentLoad + delta);

    await this.prisma.agentAvailability.update({
      where: { agentId },
      data: {
        currentLoad: newLoad,
        lastUpdated: new Date(),
      },
    });

    logger.info('Agent load updated', {
      agentId,
      previousLoad: availability.currentLoad,
      newLoad,
      delta,
    });
  }

  async getAgentCapacity(agentId: string): Promise<AgentCapacity> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
    });

    if (!availability) {
      throw new Error(`Agent availability not found: ${agentId}`);
    }

    const currentLoad = availability.currentLoad;
    const maxCapacity = availability.maxCapacity;
    const availableCapacity = maxCapacity - currentLoad;
    const utilizationRate = this.calculateUtilization(availability);

    // Predict capacity for next hour
    const predictedCapacity = await this.getPredictedCapacity(agentId, 60);

    return {
      agentId,
      currentLoad,
      maxCapacity,
      availableCapacity,
      predictedCapacity,
      utilizationRate,
      status: availability.status as AgentStatus,
      lastUpdated: availability.lastUpdated,
    };
  }

  async getTeamCapacity(teamIds?: string[]): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    utilizationRate: number;
    agents: AgentCapacity[];
  }> {
    const whereClause = teamIds ? { id: { in: teamIds } } : undefined;

    const availabilities = await this.prisma.agentAvailability.findMany({
      where: {
        ...whereClause,
        agent: {
          isActive: true,
        },
      },
      include: {
        agent: true,
      },
    });

    let totalCapacity = 0;
    let usedCapacity = 0;

    const agentCapacities: AgentCapacity[] = await Promise.all(
      availabilities.map(async avail => {
        const capacity = await this.getAgentCapacity(avail.agentId);
        totalCapacity += capacity.maxCapacity;
        usedCapacity += capacity.currentLoad;
        return capacity;
      })
    );

    const availableCapacity = totalCapacity - usedCapacity;
    const utilizationRate = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

    return {
      totalCapacity,
      usedCapacity,
      availableCapacity,
      utilizationRate,
      agents: agentCapacities,
    };
  }

  async rebalanceLoad(targetUtilization: number = DEFAULT_CAPACITY.capacityUtilizationTarget): Promise<number> {
    const teamCapacity = await this.getTeamCapacity();

    // If overall utilization is already balanced, return
    if (Math.abs(teamCapacity.utilizationRate - targetUtilization) < 5) {
      logger.info('Load already balanced', {
        currentUtilization: teamCapacity.utilizationRate,
        target: targetUtilization,
      });
      return 0;
    }

    // Get agents sorted by utilization
    const sortedAgents = [...teamCapacity.agents].sort(
      (a, b) => a.utilizationRate - b.utilizationRate
    );

    let rebalanced = 0;

    // Simple load balancing: suggest transfers from high to low utilization agents
    const overloadedAgents = sortedAgents.filter(
      a => a.utilizationRate > targetUtilization + 10
    );
    const underloadedAgents = sortedAgents.filter(
      a => a.utilizationRate < targetUtilization - 10
    );

    for (const overloaded of overloadedAgents) {
      if (underloadedAgents.length === 0) break;

      const excess = overloaded.currentLoad - (overloaded.maxCapacity * targetUtilization) / 100;

      for (const underloaded of underloadedAgents) {
        const capacity = underloaded.availableCapacity;
        const transferAmount = Math.min(excess, capacity);

        if (transferAmount > 0) {
          // In a real system, this would trigger lead reassignments
          logger.info('Load rebalance suggestion', {
            fromAgentId: overloaded.agentId,
            toAgentId: underloaded.agentId,
            suggestedTransfer: transferAmount,
          });

          rebalanced += transferAmount;
        }

        if (transferAmount >= excess) break;
      }
    }

    return rebalanced;
  }

  async getCapacityForecast(hours: number = 8): Promise<CapacityForecast[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        isActive: true,
      },
      include: {
        availability: true,
      },
    });

    const forecasts: CapacityForecast[] = [];

    for (const agent of agents) {
      if (!agent.availability) continue;

      const predictedCapacity = await this.getPredictedCapacity(agent.id, hours * 60);

      // Calculate confidence based on historical data
      const historicalVariability = 20; // percent (simulated)
      const confidence = Math.max(50, 100 - historicalVariability * (hours / 24));

      forecasts.push({
        agentId: agent.id,
        timeSlot: `${new Date().toISOString().split('T')[0]} ${hours}h forecast`,
        predictedLoad: agent.availability.maxCapacity - predictedCapacity,
        predictedAvailableCapacity: predictedCapacity,
        confidence,
      });
    }

    return forecasts;
  }

  private calculateUtilization(availability: any): number {
    if (availability.maxCapacity === 0) return 0;
    return (availability.currentLoad / availability.maxCapacity) * 100;
  }
}
