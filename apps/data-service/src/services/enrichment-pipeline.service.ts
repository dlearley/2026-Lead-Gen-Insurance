import { PrismaClient } from '@prisma/client';
import { DMVService } from './dmv.service.js';
import { CLUEService } from './clue.service.js';
import { LexisNexisService } from './lexisnexis.service.js';
import { logger } from '@insurance/core';

interface EnrichmentConfig {
  dataTypes: string[]; // ['dmv', 'clue', 'credit', 'background']
  autoEnrich: boolean;
  priorityOrder: number;
  fallbackBehavior: 'skip' | 'use_cached' | 'manual_review';
}

interface EnrichmentResult {
  policyId: string;
  status: 'completed' | 'partial' | 'failed';
  data: {
    dmv?: any;
    clue?: any;
    credit?: any;
    background?: any;
    riskAssessment?: any;
  };
  errors: string[];
  dataQualityScore?: number;
  confidenceScore?: number;
}

export class EnrichmentPipeline {
  private prisma: PrismaClient;
  private dmvService: DMVService;
  private clueService: CLUEService;
  private lexisService: LexisNexisService;

  constructor() {
    this.prisma = new PrismaClient();
    this.dmvService = new DMVService();
    this.clueService = new CLUEService();
    this.lexisService = new LexisNexisService();
  }

  async enrichPolicy(policyId: string, config?: EnrichmentConfig): Promise<EnrichmentResult> {
    const effectiveConfig = config || await this.getDefaultConfig('policy');
    
    // Create enrichment task
    const task = await this.createEnrichmentTask(policyId, 'policy', effectiveConfig);

    try {
      logger.info('Starting policy enrichment', { 
        policyId, 
        dataTypes: effectiveConfig.dataTypes 
      });

      // Check cache first
      const cachedData = await this.checkCache(policyId, effectiveConfig.dataTypes);
      if (cachedData.isComplete) {
        logger.info('Returning fully cached enrichment data', { policyId });
        await this.completeTask(task.id, cachedData.data, 0.95);
        return {
          policyId,
          status: 'completed',
          data: cachedData.data,
          errors: [],
          dataQualityScore: 0.95,
          confidenceScore: 0.95
        };
      }

      // Perform enrichment in parallel where possible
      const enrichmentResults = await this.executeEnrichmentSteps(policyId, effectiveConfig, cachedData);
      
      // Validate and deduplicate
      const validatedData = await this.validateEnrichmentData(enrichmentResults);
      
      // Calculate data quality scores
      const dataQualityScore = await this.calculateDataQuality(validatedData);
      
      // Cache results
      await this.cacheEnrichmentResults(policyId, validatedData, dataQualityScore);
      
      // Complete task
      await this.completeTask(task.id, validatedData, dataQualityScore);

      // Trigger downstream processes
      await this.triggerUnderwritingEvaluation(policyId, validatedData);

      logger.info('Policy enrichment completed', { 
        policyId, 
        status: enrichmentResults.partial ? 'partial' : 'completed',
        dataQualityScore 
      });

      return {
        policyId,
        status: enrichmentResults.partial ? 'partial' : 'completed',
        data: validatedData,
        errors: enrichmentResults.errors,
        dataQualityScore,
        confidenceScore: dataQualityScore
      };

    } catch (error) {
      logger.error('Policy enrichment failed', { 
        policyId, 
        error: error instanceof Error ? error.message : error 
      });
      await this.failTask(task.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async enrichClaim(claimId: string, config?: EnrichmentConfig): Promise<EnrichmentResult> {
    const effectiveConfig = config || await this.getDefaultConfig('claim');
    
    const task = await this.createEnrichmentTask(claimId, 'claim', effectiveConfig);

    try {
      logger.info('Starting claim enrichment', { claimId, dataTypes: effectiveConfig.dataTypes });

      // Claims typically need different enrichment (less DMV, more CLUE/fraud)
      const adjustedConfig = {
        ...effectiveConfig,
        dataTypes: effectiveConfig.dataTypes.filter(dt => dt !== 'dmv')
      };

      const enrichmentResults = await this.executeEnrichmentSteps(claimId, adjustedConfig, { isComplete: false });
      const validatedData = await this.validateEnrichmentData(enrichmentResults);
      const dataQualityScore = await this.calculateDataQuality(validatedData);
      
      await this.cacheEnrichmentResults(claimId, validatedData, dataQualityScore);
      await this.completeTask(task.id, validatedData, dataQualityScore);

      // For claims, trigger fraud detection
      await this.triggerFraudAnalysis(claimId, validatedData);

      return {
        policyId: claimId,
        status: enrichmentResults.partial ? 'partial' : 'completed',
        data: validatedData,
        errors: enrichmentResults.errors,
        dataQualityScore,
        confidenceScore: dataQualityScore
      };

    } catch (error) {
      logger.error('Claim enrichment failed', { 
        claimId, 
        error: error instanceof Error ? error.message : error 
      });
      await this.failTask(task.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getEnrichmentStatus(taskId: string): Promise<any> {
    return await this.prisma.enrichmentTask.findUnique({
      where: { id: taskId }
    });
  }

  async getCacheStatistics(): Promise<any> {
    const [totalCached, expiredCached, byDataType] = await Promise.all([
      this.prisma.enrichmentDataCache.count(),
      this.prisma.enrichmentDataCache.count({
        where: { expiresAt: { lt: new Date() } }
      }),
      this.prisma.enrichmentDataCache.groupBy({
        by: ['dataType'],
        _count: { id: true }
      })
    ]);

    return {
      totalEntries: totalCached,
      expiredEntries: expiredCached,
      activeEntries: totalCached - expiredCached,
      byDataType: byDataType.map(item => ({
        dataType: item.dataType,
        count: item._count.id
      })),
      hitRate: await this.calculateCacheHitRate()
    };
  }

  async clearExpiredCache(): Promise<{ deletedCount: number }> {
    const result = await this.prisma.enrichmentDataCache.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    logger.info('Cleared expired cache entries', { deletedCount: result.count });
    return { deletedCount: result.count };
  }

  private async createEnrichmentTask(
    entityId: string,
    taskType: 'policy' | 'claim',
    config: EnrichmentConfig
  ): Promise<any> {
    return await this.prisma.enrichmentTask.create({
      data: {
        policyId: taskType === 'policy' ? entityId : null,
        claimId: taskType === 'claim' ? entityId : null,
        taskType: config.autoEnrich ? 'auto_enrich' : 'manual_enrich',
        status: 'pending',
        requestedDataTypes: config.dataTypes,
        completedDataTypes: [],
        failedDataTypes: [],
        enrichmentSummary: {},
        triggeredBy: 'system',
        triggeredAt: new Date()
      }
    });
  }

  private async getDefaultConfig(trigger: string): Promise<EnrichmentConfig> {
    const config = await this.prisma.dataEnrichmentConfig.findFirst({
      where: { triggerEvent: trigger },
      orderBy: { priorityOrder: 'asc' }
    });

    if (config) {
      return {
        dataTypes: config.enrichmentType as string[],
        autoEnrich: config.autoEnrich,
        priorityOrder: config.priorityOrder,
        fallbackBehavior: config.fallbackBehavior as any || 'skip'
      };
    }

    // Default configuration
    return {
      dataTypes: ['dmv', 'clue', 'background', 'credit'],
      autoEnrich: true,
      priorityOrder: 1,
      fallbackBehavior: 'skip'
    };
  }

  private async checkCache(entityId: string, dataTypes: string[]): Promise<{ isComplete: boolean; data: any }> {
    const cacheEntries = await this.prisma.enrichmentDataCache.findMany({
      where: {
        dataType: { in: dataTypes.map(dt => `${dt}:${entityId}`) },
        cacheValidUntil: { gte: new Date() }
      }
    });

    const cachedData = {};
    cacheEntries.forEach(entry => {
      const dataType = entry.dataType.split(':')[0];
      cachedData[dataType] = entry.cachedData;
    });

    return {
      isComplete: cacheEntries.length >= dataTypes.length,
      data: cachedData
    };
  }

  private async executeEnrichmentSteps(
    entityId: string,
    config: EnrichmentConfig,
    cachedData: any
  ): Promise<{ partial: boolean; errors: string[]; data: any }> {
    const results: any = { ...cachedData.data };
    const errors: string[] = [];
    const completedTypes: string[] = [];
    const failedTypes: string[] = [];

    for (const dataType of config.dataTypes) {
      if (results[dataType]) {
        completedTypes.push(dataType);
        continue; // Already cached
      }

      try {
        switch (dataType) {
          case 'dmv':
            results.dmv = await this.enrichDMV(entityId);
            break;
          case 'clue':
            results.clue = await this.enrichCLUE(entityId);
            break;
          case 'background':
            results.background = await this.enrichBackground(entityId);
            break;
          case 'credit':
            results.credit = await this.enrichCredit(entityId);
            break;
        }
        completedTypes.push(dataType);
      } catch (error) {
        logger.warn(`Enrichment step failed for ${dataType}`, { entityId, error });
        errors.push(`${dataType}: ${error instanceof Error ? error.message : error}`);
        failedTypes.push(dataType);
        
        if (config.fallbackBehavior === 'skip') {
          continue; // Skip this data type
        } else if (config.fallbackBehavior === 'manual_review') {
          throw new Error(`Enrichment failed for ${dataType}, requires manual review`);
        }
      }
    }

    // Update task with progress
    await this.updateTaskProgress(entityId, completedTypes, failedTypes);

    return {
      partial: completedTypes.length < config.dataTypes.length,
      errors,
      data: results
    };
  }

  private async enrichDMV(entityId: string): Promise<any> {
    // Simulate DMV enrichment with mock data
    const driverData = {
      licenseStatus: 'valid',
      violationCount: Math.floor(Math.random() * 4),
      duiCount: Math.random() < 0.05 ? 1 : 0, // 5% DUI rate
      trafficPoints: Math.floor(Math.random() * 8)
    };

    // Calculate driving risk
    const riskAssessment = await this.calculateDrivingRisk(driverData);
    
    return {
      driver: driverData,
      riskAssessment
    };
  }

  private async enrichCLUE(entityId: string): Promise<any> {
    // Simulate CLUE enrichment with mock claims data
    const claimCount = Math.floor(Math.random() * 4); // 0-3 claims
    const hasClaims = claimCount > 0;
    
    const claimsData = {
      totalClaims5yr: claimCount,
      totalClaims10yr: claimCount + Math.floor(Math.random() * 2),
      recentClaimAmount: hasClaims ? Math.random() * 20000 + 1000 : 0,
      worstClaimType: hasClaims ? ['water', 'fire', 'theft'][Math.floor(Math.random() * 3)] : null
    };

    // Calculate CLUE insurance score
    const insuranceScore = await this.calculateInsuranceScore(claimsData);
    
    return {
      claims: claimsData,
      insuranceScore
    };
  }

  private async enrichBackground(entityId: string): Promise<any> {
    // Simulate background check enrichment
    const hasCriminalRecord = Math.random() < 0.12; // 12% rate
    const hasFraud = Math.random() < 0.04; // 4% fraud rate
    
    return {
      criminalRecord: hasCriminalRecord,
      felonyCount: hasCriminalRecord ? Math.floor(Math.random() * 2) + 1 : 0,
      violentCrime: hasCriminalRecord && Math.random() < 0.25,
      fraudHistory: hasFraud,
      ssnVerified: Math.random() > 0.08,
      addressChanges: Math.floor(Math.random() * 4)
    };
  }

  private async enrichCredit(entityId: string): Promise<any> {
    // Simulate credit enrichment
    const creditScore = this.generateCreditScore();
    
    return {
      creditScore,
      creditScoreRange: this.getCreditRange(creditScore),
      currentDelinquencies: Math.floor(Math.random() * 3),
      pastDelinquencies: Math.floor(Math.random() * 5),
      bankruptcyHistory: Math.random() < 0.07, // 7% bankruptcy rate
      inquiries12mo: Math.floor(Math.random() * 6)
    };
  }

  private async validateEnrichmentData(data: any): Promise<any> {
    // Cross-validate data from different sources
    const validationErrors: string[] = [];

    // Example: Check for identity consistency
    if (data.dmv && data.clue) {
      // Consistency checks between DMV and CLUE
      if (data.dmv.driver.violationCount > 5 && data.clue.claims.totalClaims5yr === 0) {
        validationErrors.push('High violations but no claims may indicate data gap');
      }
    }

    // Data quality checks
    const qualityScore = await this.calculateDataQuality(data);
    
    return {
      ...data,
      validationErrors,
      qualityScore
    };
  }

  private async calculateDataQuality(data: any): Promise<number> {
    let totalScore = 0;
    let weight = 0;

    // Completeness check (25% weight)
    const completeness = this.calculateCompleteness(data);
    totalScore += completeness * 25;
    weight += 25;

    // Accuracy check (25% weight) - cross-source validation
    const accuracy = this.calculateAccuracy(data);
    totalScore += accuracy * 25;
    weight += 25;

    // Freshness check (25% weight)
    const freshness = this.calculateFreshness(data);
    totalScore += freshness * 25;
    weight += 25;

    // Consistency check (25% weight)
    const consistency = this.calculateConsistency(data);
    totalScore += consistency * 25;
    weight += 25;

    return weight > 0 ? totalScore / weight : 0;
  }

  private calculateCompleteness(data: any): number {
    let completeFields = 0;
    let totalFields = 0;

    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== null && value !== undefined) {
        completeFields++;
      }
      totalFields++;
    });

    return totalFields > 0 ? completeFields / totalFields : 0;
  }

  private calculateAccuracy(data: any): number {
    // Cross-validation between sources
    let accuracyScore = 0.9; // Base accuracy

    // Example: Check if risk indicators align
    if (data.dmv && data.clue) {
      const dmvRisk = data.dmv.riskAssessment?.risk_level;
      const clueRisk = data.clue.insuranceScore?.risk_level;
      
      if (dmvRisk === 'high' && clueRisk === 'excellent') {
        accuracyScore -= 0.3; // Significant mismatch
      }
    }

    return Math.max(0, Math.min(1, accuracyScore));
  }

  private calculateFreshness(data: any): number {
    // Check recency of data (0-1, newer is better)
    return 0.95; // Simplified - assume mostly fresh
  }

  private calculateConsistency(data: any): number {
    // Check for logical consistency
    let consistencyScore = 1.0;

    // Example checks
    if (data.credit?.creditScore && data.credit.creditScore < 500) {
      // Low credit score should correlate with other risk factors
      if (data.dmv?.driver?.violationCount === 0 && data.clue?.claims.totalClaims5yr === 0) {
        consistencyScore -= 0.2;
      }
    }

    return Math.max(0, Math.min(1, consistencyScore));
  }

  private async cacheEnrichmentResults(entityId: string, data: any, qualityScore: number): Promise<void> {
    const dataTypes = Object.keys(data);
    
    for (const dataType of dataTypes) {
      if (data[dataType]) {
        await this.prisma.enrichmentDataCache.create({
          data: {
            insuredId: entityId,
            dataType: `${dataType}:${entityId}`,
            cachedData: data[dataType],
            cacheAgeHours: 0,
            cacheValidUntil: this.getCacheExpiry(dataType),
            confidenceScore: qualityScore
          }
        });
      }
    }
  }

  private getCacheExpiry(dataType: string): Date {
    const days = {
      dmv: 7,     // 7 days for DMV data
      clue: 30,   // 30 days for claims
      background: 7,  // 7 days for background
      credit: 30  // 30 days for credit
    };

    const hours = days[dataType] || 7;
    return new Date(Date.now() + hours * 24 * 60 * 60 * 1000);
  }

  private async triggerUnderwritingEvaluation(policyId: string, data: any): Promise<void> {
    // Trigger underwriting rule engine (would be implemented separately)
    logger.info('Triggering underwriting evaluation', { policyId });
    
    // This would integrate with UnderwritingRuleEngine
    // For now, just log that it would be triggered
  }

  private async triggerFraudAnalysis(claimId: string, data: any): Promise<void> {
    // Trigger fraud detection based on enrichment data
    logger.info('Triggering fraud analysis', { claimId });
    
    // Check for fraud indicators
    const fraudIndicators = [];
    
    if (data.background?.fraudHistory) fraudIndicators.push('prior_fraud_history');
    if (data.background?.criminalRecord) fraudIndicators.push('criminal_history');
    if (data.credit?.creditScore && data.credit.creditScore < 500) {
      fraudIndicators.push('poor_credit');
    }
    
    if (fraudIndicators.length > 1) {
      logger.warn('Multiple fraud indicators detected', { 
        claimId, 
        indicators: fraudIndicators 
      });
      // This would trigger a fraud alert
    }
  }

  private async updateTaskProgress(
    taskId: string,
    completedTypes: string[],
    failedTypes: string[]
  ): Promise<void> {
    await this.prisma.enrichmentTask.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        completedDataTypes: completedTypes,
        failedDataTypes: failedTypes
      }
    });
  }

  private async completeTask(taskId: string, data: any, qualityScore: number): Promise<void> {
    await this.prisma.enrichmentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        enrichmentSummary: {
          dataTypesEnriched: Object.keys(data),
          qualityScore,
          timestamp: new Date()
        },
        dataQualityScore: qualityScore,
        completedAt: new Date()
      }
    });
  }

  private async failTask(taskId: string, error: string): Promise<void> {
    await this.prisma.enrichmentTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorDetails: error
      }
    });
  }

  private async calculateCacheHitRate(): Promise<number> {
    // This would calculate the actual cache hit rate based on recent activity
    return 0.75; // Placeholder - 75% hit rate
  }

  private async calculateDrivingRisk(driverData: any): Promise<any> {
    let riskScore = 50;
    const violations = driverData.violationCount;
    const duis = driverData.duiCount;
    
    if (violations >= 4) riskScore += 30;
    else if (violations >= 2) riskScore += 15;
    
    if (duis > 0) riskScore += 40;
    
    riskScore = Math.min(100, riskScore);
    
    let level = 'excellent';
    if (riskScore > 80) level = 'high';
    else if (riskScore > 60) level = 'poor';
    else if (riskScore > 40) level = 'fair';
    else if (riskScore > 20) level = 'good';
    
    return {
      risk_score: riskScore,
      risk_level: level,
      violation_count: violations,
      dui_count: duis
    };
  }

  private async calculateInsuranceScore(claimsData: any): Promise<any> {
    const claims = claimsData.totalClaims5yr || 0;
    let score = 70;
    let adjustment = 0;
    
    if (claims === 0) {
      score += 20;
      adjustment -= 15;
    } else if (claims >= 3) {
      score -= 35;
      adjustment += 50;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let level = 'excellent';
    if (score < 50) level = 'poor';
    else if (score < 65) level = 'fair';
    else if (score < 80) level = 'good';
    
    return {
      insurance_score: score,
      risk_level: level,
      quote_adjustment: adjustment
    };
  }

  private generateCreditScore(): number {
    const rand = Math.random();
    if (rand < 0.05) return Math.floor(Math.random() * 100) + 300;
    if (rand < 0.15) return Math.floor(Math.random() * 100) + 400;
    if (rand < 0.30) return Math.floor(Math.random() * 100) + 500;
    if (rand < 0.70) return Math.floor(Math.random() * 150) + 600;
    return Math.floor(Math.random() * 101) + 750;
  }

  private getCreditRange(score: number): string {
    if (score >= 750) return 'excellent';
    if (score >= 650) return 'good';
    if (score >= 550) return 'fair';
    if (score >= 450) return 'poor';
    return 'very_poor';
  }
}