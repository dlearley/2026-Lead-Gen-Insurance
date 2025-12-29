import { PrismaClient } from '@prisma/client';
import {
  AttributionModel,
  TouchpointType,
  AttributionStatus,
  Touchpoint,
  AttributionRecord,
  Conversion,
  ChannelAttributionSummary,
  PartnerAttributionSummary,
  BrokerAttributionSummary,
  CampaignAttributionSummary,
  AttributionReport,
  AttributionAnalytics,
  AttributionCalculation,
  CreateTouchpointDto,
  UpdateTouchpointDto,
  CreateAttributionDto,
  UpdateAttributionDto,
  CreateConversionDto,
  UpdateConversionDto,
  AttributionReportParams,
  CalculateAttributionDto,
  TouchpointFilterParams,
  AttributionFilterParams,
  ConversionFilterParams,
  PositionBasedWeights,
  TimeDecayConfig,
  AttributionModelConfig,
  AttributionDispute,
  CreateAttributionDisputeDto,
  ResolveAttributionDisputeDto,
  BatchAttributionDto,
  BatchAttributionResult,
} from '@insurance/shared-types';

export class AttributionService {
  private prisma: PrismaClient;
  private readonly defaultPositionWeights: PositionBasedWeights = {
    first: 0.4,
    middle: 0.2,
    last: 0.4,
  };
  private readonly defaultTimeDecayConfig: TimeDecayConfig = {
    halfLifeDays: 7,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ========================================
  // TOUCHPOINT OPERATIONS
  // ========================================

  async createTouchpoint(data: CreateTouchpointDto): Promise<Touchpoint> {
    const touchpoint = await this.prisma.touchpoint.create({
      data: {
        leadId: data.leadId,
        sessionId: data.sessionId,
        channel: data.channel,
        source: data.source,
        medium: data.medium,
        campaign: data.campaign,
        content: data.content,
        term: data.term,
        referralCode: data.referralCode,
        partnerId: data.partnerId,
        brokerId: data.brokerId,
        timestamp: new Date(),
        metadata: data.metadata,
        converted: false,
      },
    });

    return this.mapToTouchpoint(touchpoint);
  }

  async getTouchpointById(id: string): Promise<Touchpoint | null> {
    const touchpoint = await this.prisma.touchpoint.findUnique({
      where: { id },
    });

    return touchpoint ? this.mapToTouchpoint(touchpoint) : null;
  }

  async getTouchpointsByLead(leadId: string): Promise<Touchpoint[]> {
    const touchpoints = await this.prisma.touchpoint.findMany({
      where: { leadId },
      orderBy: { timestamp: 'asc' },
    });

    return touchpoints.map((t) => this.mapToTouchpoint(t));
  }

  async getTouchpoints(filter: TouchpointFilterParams): Promise<{
    data: Touchpoint[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, ...filterParams } = filter;

    const where: Record<string, unknown> = {};

    if (filterParams.leadId) where.leadId = filterParams.leadId;
    if (filterParams.sessionId) where.sessionId = filterParams.sessionId;
    if (filterParams.channel) where.channel = filterParams.channel;
    if (filterParams.source) where.source = filterParams.source;
    if (filterParams.campaign) where.campaign = filterParams.campaign;
    if (filterParams.partnerId) where.partnerId = filterParams.partnerId;
    if (filterParams.brokerId) where.brokerId = filterParams.brokerId;
    if (filterParams.converted !== undefined) where.converted = filterParams.converted;

    if (filterParams.dateFrom || filterParams.dateTo) {
      where.timestamp = {};
      if (filterParams.dateFrom) (where.timestamp as Record<string, unknown>).gte = filterParams.dateFrom;
      if (filterParams.dateTo) (where.timestamp as Record<string, unknown>).lte = filterParams.dateTo;
    }

    const [total, touchpoints] = await Promise.all([
      this.prisma.touchpoint.count({ where }),
      this.prisma.touchpoint.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: touchpoints.map((t) => this.mapToTouchpoint(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTouchpoint(id: string, data: UpdateTouchpointDto): Promise<Touchpoint | null> {
    const updateData: Record<string, unknown> = {};

    if (data.converted !== undefined) updateData.converted = data.converted;
    if (data.conversionValue !== undefined) updateData.conversionValue = data.conversionValue;
    if (data.conversionTimestamp !== undefined) updateData.conversionTimestamp = data.conversionTimestamp;
    if (data.metadata) updateData.metadata = data.metadata;

    const touchpoint = await this.prisma.touchpoint.update({
      where: { id },
      data: updateData,
    });

    return this.mapToTouchpoint(touchpoint);
  }

  async deleteTouchpoint(id: string): Promise<boolean> {
    await this.prisma.touchpoint.delete({ where: { id } });
    return true;
  }

  // ========================================
  // CONVERSION OPERATIONS
  // ========================================

  async createConversion(data: CreateConversionDto): Promise<Conversion> {
    const conversion = await this.prisma.conversion.create({
      data: {
        leadId: data.leadId,
        type: data.type,
        value: data.value,
        currency: data.currency || 'USD',
        policyId: data.policyId,
        policyNumber: data.policyNumber,
        commissionRate: data.commissionRate,
        occurredAt: data.occurredAt || new Date(),
        metadata: data.metadata,
      },
    });

    return this.mapToConversion(conversion);
  }

  async getConversionById(id: string): Promise<Conversion | null> {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
    });

    return conversion ? this.mapToConversion(conversion) : null;
  }

  async getConversions(filter: ConversionFilterParams): Promise<{
    data: Conversion[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, ...filterParams } = filter;

    const where: Record<string, unknown> = {};

    if (filterParams.leadId) where.leadId = filterParams.leadId;
    if (filterParams.type) where.type = filterParams.type;
    if (filterParams.policyId) where.policyId = filterParams.policyId;

    if (filterParams.dateFrom || filterParams.dateTo) {
      where.occurredAt = {};
      if (filterParams.dateFrom) (where.occurredAt as Record<string, unknown>).gte = filterParams.dateFrom;
      if (filterParams.dateTo) (where.occurredAt as Record<string, unknown>).lte = filterParams.dateTo;
    }

    const [total, conversions] = await Promise.all([
      this.prisma.conversion.count({ where }),
      this.prisma.conversion.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: conversions.map((c) => this.mapToConversion(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateConversion(id: string, data: UpdateConversionDto): Promise<Conversion | null> {
    const updateData: Record<string, unknown> = {};

    if (data.type) updateData.type = data.type;
    if (data.value) updateData.value = data.value;
    if (data.currency) updateData.currency = data.currency;
    if (data.policyId !== undefined) updateData.policyId = data.policyId;
    if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber;
    if (data.commissionRate !== undefined) updateData.commissionRate = data.commissionRate;
    if (data.commissionAmount !== undefined) updateData.commissionAmount = data.commissionAmount;
    if (data.metadata) updateData.metadata = data.metadata;

    const conversion = await this.prisma.conversion.update({
      where: { id },
      data: updateData,
    });

    return this.mapToConversion(conversion);
  }

  // ========================================
  // ATTRIBUTION CALCULATION
  // ========================================

  async calculateAttribution(data: CalculateAttributionDto): Promise<AttributionCalculation> {
    const touchpoints = await this.getTouchpointsByLead(data.leadId);
    
    if (touchpoints.length === 0) {
      throw new Error('No touchpoints found for lead');
    }

    const model = data.model || 'position_based';
    const weights = this.calculateWeights(touchpoints, model);
    
    const attributions = weights.map((weight, index) => ({
      touchpointId: touchpoints[index].id,
      channel: touchpoints[index].channel,
      timestamp: touchpoints[index].timestamp,
      isPartner: !!touchpoints[index].partnerId,
      isBroker: !!touchpoints[index].brokerId,
      weight: weight,
      percentage: weight * 100,
      revenue: data.conversionValue * weight,
      partnerId: touchpoints[index].partnerId,
      brokerId: touchpoints[index].brokerId,
    }));

    const commissionAmount = data.commissionRate 
      ? attributions.reduce((sum, a) => sum + (a.revenue * (data.commissionRate || 0)), 0)
      : undefined;

    return {
      leadId: data.leadId,
      conversionValue: data.conversionValue,
      touchpoints: touchpoints.map((t, i) => ({
        touchpointId: t.id,
        channel: t.channel,
        timestamp: t.timestamp,
        isPartner: !!t.partnerId,
        isBroker: !!t.brokerId,
        weight: weights[i],
      })),
      model,
      attributions,
      calculatedAt: new Date(),
    };
  }

  async calculateAndSaveAttribution(data: CalculateAttributionDto): Promise<AttributionRecord[]> {
    const calculation = await this.calculateAttribution(data);
    const records: AttributionRecord[] = [];

    for (const attribution of calculation.attributions) {
      const commissionAmount = data.commissionRate
        ? attribution.revenue * data.commissionRate
        : undefined;

      const record = await this.createAttribution({
        leadId: data.leadId,
        touchpointId: attribution.touchpointId,
        channel: attribution.channel,
        model: calculation.model,
        credit: attribution.weight,
        percentage: attribution.percentage,
        revenueAttributed: attribution.revenue,
        commissionAmount,
        partnerId: attribution.partnerId,
        brokerId: attribution.brokerId,
      });

      records.push(record);
    }

    return records;
  }

  private calculateWeights(touchpoints: Touchpoint[], model: AttributionModel): number[] {
    const weights: number[] = [];
    const n = touchpoints.length;

    switch (model) {
      case 'first_touch':
        weights[0] = 1;
        for (let i = 1; i < n; i++) weights[i] = 0;
        break;

      case 'last_touch':
        for (let i = 0; i < n - 1; i++) weights[i] = 0;
        weights[n - 1] = 1;
        break;

      case 'linear':
        for (let i = 0; i < n; i++) weights[i] = 1 / n;
        break;

      case 'time_decay': {
        const halfLife = this.defaultTimeDecayConfig.halfLifeDays;
        const now = Date.now();
        let totalWeight = 0;

        for (let i = 0; i < n; i++) {
          const hoursAgo = (now - touchpoints[i].timestamp.getTime()) / (1000 * 60 * 60);
          weights[i] = Math.pow(0.5, hoursAgo / (halfLife * 24));
          totalWeight += weights[i];
        }

        for (let i = 0; i < n; i++) weights[i] /= totalWeight;
        break;
      }

      case 'position_based': {
        const { first, middle, last } = this.defaultPositionWeights;
        const middleCount = n - 2;

        if (middleCount <= 0) {
          weights[0] = 0.5;
          weights[1] = 0.5;
        } else {
          weights[0] = first;
          weights[n - 1] = last;
          const middleWeight = middle / middleCount;
          for (let i = 1; i < n - 1; i++) weights[i] = middleWeight;
        }
        break;
      }

      case 'data_driven':
        for (let i = 0; i < n; i++) {
          const recency = (n - i) / n;
          const channelBonus = this.getChannelBonus(touchpoints[i].channel);
          weights[i] = (recency * 0.6 + channelBonus * 0.4) / n;
        }
        break;

      default:
        for (let i = 0; i < n; i++) weights[i] = 1 / n;
    }

    return weights;
  }

  private getChannelBonus(channel: TouchpointType): number {
    const bonuses: Record<TouchpointType, number> = {
      organic_search: 0.8,
      paid_search: 0.7,
      social_media: 0.6,
      email: 0.9,
      display_ad: 0.5,
      referral: 1.0,
      direct: 0.85,
      partner_referral: 1.0,
      broker_referral: 1.0,
      affiliate: 0.75,
      webinar: 0.8,
      event: 0.85,
      phone_call: 0.9,
      chat: 0.85,
      other: 0.5,
    };
    return bonuses[channel] || 0.5;
  }

  // ========================================
  // ATTRIBUTION RECORD OPERATIONS
  // ========================================

  async createAttribution(data: CreateAttributionDto): Promise<AttributionRecord> {
    const attribution = await this.prisma.attributionRecord.create({
      data: {
        leadId: data.leadId,
        conversionId: data.conversionId,
        touchpointId: data.touchpointId,
        channel: data.channel,
        model: data.model,
        credit: data.credit,
        percentage: data.percentage,
        revenueAttributed: data.revenueAttributed,
        commissionAmount: data.commissionAmount,
        partnerId: data.partnerId,
        brokerId: data.brokerId,
        campaignId: data.campaignId,
        calculatedAt: new Date(),
        status: data.status || 'pending',
        metadata: data.metadata,
      },
    });

    return this.mapToAttribution(attribution);
  }

  async getAttributionById(id: string): Promise<AttributionRecord | null> {
    const attribution = await this.prisma.attributionRecord.findUnique({
      where: { id },
    });

    return attribution ? this.mapToAttribution(attribution) : null;
  }

  async getAttributions(filter: AttributionFilterParams): Promise<{
    data: AttributionRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, ...filterParams } = filter;

    const where: Record<string, unknown> = {};

    if (filterParams.leadId) where.leadId = filterParams.leadId;
    if (filterParams.conversionId) where.conversionId = filterParams.conversionId;
    if (filterParams.channel) where.channel = filterParams.channel;
    if (filterParams.model) where.model = filterParams.model;
    if (filterParams.partnerId) where.partnerId = filterParams.partnerId;
    if (filterParams.brokerId) where.brokerId = filterParams.brokerId;
    if (filterParams.campaignId) where.campaignId = filterParams.campaignId;
    if (filterParams.status) where.status = filterParams.status;

    if (filterParams.dateFrom || filterParams.dateTo) {
      where.calculatedAt = {};
      if (filterParams.dateFrom) (where.calculatedAt as Record<string, unknown>).gte = filterParams.dateFrom;
      if (filterParams.dateTo) (where.calculatedAt as Record<string, unknown>).lte = filterParams.dateTo;
    }

    const [total, attributions] = await Promise.all([
      this.prisma.attributionRecord.count({ where }),
      this.prisma.attributionRecord.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: attributions.map((a) => this.mapToAttribution(a)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateAttribution(id: string, data: UpdateAttributionDto): Promise<AttributionRecord | null> {
    const updateData: Record<string, unknown> = {};

    if (data.revenueAttributed !== undefined) updateData.revenueAttributed = data.revenueAttributed;
    if (data.commissionAmount !== undefined) updateData.commissionAmount = data.commissionAmount;
    if (data.status) updateData.status = data.status;
    if (data.metadata) updateData.metadata = data.metadata;

    const attribution = await this.prisma.attributionRecord.update({
      where: { id },
      data: updateData,
    });

    return this.mapToAttribution(attribution);
  }

  // ========================================
  // BATCH ATTRIBUTION
  // ========================================

  async processBatchAttribution(data: BatchAttributionDto): Promise<BatchAttributionResult> {
    const results: BatchAttributionResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      attributions: [],
    };

    for (const leadId of data.leadIds) {
      results.processed++;

      try {
        await this.calculateAndSaveAttribution({
          leadId,
          model: data.model,
          conversionValue: data.conversionValue,
          commissionRate: data.commissionRate,
        });

        results.successful++;
        results.attributions.push({ leadId, success: true });
      } catch (error) {
        results.failed++;
        results.attributions.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ========================================
  // ATTRIBUTION REPORTING
  // ========================================

  async generateAttributionReport(params: AttributionReportParams): Promise<AttributionReport> {
    const { startDate, endDate, model = 'position_based' } = params;

    const whereClause: Record<string, unknown> = {
      calculatedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (params.channel) whereClause.channel = params.channel;
    if (params.partnerId) whereClause.partnerId = params.partnerId;
    if (params.brokerId) whereClause.brokerId = params.brokerId;
    if (params.campaignId) whereClause.campaignId = params.campaignId;

    const attributions = await this.prisma.attributionRecord.findMany({
      where: whereClause,
      orderBy: { calculatedAt: 'asc' },
    });

    const byChannel = await this.aggregateByChannel(attributions);
    const byPartner = await this.aggregateByPartner(attributions);
    const byBroker = await this.aggregateByBroker(attributions);
    const byCampaign = await this.aggregateByCampaign(attributions);

    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);
    const totalCommission = attributions.reduce((sum, a) => sum + (a.commissionAmount || 0), 0);
    const attributedRevenue = attributions.filter(a => a.status === 'approved').reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);

    const summary = {
      totalConversions: new Set(attributions.map(a => a.leadId)).size,
      totalRevenue,
      totalCommission,
      attributedRevenue,
      attributionRate: totalRevenue > 0 ? attributedRevenue / totalRevenue : 0,
    };

    const topPerformingChannels = byChannel
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5)
      .map(c => ({
        channel: c.channel,
        conversionRate: c.conversionRate,
        revenue: c.totalRevenue,
      }));

    const trend = await this.calculateAttributionTrend(startDate, endDate, attributions);

    return {
      reportId: `attr-${Date.now()}`,
      period: { start: startDate, end: endDate },
      model,
      generatedAt: new Date(),
      summary,
      byChannel,
      byPartner,
      byBroker,
      byCampaign,
      topPerformingChannels,
      trend,
    };
  }

  async getAttributionAnalytics(startDate: Date, endDate: Date): Promise<AttributionAnalytics> {
    const attributions = await this.prisma.attributionRecord.findMany({
      where: {
        calculatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const conversions = await this.prisma.conversion.findMany({
      where: {
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalAttributions = attributions.length;
    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);
    const totalCommission = attributions.reduce((sum, a) => sum + (a.commissionAmount || 0), 0);

    const modelDistribution: Record<AttributionModel, number> = {
      first_touch: 0,
      last_touch: 0,
      linear: 0,
      time_decay: 0,
      position_based: 0,
      data_driven: 0,
    };

    attributions.forEach(a => {
      modelDistribution[a.model]++;
    });

    const channelPerformance = await this.aggregateByChannel(attributions);

    const topPartners = await this.aggregateTopPartners(attributions);
    const topBrokers = await this.aggregateTopBrokers(attributions);

    const touchpointCounts = await this.prisma.touchpoint.groupBy({
      by: ['leadId'],
      _count: { id: true },
      where: {
        leadId: { in: conversions.map(c => c.leadId) },
      },
    });

    const distribution: Record<number, number> = {};
    touchpointCounts.forEach(tc => {
      const count = tc._count.id;
      distribution[count] = (distribution[count] || 0) + 1;
    });

    const touchpointCountsArray = touchpointCounts.map(tc => tc._count.id);
    const avgTouchpoints = touchpointCountsArray.reduce((a, b) => a + b, 0) / touchpointCountsArray.length;
    const sortedCounts = [...touchpointCountsArray].sort((a, b) => a - b);
    const medianTouchpoints = sortedCounts[Math.floor(sortedCounts.length / 2)];

    return {
      period: { start: startDate, end: endDate },
      totalAttributions,
      totalRevenue,
      totalCommission,
      averageAttributionValue: totalAttributions > 0 ? totalRevenue / totalAttributions : 0,
      modelDistribution,
      channelPerformance,
      topPartners,
      topBrokers,
      conversionJourney: {
        averageTouchpoints: avgTouchpoints,
        medianTouchpoints: medianTouchpoints || 0,
        distribution,
      },
    };
  }

  // ========================================
  // ATTRIBUTION DISPUTES
  // ========================================

  async createDispute(data: CreateAttributionDisputeDto): Promise<AttributionDispute> {
    const dispute = await this.prisma.attributionDispute.create({
      data: {
        attributionId: data.attributionId,
        disputedBy: data.disputedBy,
        disputeType: data.disputeType,
        reason: data.reason,
        evidence: data.evidence,
        status: 'pending',
      },
    });

    return this.mapToDispute(dispute);
  }

  async resolveDispute(
    id: string,
    data: ResolveAttributionDisputeDto
  ): Promise<AttributionDispute | null> {
    const dispute = await this.prisma.attributionDispute.update({
      where: { id },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolvedBy: data.resolvedBy,
        resolvedAt: new Date(),
      },
    });

    if (data.status === 'resolved') {
      await this.updateAttribution(data.resolution, { status: 'approved' });
    }

    return this.mapToDispute(dispute);
  }

  async getDisputes(filter: {
    attributionId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AttributionDispute[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, ...filterParams } = filter;

    const where: Record<string, unknown> = {};
    if (filterParams.attributionId) where.attributionId = filterParams.attributionId;
    if (filterParams.status) where.status = filterParams.status;

    const [total, disputes] = await Promise.all([
      this.prisma.attributionDispute.count({ where }),
      this.prisma.attributionDispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: disputes.map((d) => this.mapToDispute(d)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ========================================
  // ATTRIBUTION MODEL CONFIG
  // ========================================

  async getAttributionModelConfig(model: AttributionModel): Promise<AttributionModelConfig | null> {
    const config = await this.prisma.attributionModelConfig.findFirst({
      where: { model, isDefault: true },
    });

    if (!config) {
      return {
        model,
        positionBasedWeights: this.defaultPositionWeights,
        timeDecayConfig: this.defaultTimeDecayConfig,
      };
    }

    return {
      model: config.model as AttributionModel,
      positionBasedWeights: config.positionBasedWeights as PositionBasedWeights,
      timeDecayConfig: config.timeDecayConfig as TimeDecayConfig,
    };
  }

  async setAttributionModelConfig(
    config: AttributionModelConfig
  ): Promise<AttributionModelConfig> {
    await this.prisma.attributionModelConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    const saved = await this.prisma.attributionModelConfig.create({
      data: {
        model: config.model,
        positionBasedWeights: config.positionBasedWeights,
        timeDecayConfig: config.timeDecayConfig,
        customWeights: config.customWeights,
        isDefault: config.isDefault ?? true,
      },
    });

    return {
      model: saved.model as AttributionModel,
      positionBasedWeights: saved.positionBasedWeights as PositionBasedWeights,
      timeDecayConfig: saved.timeDecayConfig as TimeDecayConfig,
    };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private async aggregateByChannel(attributions: Array<{
    channel: string;
    credit: number;
    revenueAttributed: number | null;
    commissionAmount: number | null;
  }>): Promise<ChannelAttributionSummary[]> {
    const channelMap = new Map<TouchpointType, {
      touchpoints: number;
      converting: number;
      revenue: number;
      commission: number;
    }>();

    attributions.forEach(a => {
      const channel = a.channel as TouchpointType;
      const existing = channelMap.get(channel) || {
        touchpoints: 0,
        converting: 0,
        revenue: 0,
        commission: 0,
      };

      existing.touchpoints++;
      existing.revenue += a.revenueAttributed || 0;
      existing.commission += a.commissionAmount || 0;

      channelMap.set(channel, existing);
    });

    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);

    return Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      totalTouchpoints: data.touchpoints,
      convertingTouchpoints: Math.floor(data.touchpoints * 0.3),
      conversionRate: data.touchpoints > 0 ? 0.3 : 0,
      totalRevenue: data.revenue,
      averageRevenuePerConversion: data.revenue / Math.max(data.touchpoints * 0.3, 1),
      attributionPercentage: totalRevenue > 0 ? data.revenue / totalRevenue : 0,
      partnerAttributions: 0,
      brokerAttributions: 0,
    }));
  }

  private async aggregateByPartner(attributions: Array<{
    partnerId: string | null;
    revenueAttributed: number | null;
    commissionAmount: number | null;
    channel: string;
  }>): Promise<PartnerAttributionSummary[]> {
    const partnerMap = new Map<string, {
      name: string;
      touchpoints: number;
      conversions: number;
      revenue: number;
      commission: number;
      channels: Map<string, { count: number; revenue: number }>;
    }>();

    attributions.forEach(a => {
      if (!a.partnerId) return;

      const existing = partnerMap.get(a.partnerId) || {
        name: a.partnerId,
        touchpoints: 0,
        conversions: 0,
        revenue: 0,
        commission: 0,
        channels: new Map(),
      };

      existing.touchpoints++;
      existing.revenue += a.revenueAttributed || 0;
      existing.commission += a.commissionAmount || 0;

      const channelData = existing.channels.get(a.channel) || { count: 0, revenue: 0 };
      channelData.count++;
      channelData.revenue += a.revenueAttributed || 0;
      existing.channels.set(a.channel, channelData);

      partnerMap.set(a.partnerId, existing);
    });

    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);

    return Array.from(partnerMap.entries()).map(([partnerId, data]) => ({
      partnerId,
      partnerName: data.name,
      totalTouchpoints: data.touchpoints,
      conversions: Math.floor(data.touchpoints * 0.3),
      conversionRate: data.touchpoints > 0 ? 0.3 : 0,
      totalRevenue: data.revenue,
      totalCommission: data.commission,
      averageCommission: data.commission / Math.max(data.touchpoints, 1),
      attributionPercentage: totalRevenue > 0 ? data.revenue / totalRevenue : 0,
      topChannels: Array.from(data.channels.entries())
        .map(([channel, d]) => ({ channel: channel as TouchpointType, count: d.count, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    }));
  }

  private async aggregateByBroker(attributions: Array<{
    brokerId: string | null;
    revenueAttributed: number | null;
    commissionAmount: number | null;
    channel: string;
  }>): Promise<BrokerAttributionSummary[]> {
    const brokerMap = new Map<string, {
      name: string;
      touchpoints: number;
      conversions: number;
      revenue: number;
      commission: number;
      channels: Map<string, { count: number; revenue: number }>;
    }>();

    attributions.forEach(a => {
      if (!a.brokerId) return;

      const existing = brokerMap.get(a.brokerId) || {
        name: a.brokerId,
        touchpoints: 0,
        conversions: 0,
        revenue: 0,
        commission: 0,
        channels: new Map(),
      };

      existing.touchpoints++;
      existing.revenue += a.revenueAttributed || 0;
      existing.commission += a.commissionAmount || 0;

      const channelData = existing.channels.get(a.channel) || { count: 0, revenue: 0 };
      channelData.count++;
      channelData.revenue += a.revenueAttributed || 0;
      existing.channels.set(a.channel, channelData);

      brokerMap.set(a.brokerId, existing);
    });

    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);

    return Array.from(brokerMap.entries()).map(([brokerId, data]) => ({
      brokerId,
      brokerName: data.name,
      totalTouchpoints: data.touchpoints,
      conversions: Math.floor(data.touchpoints * 0.3),
      conversionRate: data.touchpoints > 0 ? 0.3 : 0,
      totalRevenue: data.revenue,
      totalCommission: data.commission,
      averageCommission: data.commission / Math.max(data.touchpoints, 1),
      attributionPercentage: totalRevenue > 0 ? data.revenue / totalRevenue : 0,
      topChannels: Array.from(data.channels.entries())
        .map(([channel, d]) => ({ channel: channel as TouchpointType, count: d.count, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    }));
  }

  private async aggregateByCampaign(attributions: Array<{
    campaignId: string | null;
    revenueAttributed: number | null;
    channel: string;
  }>): Promise<CampaignAttributionSummary[]> {
    const campaignMap = new Map<string, {
      name: string;
      source: string;
      medium: string;
      touchpoints: number;
      conversions: number;
      revenue: number;
    }>();

    attributions.forEach(a => {
      if (!a.campaignId) return;

      const existing = campaignMap.get(a.campaignId) || {
        name: a.campaignId,
        source: '',
        medium: '',
        touchpoints: 0,
        conversions: 0,
        revenue: 0,
      };

      existing.touchpoints++;
      existing.revenue += a.revenueAttributed || 0;

      campaignMap.set(a.campaignId, existing);
    });

    const totalRevenue = attributions.reduce((sum, a) => sum + (a.revenueAttributed || 0), 0);

    return Array.from(campaignMap.entries()).map(([campaignId, data]) => ({
      campaignId,
      campaignName: data.name,
      source: data.source,
      medium: data.medium,
      totalTouchpoints: data.touchpoints,
      conversions: Math.floor(data.touchpoints * 0.3),
      conversionRate: data.touchpoints > 0 ? 0.3 : 0,
      totalRevenue: data.revenue,
      attributionPercentage: totalRevenue > 0 ? data.revenue / totalRevenue : 0,
    }));
  }

  private async calculateAttributionTrend(
    startDate: Date,
    endDate: Date,
    attributions: Array<{ revenueAttributed: number | null; commissionAmount: number | null }>
  ): Promise<Array<{ date: string; conversions: number; revenue: number; commission: number }>> {
    const trend: Array<{ date: string; conversions: number; revenue: number; commission: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      trend.push({ date: dateStr, conversions: 0, revenue: 0, commission: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trend;
  }

  private async aggregateTopPartners(attributions: Array<{
    partnerId: string | null;
    revenueAttributed: number | null;
    commissionAmount: number | null;
  }>): Promise<Array<{ partnerId: string; revenue: number; commission: number; conversions: number }>> {
    const partnerMap = new Map<string, { revenue: number; commission: number; conversions: number }>();

    attributions.forEach(a => {
      if (!a.partnerId) return;

      const existing = partnerMap.get(a.partnerId) || { revenue: 0, commission: 0, conversions: 0 };
      existing.revenue += a.revenueAttributed || 0;
      existing.commission += a.commissionAmount || 0;
      existing.conversions++;

      partnerMap.set(a.partnerId, existing);
    });

    return Array.from(partnerMap.entries())
      .map(([partnerId, data]) => ({ partnerId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private async aggregateTopBrokers(attributions: Array<{
    brokerId: string | null;
    revenueAttributed: number | null;
    commissionAmount: number | null;
  }>): Promise<Array<{ brokerId: string; revenue: number; commission: number; conversions: number }>> {
    const brokerMap = new Map<string, { revenue: number; commission: number; conversions: number }>();

    attributions.forEach(a => {
      if (!a.brokerId) return;

      const existing = brokerMap.get(a.brokerId) || { revenue: 0, commission: 0, conversions: 0 };
      existing.revenue += a.revenueAttributed || 0;
      existing.commission += a.commissionAmount || 0;
      existing.conversions++;

      brokerMap.set(a.brokerId, existing);
    });

    return Array.from(brokerMap.entries())
      .map(([brokerId, data]) => ({ brokerId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  // ========================================
  // MAPPING METHODS
  // ========================================

  private mapToTouchpoint(data: Record<string, unknown>): Touchpoint {
    return {
      id: data.id as string,
      leadId: data.leadId as string,
      sessionId: data.sessionId as string | undefined,
      channel: data.channel as TouchpointType,
      source: data.source as string | undefined,
      medium: data.medium as string | undefined,
      campaign: data.campaign as string | undefined,
      content: data.content as string | undefined,
      term: data.term as string | undefined,
      referralCode: data.referralCode as string | undefined,
      partnerId: data.partnerId as string | undefined,
      brokerId: data.brokerId as string | undefined,
      timestamp: new Date(data.timestamp as string),
      metadata: data.metadata as Record<string, unknown> | undefined,
      converted: data.converted as boolean,
      conversionValue: data.conversionValue as number | undefined,
      conversionTimestamp: data.conversionTimestamp ? new Date(data.conversionTimestamp as string) : undefined,
    };
  }

  private mapToConversion(data: Record<string, unknown>): Conversion {
    return {
      id: data.id as string,
      leadId: data.leadId as string,
      type: data.type as Conversion['type'],
      value: data.value as number,
      currency: data.currency as string,
      policyId: data.policyId as string | undefined,
      policyNumber: data.policyNumber as string | undefined,
      commissionRate: data.commissionRate as number | undefined,
      commissionAmount: data.commissionAmount as number | undefined,
      occurredAt: new Date(data.occurredAt as string),
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  private mapToAttribution(data: Record<string, unknown>): AttributionRecord {
    return {
      id: data.id as string,
      leadId: data.leadId as string,
      conversionId: data.conversionId as string | undefined,
      touchpointId: data.touchpointId as string,
      channel: data.channel as TouchpointType,
      model: data.model as AttributionModel,
      credit: data.credit as number,
      percentage: data.percentage as number,
      revenueAttributed: data.revenueAttributed as number | undefined,
      commissionAmount: data.commissionAmount as number | undefined,
      partnerId: data.partnerId as string | undefined,
      brokerId: data.brokerId as string | undefined,
      campaignId: data.campaignId as string | undefined,
      calculatedAt: new Date(data.calculatedAt as string),
      status: data.status as AttributionStatus,
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  private mapToDispute(data: Record<string, unknown>): AttributionDispute {
    return {
      id: data.id as string,
      attributionId: data.attributionId as string,
      disputedBy: data.disputedBy as string,
      disputeType: data.disputeType as 'partner' | 'broker' | 'internal',
      reason: data.reason as string,
      evidence: data.evidence as Record<string, unknown> | undefined,
      status: data.status as 'pending' | 'resolved' | 'rejected',
      resolution: data.resolution as string | undefined,
      resolvedBy: data.resolvedBy as string | undefined,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt as string) : undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }
}

export default AttributionService;
