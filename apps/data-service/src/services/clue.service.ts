import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance/core';

interface CLUEInsuranceScore {
  claims_5_year: number;
  claims_10_year: number;
  average_claim_amount: number;
  claim_frequency_ratio: number; // claims per year insured
  years_claim_free: number;
  worst_claim_type: string;
  pattern_detected: 'normal' | 'frequent' | 'severe' | 'suspicious';
  
  insurance_score: number; // 0-100
  risk_level: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  quote_adjustment: number; // -15% to +75%
}

interface CLUEQueryRequest {
  insuredName: string;
  dateOfBirth: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  queryReason: string;
}

export class CLUEService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async queryCLUERecord(data: CLUEQueryRequest, requestedById: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `clue:${data.insuredName}:${data.dateOfBirth}:${data.propertyZip}`;
      const cached = await this.getCachedCLUEData(cacheKey);
      
      if (cached) {
        logger.info('Returning cached CLUE data', { cacheKey });
        return cached;
      }

      // Simulate CLUE API call
      logger.info('Querying CLUE database');
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency

      // Generate realistic CLUE data
      const claimCount5yr = Math.floor(Math.random() * 4); // 0-3
      const claimCount10yr = claimCount5yr + Math.floor(Math.random() * 3); // 0-3 additional
      
      const record = await this.prisma.cLUERecord.create({
        data: {
          insuredName: data.insuredName,
          dateOfBirth: new Date(data.dateOfBirth),
          propertyAddress: data.propertyAddress,
          propertyCity: data.propertyCity,
          propertyState: data.propertyState,
          propertyZip: data.propertyZip,
          totalClaims5yr: claimCount5yr,
          totalClaims10yr: claimCount10yr,
          dataSource: 'CLUE_DATABASE',
          lastUpdatedDate: new Date(),
          dataConfidenceScore: 0.95,
          queriedById: requestedById,
          queryReason: data.queryReason,
          queriedAt: new Date()
        }
      });

      // Generate claim details based on count
      if (claimCount5yr > 0) {
        const claimTypes = ['fire', 'theft', 'water', 'liability', 'injury', 'wind', 'hail'];
        
        for (let i = 0; i < claimCount5yr; i++) {
          const claimDate = new Date();
          claimDate.setMonth(claimDate.getMonth() - (Math.random() * 36)); // Random within 3 years
          
          await this.prisma.cLUEClaimDetail.create({
            data: {
              clueRecordId: record.id,
              claimSequence: i + 1,
              claimDate,
              claimType: claimTypes[Math.floor(Math.random() * claimTypes.length)],
              lossAmount: Math.random() * 25000 + 500, // $500 - $25,500
              lossDescription: 'Property damage claim',
              claimStatus: 'closed',
              claimYear: claimDate.getFullYear(),
              daysSinceClaim: Math.floor((new Date().getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          });
        }
      }

      const fullRecord = await this.prisma.cLUERecord.findUnique({
        where: { id: record.id },
        include: { claimDetails: true }
      });

      // Cache for 30 days (CLUE data doesn't change frequently)
      await this.cacheCLUEData(cacheKey, fullRecord, 30 * 24);

      await this.logDataAccess({
        insuredId: record.id,
        dataType: 'clue',
        provider: 'CLUE_DATABASE',
        accessPurpose: data.queryReason,
        accessedById: requestedById,
        consentVerified: true
      });

      return fullRecord;
    } catch (error) {
      logger.error('CLUE query failed', { error });
      throw error;
    }
  }

  async getClaimsHistory(insuredId: string): Promise<any> {
    const record = await this.prisma.cLUERecord.findFirst({
      where: { insuredId },
      include: {
        claimDetails: {
          orderBy: { claimDate: 'desc' }
        }
      }
    });

    return record;
  }

  async calculateInsuranceScore(insuredId: string): Promise<CLUEInsuranceScore> {
    const record = await this.prisma.cLUERecord.findFirst({
      where: { insuredId },
      include: {
        claimDetails: {
          orderBy: { claimDate: 'desc'
        }
      }
    });

    if (!record) {
      throw new Error(`No CLUE record found for insured: ${insuredId}`);
    }

    const assessment = this.calculateCLUEScore(record);
    
    // Update risk assessment record
    await this.prisma.riskAssessmentRecord.upsert({
      where: {
        insuredId_assessmentType: {
          insuredId,
          assessmentType: 'property' // CLUE is primarily for property
        }
      },
      update: {
        riskScore: assessment.insurance_score,
        riskLevel: assessment.risk_level,
        rateAdjustmentPercentage: assessment.quote_adjustment,
        underwritingRecommendation: this.getCLUEUnderwritingRecommendation(assessment.risk_level),
        queriedAt: new Date()
      },
      create: {
        insuredId,
        assessmentType: 'property',
        riskScore: assessment.insurance_score,
        riskLevel: assessment.risk_level,
        rateAdjustmentPercentage: assessment.quote_adjustment,
        underwritingRecommendation: this.getCLUEUnderwritingRecommendation(assessment.risk_level),
        queriedAt: new Date()
      }
    });

    return assessment;
  }

  async getQueryLog(filters: { 
    startDate?: Date; 
    endDate?: Date; 
    name?: string;
    zipCode?: string;
  }): Promise<any[]> {
    return await this.prisma.dataAccessAuditLog.findMany({
      where: {
        dataType: 'clue',
        accessedAt: { 
          gte: filters.startDate,
          lte: filters.endDate
        },
        accessPurpose: filters.name ? { contains: filters.name } : undefined
      },
      orderBy: { accessedAt: 'desc' },
      take: 1000
    });
  }

  private calculateCLUEScore(record: any): CLUEInsuranceScore {
    const claims = record.claimDetails || [];
    const claims5yr = record.totalClaims5yr;
    const claims10yr = record.totalClaims10yr;
    
    // Calculate financial exposure
    const avgClaimAmount = claims.length > 0 
      ? claims.reduce((sum, claim) => sum + Number(claim.lossAmount), 0) / claims.length
      : 0;
    
    const claimFrequencyRatio = claims5yr > 0 ? claims5yr / 5 : 0; // Claims per year
    
    // Find most recent claim for pattern analysis
    const recentClaim = claims.length > 0 ? claims[0] : null;
    const yearsClaimFree = recentClaim 
      ? Math.max(0, (Date.now() - new Date(recentClaim.claimDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 10; // Default to 10 years if no claims
    
    // Determine worst claim type
    const claimTypes = claims.map(c => c.claimType);
    const severityHierarchy = ['fire', 'liability', 'injury', 'water', 'theft', 'wind', 'hail'];
    const worstClaimType = severityHierarchy.find(type => claimTypes.includes(type)) || 'minor';
    
    let score = 70; // Start with neutral
    let quoteAdjustment = 0;
    let pattern: CLUEInsuranceScore['pattern_detected'] = 'normal';
    
    // Claim frequency impact
    if (claims5yr === 0) {
      score += 20;
      quoteAdjustment -= 15;
    } else if (claims5yr === 1) {
      score += 5;
      quoteAdjustment += 5;
    } else if (claims5yr === 2) {
      score -= 15;
      quoteAdjustment += 20;
      pattern = 'frequent';
    } else if (claims5yr >= 3) {
      score -= 35;
      quoteAdjustment += 50;
      pattern = 'frequent';
    }
    
    // Average claim amount impact
    if (avgClaimAmount > 10000) {
      score -= 15;
      quoteAdjustment += 15;
      pattern = 'severe';
    } else if (avgClaimAmount > 5000) {
      score -= 8;
      quoteAdjustment += 8;
    }
    
    // Worst claim type impact
    if (['fire', 'liability', 'injury'].includes(worstClaimType)) {
      score -= 20;
      quoteAdjustment += 25;
      pattern = 'severe';
    } else if (['water', 'theft'].includes(worstClaimType)) {
      score -= 10;
      quoteAdjustment += 10;
    }
    
    // Claim recency impact
    if (yearsClaimFree >= 5) {
      score += 10;
    } else if (yearsClaimFree < 2) {
      score -= 15;
      quoteAdjustment += 10;
    }
    
    // Apply bounds
    score = Math.max(0, Math.min(100, score));
    quoteAdjustment = Math.min(75, Math.max(-15, quoteAdjustment));
    
    const riskLevel = this.getCLUERiskLevel(score);
    
    return {
      claims_5_year: claims5yr,
      claims_10_year: claims10yr,
      average_claim_amount: Math.round(avgClaimAmount),
      claim_frequency_ratio: Number(claimFrequencyRatio.toFixed(2)),
      years_claim_free: Math.floor(yearsClaimFree),
      worst_claim_type: worstClaimType,
      pattern_detected: pattern,
      insurance_score: score,
      risk_level: riskLevel,
      quote_adjustment: quoteAdjustment
    };
  }

  private getCLUERiskLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor' {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 45) return 'fair';
    if (score >= 25) return 'poor';
    return 'very_poor';
  }

  private getCLUEUnderwritingRecommendation(riskLevel: string): string {
    const recommendations = {
      excellent: 'Approve preferred rates',
      good: 'Approve standard rates',
      fair: 'Approve with 10-25% increase',
      poor: 'Manual review required - high risk',
      very_poor: 'Consider decline or high-risk pool'
    };
    return recommendations[riskLevel as keyof typeof recommendations] || 'Manual review required';
  }

  private async getCachedCLUEData(key: string): Promise<any> {
    const cached = await this.prisma.enrichmentDataCache.findFirst({
      where: {
        dataType: key,
        cacheValidUntil: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return cached?.cachedData;
  }

  private async cacheCLUEData(key: string, data: any, ttlHours: number = 720): Promise<void> {
    await this.prisma.enrichmentDataCache.create({
      data: {
        insuredId: data.id || 'unknown',
        dataType: key,
        cachedData: data,
        cacheAgeHours: 0,
        cacheValidUntil: new Date(Date.now() + ttlHours * 3600 * 1000),
        confidenceScore: 0.95
      }
    });
  }

  private async logDataAccess(data: {
    insuredId: string;
    dataType: string;
    provider: string;
    accessPurpose: string;
    accessedById: string;
    consentVerified: boolean;
  }): Promise<void> {
    await this.prisma.dataAccessAuditLog.create({
      data: {
        insuredId: data.insuredId,
        dataType: data.dataType,
        provider: data.provider,
        accessPurpose: data.accessPurpose,
        accessedById: data.accessedById,
        consentVerified: data.consentVerified
      }
    });
  }
}