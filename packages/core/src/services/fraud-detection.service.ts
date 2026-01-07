// ========================================
// FRAUD DETECTION SERVICE - Phase 27.4
// ========================================

import type {
  FraudAssessment,
  RuleViolation,
  Anomaly,
  FraudScore,
  NetworkConnection,
  FraudExplanation,
  SuspiciousClaim,
  ClaimFilter,
  ClaimData,
  RiskFactor,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Fraud Detection Service
 * Comprehensive fraud assessment using multiple detection methods
 */
export class FraudDetectionService {
  private static fraudRules = FraudDetectionService.initializeFraudRules();

  /**
   * Initialize fraud detection rules
   */
  private static initializeFraudRules(): FraudRule[] {
    return [
      {
        ruleId: 'FR001',
        ruleName: 'Claim submitted before policy effective',
        severity: 'Critical',
        condition: (data: ClaimData) => {
          return data.policyInfo && new Date(data.incidentDate) < data.policyInfo.startDate;
        },
        impactScore: 100,
      },
      {
        ruleId: 'FR002',
        ruleName: 'Claim amount exceeds policy limit',
        severity: 'High',
        condition: (data: ClaimData) => {
          return data.policyInfo && data.claimedAmount > data.policyInfo.coverageAmount;
        },
        impactScore: 90,
      },
      {
        ruleId: 'FR003',
        ruleName: 'Multiple claims from same provider in short timeframe',
        severity: 'Medium',
        condition: (data: ClaimData) => {
          if (!data.previousClaims || !data.providerInfo) return false;
          const recentClaims = data.previousClaims.filter((c: any) => {
            const daysSince = (new Date(data.submittedDate).getTime() - new Date(c.submittedDate).getTime()) / (1000 * 60 * 60 * 24);
            return c.providerId === data.providerInfo?.providerId && daysSince <= 30;
          });
          return recentClaims.length >= 3;
        },
        impactScore: 70,
      },
      {
        ruleId: 'FR004',
        ruleName: 'Claimant age inconsistency',
        severity: 'Medium',
        condition: (data: ClaimData) => {
          if (!data.claimantInfo.age || !data.policyInfo) return false;
          const policyAge = (new Date(data.submittedDate).getTime() - data.policyInfo.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return data.claimantInfo.age < 18 || data.claimantInfo.age > 100;
        },
        impactScore: 50,
      },
      {
        ruleId: 'FR005',
        ruleName: 'Geographic inconsistency',
        severity: 'Medium',
        condition: (data: ClaimData) => {
          // This would be implemented with address validation service
          return false;
        },
        impactScore: 60,
      },
      {
        ruleId: 'FR006',
        ruleName: 'Claim amount significantly above historical average',
        severity: 'High',
        condition: (data: ClaimData) => {
          if (!data.previousClaims || data.previousClaims.length === 0) return false;
          const avgAmount = data.previousClaims.reduce((sum: number, c: any) => sum + c.claimedAmount, 0) / data.previousClaims.length;
          return data.claimedAmount > avgAmount * 3;
        },
        impactScore: 80,
      },
      {
        ruleId: 'FR007',
        ruleName: 'Provider flagged for fraud',
        severity: 'Critical',
        condition: (data: ClaimData) => {
          // This would check provider against fraud registry
          return false;
        },
        impactScore: 95,
      },
    ];
  }

  /**
   * Comprehensive fraud assessment
   */
  static async assessFraudRisk(claimId: string, claimData: ClaimData): Promise<FraudAssessment> {
    try {
      logger.info('Starting fraud risk assessment', { claimId });

      const ruleViolations = await this.applyFraudRules(claimData);
      const behavioralAnomalies = await this.detectBehavioralAnomalies(claimId, claimData);
      const fraudScore = await this.scoreFraudProbability(claimData);
      const networkConnections = await this.identifyFraudNetworks(claimId, claimData);

      const riskFactors = this.calculateRiskFactors(
        ruleViolations,
        behavioralAnomalies,
        fraudScore,
        networkConnections
      );

      const fraudProbability = this.calculateOverallFraudProbability(riskFactors);
      const fraudRiskLevel = this.determineRiskLevel(fraudProbability);

      const assessment: FraudAssessment = {
        id: `assessment-${claimId}-${Date.now()}`,
        claimId,
        assessmentDate: new Date(),
        fraudProbability,
        fraudRiskLevel,
        riskFactors,
        ruleTriggers: ruleViolations.map(r => r.ruleId),
        behavioralAnomalies,
        networkRisk: networkConnections.length > 0,
        flagForInvestigation: fraudRiskLevel === 'High' || fraudProbability > 0.7,
        createdAt: new Date(),
      };

      logger.info('Fraud assessment completed', {
        claimId,
        fraudProbability,
        fraudRiskLevel,
        ruleTriggers: ruleViolations.length,
        anomaliesDetected: behavioralAnomalies.length,
      });

      return assessment;
    } catch (error) {
      logger.error('Error assessing fraud risk', { claimId, error });
      throw new Error(`Failed to assess fraud risk: ${error.message}`);
    }
  }

  /**
   * Run rule-based fraud checks
   */
  static async applyFraudRules(claimData: ClaimData): Promise<RuleViolation[]> {
    try {
      const violations: RuleViolation[] = [];

      for (const rule of this.fraudRules) {
        if (rule.condition(claimData)) {
          violations.push({
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            severity: rule.severity,
            description: `${rule.ruleName} - detected value: ${JSON.stringify(claimData)}`,
            triggeredValue: claimData,
            impactScore: rule.impactScore,
          });
        }
      }

      return violations;
    } catch (error) {
      logger.error('Error applying fraud rules', { error });
      throw new Error(`Failed to apply fraud rules: ${error.message}`);
    }
  }

  /**
   * Detect behavioral anomalies
   */
  static async detectBehavioralAnomalies(claimId: string, claimData: ClaimData): Promise<Anomaly[]> {
    try {
      const anomalies: Anomaly[] = [];

      // Size anomaly
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const avgAmount = claimData.previousClaims.reduce((sum: number, c: any) => sum + c.claimedAmount, 0) / claimData.previousClaims.length;
        const deviation = ((claimData.claimedAmount - avgAmount) / avgAmount) * 100;

        if (deviation > 200) {
          anomalies.push({
            id: `anomaly-size-${claimId}`,
            anomalyType: 'size',
            anomalyScore: Math.min(deviation / 3, 100),
            severity: deviation > 300 ? 'Critical' : 'High',
            description: `Claim amount is ${deviation.toFixed(0)}% above historical average`,
            detectedValue: claimData.claimedAmount,
            expectedValue: avgAmount,
            confidence: 0.85,
          });
        }
      }

      // Timing anomaly
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const latestClaim = claimData.previousClaims[0];
        const daysSinceLastClaim = (new Date(claimData.submittedDate).getTime() - new Date(latestClaim.submittedDate).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastClaim < 7 && claimData.previousClaims.length >= 2) {
          anomalies.push({
            id: `anomaly-timing-${claimId}`,
            anomalyType: 'timing',
            anomalyScore: Math.max(0, 100 - daysSinceLastClaim * 10),
            severity: daysSinceLastClaim < 3 ? 'Critical' : 'High',
            description: `Another claim submitted only ${daysSinceLastClaim.toFixed(0)} days ago`,
            detectedValue: daysSinceLastClaim,
            expectedValue: 30,
            confidence: 0.9,
          });
        }
      }

      // Frequency anomaly
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const claimsLast90Days = claimData.previousClaims.filter((c: any) => {
          const daysSince = (new Date(claimData.submittedDate).getTime() - new Date(c.submittedDate).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 90;
        });

        if (claimsLast90Days.length > 5) {
          anomalies.push({
            id: `anomaly-frequency-${claimId}`,
            anomalyType: 'frequency',
            anomalyScore: Math.min(claimsLast90Days.length * 15, 100),
            severity: claimsLast90Days.length > 10 ? 'Critical' : 'High',
            description: `${claimsLast90Days.length} claims in the last 90 days`,
            detectedValue: claimsLast90Days.length,
            expectedValue: 2,
            confidence: 0.95,
          });
        }
      }

      return anomalies;
    } catch (error) {
      logger.error('Error detecting behavioral anomalies', { claimId, error });
      throw new Error(`Failed to detect behavioral anomalies: ${error.message}`);
    }
  }

  /**
   * ML-based fraud scoring
   */
  static async scoreFraudProbability(claimData: ClaimData): Promise<FraudScore> {
    try {
      // Simulated ML model - in production, this would call a trained model
      const baseProbability = 0.1; // Base fraud rate in industry

      // Feature-based scoring
      let fraudScore = baseProbability;

      // Claim amount factor
      if (claimData.claimedAmount > 50000) {
        fraudScore += 0.2;
      } else if (claimData.claimedAmount > 20000) {
        fraudScore += 0.1;
      }

      // Claim type factor
      const highRiskClaimTypes = ['auto_theft', 'home_fire', 'life_death'];
      if (highRiskClaimTypes.includes(claimData.claimType)) {
        fraudScore += 0.15;
      }

      // New policy factor
      if (claimData.policyInfo) {
        const daysSincePolicyStart = (new Date(claimData.submittedDate).getTime() - claimData.policyInfo.startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePolicyStart < 30) {
          fraudScore += 0.25;
        } else if (daysSincePolicyStart < 90) {
          fraudScore += 0.1;
        }
      }

      // Previous claims factor
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const deniedClaims = claimData.previousClaims.filter((c: any) => c.status === 'denied');
        if (deniedClaims.length > 0) {
          fraudScore += deniedClaims.length * 0.2;
        }
      }

      // Cap at 0.99
      fraudScore = Math.min(fraudScore, 0.99);

      return {
        probability: fraudScore,
        confidence: 0.75,
        modelVersion: '1.0.0',
        featureContributions: [
          { feature: 'claim_amount', value: claimData.claimedAmount, contribution: 0.3, importance: 0.25 },
          { feature: 'claim_type', value: claimData.claimType, contribution: 0.15, importance: 0.2 },
          { feature: 'policy_age', value: claimData.policyInfo ? 'new' : 'unknown', contribution: 0.25, importance: 0.3 },
          { feature: 'claims_history', value: claimData.previousClaims?.length || 0, contribution: 0.2, importance: 0.25 },
        ],
        calibrationStatus: 'calibrated',
      };
    } catch (error) {
      logger.error('Error scoring fraud probability', { error });
      throw new Error(`Failed to score fraud probability: ${error.message}`);
    }
  }

  /**
   * Identify fraud networks
   */
  static async identifyFraudNetworks(claimId: string, claimData: ClaimData): Promise<NetworkConnection[]> {
    try {
      const connections: NetworkConnection[] = [];

      // Check for same provider connections
      if (claimData.providerInfo && claimData.previousClaims) {
        const sameProviderClaims = claimData.previousClaims.filter((c: any) => c.providerId === claimData.providerInfo?.providerId);
        if (sameProviderClaims.length > 2) {
          connections.push({
            sourceId: claimData.customerId,
            targetId: claimData.providerInfo.providerId,
            sourceType: 'claimant',
            targetType: 'provider',
            connectionStrength: 0.8,
            connectionType: 'same_provider',
            evidenceCount: sameProviderClaims.length,
            fraudProbability: sameProviderClaims.length > 5 ? 0.7 : 0.4,
          });
        }
      }

      // Check for address-based connections
      if (claimData.claimantInfo.address && claimData.previousClaims) {
        const sameAddressClaims = claimData.previousClaims.filter((c: any) => c.claimantInfo?.address === claimData.claimantInfo?.address);
        if (sameAddressClaims.length > 0) {
          connections.push({
            sourceId: claimData.customerId,
            targetId: sameAddressClaims[0].customerId,
            sourceType: 'claimant',
            targetType: 'claimant',
            connectionStrength: 0.9,
            connectionType: 'same_address',
            evidenceCount: sameAddressClaims.length,
            fraudProbability: 0.6,
          });
        }
      }

      return connections;
    } catch (error) {
      logger.error('Error identifying fraud networks', { claimId, error });
      throw new Error(`Failed to identify fraud networks: ${error.message}`);
    }
  }

  /**
   * Get fraud explanation for investigators
   */
  static async getFraudExplanation(claimId: string, assessment: FraudAssessment): Promise<FraudExplanation> {
    try {
      const recommendedActions: string[] = [];

      if (assessment.fraudRiskLevel === 'High') {
        recommendedActions.push('Immediate investigation required');
        recommendedActions.push('Verify all documentation');
        recommendedActions.push('Check for network connections');
      } else if (assessment.fraudRiskLevel === 'Medium') {
        recommendedActions.push('Enhanced review recommended');
        recommendedActions.push('Verify high-value claims');
      }

      if (assessment.networkRisk) {
        recommendedActions.push('Investigate potential fraud ring');
      }

      return {
        claimId,
        overallRisk: assessment.fraudRiskLevel,
        keyFactors: assessment.riskFactors,
        triggeredRules: assessment.ruleTriggers.map((ruleId, index) => ({
          ruleId,
          ruleName: this.fraudRules.find(r => r.ruleId === ruleId)?.ruleName || ruleId,
          severity: 'High',
          description: 'Fraud rule triggered',
          triggeredValue: null,
          impactScore: 80,
        })),
        networkRisks: [],
        recommendedActions,
        investigatorNotes: assessment.investigatorNotes,
      };
    } catch (error) {
      logger.error('Error getting fraud explanation', { claimId, error });
      throw new Error(`Failed to get fraud explanation: ${error.message}`);
    }
  }

  /**
   * Flag claim for investigation
   */
  static async flagForInvestigation(claimId: string, reason: string): Promise<void> {
    try {
      logger.info('Flagging claim for investigation', { claimId, reason });

      // In production, this would:
      // 1. Create investigation record
      // 2. Notify investigators
      // 3. Update claim status
      // 4. Send notifications

      logger.info('Claim flagged for investigation', { claimId });
    } catch (error) {
      logger.error('Error flagging claim for investigation', { claimId, error });
      throw new Error(`Failed to flag claim for investigation: ${error.message}`);
    }
  }

  /**
   * Get suspicious claims in batch
   */
  static async getSuspiciousClaims(filters: ClaimFilter): Promise<SuspiciousClaim[]> {
    try {
      // In production, this would query the database
      const suspiciousClaims: SuspiciousClaim[] = [];

      logger.info('Retrieved suspicious claims', {
        count: suspiciousClaims.length,
        filters,
      });

      return suspiciousClaims;
    } catch (error) {
      logger.error('Error getting suspicious claims', { filters, error });
      throw new Error(`Failed to get suspicious claims: ${error.message}`);
    }
  }

  /**
   * Calculate risk factors from multiple sources
   */
  private static calculateRiskFactors(
    ruleViolations: RuleViolation[],
    behavioralAnomalies: Anomaly[],
    fraudScore: FraudScore,
    networkConnections: NetworkConnection[]
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Rule violations
    ruleViolations.forEach(violation => {
      factors.push({
        factor: violation.ruleName,
        score: violation.impactScore,
        explanation: violation.description,
        weight: 0.3,
      });
    });

    // Behavioral anomalies
    behavioralAnomalies.forEach(anomaly => {
      factors.push({
        factor: `${anomaly.anomalyType}_anomaly`,
        score: anomaly.anomalyScore,
        explanation: anomaly.description,
        weight: 0.25,
      });
    });

    // ML fraud score
    factors.push({
      factor: 'ml_fraud_probability',
      score: fraudScore.probability * 100,
      explanation: `Machine learning model predicts ${fraudScore.probability.toFixed(2)} fraud probability`,
      weight: 0.35,
    });

    // Network risk
    if (networkConnections.length > 0) {
      factors.push({
        factor: 'network_risk',
        score: networkConnections.reduce((max, conn) => Math.max(max, conn.fraudProbability * 100), 0),
        explanation: `Claim connected to ${networkConnections.length} suspicious network(s)`,
        weight: 0.1,
      });
    }

    return factors;
  }

  /**
   * Calculate overall fraud probability
   */
  private static calculateOverallFraudProbability(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0.1;

    const weightedSum = riskFactors.reduce((sum, factor) => {
      return sum + (factor.score / 100) * factor.weight;
    }, 0);

    const totalWeight = riskFactors.reduce((sum, factor) => sum + factor.weight, 0);

    return Math.min(weightedSum / totalWeight, 0.99);
  }

  /**
   * Determine risk level from probability
   */
  private static determineRiskLevel(probability: number): 'High' | 'Medium' | 'Low' {
    if (probability >= 0.6) return 'High';
    if (probability >= 0.3) return 'Medium';
    return 'Low';
  }
}

/**
 * Fraud rule definition
 */
interface FraudRule {
  ruleId: string;
  ruleName: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  condition: (data: ClaimData) => boolean;
  impactScore: number;
}
