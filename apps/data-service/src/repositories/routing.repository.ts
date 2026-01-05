import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BrokerPerformanceData {
  brokerId: string;
  conversionRate: number;
  avgLeadValue: number;
  avgProcessingTime: number;
  slaComplianceRate: number;
  totalLeadsAssigned: number;
  totalLeadsConverted: number;
  revenueGenerated: number;
  customerSatisfaction: number;
  responseTimeAvg: number;
  metrics?: Record<string, any>;
}

export interface RoutingDecisionData {
  leadId: string;
  brokerId: string;
  score: number;
  reason: string;
  routingMethod: string;
  confidence: number;
  alternativeBrokers?: string[];
  performanceOutcome?: Record<string, any>;
  optimizationApplied?: boolean;
  experimentId?: string;
}

export interface BrokerCapacityData {
  brokerId: string;
  currentLoadPercentage: number;
  activeLeadCount: number;
  maxCapacity: number;
  avgProcessingTime: number;
  slaComplianceRate: number;
  capacityTrend?: Record<string, any>;
  predictedCapacity?: Record<string, any>;
  overloadThreshold?: number;
  underloadThreshold?: number;
}

export class RoutingRepository {
  // Broker Performance Metrics
  async createBrokerPerformanceMetrics(data: BrokerPerformanceData) {
    return prisma.brokerPerformanceMetrics.create({
      data: {
        ...data,
        lastPerformanceUpdate: new Date(),
      },
    });
  }

  async updateBrokerPerformanceMetrics(brokerId: string, data: Partial<BrokerPerformanceData>) {
    return prisma.brokerPerformanceMetrics.upsert({
      where: { brokerId },
      update: {
        ...data,
        lastPerformanceUpdate: new Date(),
      },
      create: {
        brokerId,
        conversionRate: 0,
        avgLeadValue: 0,
        avgProcessingTime: 0,
        slaComplianceRate: 0,
        totalLeadsAssigned: 0,
        totalLeadsConverted: 0,
        revenueGenerated: 0,
        customerSatisfaction: 0,
        responseTimeAvg: 0,
        ...data,
        lastPerformanceUpdate: new Date(),
      },
    });
  }

  async getBrokerPerformanceMetrics(brokerId: string) {
    return prisma.brokerPerformanceMetrics.findUnique({
      where: { brokerId },
    });
  }

  async getAllBrokerPerformanceMetrics() {
    return prisma.brokerPerformanceMetrics.findMany({
      orderBy: { conversionRate: 'desc' },
    });
  }

  // Routing Decisions
  async createRoutingDecision(data: RoutingDecisionData) {
    return prisma.routingDecision.create({
      data,
    });
  }

  async getRoutingDecisionsByLead(leadId: string) {
    return prisma.routingDecision.findMany({
      where: { leadId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getRoutingDecisionsByBroker(brokerId: string, limit = 100) {
    return prisma.routingDecision.findMany({
      where: { brokerId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getRecentRoutingDecisions(limit = 1000) {
    return prisma.routingDecision.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // Routing Profiles
  async createRoutingProfile(data: {
    leadId: string;
    brokerAssignedId: string;
    routingScore: number;
    reasoning?: Record<string, any>;
    routingFactors?: Record<string, any>;
    performanceData?: Record<string, any>;
  }) {
    return prisma.routingProfile.create({
      data,
    });
  }

  async getRoutingProfileByLead(leadId: string) {
    return prisma.routingProfile.findUnique({
      where: { leadId },
    });
  }

  // Routing Experiments
  async createRoutingExperiment(data: {
    name: string;
    description?: string;
    controlGroup: Record<string, any>;
    treatmentGroup: Record<string, any>;
    segmentRules?: Record<string, any>;
    trafficAllocation?: number;
    confidenceLevel?: number;
    power?: number;
  }) {
    return prisma.routingExperiment.create({
      data: {
        ...data,
        status: 'ACTIVE',
        confidenceLevel: data.confidenceLevel || 0.95,
        power: data.power || 0.8,
        trafficAllocation: data.trafficAllocation || 0.5,
      },
    });
  }

  async getRoutingExperiment(id: string) {
    return prisma.routingExperiment.findUnique({
      where: { id },
    });
  }

  async getActiveRoutingExperiments() {
    return prisma.routingExperiment.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });
  }

  async updateRoutingExperiment(id: string, data: Record<string, any>) {
    return prisma.routingExperiment.update({
      where: { id },
      data,
    });
  }

  // Broker Capacity
  async createBrokerCapacity(data: BrokerCapacityData) {
    return prisma.brokerCapacity.create({
      data: {
        ...data,
        overloadThreshold: data.overloadThreshold || 0.85,
        underloadThreshold: data.underloadThreshold || 0.5,
      },
    });
  }

  async updateBrokerCapacity(brokerId: string, data: Partial<BrokerCapacityData>) {
    return prisma.brokerCapacity.upsert({
      where: { brokerId },
      update: {
        ...data,
        lastUpdated: new Date(),
      },
      create: {
        brokerId,
        currentLoadPercentage: 0,
        activeLeadCount: 0,
        maxCapacity: 10,
        avgProcessingTime: 0,
        slaComplianceRate: 0,
        ...data,
        lastUpdated: new Date(),
      },
    });
  }

  async getBrokerCapacity(brokerId: string) {
    return prisma.brokerCapacity.findUnique({
      where: { brokerId },
    });
  }

  async getAllBrokerCapacity() {
    return prisma.brokerCapacity.findMany({
      orderBy: { currentLoadPercentage: 'asc' },
    });
  }

  // Routing Optimization
  async upsertRoutingOptimization(brokerId: string, data: {
    specialties: string[];
    expertise?: Record<string, any>;
    weights?: Record<string, any>;
    roiWeights?: Record<string, any>;
    fairnessRules?: Record<string, any>;
    exclusions?: string[];
    preferences?: Record<string, any>;
    modelVersion?: string;
    embeddingVector?: any;
    performanceModel?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    return prisma.routingOptimization.upsert({
      where: { brokerId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        brokerId,
        ...data,
      },
    });
  }

  async getRoutingOptimization(brokerId: string) {
    return prisma.routingOptimization.findUnique({
      where: { brokerId },
    });
  }

  async getAllRoutingOptimizations() {
    return prisma.routingOptimization.findMany();
  }

  // Lead Embeddings
  async createLeadEmbedding(data: {
    leadId: string;
    vector: any;
    embeddingModel: string;
    features?: Record<string, any>;
  }) {
    return prisma.leadEmbedding.upsert({
      where: { leadId: data.leadId },
      update: {
        vector: data.vector,
        embeddingModel: data.embeddingModel,
        features: data.features,
        updatedAt: new Date(),
      },
      create: data,
    });
  }

  async getLeadEmbedding(leadId: string) {
    return prisma.leadEmbedding.findUnique({
      where: { leadId },
    });
  }

  async getAllLeadEmbeddings(limit = 1000) {
    return prisma.leadEmbedding.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Specialty Matching
  async createSpecialtyMatching(data: {
    leadId: string;
    brokerId: string;
    specialtyMatch: number;
    semanticMatch: number;
    weightedScore: number;
    matchingFactors?: Record<string, any>;
  }) {
    return prisma.specialtyMatching.create({
      data,
    });
  }

  async getSpecialtyMatchesByLead(leadId: string) {
    return prisma.specialtyMatching.findMany({
      where: { leadId },
      orderBy: { weightedScore: 'desc' },
    });
  }

  async getSpecialtyMatchesByBroker(brokerId: string, limit = 100) {
    return prisma.specialtyMatching.findMany({
      where: { brokerId },
      orderBy: { weightedScore: 'desc' },
      take: limit,
    });
  }

  // Analytics and Aggregation Methods
  async getBrokerPerformanceLeaderboard(limit = 20) {
    return prisma.brokerPerformanceMetrics.findMany({
      orderBy: [
        { conversionRate: 'desc' },
        { slaComplianceRate: 'desc' },
        { revenueGenerated: 'desc' },
      ],
      take: limit,
    });
  }

  async getRoutingEfficiencyMetrics(dateFrom?: Date, dateTo?: Date) {
    const whereClause: any = {};
    
    if (dateFrom || dateTo) {
      whereClause.timestamp = {};
      if (dateFrom) whereClause.timestamp.gte = dateFrom;
      if (dateTo) whereClause.timestamp.lte = dateTo;
    }

    const decisions = await prisma.routingDecision.findMany({
      where: whereClause,
      select: {
        routingMethod: true,
        confidence: true,
        performanceOutcome: true,
        timestamp: true,
      },
    });

    const metrics = {
      totalDecisions: decisions.length,
      averageConfidence: decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length || 0,
      methods: {} as Record<string, number>,
      dailyVolume: {} as Record<string, number>,
    };

    decisions.forEach(decision => {
      // Count by routing method
      metrics.methods[decision.routingMethod] = (metrics.methods[decision.routingMethod] || 0) + 1;
      
      // Count by day
      const day = decision.timestamp.toISOString().split('T')[0];
      metrics.dailyVolume[day] = (metrics.dailyVolume[day] || 0) + 1;
    });

    return metrics;
  }

  async getExperimentResults(experimentId: string) {
    const experiment = await prisma.routingExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Calculate statistical significance
    const controlMetrics = experiment.controlMetrics as any || {};
    const treatmentMetrics = experiment.treatmentMetrics as any || {};

    return {
      experiment,
      controlMetrics,
      treatmentMetrics,
      improvement: experiment.improvement,
      winner: experiment.winner,
      statisticalSignificance: experiment.statisticalSignificance,
    };
  }
}

export const routingRepository = new RoutingRepository();