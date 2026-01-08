/**
 * Business Data Ingestion Pipeline
 * Orchestrates collection, processing, and enrichment of business intelligence data
 * for insurance leads and prospects
 */

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  BusinessDataSource,
  BusinessIntelligenceData,
  BusinessEnrichmentResult,
  IndustryData,
  CompanyFinancialMetrics,
  BusinessRiskProfile,
  MarketIntelligence,
  CompetitorAnalysis,
  CreateBusinessDataPipelineDto,
  BusinessDataProcessingStatus,
  BusinessDataQualityMetrics,
} from '@insurance-lead-gen/types';
import { DataProviderAdapterService } from '../services/data-provider-adapter';
import { LeadEnrichmentService } from '../services/lead-enrichment-service';

export interface BusinessDataIngestionConfig {
  enabledSources: string[];
  processingIntervalHours: number;
  batchSize: number;
  retryAttempts: number;
  qualityThreshold: number;
  enrichmentEnabled: boolean;
  realtimeProcessing: boolean;
}

export interface IngestionJobResult {
  jobId: string;
  sourceId: string;
  status: 'success' | 'partial_success' | 'failed';
  recordsProcessed: number;
  recordsEnriched: number;
  recordsFailed: number;
  processingTimeMs: number;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}

export class BusinessDataIngestionPipeline {
  private config: BusinessDataIngestionConfig;
  private dataProviderAdapter: DataProviderAdapterService;
  private leadEnrichmentService: LeadEnrichmentService;
  private isProcessing = false;

  constructor(
    config?: Partial<BusinessDataIngestionConfig>
  ) {
    this.config = {
      enabledSources: ['zoominfo', 'apollo', 'clearbit', 'dun_bradstreet'],
      processingIntervalHours: 24,
      batchSize: 100,
      retryAttempts: 3,
      qualityThreshold: 80,
      enrichmentEnabled: true,
      realtimeProcessing: false,
      ...config,
    };
    
    this.dataProviderAdapter = new DataProviderAdapterService();
    this.leadEnrichmentService = new LeadEnrichmentService();
  }

  /**
   * Execute full business data ingestion cycle
   */
  async executeIngestionCycle(): Promise<IngestionJobResult[]> {
    if (this.isProcessing) {
      throw new Error('Ingestion cycle already in progress');
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const results: IngestionJobResult[] = [];

    try {
      logger.info('Starting business data ingestion cycle', {
        enabledSources: this.config.enabledSources,
        interval: this.config.processingIntervalHours,
      });

      // Get leads that need business data enrichment
      const leads = await this.getLeadsForBusinessEnrichment();

      for (const sourceId of this.config.enabledSources) {
        try {
          const result = await this.processBusinessDataForSource(sourceId, leads);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to process business data for source ${sourceId}:`, error);
          results.push({
            jobId: `job_${Date.now()}_${sourceId}`,
            sourceId,
            status: 'failed',
            recordsProcessed: 0,
            recordsEnriched: 0,
            recordsFailed: 0,
            processingTimeMs: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            warnings: [],
            qualityScore: 0,
          });
        }
      }

      // Update last ingestion timestamp
      await this.updateLastIngestionTimestamp();

      const totalProcessingTime = Date.now() - startTime;
      logger.info('Business data ingestion cycle completed', {
        totalProcessingTime,
        sourcesProcessed: results.length,
        totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
        averageQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
      });

      return results;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process business data for a specific source
   */
  async processBusinessDataForSource(
    sourceId: string,
    leads: any[]
  ): Promise<IngestionJobResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsEnriched = 0;
    let recordsFailed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      logger.info(`Processing business data from source: ${sourceId}`);

      // Get business data provider configuration
      const provider = await this.getBusinessDataProvider(sourceId);
      if (!provider) {
        throw new Error(`Business data provider not found: ${sourceId}`);
      }

      // Process leads in batches
      for (let i = 0; i < leads.length; i += this.config.batchSize) {
        const batch = leads.slice(i, i + this.config.batchSize);
        
        try {
          const batchResult = await this.processBusinessDataBatch(sourceId, batch);
          recordsProcessed += batchResult.processed;
          recordsEnriched += batchResult.enriched;
          recordsFailed += batchResult.failed;
          errors.push(...batchResult.errors);
          warnings.push(...batchResult.warnings);
        } catch (error) {
          const errorMsg = `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg, { batch: batch.map(l => l.id) });
          recordsFailed += batch.length;
        }
      }

      const processingTime = Date.now() - startTime;
      const qualityScore = this.calculateQualityScore(recordsProcessed, recordsEnriched, recordsFailed);

      // Update provider metrics
      await this.updateProviderMetrics(sourceId, {
        recordsProcessed,
        recordsEnriched,
        processingTime,
        qualityScore,
      });

      return {
        jobId: `job_${startTime}_${sourceId}`,
        sourceId,
        status: recordsFailed > 0 && recordsEnriched > 0 ? 'partial_success' : 
                recordsFailed === 0 ? 'success' : 'failed',
        recordsProcessed,
        recordsEnriched,
        recordsFailed,
        processingTimeMs: processingTime,
        errors,
        warnings,
        qualityScore,
      };

    } catch (error) {
      return {
        jobId: `job_${startTime}_${sourceId}`,
        sourceId,
        status: 'failed',
        recordsProcessed,
        recordsEnriched,
        recordsFailed,
        processingTimeMs: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        qualityScore: 0,
      };
    }
  }

  /**
   * Process a batch of leads for business data enrichment
   */
  private async processBusinessDataBatch(
    sourceId: string,
    leads: any[]
  ): Promise<{
    processed: number;
    enriched: number;
    failed: number;
    errors: string[];
    warnings: string[];
  }> {
    const results = {
      processed: 0,
      enriched: 0,
      failed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    for (const lead of leads) {
      try {
        results.processed++;

        // Extract business indicators from lead
        const businessQuery = this.buildBusinessDataQuery(lead);

        // Fetch business data from provider
        const businessData = await this.fetchBusinessDataFromProvider(sourceId, businessQuery);

        if (businessData) {
          // Process and enrich business data
          const enrichedData = await this.enrichBusinessData(lead.id, businessData);
          
          if (enrichedData.success) {
            results.enriched++;
          } else {
            results.failed++;
            results.errors.push(`Enrichment failed for lead ${lead.id}: ${enrichedData.errors?.join(', ')}`);
          }
        } else {
          results.warnings.push(`No business data found for lead ${lead.id}`);
          results.failed++;
        }

        // Rate limiting
        await this.applyRateLimiting(sourceId);

      } catch (error) {
        results.failed++;
        results.errors.push(`Processing failed for lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Build business data query from lead information
   */
  private buildBusinessDataQuery(lead: any): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // Email-based queries
    if (lead.email) {
      query.email = lead.email;
      query.domain = this.extractDomainFromEmail(lead.email);
    }

    // Phone-based queries
    if (lead.phone) {
      query.phone = lead.phone;
    }

    // Company information
    if (lead.company) {
      query.companyName = lead.company;
    }

    // Location-based queries
    if (lead.city || lead.state) {
      query.location = {
        city: lead.city,
        state: lead.state,
        country: lead.country || 'US',
      };
    }

    // Industry hints
    if (lead.industry) {
      query.industry = lead.industry;
    }

    return query;
  }

  /**
   * Fetch business data from external provider
   */
  private async fetchBusinessDataFromProvider(
    sourceId: string,
    query: Record<string, unknown>
  ): Promise<BusinessIntelligenceData | null> {
    try {
      // This would integrate with actual business data providers
      // For now, we'll simulate the process
      const provider = await this.getBusinessDataProvider(sourceId);
      
      if (!provider) {
        throw new Error(`Provider not found: ${sourceId}`);
      }

      // Simulate API call to business data provider
      // In real implementation, this would call ZoomInfo, Apollo, Clearbit, etc.
      const mockBusinessData: BusinessIntelligenceData = {
        companyProfile: {
          companyName: query.companyName as string || 'Sample Company',
          industry: query.industry as string || 'Technology',
          employeeCount: Math.floor(Math.random() * 1000) + 10,
          annualRevenue: Math.floor(Math.random() * 10000000) + 100000,
          headquarters: query.location as any,
          founded: new Date().getFullYear() - Math.floor(Math.random() * 30),
          website: `https://www.${query.companyName?.toString().toLowerCase().replace(/\s+/g, '')}.com`,
          description: 'A technology company specializing in innovative solutions.',
          businessType: 'Corporation',
          status: 'Active',
        },
        financialMetrics: {
          revenue: Math.floor(Math.random() * 10000000) + 100000,
          employeeCount: Math.floor(Math.random() * 1000) + 10,
          growth: {
            revenueGrowth: (Math.random() - 0.5) * 100,
            employeeGrowth: (Math.random() - 0.5) * 50,
            marketExpansion: Math.random() > 0.7,
          },
          profitability: {
            profitMargin: (Math.random() - 0.2) * 40,
            ebitdaMargin: (Math.random() - 0.1) * 30,
          },
          creditRating: this.generateCreditRating(),
          riskScore: Math.floor(Math.random() * 40) + 30,
        },
        industryIntelligence: {
          sector: query.industry as string || 'Technology',
          marketPosition: Math.random() > 0.5 ? 'Leader' : 'Challenger',
          competitiveLandscape: 'Fragmented',
          growthTrend: Math.random() > 0.3 ? 'Growing' : 'Stable',
          regulatoryEnvironment: 'Moderate',
          keyTrends: ['Digital Transformation', 'Automation', 'AI Integration'],
          marketSize: Math.floor(Math.random() * 1000000000) + 100000000,
        },
        riskProfile: {
          overallRiskScore: Math.floor(Math.random() * 40) + 30,
          financialRisk: {
            score: Math.floor(Math.random() * 40) + 30,
            factors: ['Market Volatility', 'Competition', 'Regulatory Changes'],
            trend: 'Stable',
          },
          operationalRisk: {
            score: Math.floor(Math.random() * 30) + 20,
            factors: ['Supply Chain', 'Technology Risk', 'Human Resources'],
            trend: 'Improving',
          },
          industryRisk: {
            score: Math.floor(Math.random() * 50) + 25,
            factors: ['Market Disruption', 'Regulatory Changes', 'Economic Conditions'],
            trend: 'Stable',
          },
        },
        marketIntelligence: {
          competitors: this.generateCompetitorData(),
          marketShare: Math.random() * 15 + 1,
          pricingStrategy: 'Competitive',
          customerSegments: ['SMB', 'Enterprise', 'Government'],
          geographicReach: ['North America', 'Europe'],
          partnerships: ['Strategic', 'Technology', 'Distribution'],
          recentNews: [
            {
              title: 'Company Announces New Product Line',
              date: new Date(),
              sentiment: 'Positive',
              impact: 'Medium',
            },
          ],
        },
        dataQuality: {
          completeness: Math.random() * 20 + 80,
          accuracy: Math.random() * 15 + 85,
          freshness: Math.random() * 30 + 70,
          source: sourceId,
          lastUpdated: new Date(),
          confidence: Math.random() * 20 + 80,
        },
      };

      // Add artificial delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      return mockBusinessData;

    } catch (error) {
      logger.error(`Failed to fetch business data from ${sourceId}:`, error);
      return null;
    }
  }

  /**
   * Enrich business data and update lead profile
   */
  private async enrichBusinessData(
    leadId: string,
    businessData: BusinessIntelligenceData
  ): Promise<BusinessEnrichmentResult> {
    try {
      // Create firmographics data from business intelligence
      const firmographics = this.convertToFirmographics(businessData);

      // Update lead with business data
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          // Update firmographic fields
          company: businessData.companyProfile.companyName,
          industry: businessData.companyProfile.industry,
          employeeCount: businessData.companyProfile.employeeCount,
          annualRevenue: businessData.companyProfile.annualRevenue,
          
          // Update metadata
          metadata: {
            ...(await this.getLeadMetadata(leadId)),
            businessData: {
              ...businessData,
              enrichedAt: new Date(),
              dataQuality: businessData.dataQuality,
            },
          },
        },
      });

      // Trigger lead enrichment if enabled
      if (this.config.enrichmentEnabled) {
        await this.leadEnrichmentService.enrichLead(leadId, { forceRefresh: false });
      }

      return {
        success: true,
        leadId,
        businessDataSource: businessData.dataQuality.source,
        dataQuality: businessData.dataQuality.completeness,
        enrichmentDuration: Date.now(),
        recordsEnriched: Object.keys(firmographics).length,
      };

    } catch (error) {
      logger.error(`Business data enrichment failed for lead ${leadId}:`, error);
      return {
        success: false,
        leadId,
        businessDataSource: businessData.dataQuality.source,
        dataQuality: 0,
        enrichmentDuration: Date.now(),
        recordsEnriched: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Convert business intelligence data to firmographics format
   */
  private convertToFirmographics(businessData: BusinessIntelligenceData): Record<string, unknown> {
    return {
      companyName: businessData.companyProfile.companyName,
      companySize: this.mapEmployeeCountToSize(businessData.companyProfile.employeeCount),
      companyIndustry: businessData.companyProfile.industry,
      companyRevenue: this.mapRevenueToRange(businessData.companyProfile.annualRevenue),
      companyStage: this.determineCompanyStage(businessData),
      employeeCount: businessData.companyProfile.employeeCount,
      yearsInBusiness: new Date().getFullYear() - businessData.companyProfile.founded,
      businessType: businessData.companyProfile.businessType,
      location: businessData.companyProfile.headquarters,
    };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private async getLeadsForBusinessEnrichment(): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.config.processingIntervalHours);

    return await prisma.lead.findMany({
      where: {
        OR: [
          { businessDataEnrichedAt: null },
          { businessDataEnrichedAt: { lt: cutoffDate } },
        ],
        company: { not: null },
        status: { in: ['new', 'contacted', 'qualified'] },
      },
      take: 1000, // Limit to prevent memory issues
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getBusinessDataProvider(sourceId: string) {
    return await prisma.dataProvider.findUnique({
      where: { 
        id: sourceId,
        isEnabled: true,
        status: 'active',
      },
    });
  }

  private async updateProviderMetrics(sourceId: string, metrics: any) {
    await prisma.dataProvider.update({
      where: { id: sourceId },
      data: {
        totalCalls: { increment: metrics.recordsProcessed },
        failedCalls: { increment: metrics.recordsFailed },
        lastSuccessfulAt: metrics.recordsFailed === 0 ? new Date() : undefined,
        lastErrorAt: metrics.recordsFailed > 0 ? new Date() : undefined,
        successRate: this.calculateSuccessRate(metrics),
        updatedAt: new Date(),
      },
    });
  }

  private async updateLastIngestionTimestamp() {
    await prisma.systemConfig.upsert({
      where: { key: 'last_business_data_ingestion' },
      create: {
        key: 'last_business_data_ingestion',
        value: new Date().toISOString(),
      },
      update: {
        value: new Date().toISOString(),
        updatedAt: new Date(),
      },
    });
  }

  private calculateQualityScore(processed: number, enriched: number, failed: number): number {
    if (processed === 0) return 0;
    const successRate = (enriched / processed) * 100;
    const failureRate = (failed / processed) * 100;
    return Math.max(0, successRate - (failureRate * 0.5));
  }

  private calculateSuccessRate(metrics: any): number {
    if (metrics.recordsProcessed === 0) return 100;
    return ((metrics.recordsProcessed - metrics.recordsFailed) / metrics.recordsProcessed) * 100;
  }

  private async applyRateLimiting(sourceId: string): Promise<void> {
    // Implement rate limiting logic here
    // For now, just add a small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private extractDomainFromEmail(email: string): string | null {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : null;
  }

  private generateCreditRating(): string {
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
    return ratings[Math.floor(Math.random() * ratings.length)];
  }

  private generateCompetitorData(): CompetitorAnalysis[] {
    return [
      {
        companyName: 'Competitor A',
        marketShare: Math.random() * 20 + 5,
        strength: 'Technology Innovation',
        weakness: 'Customer Service',
        threat: 'High',
      },
      {
        companyName: 'Competitor B',
        marketShare: Math.random() * 15 + 3,
        strength: 'Pricing',
        weakness: 'Product Range',
        threat: 'Medium',
      },
    ];
  }

  private mapEmployeeCountToSize(count: number): string {
    if (count < 10) return '1-9';
    if (count < 50) return '10-49';
    if (count < 200) return '50-199';
    if (count < 1000) return '200-999';
    return '1000+';
  }

  private mapRevenueToRange(revenue: number): string {
    if (revenue < 1000000) return 'Under $1M';
    if (revenue < 10000000) return '$1M-$10M';
    if (revenue < 100000000) return '$10M-$100M';
    if (revenue < 1000000000) return '$100M-$1B';
    return 'Over $1B';
  }

  private determineCompanyStage(businessData: BusinessIntelligenceData): 'startup' | 'growth' | 'mature' | 'enterprise' {
    const yearsInBusiness = new Date().getFullYear() - businessData.companyProfile.founded;
    const employeeCount = businessData.companyProfile.employeeCount;
    const revenue = businessData.companyProfile.annualRevenue;

    if (yearsInBusiness < 5 && employeeCount < 50) return 'startup';
    if (yearsInBusiness < 10 && employeeCount < 200) return 'growth';
    if (yearsInBusiness < 20 && employeeCount < 1000) return 'mature';
    return 'enterprise';
  }

  private async getLeadMetadata(leadId: string): Promise<Record<string, unknown>> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { metadata: true },
    });
    return (lead?.metadata as Record<string, unknown>) || {};
  }

  /**
   * Get pipeline health and status
   */
  async getPipelineHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastRun: Date | null;
    sourcesEnabled: string[];
    processingInterval: number;
    averageQualityScore: number;
    totalLeadsProcessed: number;
    errors: string[];
  }> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'last_business_data_ingestion' },
    });

    const lastRun = config?.value ? new Date(config.value) : null;
    const sources = await prisma.dataProvider.count({
      where: { isEnabled: true, status: 'active' },
    });

    return {
      status: this.determineHealthStatus(lastRun),
      lastRun,
      sourcesEnabled: this.config.enabledSources,
      processingInterval: this.config.processingIntervalHours,
      averageQualityScore: 85, // Mock value
      totalLeadsProcessed: 0, // Mock value
      errors: [],
    };
  }

  private determineHealthStatus(lastRun: Date | null): 'healthy' | 'degraded' | 'unhealthy' {
    if (!lastRun) return 'unhealthy';
    
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun > this.config.processingIntervalHours * 2) return 'unhealthy';
    if (hoursSinceLastRun > this.config.processingIntervalHours) return 'degraded';
    return 'healthy';
  }

  /**
   * Update pipeline configuration
   */
  updateConfiguration(config: Partial<BusinessDataIngestionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Business data ingestion pipeline configuration updated', {
      newConfig: this.config,
    });
  }

  /**
   * Get current configuration
   */
  getConfiguration(): BusinessDataIngestionConfig {
    return { ...this.config };
  }
}