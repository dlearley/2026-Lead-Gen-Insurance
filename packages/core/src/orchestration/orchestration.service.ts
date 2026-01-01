import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';
import type {
  Campaign,
  CreateCampaignDto,
  CampaignStep,
  ChannelType,
  LeadState,
  LeadStage,
  AttributionLog,
  TouchpointType,
} from '@insurance-lead-gen/types';

export class MultiChannelMessagingService {
  constructor(private prisma: PrismaClient) {}

  async sendMessage(
    leadId: string,
    channel: ChannelType,
    content: string,
    metadata?: any
  ): Promise<string> {
    try {
      logger.info('Sending multi-channel message', { leadId, channel });
      const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
      await this.prisma.orchestrationEvent.create({
        data: {
          leadId,
          type: 'MESSAGE_SENT',
          channel,
          data: { messageId, content: content.substring(0, 100), ...metadata },
        },
      });
      return messageId;
    } catch (error) {
      logger.error('Error sending message', { leadId, channel, error });
      throw error;
    }
  }
}

export class LeadStateService {
  constructor(private prisma: PrismaClient) {}

  async updateLeadState(leadId: string, stage: LeadStage, metadata?: any): Promise<LeadState> {
    try {
      const state = await this.prisma.leadState.upsert({
        where: { leadId },
        update: { stage, lastContactAt: new Date(), metadata: metadata ? { ...(metadata as any) } : undefined },
        create: { leadId, stage, lastContactAt: new Date(), metadata: metadata ? { ...(metadata as any) } : {} },
      });
      return state as unknown as LeadState;
    } catch (error) {
      logger.error('Error updating lead state', { leadId, stage, error });
      throw error;
    }
  }

  async getLeadState(leadId: string): Promise<LeadState | null> {
    const state = await this.prisma.leadState.findUnique({ where: { leadId } });
    return state as unknown as LeadState;
  }
}

export class CampaignOrchestrationService {
  constructor(
    private prisma: PrismaClient,
    private messagingService: MultiChannelMessagingService,
    private leadStateService: LeadStateService
  ) {}

  async enrollLead(leadId: string, campaignId: string): Promise<void> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      if (!campaign || campaign.status !== 'ACTIVE') throw new Error('Campaign not found or not active');
      await this.prisma.campaignLead.create({
        data: { campaignId, leadId, status: 'ACTIVE', currentStepOrder: 0, nextActionAt: new Date() },
      });
      logger.info('Lead enrolled in campaign', { leadId, campaignId });
    } catch (error) {
      logger.error('Error enrolling lead in campaign', { leadId, campaignId, error });
      throw error;
    }
  }

  async processCampaigns(): Promise<void> {
    try {
      const pendingLeads = await this.prisma.campaignLead.findMany({
        where: { status: 'ACTIVE', nextActionAt: { lte: new Date() } },
        include: { campaign: { include: { steps: true } } },
      });
      for (const enrollment of pendingLeads) {
        await this.executeNextStep(enrollment);
      }
    } catch (error) {
      logger.error('Error processing campaigns', { error });
    }
  }

  private async executeNextStep(enrollment: any): Promise<void> {
    const steps = enrollment.campaign.steps as any[];
    const currentStep = steps.find((s: any) => s.order === enrollment.currentStepOrder);
    if (!currentStep) {
      await this.prisma.campaignLead.update({ where: { id: enrollment.id }, data: { status: 'COMPLETED' } });
      return;
    }

    const template = currentStep.messageTemplateId ? await this.prisma.channelMessage.findUnique({ where: { id: currentStep.messageTemplateId } }) : null;
    const content = template ? template.content : 'Default content';
    await this.messagingService.sendMessage(enrollment.leadId, currentStep.channel, content, { campaignId: enrollment.campaignId, stepId: currentStep.id });

    const followingStep = steps.find((s: any) => s.order === enrollment.currentStepOrder + 1);
    await this.prisma.campaignLead.update({
      where: { id: enrollment.id },
      data: {
        currentStepOrder: enrollment.currentStepOrder + 1,
        lastActionAt: new Date(),
        nextActionAt: followingStep ? new Date(Date.now() + followingStep.delaySeconds * 1000) : null,
      },
    });
  }
}

export class AttributionService {
  constructor(private prisma: PrismaClient) {}

  async logTouchpoint(leadId: string, channel: ChannelType, type: TouchpointType, metadata?: any): Promise<void> {
    try {
      let weight = 0.33;
      if (type === 'FIRST_TOUCH') weight = 0.5;
      if (type === 'LAST_TOUCH') weight = 0.5;
      await this.prisma.attributionLog.create({ data: { leadId, channel, touchpointType: type, weight, metadata: metadata || {} } });
    } catch (error) {
      logger.error('Error logging touchpoint', { leadId, channel, error });
    }
  }

  async calculateAttribution(leadId: string): Promise<any> {
    const logs = await this.prisma.attributionLog.findMany({ where: { leadId }, orderBy: { timestamp: 'asc' } });
    if (logs.length === 0) return {};
    const lastClick = logs[logs.length - 1];
    const linearWeights: Record<string, number> = {};
    const weightPerLog = 1 / logs.length;
    logs.forEach((log) => { linearWeights[log.channel] = (linearWeights[log.channel] || 0) + weightPerLog; });
    return { lastClick: lastClick.channel, linear: linearWeights, touchpoints: logs.length };
  }
}
