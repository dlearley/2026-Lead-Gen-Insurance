import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ConversationContext, RealTimeAnalysis } from './copilot.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { monitoring } from '../monitoring/observability';
import { SpanStatusCode } from '@opentelemetry/api';

export interface RecommendationContext {
  sentiment: any;
  intent: any;
  entities?: any[];
  conversation?: ConversationContext;
}

export interface ResponseRecommendation {
  id: string;
  type: 'response';
  title: string;
  content: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  metadata?: {
    tone?: string;
    length?: string;
    followUp?: boolean;
  };
}

export interface ActionRecommendation {
  id: string;
  type: 'action';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  action: {
    type: string;
    payload?: Record<string, unknown>;
  };
  expectedOutcome?: string;
}

export interface KnowledgeRecommendation {
  id: string;
  type: 'knowledge';
  title: string;
  content: string;
  source: string;
  relevance: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}

export interface CoachingRecommendation {
  id: string;
  type: 'coaching';
  title: string;
  insight: string;
  suggestion: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  performanceArea: string;
  timestamp: number;
}

export type Recommendation =
  | ResponseRecommendation
  | ActionRecommendation
  | KnowledgeRecommendation
  | CoachingRecommendation;

export class RecommendationEngine {
  private model: ChatOpenAI;
  private readonly logger: any;

  constructor(private readonly knowledgeBase: KnowledgeBaseService) {
    this.model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.2,
      maxTokens: 800,
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.logger = global.logger || console;
  }

  async generate(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    messageRole: 'agent' | 'lead'
  ): Promise<Recommendation[]> {
    const span = monitoring.startSpan('recommendations.generate', {
      'conversation.id': conversation.conversationId,
      'message.role': messageRole,
    });

    try {
      const recommendations: Recommendation[] = [];
      const context = { sentiment: analysis.sentiment, intent: analysis.intent, conversation };

      // Generate response recommendations (for lead messages)
      if (messageRole === 'lead') {
        const responseRecs = await this.generateResponseRecommendations(
          conversation,
          analysis,
          context
        );
        recommendations.push(...responseRecs);
      }

      // Generate action recommendations
      const actionRecs = await this.generateActionRecommendations(
        conversation,
        analysis,
        context
      );
      recommendations.push(...actionRecs);

      // Generate knowledge base recommendations
      const knowledgeRecs = await this.generateKnowledgeRecommendations(
        conversation,
        analysis,
        context
      );
      recommendations.push(...knowledgeRecs);

      // Generate coaching recommendations
      const coachingRecs = await this.generateCoachingRecommendations(
        conversation,
        analysis,
        context
      );
      recommendations.push(...coachingRecs);

      // Prioritize recommendations
      const prioritized = this.prioritizeRecommendations(recommendations);

      // Limit to top 5 recommendations
      const topRecommendations = prioritized.slice(0, 5);

      monitoring.recordMetric('recommendations.generated', topRecommendations.length, {
        'conversation.id': conversation.conversationId,
        'message.role': messageRole,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return topRecommendations;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      this.logger.error('Failed to generate recommendations', { error });
      return [];
    }
  }

  async *streamRecommendations(
    message: string,
    role: 'agent' | 'lead',
    context: RecommendationContext
  ): AsyncGenerator<ResponseRecommendation | KnowledgeRecommendation | CoachingRecommendation> {
    const span = monitoring.startSpan('recommendations.stream');

    try {
      // Stream response recommendations for lead messages
      if (role === 'lead') {
        const responseStream = this.streamResponseRecommendations(message, context);
        for await (const rec of responseStream) {
          yield rec;
        }
      }

      // Stream knowledge base recommendations
      const knowledgeStream = this.streamKnowledgeRecommendations(message, context);
      for await (const rec of knowledgeStream) {
        yield rec;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      this.logger.error('Streaming recommendations failed', { error });
    }
  }

  private async generateResponseRecommendations(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    context: RecommendationContext
  ): Promise<ResponseRecommendation[]> {
    try {
      const prompt = PromptTemplate.fromTemplate(
        `You are an expert insurance sales coach. Generate helpful response suggestions for an agent.

Current conversation context:
- Sentiment: {sentimentLabel} (score: {sentimentScore})
- Primary intent: {intentPrimary}
- Urgency: {urgency}%
- Purchase intent: {purchaseIntent}%
- Key entities: {entities}

Last few messages:
{messageHistory}

Generate 3-5 response suggestions that would be helpful for the agent to respond to the lead.
Consider:
1. The lead's sentiment and emotional state
2. Their stated intent and goals
3. Appropriate tone (professional, empathetic, enthusiastic)
4. Sales best practices
5. Moving the conversation toward conversion

Format each response with:
- Title: Brief description of the response type
- Content: The actual suggested response
- Priority: high/medium/low based on urgency and context
- Category: (e.g., "empathetic", "informational", "closing")

Generate responses:`
      );

      const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

      const messageHistory = conversation.messages
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const result = await chain.invoke({
        sentimentLabel: analysis.sentiment.label,
        sentimentScore: analysis.sentiment.score,
        intentPrimary: analysis.intent.primary,
        urgency: analysis.intent.urgency,
        purchaseIntent: analysis.intent.purchaseIntent,
        entities: analysis.entities.map((e) => e.entity).join(', '),        
        messageHistory,
      });

      return this.parseResponseRecommendations(result, conversation);
    } catch (error) {
      this.logger.error('Failed to generate response recommendations', { error });
      return this.getFallbackResponses(analysis, conversation);
    }
  }

  private async *streamResponseRecommendations(
    message: string,
    context: RecommendationContext
  ): AsyncGenerator<ResponseRecommendation> {
    try {
      // Generate quick response suggestions based on intent and sentiment
      const templates = this.getResponseTemplates(context.intent.primary);
      
      for (let i = 0; i < Math.min(templates.length, 3); i++) {
        const template = templates[i];
        yield {
          id: `resp_${Date.now()}_${i}`,
          type: 'response',
          title: template.title,
          content: this.fillTemplate(template.content, context),
          confidence: 80 - i * 10, // Decreasing confidence for variety
          priority: i === 0 ? 'high' : 'medium',
          category: template.category,
          metadata: {
            tone: template.tone,
            followUp: template.followUp,
          },
        };

        // Small delay between suggestions to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      this.logger.error('Failed to stream response recommendations', { error });
    }
  }

  private async generateActionRecommendations(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    context: RecommendationContext
  ): Promise<ActionRecommendation[]> {
    const actions: ActionRecommendation[] = [];

    // Action based on urgency
    if (analysis.intent.urgency > 70) {
      actions.push({
        id: `action_${Date.now()}_urgent`,
        type: 'action',
        title: 'Flag as Urgent',
        description: 'This lead has high urgency and should be prioritized',
        confidence: analysis.intent.confidence,
        priority: 'high',
        action: {
          type: 'FLAG_URGENT',
          payload: {
            reason: 'High urgency detected',
            priority: 'high',
          },
        },
        expectedOutcome: 'Faster response time and higher conversion probability',
      });
    }

    // Action based on sentiment
    if (analysis.sentiment.label === 'negative' && analysis.sentiment.confidence > 60) {
      actions.push({
        id: `action_${Date.now()}_escalate`,
        type: 'action',
        title: 'Escalate to Supervisor',
        description: 'Negative sentiment detected, consider supervisor assistance',
        confidence: analysis.sentiment.confidence,
        priority: 'medium',
        action: {
          type: 'ESCALATE',
          payload: {
            reason: 'Negative sentiment',
            sentiment: analysis.sentiment,
          },
        },
        expectedOutcome: 'Better customer satisfaction through expert assistance',
      });
    }

    // Action based on purchase intent
    if (analysis.intent.purchaseIntent > 80) {
      actions.push({
        id: `action_${Date.now()}_closing`,
        type: 'action',
        title: 'Move to Closing',
        description: 'High purchase intent detected, ready for closing',
        confidence: analysis.intent.purchaseIntent,
        priority: 'high',
        action: {
          type: 'MOVE_TO_CLOSING',
          payload: {
            intent: analysis.intent,
          },
        },
        expectedOutcome: 'Higher conversion rate by focusing on closing',
      });
    }

    // Schedule follow-up action
    if (conversation.messages.length > 5) {
      actions.push({
        id: `action_${Date.now()}_followup`,
        type: 'action',
        title: 'Schedule Follow-up',
        description: 'Schedule a follow-up based on conversation progress',
        confidence: 70,
        priority: 'medium',
        action: {
          type: 'SCHEDULE_FOLLOWUP',
          payload: {
            timeline: '2-3 days',
            reason: 'Conversation needs nurturing',
          },
        },
        expectedOutcome: 'Maintain engagement and increase conversion probability',
      });
    }

    return actions;
  }

  private async generateKnowledgeRecommendations(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    context: RecommendationContext
  ): Promise<KnowledgeRecommendation[]> {
    try {
      // Search knowledge base for relevant information
      const searchQueries = [
        analysis.intent.primary,
        ...analysis.entities.map((e) => e.entity),
        conversation.insuranceType,
      ].filter(Boolean);

      const knowledgeBaseResults: KnowledgeRecommendation[] = [];

      for (const query of searchQueries.slice(0, 3)) {
        const results = await this.knowledgeBase.search(query, {
          top_k: 2,
          filter: conversation.insuranceType ? { category: conversation.insuranceType } : undefined,
        });

        for (const result of results) {
          knowledgeBaseResults.push({
            id: `kb_${Date.now()}_${result.id}`,
            type: 'knowledge',
            title: result.title,
            content: result.content.substring(0, 300) + '...',
            source: result.source,
            relevance: result.relevance,
            priority: result.relevance > 0.8 ? 'high' : result.relevance > 0.6 ? 'medium' : 'low',
            category: result.category,
          });
        }
      }

      // Deduplicate and return top results
      const uniqueResults = this.deduplicateKnowledgeResults(knowledgeBaseResults);
      return uniqueResults.slice(0, 3);
    } catch (error) {
      this.logger.error('Failed to generate knowledge recommendations', { error });
      return [];
    }
  }

  private async *streamKnowledgeRecommendations(
    message: string,
    context: RecommendationContext
  ): AsyncGenerator<KnowledgeRecommendation> {
    try {
      // Quick knowledge base lookup for immediate results
      const quickResults = await this.knowledgeBase.quickSearch(message, {
        top_k: 2,
      });

      for (const result of quickResults) {
        yield {
          id: `kb_stream_${Date.now()}_${result.id}`,
          type: 'knowledge',
          title: result.title,
          content: result.content.substring(0, 200) + '...',
          source: result.source,
          relevance: result.relevance,
          priority: result.relevance > 0.7 ? 'high' : 'medium',
          category: result.category,
        };

        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      this.logger.error('Failed to stream knowledge recommendations', { error });
    }
  }

  private async generateCoachingRecommendations(
    conversation: ConversationContext,
    analysis: RealTimeAnalysis,
    context: RecommendationContext
  ): Promise<CoachingRecommendation[]> {
    const coaching: CoachingRecommendation[] = [];

    // Coaching based on sentiment
    if (analysis.sentiment.label === 'negative' && analysis.sentiment.confidence > 60) {
      coaching.push({
        id: `coach_${Date.now()}_empathy`,
        type: 'coaching',
        title: 'Show Empathy',
        insight: 'The lead is expressing negative sentiment',
        suggestion: `Acknowledge their concerns and show understanding. Use phrases like "I understand this is important" or "I can see why you'd feel that way".`,
        confidence: analysis.sentiment.confidence,
        priority: 'high',
        performanceArea: 'empathy',
        timestamp: Date.now(),
      });
    }

    // Coaching based on message balance
    const agentMessages = conversation.messages.filter((m) => m.role === 'agent').length;
    const leadMessages = conversation.messages.filter((m) => m.role === 'lead').length;
    
    if (agentMessages > leadMessages * 1.5 && conversation.messages.length > 5) {
      coaching.push({
        id: `coach_${Date.now()}_listening`,
        type: 'coaching',
        title: 'Practice Active Listening',
        insight: "You're talking more than the lead",
        suggestion: 'Ask more open-ended questions and let the lead share more about their needs. Try: "Tell me more about..." or "What are your thoughts on..."',
        confidence: 75,
        priority: 'medium',
        performanceArea: 'listening',
        timestamp: Date.now(),
      });
    }

    // Coaching based on urgency
    if (analysis.intent.urgency > 70) {
      coaching.push({
        id: `coach_${Date.now()}_urgency`,
        type: 'coaching',
        title: 'Address Urgency',
        insight: 'High urgency detected - this lead needs quick action',
        suggestion: 'Fast-track this conversation. Prioritize efficiency, provide clear next steps, and avoid unnecessary delays.',
        confidence: analysis.intent.confidence,
        priority: 'high',
        performanceArea: 'responsiveness',
        timestamp: Date.now(),
      });
    }

    return coaching.slice(0, 2); // Limit coaching tips to avoid overwhelming
  }

  private getResponseTemplates(intent: string): Array<{
    title: string;
    content: string;
    category: string;
    tone: string;
    followUp: boolean;
  }> {
    const templates = {
      INFORMATION_SEEKING: [
        {
          title: 'Provide Clear Information',
          content: 'I\'d be happy to explain that in detail. {insuranceType} insurance typically covers...',
          category: 'informational',
          tone: 'helpful',
          followUp: true,
        },
        {
          title: 'Offer Specific Examples',
          content: 'Great question! Let me give you a specific example of how this works...',
          category: 'educational',
          tone: 'engaging',
          followUp: true,
        },
      ],
      PRICE_SHOPPING: [
        {
          title: 'Address Price Concerns',
          content: 'I understand price is important. Let me explain our pricing structure and what\'s included...',
          category: 'pricing',
          tone: 'empathetic',
          followUp: true,
        },
        {
          title: 'Focus on Value',
          content: 'While price is important, let me show you the value you\'ll receive with our coverage...',
          category: 'value_proposition',
          tone: 'confident',
          followUp: true,
        },
      ],
      OBJECTION: [
        {
          title: 'Acknowledge and Address',
          content: 'I understand your concern about {objection}. Many of our customers felt the same way initially. Here\'s how we address that...',
          category: 'objection_handling',
          tone: 'empathetic',
          followUp: true,
        },
        {
          title: 'Provide Social Proof',
          content: 'That\'s a valid concern. Let me share how we\'ve helped other clients in similar situations...',
          category: 'social_proof',
          tone: 'reassuring',
          followUp: true,
        },
      ],
      URGENT_NEED: [
        {
          title: 'Fast-Track Process',
          content: 'I understand this is urgent. Let\'s expedite this process. I can have coverage options ready for you within the hour...',
          category: 'urgent_response',
          tone: 'urgent_helpful',
          followUp: false,
        },
      ],
    };

    return templates[intent] || templates.INFORMATION_SEEKING;
  }

  private fillTemplate(template: string, context: RecommendationContext): string {
    let filled = template;
    
    // Replace placeholders with context data
    if (context.conversation?.insuranceType) {
      filled = filled.replace('{insuranceType}', context.conversation.insuranceType);
    }
    
    if (context.sentiment?.emotion) {
      filled = filled.replace('{emotion}', context.sentiment.emotion);
    }
    
    if (context.intent?.primary) {
      filled = filled.replace('{intent}', context.intent.primary);
    }
    
    return filled;
  }

  private parseResponseRecommendations(
    aiResponse: string,
    conversation: ConversationContext
  ): ResponseRecommendation[] {
    // Parse the AI response into structured recommendations
    // This is a simplified parser - in production, you'd use structured output
    const recommendations: ResponseRecommendation[] = [];
    
    try {
      // Split by numbered responses or common delimiters
      const responses = aiResponse.split(/\n\d+\.|\n\* /).filter((r) => r.trim());
      
      responses.forEach((response, index) => {
        const lines = response.trim().split('\n');
        const title = lines[0]?.replace(/^Title:\s*/i, '').trim() || `Response ${index + 1}`;
        const content = lines.find((l) => l.toLowerCase().includes('content:'))?.replace(/Content:\s*/i, '').trim() || 
                       lines[1]?.trim() || '';
        const priority = lines.find((l) => l.toLowerCase().includes('priority:'))?.replace(/Priority:\s*/i, '').trim().toLowerCase() || 'medium';
        const category = lines.find((l) => l.toLowerCase().includes('category:'))?.replace(/Category:\s*/i, '').trim() || 'general';
        
        if (content) {
          recommendations.push({
            id: `resp_${Date.now()}_${index}`,
            type: 'response',
            title,
            content,
            confidence: 85 - index * 5,
            priority: ['high', 'medium', 'low'].includes(priority) ? priority as 'high' | 'medium' | 'low' : 'medium',
            category,
          });
        }
      });
    } catch (error) {
      this.logger.error('Failed to parse response recommendations', { error });
    }
    
    return recommendations;
  }

  private getFallbackResponses(analysis: RealTimeAnalysis, conversation: ConversationContext): ResponseRecommendation[] {
    return [
      {
        id: `resp_${Date.now()}_acknowledge`,
        type: 'response',
        title: 'Acknowledge and Explore',
        content: 'Thank you for sharing that. Can you tell me more about your specific needs?',
        confidence: 70,
        priority: 'high',
        category: 'exploratory',
      },
      {
        id: `resp_${Date.now()}_informative`,
        type: 'response',
        title: 'Provide Information',
        content: 'I\'d be happy to help with that. Let me get you the information you need.',
        confidence: 60,
        priority: 'medium',
        category: 'informational',
      },
    ];
  }

  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return recommendations.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  private deduplicateKnowledgeResults(results: KnowledgeRecommendation[]): KnowledgeRecommendation[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = `${result.title}:${result.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}