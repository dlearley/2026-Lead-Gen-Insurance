// ========================================
// Lead Enrichment Service
// Orchestrates the lead enrichment workflow
// ========================================

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  LeadEnrichmentProfile,
  EnrichmentDemographics,
  EnrichmentFirmographics,
  EnrichmentBehavioral,
  EnrichmentRisk,
  EnrichmentProperty,
  EnrichmentVehicle,
  DataConflict,
  EnrichmentResult,
  CreateEnrichmentProfileDto,
} from '@insurance-lead-gen/types';
import { DataProviderAdapterService } from './data-provider-adapter';

export class LeadEnrichmentService {
  private dataProviderAdapter: DataProviderAdapterService;

  constructor() {
    this.dataProviderAdapter = new DataProviderAdapterService();
  }

  /**
   * Enrich a lead with data from multiple providers
   */
  async enrichLead(
    leadId: string,
    options?: {
      forceRefresh?: boolean;
      includeProviders?: string[];
      excludeProviders?: string[];
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      // Fetch lead data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Check if existing enrichment is fresh enough
      if (!options?.forceRefresh) {
        const existingProfile = await prisma.leadEnrichmentProfile.findUnique({
          where: { leadId },
        });

        if (existingProfile && existingProfile.expiresAt > new Date()) {
          return {
            success: true,
            leadId,
            profileId: existingProfile.id,
            enrichmentDuration: 0,
            providersUsed: existingProfile.dataSources,
            confidenceScore: existingProfile.confidenceScore,
            dataPointsEnriched: existingProfile.enrichmentMetadata.totalDataPoints as number,
          };
        }
      }

      // Build enrichment query from lead data
      const query = this.buildEnrichmentQuery(lead);

      // Get active providers
      const providers = await this.getActiveProviders(options);

      if (providers.length === 0) {
        throw new Error('No active data providers configured');
      }

      // Enrich from providers
      const { results, combinedData, errors } = await this.dataProviderAdapter.enrichLead(
        query,
        providers.map((p) => p.id),
        {
          forceRefresh: options?.forceRefresh,
          timeout: options?.priority === 'high' ? 5000 : 10000,
        }
      );

      // Parse and structure enrichment data
      const enrichmentData = this.parseEnrichmentData(combinedData, results);

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(results, enrichmentData);

      // Resolve data conflicts
      const dataConflicts = this.resolveDataConflicts(enrichmentData, results);

      // Calculate TTL based on data freshness requirements
      const expiresAt = this.calculateExpiry(enrichmentData);

      // Save enrichment profile
      const profile = await this.saveEnrichmentProfile({
        leadId,
        ...enrichmentData,
        confidenceScore,
        dataSources: Array.from(results.keys()),
        dataConflicts,
        enrichmentMetadata: {
          totalDataPoints: this.countDataPoints(enrichmentData),
          enrichmentDuration: Date.now() - startTime,
          providersAttempted: providers.length,
          providersSuccessful: results.size,
          cachedDataUsed: Array.from(results.values()).filter((r) => r.cached).length,
          freshDataFetched: Array.from(results.values()).filter((r) => !r.cached).length,
        },
        expiresAt,
      });

      return {
        success: true,
        leadId,
        profileId: profile.id,
        enrichmentDuration: Date.now() - startTime,
        providersUsed: Array.from(results.keys()),
        confidenceScore,
        dataPointsEnriched: this.countDataPoints(enrichmentData),
        errors: errors.map((e) => e.error),
        warnings: dataConflicts.length > 0
          ? ['Data conflicts detected and resolved']
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        leadId,
        profileId: '',
        enrichmentDuration: Date.now() - startTime,
        providersUsed: [],
        confidenceScore: 0,
        dataPointsEnriched: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get enriched profile for a lead
   */
  async getEnrichedProfile(
    leadId: string,
    options?: { includeExpired?: boolean; minimalData?: boolean }
  ): Promise<LeadEnrichmentProfile | null> {
    const profile = await prisma.leadEnrichmentProfile.findUnique({
      where: { leadId },
    });

    if (!profile) {
      return null;
    }

    // Check if profile is expired
    if (!options?.includeExpired && profile.expiresAt < new Date()) {
      return null;
    }

    // Return minimal data for privacy if requested
    if (options?.minimalData) {
      return this.sanitizeProfile(profile);
    }

    return profile as LeadEnrichmentProfile;
  }

  /**
   * Build enrichment query from lead data
   */
  private buildEnrichmentQuery(lead: any): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (lead.email) query.email = lead.email;
    if (lead.phone) query.phone = lead.phone;
    if (lead.firstName && lead.lastName) {
      query.firstName = lead.firstName;
      query.lastName = lead.lastName;
    }
    if (lead.street || lead.city || lead.state || lead.zipCode) {
      query.address = [lead.street, lead.city, lead.state, lead.zipCode]
        .filter(Boolean)
        .join(', ');
    }
    if (lead.insuranceType) query.insuranceType = lead.insuranceType;

    return query;
  }

  /**
   * Get active data providers
   */
  private async getActiveProviders(options?: {
    includeProviders?: string[];
    excludeProviders?: string[];
  }): Promise<Array<{ id: string; priority: number }>> {
    const providers = await prisma.dataProvider.findMany({
      where: {
        isEnabled: true,
        status: 'active',
        ...(options?.includeProviders && { id: { in: options.includeProviders } }),
        ...(options?.excludeProviders && { id: { notIn: options.excludeProviders } }),
      },
      orderBy: { priority: 'asc' },
    });

    return providers.map((p) => ({ id: p.id, priority: p.priority }));
  }

  /**
   * Parse enrichment data from provider responses
   */
  private parseEnrichmentData(
    combinedData: Record<string, unknown>,
    results: Map<string, any>
  ): {
    demographics?: EnrichmentDemographics;
    firmographics?: EnrichmentFirmographics;
    behavioral?: EnrichmentBehavioral;
    risk?: EnrichmentRisk;
    propertyData?: EnrichmentProperty;
    vehicleData?: EnrichmentVehicle[];
  } {
    const data: any = {};

    // Extract demographics
    if (combinedData.age || combinedData.income || combinedData.maritalStatus) {
      data.demographics = {
        age: combinedData.age as number | undefined,
        ageRange: combinedData.ageRange as string | undefined,
        gender: combinedData.gender as 'male' | 'female' | 'other' | 'unknown',
        maritalStatus: combinedData.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed',
        dependentsCount: combinedData.dependentsCount as number | undefined,
        educationLevel: combinedData.educationLevel as string | undefined,
        occupation: combinedData.occupation as string | undefined,
        industry: combinedData.industry as string | undefined,
        incomeRange: combinedData.incomeRange as string | undefined,
        estimatedIncome: combinedData.estimatedIncome as number | undefined,
        homeownerStatus: combinedData.homeownerStatus as 'owns' | 'rents' | 'unknown',
        yearsAtCurrentResidence: combinedData.yearsAtCurrentResidence as number | undefined,
      };
    }

    // Extract firmographics
    if (combinedData.companyName || combinedData.companySize) {
      data.firmographics = {
        companyName: combinedData.companyName as string | undefined,
        companySize: combinedData.companySize as string | undefined,
        companyIndustry: combinedData.companyIndustry as string | undefined,
        companyRevenue: combinedData.companyRevenue as string | undefined,
        companyStage: combinedData.companyStage as 'startup' | 'growth' | 'mature' | 'enterprise',
        employeeCount: combinedData.employeeCount as number | undefined,
        yearsInBusiness: combinedData.yearsInBusiness as number | undefined,
        businessType: combinedData.businessType as string | undefined,
        location: combinedData.location as { city?: string; state?: string; country?: string },
      };
    }

    // Extract behavioral data
    if (combinedData.websiteVisits || combinedData.emailOpens) {
      data.behavioral = {
        websiteVisits: combinedData.websiteVisits as number | undefined,
        lastWebsiteVisit: combinedData.lastWebsiteVisit as Date | undefined,
        contentEngaged: combinedData.contentEngaged as string[] | undefined,
        lastContentEngagement: combinedData.lastContentEngagement as Date | undefined,
        emailOpens: combinedData.emailOpens as number | undefined,
        emailClicks: combinedData.emailClicks as number | undefined,
        lastEmailEngagement: combinedData.lastEmailEngagement as Date | undefined,
        intentSignals: combinedData.intentSignals as any[],
        leadSource: combinedData.leadSource as string | undefined,
        campaignId: combinedData.campaignId as string | undefined,
        deviceTypes: combinedData.deviceTypes as string[] | undefined,
        browsingPatterns: combinedData.browsingPatterns as string[] | undefined,
      };
    }

    // Extract risk data
    if (combinedData.fraudRiskScore !== undefined) {
      data.risk = {
        fraudRiskScore: combinedData.fraudRiskScore as number | undefined,
        creditScoreProxy: combinedData.creditScoreProxy as number | undefined,
        financialStabilityScore: combinedData.financialStabilityScore as number | undefined,
        riskFlags: combinedData.riskFlags as any[] | undefined,
        addressVerified: combinedData.addressVerified as boolean | undefined,
        phoneVerified: combinedData.phoneVerified as boolean | undefined,
        emailVerified: combinedData.emailVerified as boolean | undefined,
        syntheticIdentityRisk: combinedData.syntheticIdentityRisk as 'low' | 'medium' | 'high',
      };
    }

    // Extract property data
    if (combinedData.propertyType || combinedData.ownership) {
      data.propertyData = {
        propertyType: combinedData.propertyType as any,
        ownership: combinedData.ownership as any,
        yearBuilt: combinedData.yearBuilt as number | undefined,
        squareFootage: combinedData.squareFootage as number | undefined,
        estimatedValue: combinedData.estimatedValue as number | undefined,
        address: combinedData.address as string | undefined,
        hasPool: combinedData.hasPool as boolean | undefined,
        hasSecuritySystem: combinedData.hasSecuritySystem as boolean | undefined,
        hasClaimsHistory: combinedData.hasClaimsHistory as boolean | undefined,
        numberOfClaims: combinedData.numberOfClaims as number | undefined,
      };
    }

    // Extract vehicle data
    if (combinedData.vehicleYear || combinedData.vehicleMake) {
      data.vehicleData = [
        {
          year: combinedData.vehicleYear as number | undefined,
          make: combinedData.vehicleMake as string | undefined,
          model: combinedData.vehicleModel as string | undefined,
          vin: combinedData.vin as string | undefined,
          ownership: combinedData.vehicleOwnership as any,
          estimatedValue: combinedData.vehicleEstimatedValue as number | undefined,
          hasCoverage: combinedData.vehicleHasCoverage as boolean | undefined,
          coverageType: combinedData.vehicleCoverageType as string | undefined,
        },
      ];
    }

    return data;
  }

  /**
   * Calculate confidence score based on data quality and sources
   */
  private calculateConfidenceScore(
    results: Map<string, any>,
    enrichmentData: any
  ): number {
    let score = 0;
    const dataPoints = this.countDataPoints(enrichmentData);

    // Base score from number of data points
    score = Math.min(dataPoints * 5, 60); // Max 60 points from data volume

    // Bonus for multiple sources
    const sourceBonus = Math.min(results.size * 10, 30);
    score += sourceBonus;

    // Bonus for fresh data
    const freshDataCount = Array.from(results.values()).filter((r) => !r.cached).length;
    score += Math.min(freshDataCount * 5, 10);

    return Math.min(score, 100);
  }

  /**
   * Resolve data conflicts between providers
   */
  private resolveDataConflicts(
    enrichmentData: any,
    results: Map<string, any>
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];

    // Check for conflicts in common fields
    const conflictFields = ['income', 'age', 'companySize', 'employeeCount'];

    for (const field of conflictFields) {
      const values = this.getFieldValuesFromProviders(field, results);

      if (values.length > 1) {
        // Conflict detected
        conflicts.push({
          field,
          values: values.map((v) => ({
            value: v.value,
            source: v.source,
            timestamp: new Date(),
          })),
          resolvedValue: values[0].value, // Default to first provider
          resolutionRule: 'highest_priority',
        });
      }
    }

    return conflicts;
  }

  /**
   * Get values for a specific field from all providers
   */
  private getFieldValuesFromProviders(
    field: string,
    results: Map<string, any>
  ): Array<{ value: unknown; source: string }> {
    const values: Array<{ value: unknown; source: string }> = [];

    for (const [providerId, response] of results.entries()) {
      if (response.data && response.data[field] !== undefined) {
        values.push({ value: response.data[field], source: providerId });
      }
    }

    return values;
  }

  /**
   * Calculate expiry time for enrichment data
   */
  private calculateExpiry(enrichmentData: any): Date {
    const ttlMinutes = 1440; // Default 24 hours

    // Adjust TTL based on data type
    if (enrichmentData.risk?.fraudRiskScore !== undefined) {
      // Risk data needs more frequent refresh
      return new Date(Date.now() + 480 * 60 * 1000); // 8 hours
    }

    return new Date(Date.now() + ttlMinutes * 60 * 1000);
  }

  /**
   * Save enrichment profile to database
   */
  private async saveEnrichmentProfile(
    data: any
  ): Promise<{ id: string }> {
    return await prisma.leadEnrichmentProfile.upsert({
      where: { leadId: data.leadId },
      create: data,
      update: {
        ...data,
        enrichmentVersion: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count total data points in enrichment data
   */
  private countDataPoints(enrichmentData: any): number {
    let count = 0;

    for (const section of Object.values(enrichmentData)) {
      if (section && typeof section === 'object') {
        for (const value of Object.values(section)) {
          if (value !== undefined && value !== null) {
            count++;
          }
        }
      } else if (Array.isArray(section)) {
        count += section.length;
      }
    }

    return count;
  }

  /**
   * Sanitize profile for minimal data (privacy)
   */
  private sanitizeProfile(profile: any): LeadEnrichmentProfile {
    return {
      ...profile,
      demographics: undefined,
      firmographics: undefined,
      behavioral: undefined,
      risk: undefined,
      propertyData: undefined,
      vehicleData: undefined,
    };
  }
}
