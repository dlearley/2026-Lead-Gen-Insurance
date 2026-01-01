// ========================================
// Personalization Analytics Service
// Tracks and analyzes personalization effectiveness
// ========================================

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  PersonalizationEffectivenessMetrics,
  PersonalizationAnalyticsRequest,
  PersonalizedOffer,
  CoachingSuggestion,
  OfferStatus,
} from '@insurance-lead-gen/types';

export class PersonalizationAnalyticsService {
  /**
   * Calculate personalization effectiveness metrics
   */
  async calculateMetrics(request: PersonalizationAnalyticsRequest): Promise<PersonalizationEffectivenessMetrics> {
    const startDate = request.startDate;
    const endDate = request.endDate;

    try {
      // Get leads with and without personalization
      const { withPersonalization, withoutPersonalization } =
        await this.getLeadsWithWithoutPersonalization(startDate, endDate);

      // Get conversion counts
      const conversionsWithPersonalization = await this.getConversionsForLeads(
        withPersonalization,
        startDate,
        endDate
      );

      const conversionsWithoutPersonalization = await this.getConversionsForLeads(
        withoutPersonalization,
        startDate,
        endDate
      );

      // Calculate uplift
      const conversionRateWith = this.calculateRate(
        conversionsWithPersonalization,
        withPersonalization.length
      );

      const conversionRateWithout = this.calculateRate(
        conversionsWithoutPersonalization,
        withoutPersonalization.length
      );

      const conversionUplift = conversionRateWithout > 0
        ? ((conversionRateWith - conversionRateWithout) / conversionRateWithout) * 100
        : 0;

      const conversionUpliftAbsolute = conversionRateWith - conversionRateWithout;

      // Get offer metrics
      const offerMetrics = await this.calculateOfferMetrics(startDate, endDate);

      // Get suggestion metrics
      const suggestionMetrics = await this.calculateSuggestionMetrics(startDate, endDate);

      // Get sentiment metrics
      const sentimentMetrics = await this.calculateSentimentMetrics(startDate, endDate);

      // Get cost metrics
      const costMetrics = await this.calculateCostMetrics(
        startDate,
        endDate,
        conversionUplift,
        withPersonalization.length
      );

      // Get top performing combinations
      const topPerformingCombinations = await this.getTopPerformingCombinations(
        startDate,
        endDate
      );

      // Create or update metrics record
      const metrics = await prisma.personalizationEffectivenessMetrics.upsert({
        where: {
          periodStart_periodEnd: {
            periodStart: startDate,
            periodEnd: endDate,
          },
        },
        create: {
          periodStart: startDate,
          periodEnd: endDate,
          leadsWithPersonalization: withPersonalization.length,
          leadsWithoutPersonalization: withoutPersonalization.length,
          conversionWithPersonalization: conversionsWithPersonalization,
          conversionWithoutPersonalization: conversionsWithoutPersonalization,
          conversionUplift,
          conversionUpliftAbsolute,
          offerMetrics: offerMetrics as any,
          suggestionMetrics: suggestionMetrics as any,
          sentimentMetrics: sentimentMetrics as any,
          costMetrics: costMetrics as any,
          topPerformingCombinations: topPerformingCombinations as any,
        },
        update: {
          leadsWithPersonalization: withPersonalization.length,
          leadsWithoutPersonalization: withoutPersonalization.length,
          conversionWithPersonalization: conversionsWithPersonalization,
          conversionWithoutPersonalization: conversionsWithoutPersonalization,
          conversionUplift,
          conversionUpliftAbsolute,
          offerMetrics: offerMetrics as any,
          suggestionMetrics: suggestionMetrics as any,
          sentimentMetrics: sentimentMetrics as any,
          costMetrics: costMetrics as any,
          topPerformingCombinations: topPerformingCombinations as any,
          updatedAt: new Date(),
        },
      });

      return metrics as PersonalizationEffectivenessMetrics;
    } catch (error) {
      console.error('Error calculating personalization metrics:', error);
      throw error;
    }
  }

  /**
   * Get leads with and without personalization
   */
  private async getLeadsWithWithoutPersonalization(
    startDate: Date,
    endDate: Date
  ): Promise<{ withPersonalization: string[]; withoutPersonalization: string[] }> {
    // Get leads created in period
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true },
    });

    const leadIds = leads.map((l) => l.id);

    // Check which have enrichment profiles
    const enrichedLeads = await prisma.leadEnrichmentProfile.findMany({
      where: {
        leadId: { in: leadIds },
      },
      select: { leadId: true },
    });

    const enrichedLeadIds = new Set(enrichedLeads.map((l) => l.leadId));

    const withPersonalization = leadIds.filter((id) => enrichedLeadIds.has(id));
    const withoutPersonalization = leadIds.filter((id) => !enrichedLeadIds.has(id));

    return { withPersonalization, withoutPersonalization };
  }

  /**
   * Get conversions for leads
   */
  private async getConversionsForLeads(
    leadIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Count leads that converted in the period
    const conversions = await prisma.lead.count({
      where: {
        id: { in: leadIds },
        status: 'CONVERTED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return conversions;
  }

  /**
   * Calculate rate
   */
  private calculateRate(count: number, total: number): number {
    return total > 0 ? (count / total) * 100 : 0;
  }

  /**
   * Calculate offer metrics
   */
  private async calculateOfferMetrics(startDate: Date, endDate: Date) {
    const offers = await prisma.personalizedOffer.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalOffers = offers.length;
    const primaryOffers = offers.filter((o) => o.tier === 'primary').length;
    const secondaryOffers = offers.filter((o) => o.tier === 'secondary').length;
    const tertiaryOffers = offers.filter((o) => o.tier === 'tertiary').length;

    // Calculate acceptance rates
    const primaryAccepted = offers.filter(
      (o) => o.tier === 'primary' && o.status === 'accepted'
    ).length;
    const secondaryAccepted = offers.filter(
      (o) => o.tier === 'secondary' && o.status === 'accepted'
    ).length;
    const tertiaryAccepted = offers.filter(
      (o) => o.tier === 'tertiary' && o.status === 'accepted'
    ).length;

    const primaryOfferAcceptanceRate = this.calculateRate(primaryAccepted, primaryOffers);
    const secondaryOfferAcceptanceRate = this.calculateRate(secondaryAccepted, secondaryOffers);
    const tertiaryOfferAcceptanceRate = this.calculateRate(tertiaryAccepted, tertiaryOffers);

    // Calculate average response time
    const acceptedOffers = offers.filter((o) => o.status === 'accepted' && o.presentedAt && o.acceptedAt);
    const avgResponseTime = acceptedOffers.length > 0
      ? acceptedOffers.reduce(
          (sum, o) => sum + (o.acceptedAt!.getTime() - o.presentedAt!.getTime()),
          0
        ) / acceptedOffers.length
      : 0;

    return {
      totalOffers,
      primaryOffers,
      secondaryOffers,
      tertiaryOffers,
      primaryOfferAcceptanceRate,
      secondaryOfferAcceptanceRate,
      tertiaryOfferAcceptanceRate,
      averageOfferResponseTime: avgResponseTime,
    };
  }

  /**
   * Calculate suggestion metrics
   */
  private async calculateSuggestionMetrics(startDate: Date, endDate: Date) {
    const suggestions = await prisma.coachingSuggestion.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalSuggestions = suggestions.length;
    const acknowledgedSuggestions = suggestions.filter(
      (s) => s.status === 'acknowledged' || s.status === 'used'
    ).length;
    const usedSuggestions = suggestions.filter((s) => s.status === 'used').length;
    const dismissedSuggestions = suggestions.filter((s) => s.status === 'dismissed').length;

    const agentUtilizationRate = totalSuggestions > 0
      ? (acknowledgedSuggestions / totalSuggestions) * 100
      : 0;

    // Calculate average effectiveness rating
    const suggestionsWithFeedback = suggestions.filter(
      (s) => s.feedback && s.feedback.effectivenessRating
    );
    const avgEffectivenessRating = suggestionsWithFeedback.length > 0
      ? suggestionsWithFeedback.reduce(
          (sum, s) => sum + (s.feedback.effectivenessRating as number),
          0
        ) / suggestionsWithFeedback.length
      : 0;

    return {
      totalSuggestions,
      acknowledgedSuggestions,
      usedSuggestions,
      dismissedSuggestions,
      agentUtilizationRate,
      averageSuggestionEffectivenessRating: avgEffectivenessRating,
    };
  }

  /**
   * Calculate sentiment metrics
   */
  private async calculateSentimentMetrics(startDate: Date, endDate: Date) {
    // Get sentiment changes for leads with personalization
    const enrichedLeads = await prisma.lead.findMany({
      where: {
        enrichmentProfile: { isNot: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        enrichmentProfile: true,
      },
    });

    // This is simplified - in production, would track actual sentiment changes
    const sentimentPositiveOutcomes = enrichedLeads.filter((l) => l.status === 'CONVERTED').length;
    const sentimentNeutralOutcomes = enrichedLeads.filter((l) => l.status === 'QUALIFIED').length;
    const sentimentNegativeOutcomes = enrichedLeads.filter((l) => l.status === 'REJECTED').length;

    // Calculate average sentiment improvement
    const averageSentimentImprovement = sentimentPositiveOutcomes > 0
      ? (sentimentPositiveOutcomes / enrichedLeads.length) * 100
      : 0;

    return {
      averageSentimentImprovement,
      sentimentPositiveOutcomes,
      sentimentNeutralOutcomes,
      sentimentNegativeOutcomes,
    };
  }

  /**
   * Calculate cost metrics
   */
  private async calculateCostMetrics(
    startDate: Date,
    endDate: Date,
    conversionUplift: number,
    enrichedLeadsCount: number
  ) {
    // Get enrichment calls from data providers
    const providers = await prisma.dataProvider.findMany({
      where: {
        isEnabled: true,
      },
    });

    // Calculate total enrichment cost (simplified)
    const totalEnrichmentCost = providers.length * enrichedLeadsCount * 0.1; // $0.10 per lead per provider
    const averageCostPerLead = enrichedLeadsCount > 0 ? totalEnrichmentCost / enrichedLeadsCount : 0;

    // Calculate cost per conversion uplift
    const additionalConversions = enrichedLeadsCount > 0
      ? (conversionUplift / 100) * (enrichedLeadsCount * 0.15) // Assuming 15% baseline conversion
      : 0;

    const costPerConversionUplift = additionalConversions > 0
      ? totalEnrichmentCost / additionalConversions
      : 0;

    // Calculate ROI
    const averageRevenuePerConversion = 500; // $500 average policy revenue
    const additionalRevenue = additionalConversions * averageRevenuePerConversion;
    const roi = totalEnrichmentCost > 0
      ? ((additionalRevenue - totalEnrichmentCost) / totalEnrichmentCost) * 100
      : 0;

    return {
      totalEnrichmentCost,
      averageCostPerLead,
      costPerConversionUplift,
      roi,
    };
  }

  /**
   * Get top performing combinations
   */
  private async getTopPerformingCombinations(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ combination: string; conversions: number; conversionRate: number; sampleSize: number }>> {
    // Get offers grouped by type, tier, and demographics
    const offers = await prisma.personalizedOffer.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'accepted',
      },
      include: {
        lead: {
          include: {
            enrichmentProfile: true,
          },
        },
      },
    });

    // Group by combination (simplified)
    const combinations = new Map<
      string,
      { conversions: number; sampleSize: number }
    >();

    for (const offer of offers) {
      const type = offer.offerType;
      const tier = offer.tier;
      const ageGroup = this.categorizeAge(
        offer.lead.enrichmentProfile?.demographics?.age
      );

      const combination = `${type}|${tier}|${ageGroup}`;
      const current = combinations.get(combination) || {
        conversions: 0,
        sampleSize: 0,
      };

      current.conversions++;
      current.sampleSize++;
      combinations.set(combination, current);
    }

    // Convert to array and calculate conversion rates
    const result = Array.from(combinations.entries()).map(([combination, data]) => ({
      combination,
      conversions: data.conversions,
      conversionRate: 100, // All are accepted, so 100% for this group
      sampleSize: data.sampleSize,
    }));

    // Sort by conversions and return top 10
    return result.sort((a, b) => b.conversions - a.conversions).slice(0, 10);
  }

  /**
   * Categorize age
   */
  private categorizeAge(age?: number): string {
    if (!age) return 'unknown';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  /**
   * Get metrics for dashboard
   */
  async getDashboardMetrics(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.calculateMetrics({
      startDate,
      endDate,
      includeComparison: true,
    });

    return {
      summary: {
        conversionUplift: metrics.conversionUplift,
        agentUtilization: metrics.suggestionMetrics.agentUtilizationRate,
        roi: metrics.costMetrics.roi,
        totalEnrichmentCost: metrics.costMetrics.totalEnrichmentCost,
      },
      offerMetrics: metrics.offerMetrics,
      suggestionMetrics: metrics.suggestionMetrics,
      topCombinations: metrics.topPerformingCombinations.slice(0, 5),
    };
  }

  /**
   * Track offer outcome
   */
  async trackOfferOutcome(
    offerId: string,
    outcome: 'accepted' | 'rejected',
    agentFeedback?: string
  ): Promise<void> {
    const now = new Date();

    await prisma.personalizedOffer.update({
      where: { id: offerId },
      data: {
        status: outcome,
        acceptedAt: outcome === 'accepted' ? now : undefined,
        rejectedAt: outcome === 'rejected' ? now : undefined,
        rejectionReason: outcome === 'rejected' ? agentFeedback : undefined,
        updatedAt: now,
      },
    });

    // Update acceptance history
    const offer = await prisma.personalizedOffer.findUnique({
      where: { id: offerId },
      select: { leadId: true, callId: true, presentedAt: true },
    });

    if (offer && offer.presentedAt) {
      await prisma.offerAcceptanceHistory.create({
        data: {
          offerId,
          leadId: offer.leadId,
          callId: offer.callId,
          status: outcome,
          presentedAt: offer.presentedAt,
          acceptedAt: outcome === 'accepted' ? now : undefined,
          rejectedAt: outcome === 'rejected' ? now : undefined,
          rejectionReason: outcome === 'rejected' ? agentFeedback : undefined,
          agentFeedback,
        },
      });
    }
  }

  /**
   * Get daily metrics trend
   */
  async getDailyMetricsTrend(days: number = 30) {
    const trend = [];
    const endDate = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(endDate.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);

      try {
        const metrics = await this.calculateMetrics({
          startDate: dayStart,
          endDate: dayEnd,
        });

        trend.push({
          date: dayStart.toISOString().split('T')[0],
          conversionUplift: metrics.conversionUplift,
          totalOffers: metrics.offerMetrics.totalOffers,
          totalSuggestions: metrics.suggestionMetrics.totalSuggestions,
          agentUtilization: metrics.suggestionMetrics.agentUtilizationRate,
        });
      } catch (error) {
        console.error(`Error calculating metrics for ${dayStart.toISOString()}:`, error);
      }
    }

    return trend;
  }
}
