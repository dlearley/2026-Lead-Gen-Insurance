import {
  UnderwritingDecision,
  ApplicationData,
  RiskScore,
  RiskComponents,
  Exception,
  RecommendedCoverage,
  RuleCondition,
  DecisionAction,
  UnderwritingCase,
  MakeUnderwritingDecisionDto,
} from '@insurance/types';
import logger from '../logger.js';

/**
 * Service for automated underwriting decisions
 */
export class UnderwritingEngineService {
  /**
   * Execute underwriting decision for a lead
   */
  async underwriteApplication(leadId: string): Promise<UnderwritingDecision> {
    logger.info('Starting underwriting evaluation', { leadId });

    // In a real implementation, this would fetch lead data and application details
    const applicationData = await this.fetchApplicationData(leadId);

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(applicationData);

    // Apply underwriting rules
    const ruleResult = await this.applyUnderwritingRules(leadId, applicationData);

    // Make decision based on risk score and rules
    const decision = this.makeDecision(riskScore, ruleResult);

    logger.info('Underwriting decision made', { leadId, decision, riskScore: riskScore.totalScore });

    return decision;
  }

  /**
   * Calculate risk score for application
   */
  async calculateRiskScore(applicationData: ApplicationData): Promise<RiskScore> {
    const components = await this.calculateRiskComponents(applicationData);

    // Weighted average of components
    const weights = {
      driver: 0.25,
      property: 0.20,
      health: 0.20,
      occupational: 0.15,
      financial: 0.10,
      location: 0.10,
    };

    const totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (components[key as keyof RiskComponents] || 0) * weight * 100;
    }, 0);

    // Generate explainable factors (SHAP-like values)
    const explainableFactors = this.generateExplainableFactors(components, weights);

    return {
      totalScore: Math.round(totalScore),
      components,
      confidenceInterval: {
        lower: Math.max(0, totalScore - 10),
        upper: Math.min(100, totalScore + 10),
      },
      explainableFactors,
    };
  }

  /**
   * Calculate individual risk components
   */
  async calculateRiskComponents(applicationData: ApplicationData): Promise<RiskComponents> {
    const { applicant, riskFactors } = applicationData;

    const components: RiskComponents = {
      driver: 0,
      property: 0,
      health: 0,
      occupational: 0,
      financial: 0,
      location: 0,
    };

    // Driver risk assessment
    if (applicant.age !== undefined) {
      if (applicant.age < 18) components.driver += 100;
      else if (applicant.age >= 18 && applicant.age <= 25) components.driver += 30;
      else if (applicant.age > 25 && applicant.age <= 65) components.driver += 10;
      else components.driver += 20; // Age > 65
    }

    if (applicant.mvrViolations !== undefined) {
      components.driver += applicant.mvrViolations * 15;
    }

    // Health risk assessment
    if (applicant.healthStatus === 'poor') components.health += 60;
    else if (applicant.healthStatus === 'fair') components.health += 30;
    else if (applicant.healthStatus === 'good') components.health += 10;

    if (applicant.smokerStatus) components.health += 25;

    // Occupational risk
    const highRiskOccupations = ['construction', 'mining', 'fishing', 'logging', 'transportation'];
    if (applicant.occupation && highRiskOccupations.some(o => applicant.occupation?.toLowerCase().includes(o))) {
      components.occupational += 40;
    }

    // Financial risk
    if (applicant.annualIncome) {
      if (applicant.annualIncome < 30000) components.financial += 40;
      else if (applicant.annualIncome < 60000) components.financial += 20;
      else components.financial += 10;
    }

    // Additional risk factors
    riskFactors.forEach(factor => {
      if (factor.type === 'property') components.property += factor.impact;
      if (factor.type === 'location') components.location += factor.impact;
      if (factor.type === 'occupation') components.occupational += factor.impact;
    });

    // Normalize components to 0-100 range
    Object.keys(components).forEach(key => {
      components[key as keyof RiskComponents] = Math.min(100, components[key as keyof RiskComponents]);
    });

    return components;
  }

  /**
   * Apply underwriting rules
   */
  async applyUnderwritingRules(leadId: string, applicationData: ApplicationData): Promise<RuleApplicationResult> {
    const matchedRules: string[] = [];
    const riskAdjustments: number[] = [];
    let decisionAction: DecisionAction | null = null;

    // Auto insurance specific rules
    if (applicationData.insuranceType === 'auto') {
      const autoRules = this.getAutoInsuranceRules();

      for (const rule of autoRules) {
        if (this.evaluateRule(rule, applicationData)) {
          matchedRules.push(rule.id);
          riskAdjustments.push(rule.riskScoreAdjustment);

          if (rule.decisionAction === 'auto_deny') {
            decisionAction = 'auto_deny';
            break;
          } else if (rule.decisionAction === 'auto_approve' && !decisionAction) {
            decisionAction = 'auto_approve';
          }
        }
      }
    }

    // Apply cumulative risk adjustment
    const totalAdjustment = riskAdjustments.reduce((sum, adj) => sum + adj, 0);

    return {
      matchedRules,
      riskAdjustment: totalAdjustment,
      decisionAction,
    };
  }

  /**
   * Get manual review queue
   */
  async getManualReviewQueue(sortBy: 'risk' | 'age' = 'risk'): Promise<UnderwritingCase[]> {
    logger.info('Fetching manual review queue', { sortBy });

    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Make underwriting decision
   */
  async makeUnderwritingDecision(leadId: string, decision: MakeUnderwritingDecisionDto): Promise<void> {
    logger.info('Recording underwriting decision', { leadId, decision: decision.decision });

    // In a real implementation, this would update the database record
    // For now, just log
  }

  /**
   * Flag exception for manual review
   */
  async flagException(leadId: string, exceptionType: string, severity: string): Promise<void> {
    logger.warn('Flagging underwriting exception', { leadId, exceptionType, severity });

    // In a real implementation, this would create an exception record
  }

  /**
   * Get exceptions for a lead
   */
  async getExceptions(leadId: string): Promise<Exception[]> {
    // In a real implementation, this would query the database
    return [];
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchApplicationData(leadId: string): Promise<ApplicationData> {
    // In a real implementation, this would fetch lead and application data from the database
    return {
      insuranceType: 'auto',
      applicant: {
        age: 35,
        mvrViolations: 0,
        healthStatus: 'good',
        smokerStatus: false,
        annualIncome: 75000,
        occupation: 'software engineer',
      },
      riskFactors: [],
      coverageRequested: {
        coverageType: 'liability',
        coverageAmount: 100000,
      },
    };
  }

  private makeDecision(riskScore: RiskScore, ruleResult: RuleApplicationResult): UnderwritingDecision {
    // If a rule specifically dictates the decision, follow it
    if (ruleResult.decisionAction === 'auto_deny') {
      return 'denied';
    }

    if (ruleResult.decisionAction === 'auto_approve') {
      return 'approved';
    }

    // Otherwise, use risk score
    const adjustedScore = riskScore.totalScore + ruleResult.riskAdjustment;

    if (adjustedScore > 85) {
      return 'approved';
    } else if (adjustedScore >= 60) {
      return 'manual_review';
    } else if (adjustedScore >= 40) {
      return 'conditional';
    } else {
      return 'denied';
    }
  }

  private evaluateRule(rule: UnderwritingRule, applicationData: ApplicationData): boolean {
    return rule.conditions.every(condition => {
      const value = this.getFieldValue(applicationData, condition.field);
      return this.compareValues(value, condition.operator, condition.value);
    });
  }

  private getFieldValue(data: ApplicationData, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private compareValues(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'greater_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'less_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'contains':
        return typeof actual === 'string' && String(expected).toLowerCase().includes(actual.toLowerCase());
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  private generateExplainableFactors(components: RiskComponents, weights: Record<string, number>) {
    return Object.entries(components).map(([factor, value]) => ({
      factor: factor.charAt(0).toUpperCase() + factor.slice(1),
      impact: Math.round((value / 100) * 100), // Percentage impact
      direction: value > 50 ? 'negative' as const : 'positive' as const,
      description: this.getFactorDescription(factor, value),
    }));
  }

  private getFactorDescription(factor: string, value: number): string {
    if (value > 70) return `High risk factor for ${factor}`;
    if (value > 40) return `Moderate risk factor for ${factor}`;
    return `Low risk factor for ${factor}`;
  }

  private getAutoInsuranceRules(): UnderwritingRule[] {
    return [
      {
        id: 'auto_underage',
        ruleName: 'Underage Driver',
        conditions: [{ field: 'applicant.age', operator: 'less_than', value: 18 }],
        riskScoreAdjustment: 100,
        decisionAction: 'auto_deny',
      },
      {
        id: 'auto_multiple_violations',
        ruleName: 'Multiple Traffic Violations',
        conditions: [{ field: 'applicant.mvrViolations', operator: 'greater_than', value: 2 }],
        riskScoreAdjustment: 50,
        decisionAction: 'auto_deny',
      },
      {
        id: 'auto_clean_record',
        ruleName: 'Clean Driving Record',
        conditions: [
          { field: 'applicant.mvrViolations', operator: 'equals', value: 0 },
          { field: 'applicant.age', operator: 'greater_than', value: 25 },
        ],
        riskScoreAdjustment: -20,
        decisionAction: 'auto_approve',
      },
    ];
  }
}

// ==================== TYPES ====================

interface UnderwritingRule {
  id: string;
  ruleName: string;
  conditions: RuleCondition[];
  riskScoreAdjustment: number;
  decisionAction: DecisionAction;
}

interface RuleApplicationResult {
  matchedRules: string[];
  riskAdjustment: number;
  decisionAction: DecisionAction | null;
}
