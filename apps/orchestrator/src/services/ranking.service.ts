import { Agent, Lead } from '@insurance-lead-gen/types';

export interface RankingCriteria {
  specializationMatch: number;
  proximityScore: number;
  performanceScore: number;
  availabilityScore: number;
}

export interface RankedAgent extends Agent {
  score: number;
  breakdown: RankingCriteria;
}

export class RankingService {
  /**
   * Ranks agents for a given lead based on multiple criteria.
   */
  public rankAgents(lead: Lead, agents: Agent[]): RankedAgent[] {
    const rankedAgents = agents.map((agent) => {
      const breakdown = {
        specializationMatch: this.calculateSpecializationMatch(lead, agent),
        proximityScore: this.calculateProximityScore(lead, agent),
        performanceScore: this.calculatePerformanceScore(agent),
        availabilityScore: this.calculateAvailabilityScore(agent),
      };

      const score = this.calculateFinalScore(breakdown);

      return {
        ...agent,
        score,
        breakdown,
      };
    });

    return rankedAgents.sort((a, b) => b.score - a.score);
  }

  private calculateSpecializationMatch(lead: Lead, agent: Agent): number {
    if (!lead.insuranceType) return 0.5;
    return agent.specializations.includes(lead.insuranceType) ? 1 : 0;
  }

  private calculateProximityScore(lead: Lead, agent: Agent): number {
    if (!lead.address?.state || !agent.location.state) return 0.5;

    if (lead.address.state.toLowerCase() === agent.location.state.toLowerCase()) {
      if (
        lead.address.city &&
        agent.location.city &&
        lead.address.city.toLowerCase() === agent.location.city.toLowerCase()
      ) {
        return 1;
      }
      return 0.8;
    }
    return 0.2;
  }

  private calculatePerformanceScore(agent: Agent): number {
    // Combine rating (0-5) and conversion rate (0-1)
    const normalizedRating = agent.rating / 5;
    // Weighted combination: 40% rating, 60% conversion rate
    return normalizedRating * 0.4 + agent.conversionRate * 0.6;
  }

  private calculateAvailabilityScore(agent: Agent): number {
    if (!agent.isActive) return 0;

    if (agent.maxLeadCapacity <= 0) return 0;

    const capacityRemaining =
      (agent.maxLeadCapacity - agent.currentLeadCount) / agent.maxLeadCapacity;
    return Math.max(0, capacityRemaining);
  }

  private calculateFinalScore(criteria: RankingCriteria): number {
    // Weighted average
    // Weights: Specialization (40%), Proximity (20%), Performance (20%), Availability (20%)
    return (
      criteria.specializationMatch * 0.4 +
      criteria.proximityScore * 0.2 +
      criteria.performanceScore * 0.2 +
      criteria.availabilityScore * 0.2
    );
  }
}
