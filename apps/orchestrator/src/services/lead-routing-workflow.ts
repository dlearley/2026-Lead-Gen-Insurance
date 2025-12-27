import { logger } from '@insurance-lead-gen/core';
import { EVENT_SUBJECTS, type LeadProcessedEvent, type LeadGetResponse, type AgentsMatchResponse, type LeadAssignResponse } from '@insurance-lead-gen/types';
import { NatsEventBus } from '../nats/nats-event-bus.js';
import { RankingService } from './ranking.service.js';
import { RoutingService, RoutingStrategy } from './routing.service.js';

export class LeadRoutingWorkflow {
  constructor(
    private readonly eventBus: NatsEventBus,
    private readonly rankingService: RankingService,
    private readonly routingService: RoutingService
  ) {}

  async start(): Promise<void> {
    const sub = this.eventBus.subscribe(EVENT_SUBJECTS.LeadProcessed);
    logger.info('Lead routing workflow started, listening for lead.processed events');

    for await (const msg of sub) {
      try {
        const event = this.eventBus.decode<LeadProcessedEvent>(msg.data);
        const { leadId } = event.data;

        logger.info('Processing lead for routing', { leadId });

        // 1. Get lead details
        const leadResponse = await this.eventBus.request<LeadGetResponse>(
          EVENT_SUBJECTS.LeadGet,
          { leadId }
        );

        if (!leadResponse.lead) {
          logger.warn('Lead not found for routing', { leadId });
          continue;
        }

        const lead = leadResponse.lead;

        // 2. Get matching agents
        const agentsResponse = await this.eventBus.request<AgentsMatchResponse>(
          EVENT_SUBJECTS.AgentsMatch,
          {
            insuranceType: lead.insuranceType,
            state: lead.address?.state,
            limit: 10
          }
        );

        const agents = agentsResponse.agents;
        if (!agents || agents.length === 0) {
          logger.warn('No agents found for lead', { leadId, insuranceType: lead.insuranceType });
          continue;
        }

        // 3. Rank agents
        const rankedAgents = this.rankingService.rankAgents(lead, agents);
        logger.info('Agents ranked', { leadId, agentCount: rankedAgents.length });

        // 4. Select best agent using routing strategy
        const selectedAgent = await this.routingService.selectAgent(
          rankedAgents,
          RoutingStrategy.LOAD_BALANCING,
          { lead }
        );

        if (!selectedAgent) {
          logger.warn('Failed to select an agent', { leadId });
          continue;
        }

        // 5. Assign lead to agent
        const assignResponse = await this.eventBus.request<LeadAssignResponse>(
          EVENT_SUBJECTS.LeadAssign,
          {
            leadId,
            agentId: selectedAgent.id,
            strategy: RoutingStrategy.LOAD_BALANCING
          }
        );

        if (assignResponse.success) {
          logger.info('Lead successfully assigned', {
            leadId,
            agentId: selectedAgent.id,
            assignmentId: assignResponse.assignmentId
          });
        } else {
          logger.error('Failed to assign lead', {
            leadId,
            agentId: selectedAgent.id,
            error: assignResponse.error
          });
        }
      } catch (error) {
        logger.error('Error in lead routing workflow', { error });
      }
    }
  }
}
