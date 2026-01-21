import {
  PolicyRecommendation,
  RecommendationType,
  UrgencyLevel,
  RecommendationContext,
  RecommendationScore,
} from '@insurance-lead-gen/types';
import logger from '../logger.js';

/**
 * Service for generating smart policy recommendations
 */
export class RecommendationEngineService {
  /**
   * Generate policy recommendations for customer
   */
  async generatePolicyRecommendations(customerId: string): Promise<PolicyRecommendation[]> {
    logger.info('Generating policy recommendations', { customerId });

    // Fetch customer profile and data
    const customerProfile = await this.fetchCustomerProfile(customerId);
    const currentPolicies = await this.fetchCurrentPolicies(customerId);

    const recommendations: PolicyRecommendation[] = [];

    // Generate different types of recommendations
    const newPolicyRecs = await this.generateNewPolicyRecommendations(customerProfile, currentPolicies);
    const upgradeRecs = await this.generateCoverageUpgradeRecommendations(customerProfile, currentPolicies);
    const crossSellRecs = await this.generateCrossSellRecommendations(customerProfile, currentPolicies);
    const upsellRecs = await this.generateUpsellRecommendations(customerProfile, currentPolicies);

    recommendations.push(...newPolicyRecs, ...upgradeRecs, ...crossSellRecs, ...upsellRecs);

    // Score and rank recommendations
    const scoredRecommendations = await this.scoreRecommendations(customerId, recommendations);

    // Sort by total score
    scoredRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    logger.info('Policy recommendations generated', { customerId, count: scoredRecommendations.length });

    return scoredRecommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Calculate recommendation score
   */
  async calculateRecommendationScore(
    customerId: string,
    recommendationType: string,
  ): Promise<number> {
    logger.info('Calculating recommendation score', { customerId, recommendationType });

    // Fetch customer and recommendation data
    const customerProfile = await this.fetchCustomerProfile(customerId);

    // Calculate component scores
    const relevanceScore = await this.scoreRelevance(customerId, {
      id: 'temp',
      customerId,
      insuranceLine: recommendationType,
      recommendationType: 'new_policy' as RecommendationType,
      recommendedCoverage: {},
      estimatedPremium: 0,
      recommendationScore: 0,
      relevanceScore: 0,
      conversionProbability: 0,
      urgencyLevel: 'Medium' as UrgencyLevel,
      influencingFactors: [],
      agentCommissionAmount: 0,
      createdBy: 'ai_engine',
      createdAt: new Date(),
    });

    const customerValueScore = this.calculateCustomerValueScore(customerProfile);
    const urgencyScore = this.calculateUrgencyScore(customerProfile);
    const conversionProbability = await this.predictConversionProbability(customerId, recommendationType);
    const commissionPotential = this.calculateCommissionPotential(recommendationType);

    // Weighted average
    const totalScore =
      0.30 * relevanceScore +
      0.25 * customerValueScore +
      0.20 * urgencyScore +
      0.15 * conversionProbability +
      0.10 * commissionPotential;

    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Get personalized recommendations based on customer profile
   */
  async getPersonalizedRecommendations(
    customerId: string,
    context: RecommendationContext,
  ): Promise<PolicyRecommendation[]> {
    logger.info('Getting personalized recommendations', { customerId, context });

    let recommendations = await this.generatePolicyRecommendations(customerId);

    // Apply personalization filters
    recommendations = await this.applyPersonalizationFilters(recommendations, {
      ...context,
      customerId,
    });

    return recommendations;
  }

  /**
   * Score recommendation relevance
   */
  async scoreRelevance(customerId: string, recommendation: PolicyRecommendation): Promise<number> {
    logger.debug('Scoring recommendation relevance', { customerId, recommendationId: recommendation.id });

    const customerProfile = await this.fetchCustomerProfile(customerId);

    let relevanceScore = 0.5; // Base score

    // Factor in customer demographics
    if (customerProfile.age) {
      if (recommendation.insuranceLine === 'life' && customerProfile.age < 45) {
        relevanceScore += 0.15;
      }
      if (recommendation.insuranceLine === 'health' && customerProfile.age > 30) {
        relevanceScore += 0.1;
      }
    }

    // Factor in marital status
    if (customerProfile.maritalStatus === 'married') {
      relevanceScore += 0.1;
    }

    // Factor in dependents
    if (customerProfile.dependents && customerProfile.dependents > 0) {
      if (recommendation.insuranceLine === 'life') {
        relevanceScore += 0.2;
      }
      if (recommendation.insuranceLine === 'health') {
        relevanceScore += 0.15;
      }
    }

    // Factor in income
    if (customerProfile.annualIncome) {
      if (customerProfile.annualIncome > 50000) {
        relevanceScore += 0.1;
      }
      if (customerProfile.annualIncome > 100000) {
        relevanceScore += 0.1;
      }
    }

    return Math.min(1, relevanceScore);
  }

  /**
   * Apply content filtering (budget, risk tolerance)
   */
  async applyPersonalizationFilters(
    recommendations: PolicyRecommendation[],
    customerProfile: CustomerProfileWithId,
  ): Promise<PolicyRecommendation[]> {
    logger.debug('Applying personalization filters', { customerId: customerProfile.customerId });

    let filtered = [...recommendations];

    // Budget constraint
    if (customerProfile.budgetConstraints) {
      filtered = filtered.filter(rec => rec.estimatedPremium <= customerProfile.budgetConstraints);
    }

    // Risk tolerance
    if (customerProfile.riskTolerance) {
      filtered = filtered.filter(rec => {
        // Conservative customers get more comprehensive coverage
        if (customerProfile.riskTolerance === 'conservative') {
          return rec.recommendedCoverage;
        }
        return true;
      });
    }

    // Life stage filtering
    if (customerProfile.lifeStage) {
      filtered = this.filterByLifeStage(filtered, customerProfile.lifeStage);
    }

    return filtered;
  }

  /**
   * Get recommendations by type
   */
  async getRecommendationsByType(
    customerId: string,
    type: string,
  ): Promise<PolicyRecommendation[]> {
    logger.info('Getting recommendations by type', { customerId, type });

    const allRecommendations = await this.generatePolicyRecommendations(customerId);

    return allRecommendations.filter(rec => rec.recommendationType === type);
  }

  /**
   * Track recommendation performance
   */
  async trackRecommendationOutcome(
    recommendationId: string,
    outcome: 'accepted' | 'declined' | 'viewed',
  ): Promise<void> {
    logger.info('Tracking recommendation outcome', { recommendationId, outcome });

    // In a real implementation, this would update database with outcome
    // and trigger retraining of ML models
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchCustomerProfile(customerId: string): Promise<CustomerProfileData> {
    // In a real implementation, this would query the database
    return {
      customerId,
      age: 35,
      maritalStatus: 'married',
      dependents: 2,
      annualIncome: 75000,
      homeValue: 350000,
      riskTolerance: 'moderate',
      lifeStage: 'family',
      occupation: 'professional',
    };
  }

  private async fetchCurrentPolicies(customerId: string): Promise<CurrentPolicy[]> {
    // In a real implementation, this would query the database
    return [
      {
        id: 'policy-1',
        insuranceLine: 'auto',
        premium: 1200,
        coverage: { liability: 100000, collision: 25000 },
      },
      {
        id: 'policy-2',
        insuranceLine: 'home',
        premium: 1500,
        coverage: { dwelling: 300000, personalProperty: 200000 },
      },
    ];
  }

  private async generateNewPolicyRecommendations(
    profile: CustomerProfileData,
    policies: CurrentPolicy[],
  ): Promise<PolicyRecommendation[]> {
    const recommendations: PolicyRecommendation[] = [];

    const existingLines = new Set(policies.map(p => p.insuranceLine));
    const allLines = ['auto', 'home', 'life', 'health', 'commercial'] as const;

    for (const line of allLines) {
      if (!existingLines.has(line)) {
        const coverage = this.getDefaultCoverage(line, profile);
        const premium = this.estimatePremium(line, coverage);

        recommendations.push({
          id: this.generateId(),
          customerId: profile.customerId,
          insuranceLine: line,
          recommendationType: 'new_policy',
          recommendedCoverage: coverage,
          estimatedPremium: premium,
          recommendationScore: 0,
          relevanceScore: 0,
          conversionProbability: 0.3,
          urgencyLevel: this.getUrgencyForLine(line, profile),
          reasonText: this.getReasonForNewPolicy(line, profile),
          influencingFactors: ['Missing coverage'],
          agentCommissionAmount: premium * 0.15,
          createdBy: 'ai_engine',
          createdAt: new Date(),
          recommendationExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      }
    }

    return recommendations;
  }

  private async generateCoverageUpgradeRecommendations(
    profile: CustomerProfileData,
    policies: CurrentPolicy[],
  ): Promise<PolicyRecommendation[]> {
    const recommendations: PolicyRecommendation[] = [];

    for (const policy of policies) {
      const upgradeCoverage = this.getUpgradeCoverage(policy, profile);
      if (upgradeCoverage) {
        const additionalPremium = this.estimatePremium(policy.insuranceLine, upgradeCoverage) - policy.premium;

        recommendations.push({
          id: this.generateId(),
          customerId: profile.customerId,
          insuranceLine: policy.insuranceLine,
          recommendationType: 'coverage_upgrade',
          recommendedCoverage: upgradeCoverage,
          estimatedPremium: additionalPremium,
          recommendationScore: 0,
          relevanceScore: 0,
          conversionProbability: 0.25,
          urgencyLevel: 'Medium',
          reasonText: `Upgrade your ${policy.insuranceLine} coverage for better protection`,
          influencingFactors: ['Coverage enhancement'],
          agentCommissionAmount: additionalPremium * 0.15,
          createdBy: 'ai_engine',
          createdAt: new Date(),
          recommendationExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    return recommendations;
  }

  private async generateCrossSellRecommendations(
    profile: CustomerProfileData,
    policies: CurrentPolicy[],
  ): Promise<PolicyRecommendation[]> {
    const recommendations: PolicyRecommendation[] = [];

    // Bundle recommendations
    const existingLines = new Set(policies.map(p => p.insuranceLine));

    if (existingLines.has('auto') && !existingLines.has('home')) {
      const homeCoverage = this.getDefaultCoverage('home', profile);
      const premium = this.estimatePremium('home', homeCoverage) * 0.9; // Bundle discount

      recommendations.push({
        id: this.generateId(),
        customerId: profile.customerId,
        insuranceLine: 'home',
        recommendationType: 'cross_sell',
        recommendedCoverage: homeCoverage,
        estimatedPremium: premium,
        recommendationScore: 0,
        relevanceScore: 0,
        conversionProbability: 0.35,
        urgencyLevel: 'High',
        reasonText: 'Bundle your home insurance with auto to save 10%',
        influencingFactors: ['Bundle opportunity'],
        agentCommissionAmount: premium * 0.15,
        createdBy: 'ai_engine',
        createdAt: new Date(),
        recommendationExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  private async generateUpsellRecommendations(
    profile: CustomerProfileData,
    policies: CurrentPolicy[],
  ): Promise<PolicyRecommendation[]> {
    const recommendations: PolicyRecommendation[] = [];

    for (const policy of policies) {
      if (profile.annualIncome && profile.annualIncome > 100000) {
        // Recommend umbrella coverage for high-income customers
        if (policy.insuranceLine === 'home') {
          const umbrellaCoverage = { limit: profile.annualIncome * 10 };
          const premium = umbrellaCoverage.limit * 0.003; // 0.3% annually

          recommendations.push({
            id: this.generateId(),
            customerId: profile.customerId,
            insuranceLine: 'umbrella',
            recommendationType: 'upsell',
            recommendedCoverage: umbrellaCoverage,
            estimatedPremium: premium,
            recommendationScore: 0,
            relevanceScore: 0,
            conversionProbability: 0.2,
            urgencyLevel: 'Medium',
            reasonText: 'Umbrella coverage provides additional liability protection',
            influencingFactors: ['High income'],
            agentCommissionAmount: premium * 0.15,
            createdBy: 'ai_engine',
            createdAt: new Date(),
            recommendationExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    return recommendations;
  }

  private async scoreRecommendations(
    customerId: string,
    recommendations: PolicyRecommendation[],
  ): Promise<PolicyRecommendation[]> {
    for (const rec of recommendations) {
      rec.relevanceScore = await this.scoreRelevance(customerId, rec);

      const customerValueScore = this.calculateCustomerValueScore(
        await this.fetchCustomerProfile(customerId),
      );
      const urgencyScore = this.calculateUrgencyScore(await this.fetchCustomerProfile(customerId));
      const conversionProbability = await this.predictConversionProbability(customerId, rec.insuranceLine);
      const commissionPotential = this.calculateCommissionPotential(rec.insuranceLine);

      rec.recommendationScore =
        0.30 * rec.relevanceScore +
        0.25 * customerValueScore +
        0.20 * urgencyScore +
        0.15 * conversionProbability +
        0.10 * commissionPotential;

      rec.conversionProbability = conversionProbability;
    }

    return recommendations;
  }

  private calculateCustomerValueScore(profile: CustomerProfileData): number {
    let score = 0.5;

    if (profile.annualIncome) {
      if (profile.annualIncome > 100000) score += 0.3;
      else if (profile.annualIncome > 50000) score += 0.15;
    }

    if (profile.homeValue && profile.homeValue > 300000) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private calculateUrgencyScore(profile: CustomerProfileData): number {
    let score = 0.5;

    if (profile.dependents && profile.dependents > 0) {
      score += 0.2;
    }

    if (profile.age && profile.age > 45) {
      score += 0.1;
    }

    if (profile.maritalStatus === 'married') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private async predictConversionProbability(customerId: string, insuranceLine: string): Promise<number> {
    // In a real implementation, this would use ML model
    // For now, use simple heuristics
    const baseProbability = 0.3;

    const lineMultipliers: Record<string, number> = {
      auto: 0.4,
      home: 0.35,
      life: 0.25,
      health: 0.3,
      commercial: 0.2,
    };

    return baseProbability * (lineMultipliers[insuranceLine] || 0.3);
  }

  private calculateCommissionPotential(insuranceLine: string): number {
    const commissionRates: Record<string, number> = {
      auto: 0.15,
      home: 0.12,
      life: 0.5,
      health: 0.2,
      commercial: 0.18,
    };

    return commissionRates[insuranceLine] || 0.15;
  }

  private getDefaultCoverage(
    line: string,
    profile: CustomerProfileData,
  ): Record<string, unknown> {
    const coverageTemplates: Record<string, Record<string, unknown>> = {
      auto: {
        liabilityBodilyInjury: 100000,
        liabilityPropertyDamage: 50000,
        collision: 25000,
        comprehensive: 20000,
        uninsuredMotorist: 100000,
      },
      home: {
        dwelling: profile.homeValue || 300000,
        personalProperty: (profile.homeValue || 300000) * 0.7,
        liability: 300000,
        medicalPayments: 5000,
      },
      life: {
        termLife: (profile.annualIncome || 50000) * 10,
        termLength: 20,
      },
      health: {
        deductible: 1500,
        outOfPocketMax: 8000,
        familyCoverage: profile.dependents && profile.dependents > 0,
      },
      commercial: {
        generalLiability: 1000000,
        property: 500000,
        businessInterruption: 200000,
      },
    };

    return coverageTemplates[line] || {};
  }

  private getUpgradeCoverage(policy: CurrentPolicy, profile: CustomerProfileData): Record<string, unknown> | null {
    const current = policy.coverage as Record<string, number>;

    if (policy.insuranceLine === 'auto' && current.liability < 250000) {
      return { ...current, liability: 250000 };
    }

    if (policy.insuranceLine === 'home' && current.liability < 500000) {
      return { ...current, liability: 500000 };
    }

    return null;
  }

  private estimatePremium(line: string, coverage: Record<string, unknown>): number {
    // Simple premium estimation
    const baseRates: Record<string, number> = {
      auto: 1000,
      home: 1500,
      life: 600,
      health: 400,
      commercial: 2000,
    };

    let premium = baseRates[line] || 1000;

    // Adjust based on coverage limits
    if (coverage.liability && typeof coverage.liability === 'number') {
      premium *= 1 + coverage.liability / 500000;
    }

    if (coverage.dwelling && typeof coverage.dwelling === 'number') {
      premium = premium * (coverage.dwelling / 300000);
    }

    if (coverage.termLife && typeof coverage.termLife === 'number') {
      premium = coverage.termLife * 0.003; // $3 per $1000 annually
    }

    return Math.round(premium);
  }

  private getUrgencyForLine(line: string, profile: CustomerProfileData): UrgencyLevel {
    if (line === 'life' && profile.dependents && profile.dependents > 0) {
      return 'High';
    }
    if (line === 'health') {
      return 'High';
    }
    if (line === 'auto' || line === 'home') {
      return 'Medium';
    }
    return 'Low';
  }

  private getReasonForNewPolicy(line: string, profile: CustomerProfileData): string {
    const reasons: Record<string, string> = {
      auto: 'Protect yourself and your vehicle with comprehensive auto insurance',
      home: 'Your home is likely your largest asset - protect it properly',
      life: 'Ensure your family is financially protected in case of unexpected events',
      health: 'Access quality healthcare and manage medical expenses',
      commercial: 'Protect your business from liability and property risks',
    };

    return reasons[line] || 'Expand your coverage for comprehensive protection';
  }

  private filterByLifeStage(recommendations: PolicyRecommendation[], lifeStage: string): PolicyRecommendation[] {
    // Life stage specific filtering
    if (lifeStage === 'student') {
      return recommendations.filter(rec =>
        ['auto', 'health'].includes(rec.insuranceLine),
      );
    }

    if (lifeStage === 'family') {
      // Families get recommendations for all types
      return recommendations;
    }

    if (lifeStage === 'retiree') {
      return recommendations.filter(rec =>
        ['home', 'health', 'life'].includes(rec.insuranceLine),
      );
    }

    return recommendations;
  }

  private generateId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== TYPES ====================

interface CustomerProfileData {
  customerId: string;
  age?: number;
  maritalStatus?: string;
  dependents?: number;
  annualIncome?: number;
  homeValue?: number;
  riskTolerance?: string;
  lifeStage?: string;
  occupation?: string;
}

interface CurrentPolicy {
  id: string;
  insuranceLine: string;
  premium: number;
  coverage: Record<string, unknown>;
}

interface CustomerProfileWithId extends CustomerProfileData {
  budgetConstraints?: number;
}
