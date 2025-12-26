import { logger } from '@insurance-lead-gen/core';
import { EVENT_SUBJECTS, type Lead, type Agent, type LeadAssignment } from '@insurance-lead-gen/types';
import { NatsEventBus } from './nats/nats-event-bus.js';
import { RankingService, RankedAgent } from './services/ranking.service.js';

export interface RoutingDecision {
  leadId: string;
  assignments: Array<{
    agentId: string;
    score: number;
    confidence: number;
    routingFactors: any;
  }>;
}

export interface RoutingConfig {
  minConfidenceThreshold: number;
  maxAgentsPerLead: number;
  enableRoundRobin: boolean;
  enableLoadBalancing: boolean;
  enableGraphBasedRouting: boolean;
  notificationTimeoutMs: number;
  escalationTimeoutMs: number;
}

const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  minConfidenceThreshold: 0.7,
  maxAgentsPerLead: 3,
  enableRoundRobin: true,
  enableLoadBalancing: true,
  enableGraphBasedRouting: true,
  notificationTimeoutMs: 300000, // 5 minutes
  escalationTimeoutMs: 900000, // 15 minutes
};

export class RoutingService {
  private config: RoutingConfig;
  private rankingService: RankingService;

  constructor(private eventBus: NatsEventBus) {
    this.config = DEFAULT_ROUTING_CONFIG;
    this.rankingService = new RankingService();

    logger.info('Routing service initialized', {
      config: this.config
    });
  }

  async routeLead(leadId: string): Promise<RoutingDecision> {
    logger.info('Starting lead routing', { leadId });

    try {
      // 1. Get lead details
      const { lead } = await this.eventBus.request<{ lead: Lead }>(
        EVENT_SUBJECTS.LeadGet,
        { leadId }
      );

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // 2. Get candidate agents from data-service (via Neo4j)
      const location = `${lead.address?.city || ''}, ${lead.address?.state || ''}`;
      const { agents: candidates } = await this.eventBus.request<{ agents: Agent[] }>(
        EVENT_SUBJECTS.AgentsMatch,
        { 
          leadId, 
          insuranceType: lead.insuranceType,
          location,
          limit: 10 // Get more than we need for better ranking
        }
      );

      if (!candidates || candidates.length === 0) {
        throw new Error('No candidate agents found for lead routing');
      }

      // 3. Rank candidates using RankingService
      const rankedAgents = this.rankingService.rankAgents(lead, candidates);

      // 4. Select top N agents based on config
      const selectedAgents = rankedAgents
        .filter(a => (a.score / 100) >= this.config.minConfidenceThreshold)
        .slice(0, this.config.maxAgentsPerLead);

      if (selectedAgents.length === 0) {
        logger.warn('No agents met the minimum confidence threshold', {
          leadId,
          threshold: this.config.minConfidenceThreshold,
          bestScore: rankedAgents[0]?.score
        });
        // Fallback to the single best agent even if below threshold? 
        // For now, let's just take the top one if none met threshold
        selectedAgents.push(rankedAgents[0]);
      }

      // 5. Create assignments
      const results = await Promise.all(
        selectedAgents.map(async (rankedAgent) => {
          try {
            await this.eventBus.request(EVENT_SUBJECTS.LeadAssign, {
              leadId,
              agentId: rankedAgent.id
            });

            await this.notifyAgent(lead, rankedAgent);

            return {
              agentId: rankedAgent.id,
              score: rankedAgent.score,
              confidence: rankedAgent.score / 100,
              routingFactors: rankedAgent.breakdown
            };
          } catch (error) {
            logger.error('Failed to assign lead to agent', { 
              leadId, 
              agentId: rankedAgent.id, 
              error 
            });
            return null;
          }
        })
      );

      const successfulAssignments = results.filter(r => r !== null) as RoutingDecision['assignments'];

      logger.info('Lead routed successfully', { 
        leadId, 
        assignmentsCount: successfulAssignments.length
      });

      return {
        leadId,
        assignments: successfulAssignments
      };
    } catch (error) {
      logger.error('Lead routing failed', { error, leadId });
      throw error;
    }
  }

  private async notifyAgent(lead: Lead, agent: Agent): Promise<void> {
    // Simulate notification to agent
    logger.info('Notification sent to agent', {
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      leadId: lead.id,
      insuranceType: lead.insuranceType
    });
  }

  async reassignStaleLeads(): Promise<void> {
    // This would be called by a cron or periodically
    logger.info('Checking for stale leads to reassign');
    // Implementation would involve querying data-service for stale assignments
  }

  updateConfig(newConfig: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Routing configuration updated', { config: this.config });
  }

  getConfig(): RoutingConfig {
    return { ...this.config };
  }
}
