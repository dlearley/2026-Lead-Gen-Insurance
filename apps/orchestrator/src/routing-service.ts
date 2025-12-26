import { logger } from '@insurance-lead-gen/core';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { Lead, Agent, LeadAssignment } from '@insurance-lead-gen/types';

export interface RoutingDecision {
  leadId: string;
  agentId: string;
  score: number;
  confidence: number;
  routingFactors: {
    specializationMatch: number;
    locationProximity: number;
    performanceScore: number;
    currentWorkload: number;
    qualityTierAlignment: number;
  };
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
  private dataService: AxiosInstance;
  private analyticsClient: AxiosInstance;
  private config: RoutingConfig;
  private routingHistory: Map<string, Date[]> = new Map();

  constructor() {
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    this.dataService = axios.create({
      baseURL: dataServiceUrl,
      timeout: 5000,
    });

    // Analytics client for tracking routing events
    this.analyticsClient = axios.create({
      baseURL: dataServiceUrl,
      timeout: 5000,
    });

    this.config = DEFAULT_ROUTING_CONFIG;

    logger.info('Routing service initialized', {
      config: this.config,
      dataServiceUrl
    });
  }

  async routeLead(leadId: string): Promise<RoutingDecision> {
    logger.info('Starting lead routing', { leadId });

    try {
      // Get best matching agents from graph database
      const response = await this.dataService.get(`/api/v1/leads/${leadId}/matching-agents`, {
        params: { limit: this.config.maxAgentsPerLead },
      });

      const matches: Array<{ agent: Agent; score: number }> = response.data.data;

      if (!matches || matches.length === 0) {
        throw new Error('No agents found for lead routing');
      }

      // Select the best agent using weighted scoring
      const bestMatch = await this.selectBestAgent(leadId, matches);

      // Assign the lead to the selected agent
      await this.assignLead(bestMatch.leadId, bestMatch.agentId);

      // Send notification to the agent
      await this.notifyAgent(bestMatch);

      // Track routing decision for analytics
      await this.trackRoutingDecision(bestMatch);

      logger.info('Lead routed successfully', { 
        leadId, 
        agentId: bestMatch.agentId, 
        score: bestMatch.score,
        factors: bestMatch.routingFactors
      });

      return bestMatch;
    } catch (error) {
      logger.error('Lead routing failed', { error, leadId });
      throw error;
    }
  }

  private async trackRoutingDecision(decision: RoutingDecision): Promise<void> {
    try {
      await this.analyticsClient.post('/api/v1/analytics/track/event', {
        eventType: 'lead_routed',
        timestamp: new Date().toISOString(),
        source: 'routing-service',
        data: {
          leadId: decision.leadId,
          agentId: decision.agentId,
          score: decision.score,
          confidence: decision.confidence,
          factors: decision.routingFactors,
        },
      });
    } catch (error) {
      logger.warn('Failed to track routing decision', { error });
    }
  }

  private async trackAgentAssignment(agentId: string, leadId: string, eventType: string): Promise<void> {
    try {
      await this.analyticsClient.post('/api/v1/analytics/track/agent', {
        agentId,
        eventType,
        leadId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Failed to track agent event', { error });
    }
  }

  private async selectBestAgent(
    leadId: string, 
    matches: Array<{ agent: Agent; score: number }>
  ): Promise<RoutingDecision> {
    // Use the highest scoring agent from Neo4j results
    const bestMatch = matches[0];
    const agent = bestMatch.agent;

    // Calculate detailed routing factors
    const routingFactors = {
      specializationMatch: this.calculateSpecializationMatch(agent, leadId),
      locationProximity: this.calculateLocationScore(agent, leadId),
      performanceScore: this.calculatePerformanceScore(agent),
      currentWorkload: this.calculateWorkloadScore(agent),
      qualityTierAlignment: this.calculateQualityAlignment(agent, leadId),
    };

    // Calculate overall confidence (0-1)
    const confidence = Math.min(bestMatch.score / 100, 1.0);

    // Check if routing meets minimum confidence
    if (confidence < this.config.minConfidenceThreshold) {
      logger.warn('Routing confidence below threshold', {
        leadId,
        confidence,
        threshold: this.config.minConfidenceThreshold
      });
    }

    return {
      leadId,
      agentId: agent.id,
      score: bestMatch.score,
      confidence,
      routingFactors,
    };
  }

  private calculateSpecializationMatch(agent: Agent, leadId: string): number {
    // This would be calculated more precisely in a real implementation
    return agent.specializations.length > 0 ? 0.8 : 0.5;
  }

  private calculateLocationScore(agent: Agent, leadId: string): number {
    // In a real implementation, we'd compare actual lead location
    return agent.location.state === 'CA' ? 0.85 : 0.7; // Default example
  }

  private calculatePerformanceScore(agent: Agent): number {
    // Combine rating, conversion rate, and response time
    const ratingScore = Math.min(agent.rating / 5.0, 1.0);
    const conversionScore = agent.conversionRate || 0.15;
    const responseScore = agent.averageResponseTime < 3600 ? 1.0 : 
                         agent.averageResponseTime < 7200 ? 0.8 : 0.5;
    
    return (ratingScore * 0.4 + conversionScore * 0.4 + responseScore * 0.2);
  }

  private calculateWorkloadScore(agent: Agent): number {
    // Lower score means better (less workload)
    const utilization = agent.currentLeadCount / agent.maxLeadCapacity;
    return Math.max(0, 1 - utilization);
  }

  private calculateQualityAlignment(agent: Agent, leadId: string): number {
    // In a real implementation, compare lead quality with agent tier
    return 0.75;
  }

  private async assignLead(leadId: string, agentId: string): Promise<void> {
    try {
      await this.dataService.post(`/api/v1/leads/${leadId}/assign/${agentId}`);
      await this.trackAgentAssignment(agentId, leadId, 'assignment');
      logger.info('Lead assigned to agent', { leadId, agentId });
    } catch (error) {
      logger.error('Failed to assign lead', { error, leadId, agentId });
      throw error;
    }
  }

  private async notifyAgent(routingDecision: RoutingDecision): Promise<void> {
    // Simulate notification to agent (would use Twilio/SendGrid in production)
    logger.info('Notification sent to agent', {
      agentId: routingDecision.agentId,
      leadId: routingDecision.leadId,
      score: routingDecision.score,
      factors: routingDecision.routingFactors
    });

    // Store assignment for tracking
    const assignment: LeadAssignment = {
      id: `assignment_${Date.now()}`,
      leadId: routingDecision.leadId,
      agentId: routingDecision.agentId,
      assignedAt: new Date(),
      status: 'pending',
    };

    // Track routing history for load balancing
    this.trackAgentRouting(routingDecision.agentId);

    // Log assignment for analytics
    logger.info('Assignment recorded', { assignment });
  }

  private trackAgentRouting(agentId: string): void {
    const history = this.routingHistory.get(agentId) || [];
    history.push(new Date());
    
    // Keep only last 24 hours of history
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(date => date > oneDayAgo);
    
    this.routingHistory.set(agentId, filteredHistory);
  }

  async getAgentRoutingHistory(agentId: string): Promise<Date[]> {
    return this.routingHistory.get(agentId) || [];
  }

  async reassignStaleLeads(): Promise<void> {
    logger.info('Starting stale lead reassignments');
    
    // In production, this would query for leads pending > escalation timeout
    const staleLeads: string[] = []; // Would be fetched from database
    
    for (const leadId of staleLeads) {
      try {
        await this.routeLead(leadId);
        logger.info('Reassigned stale lead', { leadId });
      } catch (error) {
        logger.error('Failed to reassign stale lead', { error, leadId });
      }
    }
  }

  updateConfig(newConfig: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Routing configuration updated', { config: this.config });
  }

  getConfig(): RoutingConfig {
    return { ...this.config };
  }
}