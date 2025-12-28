import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import { 
  PredictionResult, Insight, Recommendation, DataQuery, 
  WhatIfAnalysis, PredictionType, InsightType, 
  RecommendationType, TimeRange 
} from '@insurance-lead-gen/types';

/**
 * Advanced Analytics Service
 * Provides predictive analytics, insights, and recommendations
 */
export class AdvancedAnalyticsService {
  
  /**
   * Get predictive analytics for lead conversion
   */
  async getLeadConversionPrediction(leadId: string): Promise<PredictionResult> {
    logger.info('Getting lead conversion prediction', { leadId });
    
    // In a real implementation, this would use ML models
    // For now, we'll return mock data based on lead quality
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { qualityScore: true, insuranceType: true, createdAt: true }
    });
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Mock prediction based on quality score
    const probability = lead.qualityScore ? Math.min(100, lead.qualityScore * 1.2) : 50;
    const confidence = 0.85 + (lead.qualityScore ? (lead.qualityScore / 100) * 0.15 : 0);
    
    return {
      id: `prediction-${Date.now()}`,
      type: 'lead_conversion',
      probability,
      confidence,
      factors: [
        {
          name: 'Quality Score',
          impact: lead.qualityScore ? lead.qualityScore / 100 : 0,
          description: `Lead quality score of ${lead.qualityScore || 'N/A'}`
        },
        {
          name: 'Insurance Type',
          impact: 0.1,
          description: `Insurance type: ${lead.insuranceType || 'Unknown'}`
        },
        {
          name: 'Recency',
          impact: 0.05,
          description: `Lead created ${this.timeSince(lead.createdAt)} ago`
        }
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
  
  /**
   * Get predictive analytics for agent performance
   */
  async getAgentPerformancePrediction(agentId: string): Promise<PredictionResult> {
    logger.info('Getting agent performance prediction', { agentId });
    
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { 
        conversionRate: true, 
        averageResponseTime: true, 
        currentLeadCount: true, 
        maxLeadCapacity: true 
      }
    });
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    // Mock prediction based on current performance
    const capacityUtilization = agent.currentLeadCount / agent.maxLeadCapacity;
    const performanceScore = (agent.conversionRate || 0) * 0.6 + 
                           (1 - Math.min(1, agent.averageResponseTime / 1440)) * 0.4;
    
    const probability = Math.min(100, performanceScore * 100);
    const confidence = 0.8 + (performanceScore * 0.2);
    
    return {
      id: `prediction-${Date.now()}`,
      type: 'agent_performance',
      probability,
      confidence,
      factors: [
        {
          name: 'Conversion Rate',
          impact: (agent.conversionRate || 0) / 100,
          description: `Current conversion rate: ${agent.conversionRate || 0}%`
        },
        {
          name: 'Response Time',
          impact: 1 - Math.min(1, agent.averageResponseTime / 1440),
          description: `Average response time: ${agent.averageResponseTime || 0} minutes`
        },
        {
          name: 'Capacity Utilization',
          impact: 1 - capacityUtilization,
          description: `Capacity utilization: ${(capacityUtilization * 100).toFixed(1)}%`
        }
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
  
  /**
   * Get market trend predictions
   */
  async getMarketTrendsPrediction(timeRange: TimeRange = '30d'): Promise<PredictionResult> {
    logger.info('Getting market trends prediction', { timeRange });
    
    // Get recent lead data
    const dateFrom = this.getDateFromTimeRange(timeRange);
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: dateFrom }
      },
      select: { insuranceType: true, qualityScore: true, createdAt: true }
    });
    
    // Calculate trends by insurance type
    const typeCounts: Record<string, number> = {};
    const typeQuality: Record<string, { sum: number, count: number }> = {};
    
    leads.forEach(lead => {
      if (lead.insuranceType) {
        typeCounts[lead.insuranceType] = (typeCounts[lead.insuranceType] || 0) + 1;
        if (lead.qualityScore) {
          typeQuality[lead.insuranceType] = typeQuality[lead.insuranceType] || { sum: 0, count: 0 };
          typeQuality[lead.insuranceType].sum += lead.qualityScore;
          typeQuality[lead.insuranceType].count += 1;
        }
      }
    });
    
    // Find the most popular type
    const popularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto';
    const avgQuality = typeQuality[popularType] 
      ? typeQuality[popularType].sum / typeQuality[popularType].count 
      : 75;
    
    return {
      id: `prediction-${Date.now()}`,
      type: 'market_trends',
      probability: Math.min(100, avgQuality * 1.1),
      confidence: 0.75,
      factors: [
        {
          name: 'Popular Insurance Type',
          impact: 0.4,
          description: `Most popular type: ${popularType} (${typeCounts[popularType] || 0} leads)`
        },
        {
          name: 'Quality Trend',
          impact: avgQuality / 100,
          description: `Average quality for ${popularType}: ${avgQuality.toFixed(1)}`
        },
        {
          name: 'Volume Trend',
          impact: 0.3,
          description: `Total leads in period: ${leads.length}`
        }
      ],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
  
  /**
   * Get AI-generated insights
   */
  async getInsights(type: InsightType, timeRange: TimeRange = '30d'): Promise<Insight[]> {
    logger.info('Generating insights', { type, timeRange });
    
    const dateFrom = this.getDateFromTimeRange(timeRange);
    
    switch (type) {
      case 'lead_quality':
        return this.getLeadQualityInsights(dateFrom);
      case 'agent_performance':
        return this.getAgentPerformanceInsights(dateFrom);
      case 'market_trends':
        return this.getMarketTrendInsights(dateFrom);
      case 'system_health':
        return this.getSystemHealthInsights(dateFrom);
      case 'conversion_patterns':
        return this.getConversionPatternInsights(dateFrom);
      default:
        return [];
    }
  }
  
  /**
   * Get recommendations
   */
  async getRecommendations(type: RecommendationType): Promise<Recommendation[]> {
    logger.info('Generating recommendations', { type });
    
    switch (type) {
      case 'routing_optimization':
        return this.getRoutingOptimizationRecommendations();
      case 'performance_improvement':
        return this.getPerformanceImprovementRecommendations();
      case 'resource_allocation':
        return this.getResourceAllocationRecommendations();
      case 'process_optimization':
        return this.getProcessOptimizationRecommendations();
      case 'agent_training':
        return this.getAgentTrainingRecommendations();
      default:
        return [];
    }
  }
  
  /**
   * Perform data exploration
   */
  async exploreData(query: DataQuery): Promise<any> {
    logger.info('Performing data exploration', { query });
    
    // This would be implemented with a more sophisticated query engine
    // For now, we'll return mock data based on the query type
    
    if (query.query?.includes('leads')) {
      return this.exploreLeadsData(query);
    } else if (query.query?.includes('agents')) {
      return this.exploreAgentsData(query);
    } else {
      return {
        results: [],
        total: 0,
        aggregations: {}
      };
    }
  }
  
  /**
   * Perform what-if analysis
   */
  async performWhatIfAnalysis(scenario: any): Promise<WhatIfAnalysis> {
    logger.info('Performing what-if analysis', { scenario });
    
    // Mock analysis based on scenario type
    const baseline = {
      conversionRate: 15,
      agentUtilization: 75,
      leadProcessingTime: 30
    };
    
    let projected = { ...baseline };
    let impact = 0;
    let roi = 0;
    
    switch (scenario.scenario) {
      case 'increase_agent_capacity':
        projected.agentUtilization = Math.max(0, baseline.agentUtilization - scenario.parameters.capacityIncrease);
        projected.conversionRate = baseline.conversionRate * 1.1;
        impact = 15;
        roi = 3.5;
        break;
      case 'improve_lead_quality':
        projected.conversionRate = baseline.conversionRate * 1.2;
        projected.leadProcessingTime = baseline.leadProcessingTime * 0.9;
        impact = 20;
        roi = 4.2;
        break;
      case 'reduce_response_time':
        projected.conversionRate = baseline.conversionRate * 1.05;
        projected.leadProcessingTime = baseline.leadProcessingTime * 0.8;
        impact = 10;
        roi = 2.8;
        break;
    }
    
    return {
      scenarioId: `analysis-${Date.now()}`,
      scenarioName: scenario.scenario,
      parameters: scenario.parameters,
      baseline,
      projected,
      impact,
      roi,
      confidence: 0.85,
      recommendations: [
        {
          id: `rec-${Date.now()}`,
          type: 'process_optimization',
          title: 'Implement recommended changes',
          description: 'Apply the changes suggested by this analysis',
          priority: 'high',
          estimatedImpact: impact,
          implementationSteps: [
            'Review current processes',
            'Implement changes gradually',
            'Monitor results',
            'Adjust as needed'
          ],
          relatedData: {},
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };
  }
  
  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================
  
  private timeSince(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'}`;
      }
    }
    
    return 'just now';
  }
  
  private getDateFromTimeRange(timeRange: TimeRange): Date {
    const now = new Date();
    
    switch (timeRange) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all': return new Date(0);
      case 'custom':
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  
  private async getLeadQualityInsights(dateFrom: Date): Promise<Insight[]> {
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: dateFrom } },
      select: { qualityScore: true, insuranceType: true }
    });
    
    const avgQuality = leads.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / leads.length;
    const highQualityCount = leads.filter(lead => lead.qualityScore && lead.qualityScore >= 80).length;
    
    return [
      {
        id: `insight-${Date.now()}`,
        type: 'lead_quality',
        title: 'Lead Quality Analysis',
        description: `Average lead quality score is ${avgQuality.toFixed(1)} out of 100`,
        impact: avgQuality > 70 ? 'medium' : 'low',
        recommendation: avgQuality > 70 ? 
          'Maintain current lead quality standards' : 
          'Consider improving lead qualification criteria',
        data: { avgQuality, highQualityCount, totalLeads: leads.length },
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private async getAgentPerformanceInsights(dateFrom: Date): Promise<Insight[]> {
    const agents = await prisma.agent.findMany({
      select: { conversionRate: true, averageResponseTime: true }
    });
    
    const avgConversion = agents.reduce((sum, agent) => sum + (agent.conversionRate || 0), 0) / agents.length;
    const avgResponseTime = agents.reduce((sum, agent) => sum + (agent.averageResponseTime || 0), 0) / agents.length;
    
    return [
      {
        id: `insight-${Date.now()}`,
        type: 'agent_performance',
        title: 'Agent Performance Overview',
        description: `Average conversion rate is ${avgConversion.toFixed(1)}% with ${avgResponseTime.toFixed(1)} minute response time`,
        impact: avgConversion > 20 ? 'high' : 'medium',
        recommendation: avgConversion > 20 ? 
          'Agents are performing well - consider expanding team' : 
          'Review agent training and performance improvement programs',
        data: { avgConversion, avgResponseTime, agentCount: agents.length },
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private async getMarketTrendInsights(dateFrom: Date): Promise<Insight[]> {
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: dateFrom } },
      select: { insuranceType: true }
    });
    
    const typeCounts: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.insuranceType) {
        typeCounts[lead.insuranceType] = (typeCounts[lead.insuranceType] || 0) + 1;
      }
    });
    
    const popularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto';
    
    return [
      {
        id: `insight-${Date.now()}`,
        type: 'market_trends',
        title: 'Market Trend Analysis',
        description: `${popularType} insurance is the most popular (${typeCounts[popularType] || 0} leads)`,
        impact: 'medium',
        recommendation: `Focus marketing efforts on ${popularType} insurance products`,
        data: { typeCounts, popularType },
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private async getSystemHealthInsights(dateFrom: Date): Promise<Insight[]> {
    // This would be enhanced with actual system metrics in production
    return [
      {
        id: `insight-${Date.now()}`,
        type: 'system_health',
        title: 'System Health Overview',
        description: 'System is operating within normal parameters',
        impact: 'low',
        recommendation: 'Continue monitoring system performance',
        data: { status: 'healthy', uptime: '99.9%' },
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private async getConversionPatternInsights(dateFrom: Date): Promise<Insight[]> {
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: dateFrom } },
      select: { status: true, insuranceType: true, createdAt: true }
    });
    
    const convertedCount = leads.filter(lead => lead.status === 'converted').length;
    const conversionRate = (convertedCount / leads.length) * 100;
    
    return [
      {
        id: `insight-${Date.now()}`,
        type: 'conversion_patterns',
        title: 'Conversion Pattern Analysis',
        description: `Current conversion rate is ${conversionRate.toFixed(1)}%`,
        impact: conversionRate > 15 ? 'high' : 'medium',
        recommendation: conversionRate > 15 ? 
          'Conversion rates are strong - maintain current strategies' : 
          'Review conversion optimization opportunities',
        data: { conversionRate, convertedCount, totalLeads: leads.length },
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private async exploreLeadsData(query: DataQuery): Promise<any> {
    const where: any = {};
    
    if (query.filters) {
      if (query.filters.insuranceType) {
        where.insuranceType = { in: query.filters.insuranceType };
      }
      if (query.filters.qualityScore) {
        where.qualityScore = {
          gte: query.filters.qualityScore.min,
          lte: query.filters.qualityScore.max
        };
      }
    }
    
    const leads = await prisma.lead.findMany({
      where,
      skip: query.offset,
      take: query.limit
    });
    
    const total = await prisma.lead.count({ where });
    
    // Calculate aggregations
    const aggregations: Record<string, any> = {};
    if (query.aggregations) {
      query.aggregations.forEach(agg => {
        switch (agg.function) {
          case 'count':
            aggregations[agg.field] = total;
            break;
          case 'avg':
            const sum = leads.reduce((s, lead) => s + (lead[agg.field] || 0), 0);
            aggregations[agg.field] = sum / leads.length;
            break;
        }
      });
    }
    
    return {
      results: leads,
      total,
      aggregations
    };
  }
  
  private async exploreAgentsData(query: DataQuery): Promise<any> {
    const where: any = {};
    
    if (query.filters) {
      if (query.filters.specialization) {
        where.specializations = { has: query.filters.specialization };
      }
    }
    
    const agents = await prisma.agent.findMany({
      where,
      skip: query.offset,
      take: query.limit
    });
    
    const total = await prisma.agent.count({ where });
    
    return {
      results: agents,
      total,
      aggregations: {}
    };
  }
  
  private getRoutingOptimizationRecommendations(): Recommendation[] {
    return [
      {
        id: `rec-${Date.now()}`,
        type: 'routing_optimization',
        title: 'Optimize Agent Routing',
        description: 'Improve lead-to-agent matching based on performance data',
        priority: 'high',
        estimatedImpact: 25,
        implementationSteps: [
          'Analyze current routing patterns',
          'Identify top-performing agent-type combinations',
          'Adjust routing algorithm weights',
          'Monitor conversion rate improvements'
        ],
        relatedData: {},
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private getPerformanceImprovementRecommendations(): Recommendation[] {
    return [
      {
        id: `rec-${Date.now()}`,
        type: 'performance_improvement',
        title: 'Agent Performance Program',
        description: 'Implement training and coaching for underperforming agents',
        priority: 'medium',
        estimatedImpact: 15,
        implementationSteps: [
          'Identify agents with below-average conversion rates',
          'Provide targeted training sessions',
          'Implement performance coaching',
          'Track improvement over time'
        ],
        relatedData: {},
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private getResourceAllocationRecommendations(): Recommendation[] {
    return [
      {
        id: `rec-${Date.now()}`,
        type: 'resource_allocation',
        title: 'Optimize Resource Allocation',
        description: 'Balance lead distribution based on agent capacity and performance',
        priority: 'high',
        estimatedImpact: 20,
        implementationSteps: [
          'Analyze current capacity utilization',
          'Identify bottlenecks',
          'Redistribute leads to underutilized agents',
          'Monitor system balance'
        ],
        relatedData: {},
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private getProcessOptimizationRecommendations(): Recommendation[] {
    return [
      {
        id: `rec-${Date.now()}`,
        type: 'process_optimization',
        title: 'Streamline Lead Processing',
        description: 'Reduce lead processing time through workflow optimization',
        priority: 'high',
        estimatedImpact: 30,
        implementationSteps: [
          'Map current lead processing workflow',
          'Identify inefficiencies',
          'Implement automation where possible',
          'Measure time savings'
        ],
        relatedData: {},
        createdAt: new Date().toISOString()
      }
    ];
  }
  
  private getAgentTrainingRecommendations(): Recommendation[] {
    return [
      {
        id: `rec-${Date.now()}`,
        type: 'agent_training',
        title: 'Enhanced Agent Training',
        description: 'Provide specialized training based on performance data',
        priority: 'medium',
        estimatedImpact: 12,
        implementationSteps: [
          'Analyze agent performance by insurance type',
          'Develop targeted training programs',
          'Implement regular training sessions',
          'Track performance improvements'
        ],
        relatedData: {},
        createdAt: new Date().toISOString()
      }
    ];
  }
}

// Singleton instance
export const advancedAnalyticsService = new AdvancedAnalyticsService();