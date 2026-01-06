// ========================================
// CLAIMS OUTCOME PREDICTION SERVICE - Phase 27.4
// ========================================

import type {
  OutcomePrediction,
  SettlementPrediction,
  ResolutionTimePrediction,
  LitigationRisk,
  ReserveRecommendation,
  OutcomeExplanation,
  AccuracyMetrics,
  DateRange,
  PredictionFactor,
  MilestonePrediction,
  ClaimData,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Claims Outcome Prediction Service
 * Predict claim outcomes including settlement amount, resolution time, and litigation risk
 */
export class ClaimsOutcomePredictionService {
  private static modelVersion = '1.0.0';

  /**
   * Predict claim outcome
   */
  static async predictClaimOutcome(claimId: string, claimData: ClaimData): Promise<OutcomePrediction> {
    try {
      logger.info('Starting claim outcome prediction', { claimId });

      const settlementPrediction = await this.predictSettlementAmount(claimData);
      const resolutionTimePrediction = await this.predictResolutionTime(claimId, claimData);
      const litigationRisk = await this.estimateLitigationRisk(claimId, claimData);
      const reserveRecommendation = await this.recommendReserveAmount(claimId, claimData);

      const prediction: OutcomePrediction = {
        id: `prediction-${claimId}-${Date.now()}`,
        claimId,
        predictedSettlementAmount: settlementPrediction.predictedAmount,
        settlementConfidence: settlementPrediction.confidence,
        predictedResolutionDays: resolutionTimePrediction.predictedDays,
        likelihoodDispute: litigationRisk.litigationProbability * 0.5, // Dispute is less likely than litigation
        litigationRiskProbability: litigationRisk.litigationProbability,
        reserveRecommendation: reserveRecommendation.recommendedAmount,
        predictionTimestamp: new Date(),
        keyFactors: settlementPrediction.factors,
        confidenceInterval: settlementPrediction.confidenceInterval,
        createdAt: new Date(),
      };

      logger.info('Claim outcome prediction completed', {
        claimId,
        predictedSettlement: prediction.predictedSettlementAmount,
        predictedDays: prediction.predictedResolutionDays,
        litigationRisk: prediction.litigationRiskProbability,
      });

      return prediction;
    } catch (error) {
      logger.error('Error predicting claim outcome', { claimId, error });
      throw new Error(`Failed to predict claim outcome: ${error.message}`);
    }
  }

  /**
   * Predict settlement amount
   */
  static async predictSettlementAmount(claimData: ClaimData): Promise<SettlementPrediction> {
    try {
      // Base settlement - typically 70-90% of claimed amount for legitimate claims
      const baseSettlementRatio = 0.8;
      let predictedAmount = claimData.claimedAmount * baseSettlementRatio;

      // Adjust by claim type
      const claimTypeAdjustments: Record<string, number> = {
        auto_accident: 0.85,
        auto_theft: 0.95,
        home_property_damage: 0.8,
        home_fire: 0.9,
        life_death: 1.0,
        health_medical: 0.75,
      };

      if (claimTypeAdjustments[claimData.claimType]) {
        predictedAmount = claimData.claimedAmount * claimTypeAdjustments[claimData.claimType];
      }

      // Deductible
      if (claimData.policyInfo?.deductible) {
        predictedAmount = Math.max(0, predictedAmount - claimData.policyInfo.deductible);
      }

      // Policy limit check
      if (claimData.policyInfo?.coverageAmount) {
        predictedAmount = Math.min(predictedAmount, claimData.policyInfo.coverageAmount);
      }

      // Adjust for previous claims history
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const avgSettlementRatio = claimData.previousClaims
          .filter((c: any) => c.settledAmount && c.claimedAmount)
          .reduce((sum: number, c: any) => sum + c.settledAmount / c.claimedAmount, 0) / claimData.previousClaims.length;

        if (avgSettlementRatio > 0) {
          predictedAmount = (predictedAmount * 0.7) + (claimData.claimedAmount * avgSettlementRatio * 0.3);
        }
      }

      const confidence = 0.8;
      const variance = predictedAmount * 0.15; // 15% variance

      const factors: PredictionFactor[] = [
        {
          factor: 'claim_amount',
          value: claimData.claimedAmount,
          impact: 0.5,
          importance: 0.4,
          explanation: 'Primary driver of settlement amount',
        },
        {
          factor: 'claim_type',
          value: claimData.claimType,
          impact: claimTypeAdjustments[claimData.claimType] || 0.8,
          importance: 0.3,
          explanation: 'Claim type affects settlement ratio',
        },
        {
          factor: 'deductible',
          value: claimData.policyInfo?.deductible || 0,
          impact: -0.3,
          importance: 0.15,
          explanation: 'Deductible reduces settlement amount',
        },
        {
          factor: 'coverage_limit',
          value: claimData.policyInfo?.coverageAmount || 0,
          impact: 0.2,
          importance: 0.1,
          explanation: 'Coverage limit caps settlement',
        },
        {
          factor: 'claims_history',
          value: claimData.previousClaims?.length || 0,
          impact: claimData.previousClaims?.length > 0 ? 0.1 : 0,
          importance: 0.05,
          explanation: 'Previous claims provide historical context',
        },
      ];

      return {
        claimId: claimData.claimId,
        predictedAmount: Math.round(predictedAmount * 100) / 100,
        confidence,
        lowEstimate: Math.max(0, Math.round((predictedAmount - variance) * 100) / 100),
        highEstimate: Math.round((predictedAmount + variance) * 100) / 100,
        medianEstimate: Math.round(predictedAmount * 100) / 100,
        factors,
        comparableCases: await this.getComparableCases(claimData.claimId, 5),
        confidenceInterval: [
          Math.round((predictedAmount - variance) * 100) / 100,
          Math.round((predictedAmount + variance) * 100) / 100,
        ],
      };
    } catch (error) {
      logger.error('Error predicting settlement amount', { error });
      throw new Error(`Failed to predict settlement amount: ${error.message}`);
    }
  }

  /**
   * Predict resolution time
   */
  static async predictResolutionTime(claimId: string, claimData: ClaimData): Promise<ResolutionTimePrediction> {
    try {
      // Base resolution time by claim type (days)
      const baseResolutionTimes: Record<string, number> = {
        auto_accident: 21,
        auto_theft: 14,
        auto_vandalism: 14,
        home_property_damage: 28,
        home_theft: 21,
        home_fire: 35,
        home_water_damage: 30,
        home_natural_disaster: 45,
        life_death: 30,
        life_terminal_illness: 21,
        health_medical: 28,
        health_hospitalization: 35,
        health_surgery: 30,
        liability_personal: 45,
        liability_professional: 60,
        other: 30,
      };

      let predictedDays = baseResolutionTimes[claimData.claimType] || 30;

      // Adjust by claim amount
      if (claimData.claimedAmount > 50000) {
        predictedDays *= 1.5;
      } else if (claimData.claimedAmount > 20000) {
        predictedDays *= 1.2;
      } else if (claimData.claimedAmount < 5000) {
        predictedDays *= 0.7;
      }

      // Adjust by previous claims history
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const avgResolutionTime = claimData.previousClaims
          .filter((c: any) => c.resolutionDays)
          .reduce((sum: number, c: any) => sum + c.resolutionDays, 0) / claimData.previousClaims.length;

        if (avgResolutionTime > 0) {
          predictedDays = (predictedDays * 0.6) + (avgResolutionTime * 0.4);
        }
      }

      const factors: string[] = [
        `Claim type: ${claimData.claimType}`,
        `Claim amount: $${claimData.claimedAmount.toLocaleString()}`,
        `Previous claims: ${claimData.previousClaims?.length || 0}`,
      ];

      const milestones: MilestonePrediction[] = [
        {
          milestone: 'Initial review',
          predictedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          confidence: 0.9,
        },
        {
          milestone: 'Investigation complete',
          predictedDate: new Date(Date.now() + predictedDays * 0.4 * 24 * 60 * 60 * 1000),
          confidence: 0.8,
        },
        {
          milestone: 'Settlement offer',
          predictedDate: new Date(Date.now() + predictedDays * 0.7 * 24 * 60 * 60 * 1000),
          confidence: 0.75,
        },
        {
          milestone: 'Resolution',
          predictedDate: new Date(Date.now() + predictedDays * 24 * 60 * 60 * 1000),
          confidence: 0.7,
        },
      ];

      return {
        claimId,
        predictedDays: Math.round(predictedDays),
        confidence: 0.75,
        minDays: Math.round(predictedDays * 0.6),
        maxDays: Math.round(predictedDays * 1.5),
        factors,
        milestones,
      };
    } catch (error) {
      logger.error('Error predicting resolution time', { claimId, error });
      throw new Error(`Failed to predict resolution time: ${error.message}`);
    }
  }

  /**
   * Estimate litigation risk
   */
  static async estimateLitigationRisk(claimId: string, claimData: ClaimData): Promise<LitigationRisk> {
    try {
      let litigationProbability = 0.1; // Base litigation rate

      // High-risk claim types
      const highRiskClaimTypes = ['liability_personal', 'liability_professional', 'life_death'];
      if (highRiskClaimTypes.includes(claimData.claimType)) {
        litigationProbability += 0.2;
      }

      // Claim amount factor
      if (claimData.claimedAmount > 100000) {
        litigationProbability += 0.15;
      } else if (claimData.claimedAmount > 50000) {
        litigationProbability += 0.1;
      }

      // Previous litigation history
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const litigatedClaims = claimData.previousClaims.filter((c: any) => c.litigation === true);
        litigationProbability += litigatedClaims.length * 0.15;
      }

      // Cap at 0.95
      litigationProbability = Math.min(litigationProbability, 0.95);

      const estimatedCost = litigationProbability * claimData.claimedAmount * 0.2; // 20% of claim value

      const riskFactors = [
        {
          factor: 'claim_type',
          riskLevel: highRiskClaimTypes.includes(claimData.claimType) ? 'high' : 'medium',
          description: highRiskClaimTypes.includes(claimData.claimType)
            ? 'Claim type has higher litigation risk'
            : 'Standard litigation risk for claim type',
          impact: highRiskClaimTypes.includes(claimData.claimType) ? 0.2 : 0.1,
        },
        {
          factor: 'claim_amount',
          riskLevel: claimData.claimedAmount > 50000 ? 'high' : 'low',
          description: claimData.claimedAmount > 50000
            ? 'High-value claims more likely to litigate'
            : 'Amount within normal range',
          impact: claimData.claimedAmount > 50000 ? 0.15 : 0.05,
        },
      ];

      const recommendedActions = litigationProbability > 0.4
        ? [
            'Prepare litigation defense early',
            'Document all evidence thoroughly',
            'Consider settlement before litigation',
            'Engage legal counsel if needed',
          ]
        : [
            'Standard claims handling procedures',
            'Maintain good documentation',
          ];

      return {
        claimId,
        litigationProbability,
        confidence: 0.7,
        riskFactors,
        estimatedLitigationCost: Math.round(estimatedCost * 100) / 100,
        estimatedDuration: litigationProbability > 0.5 ? 365 : 180, // days
        recommendedActions,
      };
    } catch (error) {
      logger.error('Error estimating litigation risk', { claimId, error });
      throw new Error(`Failed to estimate litigation risk: ${error.message}`);
    }
  }

  /**
   * Calculate reserve recommendation
   */
  static async recommendReserveAmount(claimId: string, claimData: ClaimData): Promise<ReserveRecommendation> {
    try {
      const settlementPrediction = await this.predictSettlementAmount(claimData);
      const litigationRisk = await this.estimateLitigationRisk(claimId, claimData);

      // Base reserve on predicted settlement
      let recommendedAmount = settlementPrediction.predictedAmount;

      // Add litigation cost buffer
      recommendedAmount += litigationRisk.estimatedLitigationCost;

      // Add additional risk buffer (10%)
      recommendedAmount *= 1.1;

      // Check coverage limit
      if (claimData.policyInfo?.coverageAmount) {
        recommendedAmount = Math.min(recommendedAmount, claimData.policyInfo.coverageAmount);
      }

      const factors: PredictionFactor[] = [
        {
          factor: 'predicted_settlement',
          value: settlementPrediction.predictedAmount,
          impact: 0.8,
          importance: 0.6,
          explanation: 'Primary component of reserve',
        },
        {
          factor: 'litigation_risk',
          value: litigationRisk.litigationProbability,
          impact: litigationRisk.litigationProbability,
          importance: 0.25,
          explanation: 'Litigation risk adds to reserve requirement',
        },
        {
          factor: 'risk_buffer',
          value: 0.1,
          impact: 0.1,
          importance: 0.1,
          explanation: 'Additional buffer for uncertainty',
        },
        {
          factor: 'coverage_limit',
          value: claimData.policyInfo?.coverageAmount || 0,
          impact: 0.1,
          importance: 0.05,
          explanation: 'Coverage limit caps reserve',
        },
      ];

      return {
        claimId,
        recommendedAmount: Math.round(recommendedAmount * 100) / 100,
        confidence: 0.75,
        justification: `Reserve based on predicted settlement ($${settlementPrediction.predictedAmount.toLocaleString()}) plus litigation cost buffer ($${litigationRisk.estimatedLitigationCost.toLocaleString()}) and 10% risk buffer`,
        riskAdjustment: 1.1,
        coverageLimit: claimData.policyInfo?.coverageAmount || 0,
        remainingCoverage: claimData.policyInfo
          ? Math.max(0, claimData.policyInfo.coverageAmount - recommendedAmount)
          : 0,
        factors,
      };
    } catch (error) {
      logger.error('Error recommending reserve amount', { claimId, error });
      throw new Error(`Failed to recommend reserve amount: ${error.message}`);
    }
  }

  /**
   * Get outcome explanation
   */
  static async getOutcomeExplanation(claimId: string, prediction: OutcomePrediction): Promise<OutcomeExplanation> {
    try {
      const comparableCases = await this.getComparableCases(claimId, 3);

      return {
        claimId,
        settlementAmount: prediction.predictedSettlementAmount,
        confidenceLevel: prediction.settlementConfidence,
        keyFactors: prediction.keyFactors,
        comparableCases,
        marketConditions: [
          {
            factor: 'settlement_trend',
            currentValue: 0.8,
            trend: 'stable',
            impact: 0.1,
            description: 'Settlement ratios remain stable',
          },
        ],
        recommendations: [
          'Monitor claim progression',
          'Ensure proper documentation',
          'Consider early settlement if cost-effective',
        ],
      };
    } catch (error) {
      logger.error('Error getting outcome explanation', { claimId, error });
      throw new Error(`Failed to get outcome explanation: ${error.message}`);
    }
  }

  /**
   * Get prediction accuracy metrics
   */
  static async getPredictionAccuracy(dateRange: DateRange): Promise<AccuracyMetrics> {
    try {
      // In production, this would query actual vs predicted values
      // For now, return simulated metrics

      return {
        period: dateRange,
        totalPredictions: 1000,
        settlementAccuracy: 0.92, // 92% within 10%
        settlementMAE: 2500, // Mean Absolute Error in dollars
        settlementRMSE: 3500, // Root Mean Square Error
        resolutionTimeAccuracy: 0.85,
        litigationAccuracy: 0.87,
        modelVersion: this.modelVersion,
        calibrationStatus: 'calibrated',
      };
    } catch (error) {
      logger.error('Error getting prediction accuracy', { dateRange, error });
      throw new Error(`Failed to get prediction accuracy: ${error.message}`);
    }
  }

  /**
   * Get comparable cases
   */
  private static async getComparableCases(claimId: string, limit: number): Promise<any[]> {
    try {
      // In production, this would query similar claims from database
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error getting comparable cases', { claimId, error });
      return [];
    }
  }
}
