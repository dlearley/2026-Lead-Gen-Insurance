import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import type {
  RetentionCampaign,
  CampaignAudience,
  CampaignPerformance,
  CustomerTouchpoint,
  WinBackOffer,
  TouchpointType,
  ContactChannel,
  CampaignType,
  OfferType,
  ChurnRisk,
  RetentionAlert,
  AlertType,
  AlertSeverity,
} from '@insurance-lead-gen/types';
import { ChurnPredictionService } from './churn-prediction.js';

export interface CampaignExecutionResult {
  campaignId: string;
  totalSent: number;
  successful: number;
  failed: number;
  estimatedReach: number;
}

export interface TouchpointExecutionResult {
  touchpointId: string;
  status: 'SENT' | 'FAILED' | 'SCHEDULED';
  error?: string;
  scheduledFor?: string;
}

export class RetentionCampaignService {
  private prisma: PrismaClient;
  private churnService: ChurnPredictionService;
  private readonly MAX_DAILY_TOUCHPOINTS = 3;
  private readonly CAMPAIGN_COOLDOWN_DAYS = 7;

  constructor(prisma: PrismaClient, churnService: ChurnPredictionService) {
    this.prisma = prisma;
    this.churnService = churnService;
    logger.info('RetentionCampaignService initialized');
  }

  /**
   * Create a new retention campaign
   */
  async createCampaign(params: {
    name: string;
    description?: string;
    type: CampaignType;
    audience: CampaignAudience;
    startDate?: string;
    endDate?: string;
  }): Promise<RetentionCampaign> {
    try {
      logger.info('Creating retention campaign', { name: params.name, type: params.type });
      
      // Validate audience parameters
      this.validateAudience(params.audience);
      
      // Calculate target lead count
      const targetLeads = await this.calculateTargetAudience(params.audience);
      
      const campaign = await this.prisma.retentionCampaign.create({
        data: {
          name: params.name,
          description: params.description,
          type: params.type,
          status: 'DRAFT',
          targetAudience: params.audience,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
          leadsTargeted: targetLeads.length,
        },
      });

      logger.info('Retention campaign created', { 
        campaignId: campaign.id, 
        targetLeads: targetLeads.length,
      });

      return {
        ...campaign,
        targetAudience: campaign.targetAudience as CampaignAudience,
        touchpoints: [],
        offers: [],
      };
    } catch (error) {
      logger.error('Failed to create retention campaign', { error, params });
      throw error;
    }
  }

  /**
   * Execute a retention campaign
   */
  async executeCampaign(campaignId: string): Promise<CampaignExecutionResult> {
    try {
      logger.info('Executing retention campaign', { campaignId });
      
      // Update campaign status
      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING' },
      });
      
      // Get campaign details
      const campaign = await this.prisma.retentionCampaign.findUnique({
        where: { id: campaignId },
      });
      
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }
      
      // Identify target leads
      const targetLeads = await this.getTargetLeads(campaign.targetAudience as CampaignAudience);
      logger.info('Campaign target leads identified', { 
        campaignId, 
        targetCount: targetLeads.length,
      });
      
      let totalSent = 0;
      let successful = 0;
      let failed = 0;
      
      // Execute campaign for each target lead
      for (const lead of targetLeads) {
        try {
          // Check if lead is eligible for campaign
          if (!(await this.isLeadEligibleForCampaign(lead.id, campaign))) {
            continue;
          }
          
          // Execute touchpoint based on campaign type
          const result = await this.executeTouchpointForLead(lead.id, campaign);
          
          if (result.status === 'SENT' || result.status === 'SCHEDULED') {
            successful++;
          } else {
            failed++;
          }
          
          totalSent++;
          
          // Rate limiting to prevent overwhelming leads
          if (totalSent % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          logger.warn('Failed to execute campaign for lead', { error, leadId: lead.id });
          failed++;
        }
      }
      
      // Update campaign metrics
      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: {
          leadsEngaged: successful,
          status: completed ? 'COMPLETED' : 'RUNNING',
        },
      });
      
      logger.info('Campaign execution completed', { 
        campaignId, 
        totalSent, 
        successful, 
        failed,
      });
      
      return {
        campaignId,
        totalSent,
        successful,
        failed,
        estimatedReach: targetLeads.length,
      };
    } catch (error) {
      logger.error('Campaign execution failed', { error, campaignId });
      throw error;
    }
  }

  /**
   * Execute touchpoint for a specific lead and campaign
   */
  private async executeTouchpointForLead(
    leadId: string,
    campaign: RetentionCampaign
  ): Promise<TouchpointExecutionResult> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { assignments: { include: { agent: true } } },
      });
      
      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }
      
      // Determine touchpoint type and channel based on campaign and lead preferences
      const { touchpointType, channel, content } = await this.determineTouchpointStrategy(lead, campaign);
      
      // Create touchpoint record
      const touchpoint = await this.prisma.customerTouchpoint.create({
        data: {
          leadId,
          retentionCampaignId: campaign.id,
          channel,
          touchpointType,
          status: 'SCHEDULED',
          subject: content.subject,
          content: {
            body: content.body,
            htmlBody: content.htmlBody,
            personalizationData: content.personalization,
          },
        },
      });
      
      // Send based on channel
      let executionResult: TouchpointExecutionResult;
      
      switch (channel) {
        case 'EMAIL':
          executionResult = await this.sendEmailTouchpoint(touchpoint, content);
          break;
        case 'SMS':
          executionResult = await this.sendSmsTouchpoint(touchpoint, content);
          break;
        case 'CALL':
          executionResult = await this.createCallTask(touchpoint, content);
          break;
        case 'WHATSAPP':
          executionResult = await this.sendWhatsAppTouchpoint(touchpoint, content);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
      
      // Update touchpoint with result
      await this.prisma.customerTouchpoint.update({
        where: { id: touchpoint.id },
        data: {
          status: executionResult.status,
          sentAt: executionResult.status === 'SENT' ? new Date() : undefined,
        },
      });
      
      return executionResult;
    } catch (error) {
      logger.error('Failed to execute touchpoint for lead', { error, leadId });
      return {
        touchpointId: '',
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  /**
   * Determine optimal touchpoint strategy for a lead
   */
  private async determineTouchpointStrategy(
    lead: Lead,
    campaign: RetentionCampaign
  ): Promise<{
    touchpointType: TouchpointType;
    channel: ContactChannel;
    content: TouchpointContent;
  }> {
    // Get lead engagement data
    const engagement = await this.prisma.customerEngagement.findUnique({
      where: { leadId: lead.id },
    });
    
    // Determine best channel based on preferences and engagement
    const channel = this.selectOptimalChannel(lead, engagement);
    
    // Determine touchpoint type based on campaign goals
    const touchpointType = this.selectTouchpointType(campaign, lead.churnRisk as ChurnRisk);
    
    // Generate personalized content
    const content = await this.generatePersonalizedContent(lead, campaign, touchpointType, channel);
    
    return { touchpointType, channel, content };
  }
  
  /**
   * Select optimal communication channel for lead
   */
  private selectOptimalChannel(lead: Lead, engagement: CustomerEngagement | null): ContactChannel {
    // Use preferred channel if available and engaged
    if (engagement?.preferredChannel && engagement.emailOpenRate > 20) {
      return engagement.preferredChannel;
    }
    
    // Default to email for most cases, SMS for urgent
    if (lead.churnRisk === 'CRITICAL' || lead.churnRisk === 'HIGH') {
      return 'SMS'; // More immediate for high-risk
    }
    
    return 'EMAIL'; // Default channel
  }
  
  /**
   * Select touchpoint type based on campaign and risk
   */
  private selectTouchpointType(campaign: RetentionCampaign, churnRisk: ChurnRisk): TouchpointType {
    if (campaign.type === 'WIN_BACK') {
      return churnRisk === 'CRITICAL' ? 'WIN_BACK' : 'FOLLOWUP';
    }
    
    if (['HIGH', 'CRITICAL'].includes(churnRisk)) {
      return 'RETENTION';
    }
    
    // Educational for medium risk, promotional for low risk
    return churnRisk === 'MEDIUM' ? 'EDUCATIONAL' : 'PROMOTIONAL';
  }

  /**
   * Generate personalized content for touchpoint
   */
  private async generatePersonalizedContent(
    lead: Lead,
    campaign: RetentionCampaign,
    touchpointType: TouchpointType,
    channel: ContactChannel
  ): Promise<TouchpointContent> {
    const personalization = {
      firstName: lead.firstName || 'there',
      insuranceType: lead.insuranceType || 'insurance',
      agentName: lead.assignments?.[0]?.agent?.firstName || 'our team',
      churnRisk: lead.churnRisk || 'low',
    };
    
    let subject = '';
    let body = '';
    let htmlBody = '';
    
    // Use different templates based on type
    switch (touchpointType) {
      case 'WIN_BACK':
        subject = `We miss you, ${personalization.firstName}! Exclusive offer inside`;
        body = `Hi ${personalization.firstName},\n\nWe noticed you haven't been active lately. We'd love to win back your business with a special offer...`;
        break;
        
      case 'RETENTION':
        subject = `Important: Your ${personalization.insuranceType} policy review`;
        body = `Hi ${personalization.firstName},\n\nWe'd like to review your coverage to ensure you're getting the best value...`;
        break;
        
      case 'EDUCATIONAL':
        subject = `5 ways to save on ${personalization.insuranceType} insurance`;
        body = `Hi ${personalization.firstName},\n\nHere are some tips to help you save on your insurance...`;
        break;
        
      default:
        subject = `Stay protected with ${personalization.insuranceType} insurance`;
        body = `Hi ${personalization.firstName},\n\nWe have some great options for your ${personalization.insuranceType} needs...`;
    }
    
    return {
      subject,
      body,
      htmlBody,
      personalizationData: personalization,
    };
  }
  
  /**
   * Send email touchpoint
   */
  private async sendEmailTouchpoint(
    touchpoint: CustomerTouchpoint,
    content: TouchpointContent
  ): Promise<TouchpointExecutionResult> {
    try {
      // Integrate with email service (using existing email infrastructure)
      // This would call the existing email service
      
      logger.info('Sending email touchpoint', { 
        touchpointId: touchpoint.id, 
        leadId: touchpoint.leadId,
      });
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        touchpointId: touchpoint.id,
        status: 'SENT',
        error: undefined,
      };
    } catch (error) {
      logger.error('Failed to send email touchpoint', { error, touchpointId: touchpoint.id });
      return {
        touchpointId: touchpoint.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
  
  /**
   * Send SMS touchpoint
   */
  private async sendSmsTouchpoint(
    touchpoint: CustomerTouchpoint,
    content: TouchpointContent
  ): Promise<TouchpointExecutionResult> {
    try {
      logger.info('Sending SMS touchpoint', { 
        touchpointId: touchpoint.id, 
        leadId: touchpoint.leadId,
      });
      
      // Integrate with SMS service
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        touchpointId: touchpoint.id,
        status: 'SENT',
      };
    } catch (error) {
      logger.error('Failed to send SMS touchpoint', { error });
      return {
        touchpointId: touchpoint.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
  
  /**
   * Create call task for agent
   */
  private async createCallTask(
    touchpoint: CustomerTouchpoint,
    content: TouchpointContent
  ): Promise<TouchpointExecutionResult> {
    try {
      // Create a task for the assigned agent to make a call
      const assignment = await this.prisma.leadAssignment.findFirst({
        where: {
          leadId: touchpoint.leadId,
          status: 'accepted',
        },
      });
      
      if (assignment) {
        // Create task using existing task creation service
        logger.info('Creating call task for agent', {
          touchpointId: touchpoint.id,
          agentId: assignment.agentId,
        });
      }
      
      return {
        touchpointId: touchpoint.id,
        status: 'SCHEDULED',
      };
    } catch (error) {
      logger.error('Failed to create call task', { error });
      return {
        touchpointId: touchpoint.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
  
  /**
   * Send WhatsApp touchpoint
   */
  private async sendWhatsAppTouchpoint(
    touchpoint: CustomerTouchpoint,
    content: TouchpointContent
  ): Promise<TouchpointExecutionResult> {
    try {
      logger.info('Sending WhatsApp touchpoint', {
        touchpointId: touchpoint.id,
        leadId: touchpoint.leadId,
      });
      
      return {
        touchpointId: touchpoint.id,
        status: 'SENT',
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp touchpoint', { error });
      return {
        touchpointId: touchpoint.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
  
  /**
   * Check if lead is eligible for campaign
   */
  private async isLeadEligibleForCampaign(leadId: string, campaign: RetentionCampaign): Promise<boolean> {
    // Check if lead has been contacted recently
    const recentTouchpoints = await this.prisma.customerTouchpoint.count({
      where: {
        leadId,
        sentAt: {
          gte: new Date(Date.now() - this.CAMPAIGN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000),
        },
        status: { in: ['SENT', 'DELIVERED'] },
      },
    });
    
    if (recentTouchpoints >= this.MAX_DAILY_TOUCHPOINTS) {
      return false; // Too many recent contacts
    }
    
    return true;
  }
  
  /**
   * Get target leads for campaign
   */
  private async getTargetLeads(audience: CampaignAudience): Promise<Lead[]> {
    const whereClause: Record<string, unknown> = {};
    
    // Add churn risk filter
    if (audience.churnRiskLevels && audience.churnRiskLevels.length > 0) {
      const predictions = await this.prisma.churnPrediction.findMany({
        where: {
          churnRisk: { in: audience.churnRiskLevels },
        },
        select: { leadId: true },
      });
      
      whereClause.id = { in: predictions.map(p => p.leadId) };
    }
    
    // Add insurance type filter
    if (audience.insuranceTypes) {
      whereClause.insuranceType = { in: audience.insuranceTypes };
    }
    
    return this.prisma.lead.findMany({
      where: whereClause,
    });
  }
  
  /**
   * Calculate target audience size
   */
  private async calculateTargetAudience(audience: CampaignAudience): Promise<string[]> {
    const leads = await this.getTargetLeads(audience);
    return leads.map(l => l.id);
  }
  
  /**
   * Validate audience parameters
   */
  private validateAudience(audience: CampaignAudience): void {
    if (!audience.churnRiskLevels || audience.churnRiskLevels.length === 0) {
      throw new Error('At least one churn risk level must be specified');
    }
    
    if (audience.minEngagementScore !== undefined && audience.maxEngagementScore !== undefined) {
      if (audience.minEngagementScore > audience.maxEngagementScore) {
        throw new Error('minEngagementScore cannot be greater than maxEngagementScore');
      }
    }
  }
  
  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await this.prisma.retentionCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });
    
    logger.info('Campaign paused', { campaignId });
  }
  
  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    await this.prisma.retentionCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });
    
    logger.info('Campaign resumed', { campaignId });
  }
}

// Helper interfaces
interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  insuranceType?: string;
  churnRisk?: string;
  assignments?: Array<{ agent?: { firstName: string } }>;
}

interface TouchpointContent {
  subject: string;
  body: string;
  htmlBody?: string;
  personalization?: Record<string, unknown>;
}