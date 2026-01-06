import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance/core';

interface ComprehensiveRiskProfile {
  identity_risk: {
    ssn_verified: boolean;
    fraud_history: boolean;
    address_stability: 'stable' | 'moderate' | 'unstable';
  };
  
  financial_risk: {
    credit_score: number;
    delinquency_history: boolean;
    bankruptcy_history: boolean;
    payment_reliability: 'excellent' | 'good' | 'fair' | 'poor';
  };
  
  behavioral_risk: {
    criminal_history: boolean;
    insurance_fraud_history: boolean;
    loss_history: boolean;
  };
  
  overall_risk_score: number; // 0-1000
  overall_risk_level: 'minimal' | 'low' | 'moderate' | 'elevated' | 'high';
  underwriting_action: 'approve' | 'approve_with_conditions' | 'decline' | 'manual_review';
}

interface BackgroundCheckQuery {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLastFour: string;
  queryReason: string;
}

interface CreditQuery {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssn: string;
  queryReason: string;
}

export class LexisNexisService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async queryBackgroundCheck(data: BackgroundCheckQuery, requestedById: string): Promise<any> {
    try {
      const cacheKey = `lexisnexis:background:${data.ssnLastFour}:${data.dateOfBirth}`;
      const cached = await this.getCachedData(cacheKey);
      
      if (cached) {
        logger.info('Returning cached background check data', { cacheKey });
        return cached;
      }

      const provider = await this.getActiveProvider('background');
      if (!provider) {
        throw new Error('No active LexisNexis provider found for background checks');
      }

      logger.info('Querying LexisNexis for background check', { provider: provider.providerName });
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate latency

      // Simulate background check results based on random factors
      const hasCriminalRecord = Math.random() < 0.15; // 15% have records
      const isViolent = hasCriminalRecord && Math.random() < 0.3; // 30% of criminals have violent crimes
      const fraudHistory = Math.random() < 0.05; // 5% fraud history
      const addressChanges = Math.floor(Math.random() * 6); // 0-5 address changes
      
      const record = await this.prisma.backgroundCheckRecord.create({
        data: {
          insuredId: `INS_${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          ssnVerified: Math.random() > 0.1, // 90% verification success
          ssnMatchStatus: 'match',
          identityConfidenceScore: 0.95,
          criminalRecord: hasCriminalRecord,
          felonyCount: hasCriminalRecord ? Math.floor(Math.random() * 3) + 1 : 0,
          misdemeanorCount: hasCriminalRecord ? Math.floor(Math.random() * 5) : 0,
          violentCrime: isViolent,
          fraudAlertActive: fraudHistory,
          fraudCount: fraudHistory ? Math.floor(Math.random() * 2) + 1 : 0,
          addressChanges2yr: addressChanges,
          dataSource: provider.providerName,
          lastVerifiedDate: new Date(),
          confidenceScore: 0.92,
          queriedById: requestedById,
          queryReason: data.queryReason,
          queriedAt: new Date()
        }
      });

      await this.cacheData(cacheKey, record, 7 * 24); // Cache for 7 days

      await this.logDataAccess({
        insuredId: record.id,
        dataType: 'background_check',
        provider: provider.providerName,
        accessPurpose: data.queryReason,
        accessedById: requestedById,
        consentVerified: true
      });

      return record;
    } catch (error) {
      logger.error('Background check query failed', { error });
      throw error;
    }
  }

  async queryCreditReport(data: CreditQuery, requestedById: string): Promise<any> {
    try {
      const cacheKey = `lexisnexis:credit:${data.ssn}:${data.dateOfBirth}`;
      const cached = await this.getCachedData(cacheKey);
      
      if (cached) {
        logger.info('Returning cached credit report data', { cacheKey });
        return cached;
      }

      const provider = await this.getActiveProvider('credit');
      if (!provider) {
        throw new Error('No active LexisNexis provider found for credit reports');
      }

      logger.info('Querying LexisNexis for credit report', { provider: provider.providerName });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency

      // Simulate credit score distribution
      const creditScore = this.generateRealisticCreditScore();
      const creditScoreRange = this.getCreditScoreRange(creditScore);
      
      const hasBankruptcy = Math.random() < 0.08; // 8% bankruptcy rate
      const hasTaxLien = Math.random() < 0.03; // 3% tax lien rate
      const hasJudgment = Math.random() < 0.05; // 5% judgment rate
      
      const record = await this.prisma.creditRecord.create({
        data: {
          insuredId: `INS_${Date.now()}`,
          creditScore: creditScore,
          creditScoreRange: creditScoreRange,
          creditBureau: ['Equifax', 'Experian', 'TransUnion'][Math.floor(Math.random() * 3)],
          creditInquiries6mo: Math.floor(Math.random() * 4), // 0-3 inquiries
          creditInquiries12mo: Math.floor(Math.random() * 8), // 0-7 inquiries
          accountsOpen: Math.floor(Math.random() * 15) + 5, // 5-20 accounts
          accountsClosed: Math.floor(Math.random() * 10), // 0-9 closed
          currentDelinquencies: Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0,
          pastDelinquencies: Math.random() < 0.3 ? Math.floor(Math.random() * 5) : 0,
          bankruptcyHistory: hasBankruptcy,
          taxLien: hasTaxLien,
          judgmentRecord: hasJudgment,
          lastVerifiedDate: new Date(),
          confidenceScore: 0.96,
          queriedById: requestedById,
          queryReason: data.queryReason,
          queriedAt: new Date()
        }
      });

      await this.cacheData(cacheKey, record, 30 * 24); // Cache for 30 days (credit reports are stable)

      await this.logDataAccess({
        insuredId: record.id,
        dataType: 'credit_report',
        provider: provider.providerName,
        accessPurpose: data.queryReason,
        accessedById: requestedById,
        consentVerified: true
      });

      return record;
    } catch (error) {
      logger.error('Credit report query failed', { error });
      throw error;
    }
  }

  async getBackgroundDetails(insuredId: string): Promise<any> {
    return await this.prisma.backgroundCheckRecord.findFirst({
      where: { insuredId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getCreditInformation(insuredId: string): Promise<any> {
    return await this.prisma.creditRecord.findFirst({
      where: { insuredId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async calculateRiskProfile(insuredId: string): Promise<ComprehensiveRiskProfile> {
    const [background, credit] = await Promise.all([
      this.getBackgroundDetails(insuredId),
      this.getCreditInformation(insuredId)
    ]);

    if (!background || !credit) {
      throw new Error(`Incomplete data for risk profile calculation: insured ${insuredId}`);
    }

    const profile = this.calculateComprehensiveRisk(background, credit);
    
    // Store risk assessment record
    await this.prisma.riskAssessmentRecord.upsert({
      where: {
        insuredId_assessmentType: {
          insuredId,
          assessmentType: 'overall'
        }
      },
      update: {
        riskScore: profile.overall_risk_score,
        riskLevel: profile.overall_risk_level,
        riskIndicators: this.extractRiskIndicators(profile),
        underwritingRecommendation: profile.underwriting_action,
        queriedAt: new Date()
      },
      create: {
        insuredId,
        assessmentType: 'overall',
        riskScore: profile.overall_risk_score,
        riskLevel: profile.overall_risk_level,
        riskIndicators: this.extractRiskIndicators(profile),
        underwritingRecommendation: profile.underwriting_action,
        queriedAt: new Date()
      }
    });

    return profile;
  }

  async getQueryLog(filters: { 
    startDate?: Date; 
    endDate?: Date; 
    dataType?: string;
  }): Promise<any[]> {
    return await this.prisma.dataAccessAuditLog.findMany({
      where: {
        provider: { contains: 'LexisNexis' },
        accessedAt: { 
          gte: filters.startDate,
          lte: filters.endDate
        },
        dataType: filters.dataType
      },
      orderBy: { accessedAt: 'desc' },
      take: 1000
    });
  }

  private async getActiveProvider(dataType: string): Promise<any> {
    return await this.prisma.lexisNexisProvider.findFirst({
      where: {
        status: 'active',
        availableDataTypes: { path: [], array_contains: dataType }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  private generateRealisticCreditScore(): number {
    // Generate realistic credit score distribution
    const rand = Math.random();
    if (rand < 0.05) return Math.floor(Math.random() * 100) + 300; // 5% very poor (300-399)
    if (rand < 0.15) return Math.floor(Math.random() * 100) + 400; // 10% poor (400-499)
    if (rand < 0.30) return Math.floor(Math.random() * 100) + 500; // 15% fair (500-599)
    if (rand < 0.70) return Math.floor(Math.random() * 150) + 600; // 40% good (600-749)
    return Math.floor(Math.random() * 101) + 750; // 30% excellent (750-850)
  }

  private getCreditScoreRange(score: number): string {
    if (score >= 750) return 'excellent';
    if (score >= 650) return 'good';
    if (score >= 550) return 'fair';
    if (score >= 450) return 'poor';
    return 'very_poor';
  }

  private calculateComprehensiveRisk(background: any, credit: any): ComprehensiveRiskProfile {
    let overallScore = 500; // Start at midpoint (0-1000 scale)
    
    // Identity Risk Calculation (0-300 points)
    let identityRiskPoints = 200; // Start neutral
    if (!background.ssnVerified) identityRiskPoints -= 50;
    if (background.fraudAlertActive) identityRiskPoints -= 100;
    if (background.addressChanges2yr > 3) identityRiskPoints -= 50;
    
    // Financial Risk Calculation (0-350 points)
    let financialRiskPoints = 175; // Start neutral
    if (credit.creditScore >= 750) financialRiskPoints += 175;
    else if (credit.creditScore >= 650) financialRiskPoints += 100;
    else if (credit.creditScore >= 550) financialRiskPoints += 25;
    else financialRiskPoints -= 50;
    
    if (credit.currentDelinquencies > 0) financialRiskPoints -= 75;
    if (credit.pastDelinquencies > 2) financialRiskPoints -= 50;
    if (credit.bankruptcyHistory) financialRiskPoints -= 100;
    if (credit.judgmentRecord) financialRiskPoints -= 75;
    if (credit.taxLien) financialRiskPoints -= 75;
    
    // Behavioral Risk Calculation (0-350 points)
    let behavioralRiskPoints = 175; // Start neutral
    if (background.criminalRecord) behavioralRiskPoints -= 150;
    if (background.violentCrime) behavioralRiskPoints -= 200;
    if (background.fraudCount > 0) behavioralRiskPoints -= 100;
    
    // Calculate final scores
    const identityScore = Math.max(0, Math.min(300, identityRiskPoints));
    const financialScore = Math.max(0, Math.min(350, financialRiskPoints));
    const behavioralScore = Math.max(0, Math.min(350, behavioralRiskPoints));
    
    overallScore = identityScore + financialScore + behavioralScore;
    
    const riskLevel = this.getOverallRiskLevel(overallScore);
    const underwritingAction = this.getUnderwritingAction(riskLevel, background, credit);
    
    return {
      identity_risk: {
        ssn_verified: background.ssnVerified,
        fraud_history: background.fraudAlertActive,
        address_stability: this.getAddressStability(background.addressChanges2yr)
      },
      financial_risk: {
        credit_score: credit.creditScore,
        delinquency_history: credit.currentDelinquencies > 0 || credit.pastDelinquencies > 0,
        bankruptcy_history: credit.bankruptcyHistory,
        payment_reliability: this.getPaymentReliability(credit.creditScore, credit.currentDelinquencies)
      },
      behavioral_risk: {
        criminal_history: background.criminalRecord,
        insurance_fraud_history: background.fraudCount > 0,
        loss_history: background.fraudCount > 0 || background.criminalRecord
      },
      overall_risk_score: Math.round(overallScore),
      overall_risk_level: riskLevel,
      underwriting_action: underwritingAction
    };
  }

  private getAddressStability(changes: number): 'stable' | 'moderate' | 'unstable' {
    if (changes <= 1) return 'stable';
    if (changes <= 3) return 'moderate';
    return 'unstable';
  }

  private getPaymentReliability(score: number, delinquencies: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 750 && delinquencies === 0) return 'excellent';
    if (score >= 650 && delinquencies <= 1) return 'good';
    if (score >= 550 && delinquencies <= 2) return 'fair';
    return 'poor';
  }

  private getOverallRiskLevel(score: number): 'minimal' | 'low' | 'moderate' | 'elevated' | 'high' {
    if (score >= 800) return 'minimal';
    if (score >= 650) return 'low';
    if (score >= 450) return 'moderate';
    if (score >= 250) return 'elevated';
    return 'high';
  }

  private getUnderwritingAction(
    riskLevel: string, 
    background: any, 
    credit: any
  ): 'approve' | 'approve_with_conditions' | 'decline' | 'manual_review' {
    if (riskLevel === 'minimal' || riskLevel === 'low') {
      return 'approve';
    }
    
    if (riskLevel === 'moderate') {
      if (background.violentCrime || credit.bankruptcyHistory) {
        return 'manual_review';
      }
      return 'approve_with_conditions';
    }
    
    if (riskLevel === 'elevated') {
      if (background.violentCrime || background.fraudCount > 1) {
        return 'decline';
      }
      return 'manual_review';
    }
    
    // high risk
    if (background.violentCrime || credit.bankruptcyHistory || background.fraudCount > 0) {
      return 'decline';
    }
    return 'manual_review';
  }

  private extractRiskIndicators(profile: ComprehensiveRiskProfile): string[] {
    const indicators: string[] = [];
    
    if (profile.identity_risk.fraud_history) indicators.push('fraud_history');
    if (profile.identity_risk.address_stability === 'unstable') indicators.push('address_instability');
    if (!profile.identity_risk.ssn_verified) indicators.push('ssn_verification_failed');
    
    if (profile.financial_risk.delinquency_history) indicators.push('payment_delinquencies');
    if (profile.financial_risk.bankruptcy_history) indicators.push('bankruptcy_history');
    if (profile.financial_risk.credit_score < 600) indicators.push('poor_credit_score');
    
    if (profile.behavioral_risk.criminal_history) indicators.push('criminal_history');
    if (profile.behavioral_risk.insurance_fraud_history) indicators.push('insurance_fraud_history');
    
    return indicators;
  }

  private async getCachedData(key: string): Promise<any> {
    const cached = await this.prisma.enrichmentDataCache.findFirst({
      where: {
        dataType: key,
        cacheValidUntil: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return cached?.cachedData;
  }

  private async cacheData(key: string, data: any, ttlHours: number): Promise<void> {
    await this.prisma.enrichmentDataCache.create({
      data: {
        insuredId: data.id || 'unknown',
        dataType: key,
        cachedData: data,
        cacheAgeHours: 0,
        cacheValidUntil: new Date(Date.now() + ttlHours * 3600 * 1000),
        confidenceScore: data.confidenceScore || 0.94
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