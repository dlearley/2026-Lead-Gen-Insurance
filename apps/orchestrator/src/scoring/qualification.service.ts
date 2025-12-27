import { logger } from '@insurance-lead-gen/core';
import type {
  LeadBasicInfo,
  VehicleInfo,
  PropertyInfo,
  LifeInsuranceInfo,
  HealthInsuranceInfo,
  CommercialInsuranceInfo,
  LeadScoringResult,
  QualificationResult,
  QualificationDetails,
  BuyingSignal,
  RuleSet,
  QualificationRule,
  LeadQualificationLevel,
  InsuranceType,
} from '@insurance-lead-gen/types';

export interface QualificationConfig {
  enableRulesEngine: boolean;
  enableMLQualification: boolean;
  autoQualifyThreshold: number;
  autoDisqualifyThreshold: number;
  defaultEstimatedValues: Record<InsuranceType, number>;
}

// Default qualification configuration
const DEFAULT_QUALIFICATION_CONFIG: QualificationConfig = {
  enableRulesEngine: true,
  enableMLQualification: true,
  autoQualifyThreshold: 75,
  autoDisqualifyThreshold: 25,
  defaultEstimatedValues: {
    auto: 1200,
    home: 1800,
    life: 2500,
    health: 600,
    commercial: 5000,
  },
};

// Default rule sets for qualification
const DEFAULT_RULE_SETS: RuleSet[] = [
  {
    id: 'auto-qualification',
    name: 'Auto Insurance Qualification',
    description: 'Rules for qualifying auto insurance leads',
    insuranceType: 'auto',
    isActive: true,
    priority: 1,
    rules: [
      {
        id: 'auto-no-license',
        name: 'No Valid License',
        description: 'Disqualify if no valid driver license',
        category: 'Eligibility',
        condition: {
          field: 'vehicleInfo',
          operator: 'exists',
          value: false,
        },
        action: {
          type: 'disqualify',
          params: { reason: 'No vehicle information provided' },
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'auto-high-risk-driver',
        name: 'High Risk Driver',
        description: 'Flag if more than 2 accidents in 5 years',
        category: 'Risk',
        condition: {
          field: 'vehicleInfo.accidentsLast5Years',
          operator: 'gte',
          value: 3,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: -30 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'auto-new-car',
        name: 'New Vehicle Purchase',
        description: 'High intent signal for new car buyers',
        category: 'Buying Signal',
        condition: {
          field: 'vehicleInfo.year',
          operator: 'eq',
          value: new Date().getFullYear(),
        },
        action: {
          type: 'set_urgency',
          params: { urgency: 'immediate' },
        },
        priority: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'home-qualification',
    name: 'Home Insurance Qualification',
    description: 'Rules for qualifying home insurance leads',
    insuranceType: 'home',
    isActive: true,
    priority: 1,
    rules: [
      {
        id: 'home-new-homeowner',
        name: 'New Homeowner',
        description: 'Flag new homeowners - high intent',
        category: 'Buying Signal',
        condition: {
          field: 'propertyInfo.ownership',
          operator: 'in',
          value: ['owned', 'mortgaged'],
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 15 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'home-claims-history',
        name: 'High Claims History',
        description: 'Flag if more than 2 claims in 5 years',
        category: 'Risk',
        condition: {
          field: 'propertyInfo.hasClaimsLast5Years',
          operator: 'gte',
          value: 3,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: -25 },
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'life-qualification',
    name: 'Life Insurance Qualification',
    description: 'Rules for qualifying life insurance leads',
    insuranceType: 'life',
    isActive: true,
    priority: 1,
    rules: [
      {
        id: 'life-age-range',
        name: 'Optimal Age Range',
        description: 'Flag leads in prime age range for life insurance',
        category: 'Eligibility',
        condition: {
          field: 'lifeInsuranceInfo.age',
          operator: 'in',
          value: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
        },
        action: {
          type: 'qualify',
          params: {},
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'life-family-dependents',
        name: 'Has Dependents',
        description: 'Flag leads with family responsibilities',
        category: 'Buying Signal',
        condition: {
          field: 'lifeInsuranceInfo.coverageAmount',
          operator: 'gte',
          value: 500000,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 20 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'life-health-class',
        name: 'Health Class Excellent',
        description: 'Excellent health class indicates good qualification',
        category: 'Eligibility',
        condition: {
          field: 'lifeInsuranceInfo.healthClass',
          operator: 'eq',
          value: 'excellent',
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 25 },
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'health-qualification',
    name: 'Health Insurance Qualification',
    description: 'Rules for qualifying health insurance leads',
    insuranceType: 'health',
    isActive: true,
    priority: 1,
    rules: [
      {
        id: 'health-no-coverage',
        name: 'Currently Uninsured',
        description: 'Flag leads without current coverage',
        category: 'Buying Signal',
        condition: {
          field: 'healthInsuranceInfo.currentCoverage',
          operator: 'eq',
          value: false,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 20 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'health-family-coverage',
        name: 'Needs Family Coverage',
        description: 'Flag leads seeking family coverage',
        category: 'Buying Signal',
        condition: {
          field: 'healthInsuranceInfo.desiredCoverageType',
          operator: 'eq',
          value: 'family',
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 15 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'commercial-qualification',
    name: 'Commercial Insurance Qualification',
    description: 'Rules for qualifying commercial insurance leads',
    insuranceType: 'commercial',
    isActive: true,
    priority: 1,
    rules: [
      {
        id: 'commercial-established',
        name: 'Established Business',
        description: 'Flag businesses with 5+ years',
        category: 'Buying Signal',
        condition: {
          field: 'commercialInfo.yearsInBusiness',
          operator: 'gte',
          value: 5,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 20 },
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'commercial-no-coverage',
        name: 'No Current Coverage',
        description: 'Flag businesses without current insurance',
        category: 'Buying Signal',
        condition: {
          field: 'commercialInfo.currentCoverage',
          operator: 'eq',
          value: false,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 25 },
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'commercial-multi-policy',
        name: 'Multi-Policy Opportunity',
        description: 'Flag for multiple policy needs',
        category: 'Buying Signal',
        condition: {
          field: 'commercialInfo.hasPKCoverage',
          operator: 'eq',
          value: true,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 15 },
        },
        priority: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: 'general-qualification',
    name: 'General Qualification Rules',
    description: 'General rules applicable to all lead types',
    insuranceType: 'all',
    isActive: true,
    priority: 0,
    rules: [
      {
        id: 'general-complete-contact',
        name: 'Complete Contact Information',
        description: 'Add score for complete contact info',
        category: 'Contact',
        condition: {
          field: 'hasCompleteContact',
          operator: 'eq',
          value: true,
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 10 },
        },
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'general-referral',
        name: 'Referral Source',
        description: 'Higher score for referred leads',
        category: 'Source',
        condition: {
          field: 'leadData.source',
          operator: 'eq',
          value: 'referral',
        },
        action: {
          type: 'adjust_score',
          params: { adjustment: 15 },
        },
        priority: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'general-immediate-need',
        name: 'Immediate Need Signal',
        description: 'Flag if urgency is immediate',
        category: 'Urgency',
        condition: {
          field: 'urgency',
          operator: 'eq',
          value: 'immediate',
        },
        action: {
          type: 'set_urgency',
          params: { urgency: 'immediate' },
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

export class LeadQualificationService {
  private config: QualificationConfig;
  private ruleSets: Map<string, RuleSet> = new Map();

  constructor(config?: Partial<QualificationConfig>) {
    this.config = { ...DEFAULT_QUALIFICATION_CONFIG, ...config };
    
    // Initialize default rule sets
    DEFAULT_RULE_SETS.forEach(ruleSet => {
      this.ruleSets.set(ruleSet.id, ruleSet);
    });

    logger.info('Lead qualification service initialized', { 
      enableRulesEngine: this.config.enableRulesEngine,
      autoQualifyThreshold: this.config.autoQualifyThreshold,
    });
  }

  async qualifyLead(
    leadData: LeadBasicInfo,
    scoringResult?: LeadScoringResult,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): Promise<QualificationResult> {
    const startTime = Date.now();

    try {
      // Get or calculate scoring result
      const effectiveScoringResult = scoringResult || await this.calculateScore(
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      // Calculate qualification details
      const qualificationDetails = this.calculateQualificationDetails(
        leadData,
        effectiveScoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      // Apply rules engine
      const ruleResults = this.applyRules(
        leadData,
        effectiveScoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      // Determine final qualification
      const finalScore = effectiveScoringResult.normalizedScore + ruleResults.scoreAdjustment;
      const qualificationLevel = this.determineLevel(finalScore, qualificationDetails);
      const recommendation = this.determineRecommendation(qualificationLevel, qualificationDetails, ruleResults);
      const estimatedValue = this.calculateEstimatedValue(
        effectiveScoringResult.primaryInsuranceType,
        effectiveScoringResult.normalizedScore
      );
      const conversionProbability = this.calculateConversionProbability(qualificationDetails, effectiveScoringResult);
      const suggestedProducts = this.determineSuggestedProducts(
        leadData,
        effectiveScoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );
      const nextBestSteps = this.determineNextSteps(
        qualificationLevel,
        recommendation,
        effectiveScoringResult.primaryInsuranceType,
        ruleResults
      );

      const processingTime = Date.now() - startTime;

      logger.info('Lead qualified', {
        leadId: leadData.id,
        qualificationLevel,
        recommendation,
        finalScore,
        processingTime,
      });

      return {
        leadId: leadData.id,
        isQualified: qualificationLevel !== 'unqualified',
        qualificationLevel,
        recommendation,
        keyQualifiers: ruleResults.keyQualifiers,
        riskFactors: ruleResults.riskFactors,
        suggestedAction: this.generateActionDescription(recommendation, qualificationLevel),
        estimatedValue,
        conversionProbability,
        suggestedInsuranceProducts: suggestedProducts,
        nextBestSteps,
        qualificationDetails,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to qualify lead', { error, leadId: leadData.id });
      throw error;
    }
  }

  private async calculateScore(
    leadData: LeadBasicInfo,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): Promise<LeadScoringResult> {
    // Import and use scoring service
    const { LeadScoringService } = await import('./lead-scoring.service.js');
    const scoringService = new LeadScoringService();
    return scoringService.scoreLead(
      leadData,
      vehicleInfo,
      propertyInfo,
      lifeInsuranceInfo,
      healthInsuranceInfo,
      commercialInfo
    );
  }

  private calculateQualificationDetails(
    leadData: LeadBasicInfo,
    scoringResult: LeadScoringResult,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): QualificationDetails {
    // Eligibility Score (0-100)
    let eligibilityScore = 50;
    const eligibilityFactors: string[] = [];

    // Contact completeness
    if (leadData.email && leadData.phone) {
      eligibilityScore += 25;
      eligibilityFactors.push('Complete contact info');
    }

    // Insurance-specific eligibility
    if (vehicleInfo) {
      if (vehicleInfo.ownership !== undefined) {
        eligibilityScore += 15;
        eligibilityFactors.push('Vehicle ownership verified');
      }
    }

    if (propertyInfo) {
      eligibilityScore += 15;
      eligibilityFactors.push('Property information provided');
    }

    if (lifeInsuranceInfo) {
      if (lifeInsuranceInfo.age >= 18 && lifeInsuranceInfo.age <= 75) {
        eligibilityScore += 20;
        eligibilityFactors.push('Age within insurable range');
      }
    }

    eligibilityScore = Math.min(100, Math.max(0, eligibilityScore));

    // Affordability Score (0-100)
    let affordabilityScore = 50;

    if (leadData.metadata && leadData.metadata['budget_range']) {
      const budgetRange = leadData.metadata['budget_range'] as string;
      if (budgetRange === 'high') affordabilityScore = 80;
      else if (budgetRange === 'medium') affordabilityScore = 60;
      else if (budgetRange === 'low') affordabilityScore = 40;
    }

    if (leadData.metadata && leadData.metadata['has_budget']) {
      affordabilityScore += 20;
    }

    affordabilityScore = Math.min(100, Math.max(0, affordabilityScore));

    // Need Score (0-100)
    let needScore = 50;

    if (leadData.metadata && leadData.metadata['policy_expiring_days']) {
      const days = leadData.metadata['policy_expiring_days'] as number;
      if (days <= 30) needScore = 90;
      else if (days <= 60) needScore = 75;
      else if (days <= 90) needScore = 60;
    }

    if (!vehicleInfo?.currentCoverage) needScore += 20;
    if (!propertyInfo?.hasSecuritySystem) needScore += 10;
    if (lifeInsuranceInfo?.coverageAmount && lifeInsuranceInfo.coverageAmount > 500000) needScore += 15;

    needScore = Math.min(100, Math.max(0, needScore));

    // Authority Score (0-100)
    let authorityScore = 50;

    if (leadData.firstName && leadData.lastName) {
      authorityScore += 25;
    }

    if (leadData.source === 'referral') {
      authorityScore += 25;
    }

    authorityScore = Math.min(100, Math.max(0, authorityScore));

    // Timing Score (0-100)
    let timingScore = 50;

    if (scoringResult.urgency === 'immediate') timingScore = 95;
    else if (scoringResult.urgency === 'high') timingScore = 80;
    else if (scoringResult.urgency === 'medium') timingScore = 50;
    else if (scoringResult.urgency === 'low') timingScore = 30;

    timingScore = Math.min(100, Math.max(0, timingScore));

    // Buying Signals
    const buyingSignals: BuyingSignal[] = [];

    if (leadData.source === 'referral') {
      buyingSignals.push({
        signal: 'Referred Lead',
        strength: 'strong',
        description: 'Referred by existing customer or partner',
      });
    }

    if (vehicleInfo && vehicleInfo.year >= new Date().getFullYear() - 1) {
      buyingSignals.push({
        signal: 'New Vehicle',
        strength: 'strong',
        description: 'Recently purchased or planning to purchase new vehicle',
      });
    }

    if (propertyInfo && propertyInfo.ownership === 'owned') {
      buyingSignals.push({
        signal: 'Property Owner',
        strength: 'moderate',
        description: 'Owns property and likely needs insurance',
      });
    }

    if (lifeInsuranceInfo && lifeInsuranceInfo.coverageAmount > 500000) {
      buyingSignals.push({
        signal: 'High Coverage Need',
        strength: 'strong',
        description: 'Seeking substantial coverage, indicating serious intent',
      });
    }

    if (healthInsuranceInfo && !healthInsuranceInfo.currentCoverage) {
      buyingSignals.push({
        signal: 'Currently Uninsured',
        strength: 'strong',
        description: 'Actively seeking health coverage',
      });
    }

    // Objections
    const objections: string[] = [];

    if (vehicleInfo && vehicleInfo.accidentsLast5Years > 2) {
      objections.push('High-risk driver with multiple accidents');
    }

    if (lifeInsuranceInfo && lifeInsuranceInfo.tobaccoUse) {
      objections.push('Tobacco use affects rates');
    }

    if (commercialInfo && commercialInfo.hasLossHistory) {
      objections.push('Previous business losses may increase premiums');
    }

    if (healthInsuranceInfo && healthInsuranceInfo.preExistingConditions?.length) {
      objections.push(`Pre-existing conditions: ${healthInsuranceInfo.preExistingConditions.join(', ')}`);
    }

    return {
      eligibilityScore,
      affordabilityScore,
      needScore,
      authorityScore,
      timingScore,
      buyingSignals,
      objections,
    };
  }

  private applyRules(
    leadData: LeadBasicInfo,
    scoringResult: LeadScoringResult,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): { scoreAdjustment: number; keyQualifiers: string[]; riskFactors: string[] } {
    let scoreAdjustment = 0;
    const keyQualifiers: string[] = [];
    const riskFactors: string[] = [];

    if (!this.config.enableRulesEngine) {
      return { scoreAdjustment, keyQualifiers, riskFactors };
    }

    // Get relevant rule sets
    const relevantRules = this.getRelevantRules(scoringResult.primaryInsuranceType);

    for (const ruleSet of relevantRules) {
      if (!ruleSet.isActive) continue;

      for (const rule of ruleSet.rules) {
        if (!rule.isActive) continue;

        try {
          const result = this.evaluateRule(
            rule,
            leadData,
            scoringResult,
            vehicleInfo,
            propertyInfo,
            lifeInsuranceInfo,
            healthInsuranceInfo,
            commercialInfo
          );

          if (result.matches) {
            // Apply rule action
            switch (rule.action.type) {
              case 'adjust_score':
                const adjustment = (rule.action.params.adjustment as number) || 0;
                scoreAdjustment += adjustment;
                if (adjustment > 0) {
                  keyQualifiers.push(`${rule.name}: +${adjustment} points`);
                } else {
                  riskFactors.push(`${rule.name}: ${adjustment} points`);
                }
                break;
              case 'qualify':
                keyQualifiers.push(`Meets ${rule.name} criteria`);
                break;
              case 'disqualify':
                riskFactors.push(rule.action.params.reason as string || `Failed ${rule.name}`);
                break;
              case 'set_urgency':
                // Urgency handled in scoring
                break;
              case 'add_tag':
                // Tags would be added to lead record
                break;
              case 'add_note':
                // Notes would be added to lead record
                break;
            }
          }
        } catch (error) {
          logger.warn('Error evaluating rule', { ruleId: rule.id, error });
        }
      }
    }

    return { scoreAdjustment, keyQualifiers, riskFactors };
  }

  private getRelevantRules(insuranceType: InsuranceType): RuleSet[] {
    const relevant: RuleSet[] = [];

    // Get general rules first
    const generalRules = this.ruleSets.get('general-qualification');
    if (generalRules) relevant.push(generalRules);

    // Get type-specific rules
    const typeRules = this.ruleSets.get(`${insuranceType}-qualification`);
    if (typeRules) relevant.push(typeRules);

    return relevant;
  }

  private evaluateRule(
    rule: QualificationRule,
    leadData: LeadBasicInfo,
    scoringResult: LeadScoringResult,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): { matches: boolean } {
    const condition = rule.condition;
    const field = condition.field as string;
    const operator = condition.operator;
    const expectedValue = condition.value;

    // Resolve field value
    let actualValue: unknown;

    if (field === 'hasCompleteContact') {
      actualValue = !!(leadData.email && leadData.phone && leadData.firstName && leadData.lastName);
    } else if (field === 'urgency') {
      actualValue = scoringResult.urgency;
    } else {
      // Parse nested field path
      const pathParts = field.split('.');
      let obj: unknown = {
        leadData,
        scoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo,
      };

      for (const part of pathParts) {
        if (obj && typeof obj === 'object') {
          obj = (obj as Record<string, unknown>)[part];
        } else {
          obj = undefined;
          break;
        }
      }

      actualValue = obj;
    }

    // Evaluate condition
    switch (operator) {
      case 'eq':
        return { matches: actualValue === expectedValue };
      case 'ne':
        return { matches: actualValue !== expectedValue };
      case 'gt':
        return { matches: typeof actualValue === 'number' && actualValue > (expectedValue as number) };
      case 'gte':
        return { matches: typeof actualValue === 'number' && actualValue >= (expectedValue as number) };
      case 'lt':
        return { matches: typeof actualValue === 'number' && actualValue < (expectedValue as number) };
      case 'lte':
        return { matches: typeof actualValue === 'number' && actualValue <= (expectedValue as number) };
      case 'in':
        return { matches: Array.isArray(expectedValue) && expectedValue.includes(actualValue) };
      case 'nin':
        return { matches: Array.isArray(expectedValue) && !expectedValue.includes(actualValue) };
      case 'exists':
        return { matches: !!actualValue === (expectedValue as boolean) };
      case 'contains':
        return { matches: typeof actualValue === 'string' && actualValue.includes(expectedValue as string) };
      default:
        return { matches: false };
    }
  }

  private determineLevel(
    score: number,
    details: QualificationDetails
  ): LeadQualificationLevel {
    // Consider both score and qualification details
    const avgDetailScore = (
      details.eligibilityScore +
      details.affordabilityScore +
      details.needScore +
      details.authorityScore +
      details.timingScore
    ) / 5;

    const adjustedScore = (score * 0.6) + (avgDetailScore * 0.4);

    if (adjustedScore >= 75) return 'hot';
    if (adjustedScore >= 50) return 'warm';
    if (adjustedScore >= 25) return 'cold';
    return 'unqualified';
  }

  private determineRecommendation(
    level: LeadQualificationLevel,
    details: QualificationDetails,
    ruleResults: { scoreAdjustment: number; keyQualifiers: string[]; riskFactors: string[] }
  ): 'immediate_contact' | 'priority_followup' | 'nurture' | 'disqualify' {
    // Check for disqualification criteria
    if (ruleResults.riskFactors.length > 3) {
      return 'disqualify';
    }

    if (details.objections.length > 4) {
      return 'disqualify';
    }

    if (details.eligibilityScore < 40) {
      return 'disqualify';
    }

    // Determine recommendation based on level
    switch (level) {
      case 'hot':
        if (details.timingScore >= 80) return 'immediate_contact';
        return 'priority_followup';
      case 'warm':
        return 'priority_followup';
      case 'cold':
        return 'nurture';
      case 'unqualified':
      default:
        return 'disqualify';
    }
  }

  private calculateEstimatedValue(insuranceType: InsuranceType, score: number): number {
    const baseValue = this.config.defaultEstimatedValues[insuranceType];
    
    // Adjust based on score
    const multiplier = 0.5 + (score / 100); // 0.5 to 1.5
    
    return Math.round(baseValue * multiplier);
  }

  private calculateConversionProbability(
    details: QualificationDetails,
    scoringResult: LeadScoringResult
  ): number {
    // Base probability from scoring
    let probability = scoringResult.normalizedScore / 100;

    // Adjust for buying signals
    const strongSignals = details.buyingSignals.filter(s => s.strength === 'strong').length;
    const moderateSignals = details.buyingSignals.filter(s => s.strength === 'moderate').length;
    probability += (strongSignals * 0.05) + (moderateSignals * 0.02);

    // Adjust for objections
    const objectionPenalty = Math.min(details.objections.length * 0.03, 0.2);
    probability -= objectionPenalty;

    // Adjust for timing
    if (scoringResult.urgency === 'immediate') probability += 0.1;
    else if (scoringResult.urgency === 'high') probability += 0.05;
    else if (scoringResult.urgency === 'low') probability -= 0.05;

    return Math.min(0.95, Math.max(0.05, probability));
  }

  private determineSuggestedProducts(
    leadData: LeadBasicInfo,
    scoringResult: LeadScoringResult,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): InsuranceType[] {
    const products: InsuranceType[] = [];

    // Primary product
    products.push(scoringResult.primaryInsuranceType);

    // Cross-sell opportunities
    if (vehicleInfo || propertyInfo) {
      if (!products.includes('home')) products.push('home');
      if (!products.includes('auto')) products.push('auto');
    }

    if (lifeInsuranceInfo) {
      if (!products.includes('life')) products.push('life');
      if (!products.includes('health')) products.push('health');
    }

    if (healthInsuranceInfo) {
      if (!products.includes('life')) products.push('life');
    }

    if (commercialInfo) {
      if (!products.includes('commercial')) products.push('commercial');
      if (commercialInfo.hasCommercialAuto && !products.includes('auto')) {
        products.push('auto');
      }
    }

    // Bundling opportunity
    if (products.length >= 2) {
      // Lead could benefit from bundling
    }

    return products;
  }

  private determineNextSteps(
    level: LeadQualificationLevel,
    recommendation: 'immediate_contact' | 'priority_followup' | 'nurture' | 'disqualify',
    insuranceType: InsuranceType,
    ruleResults: { scoreAdjustment: number; keyQualifiers: string[]; riskFactors: string[] }
  ): string[] {
    const steps: string[] = [];

    switch (recommendation) {
      case 'immediate_contact':
        steps.push('Contact lead within 1 hour');
        steps.push('Prepare personalized quote based on provided information');
        steps.push('Address any risk factors identified');
        steps.push('Schedule consultation call');
        break;
      case 'priority_followup':
        steps.push('Contact lead within 24 hours');
        steps.push('Send follow-up email with relevant information');
        steps.push('Address identified objections');
        steps.push('Schedule discovery call');
        break;
      case 'nurture':
        steps.push('Add to email nurturing campaign');
        steps.push('Send educational content about insurance');
        steps.push('Re-engage in 7-14 days');
        steps.push('Monitor for engagement signals');
        break;
      case 'disqualify':
        steps.push('Send automated decline notification');
        steps.push('Optionally offer alternative products');
        steps.push('Archive lead record');
        break;
    }

    // Insurance-specific next steps
    if (insuranceType === 'auto') {
      steps.push('Verify driving history');
      steps.push('Request vehicle details if not complete');
    } else if (insuranceType === 'home') {
      steps.push('Schedule property inspection if required');
      steps.push('Request home details if not complete');
    } else if (insuranceType === 'life') {
      steps.push('Schedule medical exam if required');
      steps.push('Request health questionnaire');
    } else if (insuranceType === 'health') {
      steps.push('Verify eligibility for subsidies');
      steps.push('Explain coverage options in detail');
    } else if (insuranceType === 'commercial') {
      steps.push('Request business financial statements');
      steps.push('Schedule risk assessment');
    }

    return steps;
  }

  private generateActionDescription(
    recommendation: string,
    level: LeadQualificationLevel
  ): string {
    switch (recommendation) {
      case 'immediate_contact':
        return 'Lead shows high intent and should be contacted immediately for quote generation.';
      case 'priority_followup':
        return `Lead is ${level} quality and should be prioritized for follow-up within 24 hours.`;
      case 'nurture':
        return 'Lead needs nurturing. Add to relevant campaigns and monitor engagement.';
      case 'disqualify':
        return 'Lead does not meet qualification criteria. Consider for alternative products or archive.';
      default:
        return 'Manual review required.';
    }
  }

  // Rule management methods
  addRuleSet(ruleSet: RuleSet): void {
    this.ruleSets.set(ruleSet.id, ruleSet);
    logger.info('Rule set added', { ruleSetId: ruleSet.id });
  }

  updateRuleSet(ruleSetId: string, updates: Partial<RuleSet>): void {
    const existing = this.ruleSets.get(ruleSetId);
    if (existing) {
      this.ruleSets.set(ruleSetId, { ...existing, ...updates });
      logger.info('Rule set updated', { ruleSetId });
    }
  }

  removeRuleSet(ruleSetId: string): void {
    this.ruleSets.delete(ruleSetId);
    logger.info('Rule set removed', { ruleSetId });
  }

  getRuleSets(): RuleSet[] {
    return Array.from(this.ruleSets.values());
  }

  updateConfig(newConfig: Partial<QualificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Qualification configuration updated', { config: this.config });
  }

  getConfig(): QualificationConfig {
    return { ...this.config };
  }
}
