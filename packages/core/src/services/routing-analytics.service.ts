import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  RoutingMetrics,
  QualityMetrics,
  StrategyComparison,
  MatchQuality,
  Improvement,
  LeadTier,
  AgentTier,
} from '@insurance-lead-gen/types';

export class RoutingAnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getRoutingMetrics(
    period: { start: Date; end: Date }
  ): Promise<RoutingMetrics> {
    const routingHistory = await this.prisma.leadRoutingHistory.findMany({
      where: {
        routingTimestamp: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        lead: true,
      },
    });

    const totalAssignments = routingHistory.length;
    const successfulAssignments = routingHistory.filter(
      h => h.conversionOutcome !== false
    ).length;

    const firstAttemptSuccessRate =
      totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;

    // Calculate average assignment time (from lead creation to assignment)
    const assignmentTimes = routingHistory
      .filter(h => h.lead.createdAt)
      .map(h => {
        return (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / 1000;
      });

    const avgAssignmentTime =
      assignmentTimes.length > 0
        ? assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length
        : 0;

    // Calculate wait times by tier
    const avgWaitTimeByTier: Record<string, number> = {
      Tier1: 0,
      Tier2: 0,
      Tier3: 0,
      Tier4: 0,
    };

    for (const tier of ['Tier1', 'Tier2', 'Tier3', 'Tier4']) {
      const tierHistory = routingHistory.filter(h => {
        const score = h.leadScore;
        if (tier === 'Tier1') return score >= 85;
        if (tier === 'Tier2') return score >= 70 && score < 85;
        if (tier === 'Tier3') return score >= 50 && score < 70;
        return score < 50;
      });

      const tierAssignmentTimes = tierHistory
        .filter(h => h.lead.createdAt)
        .map(h => {
          return (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / 1000;
        });

      avgWaitTimeByTier[tier] =
        tierAssignmentTimes.length > 0
          ? tierAssignmentTimes.reduce((a, b) => a + b, 0) / tierAssignmentTimes.length
          : 0;
    }

    // Calculate SLA compliance by tier
    const slaComplianceByTier: Record<string, number> = {
      Tier1: 0,
      Tier2: 0,
      Tier3: 0,
      Tier4: 0,
    };

    const slaLimits = { Tier1: 2, Tier2: 24, Tier3: 48, Tier4: 168 };

    for (const tier of ['Tier1', 'Tier2', 'Tier3', 'Tier4']) {
      const tierHistory = routingHistory.filter(h => {
        const score = h.leadScore;
        if (tier === 'Tier1') return score >= 85;
        if (tier === 'Tier2') return score >= 70 && score < 85;
        if (tier === 'Tier3') return score >= 50 && score < 70;
        return score < 50;
      });

      const compliantCount = tierHistory.filter(h => {
        if (!h.lead.createdAt) return false;
        const waitTimeHours =
          (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / (1000 * 60 * 60);
        return waitTimeHours <= slaLimits[tier as keyof typeof slaLimits];
      }).length;

      slaComplianceByTier[tier] =
        tierHistory.length > 0 ? (compliantCount / tierHistory.length) * 100 : 0;
    }

    // Calculate conversion rate by match quality
    const conversionRateByMatchQuality: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const quality of ['high', 'medium', 'low']) {
      const threshold = quality === 'high' ? 80 : quality === 'medium' ? 60 : 40;

      const qualityHistory = routingHistory.filter(h => h.leadScore >= threshold);

      const conversions = qualityHistory.filter(h => h.conversionOutcome === true).length;

      conversionRateByMatchQuality[quality] =
        qualityHistory.length > 0 ? (conversions / qualityHistory.length) * 100 : 0;
    }

    // Calculate agent utilization rate
    const totalCapacity = await this.prisma.agentAvailability.aggregate({
      where: {
        agent: { isActive: true },
      },
      _sum: { maxCapacity: true },
    });

    const totalLoad = await this.prisma.agentAvailability.aggregate({
      where: {
        agent: { isActive: true },
      },
      _sum: { currentLoad: true },
    });

    const agentUtilizationRate =
      totalCapacity._sum.maxCapacity && totalCapacity._sum.maxCapacity > 0
        ? (totalLoad._sum.currentLoad! / totalCapacity._sum.maxCapacity) * 100
        : 0;

    // Calculate routing efficiency score
    const routingEfficiencyScore = this.calculateRoutingEfficiencyScore({
      firstAttemptSuccessRate,
      slaComplianceByTier,
      agentUtilizationRate,
      avgAssignmentTime,
    });

    return {
      period,
      totalAssignments,
      successfulAssignments,
      failedAssignments: totalAssignments - successfulAssignments,
      firstAttemptSuccessRate,
      avgAssignmentTime,
      avgWaitTimeByTier: avgWaitTimeByTier as Record<LeadTier, number>,
      slaComplianceByTier: slaComplianceByTier as Record<LeadTier, number>,
      conversionRateByMatchQuality,
      agentUtilizationRate,
      routingEfficiencyScore,
    };
  }

  async getAssignmentQuality(
    agentId: string,
    period: { start: Date; end: Date }
  ): Promise<QualityMetrics> {
    const routingHistory = await this.prisma.leadRoutingHistory.findMany({
      where: {
        assignedAgentId: agentId,
        routingTimestamp: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        agent: true,
        lead: true,
      },
    });

    const totalAssignments = routingHistory.length;

    if (totalAssignments === 0) {
      return {
        agentId,
        period,
        totalAssignments: 0,
        avgMatchQuality: 0,
        conversionRate: 0,
        avgHandlingTime: 0,
        customerSatisfaction: 0,
        repeatCustomerRate: 0,
        qualityTrend: 'stable',
      };
    }

    // Calculate average match quality
    const avgMatchQuality =
      routingHistory.reduce((sum, h) => sum + h.assignmentQualityScore || 0, 0) /
      totalAssignments;

    // Calculate conversion rate
    const conversions = routingHistory.filter(h => h.conversionOutcome === true).length;
    const conversionRate = (conversions / totalAssignments) * 100;

    // Calculate average handling time
    const handlingTimes = routingHistory
      .filter(h => h.assignmentDurationHours)
      .map(h => h.assignmentDurationHours! * 60);

    const avgHandlingTime =
      handlingTimes.length > 0
        ? handlingTimes.reduce((a, b) => a + b, 0) / handlingTimes.length
        : 0;

    // Get customer satisfaction from performance metrics
    const performance = await this.prisma.agentPerformanceMetrics.findFirst({
      where: {
        agentId,
        periodDate: {
          gte: new Date(period.start.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { periodDate: 'desc' },
    });

    const customerSatisfaction = performance?.customerSatisfactionRating || 0;
    const repeatCustomerRate = performance?.repeatCustomerRate || 0;

    // Determine quality trend
    const qualityTrend = this.determineQualityTrend(routingHistory);

    return {
      agentId,
      period,
      totalAssignments,
      avgMatchQuality,
      conversionRate,
      avgHandlingTime,
      customerSatisfaction,
      repeatCustomerRate,
      qualityTrend,
    };
  }

  async calculateRoutingEfficiency(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await this.getRoutingMetrics({
      start: thirtyDaysAgo,
      end: now,
    });

    return metrics.routingEfficiencyScore;
  }

  async getSLACompliance(
    tier: LeadTier,
    period: { start: Date; end: Date }
  ): Promise<number> {
    const routingHistory = await this.prisma.leadRoutingHistory.findMany({
      where: {
        routingTimestamp: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        lead: true,
      },
    });

    // Filter by tier based on lead score
    const tierHistory = routingHistory.filter(h => {
      const score = h.leadScore;
      if (tier === 'Tier1') return score >= 85;
      if (tier === 'Tier2') return score >= 70 && score < 85;
      if (tier === 'Tier3') return score >= 50 && score < 70;
      return score < 50;
    });

    if (tierHistory.length === 0) {
      return 100;
    }

    // SLA limits by tier
    const slaLimits = { Tier1: 2, Tier2: 24, Tier3: 48, Tier4: 168 };

    const compliantCount = tierHistory.filter(h => {
      if (!h.lead.createdAt) return false;
      const waitTimeHours =
        (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / (1000 * 60 * 60);
      return waitTimeHours <= slaLimits[tier];
    }).length;

    return (compliantCount / tierHistory.length) * 100;
  }

  async compareRoutingStrategies(
    period: { start: Date; end: Date }
  ): Promise<StrategyComparison> {
    const greedyMetrics = await this.getStrategyMetrics('greedy', period);
    const optimalMetrics = await this.getStrategyMetrics('optimal', period);

    const improvementAreas: string[] = [];

    // Identify areas where greedy outperforms optimal
    if (greedyMetrics.avgAssignmentTime < optimalMetrics.avgAssignmentTime) {
      improvementAreas.push('Greedy strategy has faster assignment time');
    }

    if (greedyMetrics.conversionRate > optimalMetrics.conversionRate) {
      improvementAreas.push('Greedy strategy has higher conversion rate');
    }

    // Identify areas where optimal outperforms greedy
    if (optimalMetrics.slaCompliance > greedyMetrics.slaCompliance) {
      improvementAreas.push('Optimal strategy has better SLA compliance');
    }

    if (optimalMetrics.agentUtilization > greedyMetrics.agentUtilization) {
      improvementAreas.push('Optimal strategy has better agent utilization');
    }

    // Determine winner
    const greedyScore =
      greedyMetrics.conversionRate * 0.4 +
      greedyMetrics.slaCompliance * 0.3 +
      (100 - greedyMetrics.avgAssignmentTime / 60) * 0.3;

    const optimalScore =
      optimalMetrics.conversionRate * 0.4 +
      optimalMetrics.slaCompliance * 0.3 +
      (100 - optimalMetrics.avgAssignmentTime / 60) * 0.3;

    const winner = greedyScore > optimalScore ? 'greedy' : 'optimal';
    const confidence = Math.abs(greedyScore - optimalScore);

    return {
      strategy1: { name: 'greedy', metrics: greedyMetrics },
      strategy2: { name: 'optimal', metrics: optimalMetrics },
      improvementAreas,
      winner,
      confidence,
    };
  }

  async getMatchQualityAnalysis(
    period: { start: Date; end: Date }
  ): Promise<MatchQuality[]> {
    const routingHistory = await this.prisma.leadRoutingHistory.findMany({
      where: {
        routingTimestamp: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        agent: true,
        lead: true,
      },
    });

    const analysis: MatchQuality[] = [];

    // Group by lead tier and agent tier
    for (const leadTier of ['Tier1', 'Tier2', 'Tier3', 'Tier4']) {
      for (const agentTier of ['Elite', 'Senior', 'Standard', 'Junior']) {
        const matches = routingHistory.filter(h => {
          const leadScore = h.leadScore;
          const isLeadTier =
            (leadTier === 'Tier1' && leadScore >= 85) ||
            (leadTier === 'Tier2' && leadScore >= 70 && leadScore < 85) ||
            (leadTier === 'Tier3' && leadScore >= 50 && leadScore < 70) ||
            (leadTier === 'Tier4' && leadScore < 50);

          const isAgentTier =
            (agentTier === 'Elite' && h.agent.rating >= 0.9) ||
            (agentTier === 'Senior' && h.agent.rating >= 0.75 && h.agent.rating < 0.9) ||
            (agentTier === 'Standard' && h.agent.rating >= 0.5 && h.agent.rating < 0.75) ||
            (agentTier === 'Junior' && h.agent.rating < 0.5);

          return isLeadTier && isAgentTier;
        });

        if (matches.length === 0) continue;

        const conversions = matches.filter(h => h.conversionOutcome === true).length;

        const conversionRate = (conversions / matches.length) * 100;

        const handlingTimes = matches
          .filter(h => h.assignmentDurationHours)
          .map(h => h.assignmentDurationHours! * 60);

        const avgHandlingTime =
          handlingTimes.length > 0
            ? handlingTimes.reduce((a, b) => a + b, 0) / handlingTimes.length
            : 0;

        analysis.push({
          leadTier: leadTier as LeadTier,
          agentTier: agentTier as AgentTier,
          specializationMatch: conversionRate > 30 ? 80 : conversionRate > 20 ? 60 : 40,
          conversionRate,
          avgHandlingTime,
          sampleSize: matches.length,
        });
      }
    }

    return analysis;
  }

  async identifyImprovements(): Promise<Improvement[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const improvements: Improvement[] = [];

    // Check for SLA compliance issues
    const metrics = await this.getRoutingMetrics({
      start: thirtyDaysAgo,
      end: now,
    });

    for (const [tier, compliance] of Object.entries(metrics.slaComplianceByTier)) {
      if (compliance < 90) {
        improvements.push({
          category: 'SLA Compliance',
          issue: `${tier} SLA compliance is ${compliance.toFixed(1)}% (target: 90%+)`,
          impact: compliance < 80 ? 'high' : 'medium',
          recommendation: `Increase agent capacity for ${tier} leads or adjust routing priorities`,
          estimatedImprovement: `+${(90 - compliance).toFixed(1)}% SLA compliance`,
        });
      }
    }

    // Check for low conversion rates
    for (const [quality, rate] of Object.entries(metrics.conversionRateByMatchQuality)) {
      if (rate < 20) {
        improvements.push({
          category: 'Conversion Rate',
          issue: `${quality} quality match conversion rate is ${rate.toFixed(1)}% (target: 30%+)`,
          impact: rate < 10 ? 'high' : 'medium',
          recommendation: `Review agent matching criteria for ${quality} quality leads`,
          estimatedImprovement: `+${(30 - rate).toFixed(1)}% conversion rate`,
        });
      }
    }

    // Check for agent utilization imbalance
    if (metrics.agentUtilizationRate < 70) {
      improvements.push({
        category: 'Agent Utilization',
        issue: `Overall agent utilization is ${metrics.agentUtilizationRate.toFixed(1)}% (target: 75-85%)`,
        impact: 'medium',
        recommendation: 'Consider reducing team size or increasing lead volume',
        estimatedImprovement: '+5-10% efficiency',
      });
    } else if (metrics.agentUtilizationRate > 85) {
      improvements.push({
        category: 'Agent Utilization',
        issue: `Overall agent utilization is ${metrics.agentUtilizationRate.toFixed(1)}% (target: 75-85%)`,
        impact: 'high',
        recommendation: 'Consider adding more agents or improving load balancing',
        estimatedImprovement: '-5-10% burnout risk',
      });
    }

    // Check for high first-assignment failure rate
    if (metrics.firstAttemptSuccessRate < 95) {
      improvements.push({
        category: 'Assignment Success',
        issue: `First attempt success rate is ${metrics.firstAttemptSuccessRate.toFixed(1)}% (target: 95%+)`,
        impact: 'high',
        recommendation: 'Improve agent availability tracking and matching algorithms',
        estimatedImprovement: `+${(95 - metrics.firstAttemptSuccessRate).toFixed(1)}% success rate`,
      });
    }

    return improvements;
  }

  private calculateRoutingEfficiencyScore(metrics: {
    firstAttemptSuccessRate: number;
    slaComplianceByTier: Record<string, number>;
    agentUtilizationRate: number;
    avgAssignmentTime: number;
  }): number {
    // Weighted efficiency score
    const firstAttemptScore = metrics.firstAttemptSuccessRate * 0.3;

    const avgSlaCompliance =
      Object.values(metrics.slaComplianceByTier).reduce((a, b) => a + b, 0) / 4;
    const slaScore = avgSlaCompliance * 0.3;

    // Ideal agent utilization is 75-85%, calculate deviation score
    const idealUtilization = 80;
    const utilizationDeviation = Math.abs(metrics.agentUtilizationRate - idealUtilization);
    const utilizationScore = Math.max(0, 100 - utilizationDeviation * 2) * 0.2;

    // Assignment time: lower is better, target is < 30 seconds
    const targetAssignmentTime = 30;
    const assignmentTimeScore = Math.max(0, 100 - (metrics.avgAssignmentTime / targetAssignmentTime) * 50) * 0.2;

    return Math.min(100, Math.max(0, firstAttemptScore + slaScore + utilizationScore + assignmentTimeScore));
  }

  private determineQualityTrend(
    history: Array<{ routingTimestamp: Date; assignmentQualityScore?: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (history.length < 2) {
      return 'stable';
    }

    // Sort by timestamp
    const sorted = [...history].sort((a, b) =>
      a.routingTimestamp.getTime() - b.routingTimestamp.getTime()
    );

    // Split into first half and second half
    const midPoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midPoint);
    const secondHalf = sorted.slice(midPoint);

    // Calculate average quality for each half
    const firstAvg =
      firstHalf.reduce((sum, h) => sum + (h.assignmentQualityScore || 0), 0) /
      firstHalf.length;

    const secondAvg =
      secondHalf.reduce((sum, h) => sum + (h.assignmentQualityScore || 0), 0) /
      secondHalf.length;

    // Determine trend
    const diff = secondAvg - firstAvg;

    if (diff > 5) {
      return 'improving';
    } else if (diff < -5) {
      return 'declining';
    }

    return 'stable';
  }

  private async getStrategyMetrics(
    strategy: string,
    period: { start: Date; end: Date }
  ): Promise<{
    avgAssignmentTime: number;
    conversionRate: number;
    slaCompliance: number;
    agentUtilization: number;
  }> {
    const routingHistory = await this.prisma.leadRoutingHistory.findMany({
      where: {
        routingStrategy: strategy,
        routingTimestamp: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        lead: true,
      },
    });

    if (routingHistory.length === 0) {
      return {
        avgAssignmentTime: 0,
        conversionRate: 0,
        slaCompliance: 100,
        agentUtilization: 0,
      };
    }

    // Calculate average assignment time
    const assignmentTimes = routingHistory
      .filter(h => h.lead.createdAt)
      .map(h => {
        return (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / 1000;
      });

    const avgAssignmentTime =
      assignmentTimes.length > 0
        ? assignmentTimes.reduce((a, b) => a + b, 0) / assignmentTimes.length
        : 0;

    // Calculate conversion rate
    const conversions = routingHistory.filter(h => h.conversionOutcome === true).length;
    const conversionRate = (conversions / routingHistory.length) * 100;

    // Calculate SLA compliance
    const compliantCount = routingHistory.filter(h => {
      if (!h.lead.createdAt) return false;
      const waitTimeHours =
        (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / (1000 * 60 * 60);
      return waitTimeHours <= 24; // Default 24h SLA
    }).length;

    const slaCompliance = (compliantCount / routingHistory.length) * 100;

    // Get agent utilization (simplified)
    const agentUtilization = 75; // Placeholder

    return {
      avgAssignmentTime,
      conversionRate,
      slaCompliance,
      agentUtilization,
    };
  }
}
