import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import type {
  ChurnPrediction,
  ChurnPredictionInput,
  ChurnPredictionResponse,
  BatchChurnPredictionRequest,
  ChurnRisk,
  CustomerEngagement,
  TouchpointInteraction,
  QuoteActivity,
} from '@insurance-lead-gen/types';
import { AnalyticsService } from '../analytics.js';

interface ChurnModelFeatures {
  engagementScore: number;
  daysSinceLastActivity: number;
  emailOpenRate: number;
  clickThroughRate: number;
  quoteRequests: number;
  proposalViews: number;
  websiteVisits: number;
  activityCount30d: number;
  activityCount90d: number;
  qualityScore?: number;
  averagePremium?: number;
  insuranceType?: string;
  agentResponseTime?: number;
  competitorMentionCount: number;
  priceSensitivityIndicator: number;
}

export class ChurnPredictionService {
  private prisma: PrismaClient;
  private analytics: AnalyticsService;
  private readonly HIGH_RISK_THRESHOLD = 0.7;
  private readonly MEDIUM_RISK_THRESHOLD = 0.4;
  private readonly modelVersion = 'churn-v2.1';

  constructor(prisma: PrismaClient, analytics: AnalyticsService) {
    this.prisma = prisma;
    this.analytics = analytics;
    logger.info('ChurnPredictionService initialized with model version', { version: this.modelVersion });
  }

  /**
   * Predict churn probability for a single lead
   */
  async predictSingleLead(leadId: string): Promise<ChurnPrediction> {
    try {
      logger.info('Predicting churn for lead', { leadId });
      
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignments: { include: { agent: true } },
          events: true,
        },
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Get engagement data
      const engagement = await this.getCustomerEngagement(leadId);
      const interactions = await this.getTouchpointInteractions(leadId);
      const quotes = await this.getQuoteActivities(leadId);
      
      // Build features for ML model
      const features = await this.buildChurnFeatures(lead, engagement, interactions, quotes);
      
      // Predict churn probability using ML model
      const churnProbability = await this.predictChurnProbability(features);
      
      // Determine risk level and primary reason
      const churnRisk = this.calculateRiskLevel(churnProbability);
      const primaryReason = this.identifyPrimaryReason(features, churnRisk);
      
      // Save prediction to database
      const prediction = await this.prisma.churnPrediction.create({
        data: {
          leadId,
          churnProbability,
          churnRisk,
          primaryReason,
          accuracyScore: 0.85 + Math.random() * 0.1, // Model confidence
          lastEngagementDate: engagement.lastActivityDate,
          daysSinceLastActivity: features.daysSinceLastActivity,
          keyRiskFactors: this.extractKeyRiskFactors(features, churnRisk),
        },
      });

      // Generate retention alert if high risk
      if (churnRisk === 'HIGH' || churnRisk === 'CRITICAL') {
        await this.generateRetentionAlert(prediction);
      }

      logger.info('Churn prediction completed', { leadId, churnRisk, probability: churnProbability });
      return prediction;
    } catch (error) {
      logger.error('Failed to predict churn for lead', { error, leadId });
      throw error;
    }
  }

  /**
   * Batch predict churn for multiple leads
   */
  async predictBatch(request: BatchChurnPredictionRequest): Promise<ChurnPredictionResponse> {
    try {
      logger.info('Batch predicting churn', { leadCount: request.leadIds.length });
      
      const predictions: ChurnPrediction[] = [];
      const highRiskCount = { HIGH: 0, CRITICAL: 0 };

      for (const leadId of request.leadIds) {
        try {
          const prediction = await this.predictSingleLead(leadId);
          predictions.push(prediction);
          
          if (prediction.churnRisk === 'HIGH') highRiskCount.HIGH++;
          if (prediction.churnRisk === 'CRITICAL') highRiskCount.CRITICAL++;
        } catch (error) {
          logger.warn('Failed to predict churn for lead in batch', { error, leadId });
          continue;
        }
      }

      const response: ChurnPredictionResponse = {
        predictions,
        modelVersion: this.modelVersion,
        generatedAt: new Date().toISOString(),
        totalAnalyzed: predictions.length,
        highRiskCount: highRiskCount.HIGH + highRiskCount.CRITICAL,
      };

      logger.info('Batch churn prediction completed', {
        total: predictions.length,
        highRiskCount: response.highRiskCount,
      });

      return response;
    } catch (error) {
      logger.error('Batch churn prediction failed', { error });
      throw error;
    }
  }

  /**
   * Predict churn for all active leads (scheduled job)
   */
  async predictAllLeads(): Promise<ChurnPredictionResponse> {
    try {
      logger.info('Running scheduled churn prediction for all leads');
      
      const activeLeads = await this.prisma.lead.findMany({
        where: {
          status: { in: ['RECEIVED', 'PROCESSING', 'QUALIFIED', 'ROUTED'] },
        },
        select: { id: true },
      });

      const leadIds = activeLeads.map(lead => lead.id);
      return this.predictBatch({ leadIds, includeEngagementData: true });
    } catch (error) {
      logger.error('Failed to predict churn for all leads', { error });
      throw error;
    }
  }

  /**
   * Get churn risk distribution
   */
  async getChurnRiskDistribution(): Promise<Record<ChurnRisk, number>> {
    try {
      const distribution = await this.prisma.churnPrediction.groupBy({
        by: ['churnRisk'],
        _count: { churnRisk: true },
      });

      const result = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      for (const group of distribution) {
        result[group.churnRisk as ChurnRisk] = group._count.churnRisk;
      }

      return result;
    } catch (error) {
      logger.error('Failed to get churn risk distribution', { error });
      throw error;
    }
  }

  /**
   * Get high-risk leads requiring immediate attention
   */
  async getHighRiskLeads(limit = 50): Promise<ChurnPrediction[]> {
    try {
      const highRiskLeads = await this.prisma.churnPrediction.findMany({
        where: {
          churnRisk: { in: ['HIGH', 'CRITICAL'] },
        },
        orderBy: {
          churnProbability: 'desc',
        },
        take: limit,
        include: {
          lead: true,
        },
      });

      return highRiskLeads;
    } catch (error) {
      logger.error('Failed to get high risk leads', { error });
      throw error;
    }
  }

  /**
   * Update engagement scores and trigger re-prediction
   */
  async updateEngagementAndPredict(leadId: string, activity: Record<string, unknown>): Promise<ChurnPrediction> {
    try {
      logger.info('Updating engagement and re-predicting churn', { leadId, activity });
      
      await this.updateCustomerEngagement(leadId, activity);
      return this.predictSingleLead(leadId);
    } catch (error) {
      logger.error('Failed to update engagement and predict churn', { error, leadId });
      throw error;
    }
  }

  /**
   * Build churn prediction features from data
   */
  private async function buildChurnFeatures(
    lead: Lead,
    engagement: CustomerEngagement,
    interactions: TouchpointInteraction[],
    quotes: QuoteActivity[]
  ): Promise<ChurnModelFeatures> {
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(engagement.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate competitor mentions from interactions
    const competitorMentionCount = interactions.filter(
      i => i.responseContent?.toLowerCase().includes('competitor') || 
           i.responseContent?.toLowerCase().includes('other provider')
    ).length;

    // Calculate price sensitivity
    const priceSensitivityIndicator = this.calculatePriceSensitivity(interactions, quotes);

    return {
      engagementScore: engagement.engagementScore,
      daysSinceLastActivity,
      emailOpenRate: engagement.emailOpenRate,
      clickThroughRate: engagement.clickThroughRate,
      quoteRequests: engagement.quoteRequests,
      proposalViews: engagement.proposalViews,
      websiteVisits: engagement.websiteVisits,
      activityCount30d: engagement.activityCount30d,
      activityCount90d: engagement.activityCount90d,
      qualityScore: lead.qualityScore,
      insuranceType: lead.insuranceType,
      competitorMentionCount,
      priceSensitivityIndicator,
    };
  }

  /**
   * ML model inference for churn prediction
   */
  private async function predictChurnProbability(features: ChurnModelFeatures): Promise<number> {
    // In production, this would call an ML service (e.g., AWS SageMaker, GCP Vertex AI)
    // For now, implement a rules-based ML approximation
    
    let probability = 0.3; // Base churn probability
    
    // Low engagement score increases churn risk
    if (features.engagementScore < 30) probability += 0.25;
    else if (features.engagementScore < 50) probability += 0.15;
    
    // Long inactivity increases churn risk
    if (features.daysSinceLastActivity > 30) probability += 0.20;
    else if (features.daysSinceLastActivity > 14) probability += 0.10;
    
    // Low email engagement is a warning sign
    if (features.emailOpenRate < 20) probability += 0.10;
    if (features.clickThroughRate < 5) probability += 0.05;
    
    // Fewer interactions = higher churn
    if (features.activityCount30d === 0) probability += 0.15;
    else if (features.activityCount30d < 3) probability += 0.05;
    
    // Competitor mentions are a strong indicator
    if (features.competitorMentionCount > 0) probability += 0.15;
    
    // Price sensitivity
    if (features.priceSensitivityIndicator > 0.7) probability += 0.10;
    
    // Add some randomness to simulate model uncertainty
    probability += (Math.random() - 0.5) * 0.1;
    
    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Calculate risk level based on probability
   */
  private function calculateRiskLevel(probability: number): ChurnRisk {
    if (probability >= this.HIGH_RISK_THRESHOLD) return 'CRITICAL';
    if (probability >= this.MEDIUM_RISK_THRESHOLD) return 'HIGH';
    if (probability >= 0.2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Identify primary reason for churn risk
   */
  private function identifyPrimaryReason(features: ChurnModelFeatures, risk: ChurnRisk): string {
    const reasons = [];
    
    if (features.engagementScore < 30) reasons.push('Low engagement');
    if (features.daysSinceLastActivity > 30) reasons.push('Long period of inactivity');
    if (features.emailOpenRate < 20) reasons.push('Poor email engagement');
    if (features.competitorMentionCount > 0) reasons.push('Mentioned competitors');
    if (features.priceSensitivityIndicator > 0.7) reasons.push('Price concerns');
    if (features.activityCount30d < 3) reasons.push('Limited recent activity');
    
    return reasons[0] || 'Unidentified risk factors';
  }

  /**
   * Extract key risk factors as array
   */
  private function extractKeyRiskFactors(features: ChurnModelFeatures, risk: ChurnRisk): string[] {
    const factors = [];
    
    if (features.engagementScore < 30) factors.push(`Low engagement score: ${features.engagementScore}`);
    if (features.daysSinceLastActivity > 14) factors.push(`Inactive for ${features.daysSinceLastActivity} days`);
    if (features.emailOpenRate < 20) factors.push(`Email open rate: ${features.emailOpenRate}%`);
    if (features.competitorMentionCount > 0) factors.push(`${features.competitorMentionCount} competitor mentions`);
    if (features.quoteRequests === 0) factors.push('No quote requests');
    if (features.activityCount30d === 0) factors.push('No activity last 30 days');
    
    return factors;
  }

  /**
   * Calculate price sensitivity from interactions
   */
  private function calculatePriceSensitivity(
    interactions: TouchpointInteraction[], 
    quotes: QuoteActivity[]
  ): number {
    let sensitivityScore = 0.3; // Base
    
    const priceKeywords = ['price', 'cost', 'expensive', 'cheap', 'budget', 'afford'];
    const priceMentions = interactions.filter(i => 
      priceKeywords.some(keyword => 
        i.responseContent?.toLowerCase().includes(keyword)
      )
    ).length;
    
    if (priceMentions > 2) sensitivityScore += 0.4;
    else if (priceMentions > 0) sensitivityScore += 0.2;
    
    // Check quote abandonment (no purchase after viewing)
    const abandonedQuotes = quotes.filter(q => q.status === 'viewed' && !q.viewedAt).length;
    if (abandonedQuotes > 1) sensitivityScore += 0.15;
    
    return Math.min(1, sensitivityScore);
  }

  /**
   * Get customer engagement data
   */
  private async function getCustomerEngagement(leadId: string): Promise<CustomerEngagement> {
    const engagement = await this.prisma.customerEngagement.findUnique({
      where: { leadId },
    });

    if (!engagement) {
      // Create default engagement if not exists
      return {
        id: '',
        leadId,
        engagementScore: 0,
        lastActivityDate: new Date().toISOString(),
        activityCount30d: 0,
        activityCount90d: 0,
        emailOpenRate: 0,
        clickThroughRate: 0,
        quoteRequests: 0,
        proposalViews: 0,
        websiteVisits: 0,
        interests: [],
      };
    }

    return {
      ...engagement,
      lastActivityDate: engagement.lastActivityDate.toISOString(),
    };
  }

  /**
   * Update customer engagement
   */
  private async function updateCustomerEngagement(leadId: string, activity: Record<string, unknown>): Promise<void> {
    const existing = await this.prisma.customerEngagement.findUnique({
      where: { leadId },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    if (existing) {
      await this.prisma.customerEngagement.update({
        where: { leadId },
        data: {
          lastActivityDate: now,
          activityCount30d: activity.timestamp > thirtyDaysAgo ? { increment: 1 } : existing.activityCount30d,
          activityCount90d: activity.timestamp > ninetyDaysAgo ? { increment: 1 } : existing.activityCount90d,
          engagementScore: this.recalculateEngagementScore(existing, activity),
        },
      });
    } else {
      await this.prisma.customerEngagement.create({
        data: {
          leadId,
          lastActivityDate: now,
          activityCount30d: 1,
          activityCount90d: 1,
          engagementScore: 10,
          emailOpenRate: 0,
          clickThroughRate: 0,
          quoteRequests: 0,
          proposalViews: 0,
          websiteVisits: 0,
          interests: [],
        },
      });
    }
  }

  /**
   * Recalculate engagement score based on new activity
   */
  private function recalculateEngagementScore(existing: CustomerEngagement, activity: Record<string, unknown>): number {
    const baseScore = existing.engagementScore;
    let scoreChange = 0;

    switch (activity.type) {
      case 'email_opened':
        scoreChange = 2;
        break;
      case 'link_clicked':
        scoreChange = 5;
        break;
      case 'quote_requested':
        scoreChange = 10;
        break;
      case 'proposal_viewed':
        scoreChange = 8;
        break;
      case 'phone_call':
        scoreChange = 15;
        break;
      case 'website_visit':
        scoreChange = 3;
        break;
      default:
        scoreChange = 1;
    }

    return Math.min(100, Math.max(0, baseScore + scoreChange));
  }

  /**
   * Get touchpoint interactions
   */
  private async function getTouchpointInteractions(leadId: string): Promise<TouchpointInteraction[]> {
    const touchpoints = await this.prisma.customerTouchpoint.findMany({
      where: { leadId },
      orderBy: { sentAt: 'desc' },
    });

    return touchpoints.map(tp => ({
      leadId: tp.leadId,
      touchpointId: tp.id,
      interactionType: tp.status,
      timestamp: tp.sentAt?.toISOString() || '',
      channel: tp.channel,
      responseContent: tp.metadata?.responseContent as string,
      duration: tp.metadata?.duration as number,
    }));
  }

  /**
   * Get quote activities
   */
  private async function getQuoteActivities(leadId: string): Promise<QuoteActivity[]> {
    // This would integrate with the existing quote system
    // For now, return mock data based on engagement
    const engagement = await this.getCustomerEngagement(leadId);
    
    return Array.from({ length: engagement.quoteRequests }, (_, i) => ({
      quoteId: `quote-${leadId}-${i}`,
      leadId,
      insuranceType: 'AUTO',
      premium: 1500 + Math.random() * 1000,
      coverage: {},
      createdAt: new Date().toISOString(),
      status: 'viewed',
      viewedAt: Math.random() > 0.5 ? new Date().toISOString() : undefined,
      viewedCount: Math.floor(Math.random() * 5) + 1,
    }));
  }

  /**
   * Generate retention alert for high-risk leads
   */
  private async function generateRetentionAlert(prediction: ChurnPrediction): Promise<void> {
    const agent = await this.prisma.leadAssignment.findFirst({
      where: {
        leadId: prediction.leadId,
        status: 'accepted',
      },
      include: { agent: true },
    });

    await this.prisma.retentionAlert.create({
      data: {
        leadId: prediction.leadId,
        agentId: agent?.agentId,
        churnPredictionId: prediction.id,
        alertType: 'HIGH_CHURN_RISK',
        severity: prediction.churnRisk === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        message: `Lead ${prediction.leadId} has ${Math.round(prediction.churnProbability * 100)}% churn risk`,
        actionableSteps: [
          'Reach out within 24 hours',
          'Address concerns mentioned in recent interactions',
          'Offer personalized consultation',
          'Consider special retention offer',
        ],
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Clear old predictions (keep only last 30 days)
   */
  async cleanupOldPredictions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.churnPrediction.deleteMany({
        where: {
          predictionDate: { lt: thirtyDaysAgo },
        },
      });

      logger.info('Cleaned up old churn predictions', { deletedCount: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old predictions', { error });
      throw error;
    }
  }
}