import {
  CrossSellRecommendation,
  UpsellRecommendation,
  Bundle,
  BundleRecommendation,
} from '@insurance-lead-gen/types';
import logger from '../logger.js';

/**
 * Service for cross-sell and upsell recommendations
 */
export class CrossSellUpsellService {
  /**
   * Generate cross-sell recommendations (complementary products)
   */
  async generateCrossSellRecommendations(customerId: string): Promise<CrossSellRecommendation[]> {
    logger.info('Generating cross-sell recommendations', { customerId });

    // Fetch customer data
    const customerProfile = await this.fetchCustomerProfile(customerId);
    const currentPolicies = await this.fetchCurrentPolicies(customerId);

    const recommendations: CrossSellRecommendation[] = [];

    const existingLines = new Set(currentPolicies.map(p => p.insuranceLine));

    // Define cross-sell opportunities
    const crossSellMap: Record<string, string[]> = {
      auto: ['home', 'umbrella', 'roadside_assistance'],
      home: ['auto', 'umbrella', 'flood', 'jewelry'],
      life: ['disability', 'critical_illness', 'long_term_care'],
      health: ['dental', 'vision', 'critical_illness'],
      commercial: ['workers_comp', 'professional_liability', 'cyber_liability'],
    };

    // Generate recommendations based on existing policies
    for (const policy of currentPolicies) {
      const opportunities = crossSellMap[policy.insuranceLine] || [];

      for (const targetLine of opportunities) {
        if (!existingLines.has(targetLine)) {
          const probability = await this.calculateCrossSellProbability(customerId, targetLine);
          const estimatedPremium = await this.estimatePremium(targetLine, customerProfile);

          recommendations.push({
            targetLine,
            probability,
            estimatedPremium,
            bundleDiscount: this.getBundleDiscount(targetLine, existingLines),
            reasoning: this.getCrossSellReasoning(targetLine, policy.insuranceLine),
          });
        }
      }
    }

    // Sort by probability
    recommendations.sort((a, b) => b.probability - a.probability);

    logger.info('Cross-sell recommendations generated', { customerId, count: recommendations.length });

    return recommendations.slice(0, 5); // Return top 5
  }

  /**
   * Generate upsell recommendations (upgrade coverage/limits)
   */
  async generateUpsellRecommendations(customerId: string): Promise<UpsellRecommendation[]> {
    logger.info('Generating upsell recommendations', { customerId });

    const customerProfile = await this.fetchCustomerProfile(customerId);
    const currentPolicies = await this.fetchCurrentPolicies(customerId);

    const recommendations: UpsellRecommendation[] = [];

    for (const policy of currentPolicies) {
      const upgradeOptions = this.getUpgradeOptions(policy, customerProfile);

      for (const upgrade of upgradeOptions) {
        const additionalPremium = await this.estimateAdditionalPremium(
          policy.insuranceLine,
          upgrade,
        );
        const expectedValue = this.calculateExpectedValue(upgrade);

        recommendations.push({
          policyId: policy.id,
          currentCoverage: policy.coverage,
          recommendedCoverage: upgrade,
          additionalPremium,
          expectedValue,
          reasoning: this.getUpsellReasoning(policy.insuranceLine, upgrade),
        });
      }
    }

    // Sort by expected value
    recommendations.sort((a, b) => b.expectedValue - a.expectedValue);

    logger.info('Upsell recommendations generated', { customerId, count: recommendations.length });

    return recommendations.slice(0, 5);
  }

  /**
   * Calculate cross-sell probability
   */
  async calculateCrossSellProbability(customerId: string, targetLine: string): Promise<number> {
    logger.debug('Calculating cross-sell probability', { customerId, targetLine });

    const customerProfile = await this.fetchCustomerProfile(customerId);

    let baseProbability = 0.3;

    // Adjust based on demographics
    if (customerProfile.age) {
      if (targetLine === 'life' && customerProfile.age < 45) {
        baseProbability += 0.15;
      }
      if (targetLine === 'health' && customerProfile.age > 30) {
        baseProbability += 0.1;
      }
    }

    // Adjust based on dependents
    if (customerProfile.dependents && customerProfile.dependents > 0) {
      if (targetLine === 'life' || targetLine === 'health') {
        baseProbability += 0.2;
      }
    }

    // Adjust based on income
    if (customerProfile.annualIncome && customerProfile.annualIncome > 75000) {
      baseProbability += 0.1;
    }

    // Adjust based on existing relationship
    const currentPolicies = await this.fetchCurrentPolicies(customerId);
    if (currentPolicies.length > 0) {
      baseProbability += 0.1; // Existing customers more likely to buy
    }

    if (currentPolicies.length >= 2) {
      baseProbability += 0.05; // Multi-policy customers even more likely
    }

    return Math.min(1, baseProbability);
  }

  /**
   * Get product bundles (discounts)
   */
  async getProductBundles(customerProfile: CustomerProfile): Promise<Bundle[]> {
    logger.info('Getting product bundles', { customerId: customerProfile.customerId });

    const bundles: Bundle[] = [];

    // Auto + Home bundle
    bundles.push({
      bundleId: 'auto-home',
      name: 'Auto + Home Bundle',
      policies: ['auto', 'home'],
      discountPercentage: 0.15, // 15% discount
      discountAmount: 0,
      totalPremium: 0,
    });

    // Auto + Home + Life bundle
    bundles.push({
      bundleId: 'auto-home-life',
      name: 'Auto + Home + Life Bundle',
      policies: ['auto', 'home', 'life'],
      discountPercentage: 0.20, // 20% discount
      discountAmount: 0,
      totalPremium: 0,
    });

    // Commercial bundle
    bundles.push({
      bundleId: 'commercial-complete',
      name: 'Commercial Complete Bundle',
      policies: ['commercial', 'workers_comp', 'professional_liability'],
      discountPercentage: 0.12, // 12% discount
      discountAmount: 0,
      totalPremium: 0,
    });

    return bundles;
  }

  /**
   * Apply bundling discount calculation
   */
  async calculateBundleDiscount(policies: Policy[]): Promise<DiscountCalculation> {
    logger.info('Calculating bundle discount', { policyCount: policies.length });

    if (policies.length < 2) {
      return {
        discountPercentage: 0,
        discountAmount: 0,
        totalPremium: policies.reduce((sum, p) => sum + p.premium, 0),
        bundleName: null,
      };
    }

    // Determine best bundle
    const policyTypes = policies.map(p => p.insuranceLine);
    let bundleName = null;
    let discountPercentage = 0;

    if (policyTypes.includes('auto') && policyTypes.includes('home')) {
      if (policyTypes.includes('life')) {
        bundleName = 'Auto + Home + Life Bundle';
        discountPercentage = 0.20;
      } else {
        bundleName = 'Auto + Home Bundle';
        discountPercentage = 0.15;
      }
    } else if (policyTypes.includes('commercial')) {
      bundleName = 'Commercial Bundle';
      discountPercentage = 0.12;
    } else if (policyTypes.length >= 2) {
      bundleName = 'Multi-Policy Discount';
      discountPercentage = 0.10;
    }

    const totalPremium = policies.reduce((sum, p) => sum + p.premium, 0);
    const discountAmount = totalPremium * discountPercentage;

    return {
      discountPercentage,
      discountAmount,
      totalPremium: totalPremium - discountAmount,
      bundleName,
    };
  }

  /**
   * Recommend bundle combinations
   */
  async recommendBundles(customerId: string): Promise<BundleRecommendation[]> {
    logger.info('Recommending bundles', { customerId });

    const customerProfile = await this.fetchCustomerProfile(customerId);
    const currentPolicies = await this.fetchCurrentPolicies(customerId);

    const existingLines = new Set(currentPolicies.map(p => p.insuranceLine));
    const recommendations: BundleRecommendation[] = [];

    // Get available bundles
    const availableBundles = await this.getProductBundles(customerProfile);

    for (const bundle of availableBundles) {
      // Check if bundle is applicable or can be formed
      const missingPolicies = bundle.policies.filter(p => !existingLines.has(p));

      if (missingPolicies.length === 0) {
        // Bundle already applicable
        const discountCalculation = await this.calculateBundleDiscount(currentPolicies);

        recommendations.push({
          bundle,
          savingsAmount: discountCalculation.discountAmount,
          savingsPercentage: discountCalculation.discountPercentage * 100,
          urgency: 'Medium',
          reasoning: 'You qualify for this bundle discount!',
        });
      } else if (missingPolicies.length <= 2) {
        // Can form bundle with 1-2 additional policies
        const additionalPolicies = await this.getPolicyEstimates(missingPolicies, customerProfile);
        const allPolicies = [...currentPolicies, ...additionalPolicies];
        const discountCalculation = await this.calculateBundleDiscount(allPolicies);

        recommendations.push({
          bundle,
          savingsAmount: discountCalculation.discountAmount,
          savingsPercentage: discountCalculation.discountPercentage * 100,
          urgency: 'High',
          reasoning: `Add ${missingPolicies.join(' + ')} to unlock bundle savings`,
        });
      }
    }

    // Sort by savings
    recommendations.sort((a, b) => b.savingsAmount - a.savingsAmount);

    return recommendations;
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchCustomerProfile(customerId: string): Promise<CustomerProfile> {
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

  private async fetchCurrentPolicies(customerId: string): Promise<Policy[]> {
    // In a real implementation, this would query the database
    return [
      {
        id: 'policy-1',
        customerId,
        insuranceLine: 'auto',
        premium: 1200,
        coverage: { liability: 100000, collision: 25000 },
      },
      {
        id: 'policy-2',
        customerId,
        insuranceLine: 'home',
        premium: 1500,
        coverage: { dwelling: 300000, personalProperty: 200000 },
      },
    ];
  }

  private getBundleDiscount(targetLine: string, existingLines: Set<string>): number {
    const discountMap: Record<string, number> = {
      home: 0.15, // 15% discount if bundling with auto
      auto: 0.15, // 15% discount if bundling with home
      life: 0.20, // 20% discount if bundling with auto + home
      umbrella: 0.10, // 10% discount if bundling
    };

    return discountMap[targetLine] || 0;
  }

  private getCrossSellReasoning(targetLine: string, existingLine: string): string {
    const reasoningMap: Record<string, Record<string, string>> = {
      auto: {
        home: 'Combine your auto and home insurance for bundled savings',
        umbrella: 'Add umbrella coverage for additional liability protection',
      },
      home: {
        auto: 'Bundle your home and auto insurance to save money',
        flood: 'Protect your home from flood damage with flood insurance',
        jewelry: 'Add jewelry coverage to protect your valuable items',
      },
      life: {
        disability: 'Protect your income with disability insurance',
        critical_illness: 'Add critical illness coverage for extra protection',
      },
    };

    return reasoningMap[existingLine]?.[targetLine] || `Expand your coverage with ${targetLine} insurance`;
  }

  private getUpgradeOptions(policy: Policy, profile: CustomerProfile): Record<string, unknown>[] {
    const upgradeOptions: Record<string, unknown>[] = [];
    const coverage = policy.coverage as Record<string, number>;

    if (policy.insuranceLine === 'auto') {
      if (coverage.liability < 250000) {
        upgradeOptions.push({ ...coverage, liability: 250000 });
      }
      if (coverage.liability < 500000) {
        upgradeOptions.push({ ...coverage, liability: 500000 });
      }
      if (!coverage.rental) {
        upgradeOptions.push({ ...coverage, rental: 1500 });
      }
      if (!coverage.roadside) {
        upgradeOptions.push({ ...coverage, roadside: 100 });
      }
    }

    if (policy.insuranceLine === 'home') {
      if (coverage.liability < 500000) {
        upgradeOptions.push({ ...coverage, liability: 500000 });
      }
      if (!coverage.umbrella && profile.annualIncome && profile.annualIncome > 100000) {
        upgradeOptions.push({ ...coverage, umbrella: profile.annualIncome * 10 });
      }
      if (coverage.replacementCost === false) {
        upgradeOptions.push({ ...coverage, replacementCost: true });
      }
    }

    if (policy.insuranceLine === 'life') {
      if (coverage.termLife && coverage.termLife < 500000) {
        upgradeOptions.push({ ...coverage, termLife: 500000 });
      }
      if (coverage.termLife && coverage.termLife < 1000000) {
        upgradeOptions.push({ ...coverage, termLife: 1000000 });
      }
    }

    return upgradeOptions;
  }

  private async estimateAdditionalPremium(line: string, coverage: Record<string, unknown>): Promise<number> {
    // In a real implementation, this would use the rating engine
    const baseRates: Record<string, number> = {
      auto: 500,
      home: 800,
      life: 300,
      health: 200,
      commercial: 1000,
    };

    let premium = baseRates[line] || 500;

    if (coverage.liability && typeof coverage.liability === 'number') {
      premium = premium * (1 + coverage.liability / 500000);
    }

    if (coverage.termLife && typeof coverage.termLife === 'number') {
      premium = coverage.termLife * 0.002;
    }

    return Math.round(premium);
  }

  private calculateExpectedValue(upgrade: Record<string, unknown>): number {
    // Simple expected value calculation based on coverage
    let value = 0;

    if (upgrade.liability && typeof upgrade.liability === 'number') {
      value += upgrade.liability * 0.01; // 1% of liability limit
    }

    if (upgrade.termLife && typeof upgrade.termLife === 'number') {
      value += upgrade.termLife * 0.005;
    }

    if (upgrade.umbrella && typeof upgrade.umbrella === 'number') {
      value += upgrade.umbrella * 0.005;
    }

    return value;
  }

  private getUpsellReasoning(line: string, upgrade: Record<string, unknown>): string {
    if (line === 'auto' && upgrade.liability) {
      return 'Increase your liability limits to better protect your assets';
    }
    if (line === 'home' && upgrade.umbrella) {
      return 'Add umbrella coverage for additional liability protection';
    }
    if (line === 'life' && upgrade.termLife) {
      return 'Increase your life insurance coverage to better protect your family';
    }

    return 'Upgrade your coverage for enhanced protection';
  }

  private async getPolicyEstimates(lines: string[], profile: CustomerProfile): Promise<Policy[]> {
    const policies: Policy[] = [];

    for (const line of lines) {
      const premium = await this.estimatePremium(line, profile);
      const coverage = this.getDefaultCoverage(line, profile);

      policies.push({
        id: `new-${line}-${Date.now()}`,
        customerId: profile.customerId,
        insuranceLine: line,
        premium,
        coverage,
      });
    }

    return policies;
  }

  private async estimatePremium(line: string, profile: CustomerProfile): Promise<number> {
    const baseRates: Record<string, number> = {
      auto: 1000,
      home: 1500,
      life: 600,
      health: 400,
      commercial: 2000,
    };

    let premium = baseRates[line] || 1000;

    if (profile.annualIncome) {
      premium *= 1 + profile.annualIncome / 200000;
    }

    if (profile.homeValue && line === 'home') {
      premium = premium * (profile.homeValue / 300000);
    }

    return Math.round(premium);
  }

  private getDefaultCoverage(line: string, profile: CustomerProfile): Record<string, unknown> {
    const coverageTemplates: Record<string, Record<string, unknown>> = {
      auto: {
        liability: 100000,
        collision: 25000,
        comprehensive: 20000,
      },
      home: {
        dwelling: profile.homeValue || 300000,
        personalProperty: (profile.homeValue || 300000) * 0.7,
        liability: 300000,
      },
      life: {
        termLife: (profile.annualIncome || 50000) * 10,
      },
      health: {
        deductible: 1500,
        outOfPocketMax: 8000,
      },
      commercial: {
        generalLiability: 1000000,
        property: 500000,
      },
    };

    return coverageTemplates[line] || {};
  }
}

// ==================== TYPES ====================

interface CustomerProfile {
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

interface Policy {
  id: string;
  customerId: string;
  insuranceLine: string;
  premium: number;
  coverage: Record<string, unknown>;
}

interface DiscountCalculation {
  discountPercentage: number;
  discountAmount: number;
  totalPremium: number;
  bundleName: string | null;
}
