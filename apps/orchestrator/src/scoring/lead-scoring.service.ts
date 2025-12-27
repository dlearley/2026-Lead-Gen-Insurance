import { logger } from '@insurance-lead-gen/core';
import type {
  LeadBasicInfo,
  VehicleInfo,
  PropertyInfo,
  LifeInsuranceInfo,
  HealthInsuranceInfo,
  CommercialInsuranceInfo,
  ScoringConfig,
  ScoringWeights,
  LeadScoringResult,
  ScoringFactor,
  DimensionScore,
  InsuranceSpecificScore,
  InsuranceSpecificFactor,
  ScoringDimension,
  LeadQualificationLevel,
  LeadIntent,
  LeadUrgency,
} from '@insurance-lead-gen/types';

// Default scoring configuration for all insurance types
const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    auto: {
      contactCompleteness: 0.15,
      engagementLevel: 0.25,
      budgetAlignment: 0.20,
      timelineUrgency: 0.20,
      insuranceKnowledge: 0.10,
      competitivePosition: 0.10,
    },
    home: {
      contactCompleteness: 0.15,
      engagementLevel: 0.20,
      budgetAlignment: 0.25,
      timelineUrgency: 0.20,
      insuranceKnowledge: 0.10,
      competitivePosition: 0.10,
    },
    life: {
      contactCompleteness: 0.20,
      engagementLevel: 0.20,
      budgetAlignment: 0.15,
      timelineUrgency: 0.15,
      insuranceKnowledge: 0.15,
      competitivePosition: 0.15,
    },
    health: {
      contactCompleteness: 0.15,
      engagementLevel: 0.25,
      budgetAlignment: 0.20,
      timelineUrgency: 0.20,
      insuranceKnowledge: 0.10,
      competitivePosition: 0.10,
    },
    commercial: {
      contactCompleteness: 0.15,
      engagementLevel: 0.20,
      budgetAlignment: 0.20,
      timelineUrgency: 0.15,
      insuranceKnowledge: 0.15,
      competitivePosition: 0.15,
    },
  },
  thresholds: {
    hot: 75,
    warm: 50,
    cold: 25,
  },
  bonuses: {
    multiplePolicies: 15,
    referral: 10,
    repeatCustomer: 12,
    completeProfile: 8,
  },
};

export class LeadScoringService {
  private config: ScoringConfig;

  constructor(config?: Partial<ScoringConfig>) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
    logger.info('Lead scoring service initialized', { thresholds: this.config.thresholds });
  }

  async scoreLead(
    leadData: LeadBasicInfo,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): Promise<LeadScoringResult> {
    const startTime = Date.now();
    const scoringFactors: ScoringFactor[] = [];

    try {
      // Determine primary insurance type
      const primaryInsuranceType = this.determinePrimaryInsuranceType(
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      // Calculate dimension scores for each relevant insurance type
      const insuranceTypeScores: InsuranceSpecificScore[] = [];

      // Score auto insurance
      if (vehicleInfo || primaryInsuranceType === 'auto') {
        const autoScore = this.scoreAutoInsurance(vehicleInfo, leadData, scoringFactors);
        insuranceTypeScores.push(autoScore);
      }

      // Score home insurance
      if (propertyInfo || primaryInsuranceType === 'home') {
        const homeScore = this.scoreHomeInsurance(propertyInfo, leadData, scoringFactors);
        insuranceTypeScores.push(homeScore);
      }

      // Score life insurance
      if (lifeInsuranceInfo || primaryInsuranceType === 'life') {
        const lifeScore = this.scoreLifeInsurance(lifeInsuranceInfo, leadData, scoringFactors);
        insuranceTypeScores.push(lifeScore);
      }

      // Score health insurance
      if (healthInsuranceInfo || primaryInsuranceType === 'health') {
        const healthScore = this.scoreHealthInsurance(healthInsuranceInfo, leadData, scoringFactors);
        insuranceTypeScores.push(healthScore);
      }

      // Score commercial insurance
      if (commercialInfo || primaryInsuranceType === 'commercial') {
        const commercialScore = this.scoreCommercialInsurance(commercialInfo, leadData, scoringFactors);
        insuranceTypeScores.push(commercialScore);
      }

      // Calculate base score (contact completeness and engagement)
      const baseScore = this.calculateBaseScore(leadData, scoringFactors);

      // Add bonuses
      let finalScore = baseScore + this.calculateBonuses(leadData, scoringFactors);

      // Normalize score to 0-100
      const normalizedScore = Math.min(100, Math.max(0, finalScore));

      // Determine qualification level
      const qualificationLevel = this.determineQualificationLevel(normalizedScore);

      // Analyze intent
      const intent = this.analyzeIntent(leadData, scoringFactors);

      // Analyze urgency
      const urgency = this.analyzeUrgency(leadData, scoringFactors);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        normalizedScore,
        qualificationLevel,
        primaryInsuranceType,
        scoringFactors
      );

      const processingTime = Date.now() - startTime;

      logger.info('Lead scored successfully', {
        leadId: leadData.id,
        overallScore: normalizedScore,
        qualificationLevel,
        processingTime,
      });

      return {
        leadId: leadData.id,
        overallScore: finalScore,
        maxScore: 200,
        normalizedScore,
        qualificationLevel,
        intent,
        urgency,
        confidence: this.calculateConfidence(scoringFactors),
        insuranceTypeScores,
        primaryInsuranceType,
        scoringFactors,
        recommendations,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to score lead', { error, leadId: leadData.id });
      throw error;
    }
  }

  private determinePrimaryInsuranceType(
    leadData: LeadBasicInfo,
    vehicleInfo?: VehicleInfo,
    propertyInfo?: PropertyInfo,
    lifeInsuranceInfo?: LifeInsuranceInfo,
    healthInsuranceInfo?: HealthInsuranceInfo,
    commercialInfo?: CommercialInsuranceInfo
  ): 'auto' | 'home' | 'life' | 'health' | 'commercial' {
    // Explicit type from lead data
    if (leadData.insuranceType) {
      return leadData.insuranceType;
    }

    // Check for detailed info to determine type
    if (vehicleInfo) return 'auto';
    if (propertyInfo) return 'home';
    if (lifeInsuranceInfo) return 'life';
    if (healthInsuranceInfo) return 'health';
    if (commercialInfo) return 'commercial';

    // Default to auto based on source patterns
    const autoSources = ['car_dealer', 'auto_gallery', 'dmv'];
    if (autoSources.includes(leadData.source)) return 'auto';

    const homeSources = ['real_estate', 'mortgage', 'home_improvement'];
    if (homeSources.includes(leadData.source)) return 'home';

    const lifeSources = ['financial_planner', 'estate_planner'];
    if (lifeSources.includes(leadData.source)) return 'life';

    const healthSources = ['healthcare', 'medical', 'fitness'];
    if (healthSources.includes(leadData.source)) return 'health';

    const commercialSources = ['business', 'chamber_of_commerce'];
    if (commercialSources.includes(leadData.source)) return 'commercial';

    return 'auto'; // Default
  }

  private calculateBaseScore(leadData: LeadBasicInfo, factors: ScoringFactor[]): number {
    let score = 0;
    const weights = this.config.weights.auto;

    // Contact Completeness Score (0-100)
    let contactScore = 0;
    const contactFactors: string[] = [];

    if (leadData.email) {
      contactScore += 25;
      contactFactors.push('email provided');
    }
    if (leadData.phone) {
      contactScore += 25;
      contactFactors.push('phone provided');
    }
    if (leadData.firstName && leadData.lastName) {
      contactScore += 20;
      contactFactors.push('full name provided');
    }
    if (leadData.address?.city && leadData.address?.state) {
      contactScore += 15;
      contactFactors.push('location provided');
    }
    if (leadData.insuranceType) {
      score += 15;
      factors.push({
        category: 'Contact',
        factor: 'Insurance Type Specified',
        impact: 'positive',
        points: 15,
        description: 'Lead specified insurance type',
      });
    }

    const contactDimension: DimensionScore = {
      dimension: 'contact_completeness',
      score: contactScore,
      maxScore: 100,
      weight: weights.contactCompleteness,
      weightedScore: contactScore * weights.contactCompleteness,
      factors: contactFactors,
    };

    factors.push({
      category: 'Contact',
      factor: 'Contact Completeness',
      impact: contactScore >= 75 ? 'positive' : contactScore >= 50 ? 'neutral' : 'negative',
      points: contactScore,
      description: `Contact information is ${contactScore}% complete`,
    });

    // Engagement Level Score (0-100)
    let engagementScore = 50; // Base engagement
    const engagementFactors: string[] = [];

    // Source-based engagement
    const highEngagementSources = ['referral', 'website', 'mobile_app'];
    const mediumEngagementSources = ['social_media', 'email_campaign', 'display_ad'];
    const lowEngagementSources = ['print_ad', 'billboard', 'cold_lead'];

    if (highEngagementSources.includes(leadData.source)) {
      engagementScore += 30;
      engagementFactors.push('high-engagement source');
    } else if (mediumEngagementSources.includes(leadData.source)) {
      engagementScore += 15;
      engagementFactors.push('medium-engagement source');
    } else if (lowEngagementSources.includes(leadData.source)) {
      engagementScore -= 10;
      engagementFactors.push('low-engagement source');
    }

    // Metadata engagement signals
    if (leadData.metadata) {
      if (leadData.metadata['form_completed'] === true) {
        engagementScore += 15;
        engagementFactors.push('completed full form');
      }
      if (leadData.metadata['requested_quote'] === true) {
        engagementScore += 20;
        engagementFactors.push('requested quote');
      }
      if (leadData.metadata['pages_visited']) {
        const pages = leadData.metadata['pages_visited'] as number;
        if (pages > 3) {
          engagementScore += 10;
          engagementFactors.push('multiple pages viewed');
        }
      }
      if (leadData.metadata['time_on_site'] && (leadData.metadata['time_on_site'] as number) > 120) {
        engagementScore += 5;
        engagementFactors.push('significant time on site');
      }
    }

    engagementScore = Math.min(100, Math.max(0, engagementScore));

    factors.push({
      category: 'Engagement',
      factor: 'Engagement Level',
      impact: engagementScore >= 70 ? 'positive' : engagementScore >= 50 ? 'neutral' : 'negative',
      points: engagementScore,
      description: `Engagement level: ${engagementScore}/100`,
    });

    return (contactScore * weights.contactCompleteness) + (engagementScore * weights.engagementLevel);
  }

  private scoreAutoInsurance(
    vehicleInfo?: VehicleInfo,
    leadData?: LeadBasicInfo,
    factors?: ScoringFactor[]
  ): InsuranceSpecificScore {
    let score = 50; // Base score
    const insuranceFactors: InsuranceSpecificFactor[] = [];
    const weights = this.config.weights.auto;

    if (!vehicleInfo) {
      return {
        insuranceType: 'auto',
        overallScore: 0,
        maxScore: 100,
        dimensions: [],
        factors: [],
      };
    }

    // Vehicle Age Factor
    const vehicleAge = new Date().getFullYear() - vehicleInfo.year;
    if (vehicleAge <= 3) {
      score += 15;
      insuranceFactors.push({
        category: 'Vehicle',
        factor: 'New Vehicle',
        impact: 'positive',
        points: 15,
        description: 'Vehicle is less than 3 years old',
      });
    } else if (vehicleAge <= 7) {
      score += 10;
      insuranceFactors.push({
        category: 'Vehicle',
        factor: 'Recent Vehicle',
        impact: 'positive',
        points: 10,
        description: 'Vehicle is 3-7 years old',
      });
    } else if (vehicleAge > 15) {
      score -= 10;
      insuranceFactors.push({
        category: 'Vehicle',
        factor: 'Older Vehicle',
        impact: 'negative',
        points: -10,
        description: 'Vehicle is over 15 years old',
      });
    }

    // Ownership Factor
    if (vehicleInfo.ownership === 'owned') {
      score += 10;
      insuranceFactors.push({
        category: 'Ownership',
        factor: 'Vehicle Owner',
        impact: 'positive',
        points: 10,
        description: 'Lead owns the vehicle',
      });
    }

    // Current Coverage Factor
    if (vehicleInfo.currentCoverage) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Existing Coverage',
        impact: 'positive',
        points: 15,
        description: 'Lead has current auto insurance',
      });
    } else {
      score -= 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'No Existing Coverage',
        impact: 'negative',
        points: -15,
        description: 'Lead needs new coverage',
      });
    }

    // Years with current provider
    if (vehicleInfo.yearsWithCurrentProvider && vehicleInfo.yearsWithCurrentProvider > 5) {
      score += 5;
      insuranceFactors.push({
        category: 'History',
        factor: 'Long-term Customer',
        impact: 'positive',
        points: 5,
        description: `${vehicleInfo.yearsWithCurrentProvider} years with current provider`,
      });
    } else if (vehicleInfo.yearsWithCurrentProvider === 0 && !vehicleInfo.currentCoverage) {
      score += 10;
      insuranceFactors.push({
        category: 'History',
        factor: 'New Customer Opportunity',
        impact: 'positive',
        points: 10,
        description: 'Looking for first insurance',
      });
    }

    // Accidents and Violations
    if (vehicleInfo.accidentsLast5Years === 0) {
      score += 15;
      insuranceFactors.push({
        category: 'Driving History',
        factor: 'Clean Driving Record',
        impact: 'positive',
        points: 15,
        description: 'No accidents in past 5 years',
      });
    } else if (vehicleInfo.accidentsLast5Years >= 3) {
      score -= 20;
      insuranceFactors.push({
        category: 'Driving History',
        factor: 'Multiple Accidents',
        impact: 'negative',
        points: -20,
        description: `${vehicleInfo.accidentsLast5Years} accidents in past 5 years`,
      });
    } else {
      score -= 5 * vehicleInfo.accidentsLast5Years;
      insuranceFactors.push({
        category: 'Driving History',
        factor: 'Accidents on Record',
        impact: 'negative',
        points: -5 * vehicleInfo.accidentsLast5Years,
        description: `${vehicleInfo.accidentsLast5Years} accidents in past 5 years`,
      });
    }

    if (vehicleInfo.violationsLast3Years === 0) {
      score += 10;
      insuranceFactors.push({
        category: 'Driving History',
        factor: 'Clean Violation Record',
        impact: 'positive',
        points: 10,
        description: 'No violations in past 3 years',
      });
    } else if (vehicleInfo.violationsLast3Years >= 3) {
      score -= 15;
      insuranceFactors.push({
        category: 'Driving History',
        factor: 'Multiple Violations',
        impact: 'negative',
        points: -15,
        description: `${vehicleInfo.violationsLast3Years} violations in past 3 years`,
      });
    }

    // Mileage Factor
    if (vehicleInfo.annualMileage <= 8000) {
      score += 10;
      insuranceFactors.push({
        category: 'Usage',
        factor: 'Low Mileage',
        impact: 'positive',
        points: 10,
        description: 'Annual mileage under 8,000',
      });
    } else if (vehicleInfo.annualMileage > 20000) {
      score -= 5;
      insuranceFactors.push({
        category: 'Usage',
        factor: 'High Mileage',
        impact: 'negative',
        points: -5,
        description: 'Annual mileage over 20,000',
      });
    }

    // Primary Use Factor
    if (vehicleInfo.primaryUse === 'commute') {
      score += 5;
      insuranceFactors.push({
        category: 'Usage',
        factor: 'Commute Use',
        impact: 'positive',
        points: 5,
        description: 'Vehicle used for commuting',
      });
    } else if (vehicleInfo.primaryUse === 'business') {
      score += 10;
      insuranceFactors.push({
        category: 'Usage',
        factor: 'Business Use',
        impact: 'positive',
        points: 10,
        description: 'Vehicle used for business',
      });
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    // Calculate dimensions
    const dimensions: DimensionScore[] = [
      {
        dimension: 'contact_completeness',
        score: 80,
        maxScore: 100,
        weight: weights.contactCompleteness,
        weightedScore: 80 * weights.contactCompleteness,
        factors: ['Email', 'Phone', 'Address'],
      },
      {
        dimension: 'engagement_level',
        score: 75,
        maxScore: 100,
        weight: weights.engagementLevel,
        weightedScore: 75 * weights.engagementLevel,
        factors: ['Source engagement', 'Form completion'],
      },
      {
        dimension: 'budget_alignment',
        score: 60,
        maxScore: 100,
        weight: weights.budgetAlignment,
        weightedScore: 60 * weights.budgetAlignment,
        factors: [],
      },
      {
        dimension: 'timeline_urgency',
        score: 50,
        maxScore: 100,
        weight: weights.timelineUrgency,
        weightedScore: 50 * weights.timelineUrgency,
        factors: [],
      },
      {
        dimension: 'insurance_knowledge',
        score: score,
        maxScore: 100,
        weight: weights.insuranceKnowledge,
        weightedScore: score * weights.insuranceKnowledge,
        factors: insuranceFactors.map(f => f.factor),
      },
      {
        dimension: 'competitive_position',
        score: 55,
        maxScore: 100,
        weight: weights.competitivePosition,
        weightedScore: 55 * weights.competitivePosition,
        factors: [],
      },
    ];

    return {
      insuranceType: 'auto',
      overallScore: score,
      maxScore: 100,
      dimensions,
      factors: insuranceFactors,
    };
  }

  private scoreHomeInsurance(
    propertyInfo?: PropertyInfo,
    leadData?: LeadBasicInfo,
    factors?: ScoringFactor[]
  ): InsuranceSpecificScore {
    let score = 50; // Base score
    const insuranceFactors: InsuranceSpecificFactor[] = [];
    const weights = this.config.weights.home;

    if (!propertyInfo) {
      return {
        insuranceType: 'home',
        overallScore: 0,
        maxScore: 100,
        dimensions: [],
        factors: [],
      };
    }

    // Ownership Factor
    if (propertyInfo.ownership === 'owned' || propertyInfo.ownership === 'mortgaged') {
      score += 15;
      insuranceFactors.push({
        category: 'Ownership',
        factor: 'Property Owner',
        impact: 'positive',
        points: 15,
        description: 'Lead owns or mortgages the property',
      });
    } else {
      score -= 20;
      insuranceFactors.push({
        category: 'Ownership',
        factor: 'Renter',
        impact: 'negative',
        points: -20,
        description: 'Lead is renting (consider renters insurance)',
      });
    }

    // Property Type Factor
    const lowRiskTypes = ['single_family', 'condo', 'townhouse'];
    const highRiskTypes = ['multi_family', 'mobile'];

    if (lowRiskTypes.includes(propertyInfo.propertyType)) {
      score += 10;
      insuranceFactors.push({
        category: 'Property',
        factor: 'Standard Property Type',
        impact: 'positive',
        points: 10,
        description: `${propertyInfo.propertyType} is standard risk`,
      });
    } else if (highRiskTypes.includes(propertyInfo.propertyType)) {
      score -= 10;
      insuranceFactors.push({
        category: 'Property',
        factor: 'Special Property Type',
        impact: 'negative',
        points: -10,
        description: `${propertyInfo.propertyType} may require specialized coverage`,
      });
    }

    // Property Age Factor
    const propertyAge = new Date().getFullYear() - propertyInfo.yearBuilt;
    if (propertyAge <= 10) {
      score += 15;
      insuranceFactors.push({
        category: 'Property',
        factor: 'New Construction',
        impact: 'positive',
        points: 15,
        description: 'Property built within last 10 years',
      });
    } else if (propertyAge <= 30) {
      score += 5;
      insuranceFactors.push({
        category: 'Property',
        factor: 'Moderate Age',
        impact: 'neutral',
        points: 5,
        description: 'Property is 10-30 years old',
      });
    } else if (propertyAge > 50) {
      score -= 10;
      insuranceFactors.push({
        category: 'Property',
        factor: 'Older Property',
        impact: 'negative',
        points: -10,
        description: 'Property over 50 years old may need updates',
      });
    }

    // Security System
    if (propertyInfo.hasSecuritySystem) {
      score += 15;
      insuranceFactors.push({
        category: 'Safety',
        factor: 'Security System',
        impact: 'positive',
        points: 15,
        description: 'Property has security system',
      });
    }

    // Swimming Pool
    if (propertyInfo.hasSwimmingPool) {
      score -= 10;
      insuranceFactors.push({
        category: 'Risk',
        factor: 'Swimming Pool',
        impact: 'negative',
        points: -10,
        description: 'Pool increases liability risk',
      });
    }

    // Claims History
    if (propertyInfo.hasClaimsLast5Years === 0) {
      score += 15;
      insuranceFactors.push({
        category: 'Claims',
        factor: 'No Prior Claims',
        impact: 'positive',
        points: 15,
        description: 'No claims in past 5 years',
      });
    } else if (propertyInfo.hasClaimsLast5Years >= 3) {
      score -= 25;
      insuranceFactors.push({
        category: 'Claims',
        factor: 'Multiple Claims',
        impact: 'negative',
        points: -25,
        description: `${propertyInfo.hasClaimsLast5Years} claims in past 5 years`,
      });
    } else {
      score -= 5 * propertyInfo.hasClaimsLast5Years;
      insuranceFactors.push({
        category: 'Claims',
        factor: 'Prior Claims',
        impact: 'negative',
        points: -5 * propertyInfo.hasClaimsLast5Years,
        description: `${propertyInfo.hasClaimsLast5Years} claims in past 5 years`,
      });
    }

    // Property Value
    if (propertyInfo.value && propertyInfo.value > 500000) {
      score += 10;
      insuranceFactors.push({
        category: 'Value',
        factor: 'High Value Property',
        impact: 'positive',
        points: 10,
        description: `Property value over $500K`,
      });
    } else if (propertyInfo.value && propertyInfo.value < 150000) {
      score -= 5;
      insuranceFactors.push({
        category: 'Value',
        factor: 'Lower Value Property',
        impact: 'negative',
        points: -5,
        description: `Property value under $150K`,
      });
    }

    // Current Coverage
    if (!propertyInfo.hasSecuritySystem) {
      // Could offer discount
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    const dimensions: DimensionScore[] = [
      {
        dimension: 'contact_completeness',
        score: 80,
        maxScore: 100,
        weight: weights.contactCompleteness,
        weightedScore: 80 * weights.contactCompleteness,
        factors: ['Email', 'Phone', 'Address'],
      },
      {
        dimension: 'engagement_level',
        score: 70,
        maxScore: 100,
        weight: weights.engagementLevel,
        weightedScore: 70 * weights.engagementLevel,
        factors: ['Source engagement'],
      },
      {
        dimension: 'budget_alignment',
        score: score + 10,
        maxScore: 100,
        weight: weights.budgetAlignment,
        weightedScore: (score + 10) * weights.budgetAlignment,
        factors: [],
      },
      {
        dimension: 'timeline_urgency',
        score: 55,
        maxScore: 100,
        weight: weights.timelineUrgency,
        weightedScore: 55 * weights.timelineUrgency,
        factors: [],
      },
      {
        dimension: 'insurance_knowledge',
        score: score,
        maxScore: 100,
        weight: weights.insuranceKnowledge,
        weightedScore: score * weights.insuranceKnowledge,
        factors: insuranceFactors.map(f => f.factor),
      },
      {
        dimension: 'competitive_position',
        score: 50,
        maxScore: 100,
        weight: weights.competitivePosition,
        weightedScore: 50 * weights.competitivePosition,
        factors: [],
      },
    ];

    return {
      insuranceType: 'home',
      overallScore: score,
      maxScore: 100,
      dimensions,
      factors: insuranceFactors,
    };
  }

  private scoreLifeInsurance(
    lifeInfo?: LifeInsuranceInfo,
    leadData?: LeadBasicInfo,
    factors?: ScoringFactor[]
  ): InsuranceSpecificScore {
    let score = 50; // Base score
    const insuranceFactors: InsuranceSpecificFactor[] = [];
    const weights = this.config.weights.life;

    if (!lifeInfo) {
      return {
        insuranceType: 'life',
        overallScore: 0,
        maxScore: 100,
        dimensions: [],
        factors: [],
      };
    }

    // Age Factor (prime insurance age is 30-55)
    if (lifeInfo.age >= 25 && lifeInfo.age <= 45) {
      score += 20;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Prime Age',
        impact: 'positive',
        points: 20,
        description: `Age ${lifeInfo.age} is optimal for life insurance`,
      });
    } else if (lifeInfo.age >= 46 && lifeInfo.age <= 60) {
      score += 10;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Mature Age',
        impact: 'positive',
        points: 10,
        description: `Age ${lifeInfo.age} is suitable for life insurance`,
      });
    } else if (lifeInfo.age > 60) {
      score -= 10;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Older Age',
        impact: 'negative',
        points: -10,
        description: `Age ${lifeInfo.age} may have limited options`,
      });
    }

    // Coverage Amount Factor
    if (lifeInfo.coverageAmount >= 500000) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Substantial Coverage',
        impact: 'positive',
        points: 15,
        description: `Seeking $${(lifeInfo.coverageAmount / 1000).toFixed(0)}K coverage`,
      });
    } else if (lifeInfo.coverageAmount < 100000) {
      score -= 5;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Basic Coverage',
        impact: 'neutral',
        points: -5,
        description: 'Seeking basic coverage amount',
      });
    }

    // Health Class Factor
    const healthScores: Record<string, number> = {
      excellent: 20,
      good: 10,
      standard: 0,
      substandard: -20,
    };
    score += healthScores[lifeInfo.healthClass] || 0;
    insuranceFactors.push({
      category: 'Health',
      factor: `Health Class: ${lifeInfo.healthClass}`,
      impact: lifeInfo.healthClass === 'excellent' || lifeInfo.healthClass === 'good' ? 'positive' : 'negative',
      points: healthScores[lifeInfo.healthClass] || 0,
      description: `Health classification: ${lifeInfo.healthClass}`,
    });

    // Tobacco Use
    if (!lifeInfo.tobaccoUse) {
      score += 15;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Non-Tobacco User',
        impact: 'positive',
        points: 15,
        description: 'No tobacco use',
      });
    } else {
      score -= 25;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Tobacco User',
        impact: 'negative',
        points: -25,
        description: 'Uses tobacco products',
      });
    }

    // Term Length
    if (lifeInfo.termLength === 20 || lifeInfo.termLength === 30) {
      score += 10;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Long Term',
        impact: 'positive',
        points: 10,
        description: `Selected ${lifeInfo.termLength}-year term`,
      });
    }

    // BMI Factor (if height and weight provided)
    if (lifeInfo.heightFeet && lifeInfo.heightInches && lifeInfo.weight) {
      const heightInInches = (lifeInfo.heightFeet * 12) + lifeInfo.heightInches;
      const bmi = (lifeInfo.weight / (heightInInches * heightInInches)) * 703;
      if (bmi >= 18.5 && bmi <= 24.9) {
        score += 10;
        insuranceFactors.push({
          category: 'Health',
          factor: 'Healthy BMI',
          impact: 'positive',
          points: 10,
          description: 'BMI is in healthy range',
        });
      } else if (bmi >= 25 && bmi <= 29.9) {
        score += 5;
        insuranceFactors.push({
          category: 'Health',
          factor: 'Overweight BMI',
          impact: 'neutral',
          points: 5,
          description: 'BMI is slightly elevated',
        });
      } else if (bmi >= 30) {
        score -= 10;
        insuranceFactors.push({
          category: 'Health',
          factor: 'Obese BMI',
          impact: 'negative',
          points: -10,
          description: 'BMI indicates obesity',
        });
      }
    }

    // Existing Conditions
    if (lifeInfo.existingConditions && lifeInfo.existingConditions.length > 0) {
      const seriousConditions = ['diabetes', 'heart disease', 'cancer', 'stroke'];
      const hasSerious = lifeInfo.existingConditions.some(c => 
        seriousConditions.some(sc => c.toLowerCase().includes(sc))
      );
      if (hasSerious) {
        score -= 30;
        insuranceFactors.push({
          category: 'Health',
          factor: 'Serious Health Conditions',
          impact: 'negative',
          points: -30,
          description: 'Has serious pre-existing conditions',
        });
      } else {
        score -= 15;
        insuranceFactors.push({
          category: 'Health',
          factor: 'Pre-existing Conditions',
          impact: 'negative',
          points: -15,
          description: 'Has pre-existing conditions',
        });
      }
    }

    // Family History
    if (lifeInfo.familyHistoryConditions && lifeInfo.familyHistoryConditions.length > 0) {
      score -= 10;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Family History',
        impact: 'negative',
        points: -10,
        description: 'Family history of health conditions',
      });
    }

    // Occupation Risk
    const highRiskOccupations = ['pilot', 'firefighter', 'police', 'construction', 'mining'];
    if (lifeInfo.occupation && highRiskOccupations.some(o => 
      lifeInfo.occupation!.toLowerCase().includes(o)
    )) {
      score -= 15;
      insuranceFactors.push({
        category: 'Occupation',
        factor: 'High-Risk Occupation',
        impact: 'negative',
        points: -15,
        description: `Occupation: ${lifeInfo.occupation}`,
      });
    }

    // Hobbies
    const riskyHobbies = ['skydiving', 'racing', 'climbing', 'diving', 'motocross'];
    if (lifeInfo.hobbies && lifeInfo.hobbies.some(h => 
      riskyHobbies.some(rh => h.toLowerCase().includes(rh))
    )) {
      score -= 15;
      insuranceFactors.push({
        category: 'Lifestyle',
        factor: 'Risky Hobbies',
        impact: 'negative',
        points: -15,
        description: 'Engages in high-risk activities',
      });
    }

    // Military Service
    if (lifeInfo.militaryService) {
      score += 5;
      insuranceFactors.push({
        category: 'Background',
        factor: 'Military Service',
        impact: 'positive',
        points: 5,
        description: 'Has military service',
      });
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    const dimensions: DimensionScore[] = [
      {
        dimension: 'contact_completeness',
        score: 85,
        maxScore: 100,
        weight: weights.contactCompleteness,
        weightedScore: 85 * weights.contactCompleteness,
        factors: ['Email', 'Phone', 'Full Name', 'Address'],
      },
      {
        dimension: 'engagement_level',
        score: 75,
        maxScore: 100,
        weight: weights.engagementLevel,
        weightedScore: 75 * weights.engagementLevel,
        factors: ['Source engagement'],
      },
      {
        dimension: 'budget_alignment',
        score: 70,
        maxScore: 100,
        weight: weights.budgetAlignment,
        weightedScore: 70 * weights.budgetAlignment,
        factors: [],
      },
      {
        dimension: 'timeline_urgency',
        score: 60,
        maxScore: 100,
        weight: weights.timelineUrgency,
        weightedScore: 60 * weights.timelineUrgency,
        factors: [],
      },
      {
        dimension: 'insurance_knowledge',
        score: score,
        maxScore: 100,
        weight: weights.insuranceKnowledge,
        weightedScore: score * weights.insuranceKnowledge,
        factors: insuranceFactors.map(f => f.factor),
      },
      {
        dimension: 'competitive_position',
        score: 55,
        maxScore: 100,
        weight: weights.competitivePosition,
        weightedScore: 55 * weights.competitivePosition,
        factors: [],
      },
    ];

    return {
      insuranceType: 'life',
      overallScore: score,
      maxScore: 100,
      dimensions,
      factors: insuranceFactors,
    };
  }

  private scoreHealthInsurance(
    healthInfo?: HealthInsuranceInfo,
    leadData?: LeadBasicInfo,
    factors?: ScoringFactor[]
  ): InsuranceSpecificScore {
    let score = 50; // Base score
    const insuranceFactors: InsuranceSpecificFactor[] = [];
    const weights = this.config.weights.health;

    if (!healthInfo) {
      return {
        insuranceType: 'health',
        overallScore: 0,
        maxScore: 100,
        dimensions: [],
        factors: [],
      };
    }

    // Age Factor
    if (healthInfo.age >= 25 && healthInfo.age <= 45) {
      score += 15;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Prime Age',
        impact: 'positive',
        points: 15,
        description: `Age ${healthInfo.age} is optimal`,
      });
    } else if (healthInfo.age >= 46 && healthInfo.age <= 55) {
      score += 10;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Mature Adult',
        impact: 'positive',
        points: 10,
        description: `Age ${healthInfo.age} is suitable`,
      });
    } else if (healthInfo.age > 55) {
      score += 5;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Older Adult',
        impact: 'neutral',
        points: 5,
        description: `Age ${healthInfo.age}`,
      });
    } else if (healthInfo.age < 25) {
      score += 5;
      insuranceFactors.push({
        category: 'Demographics',
        factor: 'Young Adult',
        impact: 'neutral',
        points: 5,
        description: `Age ${healthInfo.age}`,
      });
    }

    // Dependents Factor
    if (healthInfo.dependentsCount > 0) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage Needs',
        factor: 'Has Dependents',
        impact: 'positive',
        points: 15,
        description: `${healthInfo.dependentsCount} dependents need coverage`,
      });
    }

    // Current Coverage
    if (!healthInfo.currentCoverage) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Seeking Coverage',
        impact: 'positive',
        points: 15,
        description: 'Currently without health insurance',
      });
    } else if (healthInfo.coverageType === 'employer') {
      score += 5;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Employer Coverage',
        impact: 'positive',
        points: 5,
        description: 'Has employer coverage (may want alternatives)',
      });
    }

    // Desired Coverage Type
    if (healthInfo.desiredCoverageType === 'family') {
      score += 10;
      insuranceFactors.push({
        category: 'Coverage Needs',
        factor: 'Family Coverage',
        impact: 'positive',
        points: 10,
        description: 'Seeking family coverage',
      });
    }

    // Pre-existing Conditions
    if (healthInfo.preExistingConditions && healthInfo.preExistingConditions.length > 0) {
      score -= 10;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Pre-existing Conditions',
        impact: 'negative',
        points: -10,
        description: `Has ${healthInfo.preExistingConditions.length} conditions`,
      });
    }

    // Tobacco Use
    if (!healthInfo.tobaccoUse) {
      score += 10;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Non-Tobacco User',
        impact: 'positive',
        points: 10,
        description: 'No tobacco use',
      });
    } else {
      score -= 15;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Tobacco User',
        impact: 'negative',
        points: -15,
        description: 'Uses tobacco products',
      });
    }

    // Existing Disabilities
    if (healthInfo.existingDisabilities) {
      score -= 15;
      insuranceFactors.push({
        category: 'Health',
        factor: 'Existing Disabilities',
        impact: 'negative',
        points: -15,
        description: 'Has existing disabilities',
      });
    }

    // Budget
    if (healthInfo.budget && healthInfo.budget >= 400) {
      score += 10;
      insuranceFactors.push({
        category: 'Budget',
        factor: 'Adequate Budget',
        impact: 'positive',
        points: 10,
        description: 'Has budget for comprehensive coverage',
      });
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    const dimensions: DimensionScore[] = [
      {
        dimension: 'contact_completeness',
        score: 85,
        maxScore: 100,
        weight: weights.contactCompleteness,
        weightedScore: 85 * weights.contactCompleteness,
        factors: ['Email', 'Phone', 'Address'],
      },
      {
        dimension: 'engagement_level',
        score: 80,
        maxScore: 100,
        weight: weights.engagementLevel,
        weightedScore: 80 * weights.engagementLevel,
        factors: ['Source engagement', 'Form completion'],
      },
      {
        dimension: 'budget_alignment',
        score: 65,
        maxScore: 100,
        weight: weights.budgetAlignment,
        weightedScore: 65 * weights.budgetAlignment,
        factors: [],
      },
      {
        dimension: 'timeline_urgency',
        score: 70,
        maxScore: 100,
        weight: weights.timelineUrgency,
        weightedScore: 70 * weights.timelineUrgency,
        factors: [],
      },
      {
        dimension: 'insurance_knowledge',
        score: score,
        maxScore: 100,
        weight: weights.insuranceKnowledge,
        weightedScore: score * weights.insuranceKnowledge,
        factors: insuranceFactors.map(f => f.factor),
      },
      {
        dimension: 'competitive_position',
        score: 55,
        maxScore: 100,
        weight: weights.competitivePosition,
        weightedScore: 55 * weights.competitivePosition,
        factors: [],
      },
    ];

    return {
      insuranceType: 'health',
      overallScore: score,
      maxScore: 100,
      dimensions,
      factors: insuranceFactors,
    };
  }

  private scoreCommercialInsurance(
    commercialInfo?: CommercialInsuranceInfo,
    leadData?: LeadBasicInfo,
    factors?: ScoringFactor[]
  ): InsuranceSpecificScore {
    let score = 50; // Base score
    const insuranceFactors: InsuranceSpecificFactor[] = [];
    const weights = this.config.weights.commercial;

    if (!commercialInfo) {
      return {
        insuranceType: 'commercial',
        overallScore: 0,
        maxScore: 100,
        dimensions: [],
        factors: [],
      };
    }

    // Years in Business
    if (commercialInfo.yearsInBusiness >= 5) {
      score += 20;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Established Business',
        impact: 'positive',
        points: 20,
        description: `${commercialInfo.yearsInBusiness} years in business`,
      });
    } else if (commercialInfo.yearsInBusiness >= 2) {
      score += 10;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Growing Business',
        impact: 'positive',
        points: 10,
        description: `${commercialInfo.yearsInBusiness} years in business`,
      });
    } else {
      score += 5;
      insuranceFactors.push({
        category: 'Business',
        factor: 'New Business',
        impact: 'neutral',
        points: 5,
        description: 'New business venture',
      });
    }

    // Revenue Factor
    if (commercialInfo.annualRevenue >= 1000000) {
      score += 15;
      insuranceFactors.push({
        category: 'Business',
        factor: 'High Revenue',
        impact: 'positive',
        points: 15,
        description: `Annual revenue: $${(commercialInfo.annualRevenue / 1000000).toFixed(1)}M`,
      });
    } else if (commercialInfo.annualRevenue >= 250000) {
      score += 10;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Mid-Revenue',
        impact: 'positive',
        points: 10,
        description: `Annual revenue: $${(commercialInfo.annualRevenue / 1000).toFixed(0)}K`,
      });
    }

    // Employee Count
    if (commercialInfo.numberOfEmployees > 50) {
      score += 10;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Large Workforce',
        impact: 'positive',
        points: 10,
        description: `${commercialInfo.numberOfEmployees} employees`,
      });
    }

    // Industry Risk
    if (commercialInfo.industryRisk === 'low') {
      score += 15;
      insuranceFactors.push({
        category: 'Risk',
        factor: 'Low Risk Industry',
        impact: 'positive',
        points: 15,
        description: 'Business in low-risk industry',
      });
    } else if (commercialInfo.industryRisk === 'high') {
      score -= 15;
      insuranceFactors.push({
        category: 'Risk',
        factor: 'High Risk Industry',
        impact: 'negative',
        points: -15,
        description: 'Business in high-risk industry',
      });
    }

    // Loss History
    if (commercialInfo.hasLossHistory) {
      if (commercialInfo.lossAmount5Years && commercialInfo.lossAmount5Years > 50000) {
        score -= 25;
        insuranceFactors.push({
          category: 'Claims',
          factor: 'Significant Losses',
          impact: 'negative',
          points: -25,
          description: `$${commercialInfo.lossAmount5Years.toLocaleString()} in losses`,
        });
      } else {
        score -= 10;
        insuranceFactors.push({
          category: 'Claims',
          factor: 'Prior Losses',
          impact: 'negative',
          points: -10,
          description: 'Has loss history',
        });
      }
    } else {
      score += 15;
      insuranceFactors.push({
        category: 'Claims',
        factor: 'No Loss History',
        impact: 'positive',
        points: 15,
        description: 'Clean loss history',
      });
    }

    // Current Coverage
    if (!commercialInfo.currentCoverage) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Seeking Coverage',
        impact: 'positive',
        points: 15,
        description: 'Currently without commercial insurance',
      });
    } else if (commercialInfo.currentCoverage && commercialInfo.currentPremium) {
      if (commercialInfo.currentPremium > 20000) {
        score += 10;
        insuranceFactors.push({
          category: 'Coverage',
          factor: 'Premium Customer',
          impact: 'positive',
          points: 10,
          description: `Current premium: $${commercialInfo.currentPremium.toLocaleString()}`,
        });
      }
    }

    // Multiple Coverage Types
    let coverageTypes = 0;
    if (commercialInfo.hasPKCoverage) coverageTypes++;
    if (commercialInfo.hasWorkersComp) coverageTypes++;
    if (commercialInfo.hasCommercialAuto) coverageTypes++;
    if (commercialInfo.hasCyberLiability) coverageTypes++;

    if (coverageTypes >= 3) {
      score += 15;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Multiple Policies',
        impact: 'positive',
        points: 15,
        description: 'Needs multiple coverage types',
      });
    } else if (coverageTypes >= 1) {
      score += 5;
      insuranceFactors.push({
        category: 'Coverage',
        factor: 'Existing Coverage',
        impact: 'positive',
        points: 5,
        description: 'Has some commercial coverage',
      });
    }

    // Location Count
    if (commercialInfo.locationCount > 1) {
      score += 10;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Multiple Locations',
        impact: 'positive',
        points: 10,
        description: `${commercialInfo.locationCount} locations to insure`,
      });
    }

    // New Location
    if (commercialInfo.isNewLocation) {
      score += 10;
      insuranceFactors.push({
        category: 'Business',
        factor: 'Expansion',
        impact: 'positive',
        points: 10,
        description: 'New location to insure',
      });
    }

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    const dimensions: DimensionScore[] = [
      {
        dimension: 'contact_completeness',
        score: 80,
        maxScore: 100,
        weight: weights.contactCompleteness,
        weightedScore: 80 * weights.contactCompleteness,
        factors: ['Email', 'Phone', 'Business Info'],
      },
      {
        dimension: 'engagement_level',
        score: 75,
        maxScore: 100,
        weight: weights.engagementLevel,
        weightedScore: 75 * weights.engagementLevel,
        factors: ['Source engagement'],
      },
      {
        dimension: 'budget_alignment',
        score: 70,
        maxScore: 100,
        weight: weights.budgetAlignment,
        weightedScore: 70 * weights.budgetAlignment,
        factors: [],
      },
      {
        dimension: 'timeline_urgency',
        score: 65,
        maxScore: 100,
        weight: weights.timelineUrgency,
        weightedScore: 65 * weights.timelineUrgency,
        factors: [],
      },
      {
        dimension: 'insurance_knowledge',
        score: score,
        maxScore: 100,
        weight: weights.insuranceKnowledge,
        weightedScore: score * weights.insuranceKnowledge,
        factors: insuranceFactors.map(f => f.factor),
      },
      {
        dimension: 'competitive_position',
        score: 55,
        maxScore: 100,
        weight: weights.competitivePosition,
        weightedScore: 55 * weights.competitivePosition,
        factors: [],
      },
    ];

    return {
      insuranceType: 'commercial',
      overallScore: score,
      maxScore: 100,
      dimensions,
      factors: insuranceFactors,
    };
  }

  private calculateBonuses(leadData: LeadBasicInfo, factors: ScoringFactor[]): number {
    let bonus = 0;

    // Multiple policies (inferred from metadata)
    if (leadData.metadata && leadData.metadata['existing_policies']) {
      const policyCount = leadData.metadata['existing_policies'] as number;
      if (policyCount > 1) {
        bonus += this.config.bonuses.multiplePolicies;
        factors.push({
          category: 'Bonus',
          factor: 'Multiple Policies',
          impact: 'positive',
          points: this.config.bonuses.multiplePolicies,
          description: `Has ${policyCount} existing policies`,
        });
      }
    }

    // Referral
    if (leadData.source === 'referral') {
      bonus += this.config.bonuses.referral;
      factors.push({
        category: 'Bonus',
        factor: 'Referral',
        impact: 'positive',
        points: this.config.bonuses.referral,
        description: 'Lead came from referral',
      });
    }

    // Complete profile bonus
    if (leadData.email && leadData.phone && leadData.firstName && leadData.lastName && leadData.insuranceType) {
      bonus += this.config.bonuses.completeProfile;
      factors.push({
        category: 'Bonus',
        factor: 'Complete Profile',
        impact: 'positive',
        points: this.config.bonuses.completeProfile,
        description: 'All key fields provided',
      });
    }

    return bonus;
  }

  private determineQualificationLevel(score: number): LeadQualificationLevel {
    if (score >= this.config.thresholds.hot) return 'hot';
    if (score >= this.config.thresholds.warm) return 'warm';
    if (score >= this.config.thresholds.cold) return 'cold';
    return 'unqualified';
  }

  private analyzeIntent(leadData: LeadBasicInfo, factors: ScoringFactor[]): LeadIntent {
    // Analyze source and metadata for intent signals
    const intentSources: Record<string, LeadIntent> = {
      quote_request: 'quote',
      online_form: 'quote',
      phone_call: 'purchase',
      website: 'information',
      comparison_site: 'comparison',
      renewal_notice: 'renewal',
    };

    if (leadData.metadata && leadData.metadata['intent']) {
      return leadData.metadata['intent'] as LeadIntent;
    }

    return 'quote'; // Default intent
  }

  private analyzeUrgency(leadData: LeadBasicInfo, factors: ScoringFactor[]): LeadUrgency {
    // Check metadata for urgency signals
    if (leadData.metadata) {
      const urgencySignals = leadData.metadata['urgency'];
      if (urgencySignals) {
        if (urgencySignals === 'immediate') return 'immediate';
        if (urgencySignals === 'high') return 'high';
        if (urgencySignals === 'within_week') return 'medium';
        if (urgencySignals === 'within_month') return 'low';
      }

      // Policy expiration signal
      if (leadData.metadata['policy_expiring_days']) {
        const days = leadData.metadata['policy_expiring_days'] as number;
        if (days <= 7) return 'immediate';
        if (days <= 30) return 'high';
        if (days <= 60) return 'medium';
      }
    }

    // Default based on source
    const urgentSources = ['phone_call', '在线_form', 'chat'];
    if (urgentSources.includes(leadData.source)) return 'high';

    return 'medium'; // Default
  }

  private calculateConfidence(factors: ScoringFactor[]): number {
    // Higher number of positive factors = higher confidence
    const positiveFactors = factors.filter(f => f.impact === 'positive').length;
    const totalFactors = factors.length;
    
    if (totalFactors === 0) return 0.5;
    
    const ratio = positiveFactors / totalFactors;
    return 0.5 + (ratio * 0.4); // Range: 0.5 - 0.9
  }

  private generateRecommendations(
    score: number,
    level: LeadQualificationLevel,
    insuranceType: string,
    factors: ScoringFactor[]
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'hot') {
      recommendations.push('Contact within 1 hour');
      recommendations.push('Prepare personalized quote');
      recommendations.push('Highlight competitive advantages');
    } else if (level === 'warm') {
      recommendations.push('Contact within 24 hours');
      recommendations.push('Send educational content');
      recommendations.push('Schedule follow-up call');
    } else if (level === 'cold') {
      recommendations.push('Add to nurturing campaign');
      recommendations.push('Send relevant information');
      recommendations.push('Re-engage in 7-14 days');
    } else {
      recommendations.push('Send automated information');
      recommendations.push('Monitor for engagement signals');
    }

    // Insurance-specific recommendations
    if (insuranceType === 'auto') {
      recommendations.push('Offer multi-policy discount');
      recommendations.push('Highlight safe driver discounts');
    } else if (insuranceType === 'home') {
      recommendations.push('Offer bundling with auto insurance');
      recommendations.push('Mention home safety discounts');
    } else if (insuranceType === 'life') {
      recommendations.push('Explain term vs permanent options');
      recommendations.push('Highlight family protection benefits');
    } else if (insuranceType === 'health') {
      recommendations.push('Compare network options');
      recommendations.push('Explain subsidy eligibility');
    } else if (insuranceType === 'commercial') {
      recommendations.push('Offer risk assessment');
      recommendations.push('Highlight business continuity benefits');
    }

    // Address negative factors
    const negativeFactors = factors.filter(f => f.impact === 'negative');
    negativeFactors.forEach(factor => {
      if (factor.category === 'Health' || factor.category === 'Driving History') {
        recommendations.push(`Address concerns about ${factor.factor.toLowerCase()}`);
      }
    });

    return recommendations;
  }

  updateConfig(newConfig: Partial<ScoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Scoring configuration updated', { thresholds: this.config.thresholds });
  }

  getConfig(): ScoringConfig {
    return { ...this.config };
  }
}
