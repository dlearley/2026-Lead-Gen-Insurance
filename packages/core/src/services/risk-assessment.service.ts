import {
  ApplicationData,
  RiskScore,
  RiskComponents,
  RiskAssessment,
  RiskPrediction,
} from '@insurance/types';
import logger from '../logger.js';

/**
 * Service for risk assessment and evaluation
 */
export class RiskAssessmentService {
  private activeModelVersion = '1.0.0';

  /**
   * Assess risk for application
   */
  async assessRisk(applicationData: ApplicationData): Promise<RiskAssessment> {
    logger.info('Assessing risk', { insuranceType: applicationData.insuranceType });

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(applicationData);

    // Determine decision
    const decision = this.determineDecision(riskScore, applicationData);

    // Check for exceptions
    const exceptions = this.checkForExceptions(applicationData, riskScore);

    // Generate recommended coverage
    const coverageRecommended = this.generateCoverageRecommendation(riskScore, applicationData);

    // Calculate premium estimate
    const premiumEstimate = this.calculatePremiumEstimate(riskScore, applicationData);

    logger.info('Risk assessment complete', {
      riskScore: riskScore.totalScore,
      decision,
    });

    return {
      leadId: applicationData.applicant.email || 'unknown',
      riskScore,
      decision,
      exceptions,
      coverageRecommended,
      premiumEstimate,
    };
  }

  /**
   * Calculate risk components (driver, property, health, etc)
   */
  async calculateRiskComponents(applicationData: ApplicationData): Promise<RiskComponents> {
    logger.debug('Calculating risk components');

    const components: RiskComponents = {
      driver: 0,
      property: 0,
      health: 0,
      occupational: 0,
      financial: 0,
      location: 0,
    };

    const { applicant, riskFactors } = applicationData;

    // Driver risk component
    if (applicant.age !== undefined) {
      if (applicant.age < 18) {
        components.driver = 100;
      } else if (applicant.age >= 18 && applicant.age <= 25) {
        components.driver = 35;
      } else if (applicant.age > 65) {
        components.driver = 25;
      } else {
        components.driver = 15;
      }
    }

    if (applicant.mvrViolations !== undefined) {
      components.driver += applicant.mvrViolations * 20;
    }

    if (applicant.accidentHistory) {
      applicant.accidentHistory.forEach(accident => {
        if (accident.atFault) {
          components.driver += accident.severity === 'severe' ? 30 : accident.severity === 'major' ? 20 : 10;
        }
      });
    }

    // Health risk component
    if (applicant.healthStatus) {
      const healthScores: Record<string, number> = {
        excellent: 5,
        very_good: 10,
        good: 20,
        fair: 40,
        poor: 70,
      };
      components.health = healthScores[applicant.healthStatus] || 20;
    }

    if (applicant.smokerStatus) {
      components.health += 25;
    }

    // Occupational risk component
    const riskOccupations = [
      'construction', 'mining', 'fishing', 'logging', 'transportation',
      'manufacturing', 'agriculture', 'waste management', 'roofing',
    ];

    if (applicant.occupation) {
      const occupationLower = applicant.occupation.toLowerCase();
      if (riskOccupations.some(r => occupationLower.includes(r))) {
        components.occupational = 45;
      } else if (occupationLower.includes('office') || occupationLower.includes('professional')) {
        components.occupational = 10;
      } else {
        components.occupational = 20;
      }
    }

    // Financial risk component
    if (applicant.annualIncome) {
      if (applicant.annualIncome < 30000) {
        components.financial = 50;
      } else if (applicant.annualIncome < 60000) {
        components.financial = 30;
      } else if (applicant.annualIncome < 100000) {
        components.financial = 15;
      } else {
        components.financial = 5;
      }
    }

    // Additional risk factors
    riskFactors.forEach(factor => {
      if (factor.type === 'property') {
        components.property += factor.impact;
      }
      if (factor.type === 'location') {
        components.location += factor.impact;
      }
      if (factor.type === 'occupation') {
        components.occupational += factor.impact;
      }
      if (factor.type === 'financial') {
        components.financial += factor.impact;
      }
    });

    // Normalize to 0-100 range
    Object.keys(components).forEach(key => {
      components[key as keyof RiskComponents] = Math.min(100, components[key as keyof RiskComponents]);
    });

    return components;
  }

  /**
   * Predict risk score using ML model
   */
  async predictRiskScore(applicationData: ApplicationData): Promise<RiskPrediction> {
    logger.info('Predicting risk score', { modelVersion: this.activeModelVersion });

    // In a real implementation, this would call ML model
    // For now, use rule-based scoring as a proxy
    const riskScore = await this.calculateRiskScore(applicationData);

    // Calculate confidence based on data completeness
    const dataCompleteness = this.calculateDataCompleteness(applicationData);
    const confidence = Math.min(0.95, 0.7 + dataCompleteness * 0.25);

    return {
      predictedScore: riskScore.totalScore,
      confidence,
      modelVersion: this.activeModelVersion,
      timestamp: new Date(),
    };
  }

  /**
   * Get risk factors explanation (SHAP values)
   */
  async getRiskFactorsExplanation(leadId: string): Promise<RiskFactorExplanation[]> {
    logger.info('Getting risk factors explanation', { leadId });

    // In a real implementation, this would query from the underwriting decision
    // and return SHAP values or similar explainable AI output
    return [
      {
        factor: 'Driver Age',
        impact: -15,
        direction: 'positive',
        description: 'Your age indicates lower driving risk',
      },
      {
        factor: 'Driving Record',
        impact: 5,
        direction: 'negative',
        description: 'Clean driving record is favorable',
      },
      {
        factor: 'Health Status',
        impact: 10,
        direction: 'negative',
        description: 'Good health status is favorable',
      },
      {
        factor: 'Occupational Risk',
        impact: 0,
        direction: 'positive',
        description: 'Occupation presents standard risk',
      },
    ];
  }

  /**
   * Flag high-risk applications
   */
  async flagHighRisk(leadId: string, riskScore: number): Promise<void> {
    logger.info('Flagging high-risk application', { leadId, riskScore });

    if (riskScore > 70) {
      logger.warn('High-risk application detected', { leadId, riskScore });

      // In a real implementation, this would:
      // 1. Create an exception record
      // 2. Notify underwriters
      // 3. Add to manual review queue
    }
  }

  /**
   * Get risk analytics by segment
   */
  async getRiskAnalytics(segment: string, period: DateRange): Promise<RiskAnalytics> {
    logger.info('Getting risk analytics', { segment, period });

    // In a real implementation, this would query aggregated data
    return {
      segment,
      period,
      totalApplications: 500,
      averageRiskScore: 42,
      riskDistribution: {
        low: 200, // 0-40
        medium: 200, // 41-60
        high: 80, // 61-80
        critical: 20, // 81-100
      },
      byComponent: {
        driver: 35,
        property: 30,
        health: 40,
        occupational: 25,
        financial: 35,
        location: 30,
      },
      topRiskFactors: [
        { factor: 'Age 18-25', averageImpact: 20, frequency: 0.3 },
        { factor: 'Multiple Violations', averageImpact: 35, frequency: 0.15 },
        { factor: 'High-Risk Occupation', averageImpact: 25, frequency: 0.1 },
        { factor: 'Low Income', averageImpact: 15, frequency: 0.25 },
      ],
      approvalRate: 0.75,
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async calculateRiskScore(applicationData: ApplicationData): Promise<RiskScore> {
    const components = await this.calculateRiskComponents(applicationData);

    // Weighted average of components
    const weights = {
      driver: applicationData.insuranceType === 'auto' ? 0.35 : 0.15,
      property: applicationData.insuranceType === 'home' ? 0.35 : 0.15,
      health: applicationData.insuranceType === 'life' || applicationData.insuranceType === 'health' ? 0.35 : 0.20,
      occupational: 0.15,
      financial: 0.10,
      location: applicationData.insuranceType === 'home' ? 0.15 : 0.10,
    };

    const totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (components[key as keyof RiskComponents] || 0) * weight;
    }, 0);

    // Generate explainable factors
    const explainableFactors = this.generateExplainableFactors(components, weights);

    // Calculate confidence interval
    const confidenceLevel = this.calculateDataCompleteness(applicationData);
    const margin = (1 - confidenceLevel) * 20;

    return {
      totalScore: Math.round(totalScore),
      components,
      confidenceInterval: {
        lower: Math.max(0, Math.round(totalScore - margin)),
        upper: Math.min(100, Math.round(totalScore + margin)),
      },
      explainableFactors,
    };
  }

  private determineDecision(riskScore: RiskScore, applicationData: ApplicationData): string {
    if (riskScore.totalScore > 80) {
      return 'denied';
    } else if (riskScore.totalScore > 60) {
      return 'manual_review';
    } else if (riskScore.totalScore > 40) {
      return 'conditional';
    } else {
      return 'approved';
    }
  }

  private checkForExceptions(applicationData: ApplicationData, riskScore: RiskScore): any[] {
    const exceptions: any[] = [];

    // Check for conflicting or extreme values
    if (applicationData.applicant.age && applicationData.applicant.age < 18) {
      exceptions.push({
        exceptionType: 'underage_applicant',
        severity: 'Critical',
        description: 'Applicant is under minimum age',
      });
    }

    if (applicationData.applicant.mvrViolations && applicationData.applicant.mvrViolations > 3) {
      exceptions.push({
        exceptionType: 'excessive_violations',
        severity: 'High',
        description: 'Applicant has excessive driving violations',
      });
    }

    if (riskScore.totalScore > 85) {
      exceptions.push({
        exceptionType: 'high_risk_score',
        severity: 'High',
        description: `Risk score ${riskScore.totalScore} exceeds acceptable threshold`,
      });
    }

    return exceptions;
  }

  private generateCoverageRecommendation(
    riskScore: RiskScore,
    applicationData: ApplicationData,
  ): RecommendedCoverage {
    const riskMultiplier = 1 + (riskScore.totalScore - 50) / 100;

    if (applicationData.insuranceType === 'auto') {
      return {
        limits: {
          liabilityBodilyInjury: Math.round(100000 * riskMultiplier),
          liabilityPropertyDamage: Math.round(50000 * riskMultiplier),
          uninsuredMotorist: Math.round(100000 * riskMultiplier),
        },
        deductibles: {
          collision: 500,
          comprehensive: 500,
        },
        options: ['rental', 'roadside'],
      };
    }

    if (applicationData.insuranceType === 'home') {
      return {
        limits: {
          dwelling: 300000,
          personalProperty: 210000,
          liability: Math.round(300000 * riskMultiplier),
          medicalPayments: 5000,
        },
        deductibles: {
          dwelling: 1000,
          personalProperty: 500,
        },
        options: ['replacement_cost', 'water_backup'],
      };
    }

    return {
      limits: {},
      deductibles: {},
      options: [],
    };
  }

  private calculatePremiumEstimate(riskScore: RiskScore, applicationData: ApplicationData): number {
    // Base premium by insurance type
    const basePremiums: Record<string, number> = {
      auto: 1200,
      home: 1500,
      life: 600,
      health: 400,
      commercial: 2000,
    };

    const basePremium = basePremiums[applicationData.insuranceType] || 1000;

    // Risk multiplier (higher risk = higher premium)
    const riskMultiplier = 1 + (riskScore.totalScore / 100) * 1.5;

    return Math.round(basePremium * riskMultiplier);
  }

  private generateExplainableFactors(
    components: RiskComponents,
    weights: Record<string, number>,
  ): RiskFactorExplanation[] {
    return Object.entries(components).map(([factor, value]) => ({
      factor: factor.charAt(0).toUpperCase() + factor.slice(1),
      impact: Math.round((value - 50) * weights[factor] * 100) / 100,
      direction: value > 50 ? 'negative' as const : 'positive' as const,
      description: this.getFactorDescription(factor, value),
    }));
  }

  private getFactorDescription(factor: string, value: number): string {
    if (value > 70) return `High risk factor for ${factor}`;
    if (value > 50) return `Elevated risk factor for ${factor}`;
    if (value > 30) return `Moderate risk factor for ${factor}`;
    if (value > 15) return `Low risk factor for ${factor}`;
    return `Favorable factor for ${factor}`;
  }

  private calculateDataCompleteness(applicationData: ApplicationData): number {
    let requiredFields = 0;
    let presentFields = 0;

    const fields = [
      'age',
      'mvrViolations',
      'healthStatus',
      'smokerStatus',
      'annualIncome',
      'occupation',
    ];

    fields.forEach(field => {
      requiredFields++;
      if (applicationData.applicant[field as keyof typeof applicationData.applicant] !== undefined) {
        presentFields++;
      }
    });

    return presentFields / requiredFields;
  }
}

// ==================== TYPES ====================

interface RecommendedCoverage {
  limits: Record<string, number>;
  deductibles: Record<string, number>;
  options: string[];
}

interface RiskFactorExplanation {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
  description: string;
}

interface RiskAnalytics {
  segment: string;
  period: DateRange;
  totalApplications: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byComponent: {
    driver: number;
    property: number;
    health: number;
    occupational: number;
    financial: number;
    location: number;
  };
  topRiskFactors: Array<{
    factor: string;
    averageImpact: number;
    frequency: number;
  }>;
  approvalRate: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}
