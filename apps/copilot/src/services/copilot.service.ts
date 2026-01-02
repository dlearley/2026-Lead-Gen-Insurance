import { Logger } from 'winston';
import { ConversationAnalysisService } from './conversation-analysis.service';
import { RecommendationEngine } from './recommendation-engine.service';
import { PerformanceInsightsService } from './performance-insights.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { monitoring } from '../monitoring/observability';
import { SpanStatusCode } from '@opentelemetry/api';

export interface ConversationContext {
  conversationId: string;
  agentId: string;
  leadId?: string;
  insuranceType?: string;
  messages: Array<{
    id: string;
    role: 'agent' | 'lead' | 'system';
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

export interface RealTimeAnalysis {
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  intent: {
    primary: string;
    confidence: number;
    categories: string[];
  };
  entities: Array<{
    entity: string;
    type: string;
    value: string;
    confidence: number;
  }>;
  urgency: number; // 0-100
  engagement: number; // 0-100
}

export interface Recommendation {
  id: string;
  type: 'response' | 'action' | 'knowledge' | 'coaching';
  title?: string;
  content: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface Insight {
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
  timestamp: number;
}

export class CopilotService {
  private readonly logger: Logger;
  private conversations: Map<string, ConversationContext> = new Map();
  private activeStreams: Map<string, any> = new Map();

  constructor(
    private readonly conversationAnalysis: ConversationAnalysisService,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly performanceInsights: PerformanceInsightsService,
    private readonly knowledgeBase: KnowledgeBaseService
  ) {
    this.logger = global.logger || console;
  }

  async processMessage(
    conversationId: string,
    message: {
      role: 'agent' | 'lead';
      content: string;
      timestamp?: number;
    },
    context: {
      agentId: string;
      leadId?: string;
      insuranceType?: string;
    }
  ): Promise<{
    analysis?: RealTimeAnalysis;
    recommendations: Recommendation[];
    insights: Insight[];
    streaming?: boolean;
  }> {
    const span = monitoring.startSpan('copilot.process_message', {
      'conversation.id': conversationId,
      'agent.id': context.agentId,
      'message.role': message.role,
    });

    try {
      const startTime = Date.now();
      
      // Get or create conversation context
      let conversation = this.conversations.get(conversationId);
      if (!conversation) {
        conversation = {
          conversationId,
          agentId: context.agentId,
          leadId: context.leadId,
          insuranceType: context.insuranceType,
          messages: [],
        };
        this.conversations.set(conversationId, conversation);
      }

      // Add message to conversation
      const messageId = this.generateMessageId();
      conversation.messages.push({
        id: messageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || Date.now(),
      });

      // Keep only last 20 messages for context
      if (conversation.messages.length > 20) {
        conversation.messages = conversation.messages.slice(-20);
      }

      // Generate real-time analysis
      const analysis = await this.conversationAnalysis.analyze(
        conversation,
        message.content,
        message.role
      );

      // Generate recommendations
      const recommendations = await this.recommendationEngine.generate(
        conversation,
        analysis,
        message.role
      );

      // Generate insights
      const insights = await this.performanceInsights.generate(
        conversation,
        analysis,
        context.agentId
      );

      const duration = Date.now() - startTime;
      
      monitoring.recordMetric('copilot.processing.duration', duration, {
        'conversation.id': conversationId,
        'agent.id': context.agentId,
      });

      monitoring.recordMetric('copilot.recommendations.generated', recommendations.length, {
        'conversation.id': conversationId,
        'agent.id': context.agentId,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return {
        analysis,
        recommendations,
        insights,
        streaming: true,
      };

    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      this.logger.error('Failed to process message', {
        conversationId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  async *streamAnalysis(
    conversationId: string,
    message: {
      role: 'agent' | 'lead';
      content: string;
    },
    context: {
      agentId: string;
      leadId?: string;
    }
  ): AsyncGenerator<{
    type: 'analysis' | 'recommendation' | 'insight' | 'complete';
    data: any;
  }> {
    const span = monitoring.startSpan('copilot.stream_analysis', {
      'conversation.id': conversationId,
      'agent.id': context.agentId,
    });

    try {
      // Stream sentiment analysis first (fastest)
      const sentimentPromise = this.conversationAnalysis.analyzeSentiment(
        message.content
      );

      yield {
        type: 'analysis',
        data: {
          step: 'sentiment_analysis_started',
          timestamp: Date.now(),
        },
      };

      const sentiment = await sentimentPromise;

      yield {
        type: 'analysis',
        data: {
          sentiment,
          step: 'sentiment_analysis_complete',
          timestamp: Date.now(),
        },
      };

      // Stream intent detection
      const intentPromise = this.conversationAnalysis.detectIntent(
        message.content,
        message.role
      );

      yield {
        type: 'analysis',
        data: {
          step: 'intent_detection_started',
          timestamp: Date.now(),
        },
      };

      const intent = await intentPromise;

      yield {
        type: 'analysis',
        data: {
          intent,
          step: 'intent_detection_complete',
          timestamp: Date.now(),
        },
      };

      // Stream recommendations progressively
      const recommendations = this.recommendationEngine.streamRecommendations(
        message.content,
        message.role,
        { sentiment, intent }
      );

      let recommendationCount = 0;
      for await (const recommendation of recommendations) {
        yield {
          type: 'recommendation',
          data: recommendation,
        };
        recommendationCount++;
      }

      // Get performance insights
      const insights = await this.performanceInsights.generateQuickInsights(
        conversationId,
        context.agentId,
        { sentiment, intent }
      );

      for (const insight of insights) {
        yield {
          type: 'insight',
          data: insight,
        };
      }

      yield {
        type: 'complete',
        data: {
          recommendationsGenerated: recommendationCount,
          insightsGenerated: insights.length,
          timestamp: Date.now(),
        },
      };

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      this.logger.error('Streaming analysis failed', { conversationId, error });
      yield {
        type: 'complete',
        data: {
          error: error.message,
          success: false,
        },
      };
    }
  }

  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  getActiveConversations(agentId?: string): ConversationContext[] {
    const conversations = Array.from(this.conversations.values());
    if (agentId) {
      return conversations.filter((c) => c.agentId === agentId);
    }
    return conversations;
  }

  endConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      this.logger.info('Ending conversation', { conversationId });
      this.conversations.delete(conversationId);
      
      monitoring.recordEvent('conversation.ended', {
        'conversation.id': conversationId,
        'agent.id': conversation.agentId,
        messageCount: conversation.messages.length,
      });
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up copilot service');
    const activeConversations = this.getActiveConversations();
    
    for (const conversation of activeConversations) {
      this.endConversation(conversation.conversationId);
    }

    this.conversations.clear();
    this.activeStreams.clear();

    monitoring.recordEvent('copilot.cleanup', {
      conversationsClosed: activeConversations.length,
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getServiceHealth() {
    return {
      activeConversations: this.conversations.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }
}