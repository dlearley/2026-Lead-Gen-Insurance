import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { monitoring } from '../monitoring/observability';
import { SpanStatusCode } from '@opentelemetry/api';

export interface SentimentResult {
  score: number; // -1 (very negative) to 1 (very positive)
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  emotion?: string; // e.g., 'excited', 'concerned', 'angry', 'happy'
  keywords: string[]; // Key phrases that influenced sentiment
}

export interface IntentResult {
  primary: string; // Main intent detected
  confidence: number; // 0-100
  categories: string[]; // All relevant intent categories
  urgency: number; // 0-100, how urgent is this intent
  purchaseIntent: number; // 0-100, likelihood of purchase
}

export interface EntityResult {
  entity: string; // Detected entity text
  type: string; // Entity type (PRODUCT, AMOUNT, DATE, etc.)
  value: string; // Normalized value
  confidence: number; // 0-100
  start?: number; // Start position in text
  end?: number; // End position in text
}

export interface ConversationAnalysis {
  sentiment: SentimentResult;
  intent: IntentResult;
  entities: EntityResult[];
  summary: string; // Brief summary of message context
  keyTopics: string[]; // Main topics discussed
  engagement: number; // 0-100, level of engagement
  churnRisk: number; // 0-100, risk of lead churning
}

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

export class ConversationAnalysisService {
  private model: ChatOpenAI;
  private sentimentParser: StructuredOutputParser<typeof sentimentSchema>;
  private intentParser: StructuredOutputParser<typeof intentSchema>;
  private entityParser: StructuredOutputParser<typeof entitySchema>;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.3,
      maxTokens: 500,
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.sentimentParser = StructuredOutputParser.fromZodSchema(sentimentSchema);
    this.intentParser = StructuredOutputParser.fromZodSchema(intentSchema);
    this.entityParser = StructuredOutputParser.fromZodSchema(entitySchema);
  }

  async analyze(
    conversation: ConversationContext,
    message: string,
    role: 'agent' | 'lead'
  ): Promise<ConversationAnalysis> {
    const span = monitoring.startSpan('conversation.analysis.full', {
      'conversation.id': conversation.conversationId,
      'analysis.type': 'full',
      'message.role': role,
    });

    try {
      const startTime = Date.now();

      // Run analyses in parallel for better performance
      const [sentiment, intent, entities] = await Promise.all([
        this.analyzeSentiment(message),
        this.detectIntent(message, role),
        this.extractEntities(message),
      ]);

      // Generate summary based on full conversation context
      const summary = await this.generateSummary(conversation, message, role);

      // Extract key topics
      const keyTopics = await this.extractKeyTopics(conversation, message);

      // Calculate engagement and churn risk
      const engagement = this.calculateEngagement(sentiment, intent, conversation);
      const churnRisk = this.calculateChurnRisk(sentiment, intent, conversation);

      const analysis: ConversationAnalysis = {
        sentiment,
        intent,
        entities,
        summary,
        keyTopics,
        engagement,
        churnRisk,
      };

      const duration = Date.now() - startTime;
      
      monitoring.recordMetric('analysis.duration', duration, {
        'conversation.id': conversation.conversationId,
        'analysis.type': 'full',
      });

      monitoring.recordMetric('analysis.entities.found', entities.length, {
        'conversation.id': conversation.conversationId,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return analysis;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  }

  async analyzeSentiment(message: string): Promise<SentimentResult> {
    const span = monitoring.startSpan('conversation.analysis.sentiment');

    try {
      const prompt = PromptTemplate.fromTemplate(
        `Analyze the sentiment of the following message. Consider tone, emotion, and underlying attitude.

Message: "{message}"

{format_instructions}`
      );

      const chain = prompt.pipe(this.model).pipe(this.sentimentParser);

      const result = await chain.invoke({
        message,
        format_instructions: this.sentimentParser.getFormatInstructions(),
      });

      const sentiment: SentimentResult = {
        score: result.score,
        label: result.label as 'positive' | 'neutral' | 'negative',
        confidence: result.confidence,
        emotion: result.emotion,
        keywords: result.keywords || [],
      };

      monitoring.recordMetric('sentiment.score', sentiment.score, {
        'sentiment.label': sentiment.label,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return sentiment;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      // Fallback to simple sentiment analysis
      return this.fallbackSentimentAnalysis(message);
    }
  }

  async detectIntent(
    message: string,
    role: 'agent' | 'lead'
  ): Promise<IntentResult> {
    const span = monitoring.startSpan('conversation.analysis.intent');

    try {
      const intentPrompt = PromptTemplate.fromTemplate(
        `Detect the intent of this message from a {role} in an insurance sales conversation.

Message: "{message}"

Possible intents for leads:
- INFORMATION_SEEKING: Asking questions about products
- PRICE_SHOPPING: Comparing prices or asking about costs
- URGENT_NEED: Expressing immediate need for insurance
- COMPARISON: Comparing with competitors
- OBJECTION: Raising concerns or objections
- READY_TO_BUY: Showing strong purchase intent
- FOLLOW_UP: Requesting follow-up or more time
- NOT_INTERESTED: Showing disinterest

Possible intents for agents:
- QUALIFICATION: Asking qualifying questions
- PRESENTATION: Presenting product information
- CLOSING: Attempting to close the sale
- OBJECTION_HANDLING: Addressing concerns
- FOLLOW_UP_SCHEDULING: Scheduling follow-up actions
- INFORMATION_GATHERING: Collecting lead information

{format_instructions}`
      );

      const chain = intentPrompt.pipe(this.model).pipe(this.intentParser);

      const result = await chain.invoke({
        message,
        role,
        format_instructions: this.intentParser.getFormatInstructions(),
      });

      const intent: IntentResult = {
        primary: result.primary_intent,
        confidence: result.confidence,
        categories: result.categories || [],
        urgency: result.urgency || 0,
        purchaseIntent: result.purchase_intent || 0,
      };

      monitoring.recordMetric('intent.confidence', intent.confidence, {
        'intent.primary': intent.primary,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return intent;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      
      // Fallback intent detection
      return this.fallbackIntentDetection(message, role);
    }
  }

  async extractEntities(message: string): Promise<EntityResult[]> {
    const span = monitoring.startSpan('conversation.analysis.entities');

    try {
      const entityPrompt = PromptTemplate.fromTemplate(
        `Extract entities from this insurance conversation message.

Message: "{message}"

Extract these entity types:
- PRODUCT: Insurance products mentioned
- AMOUNT: Dollar amounts, coverage amounts
- DATE: Dates and time expressions
- CONTACT: Phone numbers, email addresses
- LOCATION: Addresses, cities, states
- POLICY: Policy numbers, types
- NAME: Person names
- ORGANIZATION: Company names

{format_instructions}`
      );

      const chain = entityPrompt.pipe(this.model).pipe(this.entityParser);

      const result = await chain.invoke({
        message,
        format_instructions: this.entityParser.getFormatInstructions(),
      });

      const entities: EntityResult[] = result.entities.map((entity) => ({
        entity: entity.text,
        type: entity.type,
        value: entity.normalized_value,
        confidence: entity.confidence,
        start: entity.start_index,
        end: entity.end_index,
      }));

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return entities;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      return [];
    }
  }

  private async generateSummary(
    conversation: ConversationContext,
    newMessage: string,
    role: 'agent' | 'lead'
  ): Promise<string> {
    try {
      const summaryPrompt = PromptTemplate.fromTemplate(
        `Summarize the key points from this insurance conversation:

Conversation history (last 10 messages):
{history}

New message from {role}: "{message}"

Provide a brief summary (2-3 sentences) of the current conversation state and key discussion points.`
      );

      const chain = summaryPrompt.pipe(this.model);

      const history = conversation.messages
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const summary = await chain.invoke({
        history,
        role,
        message: newMessage,
      });

      return summary.content.toString();
    } catch (error) {
      this.logger.warn('Failed to generate summary, using fallback', { error });
      return `New message from ${role}: ${newMessage.substring(0, 100)}...`;
    }
  }

  private async extractKeyTopics(
    conversation: ConversationContext,
    newMessage: string
  ): Promise<string[]> {
    try {
      const topicsPrompt = PromptTemplate.fromTemplate(
        `Extract the main topics discussed in this insurance conversation:

Conversation: "{conversation}"

List 3-5 main topics as a comma-separated list.`
      );

      const chain = topicsPrompt.pipe(this.model);

      const recentMessages = conversation.messages
        .slice(-5)
        .map((m) => m.content)
        .join(' ');
      const conversationText = `${recentMessages} ${newMessage}`;

      const result = await chain.invoke({
        conversation: conversationText,
      });

      return result.content
        .toString()
        .split(',')
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0);
    } catch (error) {
      this.logger.warn('Failed to extract topics, using fallback', { error });
      return ['insurance', 'conversation', 'follow-up'];
    }
  }

  private calculateEngagement(
    sentiment: SentimentResult,
    intent: IntentResult,
    conversation: ConversationContext
  ): number {
    const sentimentScore = (sentiment.score + 1) * 50; // Convert -1..1 to 0..100
    const intentScore = intent.purchaseIntent;
    const messageBalance = this.calculateMessageBalance(conversation);

    return Math.round((sentimentScore * 0.3 + intentScore * 0.5 + messageBalance * 0.2));
  }

  private calculateChurnRisk(
    sentiment: SentimentResult,
    intent: IntentResult,
    conversation: ConversationContext
  ): number {
    const negativeSentiment = sentiment.label === 'negative' ? 70 : 0;
    const lowIntent = intent.purchaseIntent < 30 ? 50 : 0;
    const noResponseRisk = this.calculateNoResponseRisk(conversation);

    return Math.round((negativeSentiment + lowIntent + noResponseRisk) / 3);
  }

  private calculateMessageBalance(conversation: ConversationContext): number {
    const agentMessages = conversation.messages.filter((m) => m.role === 'agent').length;
    const leadMessages = conversation.messages.filter((m) => m.role === 'lead').length;
    
    if (agentMessages + leadMessages === 0) return 50;
    
    const ratio = leadMessages / (agentMessages + leadMessages);
    return Math.round(ratio * 100);
  }

  private calculateNoResponseRisk(conversation: ConversationContext): number {
    const recentMessages = conversation.messages.slice(-5);
    const unansweredAgentMessages = recentMessages.filter(
      (m, index) => m.role === 'agent' && index > 0 && recentMessages[index - 1].role === 'agent'
    ).length;
    
    return Math.min(unansweredAgentMessages * 20, 100);
  }

  private fallbackSentimentAnalysis(message: string): SentimentResult {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based sentiment
    const positiveWords = ['great', 'good', 'excellent', 'perfect', 'love', 'happy', 'interested', 'yes'];
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'upset', 'no', 'not interested', 'expensive'];
    
    const positiveCount = positiveWords.filter((word) => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return {
        score: 0.5,
        label: 'positive',
        confidence: 60,
        emotion: positiveCount > 2 ? 'excited' : 'satisfied',
        keywords: positiveWords.filter((word) => lowerMessage.includes(word)),
      };
    } else if (negativeCount > positiveCount) {
      return {
        score: -0.5,
        label: 'negative',
        confidence: 60,
        emotion: negativeCount > 2 ? 'angry' : 'concerned',
        keywords: negativeWords.filter((word) => lowerMessage.includes(word)),
      };
    }
    
    return {
      score: 0,
      label: 'neutral',
      confidence: 50,
      emotion: 'neutral',
      keywords: [],
    };
  }

  private fallbackIntentDetection(message: string, role: 'agent' | 'lead'): IntentResult {
    const lowerMessage = message.toLowerCase();
    
    const leadIntents: Record<string, string[]> = {
      INFORMATION_SEEKING: ['what is', 'how does', 'tell me', 'explain', 'question'],
      PRICE_SHOPPING: ['price', 'cost', 'how much', 'expensive', 'cheap'],
      URGENT_NEED: ['need now', 'asap', 'immediately', 'urgent', 'quick'],
      READY_TO_BUY: ['ready', 'buy', 'purchase', 'sign up', 'enroll'],
      OBJECTION: ['but', 'however', 'concerned', 'worried', 'expensive'],
      NOT_INTERESTED: ['not interested', 'no thanks', 'not for me', 'pass'],
    };
    
    const agentIntents: Record<string, string[]> = {
      QUALIFICATION: ['qualify', 'questions', 'tell me', 'looking for'],
      PRESENTATION: ['offer', 'provide', 'feature', 'benefit'],
      CLOSING: ['ready to', 'sign up', 'enroll', 'purchase'],
      OBJECTION_HANDLING: ['address', 'concern', 'handle', 'resolve'],
    };
    
    const intents = role === 'lead' ? leadIntents : agentIntents;
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return {
          primary: intent,
          confidence: 70,
          categories: [intent],
          urgency: intent === 'URGENT_NEED' || intent === 'READY_TO_BUY' ? 80 : 30,
          purchaseIntent: intent === 'READY_TO_BUY' ? 90 : intent === 'NOT_INTERESTED' ? 10 : 50,
        };
      }
    }
    
    return {
      primary: role === 'lead' ? 'INFORMATION_SEEKING' : 'INFORMATION_GATHERING',
      confidence: 50,
      categories: [],
      urgency: 30,
      purchaseIntent: 50,
    };
  }
}

// Zod schemas for structured output parsing
const sentimentSchema = z.object({
  score: z.number().describe('Sentiment score from -1 (very negative) to 1 (very positive)'),
  label: z.enum(['positive', 'neutral', 'negative']).describe('Sentiment label'),
  confidence: z.number().describe('Confidence score from 0-100'),
  emotion: z.string().optional().describe('Specific emotion detected'),
  keywords: z.array(z.string()).optional().describe('Key words/phrases that influenced sentiment'),
});

const intentSchema = z.object({
  primary_intent: z.string().describe('The primary intent detected'),
  confidence: z.number().describe('Confidence score from 0-100'),
  categories: z.array(z.string()).optional().describe('All relevant intent categories'),
  urgency: z.number().optional().describe('Urgency level from 0-100'),
  purchase_intent: z.number().optional().describe('Purchase intent probability from 0-100'),
});

const entitySchema = z.object({
  entities: z.array(
    z.object({
      text: z.string().describe('The entity text found'),
      type: z.string().describe('Type of entity'),
      normalized_value: z.string().describe('Normalized value for the entity'),
      confidence: z.number().describe('Confidence score from 0-100'),
      start_index: z.number().optional().describe('Start position in original text'),
      end_index: z.number().optional().describe('End position in original text'),
    })
  ),
});
