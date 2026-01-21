import {
  CoverageGap,
  GapAnalysis,
  GapRecommendation,
  GapSeverity,
  DateRange,
} from '@insurance-lead-gen/types';
import logger from '../logger.js';

/**
 * Service for identifying and analyzing coverage gaps
 */
export class CoverageGapService {
  /**
   * Identify coverage gaps for a customer
   */
  async identifyCoverageGaps(customerId: string): Promise<CoverageGap[]> {
    logger.info('Identifying coverage gaps', { customerId });

    // Fetch customer profile and current policies
    const customerProfile = await this.fetchCustomerProfile(customerId);
    const currentPolicies = await this.fetchCurrentPolicies(customerId);

    // Get benchmark coverage for this customer
    const benchmarkCoverage = await this.getBenchmarkCoverage(customerProfile);

    // Compare current vs benchmark
    const gaps = this.compareCoverage(currentPolicies, benchmarkCoverage);

    // Calculate financial exposure for each gap
    for (const gap of gaps) {
      gap.financialExposure = await this.calculateGapExposure(customerId, gap.gapType);
    }

    logger.info('Coverage gaps identified', { customerId, count: gaps.length });

    return gaps;
  }

  /**
   * Calculate financial exposure from gaps
   */
  async calculateGapExposure(customerId: string, gapType: string): Promise<number> {
    logger.info('Calculating gap exposure', { customerId, gapType });

    // In a real implementation, this would calculate based on:
    // - Current asset values
    // - Liability exposure
    // - Industry benchmarks
    // - Historical claim data

    const exposureMap: Record<string, number> = {
      'missing_uninsured_motorist': 100000,
      'low_liability_limits': 250000,
      'no_umbrella_coverage': 500000,
      'underinsured_home': 200000,
      'missing_jewelry_coverage': 25000,
      'insufficient_life_coverage': 500000,
      'no_business_interruption': 300000,
      'missing_professional_liability': 1000000,
    };

    return exposureMap[gapType] || 50000;
  }

  /**
   * Get benchmark coverage for customer
   */
  async getBenchmarkCoverage(demographics: CustomerDemographics): Promise<BenchmarkCoverage> {
    logger.info('Getting benchmark coverage', { demographics });

    // Calculate recommended coverage based on demographics, assets, and income
    const annualIncome = demographics.annualIncome || 0;
    const dependents = demographics.dependents || 0;
    const homeValue = demographics.homeValue || 0;
    const vehicleCount = demographics.vehicleCount || 0;

    return {
      auto: {
        liabilityBodilyInjury: Math.max(100000, annualIncome * 3),
        liabilityPropertyDamage: Math.max(50000, homeValue * 0.1),
        uninsuredMotorist: Math.max(100000, annualIncome * 2),
        collision: homeValue * 0.15,
        comprehensive: homeValue * 0.1,
      },
      home: {
        dwelling: homeValue,
        personalProperty: homeValue * 0.7,
        liability: Math.max(300000, annualIncome * 5),
        medicalPayments: 5000,
        umbrella: Math.max(1000000, annualIncome * 10),
      },
      life: {
        termLife: Math.max(500000, annualIncome * 10 + dependents * 200000),
        disability: annualIncome * 0.6,
      },
      health: {
        deductible: annualIncome * 0.02,
        outOfPocketMax: annualIncome * 0.1,
      },
    };
  }

  /**
   * Get gap recommendations prioritized by severity
   */
  async getGapRecommendations(customerId: string): Promise<GapRecommendation[]> {
    logger.info('Getting gap recommendations', { customerId });

    const gaps = await this.identifyCoverageGaps(customerId);
    const recommendations: GapRecommendation[] = [];

    for (const gap of gaps) {
      const recommendation: GapRecommendation = {
        gapId: gap.id,
        insuranceLine: gap.insuranceLine || 'general',
        currentCoverage: gap.currentCoverage,
        recommendedCoverage: gap.recommendedCoverage,
        exposureAmount: gap.financialExposure,
        estimatedPremium: await this.estimatePremiumForGap(gap),
        urgency: this.determineUrgency(gap.gapSeverity, gap.financialExposure),
        reasoning: this.generateGapReasoning(gap),
      };

      recommendations.push(recommendation);
    }

    // Sort by urgency and exposure
    recommendations.sort((a, b) => {
      const urgencyOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 4;
      const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 4;

      if (aUrgency !== bUrgency) {
        return aUrgency - bUrgency;
      }

      return b.exposureAmount - a.exposureAmount;
    });

    return recommendations;
  }

  /**
   * Track gap closure (when customer accepts recommendation)
   */
  async recordGapClosure(customerId: string, gapId: string): Promise<void> {
    logger.info('Recording gap closure', { customerId, gapId });

    // In a real implementation, this would update the database
    // to mark the gap as closed/closed
  }

  /**
   * Get gap analytics
   */
  async getGapAnalytics(dateRange: DateRange): Promise<GapAnalytics> {
    logger.info('Getting gap analytics', { dateRange });

    // In a real implementation, this would aggregate data from the database
    return {
      totalGapsIdentified: 1000,
      gapsClosed: 350,
      closureRate: 0.35,
      totalExposure: 50000000,
      exposureMitigated: 17500000,
      byInsuranceLine: {
        auto: { total: 300, closed: 90, exposure: 15000000 },
        home: { total: 400, closed: 140, exposure: 25000000 },
        life: { total: 200, closed: 80, exposure: 8000000 },
        health: { total: 100, closed: 40, exposure: 2000000 },
      },
      bySeverity: {
        Critical: { total: 50, closed: 20, exposure: 20000000 },
        High: { total: 150, closed: 60, exposure: 15000000 },
        Medium: { total: 400, closed: 150, exposure: 10000000 },
        Low: { total: 400, closed: 120, exposure: 5000000 },
      },
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchCustomerProfile(customerId: string): Promise<CustomerDemographics> {
    // In a real implementation, this would query the database
    return {
      age: 35,
      maritalStatus: 'married',
      dependents: 2,
      annualIncome: 75000,
      homeValue: 350000,
      vehicleCount: 2,
      occupation: 'professional',
    };
  }

  private async fetchCurrentPolicies(customerId: string): Promise<CurrentCoverage[]> {
    // In a real implementation, this would query the database
    return [
      {
        insuranceLine: 'auto',
        coverageType: 'liability',
        limits: {
          bodilyInjury: 50000,
          propertyDamage: 25000,
        },
      },
      {
        insuranceLine: 'home',
        coverageType: 'property',
        limits: {
          dwelling: 300000,
          personalProperty: 200000,
          liability: 100000,
        },
      },
    ];
  }

  private compareCoverage(current: CurrentCoverage[], benchmark: BenchmarkCoverage): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    // Check auto coverage gaps
    const autoPolicy = current.find(c => c.insuranceLine === 'auto');
    if (!autoPolicy) {
      gaps.push({
        id: this.generateId(),
        customerId: 'sample-customer-id',
        gapType: 'missing_auto_coverage',
        insuranceLine: 'auto',
        currentCoverage: {},
        recommendedCoverage: benchmark.auto,
        financialExposure: 0,
        gapSeverity: 'Critical',
        identifiedDate: new Date(),
        recommendationStatus: 'identified',
      });
    } else {
      const autoLimits = autoPolicy.limits as Record<string, number>;
      if (autoLimits.bodilyInjury < benchmark.auto.liabilityBodilyInjury) {
        gaps.push({
          id: this.generateId(),
          customerId: 'sample-customer-id',
          gapType: 'low_liability_limits',
          insuranceLine: 'auto',
          currentCoverage: { liability: { bodilyInjury: autoLimits.bodilyInjury } },
          recommendedCoverage: {
            liability: { bodilyInjury: benchmark.auto.liabilityBodilyInjury },
          },
          financialExposure: 0,
          gapSeverity: 'High',
          identifiedDate: new Date(),
          recommendationStatus: 'identified',
        });
      }
    }

    // Check home coverage gaps
    const homePolicy = current.find(c => c.insuranceLine === 'home');
    if (!homePolicy) {
      gaps.push({
        id: this.generateId(),
        customerId: 'sample-customer-id',
        gapType: 'missing_home_coverage',
        insuranceLine: 'home',
        currentCoverage: {},
        recommendedCoverage: benchmark.home,
        financialExposure: 0,
        gapSeverity: 'Critical',
        identifiedDate: new Date(),
        recommendationStatus: 'identified',
      });
    } else {
      const homeLimits = homePolicy.limits as Record<string, number>;
      if (!homeLimits.umbrella) {
        gaps.push({
          id: this.generateId(),
          customerId: 'sample-customer-id',
          gapType: 'no_umbrella_coverage',
          insuranceLine: 'home',
          currentCoverage: homeLimits,
          recommendedCoverage: { umbrella: benchmark.home.umbrella },
          financialExposure: 0,
          gapSeverity: 'Medium',
          identifiedDate: new Date(),
          recommendationStatus: 'identified',
        });
      }
    }

    // Check life coverage gaps
    const lifePolicy = current.find(c => c.insuranceLine === 'life');
    if (!lifePolicy) {
      gaps.push({
        id: this.generateId(),
        customerId: 'sample-customer-id',
        gapType: 'missing_life_coverage',
        insuranceLine: 'life',
        currentCoverage: {},
        recommendedCoverage: benchmark.life,
        financialExposure: 0,
        gapSeverity: 'High',
        identifiedDate: new Date(),
        recommendationStatus: 'identified',
      });
    }

    return gaps;
  }

  private async estimatePremiumForGap(gap: CoverageGap): Promise<number> {
    // Simple estimation based on exposure and insurance line
    const premiumRates: Record<string, number> = {
      auto: 0.02, // 2% of exposure annually
      home: 0.015, // 1.5% of exposure annually
      life: 0.005, // 0.5% of coverage amount annually
      health: 0.03, // 3% of expected claims annually
      commercial: 0.025, // 2.5% of exposure annually
    };

    const rate = premiumRates[gap.insuranceLine || 'general'] || 0.02;
    return Math.round(gap.financialExposure * rate);
  }

  private determineUrgency(severity: GapSeverity, exposure: number): 'Critical' | 'High' | 'Medium' | 'Low' {
    if (severity === 'Critical' || exposure > 1000000) {
      return 'Critical';
    }
    if (severity === 'High' || exposure > 500000) {
      return 'High';
    }
    if (severity === 'Medium' || exposure > 100000) {
      return 'Medium';
    }
    return 'Low';
  }

  private generateGapReasoning(gap: CoverageGap): string {
    const reasonMap: Record<string, string> = {
      missing_auto_coverage: 'No auto insurance coverage exposes you to significant financial liability in case of accidents.',
      low_liability_limits: 'Current liability limits are below industry recommended levels for your income and assets.',
      missing_home_coverage: 'Your home is likely your largest asset - protect it with proper insurance.',
      no_umbrella_coverage: 'Umbrella coverage provides excess liability protection beyond standard policy limits.',
      missing_life_coverage: 'Life insurance ensures your family is protected financially in case of unexpected events.',
      missing_uninsured_motorist: 'Uninsured motorist coverage protects you from drivers without insurance.',
      underinsured_home: 'Current home coverage may not fully cover replacement costs.',
    };

    return reasonMap[gap.gapType] || 'Coverage gap identified based on industry benchmarks.';
  }

  private generateId(): string {
    return `gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== TYPES ====================

interface CustomerDemographics {
  age?: number;
  maritalStatus?: string;
  dependents?: number;
  annualIncome?: number;
  homeValue?: number;
  vehicleCount?: number;
  occupation?: string;
  riskTolerance?: string;
}

interface BenchmarkCoverage {
  auto: {
    liabilityBodilyInjury: number;
    liabilityPropertyDamage: number;
    uninsuredMotorist: number;
    collision: number;
    comprehensive: number;
  };
  home: {
    dwelling: number;
    personalProperty: number;
    liability: number;
    medicalPayments: number;
    umbrella: number;
  };
  life: {
    termLife: number;
    disability: number;
  };
  health: {
    deductible: number;
    outOfPocketMax: number;
  };
}

interface CurrentCoverage {
  insuranceLine: string;
  coverageType: string;
  limits: Record<string, number | undefined>;
}

interface GapAnalytics {
  totalGapsIdentified: number;
  gapsClosed: number;
  closureRate: number;
  totalExposure: number;
  exposureMitigated: number;
  byInsuranceLine: Record<string, { total: number; closed: number; exposure: number }>;
  bySeverity: Record<string, { total: number; closed: number; exposure: number }>;
}
