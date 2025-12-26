import type {
  LeadFunnelMetrics,
  LeadVolumeMetrics,
  AgentPerformanceMetrics,
  AgentLeaderboardEntry,
  AIModelMetrics,
  AIProcessingStats,
  SystemHealthMetrics,
  HealthStatus,
  DashboardSummary,
  AnalyticsEvent,
  AnalyticsEventType,
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

interface MetricsStore {
  leadsByStatus: Map<string, number>;
  leadsBySource: Map<string, number>;
  leadsByInsuranceType: Map<string, number>;
  leadsTimeline: Map<string, { count: number; conversions: number }>;
  conversions: number;
  totalLeads: number;
  agentMetrics: Map<string, AgentPerformanceMetrics>;
  aiMetrics: AIModelMetrics;
  apiMetrics: {
    totalRequests: number;
    totalErrors: number;
    responseTimes: number[];
    requestsByEndpoint: Map<string, number>;
  };
  queueMetrics: Map<string, { depth: number; processing: number; deadLetter: number }>;
  startTime: number;
}

class AnalyticsService {
  private store: MetricsStore;

  constructor() {
    this.store = {
      leadsByStatus: new Map(),
      leadsBySource: new Map(),
      leadsByInsuranceType: new Map(),
      leadsTimeline: new Map(),
      conversions: 0,
      totalLeads: 0,
      agentMetrics: new Map(),
      aiMetrics: {
        totalScored: 0,
        scoringAccuracy: 0,
        averageConfidence: 0,
        apiCalls: 0,
        apiCosts: 0,
        averageLatency: 0,
        promptTokens: 0,
        completionTokens: 0,
        costPerCall: 0.01,
      },
      apiMetrics: {
        totalRequests: 0,
        totalErrors: 0,
        responseTimes: [],
        requestsByEndpoint: new Map(),
      },
      queueMetrics: new Map([
        ['leadIngestion', { depth: 0, processing: 0, deadLetter: 0 }],
        ['aiProcessing', { depth: 0, processing: 0, deadLetter: 0 }],
        ['routing', { depth: 0, processing: 0, deadLetter: 0 }],
      ]),
      startTime: Date.now(),
    };
  }

  trackEvent(event: AnalyticsEvent): void {
    try {
      switch (event.type) {
        case 'lead.created':
          this.trackLeadCreated(event);
          break;
        case 'lead.status_changed':
          this.trackLeadStatusChanged(event);
          break;
        case 'lead.converted':
          this.trackLeadConverted(event);
          break;
        case 'agent.assigned':
        case 'agent.accepted':
        case 'agent.rejected':
        case 'agent.converted':
          this.trackAgentEvent(event);
          break;
        case 'ai.scored':
        case 'ai.processed':
          this.trackAIEvent(event);
          break;
        case 'api.request':
          this.trackAPIRequest(event);
          break;
        case 'api.error':
          this.trackAPIError(event);
          break;
        default:
          logger.debug('Unknown analytics event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Failed to track analytics event', { error, event });
    }
  }

  private trackLeadCreated(event: AnalyticsEvent): void {
    this.store.totalLeads++;
    
    const status = 'received';
    this.store.leadsByStatus.set(status, (this.store.leadsByStatus.get(status) || 0) + 1);
    
    const source = event.metadata?.source || 'unknown';
    this.store.leadsBySource.set(source, (this.store.leadsBySource.get(source) || 0) + 1);
    
    const insuranceType = event.data.insuranceType as string;
    if (insuranceType) {
      this.store.leadsByInsuranceType.set(insuranceType, (this.store.leadsByInsuranceType.get(insuranceType) || 0) + 1);
    }

    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const timeline = this.store.leadsTimeline.get(date) || { count: 0, conversions: 0 };
    timeline.count++;
    this.store.leadsTimeline.set(date, timeline);
  }

  private trackLeadStatusChanged(event: AnalyticsEvent): void {
    const newStatus = event.data.newStatus as string;
    const oldStatus = event.data.oldStatus as string;
    
    if (oldStatus) {
      const oldCount = this.store.leadsByStatus.get(oldStatus) || 0;
      if (oldCount > 0) {
        this.store.leadsByStatus.set(oldStatus, oldCount - 1);
      }
    }
    
    this.store.leadsByStatus.set(newStatus, (this.store.leadsByStatus.get(newStatus) || 0) + 1);
  }

  private trackLeadConverted(event: AnalyticsEvent): void {
    this.store.conversions++;
    
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const timeline = this.store.leadsTimeline.get(date) || { count: 0, conversions: 0 };
    timeline.conversions++;
    this.store.leadsTimeline.set(date, timeline);
  }

  private trackAgentEvent(event: AnalyticsEvent): void {
    const agentId = event.metadata?.agentId || 'unknown';
    let metrics = this.store.agentMetrics.get(agentId);
    
    if (!metrics) {
      metrics = {
        agentId,
        totalAssigned: 0,
        totalAccepted: 0,
        totalRejected: 0,
        totalConverted: 0,
        conversionRate: 0,
        averageResponseTime: 0,
        averageProcessingTime: 0,
        revenueGenerated: 0,
        customerSatisfactionScore: 0,
        ranking: 0,
        trendData: [],
      };
      this.store.agentMetrics.set(agentId, metrics);
    }

    switch (event.type) {
      case 'agent.assigned':
        metrics.totalAssigned++;
        break;
      case 'agent.accepted':
        metrics.totalAccepted++;
        break;
      case 'agent.rejected':
        metrics.totalRejected++;
        break;
      case 'agent.converted':
        metrics.totalConverted++;
        if (event.data.revenue) {
          metrics.revenueGenerated += event.data.revenue as number;
        }
        break;
    }

    if (event.data.responseTime) {
      const responseTime = event.data.responseTime as number;
      const totalResponses = metrics.totalAccepted + metrics.totalRejected + metrics.totalConverted;
      metrics.averageResponseTime = 
        ((metrics.averageResponseTime * (totalResponses - 1)) + responseTime) / totalResponses;
    }
  }

  private trackAIEvent(event: AnalyticsEvent): void {
    const metrics = this.store.aiMetrics;
    
    if (event.type === 'ai.scored') {
      metrics.totalScored++;
      if (event.data.confidence) {
        const confidence = event.data.confidence as number;
        metrics.averageConfidence = 
          ((metrics.averageConfidence * (metrics.totalScored - 1)) + confidence) / metrics.totalScored;
      }
      if (event.data.accuracy) {
        metrics.scoringAccuracy = event.data.accuracy as number;
      }
    }
    
    if (event.data.latency) {
      const latency = event.data.latency as number;
      metrics.averageLatency = 
        ((metrics.averageLatency * metrics.apiCalls) + latency) / (metrics.apiCalls + 1);
    }
    
    if (event.data.tokens) {
      const tokens = event.data.tokens as { prompt: number; completion: number };
      metrics.promptTokens += tokens.prompt;
      metrics.completionTokens += tokens.completion;
    }
    
    if (event.data.cost) {
      metrics.apiCosts += event.data.cost as number;
    }
    
    metrics.apiCalls++;
  }

  private trackAPIRequest(event: AnalyticsEvent): void {
    this.store.apiMetrics.totalRequests++;
    
    const endpoint = event.data.endpoint as string;
    this.store.apiMetrics.requestsByEndpoint.set(
      endpoint,
      (this.store.apiMetrics.requestsByEndpoint.get(endpoint) || 0) + 1
    );
    
    if (event.data.responseTime) {
      this.store.apiMetrics.responseTimes.push(event.data.responseTime as number);
      if (this.store.apiMetrics.responseTimes.length > 1000) {
        this.store.apiMetrics.responseTimes.shift();
      }
    }
  }

  private trackAPIError(event: AnalyticsEvent): void {
    this.store.apiMetrics.totalErrors++;
  }

  getLeadFunnelMetrics(): LeadFunnelMetrics {
    const byStatus: Record<string, number> = {};
    for (const [status, count] of this.store.leadsByStatus) {
      byStatus[status] = count;
    }

    const conversionRate = this.store.totalLeads > 0
      ? (this.store.conversions / this.store.totalLeads) * 100
      : 0;

    const trendData = Array.from(this.store.leadsTimeline.entries())
      .map(([date, data]) => ({ date, count: data.count, conversions: data.conversions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalLeads: this.store.totalLeads,
      byStatus: byStatus as Record<string, number> as Record<string, number>,
      conversionRate,
      averageTimeInFunnel: 0,
      dropoffRates: {},
      trendData,
    };
  }

  getLeadVolumeMetrics(): LeadVolumeMetrics {
    const bySource: Record<string, number> = {};
    for (const [source, count] of this.store.leadsBySource) {
      bySource[source] = count;
    }

    const byInsuranceType: Record<string, number> = {};
    for (const [type, count] of this.store.leadsByInsuranceType) {
      byInsuranceType[type] = count;
    }

    const trend = Array.from(this.store.leadsTimeline.entries())
      .map(([date, data]) => ({ date, volume: data.count, conversions: data.conversions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: this.store.totalLeads,
      bySource,
      byInsuranceType,
      byHour: new Array(24).fill(0),
      trend,
    };
  }

  getAgentPerformanceMetrics(agentId: string): AgentPerformanceMetrics | null {
    const metrics = this.store.agentMetrics.get(agentId);
    if (!metrics) {
      return null;
    }

    const totalProcessed = metrics.totalAccepted + metrics.totalRejected + metrics.totalConverted;
    if (totalProcessed > 0) {
      metrics.conversionRate = (metrics.totalConverted / totalProcessed) * 100;
    }

    return metrics;
  }

  getAgentLeaderboard(limit: number = 10): AgentLeaderboardEntry[] {
    const entries: AgentLeaderboardEntry[] = [];
    
    for (const [agentId, metrics] of this.store.agentMetrics) {
      const totalProcessed = metrics.totalAccepted + metrics.totalRejected + metrics.totalConverted;
      const conversionRate = totalProcessed > 0
        ? (metrics.totalConverted / totalProcessed) * 100
        : 0;

      entries.push({
        agentId,
        agentName: `${metrics.agentId}`,
        totalAssigned: metrics.totalAssigned,
        totalConverted: metrics.totalConverted,
        conversionRate,
        averageResponseTime: metrics.averageResponseTime,
        ranking: 0,
      });
    }

    entries.sort((a, b) => b.conversionRate - a.conversionRate);
    
    for (let i = 0; i < entries.length; i++) {
      entries[i].ranking = i + 1;
    }

    return entries.slice(0, limit);
  }

  getAIModelMetrics(): AIModelMetrics {
    return { ...this.store.aiMetrics };
  }

  getAIProcessingStats(): AIProcessingStats {
    const leadIngestion = this.store.queueMetrics.get('leadIngestion') || { depth: 0, processing: 0, deadLetter: 0 };
    const aiProcessing = this.store.queueMetrics.get('aiProcessing') || { depth: 0, processing: 0, deadLetter: 0 };
    const routing = this.store.queueMetrics.get('routing') || { depth: 0, processing: 0, deadLetter: 0 };

    return {
      queueDepth: leadIngestion.depth + aiProcessing.depth + routing.depth,
      averageWaitTime: this.store.aiMetrics.averageLatency,
      processingRate: this.store.aiMetrics.apiCalls / 60,
      successRate: this.store.apiMetrics.totalRequests > 0
        ? ((this.store.apiMetrics.totalRequests - this.store.apiMetrics.totalErrors) / this.store.apiMetrics.totalRequests) * 100
        : 100,
      errorRate: this.store.apiMetrics.totalRequests > 0
        ? (this.store.apiMetrics.totalErrors / this.store.apiMetrics.totalRequests) * 100
        : 0,
      modelBreakdown: {
        'gpt-4': {
          calls: this.store.aiMetrics.apiCalls,
          averageLatency: this.store.aiMetrics.averageLatency,
          cost: this.store.aiMetrics.apiCosts,
        },
      },
    };
  }

  getSystemHealthMetrics(): SystemHealthMetrics {
    const responseTimes = this.store.apiMetrics.responseTimes;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const leadIngestion = this.store.queueMetrics.get('leadIngestion') || { depth: 0, processing: 0, deadLetter: 0 };
    const aiProcessing = this.store.queueMetrics.get('aiProcessing') || { depth: 0, processing: 0, deadLetter: 0 };
    const routing = this.store.queueMetrics.get('routing') || { depth: 0, processing: 0, deadLetter: 0 };

    return {
      api: {
        uptime: (Date.now() - this.store.startTime) / 1000,
        requestRate: this.store.apiMetrics.totalRequests,
        averageResponseTime: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
        p95ResponseTime: sortedTimes[p95Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0,
        errorRate: this.store.apiMetrics.totalRequests > 0
          ? (this.store.apiMetrics.totalErrors / this.store.apiMetrics.totalRequests) * 100
          : 0,
      },
      database: {
        connectionsActive: 5,
        connectionsIdle: 3,
        queryRate: 100,
        averageQueryTime: 10,
      },
      redis: {
        connected: true,
        memoryUsed: 1024 * 1024 * 50,
        operationsPerSecond: 500,
      },
      queues: {
        leadIngestion,
        aiProcessing,
        routing,
      },
    };
  }

  getHealthStatus(): HealthStatus {
    const metrics = this.getSystemHealthMetrics();
    const components: Record<string, { status: string; latency?: number; error?: string }> = {};

    components.api = {
      status: metrics.api.errorRate < 1 ? 'healthy' : metrics.api.errorRate < 5 ? 'degraded' : 'unhealthy',
      latency: metrics.api.averageResponseTime,
    };

    components.database = {
      status: 'healthy',
      latency: metrics.database.averageQueryTime,
    };

    components.redis = {
      status: metrics.redis.connected ? 'healthy' : 'unhealthy',
    };

    components.queues = {
      status: metrics.queues.aiProcessing.depth < 100 ? 'healthy' : 'degraded',
    };

    const hasUnhealthy = Object.values(components).some(c => c.status === 'unhealthy');
    const hasDegraded = Object.values(components).some(c => c.status === 'degraded');

    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      components,
      timestamp: new Date().toISOString(),
    };
  }

  getDashboardSummary(): DashboardSummary {
    const funnelMetrics = this.getLeadFunnelMetrics();
    const leaderboard = this.getAgentLeaderboard(5);

    return {
      overview: {
        totalLeads: this.store.totalLeads,
        leadsToday: funnelMetrics.trendData.length > 0 ? funnelMetrics.trendData[funnelMetrics.trendData.length - 1]?.count || 0 : 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
        conversionRate: funnelMetrics.conversionRate,
        averageQualityScore: 75,
      },
      funnel: {
        received: funnelMetrics.byStatus['received'] || 0,
        processing: funnelMetrics.byStatus['processing'] || 0,
        qualified: funnelMetrics.byStatus['qualified'] || 0,
        routed: funnelMetrics.byStatus['routed'] || 0,
        converted: funnelMetrics.byStatus['converted'] || 0,
        rejected: funnelMetrics.byStatus['rejected'] || 0,
        conversionRate: funnelMetrics.conversionRate,
      },
      topAgents: leaderboard,
      recentActivity: [],
      systemHealth: this.getHealthStatus(),
      aiMetrics: {
        modelsActive: 1,
        averageScore: this.store.aiMetrics.averageConfidence,
        processingQueue: this.store.queueMetrics.get('aiProcessing')?.depth || 0,
      },
    };
  }

  updateQueueMetrics(queueName: string, depth: number, processing: number, deadLetter: number): void {
    this.store.queueMetrics.set(queueName, { depth, processing, deadLetter });
  }

  resetMetrics(): void {
    this.store.leadsByStatus.clear();
    this.store.leadsBySource.clear();
    this.store.leadsByInsuranceType.clear();
    this.store.leadsTimeline.clear();
    this.store.agentMetrics.clear();
    this.store.apiMetrics.responseTimes = [];
    this.store.apiMetrics.totalRequests = 0;
    this.store.apiMetrics.totalErrors = 0;
    this.store.conversions = 0;
    this.store.totalLeads = 0;
    this.store.startTime = Date.now();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
