import { logger } from '@insurance-lead-gen/core';
import {
  EVENT_SUBJECTS,
  type LeadGetResponse,
  type LeadProcessedEvent,
  type UnderwritingCompletedEvent,
  type UnderwritingRequestedEvent,
} from '@insurance-lead-gen/types';

import type { NatsEventBus } from '../nats/nats-event-bus.js';
import type { UnderwritingService } from '../underwriting/underwriting.service.js';

export class UnderwritingWorkflow {
  constructor(
    private readonly eventBus: NatsEventBus,
    private readonly underwritingService: UnderwritingService
  ) {}

  async start(): Promise<void> {
    logger.info('Underwriting workflow started');

    void this.processLeadProcessed();
    void this.processUnderwritingRequested();
  }

  private async processLeadProcessed(): Promise<void> {
    const sub = this.eventBus.subscribe(EVENT_SUBJECTS.LeadProcessed);
    logger.info('Underwriting workflow listening for lead.processed events');

    for await (const msg of sub) {
      try {
        const event = this.eventBus.decode<LeadProcessedEvent>(msg.data);
        await this.handleUnderwriting(event.data.leadId, undefined, { trigger: 'lead.processed' });
      } catch (error) {
        logger.error('Error handling lead.processed underwriting trigger', { error });
      }
    }
  }

  private async processUnderwritingRequested(): Promise<void> {
    const sub = this.eventBus.subscribe(EVENT_SUBJECTS.UnderwritingRequested);
    logger.info('Underwriting workflow listening for underwriting.requested events');

    for await (const msg of sub) {
      try {
        const event = this.eventBus.decode<UnderwritingRequestedEvent>(msg.data);
        await this.handleUnderwriting(event.data.leadId, event.data.policyId, event.data.context);
      } catch (error) {
        logger.error('Error handling underwriting.requested event', { error });
      }
    }
  }

  private async handleUnderwriting(
    leadId: string,
    policyId?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    logger.info('Running underwriting', { leadId, policyId });

    const leadResponse = await this.eventBus.request<LeadGetResponse>(EVENT_SUBJECTS.LeadGet, { leadId });

    if (!leadResponse.lead) {
      logger.warn('Lead not found for underwriting', { leadId });
      return;
    }

    const result = await this.underwritingService.underwrite({
      lead: leadResponse.lead,
      context,
    });

    const envelope: UnderwritingCompletedEvent = {
      id: `evt_${Date.now()}`,
      type: EVENT_SUBJECTS.UnderwritingCompleted,
      source: 'orchestrator',
      data: {
        leadId,
        policyId,
        result,
      },
      timestamp: new Date().toISOString(),
    };

    this.eventBus.publish(EVENT_SUBJECTS.UnderwritingCompleted, envelope);

    logger.info('Underwriting completed and event published', {
      leadId,
      policyId,
      decision: result.decision,
      riskScore: result.riskScore,
    });
  }
}
