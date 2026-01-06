import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  InsuranceLine,
  CustomerSegment,
  AgentTier,
  AgentMatch,
  AgentCapability,
  MatchFactor,
  PerformanceMetrics,
} from '@insurance-lead-gen/types';

const AGENT_TIERS: Record<number, AgentTier> = {
  90: 'Elite',
  75: 'Senior',
  50: 'Standard',
  0: 'Junior',
};

export class AgentMatchingService {
  constructor(private readonly prisma: PrismaClient) {}

  async findMatchingAgents(leadId: string): Promise<AgentMatch[]> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const insuranceLine = this.mapInsuranceType(lead.insuranceType);
    const customerSegment = this.determineCustomerSegment(lead);

    // Find agents with matching specializations
    const specializations = await this.prisma.agentSpecialization.findMany({
      where: {
        insuranceLine,
        isActive: true,
      },
      include: {
        agent: {
          include: {
            availability: true,
          },
        },
      },
    });

    // Filter agents by availability and customer segment
    const availableAgents = specializations.filter(spec => {
      if (spec.customerSegment !== customerSegment && spec.customerSegment !== 'Individual') {
        return false;
      }

      const agent = spec.agent;
      if (!agent.isActive) return false;
      if (!agent.availability) return false;

      return (
        agent.availability.status === 'Available' &&
        agent.availability.currentLoad < agent.availability.maxCapacity
      );
    });

    // Calculate match scores for each agent
    const matches: AgentMatch[] = await Promise.all(
      availableAgents.map(async spec => {
        const matchScore = await this.calculateAgentMatchScore(
          leadId,
          spec.agentId,
          insuranceLine,
          customerSegment
        );

        return matchScore;
      })
    );

    // Sort by fitness score (descending)
    matches.sort((a, b) => b.fitnessScore - a.fitnessScore);

    logger.info('Matching agents found', {
      leadId,
      totalMatches: matches.length,
      topMatch: matches[0]?.agentId,
    });

    return matches;
  }

  async calculateAgentMatchScore(
    leadId: string,
    agentId: string,
    insuranceLine: InsuranceLine,
    customerSegment: CustomerSegment
  ): Promise<AgentMatch> {
    const [specializationMatch, performanceScore, availabilityScore, capacityUtilization] =
      await Promise.all([
        this.calculateSpecializationMatch(leadId, agentId, insuranceLine, customerSegment),
        this.getPerformanceScore(agentId, insuranceLine),
        this.getAvailabilityScore(agentId),
        this.getCapacityUtilization(agentId),
      ]);

    const matchFactors: MatchFactor[] = [
      {
        factor: 'Specialization Match',
        score: specializationMatch,
        weight: 0.35,
        description: `Agent specializes in ${insuranceLine} for ${customerSegment}`,
      },
      {
        factor: 'Performance Score',
        score: performanceScore,
        weight: 0.35,
        description: `Historical conversion performance: ${performanceScore}%`,
      },
      {
        factor: 'Availability Score',
        score: availabilityScore,
        weight: 0.10,
        description: 'Agent currently available',
      },
      {
        factor: 'Capacity Utilization',
        score: 100 - capacityUtilization,
        weight: 0.20,
        description: `Current load: ${capacityUtilization}%`,
      },
    ];

    // Calculate weighted fitness score
    const fitnessScore =
      specializationMatch * 0.35 +
      performanceScore * 0.35 +
      availabilityScore * 0.10 +
      (100 - capacityUtilization) * 0.20;

    return {
      agentId,
      fitnessScore,
      specializationMatch,
      performanceScore,
      availabilityScore,
      capacityUtilization,
      matchFactors,
      estimatedResponseTime: this.estimateResponseTime(capacityUtilization, performanceScore),
    };
  }

  async calculateSpecializationMatch(
    leadId: string,
    agentId: string,
    insuranceLine: InsuranceLine,
    customerSegment: CustomerSegment
  ): Promise<number> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const specializations = await this.prisma.agentSpecialization.findMany({
      where: { agentId },
    });

    // Find exact match
    const exactMatch = specializations.find(
      spec => spec.insuranceLine === insuranceLine && spec.customerSegment === customerSegment
    );

    if (exactMatch) {
      return 100;
    }

    // Find insurance line match (any customer segment)
    const lineMatch = specializations.find(spec => spec.insuranceLine === insuranceLine);
    if (lineMatch) {
      return 80;
    }

    // Find customer segment match (any insurance line)
    const segmentMatch = specializations.find(spec => spec.customerSegment === customerSegment);
    if (segmentMatch) {
      return 60;
    }

    return 30; // Base match for any active agent
  }

  async getPerformanceScore(agentId: string, insuranceLine: InsuranceLine): Promise<number> {
    // Get recent performance metrics
    const performance = await this.prisma.agentPerformanceMetrics.findFirst({
      where: {
        agentId,
        periodDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { periodDate: 'desc' },
    });

    if (!performance) {
      // Use agent's base conversion rate from Agent model
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      return agent?.conversionRate ? agent.conversionRate * 100 : 50;
    }

    // Calculate performance score based on multiple metrics
    const conversionScore = performance.conversionRate * 100;
    const satisfactionScore = performance.customerSatisfactionRating || 70;
    const handlingTimeScore = Math.max(0, 100 - performance.avgHandlingTimeMinutes * 2);
    const crossSellScore = performance.crossSellRate * 50;

    const avgScore = (conversionScore + satisfactionScore + handlingTimeScore + crossSellScore) / 4;

    // Tier-specific conversion rates
    if (insuranceLine === 'Auto') {
      return (avgScore + performance.tier1ConversionRate * 30) / 1.3;
    } else if (insuranceLine === 'Home') {
      return (avgScore + performance.tier2ConversionRate * 30) / 1.3;
    }

    return avgScore;
  }

  async getAvailabilityScore(agentId: string): Promise<number> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
    });

    if (!availability) {
      return 0;
    }

    const statusScores: Record<string, number> = {
      Available: 100,
      In_Call: 0,
      Break: 30,
      Training: 20,
      Offline: 0,
    };

    return statusScores[availability.status] || 0;
  }

  async getCapacityUtilization(agentId: string): Promise<number> {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { agentId },
    });

    if (!availability) {
      return 100;
    }

    if (availability.maxCapacity === 0) {
      return 0;
    }

    return (availability.currentLoad / availability.maxCapacity) * 100;
  }

  async getAgentCapability(agentId: string): Promise<AgentCapability> {
    const [specializations, availability, performance, agent] = await Promise.all([
      this.prisma.agentSpecialization.findMany({
        where: { agentId },
      }),
      this.prisma.agentAvailability.findUnique({
        where: { agentId },
      }),
      this.prisma.agentPerformanceMetrics.findFirst({
        where: {
          agentId,
          periodDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { periodDate: 'desc' },
      }),
      this.prisma.agent.findUnique({
        where: { id: agentId },
      }),
    ]);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const tier = this.getAgentTier(agent.rating);

    const overallPerformance = performance?.conversionRate
      ? performance.conversionRate * 100
      : agent.rating * 100;

    const languages = specializations.flatMap(spec => spec.languages as string[]);

    const territories = specializations.flatMap(spec => spec.territories as string[]);

    return {
      agentId,
      specializations,
      tier,
      overallPerformance,
      languages: [...new Set(languages)],
      territories: [...new Set(territories)],
      canHandleComplexCases: tier === 'Elite' || tier === 'Senior',
      isRetentionSpecialist: specializations.some(spec => spec.proficiencyLevel >= 4),
      claimsExpertise: specializations.some(
        spec => spec.insuranceLine === 'Home' && spec.proficiencyLevel >= 4
      ),
      renewalExpertise: specializations.some(
        spec => spec.insuranceLine === 'Auto' && spec.proficiencyLevel >= 3
      ),
    };
  }

  async getAgentTier(agentId: string): Promise<AgentTier> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return this.getAgentTier(agent.rating);
  }

  getAgentTier(rating: number): AgentTier {
    if (rating >= 0.9) return 'Elite';
    if (rating >= 0.75) return 'Senior';
    if (rating >= 0.5) return 'Standard';
    return 'Junior';
  }

  async updateAgentSpecializations(
    agentId: string,
    specializations: Array<{
      insuranceLine: InsuranceLine;
      customerSegment: CustomerSegment;
      proficiencyLevel: number;
      maxConcurrentLeads?: number;
      languages?: string[];
      territories?: string[];
    }>
  ): Promise<void> {
    for (const spec of specializations) {
      await this.prisma.agentSpecialization.upsert({
        where: {
          agentId_insuranceLine_customerSegment: {
            agentId,
            insuranceLine: spec.insuranceLine,
            customerSegment: spec.customerSegment,
          },
        },
        create: {
          agentId,
          insuranceLine: spec.insuranceLine,
          customerSegment: spec.customerSegment,
          proficiencyLevel: spec.proficiencyLevel,
          maxConcurrentLeads: spec.maxConcurrentLeads || 5,
          languages: spec.languages || [],
          territories: spec.territories || [],
        },
        update: {
          proficiencyLevel: spec.proficiencyLevel,
          maxConcurrentLeads: spec.maxConcurrentLeads,
          languages: spec.languages,
          territories: spec.territories,
        },
      });
    }

    logger.info('Agent specializations updated', {
      agentId,
      count: specializations.length,
    });
  }

  private mapInsuranceType(insuranceType?: string | null): InsuranceLine {
    if (!insuranceType) return 'Auto';

    const typeMap: Record<string, InsuranceLine> = {
      AUTO: 'Auto',
      HOME: 'Home',
      LIFE: 'Life',
      HEALTH: 'Health',
      COMMERCIAL: 'Commercial',
    };

    return typeMap[insuranceType.toUpperCase()] || 'Auto';
  }

  private determineCustomerSegment(lead: any): CustomerSegment {
    if (lead.metadata?.['company_name'] || lead.metadata?.['employee_count']) {
      if ((lead.metadata['employee_count'] as number) > 250) {
        return 'Enterprise';
      }
      if ((lead.metadata['employee_count'] as number) > 10) {
        return 'SMB';
      }
    }
    return 'Individual';
  }

  private estimateResponseTime(capacityUtilization: number, performanceScore: number): number {
    // Higher utilization = slower response
    // Higher performance = faster response
    const baseResponseTime = 15; // minutes
    const utilizationMultiplier = 1 + capacityUtilization / 100;
    const performanceMultiplier = 1 - performanceScore / 200;

    return Math.ceil(baseResponseTime * utilizationMultiplier * performanceMultiplier);
  }
}
