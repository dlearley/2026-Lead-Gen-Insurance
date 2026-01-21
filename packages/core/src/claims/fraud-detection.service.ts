import {
  ClaimFraudIndicator,
  CreateFraudIndicatorDto,
  ReviewFraudIndicatorDto,
  FraudIndicatorType,
  FraudStatus,
  Claim,
  ClaimFilterParams
} from '@insurance-lead-gen/types';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Fraud Detection Service - Analyzes claims for fraud indicators and patterns
 */
export class FraudDetectionService {
  private metrics = new MetricsCollector('fraud_detection');

  /**
   * Run fraud detection on a claim
   */
  async analyzeClaim(claimId: string): Promise<{ success: boolean; data?: ClaimFraudIndicator[]; error?: string }> {
    try {
      // Get claim details
      const claim = await this.getClaimFromDatabase(claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      // Run all fraud detection algorithms
      const indicators = await this.runFraudDetectionAlgorithms(claim);

      // Save indicators to database
      const savedIndicators = await Promise.all(
        indicators.map(indicator => this.createFraudIndicator(indicator))
      );

      // Calculate overall fraud score
      const fraudScore = this.calculateOverallFraudScore(savedIndicators);

      // Update claim with fraud assessment
      await this.updateClaimFraudStatus(claimId, fraudScore, savedIndicators);

      this.metrics.incrementCounter('claims_analyzed', { 
        claimType: claim.claimType,
        indicatorsFound: savedIndicators.length 
      });

      logger.info('Fraud analysis completed', {
        claimId,
        indicatorsFound: savedIndicators.length,
        fraudScore
      });

      return {
        success: true,
        data: savedIndicators
      };
    } catch (error) {
      logger.error('Fraud detection analysis failed', { error, claimId });
      this.metrics.incrementCounter('fraud_analysis_errors');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fraud analysis failed'
      };
    }
  }

  /**
   * Get fraud indicators for a claim
   */
  async getFraudIndicators(claimId: string): Promise<{ success: boolean; data?: ClaimFraudIndicator[]; error?: string }> {
    try {
      const indicators = await this.getFraudIndicatorsFromDatabase(claimId);
      
      return {
        success: true,
        data: indicators
      };
    } catch (error) {
      logger.error('Failed to retrieve fraud indicators', { error, claimId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve fraud indicators'
      };
    }
  }

  /**
   * Review and update fraud indicator status
   */
  async reviewFraudIndicator(
    indicatorId: string,
    reviewData: ReviewFraudIndicatorDto,
    reviewedBy: string
  ): Promise<{ success: boolean; data?: ClaimFraudIndicator; error?: string }> {
    try {
      const indicator = await this.getFraudIndicatorFromDatabase(indicatorId);
      if (!indicator) {
        return {
          success: false,
          error: 'Fraud indicator not found'
        };
      }

      const updatedIndicator = await this.updateFraudIndicator(indicatorId, {
        ...reviewData,
        reviewedBy,
        reviewDate: new Date()
      });

      // Recalculate overall fraud score if needed
      await this.recalculateClaimFraudScore(indicator.claimId);

      this.metrics.incrementCounter('fraud_indicators_reviewed', { 
        status: reviewData.status 
      });

      logger.info('Fraud indicator reviewed', {
        indicatorId,
        status: reviewData.status,
        reviewedBy
      });

      return {
        success: true,
        data: updatedIndicator,
        message: 'Fraud indicator reviewed successfully'
      };
    } catch (error) {
      logger.error('Failed to review fraud indicator', { error, indicatorId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review fraud indicator'
      };
    }
  }

  /**
   * Get fraud analytics and trends
   */
  async getFraudAnalytics(
    period: { from: Date; to: Date },
    filters?: {
      claimType?: string;
      carrierId?: string;
      adjusterId?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const analytics = await this.calculateFraudAnalytics(period, filters || {});
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Failed to calculate fraud analytics', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics'
      };
    }
  }

  /**
   * Run batch fraud detection on multiple claims
   */
  async batchAnalyzeClaims(claimIds: string[]): Promise<{ 
    success: boolean; 
    data?: { processed: number; failed: number; results: any[] }; 
    error?: string 
  }> {
    try {
      let processed = 0;
      let failed = 0;
      const results: any[] = [];

      for (const claimId of claimIds) {
        try {
          const result = await this.analyzeClaim(claimId);
          if (result.success) {
            processed++;
            results.push({ claimId, indicators: result.data?.length || 0, status: 'analyzed' });
          } else {
            failed++;
            results.push({ claimId, error: result.error, status: 'failed' });
          }
        } catch (claimError) {
          failed++;
          results.push({ claimId, error: claimError, status: 'failed' });
        }
      }

      this.metrics.incrementCounter('batch_fraud_analyses', { 
        totalClaims: claimIds.length,
        processed,
        failed 
      });

      logger.info('Batch fraud analysis completed', { 
        totalClaims: claimIds.length,
        processed, 
        failed 
      });

      return {
        success: true,
        data: { processed, failed, results }
      };
    } catch (error) {
      logger.error('Batch fraud analysis failed', { error, claimIds });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch analysis failed'
      };
    }
  }

  /**
   * Run all fraud detection algorithms on a claim
   */
  private async runFraudDetectionAlgorithms(claim: Claim): Promise<CreateFraudIndicatorDto[]> {
    const indicators: CreateFraudIndicatorDto[] = [];

    // 1. Duplicate claim detection
    const duplicateCheck = await this.checkDuplicateClaims(claim);
    if (duplicateCheck.duplicate) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.DUPLICATE_CLAIM,
        indicatorName: 'Potential duplicate claim detected',
        confidenceScore: duplicateCheck.confidence,
        description: duplicateCheck.description,
        recommendation: 'Verify claim uniqueness and investigate potential fraud'
      });
    }

    // 2. Staged loss detection
    const stagedLossCheck = await this.checkStagedLoss(claim);
    if (stagedLossCheck.suspicious) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.STAGED_LOSS,
        indicatorName: 'Potential staged loss',
        confidenceScore: stagedLossCheck.confidence,
        description: stagedLossCheck.description,
        recommendation: 'Investigate loss circumstances and authenticity'
      });
    }

    // 3. Inflated damage detection
    const inflatedDamageCheck = await this.checkInflatedDamage(claim);
    if (inflatedDamageCheck.suspicious) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.INFLATED_DAMAGE,
        indicatorName: 'Potential inflated damage amount',
        confidenceScore: inflatedDamageCheck.confidence,
        description: inflatedDamageCheck.description,
        recommendation: 'Request additional documentation and adjustor inspection'
      });
    }

    // 4. Suspicious timing detection
    const timingCheck = await this.checkSuspiciousTiming(claim);
    if (timingCheck.suspicious) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.SUSPICIOUS_TIMING,
        indicatorName: 'Suspicious claim timing',
        confidenceScore: timingCheck.confidence,
        description: timingCheck.description,
        recommendation: 'Review policy inception and claim reporting timeline'
      });
    }

    // 5. Unusual pattern detection
    const patternCheck = await this.checkUnusualPatterns(claim);
    if (patternCheck.suspicious) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.UNUSUAL_PATTERN,
        indicatorName: 'Unusual claim pattern',
        confidenceScore: patternCheck.confidence,
        description: patternCheck.description,
        recommendation: 'Analyze claim patterns and verify authenticity'
      });
    }

    // 6. Claimant history check
    const historyCheck = await this.checkClaimantHistory(claim);
    if (historyCheck.suspicious) {
      indicators.push({
        claimId: claim.id,
        indicatorType: FraudIndicatorType.CLAIMANT_HISTORY,
        indicatorName: 'Suspicious claimant history',
        confidenceScore: historyCheck.confidence,
        description: historyCheck.description,
        recommendation: 'Review claimant\'s claim history and patterns'
      });
    }

    return indicators;
  }

  /**
   * Check for duplicate claims
   */
  private async checkDuplicateClaims(claim: Claim): Promise<{ duplicate: boolean; confidence: number; description: string }> {
    // Check for claims with same policy, loss date, and amount
    const potentialDuplicates = await this.findSimilarClaims(claim, {
      policyId: claim.policyId,
      lossDate: claim.lossDate,
      claimedAmount: claim.claimedAmount,
      timeWindow: 7 // 7 days
    });

    if (potentialDuplicates.length > 0) {
      return {
        duplicate: true,
        confidence: Math.min(0.9, 0.5 + (potentialDuplicates.length * 0.1)),
        description: `Found ${potentialDuplicates.length} similar claim(s) within 7 days`
      };
    }

    return { duplicate: false, confidence: 0, description: '' };
  }

  /**
   * Check for staged loss indicators
   */
  private async checkStagedLoss(claim: Claim): Promise<{ suspicious: boolean; confidence: number; description: string }> {
    let score = 0;
    let description = '';

    // Check for no police report when expected
    if (claim.claimType === 'THEFT' && !await this.hasPoliceReport(claim.id)) {
      score += 0.3;
      description += 'No police report for theft claim. ';
    }

    // Check for lack of witness information
    if (!await this.hasWitnessInformation(claim.id)) {
      score += 0.2;
      description += 'No witness information provided. ';
    }

    // Check for vague loss description
    if (claim.lossDescription && claim.lossDescription.length < 50) {
      score += 0.2;
      description += 'Very brief loss description. ';
    }

    // Check for missing key details
    const missingDetails = await this.checkMissingKeyDetails(claim);
    if (missingDetails.length > 2) {
      score += 0.3;
      description += `Missing ${missingDetails.length} key details. `;
    }

    return {
      suspicious: score > 0.5,
      confidence: Math.min(0.9, score),
      description: description.trim()
    };
  }

  /**
   * Check for inflated damage amounts
   */
  private async checkInflatedDamage(claim: Claim): Promise<{ suspicious: boolean; confidence: number; description: string }> {
    if (!claim.claimedAmount || !claim.estimatedDamageAmount) {
      return { suspicious: false, confidence: 0, description: '' };
    }

    const ratio = claim.claimedAmount / claim.estimatedDamageAmount;
    
    if (ratio > 2.0) {
      return {
        suspicious: true,
        confidence: Math.min(0.8, (ratio - 1.0) * 0.3),
        description: `Claimed amount is ${ratio.toFixed(1)}x the estimated damage`
      };
    }

    return { suspicious: false, confidence: 0, description: '' };
  }

  /**
   * Check for suspicious timing
   */
  private async checkSuspiciousTiming(claim: Claim): Promise<{ suspicious: boolean; confidence: number; description: string }> {
    let score = 0;
    let description = '';

    // Check if claim was filed shortly after policy inception
    const policy = await this.getPolicyFromDatabase(claim.policyId);
    if (policy) {
      const daysSinceInception = (claim.reportedDate.getTime() - policy.effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceInception < 30) {
        score += 0.4;
        description += `Claim filed ${Math.floor(daysSinceInception)} days after policy inception. `;
      }
    }

    // Check if reported long after loss date
    const daysSinceLoss = (claim.reportedDate.getTime() - claim.lossDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLoss > 30) {
      score += 0.3;
      description += `Claim reported ${Math.floor(daysSinceLoss)} days after loss. `;
    }

    return {
      suspicious: score > 0.5,
      confidence: Math.min(0.9, score),
      description: description.trim()
    };
  }

  /**
   * Check for unusual patterns
   */
  private async checkUnusualPatterns(claim: Claim): Promise<{ suspicious: boolean; confidence: number; description: string }> {
    // Check for high claim frequency
    const recentClaims = await this.getRecentClaimsByInsured(claim.insuredId, 365); // Last year
    if (recentClaims.length > 3) {
      return {
        suspicious: true,
        confidence: Math.min(0.8, recentClaims.length * 0.15),
        description: `Insured has filed ${recentClaims.length} claims in the past year`
      };
    }

    // Check for claims at unusual hours (if timestamp available)
    if (claim.reportedDate.getHours() < 6 || claim.reportedDate.getHours() > 22) {
      return {
        suspicious: true,
        confidence: 0.3,
        description: 'Claim reported outside business hours'
      };
    }

    return { suspicious: false, confidence: 0, description: '' };
  }

  /**
   * Check claimant history
   */
  private async checkClaimantHistory(claim: Claim): Promise<{ suspicious: boolean; confidence: number; description: string }> {
    const claimHistory = await this.getClaimHistoryByInsured(claim.insuredId);
    
    // Check for pattern of denied claims
    const deniedClaims = claimHistory.filter(c => c.status === 'DENIED');
    if (deniedClaims.length > 2) {
      return {
        suspicious: true,
        confidence: Math.min(0.7, deniedClaims.length * 0.2),
        description: `Claimant has ${deniedClaims.length} previously denied claims`
      };
    }

    // Check for escalating claim amounts
    const recentClaims = claimHistory
      .filter(c => c.lossDate > new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)) // Last 2 years
      .sort((a, b) => a.lossDate.getTime() - b.lossDate.getTime());

    if (recentClaims.length > 1) {
      const amountIncrease = (claim.claimedAmount || 0) / (recentClaims[recentClaims.length - 1].claimedAmount || 1);
      if (amountIncrease > 2.0) {
        return {
          suspicious: true,
          confidence: 0.4,
          description: `Current claim amount is ${amountIncrease.toFixed(1)}x previous claims`
        };
      }
    }

    return { suspicious: false, confidence: 0, description: '' };
  }

  /**
   * Calculate overall fraud score from indicators
   */
  private calculateOverallFraudScore(indicators: ClaimFraudIndicator[]): number {
    if (indicators.length === 0) return 0;

    // Weight different types of indicators
    const weights: Record<FraudIndicatorType, number> = {
      DUPLICATE_CLAIM: 0.4,
      STAGED_LOSS: 0.3,
      INFLATED_DAMAGE: 0.2,
      SUSPICIOUS_TIMING: 0.15,
      UNUSUAL_PATTERN: 0.25,
      CLAIMANT_HISTORY: 0.2
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const indicator of indicators) {
      const weight = weights[indicator.indicatorType] || 0.1;
      weightedScore += indicator.confidenceScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(1.0, weightedScore / totalWeight) : 0;
  }

  /**
   * Update claim with fraud assessment results
   */
  private async updateClaimFraudStatus(claimId: string, fraudScore: number, indicators: ClaimFraudIndicator[]): Promise<void> {
    const fraudIndicator = fraudScore > 0.5;
    let riskLevel = 'LOW';
    
    if (fraudScore > 0.8) riskLevel = 'CRITICAL';
    else if (fraudScore > 0.6) riskLevel = 'HIGH';
    else if (fraudScore > 0.3) riskLevel = 'MEDIUM';

    await this.updateClaimInDatabase(claimId, {
      fraudIndicator,
      fraudProbabilityScore: fraudScore,
      riskLevel
    });

    // Create alert for high-risk claims
    if (fraudScore > 0.7) {
      await this.createFraudAlert(claimId, fraudScore, indicators);
    }
  }

  // Database abstraction methods
  private async getClaimFromDatabase(claimId: string): Promise<Claim | null> {
    throw new Error('Database implementation required');
  }

  private async createFraudIndicator(data: CreateFraudIndicatorDto): Promise<ClaimFraudIndicator> {
    throw new Error('Database implementation required');
  }

  private async getFraudIndicatorsFromDatabase(claimId: string): Promise<ClaimFraudIndicator[]> {
    throw new Error('Database implementation required');
  }

  private async getFraudIndicatorFromDatabase(indicatorId: string): Promise<ClaimFraudIndicator | null> {
    throw new Error('Database implementation required');
  }

  private async updateFraudIndicator(indicatorId: string, data: any): Promise<ClaimFraudIndicator> {
    throw new Error('Database implementation required');
  }

  private async updateClaimFraudStatusInDatabase(claimId: string, data: any): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async recalculateClaimFraudScore(claimId: string): Promise<void> {
    // Implementation would recalculate fraud score based on current indicators
  }

  private async calculateFraudAnalytics(period: any, filters: any): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async findSimilarClaims(claim: Claim, criteria: any): Promise<Claim[]> {
    throw new Error('Database implementation required');
  }

  private async hasPoliceReport(claimId: string): Promise<boolean> {
    throw new Error('Database implementation required');
  }

  private async hasWitnessInformation(claimId: string): Promise<boolean> {
    throw new Error('Database implementation required');
  }

  private async checkMissingKeyDetails(claim: Claim): Promise<string[]> {
    // Implementation would check for missing required details
    return [];
  }

  private async getPolicyFromDatabase(policyId: string): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async getRecentClaimsByInsured(insuredId: string, days: number): Promise<Claim[]> {
    throw new Error('Database implementation required');
  }

  private async getClaimHistoryByInsured(insuredId: string): Promise<Claim[]> {
    throw new Error('Database implementation required');
  }

  private async updateClaimInDatabase(claimId: string, data: any): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async createFraudAlert(claimId: string, fraudScore: number, indicators: ClaimFraudIndicator[]): Promise<void> {
    // Implementation would create fraud alert/notification
  }
}