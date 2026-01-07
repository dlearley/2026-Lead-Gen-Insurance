import { PrismaClient } from '@prisma/client';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { logger } from '@insurance/core';

interface DrivingRiskAssessment {
  violation_count: number;
  years_since_last_violation: number;
  dui_incidents: number;
  suspension_history: boolean;
  traffic_points: number;
  license_status: 'valid' | 'suspended' | 'revoked' | 'expired';
  medical_restrictions: boolean;
  
  risk_score: number; // 0-100
  risk_level: 'excellent' | 'good' | 'fair' | 'poor' | 'high';
  premium_adjustment: number; // -20% to +100%
}

interface DMVQueryRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  licenseNumber?: string;
  state: string;
  queryReason: string;
}

interface VehicleQueryRequest {
  vin: string;
  state: string;
  queryReason: string;
}

export class DMVService {
  private prisma: PrismaClient;
  private cache: Map<string, any>;

  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map();
  }

  async queryDriverLicense(data: DMVQueryRequest, requestedById: string): Promise<any> {
    const provider = await this.getActiveProvider(data.state);
    if (!provider) {
      throw new Error(`No active DMV provider found for state: ${data.state}`);
    }

    const cacheKey = `dmv:driver:${data.licenseNumber || `${data.firstName}:${data.lastName}:${data.dateOfBirth}`}:${data.state}`;
    const cached = await this.getCachedData(cacheKey);
    
    if (cached) {
      logger.info('Returning cached DMV driver license data', { cacheKey, state: data.state });
      return cached;
    }

    try {
      const response = await this.fetchFromDMV(provider, {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        licenseNumber: data.licenseNumber,
        state: data.state
      });

      const record = await this.storeDriverLicenseRecord(response, data, requestedById, provider);
      await this.cacheData(cacheKey, record, 24); // Cache for 24 hours

      await this.logDataAccess({
        insuredId: record.id,
        dataType: 'dmv_license',
        provider: provider.providerName,
        accessPurpose: data.queryReason,
        accessedById,
        consentVerified: true
      });

      return record;
    } catch (error) {
      logger.error('DMV query failed', { error, state: data.state });
      throw error;
    }
  }

  async queryVehicleRegistration(data: VehicleQueryRequest, requestedById: string): Promise<any> {
    const provider = await this.getActiveProvider(data.state);
    if (!provider) {
      throw new Error(`No active DMV provider found for state: ${data.state}`);
    }

    const cacheKey = `dmv:vehicle:${data.vin}:${data.state}`;
    const cached = await this.getCachedData(cacheKey);
    
    if (cached) {
      logger.info('Returning cached DMV vehicle registration data', { cacheKey, state: data.state });
      return cached;
    }

    try {
      const response = await this.fetchFromDMV(provider, {
        vin: data.vin,
        state: data.state
      });

      const record = await this.storeVehicleRegistrationRecord(response, data, requestedById, provider);
      await this.cacheData(cacheKey, record, 24);

      await this.logDataAccess({
        insuredId: record.id,
        dataType: 'vehicle_registration',
        provider: provider.providerName,
        accessPurpose: data.queryReason,
        accessedById,
        consentVerified: true
      });

      return record;
    } catch (error) {
      logger.error('Vehicle registration query failed', { error, state: data.state });
      throw error;
    }
  }

  async getViolationHistory(driverLicenseId: string): Promise<any[]> {
    return await this.prisma.violationHistory.findMany({
      where: { driverLicenseId },
      orderBy: { violationDate: 'desc' }
    });
  }

  async calculateDrivingRisk(insuredId: string): Promise<DrivingRiskAssessment> {
    const driverRecord = await this.prisma.driverLicenseRecord.findFirst({
      where: { insuredId },
      include: { violations: true }
    });

    if (!driverRecord) {
      throw new Error(`No driver license record found for insured: ${insuredId}`);
    }

    const assessment = this.calculateRiskScore(driverRecord);
    
    await this.prisma.riskAssessmentRecord.create({
      data: {
        insuredId,
        assessmentType: 'auto',
        riskScore: assessment.risk_score,
        riskLevel: assessment.risk_level,
        financialRiskScore: Math.max(0, 100 - (assessment.traffic_points * 5)),
        behavioralRiskScore: assessment.risk_score,
        environmentalRiskScore: assessment.license_status === 'valid' ? 80 : 20,
        rateAdjustmentPercentage: assessment.premium_adjustment,
        underwritingRecommendation: this.getUnderwritingRecommendation(assessment.risk_level),
        queriedAt: new Date()
      }
    });

    return assessment;
  }

  async getQueryLog(filters: { startDate?: Date; endDate?: Date; state?: string }): Promise<any[]> {
    return await this.prisma.dataAccessAuditLog.findMany({
      where: {
        dataType: { contains: 'dmv' },
        accessedAt: { 
          gte: filters.startDate,
          lte: filters.endDate
        },
        accessPurpose: filters.state ? { contains: filters.state } : undefined
      },
      orderBy: { accessedAt: 'desc' }
    });
  }

  private async getActiveProvider(state: string): Promise<any> {
    return await this.prisma.dMVProvider.findFirst({
      where: {
        status: 'active',
        supportedStates: { path: [], array_contains: state }
      },
      orderBy: { latencySlaSeconds: 'asc' }
    });
  }

  private async fetchFromDMV(provider: any, data: any): Promise<any> {
    const headers = await this.getAuthHeaders(provider);
    
    // Simulate DMV API call
    logger.info('Querying DMV provider', { provider: provider.providerName });
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // Simulate latency
    
    return {
      success: true,
      data: {
        licenseNumber: data.licenseNumber || 'D123456789',
        firstName: data.firstName || 'John',
        lastName: data.lastName || 'Doe',
        dateOfBirth: data.dateOfBirth || '1980-01-01',
        licenseState: data.state,
        licenseStatus: Math.random() > 0.3 ? 'valid' : Math.random() > 0.5 ? 'suspended' : 'expired',
        violationCount: Math.floor(Math.random() * 5),
        suspensionCount: Math.random() > 0.8 ? 1 : 0,
        duiCount: Math.random() > 0.9 ? 1 : 0,
        trafficPoints: Math.floor(Math.random() * 12),
        restrictions: ['corrective_lenses'],
        lastVerifiedDate: new Date()
      }
    };
  }

  private async getAuthHeaders(provider: any): Promise<any> {
    switch (provider.authType) {
      case 'api_key':
        return { 'X-API-Key': provider.credentials.apiKey };
      case 'oauth2':
        // Implement OAuth2 token retrieval
        return { 'Authorization': `Bearer ${provider.credentials.accessToken}` };
      default:
        return {};
    }
  }

  private async storeDriverLicenseRecord(
    response: any, 
    queryData: DMVQueryRequest, 
    queriedById: string, 
    provider: any
  ): Promise<any> {
    return await this.prisma.driverLicenseRecord.create({
      data: {
        insuredId: `INS_${Date.now()}`,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        dateOfBirth: new Date(response.data.dateOfBirth),
        licenseNumber: response.data.licenseNumber,
        licenseState: response.data.licenseState,
        licenseStatus: response.data.licenseStatus,
        violationCount: response.data.violationCount,
        suspensionCount: response.data.suspensionCount,
        duiCount: response.data.duiCount,
        trafficPoints: response.data.trafficPoints,
        restrictions: response.data.restrictions,
        dataSource: provider.providerName,
        lastVerifiedDate: response.data.lastVerifiedDate,
        queriedById,
        queryReason: queryData.queryReason,
        queriedAt: new Date(),
        dataAgeDays: 0
      }
    });
  }

  private async storeVehicleRegistrationRecord(
    response: any, 
    queryData: VehicleQueryRequest, 
    queriedById: string, 
    provider: any
  ): Promise<any> {
    return await this.prisma.vehicleRegistrationRecord.create({
      data: {
        policyId: `POL_${Date.now()}`,
        vehicleVin: queryData.vin,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleYear: 2020,
        registrationNumber: `REG_${Date.now()}`,
        registrationState: queryData.state,
        registrationStatus: Math.random() > 0.2 ? 'active' : 'lapsed',
        ownerName: 'Vehicle Owner',
        odometerReading: Math.floor(Math.random() * 100000) + 10000,
        dataSource: provider.providerName,
        queriedById,
        queriedAt: new Date(),
        confidenceScore: 0.95
      }
    });
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

  private async cacheData(key: string, data: any, ttlHours: number = 24): Promise<void> {
    await this.prisma.enrichmentDataCache.create({
      data: {
        insuredId: data.id || 'unknown',
        dataType: key,
        cachedData: data,
        cacheAgeHours: 0,
        cacheValidUntil: new Date(Date.now() + ttlHours * 3600 * 1000),
        confidenceScore: data.confidenceScore || 0.9
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

  private calculateRiskScore(record: any): DrivingRiskAssessment {
    const now = new Date();
    const lastViolation = record.violations?.[0]?.violationDate;
    const yearsSinceLastViolation = lastViolation 
      ? (now.getTime() - new Date(lastViolation).getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 10;

    let riskScore = 50; // Start with neutral
    let premiumAdjustment = 0;

    // Violation points (max 40 points)
    riskScore += Math.min(record.violationCount * 10, 40);
    if (record.violationCount > 2) premiumAdjustment += 25;

    // DUI impact (max 30 points)
    if (record.duiCount > 0) {
      riskScore += 30;
      premiumAdjustment += 75;
    }

    // License status impact
    if (record.licenseStatus === 'suspended' || record.licenseStatus === 'revoked') {
      riskScore += 40;
      premiumAdjustment += 100;
    }

    // Traffic points (max 20 points)
    riskScore += Math.min(record.trafficPoints * 2, 20);
    premiumAdjustment += Math.min(record.trafficPoints * 3, 15);

    // Good driving history bonus
    if (record.violationCount === 0 && yearsSinceLastViolation >= 3) {
      riskScore -= 15;
      premiumAdjustment = Math.max(premiumAdjustment - 15, -15);
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    const riskLevel = this.getRiskLevel(riskScore);

    return {
      violation_count: record.violationCount,
      years_since_last_violation: Math.floor(yearsSinceLastViolation),
      dui_incidents: record.duiCount,
      suspension_history: record.suspensionCount > 0,
      traffic_points: record.trafficPoints,
      license_status: record.licenseStatus,
      medical_restrictions: (record.restrictions || []).length > 0,
      risk_score: riskScore,
      risk_level: riskLevel,
      premium_adjustment: premiumAdjustment
    };
  }

  private getRiskLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'high' {
    if (score <= 20) return 'excellent';
    if (score <= 40) return 'good';
    if (score <= 60) return 'fair';
    if (score <= 80) return 'poor';
    return 'high';
  }

  private getUnderwritingRecommendation(riskLevel: string): string {
    const recommendations = {
      excellent: 'Approve with standard rates',
      good: 'Approve with standard rates',
      fair: 'Approve with 10-20% premium increase',
      poor: 'Manual review required',
      high: 'Decline or require high-risk pool'
    };
    return recommendations[riskLevel as keyof typeof recommendations] || 'Manual review required';
  }
}