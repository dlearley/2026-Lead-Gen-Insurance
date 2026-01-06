import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  RoutingStrategy,
  RoutingResult,
  RoutingExplanation,
  ValidationResult,
  ValidationViolation,
  AssignmentReason,
  RoutingFactor,
  AlternativeAssignment,
} from '@insurance-lead-gen/types';

import { LeadPrioritizationService } from './lead-prioritization.service.js';
import { AgentMatchingService } from './agent-matching.service.js';
import { CapacityManagementService } from './capacity-management.service.js';

export class RoutingEngineService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leadPrioritization: LeadPrioritizationService,
    private readonly agentMatching: AgentMatchingService,
    private readonly capacityManagement: CapacityManagementService
  ) {}

  async routeLead(
    leadId: string,
    strategy: RoutingStrategy = 'greedy',
    preferredAgentId?: string,
    force = false
  ): Promise<RoutingResult> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Calculate lead score
      const leadScore = await this.leadPrioritization.calculateLeadScore(leadId);
      const tier = await this.leadPrioritization.assignLeadTier(leadScore);

      // Check for preferred agent
      if (preferredAgentId) {
        const validation = await this.validateRouting(leadId, preferredAgentId);
        if (validation.isValid || force) {
          const result = await this.assignToAgent(leadId, preferredAgentId, strategy, leadScore);
          return result;
        }
      }

      // Apply custom routing rules
      const routingAction = await this.applyRoutingRules(leadId);
      if (routingAction.type === 'assign_to' && routingAction.params.agentId) {
        const result = await this.assignToAgent(
          leadId,
          routingAction.params.agentId as string,
          strategy,
          leadScore
        );
        return result;
      }

      // Find matching agents
      const matchingAgents = await this.agentMatching.findMatchingAgents(leadId);

      if (matchingAgents.length === 0) {
        logger.warn('No matching agents found', { leadId });
        return {
          success: false,
          leadId,
          strategy,
          score: leadScore,
          slaMet: false,
          createdAt: new Date(),
        };
      }

      // Select best agent based on strategy
      const selectedAgent = await this.selectAgentByStrategy(
        matchingAgents,
        strategy,
        leadId,
        tier
      );

      if (!selectedAgent) {
        // Add to queue if no available agents
        await this.addToQueue(leadId, 'waiting', leadScore);
        return {
          success: false,
          leadId,
          queueType: 'waiting',
          strategy,
          score: leadScore,
          slaMet: true,
          createdAt: new Date(),
        };
      }

      // Assign lead to agent
      const result = await this.assignToAgent(
        leadId,
        selectedAgent.agentId,
        strategy,
        leadScore
      );

      return result;
    } catch (error) {
      logger.error('Error routing lead', { error, leadId });
      throw error;
    }
  }

  async batchRouteLeads(
    leadIds: string[],
    strategy: 'greedy' | 'optimal'
  ): Promise<RoutingResult[]> {
    const results: RoutingResult[] = [];

    if (strategy === 'optimal') {
      // Use Hungarian algorithm for optimal batch assignment
      const optimalAssignments = await this.optimalBatchAssignment(leadIds);
      for (const assignment of optimalAssignments) {
        const result = await this.assignToAgent(
          assignment.leadId,
          assignment.agentId,
          strategy,
          assignment.leadScore
        );
        results.push(result);
      }
    } else {
      // Greedy assignment for each lead
      for (const leadId of leadIds) {
        const result = await this.routeLead(leadId, strategy);
        results.push(result);
      }
    }

    logger.info('Batch routing completed', {
      totalLeads: leadIds.length,
      strategy,
      successful: results.filter(r => r.success).length,
    });

    return results;
  }

  async rerouteLead(leadId: string, reason: string): Promise<RoutingResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Find current assignment
    const currentAssignment = await this.prisma.leadAssignment.findFirst({
      where: {
        leadId,
        status: 'PENDING',
      },
      orderBy: { assignedAt: 'desc' },
    });

    let previousAgentId: string | undefined;
    if (currentAssignment) {
      previousAgentId = currentAssignment.agentId;

      // Update current assignment status
      await this.prisma.leadAssignment.update({
        where: { id: currentAssignment.id },
        data: { status: 'REJECTED' },
      });

      // Decrease previous agent's load
      if (previousAgentId) {
        await this.capacityManagement.updateAgentLoad(previousAgentId, -1);
      }
    }

    // Create routing event
    await this.prisma.routingEvent.create({
      data: {
        leadId,
        eventType: 'reassigned',
        agentId: previousAgentId,
        eventData: {
          reason,
          previousAgentId,
          timestamp: new Date(),
        },
      },
    });

    // Route to new agent
    const result = await this.routeLead(leadId, 'greedy');

    logger.info('Lead rerouted', {
      leadId,
      previousAgentId,
      newAgentId: result.assignedAgentId,
      reason,
    });

    return result;
  }

  async getRoutingExplanation(leadId: string): Promise<RoutingExplanation> {
    const routingHistory = await this.prisma.leadRoutingHistory.findFirst({
      where: { leadId },
      orderBy: { routingTimestamp: 'desc' },
      include: {
        agent: true,
      },
    });

    if (!routingHistory) {
      throw new Error(`No routing history found for lead: ${leadId}`);
    }

    const leadScore = await this.leadPrioritization.getLeadScore(leadId);
    const agentMatches = await this.agentMatching.findMatchingAgents(leadId);

    const matchedAgent = agentMatches.find(
      m => m.agentId === routingHistory.assignedAgentId
    );

    const agentMatchScore = matchedAgent?.fitnessScore || 0;

    const factors: RoutingFactor[] = matchedAgent?.matchFactors.map(f => ({
      factor: f.factor,
      value: f.score,
      impact: f.score > 70 ? 'positive' : f.score > 40 ? 'neutral' : 'negative',
      weight: f.weight,
      contribution: f.score * f.weight,
    })) || [];

    const alternatives: AlternativeAssignment[] = agentMatches
      .filter(m => m.agentId !== routingHistory.assignedAgentId)
      .slice(0, 3)
      .map(m => ({
        agentId: m.agentId,
        agentName: '', // Would need to fetch from agent table
        score: m.fitnessScore,
        reason: m.fitnessScore < agentMatchScore ? 'Lower match score' : 'Available alternative',
      }));

    return {
      leadId,
      assignedAgentId: routingHistory.assignedAgentId,
      leadScore: leadScore.score,
      agentMatchScore,
      factors,
      alternatives,
      confidence: agentMatchScore > 80 ? 0.9 : agentMatchScore > 60 ? 0.75 : 0.5,
    };
  }

  async applyRoutingRules(leadId: string): Promise<{ type: string; params: Record<string, unknown> }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Get active routing rules
    const rules = await this.prisma.routingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      if (this.evaluateRuleCondition(rule.condition as Record<string, unknown>, lead)) {
        return {
          type: rule.action,
          params: rule.condition as Record<string, unknown>,
        };
      }
    }

    return { type: 'default', params: {} };
  }

  async validateRouting(leadId: string, agentId: string): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const warnings: string[] = [];

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      violations.push({
        type: 'incompatible',
        message: `Lead not found: ${leadId}`,
        severity: 'error',
      });
      return { isValid: false, violations, warnings };
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        availability: true,
        specializationsDetail: true,
      },
    });

    if (!agent) {
      violations.push({
        type: 'incompatible',
        message: `Agent not found: ${agentId}`,
        severity: 'error',
      });
      return { isValid: false, violations, warnings };
    }

    // Check agent availability
    if (!agent.availability || agent.availability.status !== 'Available') {
      violations.push({
        type: 'unavailable',
        message: `Agent is not available (status: ${agent.availability?.status})`,
        severity: 'error',
      });
    }

    // Check agent capacity
    if (agent.availability && agent.availability.currentLoad >= agent.availability.maxCapacity) {
      violations.push({
        type: 'over_capacity',
        message: `Agent is at maximum capacity (${agent.availability.currentLoad}/${agent.availability.maxCapacity})`,
        severity: 'error',
      });
    }

    // Check specialization match
    const hasMatchingSpecialization = agent.specializationsDetail.some(
      spec =>
        spec.insuranceLine.toLowerCase() === (lead.insuranceType?.toLowerCase() || 'auto')
    );

    if (!hasMatchingSpecialization) {
      warnings.push('Agent does not have matching specialization for this lead');
    }

    // Check for conflicts (agent's own policy)
    if (lead.metadata?.['existing_agent_id'] === agentId) {
      violations.push({
        type: 'conflict',
        message: 'Cannot assign lead to agent who already has this policy',
        severity: 'error',
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
    };
  }

  private async selectAgentByStrategy(
    matchingAgents: any[],
    strategy: RoutingStrategy,
    leadId: string,
    tier: string
  ): Promise<any> {
    if (matchingAgents.length === 0) {
      return null;
    }

    if (strategy === 'greedy') {
      // Greedy: select agent with highest fitness score
      return matchingAgents[0];
    }

    if (strategy === 'optimal') {
      // Optimal: consider overall system optimization
      return matchingAgents[0];
    }

    // Default to greedy
    return matchingAgents[0];
  }

  private async assignToAgent(
    leadId: string,
    agentId: string,
    strategy: RoutingStrategy,
    leadScore: number
  ): Promise<RoutingResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Create lead assignment
    const assignment = await this.prisma.leadAssignment.create({
      data: {
        leadId,
        agentId,
        status: 'PENDING',
      },
    });

    // Create routing history entry
    const leadScoreData = await this.leadPrioritization.getLeadScore(leadId);
    const assignmentReason: AssignmentReason = {
      specializationMatch: leadScoreData.score * 0.35,
      capacityScore: 50,
      performanceScore: agent.rating * 100,
      availabilityBonus: 10,
      totalScore: leadScoreData.score,
      explanation: ['Specialization matched', 'Agent available'],
    };

    await this.prisma.leadRoutingHistory.create({
      data: {
        leadId,
        assignedAgentId: agentId,
        routingStrategy: strategy,
        leadScore,
        assignmentReason: assignmentReason as any,
      },
    });

    // Create routing event
    await this.prisma.routingEvent.create({
      data: {
        leadId,
        eventType: 'assigned',
        agentId,
        eventData: {
          strategy,
          score: leadScore,
          timestamp: new Date(),
        },
      },
    });

    // Update agent load
    await this.capacityManagement.updateAgentLoad(agentId, 1);

    // Update lead status
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'ROUTED' },
    });

    // Remove from queue if present
    const queueEntry = await this.prisma.assignmentQueue.findUnique({
      where: { leadId },
    });
    if (queueEntry) {
      await this.prisma.assignmentQueue.delete({
        where: { id: queueEntry.id },
      });
    }

    const slaStatus = await this.leadPrioritization.getSLAStatus(leadId);

    logger.info('Lead assigned successfully', {
      leadId,
      agentId,
      strategy,
      score: leadScore,
      slaMet: slaStatus.status !== 'breached',
    });

    return {
      success: true,
      leadId,
      assignedAgentId: agentId,
      strategy,
      score: leadScore,
      assignmentReason,
      slaMet: slaStatus.status !== 'breached',
      createdAt: new Date(),
    };
  }

  private async addToQueue(leadId: string, queueType: string, leadScore: number): Promise<void> {
    const tier = await this.leadPrioritization.assignLeadTier(leadScore);
    const slaLimits: Record<string, number> = {
      Tier1: 2,
      Tier2: 24,
      Tier3: 48,
      Tier4: 168,
    };

    const slaExpiry = new Date(Date.now() + slaLimits[tier] * 60 * 60 * 1000);

    await this.prisma.assignmentQueue.upsert({
      where: { leadId },
      create: {
        queueType,
        leadId,
        leadScore,
        timeInQueue: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        assignmentAttempts: 0,
        estimatedWaitMinutes: 60,
        slaExpiry,
        queuePosition: 0,
      },
      update: {
        queueType,
        leadScore,
        updatedAt: new Date(),
      },
    });

    logger.info('Lead added to queue', {
      leadId,
      queueType,
      tier,
    });
  }

  private async optimalBatchAssignment(
    leadIds: string[]
  ): Promise<Array<{ leadId: string; agentId: string; leadScore: number }>> {
    // Simple optimal assignment: use Hungarian algorithm approximation
    // For production, implement full Hungarian algorithm or use a library

    const assignments: Array<{ leadId: string; agentId: string; leadScore: number }> = [];

    for (const leadId of leadIds) {
      const matchingAgents = await this.agentMatching.findMatchingAgents(leadId);

      if (matchingAgents.length > 0) {
        const leadScore = await this.leadPrioritization.calculateLeadScore(leadId);
        assignments.push({
          leadId,
          agentId: matchingAgents[0].agentId,
          leadScore,
        });
      }
    }

    return assignments;
  }

  private evaluateRuleCondition(
    condition: Record<string, unknown>,
    lead: any
  ): boolean {
    const field = condition.field as string;
    const operator = condition.operator as string;
    const value = condition.value;

    // Simple condition evaluation
    switch (operator) {
      case 'eq':
        return lead[field] === value;
      case 'ne':
        return lead[field] !== value;
      case 'gt':
        return (lead[field] as number) > (value as number);
      case 'gte':
        return (lead[field] as number) >= (value as number);
      case 'lt':
        return (lead[field] as number) < (value as number);
      case 'lte':
        return (lead[field] as number) <= (value as number);
      case 'in':
        return Array.isArray(value) && value.includes(lead[field]);
      case 'contains':
        return String(lead[field]).toLowerCase().includes(String(value).toLowerCase());
      default:
        return false;
    }
  }
}
