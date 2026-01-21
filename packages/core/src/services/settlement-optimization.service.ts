// ========================================
// SETTLEMENT OPTIMIZATION SERVICE - Phase 27.4
// ========================================

import type {
  SettlementRecommendation,
  OptimalSettlement,
  NegotiationStrategy,
  LitigationCostEstimate,
  SubrogationPotential,
  ClaimJustification,
  ComparableCases,
  FraudClaimData,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

// Type aliases for clarity
type Justification = ClaimJustification;
type ClaimData = FraudClaimData;

/**
 * Settlement Optimization Service
 * Calculate optimal settlement amounts and strategies
 */
export class SettlementOptimizationService {
  /**
   * Generate settlement recommendation
   */
  static async recommendSettlement(claimId: string, claimData: ClaimData): Promise<SettlementRecommendation> {
    try {
      logger.info('Generating settlement recommendation', { claimId });

      const optimalSettlement = await this.calculateOptimalSettlement(claimData);
      const litigationCost = await this.estimateLitigationCosts(claimId, claimData);
      const subrogation = await this.evaluateSubrogation(claimId, claimData);

      // Determine negotiation strategy
      const strategy = this.determineNegotiationStrategy(optimalSettlement, litigationCost, subrogation);

      const recommendation: SettlementRecommendation = {
        id: `settlement-rec-${claimId}-${Date.now()}`,
        claimId,
        recommendedAmount: optimalSettlement.optimalAmount,
        confidenceLevel: optimalSettlement.confidenceInterval ? 0.8 : 0.7,
        negotiationStrategy: strategy,
        litigationCostEstimate: litigationCost.totalEstimatedCost,
        subrogationPotential: subrogation.estimatedRecoveryAmount,
        justification: this.generateJustification(optimalSettlement, litigationCost, subrogation),
        createdAt: new Date(),
        recommendedTimestamp: new Date(),
      };

      logger.info('Settlement recommendation generated', {
        claimId,
        recommendedAmount: recommendation.recommendedAmount,
        strategy: recommendation.negotiationStrategy,
      });

      return recommendation;
    } catch (error) {
      logger.error('Error recommending settlement', { claimId, error });
      throw new Error(`Failed to recommend settlement: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate optimal settlement amount
   */
  static async calculateOptimalSettlement(claimData: ClaimData): Promise<OptimalSettlement> {
    try {
      // Base policy limit
      const basePolicyLimit = claimData.policyInfo?.coverageAmount || claimData.claimedAmount * 1.2;

      // Valid claim amount (estimated)
      let validClaimAmount = claimData.claimedAmount * 0.8; // Assume 80% is valid on average

      // Coverage adjustment based on policy terms
      const coverageAdjustment = 1.0; // Full coverage assumed

      // Dispute risk adjustment
      const disputeRisk = 0.1; // 10% dispute risk
      const disputeRiskAdjustment = validClaimAmount * disputeRisk;

      // Subrogation potential (recovery from third party)
      const subrogationPotential = validClaimAmount * 0.15; // 15% recovery potential

      // Litigation cost avoidance (savings from settling early)
      const litigationCostAvoidance = claimData.claimedAmount * 0.05; // 5% savings

      // Calculate optimal settlement
      const optimalAmount = Math.max(0, Math.min(
        basePolicyLimit +
          validClaimAmount * coverageAdjustment +
          disputeRiskAdjustment -
          subrogationPotential +
          litigationCostAvoidance,
        claimData.policyInfo?.coverageAmount || Infinity
      ));

      // Calculate confidence interval
      const variance = optimalAmount * 0.1; // 10% variance
      const confidenceInterval: [number, number] = [
        Math.max(0, optimalAmount - variance),
        optimalAmount + variance,
      ];

      // Determine strategy
      const strategy: 'aggressive' | 'balanced' | 'conservative' =
        optimalAmount < claimData.claimedAmount * 0.7 ? 'aggressive' :
        optimalAmount < claimData.claimedAmount * 0.85 ? 'balanced' :
        'conservative';

      const factors = [
        {
          factor: 'base_policy_limit',
          value: basePolicyLimit,
          weight: 0.3,
          description: 'Policy coverage limit',
        },
        {
          factor: 'valid_claim_amount',
          value: validClaimAmount,
          weight: 0.4,
          description: 'Estimated valid claim amount',
        },
        {
          factor: 'coverage_adjustment',
          value: coverageAdjustment,
          weight: 0.1,
          description: 'Coverage terms adjustment',
        },
        {
          factor: 'dispute_risk_adjustment',
          value: disputeRiskAdjustment,
          weight: 0.05,
          description: 'Risk of dispute/appeal',
        },
        {
          factor: 'subrogation_potential',
          value: subrogationPotential,
          weight: 0.05,
          description: 'Potential third-party recovery',
        },
        {
          factor: 'litigation_cost_avoidance',
          value: litigationCostAvoidance,
          weight: 0.1,
          description: 'Savings from early settlement',
        },
      ];

      return {
        claimId: claimData.claimId,
        basePolicyLimit,
        validClaimAmount,
        coverageAdjustment,
        disputeRiskAdjustment,
        subrogationPotential,
        litigationCostAvoidance,
        optimalAmount: Math.round(optimalAmount * 100) / 100,
        confidenceInterval,
        strategy,
        factors,
      };
    } catch (error) {
      logger.error('Error calculating optimal settlement', { error });
      throw new Error(`Failed to calculate optimal settlement: ${(error as Error).message}`);
    }
  }

  /**
   * Get negotiation strategy
   */
  static async getNegotiationStrategy(claimId: string, claimData: ClaimData): Promise<NegotiationStrategy> {
    try {
      const optimalSettlement = await this.calculateOptimalSettlement(claimData);
      const litigationCost = await this.estimateLitigationCosts(claimId, claimData);

      const strategy = optimalSettlement.strategy;
      const recommendedAmount = optimalSettlement.optimalAmount;

      // Set opening offer based on strategy
      const openingOffer = strategy === 'aggressive'
        ? recommendedAmount * 0.75
        : strategy === 'balanced'
        ? recommendedAmount * 0.85
        : recommendedAmount * 0.95;

      // Set walk-away point
      const walkAwayPoint = strategy === 'aggressive'
        ? recommendedAmount * 1.2
        : strategy === 'balanced'
        ? recommendedAmount * 1.15
        : recommendedAmount * 1.1;

      // Define concessions
      const concessions = [
        {
          item: 'Initial discount',
          amount: recommendedAmount - openingOffer,
          condition: 'Prompt acceptance',
          priority: 'high' as const,
        },
        {
          item: 'Payment terms',
          amount: 0,
          condition: '30-day payment terms',
          priority: 'medium' as const,
        },
        {
          item: 'Documentation waiver',
          amount: recommendedAmount * 0.05,
          condition: 'If full documentation provided',
          priority: 'low' as const,
        },
      ];

      // Set timeline
      const expectedRounds = strategy === 'aggressive' ? 3 : 2;
      const estimatedDuration = strategy === 'aggressive' ? 45 : 30; // days

      const keyMilestones = [
        {
          milestone: 'Initial offer',
          estimatedDays: 7,
          action: 'Submit initial settlement offer',
        },
        {
          milestone: 'Counter-offer',
          estimatedDays: 14,
          action: 'Evaluate and respond to counter-offer',
        },
        {
          milestone: 'Negotiation',
          estimatedDays: 21,
          action: 'Negotiate terms and conditions',
        },
        {
          milestone: 'Final agreement',
          estimatedDays: estimatedDuration,
          action: 'Execute settlement agreement',
        },
      ];

      return {
        claimId,
        strategy,
        rationale: this.getStrategyRationale(strategy, optimalSettlement, litigationCost),
        openingOffer: Math.round(openingOffer * 100) / 100,
        targetAmount: recommendedAmount,
        walkAwayPoint: Math.round(walkAwayPoint * 100) / 100,
        concessions,
        timeline: {
          expectedRounds,
          estimatedDuration,
          keyMilestones,
        },
      };
    } catch (error) {
      logger.error('Error getting negotiation strategy', { claimId, error });
      throw new Error(`Failed to get negotiation strategy: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate litigation costs
   */
  static async estimateLitigationCosts(claimId: string, claimData: ClaimData): Promise<LitigationCostEstimate> {
    try {
      // Attorney fees (typically 30-40% of claim amount)
      const attorneyFees = claimData.claimedAmount * 0.35;

      // Court costs
      const courtCosts = 5000;

      // Expert witness fees
      const expertWitnessFees = claimData.claimType === 'auto_accident' || claimData.claimType === 'liability_personal'
        ? 15000
        : 5000;

      // Discovery costs
      const discoveryCosts = 10000;

      // Miscellaneous
      const miscellaneous = 2000;

      const totalEstimatedCost = attorneyFees + courtCosts + expertWitnessFees + discoveryCosts + miscellaneous;

      // Calculate confidence interval
      const variance = totalEstimatedCost * 0.2;
      const confidenceInterval: [number, number] = [
        totalEstimatedCost - variance,
        totalEstimatedCost + variance,
      ];

      return {
        claimId,
        attorneyFees,
        courtCosts,
        expertWitnessFees,
        discoveryCosts,
        miscellaneous,
        totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
        confidenceInterval: [
          Math.round(confidenceInterval[0] * 100) / 100,
          Math.round(confidenceInterval[1] * 100) / 100,
        ],
        riskAdjustment: 1.1, // 10% risk adjustment
      };
    } catch (error) {
      logger.error('Error estimating litigation costs', { claimId, error });
      throw new Error(`Failed to estimate litigation costs: ${(error as Error).message}`);
    }
  }

  /**
   * Evaluate subrogation potential
   */
  static async evaluateSubrogation(claimId: string, claimData: ClaimData): Promise<SubrogationPotential> {
    try {
      // Determine if subrogation is possible
      const hasSubrogationPotential = claimData.claimType === 'auto_accident' ||
        claimData.claimType === 'liability_personal' ||
        claimData.claimType === 'home_property_damage';

      if (!hasSubrogationPotential) {
        return {
          claimId,
          hasSubrogationPotential: false,
          estimatedRecoveryAmount: 0,
          confidence: 0,
          recoveryProbability: 0,
          estimatedTimeframe: 0,
          costs: {
            attorneyFees: 0,
            investigationCosts: 0,
            courtCosts: 0,
            otherCosts: 0,
            totalCosts: 0,
          },
          netRecovery: 0,
          recommendedActions: [],
        };
      }

      // Estimate recovery amount
      const estimatedRecoveryAmount = claimData.claimedAmount * 0.3; // 30% recovery

      // Recovery probability
      const recoveryProbability = 0.6; // 60% success rate

      // Estimated timeframe (months)
      const estimatedTimeframe = 12;

      // Costs
      const attorneyFees = estimatedRecoveryAmount * 0.33;
      const investigationCosts = 2000;
      const courtCosts = 3000;
      const otherCosts = 1500;
      const totalCosts = attorneyFees + investigationCosts + courtCosts + otherCosts;

      const netRecovery = Math.max(0, estimatedRecoveryAmount - totalCosts);

      const recommendedActions = netRecovery > 10000
        ? [
            'Pursue subrogation claim',
            'Document liability evidence',
            'Identify responsible parties',
            'Engage legal counsel',
          ]
        : [
            'Evaluate cost-benefit',
            'Consider small claims court',
          ];

      return {
        claimId,
        hasSubrogationPotential: true,
        responsibleParty: claimData.claimType === 'auto_accident' ? 'Other driver' : 'Third party',
        estimatedRecoveryAmount: Math.round(estimatedRecoveryAmount * 100) / 100,
        confidence: 0.7,
        recoveryProbability,
        estimatedTimeframe,
        costs: {
          attorneyFees,
          investigationCosts,
          courtCosts,
          otherCosts,
          totalCosts: Math.round(totalCosts * 100) / 100,
        },
        netRecovery: Math.round(netRecovery * 100) / 100,
        recommendedActions,
      };
    } catch (error) {
      logger.error('Error evaluating subrogation', { claimId, error });
      throw new Error(`Failed to evaluate subrogation: ${(error as Error).message}`);
    }
  }

  /**
   * Get settlement justification
   */
  static async getSettlementJustification(claimId: string, claimData: ClaimData): Promise<Justification> {
    try {
      const optimalSettlement = await this.calculateOptimalSettlement(claimData);
      const comparableCasesResult = await this.getComparableCases(claimId, 10);
      const comparableCases = comparableCasesResult.comparableCases;

      // Calculate benchmarks
      const averageSettlement = comparableCases.length > 0
        ? comparableCases.reduce((sum, c) => sum + c.settledAmount, 0) / comparableCases.length
        : optimalSettlement.optimalAmount * 0.9;

      const medianSettlement = comparableCases.length > 0
        ? this.calculateMedian(comparableCases.map(c => c.settledAmount))
        : optimalSettlement.optimalAmount * 0.85;

      const settlementRatio = optimalSettlement.optimalAmount / claimData.claimedAmount;
      const percentile = this.calculatePercentile(optimalSettlement.optimalAmount, comparableCases.map(c => c.settledAmount));

      const riskFactors = [
        'Claim type: ' + claimData.claimType,
        'Claim amount: $' + claimData.claimedAmount.toLocaleString(),
        'Coverage limit: $' + (claimData.policyInfo?.coverageAmount || 0).toLocaleString(),
      ];

      const mitigatingFactors = [
        'Clear liability',
        'Documentation complete',
        'Cooperative claimant',
      ];

      const conclusion = `Based on analysis of ${comparableCasesResult.totalFound} comparable cases, industry benchmarks, and the specific circumstances of this claim, a settlement of $${optimalSettlement.optimalAmount.toLocaleString()} (${(settlementRatio * 100).toFixed(0)}% of claimed amount) is recommended.`;

      return {
        claimId,
        recommendedAmount: optimalSettlement.optimalAmount,
        basis: [
          'Historical settlement data',
          'Industry benchmarks',
          'Policy coverage terms',
          'Claim circumstances',
          'Litigation cost avoidance',
        ],
        policyLimits: [
          {
            coverageType: claimData.insuranceType,
            limit: claimData.policyInfo?.coverageAmount || 0,
            remaining: Math.max(0, (claimData.policyInfo?.coverageAmount || 0) - optimalSettlement.optimalAmount),
          },
        ],
        benchmarks: {
          averageSettlement: Math.round(averageSettlement * 100) / 100,
          medianSettlement: Math.round(medianSettlement * 100) / 100,
          percentile,
        },
        riskFactors,
        mitigatingFactors,
        comparableCases: comparableCases.slice(0, 5),
        conclusion,
      };
    } catch (error) {
      logger.error('Error getting settlement justification', { claimId, error });
      throw new Error(`Failed to get settlement justification: ${(error as Error).message}`);
    }
  }

  /**
   * Get comparable cases
   */
  static async getComparableCases(claimId: string, limit: number): Promise<ComparableCases> {
    try {
      // In production, this would query database for similar claims
      // For now, return empty result

      return {
        claimId,
        totalFound: 0,
        comparableCases: [],
        averageSettlement: 0,
        medianSettlement: 0,
        settlementRange: [0, 0],
        recommendations: [
          'Monitor similar claims',
          'Update benchmarks regularly',
        ],
      };
    } catch (error) {
      logger.error('Error getting comparable cases', { claimId, error });
      throw new Error(`Failed to get comparable cases: ${(error as Error).message}`);
    }
  }

  /**
   * Determine negotiation strategy
   */
  private static determineNegotiationStrategy(
    optimalSettlement: OptimalSettlement,
    litigationCost: LitigationCostEstimate,
    subrogation: SubrogationPotential
  ): 'aggressive' | 'balanced' | 'conservative' {
    // Aggressive if savings are high and litigation costs are high
    if (optimalSettlement.optimalAmount < optimalSettlement.validClaimAmount * 0.7 &&
        litigationCost.totalEstimatedCost > optimalSettlement.optimalAmount * 0.3) {
      return 'aggressive';
    }

    // Conservative if claim has subrogation potential or high value
    if (subrogation.hasSubrogationPotential && subrogation.netRecovery > 10000) {
      return 'conservative';
    }

    return 'balanced';
  }

  /**
   * Get strategy rationale
   */
  private static getStrategyRationale(
    strategy: string,
    optimalSettlement: OptimalSettlement,
    litigationCost: LitigationCostEstimate
  ): string {
    if (strategy === 'aggressive') {
      return `Aggressive strategy justified: potential savings of $${(optimalSettlement.validClaimAmount - optimalSettlement.optimalAmount).toLocaleString()} and litigation costs of $${litigationCost.totalEstimatedCost.toLocaleString()} warrant firm negotiation position.`;
    } else if (strategy === 'conservative') {
      return 'Conservative strategy recommended: claim value and circumstances warrant closer to full amount to avoid litigation risk and maintain good relations.';
    }
    return 'Balanced strategy appropriate: moderate savings achievable while maintaining reasonable negotiation position.';
  }

  /**
   * Generate justification text
   */
  private static generateJustification(
    optimalSettlement: OptimalSettlement,
    litigationCost: LitigationCostEstimate,
    subrogation: SubrogationPotential
  ): string {
    const parts = [
      `Optimal settlement of $${optimalSettlement.optimalAmount.toLocaleString()} calculated based on:`,
      `- Valid claim amount: $${optimalSettlement.validClaimAmount.toLocaleString()}`,
      `- Policy limit: $${optimalSettlement.basePolicyLimit.toLocaleString()}`,
      `- Dispute risk adjustment: $${optimalSettlement.disputeRiskAdjustment.toLocaleString()}`,
      `- Litigation cost avoidance: $${optimalSettlement.litigationCostAvoidance.toLocaleString()}`,
    ];

    if (subrogation.hasSubrogationPotential) {
      parts.push(`- Subrogation potential: $${subrogation.estimatedRecoveryAmount.toLocaleString()}`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate median
   */
  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }

  /**
   * Calculate percentile
   */
  private static calculatePercentile(value: number, distribution: number[]): number {
    if (distribution.length === 0) return 50;
    const sorted = [...distribution].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return Math.round((index / sorted.length) * 100);
  }
}
