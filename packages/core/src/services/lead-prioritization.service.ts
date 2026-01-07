import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  LeadTier,
  LeadScore,
  DynamicAdjustment,
  ScoreFactor,
  SLAStatus,
  LeadPriority,
} from '@insurance-lead-gen/types';

const TIER_THRESHOLDS = {
  Tier1: 0.85,
  Tier2: 0.70,
  Tier3: 0.50,
  Tier4: 0.0,
};

const SLA_LIMITS = {
  Tier1: 2, // hours
  Tier2: 24,
  Tier3: 48,
  Tier4: 168, // 1 week
};

export class LeadPrioritizationService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateLeadScore(leadId: string): Promise<number> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const scoringFactors: ScoreFactor[] = [];

    let score = 0;

    // Base score from qualityScore if available
    if (lead.qualityScore) {
      score += lead.qualityScore * 0.3;
      scoringFactors.push({
        category: 'Base Quality',
        factor: 'Quality Score',
        weight: 0.3,
        value: lead.qualityScore,
        impact: lead.qualityScore > 50 ? 'positive' : lead.qualityScore > 30 ? 'neutral' : 'negative',
        description: `Quality score: ${lead.qualityScore}`,
      });
    }

    // Lead status factor
    const statusScores: Record<string, number> = {
      RECEIVED: 10,
      PROCESSING: 30,
      QUALIFIED: 50,
      ROUTED: 20,
      CONVERTED: 100,
      REJECTED: 0,
    };
    const statusScore = statusScores[lead.status] || 10;
    score += statusScore * 0.2;
    scoringFactors.push({
      category: 'Status',
      factor: 'Lead Status',
      weight: 0.2,
      value: statusScore,
      impact: statusScore > 30 ? 'positive' : statusScore > 10 ? 'neutral' : 'negative',
      description: `Status: ${lead.status}`,
    });

    // Source quality factor
    const sourceScores: Record<string, number> = {
      referral: 100,
      website: 85,
      mobile_app: 90,
      email_campaign: 70,
      social_media: 65,
      display_ad: 50,
      cold_lead: 30,
    };
    const sourceScore = sourceScores[lead.source.toLowerCase()] || 50;
    score += sourceScore * 0.15;
    scoringFactors.push({
      category: 'Source',
      factor: 'Source Quality',
      weight: 0.15,
      value: sourceScore,
      impact: sourceScore > 70 ? 'positive' : sourceScore > 50 ? 'neutral' : 'negative',
      description: `Source: ${lead.source}`,
    });

    // Contact completeness factor
    let contactScore = 0;
    if (lead.email) contactScore += 25;
    if (lead.phone) contactScore += 25;
    if (lead.firstName && lead.lastName) contactScore += 25;
    if (lead.state && lead.city) contactScore += 15;
    if (lead.insuranceType) contactScore += 10;
    score += contactScore * 0.2;
    scoringFactors.push({
      category: 'Contact',
      factor: 'Contact Completeness',
      weight: 0.2,
      value: contactScore,
      impact: contactScore > 75 ? 'positive' : contactScore > 50 ? 'neutral' : 'negative',
      description: `Contact completeness: ${contactScore}%`,
    });

    // Time decay factor (older leads get slight boost to prevent abandonment)
    const hoursSinceCreation = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60);
    let timeDecayBonus = 0;
    if (hoursSinceCreation > 24 && hoursSinceCreation < 48) {
      timeDecayBonus = 5;
    } else if (hoursSinceCreation >= 48 && hoursSinceCreation < 72) {
      timeDecayBonus = 10;
    } else if (hoursSinceCreation >= 72) {
      timeDecayBonus = 15;
    }
    score += timeDecayBonus * 0.1;
    if (timeDecayBonus > 0) {
      scoringFactors.push({
        category: 'Time',
        factor: 'Time Decay Bonus',
        weight: 0.1,
        value: timeDecayBonus,
        impact: 'positive',
        description: `Lead is ${Math.floor(hoursSinceCreation)}h old, bonus applied`,
      });
    }

    // Normalize to 0-100
    const normalizedScore = Math.min(100, Math.max(0, score));

    logger.info('Lead scored successfully', {
      leadId,
      score: normalizedScore,
      factorsCount: scoringFactors.length,
    });

    return normalizedScore;
  }

  async getLeadScore(leadId: string): Promise<LeadScore> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const score = await this.calculateLeadScore(leadId);
    const tier = this.assignLeadTier(score);
    const dynamicAdjustments = await this.getDynamicAdjustments(leadId);

    // Calculate factors
    const factors: ScoreFactor[] = [
      {
        category: 'Base Score',
        factor: 'Quality Score',
        weight: 0.3,
        value: lead.qualityScore || 0,
        impact: (lead.qualityScore || 0) > 50 ? 'positive' : 'negative',
        description: `Lead quality score: ${lead.qualityScore || 0}`,
      },
      {
        category: 'Tier',
        factor: 'Lead Tier',
        weight: 0.0,
        value: this.getTierScore(tier),
        impact: tier === 'Tier1' ? 'positive' : tier === 'Tier4' ? 'negative' : 'neutral',
        description: `Assigned tier: ${tier}`,
      },
    ];

    return {
      leadId,
      score,
      tier,
      dynamicAdjustments,
      factors,
      createdAt: new Date(),
    };
  }

  assignLeadTier(score: number): LeadTier {
    if (score >= TIER_THRESHOLDS.Tier1 * 100) return 'Tier1';
    if (score >= TIER_THRESHOLDS.Tier2 * 100) return 'Tier2';
    if (score >= TIER_THRESHOLDS.Tier3 * 100) return 'Tier3';
    return 'Tier4';
  }

  async getDynamicAdjustments(leadId: string): Promise<DynamicAdjustment> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const hoursSinceCreation = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60);

    // Time in queue bonus (older leads get boost)
    let timeInQueueBonus = 0;
    if (hoursSinceCreation > 24) {
      timeInQueueBonus = Math.min(15, hoursSinceCreation / 24 * 2);
    }

    // Competitor activity boost (simulated based on source patterns)
    const competitorActivityBoost = lead.source === 'website' ? 5 : 0;

    // Market condition multiplier (simulated)
    const marketConditionMultiplier = 1.0;

    // Commission opportunity (based on insurance type)
    const commissionOpportunityBonus = lead.insuranceType === 'COMMERCIAL' ? 8 : 5;

    // Cross-sell/upsell potential (based on metadata)
    const crossSellUpsellPotential = lead.metadata && lead.metadata['previous_policies'] ? 10 : 0;

    const totalAdjustment =
      timeInQueueBonus +
      competitorActivityBoost +
      (marketConditionMultiplier - 1) * 100 +
      commissionOpportunityBonus +
      crossSellUpsellPotential;

    return {
      timeInQueueBonus,
      competitorActivityBoost,
      marketConditionMultiplier,
      commissionOpportunityBonus,
      crossSellUpsellPotential,
      totalAdjustment,
    };
  }

  async prioritizeQueue(queueType: string): Promise<void> {
    const leads = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      orderBy: { leadScore: 'desc' },
    });

    for (const queueEntry of leads) {
      const newScore = await this.calculateLeadScore(queueEntry.leadId);
      await this.prisma.assignmentQueue.update({
        where: { id: queueEntry.id },
        data: {
          leadScore: newScore,
          updatedAt: new Date(),
        },
      });
    }

    // Update queue positions
    const updatedLeads = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      orderBy: { leadScore: 'desc' },
    });

    for (let i = 0; i < updatedLeads.length; i++) {
      await this.prisma.assignmentQueue.update({
        where: { id: updatedLeads[i].id },
        data: { queuePosition: i + 1 },
      });
    }

    logger.info('Queue prioritized successfully', {
      queueType,
      leadsProcessed: leads.length,
    });
  }

  async rescoreAllLeads(): Promise<number> {
    const leads = await this.prisma.lead.findMany({
      where: {
        status: {
          in: ['RECEIVED', 'PROCESSING', 'QUALIFIED'],
        },
      },
    });

    let rescoredCount = 0;

    for (const lead of leads) {
      await this.calculateLeadScore(lead.id);
      rescoredCount++;
    }

    logger.info('All leads rescored successfully', {
      totalLeads: leads.length,
      rescoredCount,
    });

    return rescoredCount;
  }

  async getLeadsByTier(tier: LeadTier, limit = 50, offset = 0): Promise<any[]> {
    const minScore = tier === 'Tier1' ? 85 : tier === 'Tier2' ? 70 : tier === 'Tier3' ? 50 : 0;
    const maxScore = tier === 'Tier1' ? 100 : tier === 'Tier2' ? 85 : tier === 'Tier3' ? 70 : 50;

    // Since qualityScore is an Int and we need approximate tier, we'll use status and source
    const tierStatuses: Record<LeadTier, string[]> = {
      Tier1: ['QUALIFIED'],
      Tier2: ['QUALIFIED', 'PROCESSING'],
      Tier3: ['PROCESSING', 'RECEIVED'],
      Tier4: ['RECEIVED'],
    };

    const leads = await this.prisma.lead.findMany({
      where: {
        status: {
          in: tierStatuses[tier],
        },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter by calculated score
    const filteredLeads = [];
    for (const lead of leads) {
      const score = await this.calculateLeadScore(lead.id);
      if (score >= minScore && score < maxScore) {
        filteredLeads.push({
          ...lead,
          calculatedScore: score,
          tier,
        });
      }
      if (filteredLeads.length >= limit) break;
    }

    return filteredLeads;
  }

  getSLAStatus(leadId: string): Promise<SLAStatus> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
    }).then(lead => {
      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      return this.calculateLeadScore(leadId).then(async score => {
        const tier = this.assignLeadTier(score);
        const slaLimit = SLA_LIMITS[tier];
        const timeElapsed = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60);
        const timeRemaining = Math.max(0, slaLimit - timeElapsed);

        let status: 'compliant' | 'warning' | 'critical' | 'breached' = 'compliant';
        if (timeElapsed >= slaLimit) {
          status = 'breached';
        } else if (timeElapsed >= slaLimit * 0.9) {
          status = 'critical';
        } else if (timeElapsed >= slaLimit * 0.75) {
          status = 'warning';
        }

        return {
          leadId,
          tier,
          slaLimit,
          timeElapsed,
          timeRemaining,
          status,
          expiryDate: timeElapsed >= slaLimit ? lead.createdAt : new Date(lead.createdAt.getTime() + slaLimit * 60 * 60 * 1000),
        };
      });
    });
  }

  getLeadPriorities(queueType?: string): Promise<LeadPriority[]> {
    return this.prisma.assignmentQueue.findMany({
      where: queueType ? { queueType } : undefined,
      orderBy: { leadScore: 'desc' },
      include: {
        lead: true,
      },
    }).then(async queueEntries => {
      const priorities: LeadPriority[] = [];

      for (const entry of queueEntries) {
        const score = await this.calculateLeadScore(entry.leadId);
        const tier = this.assignLeadTier(score);
        const slaStatus = await this.getSLAStatus(entry.leadId);
        const timeInQueue = Math.floor((Date.now() - entry.lead.createdAt.getTime()) / 1000);

        priorities.push({
          leadId: entry.leadId,
          queuePriority: score,
          tier,
          slaExpiry: slaStatus.expiryDate,
          timeInQueue,
          score,
          queuePosition: entry.queuePosition,
        });
      }

      return priorities;
    });
  }

  private getTierScore(tier: LeadTier): number {
    const scores = {
      Tier1: 100,
      Tier2: 75,
      Tier3: 50,
      Tier4: 25,
    };
    return scores[tier];
  }
}
