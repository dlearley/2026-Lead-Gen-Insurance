import { routingRepository } from '../repositories/routing.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CapacityMetrics {
  brokerId: string;
  currentLoadPercentage: number;
  activeLeadCount: number;
  maxCapacity: number;
  avgProcessingTime: number;
  slaComplianceRate: number;
  predictedCapacity: {
    availableSlots: number;
    expectedCapacity: number;
    overloadRisk: number;
  };
}

export interface LoadBalancingMetrics {
  totalBrokers: number;
  activeBrokers: number;
  overloadedBrokers: number;
  underutilizedBrokers: number;
  averageLoad: number;
  loadDistribution: {
    brokerId: string;
    loadPercentage: number;
    status: 'optimal' | 'overloaded' | 'underutilized';
  }[];
}

export class CapacityPlanner {
  private readonly DEFAULT_MAX_CAPACITY = 10;
  private readonly OVERLOAD_THRESHOLD = 0.85;
  private readonly UNDERUTILIZATION_THRESHOLD = 0.5;

  /**
   * Get current capacity metrics for a broker
   */
  async getBrokerCapacity(brokerId: string): Promise<CapacityMetrics | null> {
    const capacity = await routingRepository.getBrokerCapacity(brokerId);
    
    if (!capacity) {
      return null;
    }

    // Calculate predicted capacity
    const predictedCapacity = await this.predictBrokerCapacity(brokerId, capacity);

    return {
      brokerId,
      currentLoadPercentage: capacity.currentLoadPercentage,
      activeLeadCount: capacity.activeLeadCount,
      maxCapacity: capacity.maxCapacity,
      avgProcessingTime: capacity.avgProcessingTime,
      slaComplianceRate: capacity.slaComplianceRate,
      predictedCapacity,
    };
  }

  /**
   * Assign a lead to a broker and update capacity
   */
  async assignLeadToBroker(brokerId: string, leadId: string): Promise<boolean> {
    try {
      const capacity = await routingRepository.getBrokerCapacity(brokerId);
      
      if (!capacity) {
        // Initialize capacity record if it doesn't exist
        await routingRepository.createBrokerCapacity({
          brokerId,
          currentLoadPercentage: 0,
          activeLeadCount: 0,
          maxCapacity: this.DEFAULT_MAX_CAPACITY,
          avgProcessingTime: 0,
          slaComplianceRate: 0,
        });
      }

      // Check if broker can accept more leads
      const updatedCapacity = await routingRepository.updateBrokerCapacity(brokerId, {
        activeLeadCount: { increment: 1 },
        currentLoadPercentage: { 
          set: ((capacity?.activeLeadCount || 0) + 1) / (capacity?.maxCapacity || this.DEFAULT_MAX_CAPACITY) * 100 
        },
      });

      // Update the LeadAssignment record to track the assignment
      await prisma.leadAssignment.updateMany({
        where: {
          leadId,
          agentId: brokerId,
        },
        data: {
          assignedAt: new Date(),
        },
      });

      console.log(`Assigned lead ${leadId} to broker ${brokerId}. New load: ${updatedCapacity.currentLoadPercentage}%`);
      return true;

    } catch (error) {
      console.error(`Failed to assign lead ${leadId} to broker ${brokerId}:`, error);
      return false;
    }
  }

  /**
   * Remove a lead from a broker's capacity (when lead is completed/converted)
   */
  async removeLeadFromBroker(brokerId: string, leadId: string, outcome: 'converted' | 'rejected' | 'expired'): Promise<boolean> {
    try {
      const capacity = await routingRepository.getBrokerCapacity(brokerId);
      
      if (!capacity) {
        console.warn(`No capacity record found for broker ${brokerId}`);
        return false;
      }

      // Calculate new load percentage
      const newActiveCount = Math.max(0, capacity.activeLeadCount - 1);
      const newLoadPercentage = (newActiveCount / capacity.maxCapacity) * 100;

      // Update capacity
      await routingRepository.updateBrokerCapacity(brokerId, {
        activeLeadCount: newActiveCount,
        currentLoadPercentage: newLoadPercentage,
        // Update SLA compliance if lead was processed
        slaComplianceRate: outcome === 'converted' ? Math.min(100, capacity.slaComplianceRate + 1) : capacity.slaComplianceRate,
      });

      console.log(`Removed lead ${leadId} from broker ${brokerId}. New load: ${newLoadPercentage}%`);
      return true;

    } catch (error) {
      console.error(`Failed to remove lead ${leadId} from broker ${brokerId}:`, error);
      return false;
    }
  }

  /**
   * Update broker's maximum capacity
   */
  async updateBrokerCapacity(brokerId: string, newMaxCapacity: number): Promise<boolean> {
    try {
      if (newMaxCapacity < 1 || newMaxCapacity > 100) {
        throw new Error('Max capacity must be between 1 and 100');
      }

      await routingRepository.updateBrokerCapacity(brokerId, {
        maxCapacity: newMaxCapacity,
      });

      console.log(`Updated max capacity for broker ${brokerId} to ${newMaxCapacity}`);
      return true;

    } catch (error) {
      console.error(`Failed to update capacity for broker ${brokerId}:`, error);
      return false;
    }
  }

  /**
   * Predict future capacity for a broker
   */
  private async predictBrokerCapacity(brokerId: string, currentCapacity: any): Promise<any> {
    try {
      // Get historical processing data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAssignments = await prisma.leadAssignment.findMany({
        where: {
          agentId: brokerId,
          assignedAt: { gte: thirtyDaysAgo },
        },
        select: {
          assignedAt: true,
          convertedAt: true,
          rejectedAt: true,
        },
      });

      // Calculate average processing time
      const completedAssignments = recentAssignments.filter(a => a.convertedAt || a.rejectedAt);
      const avgProcessingTime = completedAssignments.length > 0
        ? completedAssignments.reduce((sum, a) => {
            const completionTime = a.convertedAt || a.rejectedAt;
            const assignedTime = a.assignedAt;
            const processingTime = completionTime ? (completionTime.getTime() - assignedTime.getTime()) / (1000 * 60 * 60 * 24) : 0; // days
            return sum + processingTime;
          }, 0) / completedAssignments.length
        : 1; // Default to 1 day

      // Calculate lead velocity (leads per day)
      const daysWithLeads = new Set(recentAssignments.map(a => a.assignedAt.toDateString())).size;
      const leadVelocity = daysWithLeads > 0 ? recentAssignments.length / daysWithLeads : 0;

      // Predict available slots based on processing time and velocity
      const expectedTurnoverTime = Math.max(0.5, avgProcessingTime); // Minimum 0.5 days
      const availableSlots = Math.max(0, Math.floor(currentCapacity.maxCapacity * (expectedTurnoverTime / (expectedTurnoverTime + leadVelocity))));

      // Calculate overload risk
      const overloadRisk = currentCapacity.currentLoadPercentage > this.OVERLOAD_THRESHOLD ? 
        Math.min(100, ((currentCapacity.currentLoadPercentage - this.OVERLOAD_THRESHOLD) / (1 - this.OVERLOAD_THRESHOLD)) * 100) : 0;

      return {
        availableSlots,
        expectedCapacity: Math.round(currentCapacity.maxCapacity * 0.8), // 80% of max as safe capacity
        overloadRisk,
      };

    } catch (error) {
      console.warn(`Failed to predict capacity for broker ${brokerId}:`, error);
      return {
        availableSlots: Math.max(0, (currentCapacity?.maxCapacity || 10) - (currentCapacity?.activeLeadCount || 0)),
        expectedCapacity: Math.round((currentCapacity?.maxCapacity || 10) * 0.8),
        overloadRisk: 0,
      };
    }
  }

  /**
   * Get load balancing metrics across all brokers
   */
  async getLoadBalancingMetrics(): Promise<LoadBalancingMetrics> {
    const allCapacity = await routingRepository.getAllBrokerCapacity();
    
    const metrics: LoadBalancingMetrics = {
      totalBrokers: allCapacity.length,
      activeBrokers: 0,
      overloadedBrokers: 0,
      underutilizedBrokers: 0,
      averageLoad: 0,
      loadDistribution: [],
    };

    let totalLoad = 0;

    for (const capacity of allCapacity) {
      const loadPercentage = capacity.currentLoadPercentage;
      totalLoad += loadPercentage;

      let status: 'optimal' | 'overloaded' | 'underutilized';
      
      if (loadPercentage > this.OVERLOAD_THRESHOLD * 100) {
        status = 'overloaded';
        metrics.overloadedBrokers++;
      } else if (loadPercentage < this.UNDERUTILIZATION_THRESHOLD * 100) {
        status = 'underutilized';
        metrics.underutilizedBrokers++;
      } else {
        status = 'optimal';
        metrics.activeBrokers++;
      }

      metrics.loadDistribution.push({
        brokerId: capacity.brokerId,
        loadPercentage,
        status,
      });
    }

    metrics.averageLoad = allCapacity.length > 0 ? totalLoad / allCapacity.length : 0;

    return metrics;
  }

  /**
   * Identify brokers that need capacity adjustments
   */
  async getCapacityRecommendations(): Promise<Array<{
    brokerId: string;
    currentLoad: number;
    recommendation: string;
    action: 'increase_capacity' | 'decrease_capacity' | 'redistribute_leads' | 'maintain';
    reasoning: string;
  }>> {
    const loadMetrics = await this.getLoadBalancingMetrics();
    const recommendations = [];

    for (const broker of loadMetrics.loadDistribution) {
      const capacity = await routingRepository.getBrokerCapacity(broker.brokerId);
      if (!capacity) continue;

      let recommendation: 'increase_capacity' | 'decrease_capacity' | 'redistribute_leads' | 'maintain';
      let reasoning: string;

      if (broker.status === 'overloaded') {
        // Check if broker consistently overloaded
        const recentOverloadDays = await this.getRecentOverloadDays(broker.brokerId);
        
        if (recentOverloadDays > 3) {
          recommendation = 'increase_capacity';
          reasoning = `Broker consistently overloaded for ${recentOverloadDays} days. Consider increasing max capacity.`;
        } else {
          recommendation = 'redistribute_leads';
          reasoning = 'High current load. Consider redistributing some leads to underutilized brokers.';
        }
      } else if (broker.status === 'underutilized') {
        // Check if broker has been underutilized for a while
        const recentUnderutilization = await this.getRecentUnderutilizationDays(broker.brokerId);
        
        if (recentUnderutilization > 7) {
          recommendation = 'decrease_capacity';
          reasoning = `Broker underutilized for ${recentUnderutilization} days. Consider reducing max capacity.`;
        } else {
          recommendation = 'maintain';
          reasoning = 'Temporary underutilization. Monitor for trend.';
        }
      } else {
        recommendation = 'maintain';
        reasoning = 'Optimal load level. Continue current capacity.';
      }

      recommendations.push({
        brokerId: broker.brokerId,
        currentLoad: broker.loadPercentage,
        recommendation,
        action: recommendation,
        reasoning,
      });
    }

    return recommendations.sort((a, b) => b.currentLoad - a.currentLoad);
  }

  /**
   * Get number of days broker has been overloaded recently
   */
  private async getRecentOverloadDays(brokerId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // This would need to track historical capacity data
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Get number of days broker has been underutilized recently
   */
  private async getRecentUnderutilizationDays(brokerId: string): Promise<number> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // This would need to track historical capacity data
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Rebalance load across brokers
   */
  async rebalanceLoad(targetLoadPercentage = 70): Promise<{
    successful: boolean;
    movedLeads: number;
    details: string[];
  }> {
    const loadMetrics = await this.getLoadBalancingMetrics();
    const details: string[] = [];
    let movedLeads = 0;

    try {
      // Identify overloaded and underutilized brokers
      const overloadedBrokers = loadMetrics.loadDistribution.filter(b => b.status === 'overloaded');
      const underutilizedBrokers = loadMetrics.loadDistribution.filter(b => b.status === 'underutilized');

      if (overloadedBrokers.length === 0 || underutilizedBrokers.length === 0) {
        return { successful: true, movedLeads: 0, details: ['No rebalancing needed'] };
      }

      // Move leads from overloaded to underutilized brokers
      for (const overloaded of overloadedBrokers) {
        const overloadedCapacity = await routingRepository.getBrokerCapacity(overloaded.brokerId);
        if (!overloadedCapacity) continue;

        const leadsToMove = Math.ceil((overloadedCapacity.currentLoadPercentage - targetLoadPercentage) / 100 * overloadedCapacity.maxCapacity);
        
        if (leadsToMove > 0) {
          // Get active leads from overloaded broker
          const activeAssignments = await prisma.leadAssignment.findMany({
            where: {
              agentId: overloaded.brokerId,
              status: 'PENDING',
            },
            take: leadsToMove,
            orderBy: { assignedAt: 'asc' }, // Move oldest first
          });

          // Redistribute to underutilized brokers
          for (let i = 0; i < activeAssignments.length && i < underutilizedBrokers.length; i++) {
            const assignment = activeAssignments[i];
            const targetBroker = underutilizedBrokers[i % underutilizedBrokers.length];

            // Update assignment
            await prisma.leadAssignment.update({
              where: { id: assignment.id },
              data: { agentId: targetBroker.brokerId },
            });

            // Update capacity for both brokers
            await this.removeLeadFromBroker(overloaded.brokerId, assignment.leadId, 'rejected');
            await this.assignLeadToBroker(targetBroker.brokerId, assignment.leadId);

            movedLeads++;
            details.push(`Moved lead ${assignment.leadId} from ${overloaded.brokerId} to ${targetBroker.brokerId}`);
          }
        }
      }

      console.log(`Load rebalancing completed. Moved ${movedLeads} leads.`);
      return { successful: true, movedLeads, details };

    } catch (error) {
      console.error('Load rebalancing failed:', error);
      return { 
        successful: false, 
        movedLeads, 
        details: [`Rebalancing failed: ${error.message}`] 
      };
    }
  }

  /**
   * Initialize capacity tracking for all brokers
   */
  async initializeCapacityTracking(): Promise<void> {
    const brokers = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    console.log(`Initializing capacity tracking for ${brokers.length} brokers...`);

    for (const broker of brokers) {
      try {
        // Get current active leads count
        const activeLeads = await prisma.leadAssignment.count({
          where: {
            agentId: broker.id,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        });

        // Calculate current load percentage
        const maxCapacity = this.DEFAULT_MAX_CAPACITY;
        const loadPercentage = (activeLeads / maxCapacity) * 100;

        // Create or update capacity record
        await routingRepository.createBrokerCapacity({
          brokerId: broker.id,
          currentLoadPercentage: loadPercentage,
          activeLeadCount: activeLeads,
          maxCapacity,
          avgProcessingTime: 240, // 4 hours default
          slaComplianceRate: 80, // 80% default
        });

        console.log(`Initialized capacity for broker ${broker.id}: ${loadPercentage}% load`);
      } catch (error) {
        console.error(`Failed to initialize capacity for broker ${broker.id}:`, error);
      }
    }

    console.log('Capacity tracking initialization completed');
  }

  /**
   * Get capacity trend data for a broker
   */
  async getCapacityTrend(brokerId: string, days = 30): Promise<Array<{
    date: string;
    loadPercentage: number;
    activeLeads: number;
    status: string;
  }>> {
    // This would need historical capacity tracking
    // For now, return mock data
    const trend = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trend.push({
        date: date.toISOString().split('T')[0],
        loadPercentage: 50 + Math.sin(i * 0.1) * 20, // Mock sinusoidal pattern
        activeLeads: Math.floor(5 + Math.sin(i * 0.1) * 3),
        status: 'optimal',
      });
    }

    return trend;
  }
}

export const capacityPlanner = new CapacityPlanner();