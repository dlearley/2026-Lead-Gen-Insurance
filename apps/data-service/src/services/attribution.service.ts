// Attribution Service - Marketing ROI Tracking

import { PrismaClient } from '@prisma/client';
import { 
  CreateMarketingSourceDto, 
  UpdateMarketingSourceDto, 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  CreateAttributionDto, 
  UpdateAttributionDto 
} from '@insurance-lead-gen/types';
import { z } from 'zod';

const prisma = new PrismaClient();

export class AttributionService {
  
  // ========================================
  // MARKETING SOURCE MANAGEMENT
  // ========================================
  
  async createMarketingSource(data: z.infer<typeof CreateMarketingSourceDto>) {
    return prisma.marketingSource.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        costPerLead: data.costPerLead,
        isActive: data.isActive ?? true,
      },
    });
  }
  
  async getMarketingSource(id: string) {
    return prisma.marketingSource.findUnique({
      where: { id },
      include: { campaigns: true },
    });
  }
  
  async updateMarketingSource(id: string, data: z.infer<typeof UpdateMarketingSourceDto>) {
    return prisma.marketingSource.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        costPerLead: data.costPerLead,
        isActive: data.isActive,
      },
    });
  }
  
  async listMarketingSources(
    page: number = 1,
    limit: number = 50,
    filters: {
      type?: string;
      isActive?: boolean;
      search?: string;
    } = {}
  ) {
    const where: any = {};
    
    if (filters.type) {
      where.type = filters.type;
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    const [sources, total] = await Promise.all([
      prisma.marketingSource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { campaigns: true },
      }),
      prisma.marketingSource.count({ where }),
    ]);
    
    return { sources, total, page, limit };
  }
  
  async deleteMarketingSource(id: string) {
    return prisma.marketingSource.delete({ where: { id } });
  }
  
  // ========================================
  // CAMPAIGN MANAGEMENT
  // ========================================
  
  async createCampaign(data: z.infer<typeof CreateCampaignDto>) {
    return prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        sourceId: data.sourceId,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget ?? 0,
        status: data.status ?? 'DRAFT',
        objective: data.objective,
        targetAudience: data.targetAudience,
      },
      include: { source: true },
    });
  }
  
  async getCampaign(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: { source: true, metrics: true },
    });
  }
  
  async updateCampaign(id: string, data: z.infer<typeof UpdateCampaignDto>) {
    return prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        sourceId: data.sourceId,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        status: data.status,
        objective: data.objective,
        targetAudience: data.targetAudience,
      },
      include: { source: true },
    });
  }
  
  async listCampaigns(
    page: number = 1,
    limit: number = 50,
    filters: {
      sourceId?: string;
      status?: string;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const where: any = {};
    
    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { objective: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters.startDate) {
      where.startDate = { gte: filters.startDate };
    }
    
    if (filters.endDate) {
      where.endDate = { lte: filters.endDate };
    }
    
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: { source: true, metrics: true },
      }),
      prisma.campaign.count({ where }),
    ]);
    
    return { campaigns, total, page, limit };
  }
  
  async deleteCampaign(id: string) {
    return prisma.campaign.delete({ where: { id } });
  }
  
  // ========================================
  // ATTRIBUTION MANAGEMENT
  // ========================================
  
  async createAttribution(data: z.infer<typeof CreateAttributionDto>) {
    return prisma.attribution.create({
      data: {
        leadId: data.leadId,
        sourceId: data.sourceId,
        campaignId: data.campaignId,
        attributionType: data.attributionType ?? 'FIRST_TOUCH',
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        referralSource: data.referralSource,
        referringDomain: data.referringDomain,
        landingPage: data.landingPage,
      },
      include: { lead: true, source: true, campaign: true },
    });
  }
  
  async getAttribution(id: string) {
    return prisma.attribution.findUnique({
      where: { id },
      include: { lead: true, source: true, campaign: true },
    });
  }
  
  async updateAttribution(id: string, data: z.infer<typeof UpdateAttributionDto>) {
    return prisma.attribution.update({
      where: { id },
      data: {
        sourceId: data.sourceId,
        campaignId: data.campaignId,
        attributionType: data.attributionType,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        referralSource: data.referralSource,
        referringDomain: data.referringDomain,
        landingPage: data.landingPage,
      },
      include: { lead: true, source: true, campaign: true },
    });
  }
  
  async listAttributions(
    page: number = 1,
    limit: number = 50,
    filters: {
      leadId?: string;
      sourceId?: string;
      campaignId?: string;
      attributionType?: string;
      search?: string;
    } = {}
  ) {
    const where: any = {};
    
    if (filters.leadId) {
      where.leadId = filters.leadId;
    }
    
    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }
    
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    
    if (filters.attributionType) {
      where.attributionType = filters.attributionType;
    }
    
    if (filters.search) {
      where.OR = [
        { utmSource: { contains: filters.search, mode: 'insensitive' } },
        { utmMedium: { contains: filters.search, mode: 'insensitive' } },
        { utmCampaign: { contains: filters.search, mode: 'insensitive' } },
        { referralSource: { contains: filters.search, mode: 'insensitive' } },
        { referringDomain: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    const [attributions, total] = await Promise.all([
      prisma.attribution.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lead: true, source: true, campaign: true },
      }),
      prisma.attribution.count({ where }),
    ]);
    
    return { attributions, total, page, limit };
  }
  
  async deleteAttribution(id: string) {
    return prisma.attribution.delete({ where: { id } });
  }
  
  // ========================================
  // METRICS & ANALYTICS
  // ========================================
  
  async getCampaignMetrics(campaignId: string, dateRange?: { startDate: Date; endDate: Date }) {
    const where: any = { campaignId };
    
    if (dateRange) {
      where.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }
    
    return prisma.campaignMetric.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }
  
  async getSourceMetrics(sourceId: string, dateRange?: { startDate: Date; endDate: Date }) {
    const where: any = { sourceId };
    
    if (dateRange) {
      where.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }
    
    return prisma.marketingSourceMetric.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }
  
  async calculateRoi(campaignId: string): Promise<{
    roi: number;
    roiPercentage: number;
    costPerLead: number;
    costPerConversion: number;
    conversionRate: number;
    totalSpend: number;
    totalRevenue: number;
  }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { metrics: true },
    });
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    const totalSpend = campaign.budget;
    const totalRevenue = campaign.metrics.reduce((sum, metric) => sum + metric.revenueGenerated, 0);
    const totalLeads = campaign.metrics.reduce((sum, metric) => sum + metric.leadsGenerated, 0);
    const totalConversions = campaign.metrics.reduce((sum, metric) => sum + metric.leadsConverted, 0);
    
    const roi = totalRevenue - totalSpend;
    const roiPercentage = totalSpend > 0 ? (roi / totalSpend) * 100 : 0;
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
    
    return {
      roi,
      roiPercentage,
      costPerLead,
      costPerConversion,
      conversionRate,
      totalSpend,
      totalRevenue,
    };
  }
  
  async getAttributionAnalytics(dateRange?: { startDate: Date; endDate: Date }) {
    const where: any = {};
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }
    
    // Get all attributions with their related data
    const attributions = await prisma.attribution.findMany({
      where,
      include: { source: true, campaign: true, lead: true },
    });
    
    // Calculate overall metrics
    const totalLeads = attributions.length;
    const totalConversions = attributions.filter(a => a.lead.status === 'CONVERTED').length;
    const overallConversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
    
    // Calculate source-level metrics
    const sourceMetrics = new Map<string, {
      leads: number;
      conversions: number;
      revenue: number;
    }>();
    
    // Calculate campaign-level metrics
    const campaignMetrics = new Map<string, {
      leads: number;
      conversions: number;
      revenue: number;
    }>();
    
    attributions.forEach(attribution => {
      const sourceId = attribution.sourceId;
      const campaignId = attribution.campaignId;
      const isConverted = attribution.lead.status === 'CONVERTED';
      
      // Source metrics
      if (!sourceMetrics.has(sourceId)) {
        sourceMetrics.set(sourceId, { leads: 0, conversions: 0, revenue: 0 });
      }
      const sourceMetric = sourceMetrics.get(sourceId)!;
      sourceMetric.leads++;
      if (isConverted) sourceMetric.conversions++;
      
      // Campaign metrics
      if (campaignId) {
        if (!campaignMetrics.has(campaignId)) {
          campaignMetrics.set(campaignId, { leads: 0, conversions: 0, revenue: 0 });
        }
        const campaignMetric = campaignMetrics.get(campaignId)!;
        campaignMetric.leads++;
        if (isConverted) campaignMetric.conversions++;
      }
    });
    
    // Get revenue data (this would be enhanced with actual revenue tracking)
    const totalRevenue = 0; // Placeholder - would integrate with actual revenue data
    const averageCostPerLead = 0; // Placeholder
    const averageCostPerConversion = 0; // Placeholder
    const overallRoi = 0; // Placeholder
    
    // Format top sources
    const topSources = Array.from(sourceMetrics.entries()).map(([sourceId, metrics]) => {
      const source = attributions.find(a => a.sourceId === sourceId)?.source;
      return {
        sourceId,
        sourceName: source?.name || 'Unknown',
        leads: metrics.leads,
        conversions: metrics.conversions,
        conversionRate: metrics.leads > 0 ? (metrics.conversions / metrics.leads) * 100 : 0,
        revenue: 0, // Placeholder
        roi: 0, // Placeholder
      };
    }).sort((a, b) => b.leads - a.leads).slice(0, 5);
    
    // Format top campaigns
    const topCampaigns = Array.from(campaignMetrics.entries()).map(([campaignId, metrics]) => {
      const campaign = attributions.find(a => a.campaignId === campaignId)?.campaign;
      return {
        campaignId,
        campaignName: campaign?.name || 'Unknown',
        leads: metrics.leads,
        conversions: metrics.conversions,
        conversionRate: metrics.leads > 0 ? (metrics.conversions / metrics.leads) * 100 : 0,
        revenue: 0, // Placeholder
        roi: 0, // Placeholder
      };
    }).sort((a, b) => b.leads - a.leads).slice(0, 5);
    
    return {
      totalLeads,
      totalConversions,
      overallConversionRate,
      averageCostPerLead,
      averageCostPerConversion,
      totalRevenue,
      overallRoi,
      topSources,
      topCampaigns,
    };
  }
  
  async generateAttributionReport(
    reportName: string,
    dateRange: { startDate: Date; endDate: Date }
  ) {
    const analytics = await this.getAttributionAnalytics(dateRange);
    
    // Get detailed metrics for the report
    const campaignMetrics = await prisma.campaignMetric.findMany({
      where: {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: { campaign: true },
    });
    
    const sourceMetrics = await prisma.marketingSourceMetric.findMany({
      where: {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: { source: true },
    });
    
    // Generate recommendations based on performance
    const recommendations: string[] = [];
    
    if (analytics.overallConversionRate < 5) {
      recommendations.push('Overall conversion rate is low. Consider optimizing landing pages and lead qualification criteria.');
    }
    
    if (analytics.topSources.length > 0 && analytics.topSources[0].conversionRate < 3) {
      recommendations.push(`Top source ${analytics.topSources[0].sourceName} has low conversion rate. Review targeting and messaging.`);
    }
    
    if (analytics.topCampaigns.length > 0 && analytics.topCampaigns[0].conversionRate < 3) {
      recommendations.push(`Top campaign ${analytics.topCampaigns[0].campaignName} has low conversion rate. Consider A/B testing different approaches.`);
    }
    
    return {
      reportId: `report-${Date.now()}`,
      reportName,
      generatedAt: new Date(),
      dateRange,
      overallPerformance: {
        totalLeads: analytics.totalLeads,
        totalConversions: analytics.totalConversions,
        conversionRate: analytics.overallConversionRate,
        totalRevenue: analytics.totalRevenue,
        totalCost: 0, // Placeholder
        roi: analytics.overallRoi,
      },
      sourcePerformance: sourceMetrics,
      campaignPerformance: campaignMetrics,
      recommendations,
    };
  }
  
  // ========================================
  // LEAD ATTRIBUTION UTILITIES
  // ========================================
  
  async createAttributionFromLead(
    leadId: string,
    utmParams: {
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmTerm?: string;
      utmContent?: string;
    } = {},
    referralInfo: {
      referralSource?: string;
      referringDomain?: string;
      landingPage?: string;
    } = {}
  ) {
    // Find or create a default marketing source
    let source = await prisma.marketingSource.findFirst({
      where: { type: 'ORGANIC_SEARCH' },
    });
    
    if (!source) {
      source = await prisma.marketingSource.create({
        data: {
          name: 'Organic Search',
          type: 'ORGANIC_SEARCH',
          description: 'Default organic search source',
          costPerLead: 0,
          isActive: true,
        },
      });
    }
    
    // Create attribution record
    return prisma.attribution.create({
      data: {
        leadId,
        sourceId: source.id,
        attributionType: 'FIRST_TOUCH',
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
        utmTerm: utmParams.utmTerm,
        utmContent: utmParams.utmContent,
        referralSource: referralInfo.referralSource,
        referringDomain: referralInfo.referringDomain,
        landingPage: referralInfo.landingPage,
      },
      include: { lead: true, source: true },
    });
  }
  
  async updateLeadAttribution(
    leadId: string,
    campaignId: string,
    attributionType: AttributionType = 'LAST_TOUCH'
  ) {
    // Check if attribution already exists
    const existingAttribution = await prisma.attribution.findFirst({
      where: { leadId },
    });
    
    if (existingAttribution) {
      return prisma.attribution.update({
        where: { id: existingAttribution.id },
        data: {
          campaignId,
          attributionType,
        },
        include: { lead: true, source: true, campaign: true },
      });
    }
    
    // If no attribution exists, create a new one
    return this.createAttribution({
      leadId,
      sourceId: 'default-source-id', // This would be determined based on campaign
      campaignId,
      attributionType,
    });
  }
}