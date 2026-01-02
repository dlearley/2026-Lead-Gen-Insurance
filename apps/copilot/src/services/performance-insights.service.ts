import { ConversationContext, RealTimeAnalysis } from './copilot.service';
import { monitoring } from '../monitoring/observability';
import { SpanStatusCode } from '@opentelemetry/api';

export interface PerformanceMetric {
  agentId: string;
  timestamp: number;
  metric: string;
  value: number;
  context: Record<string, unknown>;
}

export interface PerformanceInsight {
  id: string;
  type: 'performance' | 'coaching' | 'trend' | 'opportunity';
  title: string;
  description: string;
  severity?: 'high' | 'medium' | 'low' | 'info';
  actionable: boolean;
  actions?: Array<{
    label: string;
    type: string;
    payload?: Record<string, unknown>;
  }>;
  metrics?: Record<string, number>;
  timestamp: number;
  validUntil?: number;
}

export interface TrendAnalysis {
  agentId: string;
  timeRange: {
    start: number;
    end: number;
  };
  metrics: {
    conversionRate: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
    responseTime: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
    conversationQuality: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
    customerSatisfaction: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
  };
  topImprovements: string[];
  topConcerns: string[];
}

export interface PeerComparison {
  agentId: string;
  metrics: {
    [key: string]: {
      agentValue: number;
      teamAverage: number;
      teamTop: number;
      percentile: number;
      performance: 'above_average' | 'average' | 'below_average';
    };
  };
  benchmarkDate: number;
}

export class PerformanceInsightsService {
  private performanceHistory: Map<string, PerformanceMetric[]> = new Map();
  private conversationPerformance: Map<string, any> = new Map();
  private readonly logger: any;

  constructor() {
    this.logger = global.logger || console;
  }

  async generate(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    agentId: string
  ): Promise<PerformanceInsight[]> {
    const span = monitoring.startSpan('performance_insights.generate', {
      'agent.id': agentId,
      'conversation.id': conversation.conversationId,
    });

    try {
      const insights: PerformanceInsight[] = [];
      const timestamp = Date.now();

      // Real-time performance insights
      const realTimeInsights = this.generateRealTimeInsights(
        conversation,
        analysis,
        agentId,
        timestamp
      );
      insights.push(...realTimeInsights);

      // Comparative insights
      const comparativeInsights = await this.generateComparativeInsights(
        agentId,
        timestamp
      );
      insights.push(...comparativeInsights);

      // Trend-based insights
      const trendInsights = await this.generateTrendInsights(agentId, timestamp);
      insights.push(...trendInsights);

      // Skill development insights
      const skillInsights = this.generateSkillInsights(conversation, agentId, timestamp);
      insights.push(...skillInsights);

      // Performance opportunity insights
      const opportunityInsights = this.generateOpportunityInsights(
        conversation,
        analysis,
        agentId,
        timestamp
      );
      insights.push(...opportunityInsights);

      monitoring.recordMetric('performance.insights.generated', insights.length, {
        'agent.id': agentId,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return insights.slice(0, 4); // Limit to 4 insights to avoid overwhelming
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      this.logger.error('Failed to generate performance insights', { error });
      return [];
    }
  }

  async generateQuickInsights(
    conversationId: string,
    agentId: string,
    analysis: RealTimeAnalysis
  ): Promise<PerformanceInsight[]> {
    const span = monitoring.startSpan('performance_insights.quick');

    try {
      const insights: PerformanceInsight[] = [];
      const timestamp = Date.now();

      // Immediate coaching based on sentiment
      if (analysis.sentiment.label === 'negative' && analysis.sentiment.confidence > 60) {
        insights.push({
          id: `insight_${Date.now()}_sentiment`,
          type: 'coaching',
          title: 'Sentiment Alert',
          description: 'Negative sentiment detected. Focus on empathy and understanding.',
          severity: 'medium',
          actionable: true,
          actions: [
            {
              label: 'View Empathy Tips',
              type: 'SHOW_EMPATHY_GUIDE',
            },
          ],
          metrics: {
            sentimentScore: analysis.sentiment.score,
            confidence: analysis.sentiment.confidence,
          },
          timestamp,
          validUntil: timestamp + 300000, // Valid for 5 minutes
        });
      }

      // Urgency-based insight
      if (analysis.intent.urgency > 70) {
        insights.push({
          id: `insight_${Date.now()}_urgency`,
          type: 'opportunity',
          title: 'High Urgency Opportunity',
          description: 'This lead shows high urgency. Prioritize immediate response.',
          severity: 'high',
          actionable: true,
          actions: [
            {
              label: 'Priority Actions',
              type: 'SHOW_URGENT_RESPONSES',
            },
          ],
          metrics: {
            urgency: analysis.intent.urgency,
            purchaseIntent: analysis.intent.purchaseIntent,
          },
          timestamp,
          validUntil: timestamp + 600000, // Valid for 10 minutes
        });
      }

      // Conversion opportunity
      if (analysis.intent.purchaseIntent > 80) {
        insights.push({
          id: `insight_${Date.now()}_conversion`,
          type: 'opportunity',
          title: 'Ready to Convert',
          description: 'High purchase intent detected. This is a strong conversion opportunity.',
          severity: 'high',
          actionable: true,
          actions: [
            {
              label: 'Closing Techniques',
              type: 'SHOW_CLOSING_GUIDE',
            },
          ],
          metrics: {
            purchaseIntent: analysis.intent.purchaseIntent,
            confidence: analysis.intent.confidence,
          },
          timestamp,
          validUntil: timestamp + 900000, // Valid for 15 minutes
        });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return insights;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      return [];
    }
  }

  private generateRealTimeInsights(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    agentId: string,
    timestamp: number
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Response timing insight
    const responseTime = this.calculateResponseTime(conversation);
    if (responseTime > 120) {
      insights.push({
        id: `insight_${Date.now()}_response_time`,
        type: 'performance',
        title: 'Response Time Alert',
        description: 'Your response time is slower than recommended. Try to respond within 2 minutes.',
        severity: 'medium',
        actionable: true,
        actions: [
          {
            label: 'Use Quick Responses',
            type: 'SHOW_QUICK_RESPONSES',
          },
        ],
        metrics: {
          responseTime,
          targetTime: 120,
        },
        timestamp,
        validUntil: timestamp + 300000,
      });
    }

    // Message balance insight
    const messageBalance = this.calculateMessageBalance(conversation);
    if (messageBalance.ratio > 0.7 && conversation.messages.length > 10) {
      insights.push({
        id: `insight_${Date.now()}_message_balance`,
        type: 'coaching',
        title: 'Talking vs. Listening',
        description: `You're doing ${messageBalance.percentage}% of the talking. Practice active listening.`,
        severity: 'low',
        actionable: true,
        actions: [
          {
            label: 'Active Listening Tips',
            type: 'SHOW_LISTENING_GUIDE',
          },
        ],
        metrics: {
          agentTalkRatio: messageBalance.ratio,
          leadTalkRatio: 1 - messageBalance.ratio,
        },
        timestamp,
        validUntil: timestamp + 600000,
      });
    }

    // Question effectiveness
    const questionAnalysis = this.analyzeQuestionEffectiveness(conversation);
    if (questionAnalysis.openQuestionRatio < 0.4) {
      insights.push({
        id: `insight_${Date.now()}_questions`,
        type: 'coaching',
        title: 'Open-Ended Questions',
        description: 'Use more open-ended questions to encourage detailed responses.',
        severity: 'low',
        actionable: true,
        actions: [
          {
            label: 'Question Examples',
            type: 'SHOW_QUESTION_GUIDE',
          },
        ],
        metrics: {
          openQuestionRatio: questionAnalysis.openQuestionRatio,
          closedQuestionRatio: questionAnalysis.closedQuestionRatio,
        },
        timestamp,
        validUntil: timestamp + 600000,
      });
    }

    return insights;
  }

  private async generateComparativeInsights(
    agentId: string,
    timestamp: number
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    try {
      // Get peer comparison data (mock for now)
      const peerComparison = await this.getPeerComparison(agentId);

      // Analyze metrics against peers
      for (const [metric, data] of Object.entries(peerComparison.metrics)) {
        if (data.performance === 'below_average') {
          const improvementArea = this.getImprovementArea(metric);
          insights.push({
            id: `insight_${Date.now()}_peer_${metric}`,
            type: 'performance',
            title: `Below Average: ${metric}`,
            description: `Your ${metric} is below team average. ${improvementArea.suggestion}`,
            severity: data.percentile < 25 ? 'high' : 'medium',
            actionable: true,
            actions: improvementArea.actions,
            metrics: {
              agentValue: data.agentValue,
              teamAverage: data.teamAverage,
              percentile: data.percentile,
            },
            timestamp,
            validUntil: timestamp + 3600000, // Valid for 1 hour
          });
        } else if (data.performance === 'above_average' && Math.random() > 0.7) {
          // Occasionally show positive reinforcement
          insights.push({
            id: `insight_${Date.now()}_strength_${metric}`,
            type: 'performance',
            title: `Strength: ${metric}`,
            description: `You're performing above average in ${metric}. Keep it up!`,
            severity: 'info',
            actionable: false,
            metrics: {
              agentValue: data.agentValue,
              percentile: data.percentile,
            },
            timestamp,
            validUntil: timestamp + 3600000,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to generate comparative insights', { error });
    }

    return insights;
  }

  private async generateTrendInsights(
    agentId: string,
    timestamp: number
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    try {
      // Get trend analysis (mock for now)
      const trends = await this.getTrendAnalysis(agentId);

      // Analyze trends and generate insights
      if (trends.metrics.conversionRate.trend === 'down' && trends.metrics.conversionRate.change > 5) {
        insights.push({
          id: `insight_${Date.now()}_trend_conversion`,
          type: 'trend',
          title: 'Conversion Rate Declining',
          description: `Your conversion rate decreased by ${trends.metrics.conversionRate.change}%. Review recent conversations for patterns.`,
          severity: 'medium',
          actionable: true,
          actions: [
            {
              label: 'Review Recent Conversations',
              type: 'SHOW_RECENT_CONVERSATIONS',
            },
            {
              label: 'Coaching Session',
              type: 'REQUEST_COACHING',
            },
          ],
          metrics: {
            current: trends.metrics.conversionRate.current,
            previous: trends.metrics.conversionRate.previous,
            change: trends.metrics.conversionRate.change,
          },
          timestamp,
          validUntil: timestamp + 7200000, // Valid for 2 hours
        });
      }

      if (trends.metrics.responseTime.trend === 'up') {
        insights.push({
          id: `insight_${Date.now()}_trend_response`,
          type: 'trend',
          title: 'Response Time Improving',
          description: `Great job! Your response time improved by ${Math.abs(trends.metrics.responseTime.change)}%.`,
          severity: 'info',
          actionable: false,
          metrics: {
            current: trends.metrics.responseTime.current,
            previous: trends.metrics.responseTime.previous,
            improvement: Math.abs(trends.metrics.responseTime.change),
          },
          timestamp,
          validUntil: timestamp + 7200000,
        });
      }
    } catch (error) {
      this.logger.error('Failed to generate trend insights', { error });
    }

    return insights;
  }

  private generateSkillInsights(
    conversation: ConversationContext,
    agentId: string,
    timestamp: number
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Objection handling skill
    const objectionsHandled = this.countObjectionsHandled(conversation);
    if (objectionsHandled > 2) {
      insights.push({
        id: `insight_${Date.now()}_skill_objections`,
        type: 'coaching',
        title: 'Objection Handling Practice',
        description: `You've handled ${objectionsHandled} objections in this conversation. ${objectionsHandled > 3 ? 'Excellent persistence!' : 'Good job addressing concerns.'}`,
        severity: 'info',
        actionable: false,
        metrics: {
          objectionsHandled,
          skillLevel: objectionsHandled > 3 ? 'advanced' : 'intermediate',
        },
        timestamp,
        validUntil: timestamp + 3600000,
      });
    }

    // Rapport building assessment
    const rapportScore = this.assessRapportBuilding(conversation);
    if (rapportScore < 0.3 && conversation.messages.length > 8) {
      insights.push({
        id: `insight_${Date.now()}_skill_rapport`,
        type: 'coaching',
        title: 'Build Rapport',
        description: 'Try building more personal connection before diving into product details.',
        severity: 'low',
        actionable: true,
        actions: [
          {
            label: 'Rapport Building Tips',
            type: 'SHOW_RAPPORT_GUIDE',
          },
        ],
        metrics: {
          rapportScore,
          targetScore: 0.5,
        },
        timestamp,
        validUntil: timestamp + 600000,
      });
    }

    return insights;
  }

  private generateOpportunityInsights(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    agentId: string,
    timestamp: number
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Cross-sell opportunity
    const crossSellOpps = this.identifyCrossSellOpportunities(conversation, analysis);
    if (crossSellOpps.length > 0) {
      insights.push({
        id: `insight_${Date.now()}_opp_cross_sell`,
        type: 'opportunity',
        title: 'Cross-Sell Opportunity',
        description: `Consider mentioning ${crossSellOpps[0].product} based on the lead's needs.`,
        severity: 'info',
        actionable: true,
        actions: [
          {
            label: 'View Cross-Sell Guide',
            type: 'SHOW_CROSS_SELL_GUIDE',
            payload: { product: crossSellOpps[0].product },
          },
        ],
        metrics: {
          opportunityScore: crossSellOpps[0].score,
          product: crossSellOpps[0].product,
        },
        timestamp,
        validUntil: timestamp + 900000,
      });
    }

    // Follow-up opportunity
    if (analysis.intent.primary === 'FOLLOW_UP' || analysis.intent.primary === 'NOT_INTERESTED') {
      insights.push({
        id: `insight_${Date.now()}_opp_follow_up`,
        type: 'opportunity',
        title: 'Follow-Up Strategy',
        description: 'This lead needs follow-up. Consider scheduling a callback in 2-3 days.',
        severity: 'low',
        actionable: true,
        actions: [
          {
            label: 'Schedule Follow-Up',
            type: 'SCHEDULE_FOLLOW_UP',
            payload: { timeframe: '2-3 days' },
          },
        ],
        metrics: {
          followUpPriority: analysis.intent.urgency > 50 ? 'high' : 'medium',
        },
        timestamp,
        validUntil: timestamp + 7200000,
      });
    }

    return insights;
  }

  // Helper methods
  private calculateResponseTime(conversation: ConversationContext): number {
    if (conversation.messages.length < 2) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < conversation.messages.length; i++) {
      const prev = conversation.messages[i - 1];
      const curr = conversation.messages[i];

      if (prev.role !== curr.role) {
        const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }

    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  private calculateMessageBalance(conversation: ConversationContext) {
    const agentMessages = conversation.messages.filter((m) => m.role === 'agent').length;
    const leadMessages = conversation.messages.filter((m) => m.role === 'lead').length;
    const total = agentMessages + leadMessages;

    return {
      ratio: total > 0 ? agentMessages / total : 0,
      percentage: total > 0 ? Math.round((agentMessages / total) * 100) : 0,
    };
  }

  private analyzeQuestionEffectiveness(conversation: ConversationContext) {
    const agentMessages = conversation.messages.filter((m) => m.role === 'agent');
    let openQuestions = 0;
    let closedQuestions = 0;

    for (const message of agentMessages) {
      const content = message.content.toLowerCase();
      if (content.includes('?')) {
        if (this.isOpenEndedQuestion(content)) {
          openQuestions++;
        } else {
          closedQuestions++;
        }
      }
    }

    const totalQuestions = openQuestions + closedQuestions;
    return {
      openQuestionRatio: totalQuestions > 0 ? openQuestions / totalQuestions : 0,
      closedQuestionRatio: totalQuestions > 0 ? closedQuestions / totalQuestions : 0,
      openQuestions,
      closedQuestions,
    };
  }

  private isOpenEndedQuestion(message: string): boolean {
    const openQuestionStarters = [
      'what are',
      'tell me',
      'describe',
      'explain',
      'how do',
      'why',
      'what do',
      'can you describe',
    ];
    
    const lowerMessage = message.toLowerCase();
    return openQuestionStarters.some((starter) => lowerMessage.includes(starter));
  }

  private countObjectionsHandled(conversation: ConversationContext): number {
    const objections = [
      'expensive',
      'cost',
      'price',
      'unaffordable',
      'too much',
      'not sure',
      'concern',
      'worry',
      'problem',
      'issue',
    ];

    let objectionCount = 0;
    for (const message of conversation.messages) {
      if (message.role === 'lead') {
        const lowerContent = message.content.toLowerCase();
        if (objections.some((obj) => lowerContent.includes(obj))) {
          objectionCount++;
        }
      }
    }

    return objectionCount;
  }

  private assessRapportBuilding(conversation: ConversationContext): number {
    const rapportIndicators = [
      'thank you',
      'thanks',
      'great',
      'perfect',
      'wonderful',
      'good',
      'nice',
      'appreciate',
      'understand',
    ];

    let rapportScore = 0;
    for (const message of conversation.messages) {
      const lowerContent = message.content.toLowerCase();
      rapportScore += rapportIndicators.filter((indicator) => 
        lowerContent.includes(indicator)
      ).length;
    }

    return Math.min(rapportScore / conversation.messages.length, 1);
  }

  private identifyCrossSellOpportunities(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis
  ): Array<{ product: string; score: number }> {
    const opportunities: Array<{ product: string; score: number }> = [];

    // Simple logic based on insurance type and conversation content
    if (conversation.insuranceType === 'auto') {
      opportunities.push({ product: 'Home Insurance', score: 0.7 });
      opportunities.push({ product: 'Life Insurance', score: 0.5 });
    } else if (conversation.insuranceType === 'home') {
      opportunities.push({ product: 'Auto Insurance', score: 0.7 });
      opportunities.push({ product: 'Umbrella Policy', score: 0.6 });
    }

    // Adjust scores based on conversation content
    const allText = conversation.messages.map((m) => m.content.toLowerCase()).join(' ');
    
    if (allText.includes('family') || allText.includes('kids')) {
      opportunities.push({ product: 'Life Insurance', score: 0.8 });
    }

    if (allText.includes('work') || allText.includes('business')) {
      opportunities.push({ product: 'Commercial Insurance', score: 0.6 });
    }

    return opportunities.filter((opp) => opp.score > 0.5);
  }

  private getImprovementArea(metric: string) {
    const improvementAreas: Record<string, { suggestion: string; actions: any[] }> = {
      conversionRate: {
        suggestion: 'Focus on closing techniques and objection handling.',
        actions: [
          {
            label: 'Closing Techniques',
            type: 'SHOW_CLOSING_GUIDE',
          },
          {
            label: 'Objection Handling',
            type: 'SHOW_OBJECTION_GUIDE',
          },
        ],
      },
      responseTime: {
        suggestion: 'Use quick response templates and prioritize urgent leads.',
        actions: [
          {
            label: 'Quick Responses',
            type: 'SHOW_QUICK_RESPONSES',
          },
          {
            label: 'Time Management Tips',
            type: 'SHOW_TIME_MANAGEMENT',
          },
        ],
      },
      conversationQuality: {
        suggestion: 'Ask more open-ended questions and build rapport.',
        actions: [
          {
            label: 'Question Techniques',
            type: 'SHOW_QUESTION_GUIDE',
          },
          {
            label: 'Rapport Building',
            type: 'SHOW_RAPPORT_GUIDE',
          },
        ],
      },
    };

    return improvementAreas[metric] || {
      suggestion: 'Continue practicing and reviewing best practices.',
      actions: [
        {
          label: 'Best Practices',
          type: 'SHOW_BEST_PRACTICES',
        },
      ],
    };
  }

  // Mock methods for data sources (replace with actual database calls)
  private async getPeerComparison(agentId: string): Promise<PeerComparison> {
    // Mock peer comparison data
    return {
      agentId,
      metrics: {
        conversionRate: {
          agentValue: 0.25,
          teamAverage: 0.30,
          teamTop: 0.45,
          percentile: 35,
          performance: 'below_average',
        },
        responseTime: {
          agentValue: 95,
          teamAverage: 85,
          teamTop: 45,
          percentile: 60,
          performance: 'average',
        },
        conversationQuality: {
          agentValue: 7.8,
          teamAverage: 8.2,
          teamTop: 9.5,
          percentile: 55,
          performance: 'average',
        },
        customerSatisfaction: {
          agentValue: 8.5,
          teamAverage: 8.3,
          teamTop: 9.8,
          percentile: 70,
          performance: 'above_average',
        },
      },
      benchmarkDate: Date.now(),
    };
  }

  private async getTrendAnalysis(agentId: string): Promise<TrendAnalysis> {
    // Mock trend analysis data
    return {
      agentId,
      timeRange: {
        start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        end: Date.now(),
      },
      metrics: {
        conversionRate: {
          current: 0.25,
          previous: 0.28,
          trend: 'down',
          change: 10.7,
        },
        responseTime: {
          current: 95,
          previous: 110,
          trend: 'down',
          change: 13.6,
        },
        conversationQuality: {
          current: 7.8,
          previous: 7.5,
          trend: 'up',
          change: 4.0,
        },
        customerSatisfaction: {
          current: 8.5,
          previous: 8.2,
          trend: 'up',
          change: 3.7,
        },
      },
      topImprovements: ['Response time', 'Customer satisfaction', 'Conversation quality'],
      topConcerns: ['Conversion rate declining'],
    };
  }

  recordMetric(agentId: string, metric: string, value: number, context: Record<string, unknown>): void {
    const metricData: PerformanceMetric = {
      agentId,
      timestamp: Date.now(),
      metric,
      value,
      context,
    };

    if (!this.performanceHistory.has(agentId)) {
      this.performanceHistory.set(agentId, []);
    }

    this.performanceHistory.get(agentId)!.push(metricData);

    // Keep only last 1000 metrics per agent
    const history = this.performanceHistory.get(agentId)!;
    if (history.length > 1000) {
      this.performanceHistory.set(agentId, history.slice(-1000));
    }

    monitoring.recordMetric(`agent.performance.${metric}`, value, {
      'agent.id': agentId,
      ...context,
    });
  }

  getPerformanceHistory(agentId: string, limit: number = 100): PerformanceMetric[] {
    const history = this.performanceHistory.get(agentId) || [];
    return history.slice(-limit);
  }

  cleanup(): void {
    this.performanceHistory.clear();
    this.conversationPerformance.clear();
  }
}