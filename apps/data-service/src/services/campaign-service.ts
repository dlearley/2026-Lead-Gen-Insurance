/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars, @typescript-eslint/prefer-nullish-coalescing */
import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  RetentionCampaign,
  CampaignTouchpoint,
  CreateRetentionCampaignDto,
  CampaignStatus,
  TouchpointStatus,
} from '@insurance-lead-gen/types';

export class CampaignService {
  constructor(private prisma: PrismaClient) {}

  async createCampaign(
    dto: CreateRetentionCampaignDto,
    createdBy: string
  ): Promise<RetentionCampaign> {
    try {
      const campaign = await this.prisma.retentionCampaign.create({
        data: {
          name: dto.name,
          description: dto.description,
          type: dto.type.toUpperCase(),
          status: 'DRAFT',
          targetSegment: dto.targetSegment,
          schedule: dto.schedule,
          touchpoints: dto.touchpoints,
          goals: dto.goals,
          createdBy,
        },
      });

      return this.mapCampaignFromDb(campaign);
    } catch (error) {
      logger.error('Error creating retention campaign', { dto, error });
      throw error;
    }
  }

  async getCampaign(campaignId: string): Promise<RetentionCampaign | null> {
    try {
      const campaign = await this.prisma.retentionCampaign.findUnique({
        where: { id: campaignId },
      });

      return campaign ? this.mapCampaignFromDb(campaign) : null;
    } catch (error) {
      logger.error('Error fetching campaign', { campaignId, error });
      throw error;
    }
  }

  async updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus
  ): Promise<RetentionCampaign> {
    try {
      const campaign = await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: { status: status.toUpperCase() },
      });

      // If activating campaign, create touchpoints for target customers
      if (status === 'active') {
        await this.createCampaignTouchpoints(campaignId);
      }

      return this.mapCampaignFromDb(campaign);
    } catch (error) {
      logger.error('Error updating campaign status', { campaignId, status, error });
      throw error;
    }
  }

  async listCampaigns(
    filters: {
      status?: CampaignStatus;
      type?: string;
      createdBy?: string;
    } = {}
  ): Promise<RetentionCampaign[]> {
    try {
      const whereClause: any = {};

      if (filters.status) {
        whereClause.status = filters.status.toUpperCase();
      }
      if (filters.type) {
        whereClause.type = filters.type.toUpperCase();
      }
      if (filters.createdBy) {
        whereClause.createdBy = filters.createdBy;
      }

      const campaigns = await this.prisma.retentionCampaign.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      return campaigns.map((c) => this.mapCampaignFromDb(c));
    } catch (error) {
      logger.error('Error listing campaigns', { filters, error });
      throw error;
    }
  }

  async createCampaignTouchpoints(campaignId: string): Promise<number> {
    try {
      const campaign = await this.prisma.retentionCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const targetSegment = campaign.targetSegment;
      const touchpointsConfig = campaign.touchpoints as any[];

      // Find customers matching target segment
      const customers = await this.findTargetCustomers(targetSegment);

      logger.info('Creating touchpoints for campaign', {
        campaignId,
        customersFound: customers.length,
        touchpointsPerCustomer: touchpointsConfig.length,
      });

      // Create touchpoints for each customer
      let touchpointsCreated = 0;
      const now = new Date();

      for (const customer of customers) {
        for (const touchpointConfig of touchpointsConfig) {
          const scheduledFor = new Date(now.getTime() + touchpointConfig.delay * 60 * 1000);

          await this.prisma.campaignTouchpoint.create({
            data: {
              campaignId,
              customerId: customer.id,
              type: touchpointConfig.type.toUpperCase(),
              status: 'PENDING',
              content: {
                template: touchpointConfig.template,
                subject: this.generateSubject(touchpointConfig.template, customer),
                body: this.generateBody(touchpointConfig.template, customer),
                personalization: {
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  email: customer.email,
                },
              },
              scheduledFor,
            },
          });

          touchpointsCreated++;
        }
      }

      // Update campaign with target count
      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: {
          customersTargeted: customers.length,
        },
      });

      logger.info('Campaign touchpoints created', {
        campaignId,
        touchpointsCreated,
      });

      return touchpointsCreated;
    } catch (error) {
      logger.error('Error creating campaign touchpoints', { campaignId, error });
      throw error;
    }
  }

  async getPendingTouchpoints(limit = 100): Promise<CampaignTouchpoint[]> {
    try {
      const touchpoints = await this.prisma.campaignTouchpoint.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: new Date(),
          },
        },
        take: limit,
        orderBy: { scheduledFor: 'asc' },
      });

      return touchpoints.map((t) => this.mapTouchpointFromDb(t));
    } catch (error) {
      logger.error('Error fetching pending touchpoints', { error });
      throw error;
    }
  }

  async updateTouchpointStatus(
    touchpointId: string,
    status: TouchpointStatus,
    metadata?: Record<string, unknown>
  ): Promise<CampaignTouchpoint> {
    try {
      const updateData: any = {
        status: status.toUpperCase(),
      };

      const now = new Date();
      if (status === 'sent') updateData.sentAt = now;
      if (status === 'delivered') updateData.deliveredAt = now;
      if (status === 'opened') updateData.openedAt = now;
      if (status === 'clicked') updateData.clickedAt = now;
      if (status === 'responded') updateData.respondedAt = now;

      if (metadata) {
        updateData.metadata = metadata;
      }

      const touchpoint = await this.prisma.campaignTouchpoint.update({
        where: { id: touchpointId },
        data: updateData,
      });

      // Update campaign metrics
      await this.updateCampaignMetrics(touchpoint.campaignId);

      return this.mapTouchpointFromDb(touchpoint);
    } catch (error) {
      logger.error('Error updating touchpoint status', { touchpointId, status, error });
      throw error;
    }
  }

  async updateCampaignMetrics(campaignId: string): Promise<void> {
    try {
      const touchpoints = await this.prisma.campaignTouchpoint.findMany({
        where: { campaignId },
      });

      const reached = touchpoints.filter((t) =>
        ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'RESPONDED'].includes(t.status)
      ).length;

      const engaged = touchpoints.filter((t) =>
        ['OPENED', 'CLICKED', 'RESPONDED'].includes(t.status)
      ).length;

      // Get unique customers who responded
      const respondedCustomers = new Set(
        touchpoints.filter((t) => t.status === 'RESPONDED').map((t) => t.customerId)
      );

      await this.prisma.retentionCampaign.update({
        where: { id: campaignId },
        data: {
          customersReached: reached,
          customersEngaged: engaged,
          customersRetained: respondedCustomers.size,
        },
      });

      logger.debug('Campaign metrics updated', { campaignId, reached, engaged });
    } catch (error) {
      logger.error('Error updating campaign metrics', { campaignId, error });
      throw error;
    }
  }

  private async findTargetCustomers(targetSegment: {
    churnRisk?: string[];
    healthScoreRange?: { min?: number; max?: number };
    tenure?: { min?: number; max?: number };
    policyTypes?: string[];
  }): Promise<Array<{ id: string; firstName: string; lastName: string; email: string }>> {
    const whereClause: any = {};

    if (targetSegment.churnRisk && targetSegment.churnRisk.length > 0) {
      whereClause.churnRisk = {
        in: targetSegment.churnRisk.map((r: string) => r.toUpperCase()),
      };
    }

    if (targetSegment.healthScoreRange) {
      whereClause.healthScore = {
        gte: targetSegment.healthScoreRange.min || 0,
        lte: targetSegment.healthScoreRange.max || 100,
      };
    }

    if (targetSegment.tenure) {
      const now = new Date();
      if (targetSegment.tenure.min) {
        const maxDate = new Date();
        maxDate.setMonth(now.getMonth() - targetSegment.tenure.min);
        whereClause.customerSince = { lte: maxDate };
      }
      if (targetSegment.tenure.max) {
        const minDate = new Date();
        minDate.setMonth(now.getMonth() - targetSegment.tenure.max);
        if (whereClause.customerSince) {
          whereClause.customerSince.gte = minDate;
        } else {
          whereClause.customerSince = { gte: minDate };
        }
      }
    }

    // If policy types specified, find customers with those policy types
    if (targetSegment.policyTypes && targetSegment.policyTypes.length > 0) {
      const customersWithPolicies = await this.prisma.customer.findMany({
        where: {
          ...whereClause,
          policies: {
            some: {
              policyType: {
                in: targetSegment.policyTypes.map((t: string) => t.toUpperCase()),
              },
            },
          },
        },
      });
      return customersWithPolicies;
    }

    const customers = await this.prisma.customer.findMany({
      where: whereClause,
    });

    return customers;
  }

  private generateSubject(template: string, customer: { firstName: string }): string {
    const templates: Record<string, string> = {
      renewal_reminder: `${customer.firstName}, Your Policy Renewal is Coming Up`,
      engagement: `We Miss You, ${customer.firstName}!`,
      winback: `Special Offer Just for You, ${customer.firstName}`,
      cross_sell: `Protect More of What Matters, ${customer.firstName}`,
      upsell: `Enhance Your Coverage Today`,
      loyalty: `Thank You for Being a Valued Customer!`,
    };

    return templates[template] || `Important Update from Your Insurance Provider`;
  }

  private generateBody(template: string, customer: { firstName: string }): string {
    const templates: Record<string, string> = {
      renewal_reminder: `Hi ${customer.firstName},\n\nYour policy is up for renewal soon. We want to make sure you continue to have the coverage you need.\n\nContact us to review your options and ensure continuous protection.`,
      engagement: `Hi ${customer.firstName},\n\nWe noticed it's been a while since we last connected. We're here to help with any questions about your coverage.\n\nLet's catch up!`,
      winback: `Hi ${customer.firstName},\n\nWe value your business and want you back. Here's a special offer to show our appreciation.\n\nLet's talk about getting you protected again.`,
      cross_sell: `Hi ${customer.firstName},\n\nDid you know you could save by bundling your policies? Let us show you how to protect more while spending less.`,
      upsell: `Hi ${customer.firstName},\n\nYour current coverage is good, but we can help you get even better protection at a great value.`,
      loyalty: `Hi ${customer.firstName},\n\nThank you for trusting us with your insurance needs. We appreciate your loyalty and are always here for you.`,
    };

    return (
      templates[template] ||
      `Hi ${customer.firstName},\n\nWe have an important update for you regarding your insurance coverage.`
    );
  }

  private mapCampaignFromDb(dbCampaign: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: string;
    targetSegment: unknown;
    schedule: unknown;
    touchpoints: unknown;
    goals: unknown;
    customersTargeted: number;
    customersReached: number;
    customersEngaged: number;
    customersRetained: number;
    revenueGenerated: number;
    roi: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): RetentionCampaign {
    return {
      id: dbCampaign.id,
      name: dbCampaign.name,
      description: dbCampaign.description,
      type: dbCampaign.type.toLowerCase() as any,
      status: dbCampaign.status.toLowerCase() as CampaignStatus,
      targetSegment: dbCampaign.targetSegment as any,
      schedule: dbCampaign.schedule as any,
      touchpoints: dbCampaign.touchpoints as any,
      goals: dbCampaign.goals as any,
      performance: {
        customersTargeted: dbCampaign.customersTargeted,
        customersReached: dbCampaign.customersReached,
        customersEngaged: dbCampaign.customersEngaged,
        customersRetained: dbCampaign.customersRetained,
        revenueGenerated: dbCampaign.revenueGenerated,
        roi: dbCampaign.roi,
      },
      createdBy: dbCampaign.createdBy,
      createdAt: dbCampaign.createdAt,
      updatedAt: dbCampaign.updatedAt,
    };
  }

  private mapTouchpointFromDb(dbTouchpoint: {
    id: string;
    campaignId: string;
    customerId: string;
    type: string;
    status: string;
    content: unknown;
    scheduledFor: Date;
    sentAt: Date | null;
    deliveredAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    respondedAt: Date | null;
    response: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): CampaignTouchpoint {
    return {
      id: dbTouchpoint.id,
      campaignId: dbTouchpoint.campaignId,
      customerId: dbTouchpoint.customerId,
      type: dbTouchpoint.type.toLowerCase() as any,
      status: dbTouchpoint.status.toLowerCase() as TouchpointStatus,
      content: dbTouchpoint.content as any,
      scheduledFor: dbTouchpoint.scheduledFor,
      sentAt: dbTouchpoint.sentAt,
      deliveredAt: dbTouchpoint.deliveredAt,
      openedAt: dbTouchpoint.openedAt,
      clickedAt: dbTouchpoint.clickedAt,
      respondedAt: dbTouchpoint.respondedAt,
      response: dbTouchpoint.response,
      metadata: dbTouchpoint.metadata as any,
      createdAt: dbTouchpoint.createdAt,
      updatedAt: dbTouchpoint.updatedAt,
    };
  }
}
