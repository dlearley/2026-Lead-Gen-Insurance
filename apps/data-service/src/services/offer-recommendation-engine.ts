// ========================================
// Offer Recommendation Engine
// Generates personalized insurance offers based on lead data
// ========================================

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  PersonalizedOffer,
  OfferTier,
  OfferType,
  OfferReasoning,
  LeadEnrichmentProfile,
  InsuranceType,
  GetPersonalizedOffersRequest,
} from '@insurance-lead-gen/types';

interface OfferTemplate {
  type: OfferType;
  title: string;
  description: string;
  basePremium: number;
  coverageDetails: Record<string, unknown>;
  eligibilityRules: EligibilityRule[];
}

interface EligibilityRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists';
  value: unknown;
}

export class OfferRecommendationEngine {
  private offerTemplates: Map<OfferType, OfferTemplate[]> = new Map();

  constructor() {
    this.initializeOfferTemplates();
  }

  /**
   * Generate personalized offers for a lead
   */
  async generateOffers(
    leadId: string,
    enrichmentProfile: LeadEnrichmentProfile,
    request?: GetPersonalizedOffersRequest
  ): Promise<PersonalizedOffer[]> {
    const offers: PersonalizedOffer[] = [];

    try {
      // Get existing lead scoring data
      const leadScoring = await this.getLeadScoring(leadId);

      // Get eligible offer types based on enrichment data
      const eligibleTypes = this.determineEligibleOfferTypes(enrichmentProfile, leadScoring);

      // Generate offers for each eligible type
      for (const offerType of eligibleTypes) {
        const templates = this.offerTemplates.get(offerType) || [];

        for (const template of templates) {
          // Check eligibility
          if (!this.checkEligibility(template, enrichmentProfile, leadScoring)) {
            continue;
          }

          // Calculate personalized premium
          const premium = this.calculatePremium(template, enrichmentProfile, leadScoring);

          // Calculate fit score
          const fitScore = this.calculateFitScore(
            template,
            enrichmentProfile,
            leadScoring,
            premium
          );

          // Generate reasoning
          const reasoning = this.generateReasoning(
            template,
            enrichmentProfile,
            leadScoring,
            fitScore
          );

          // Determine competitive advantages
          const competitiveAdvantages = this.generateCompetitiveAdvantages(
            template,
            enrichmentProfile
          );

          // Assign tier based on fit score
          const tier = this.determineOfferTier(fitScore);

          // Calculate estimated conversion probability
          const estimatedConversionProbability = this.calculateConversionProbability(
            fitScore,
            reasoning
          );

          // Determine A/B test variant if specified
          const abTestVariant = this.assignAbTestVariant(offerType, request?.abTestGroup);

          const offer: PersonalizedOffer = {
            id: crypto.randomUUID(),
            leadId,
            callId: request?.callId,
            tier,
            offerType,
            title: template.title,
            description: template.description,
            coverageDetails: template.coverageDetails,
            premium: {
              amount: premium.amount,
              currency: 'USD',
              frequency: premium.frequency || 'monthly',
            },
            coverageLimits: template.coverageDetails.coverageLimits as Record<string, number>,
            deductibles: template.coverageDetails.deductibles as Record<string, number>,
            reasoning,
            fitScore,
            confidence: this.calculateConfidence(enrichmentProfile, leadScoring),
            estimatedConversionProbability,
            competitiveAdvantages,
            abTestVariant,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            status: 'suggested',
            metadata: {
              templateId: template.type,
              premiumAdjustments: this.getPremiumAdjustments(template, enrichmentProfile),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          offers.push(offer);
        }
      }

      // Sort offers by fit score and limit to requested max
      const maxOffers = request?.maxOffers || 5;
      const sortedOffers = offers.sort((a, b) => b.fitScore - a.fitScore).slice(0, maxOffers);

      // Save offers to database
      await this.saveOffers(sortedOffers);

      return sortedOffers;
    } catch (error) {
      console.error('Error generating offers:', error);
      return [];
    }
  }

  /**
   * Determine eligible offer types for a lead
   */
  private determineEligibleOfferTypes(
    profile: LeadEnrichmentProfile,
    scoring?: any
  ): OfferType[] {
    const eligible: OfferType[] = [];

    // Auto insurance
    if (profile.vehicleData && profile.vehicleData.length > 0) {
      eligible.push('auto');
    }

    // Home insurance
    if (profile.propertyData?.ownership === 'owned' || profile.propertyData?.ownership === 'mortgaged') {
      eligible.push('home');
    }

    // Life insurance
    if (profile.demographics?.age && profile.demographics.age >= 18 && profile.demographics.age <= 75) {
      eligible.push('life');
    }

    // Health insurance
    if (profile.demographics?.age && profile.demographics.age >= 18) {
      eligible.push('health');
    }

    // Commercial insurance
    if (profile.firmographics?.companySize && profile.firmographics.companySize !== '1-10') {
      eligible.push('commercial');
    }

    // Bundle offers (if multiple types eligible)
    if (eligible.length >= 2) {
      eligible.push('bundle');
    }

    // Filter by scoring intent if available
    if (scoring?.primaryInsuranceType) {
      const primaryType = scoring.primaryInsuranceType as OfferType;
      if (eligible.includes(primaryType)) {
        // Move primary type to front
        const index = eligible.indexOf(primaryType);
        eligible.splice(index, 1);
        eligible.unshift(primaryType);
      }
    }

    return eligible;
  }

  /**
   * Check eligibility for a specific offer template
   */
  private checkEligibility(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile,
    scoring?: any
  ): boolean {
    for (const rule of template.eligibilityRules) {
      const value = this.getFieldValue(rule.field, profile, scoring);

      if (!this.evaluateCondition(value, rule.operator, rule.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from profile or scoring
   */
  private getFieldValue(field: string, profile: LeadEnrichmentProfile, scoring?: any): unknown {
    const parts = field.split('.');

    let value: any = profile;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    value: unknown,
    operator: string,
    ruleValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === ruleValue;
      case 'ne':
        return value !== ruleValue;
      case 'gt':
        return typeof value === 'number' && typeof ruleValue === 'number' && value > ruleValue;
      case 'gte':
        return typeof value === 'number' && typeof ruleValue === 'number' && value >= ruleValue;
      case 'lt':
        return typeof value === 'number' && typeof ruleValue === 'number' && value < ruleValue;
      case 'lte':
        return typeof value === 'number' && typeof ruleValue === 'number' && value <= ruleValue;
      case 'in':
        return Array.isArray(ruleValue) && ruleValue.includes(value);
      case 'nin':
        return Array.isArray(ruleValue) && !ruleValue.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Calculate personalized premium
   */
  private calculatePremium(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile,
    scoring?: any
  ): { amount: number; frequency: string } {
    let premium = template.basePremium;

    // Adjust for demographics
    if (profile.demographics?.age) {
      // Age-based adjustments (simplified)
      if (profile.demographics.age < 25) premium *= 1.5;
      else if (profile.demographics.age > 65) premium *= 1.2;
    }

    // Adjust for risk score
    if (profile.risk?.fraudRiskScore && profile.risk.fraudRiskScore > 50) {
      premium *= 1 + (profile.risk.fraudRiskScore - 50) / 100;
    }

    // Adjust for lead quality score
    if (scoring?.normalizedScore) {
      // Higher quality score = better rate
      const qualityBonus = (scoring.normalizedScore - 50) / 500; // Up to 10% discount
      premium *= 1 - Math.max(0, qualityBonus);
    }

    // Adjust for property/vehicle value
    if (profile.propertyData?.estimatedValue) {
      const valueFactor = profile.propertyData.estimatedValue / 500000;
      premium *= 1 + valueFactor * 0.5;
    }

    return {
      amount: Math.round(premium * 100) / 100,
      frequency: 'monthly',
    };
  }

  /**
   * Calculate fit score for an offer
   */
  private calculateFitScore(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile,
    scoring?: any,
    premium?: { amount: number }
  ): number {
    let score = 50; // Base score

    // Demographic fit
    if (profile.demographics) {
      score += 10;
    }

    // Risk profile fit
    if (profile.risk?.fraudRiskScore !== undefined) {
      if (profile.risk.fraudRiskScore < 30) {
        score += 15;
      } else if (profile.risk.fraudRiskScore < 50) {
        score += 5;
      } else {
        score -= 10;
      }
    }

    // Lead score fit
    if (scoring?.normalizedScore) {
      score += (scoring.normalizedScore / 100) * 20;
    }

    // Intent fit
    if (profile.behavioral?.intentSignals) {
      const relevantSignals = profile.behavioral.intentSignals.filter(
        (s: any) => s.strength === 'high'
      );
      score += relevantSignals.length * 5;
    }

    // Premium competitiveness
    if (premium && template.basePremium) {
      const premiumRatio = premium.amount / template.basePremium;
      if (premiumRatio < 1.1) score += 10;
      else if (premiumRatio > 1.3) score -= 5;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Generate reasoning for offer recommendation
   */
  private generateReasoning(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile,
    scoring?: any,
    fitScore?: number
  ): OfferReasoning[] {
    const reasoning: OfferReasoning[] = [];

    // Demographic fit
    if (profile.demographics?.age) {
      reasoning.push({
        category: 'demographic_fit',
        reason: `Offer optimized for ${profile.demographics.age}-year-old demographic`,
        impact: 'positive',
        weight: 0.2,
        dataPoints: ['demographics.age'],
      });
    }

    // Intent match
    if (profile.behavioral?.intentSignals?.length > 0) {
      reasoning.push({
        category: 'intent_match',
        reason: `Strong intent signals detected: ${profile.behavioral.intentSignals
          .slice(0, 2)
          .map((s: any) => s.type)
          .join(', ')}`,
        impact: 'positive',
        weight: 0.25,
        dataPoints: ['behavioral.intentSignals'],
      });
    }

    // Risk profile
    if (profile.risk?.fraudRiskScore !== undefined) {
      const riskLevel = profile.risk.fraudRiskScore < 30 ? 'Low' :
                       profile.risk.fraudRiskScore < 50 ? 'Medium' : 'High';
      reasoning.push({
        category: 'risk_profile',
        reason: `${riskLevel} risk profile enables competitive pricing`,
        impact: profile.risk.fraudRiskScore < 50 ? 'positive' : 'negative',
        weight: 0.2,
        dataPoints: ['risk.fraudRiskScore'],
      });
    }

    // Lead quality
    if (scoring?.normalizedScore) {
      const qualityLevel = scoring.normalizedScore > 70 ? 'High' :
                          scoring.normalizedScore > 40 ? 'Medium' : 'Low';
      reasoning.push({
        category: 'value_proposition',
        reason: `${qualityLevel} lead quality score (${Math.round(scoring.normalizedScore)})`,
        impact: scoring.normalizedScore > 40 ? 'positive' : 'neutral',
        weight: 0.15,
        dataPoints: ['leadScoring.normalizedScore'],
      });
    }

    return reasoning;
  }

  /**
   * Generate competitive advantages
   */
  private generateCompetitiveAdvantages(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile
  ): string[] {
    const advantages: string[] = [];

    // Based on demographics
    if (profile.demographics?.age && profile.demographics.age < 30) {
      advantages.push('Specialized young driver rates');
    }

    if (profile.demographics?.homeownerStatus === 'owns') {
      advantages.push('Homeowner discount available');
    }

    // Based on risk
    if (profile.risk?.creditScoreProxy && profile.risk.creditScoreProxy > 700) {
      advantages.push('Excellent credit rewards program');
    }

    // Based on behavioral
    if (profile.behavioral?.websiteVisits && profile.behavioral.websiteVisits > 3) {
      advantages.push('Instant online quote matching');
    }

    return advantages;
  }

  /**
   * Determine offer tier based on fit score
   */
  private determineOfferTier(fitScore: number): OfferTier {
    if (fitScore >= 75) return 'primary';
    if (fitScore >= 50) return 'secondary';
    return 'tertiary';
  }

  /**
   * Calculate conversion probability
   */
  private calculateConversionProbability(
    fitScore: number,
    reasoning: OfferReasoning[]
  ): number {
    let probability = fitScore * 0.6; // Base from fit score

    // Adjust for reasoning
    const positiveReasoning = reasoning.filter((r) => r.impact === 'positive');
    const negativeReasoning = reasoning.filter((r) => r.impact === 'negative');

    probability += positiveReasoning.length * 5;
    probability -= negativeReasoning.length * 3;

    // Adjust for competitive advantages
    // (would be calculated in generateCompetitiveAdvantages)

    return Math.min(Math.max(probability, 0), 100);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    profile: LeadEnrichmentProfile,
    scoring?: any
  ): number {
    let confidence = profile.confidenceScore * 0.5;

    if (profile.demographics) confidence += 10;
    if (profile.risk?.fraudRiskScore !== undefined) confidence += 10;
    if (scoring?.confidence) confidence += scoring.confidence * 0.3;

    return Math.min(confidence, 100);
  }

  /**
   * Assign A/B test variant
   */
  private assignAbTestVariant(offerType: OfferType, group?: string): string | undefined {
    if (!group) return undefined;

    const variants = ['A', 'B'];
    const hash = this.hashString(`${offerType}-${group}`);
    return variants[hash % variants.length];
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get premium adjustment details
   */
  private getPremiumAdjustments(
    template: OfferTemplate,
    profile: LeadEnrichmentProfile
  ): Record<string, unknown> {
    const adjustments: Record<string, unknown> = {};

    if (profile.demographics?.age) {
      adjustments.ageFactor = profile.demographics.age < 25 ? 1.5 : 1.0;
    }

    if (profile.risk?.fraudRiskScore) {
      adjustments.riskFactor = 1 + (profile.risk.fraudRiskScore - 50) / 100;
    }

    return adjustments;
  }

  /**
   * Save offers to database
   */
  private async saveOffers(offers: PersonalizedOffer[]): Promise<void> {
    await Promise.all(
      offers.map((offer) =>
        prisma.personalizedOffer.create({
          data: offer,
        })
      )
    );
  }

  /**
   * Get lead scoring data
   */
  private async getLeadScoring(leadId: string): Promise<any> {
    // Placeholder - would integrate with existing scoring service
    return {
      normalizedScore: 60,
      primaryInsuranceType: 'auto' as OfferType,
      confidence: 0.85,
    };
  }

  /**
   * Initialize offer templates
   */
  private initializeOfferTemplates(): void {
    // Auto insurance templates
    this.offerTemplates.set('auto', [
      {
        type: 'auto',
        title: 'Comprehensive Auto Protection',
        description: 'Full coverage with accident forgiveness and roadside assistance',
        basePremium: 150,
        coverageDetails: {
          coverageType: 'comprehensive',
          coverageLimits: {
            bodilyInjury: 250000,
            propertyDamage: 100000,
            medicalPayments: 5000,
          },
          deductibles: {
            collision: 500,
            comprehensive: 500,
          },
        },
        eligibilityRules: [
          { field: 'vehicleData', operator: 'exists', value: true },
        ],
      },
    ]);

    // Home insurance templates
    this.offerTemplates.set('home', [
      {
        type: 'home',
        title: 'Homeowners Shield Plus',
        description: 'Complete protection for your home and belongings with replacement cost coverage',
        basePremium: 120,
        coverageDetails: {
          coverageType: 'ho3',
          coverageLimits: {
            dwelling: 300000,
            personalProperty: 150000,
            liability: 300000,
          },
          deductibles: {
            allPerils: 1000,
          },
        },
        eligibilityRules: [
          { field: 'propertyData.ownership', operator: 'in', value: ['owned', 'mortgaged'] },
        ],
      },
    ]);

    // Life insurance templates
    this.offerTemplates.set('life', [
      {
        type: 'life',
        title: 'Term Life Protection',
        description: 'Affordable term life coverage with guaranteed level premiums',
        basePremium: 45,
        coverageDetails: {
          coverageType: 'term',
          termLength: 20,
          coverageAmount: 500000,
        },
        eligibilityRules: [
          { field: 'demographics.age', operator: 'gte', value: 18 },
          { field: 'demographics.age', operator: 'lte', value: 75 },
        ],
      },
    ]);

    // Bundle templates
    this.offerTemplates.set('bundle', [
      {
        type: 'bundle',
        title: 'Complete Protection Bundle',
        description: 'Auto + Home + Life insurance with multi-policy discounts up to 25%',
        basePremium: 280,
        coverageDetails: {
          includedPolicies: ['auto', 'home', 'life'],
          bundleDiscount: 0.2,
        },
        eligibilityRules: [
          { field: 'vehicleData', operator: 'exists', value: true },
          { field: 'propertyData.ownership', operator: 'in', value: ['owned', 'mortgaged'] },
        ],
      },
    ]);
  }
}
