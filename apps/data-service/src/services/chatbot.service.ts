import { PrismaClient } from '@prisma/client';
import { 
  ChatbotMessageRequest,
  ChatbotMessageResponse,
  ChatMessage,
  ConversationSummary,
  RecommendedAction,
  InsuranceType,
  EntityExtraction,
  ChatbotConversation
} from '@insuraince/types';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class ChatbotService {
  /**
   * Process chatbot message and generate response
   */
  async processMessage(request: ChatbotMessageRequest): Promise<ChatbotMessageResponse> {
    try {
      logger.info('Processing chatbot message', { 
        conversationId: request.conversationId,
        leadId: request.leadId 
      });

      // Get or create conversation
      let conversation = await prisma.chatbotConversation.findUnique({
        where: { conversationId: request.conversationId }
      });

      if (!conversation) {
        conversation = await prisma.chatbotConversation.create({
          data: {
            conversationId: request.conversationId,
            leadId: request.leadId,
            status: 'active',
            channel: request.context.channel || 'web',
            messages: [],
            summary: {
              primaryTopic: 'unknown',
              topics: [],
              questionsAnswered: 0,
              pendingQuestions: []
            },
            nextActions: [],
            handoffRequired: false
          }
        });
      }

      // Analyze user message
      const messageAnalysis = await this.analyzeMessage(request.message);
      
      // Generate appropriate response based on intent
      const response = await this.generateResponse(request.message, messageAnalysis, request.context);

      // Update conversation with exchange
      await this.updateConversation(conversation, request.message, response, messageAnalysis);

      // Determine if escalation is needed
      const shouldEscalate = this.shouldEscalate(messageAnalysis, conversation);

      return {
        success: true,
        reply: response.text,
        confidence: response.confidence,
        actions: response.actions || [],
        shouldEscalate: shouldEscalate.shouldEscalate,
        escalatedTo: shouldEscalate.escalatedTo
      };

    } catch (error) {
      logger.error('Error processing chatbot message', { 
        error, 
        conversationId: request.conversationId 
      });
      return {
        success: false,
        reply: 'I apologize, but I\'m having trouble processing your request. Let me connect you with an agent who can help.',
        confidence: 0,
        actions: [{
          action: 'escalate_to_agent',
          priority: 'high',
          assignedTo: 'agent'
        }],
        shouldEscalate: true,
        escalatedTo: 'agent',
        error: 'Failed to process chatbot message'
      };
    }
  }

  /**
   * Get conversation history and summary
   */
  async getConversation(conversationId: string): Promise<ChatbotConversation | null> {
    try {
      const conversation = await prisma.chatbotConversation.findUnique({
        where: { conversationId }
      });

      return conversation ? (conversation as unknown as ChatbotConversation) : null;

    } catch (error) {
      logger.error('Error getting conversation', { error, conversationId });
      return null;
    }
  }

  /**
   * End conversation and generate final summary
   */
  async endConversation(conversationId: string, escalationReason?: string): Promise<void> {
    try {
      const conversation = await prisma.chatbotConversation.findUnique({
        where: { conversationId }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Generate final summary
      const finalSummary = await this.generateFinalSummary(conversation);

      await prisma.chatbotConversation.update({
        where: { conversationId },
        data: {
          status: escalationReason ? 'escalated' : 'completed',
          endedAt: new Date(),
          summary: finalSummary,
          handoffReason: escalationReason
        }
      });

      logger.info('Conversation ended', { conversationId, status: escalationReason ? 'escalated' : 'completed' });

    } catch (error) {
      logger.error('Error ending conversation', { error, conversationId });
    }
  }

  /**
   * Get chatbot analytics
   */
  async getAnalytics(timeframe: { start: Date; end: Date }) {
    try {
      const conversations = await prisma.chatbotConversation.findMany({
        where: {
          startedAt: {
            gte: timeframe.start,
            lte: timeframe.end
          }
        }
      });

      const totalConversations = conversations.length;
      const completedConversations = conversations.filter(c => c.status === 'completed').length;
      const escalatedConversations = conversations.filter(c => c.status === 'escalated').length;

      // Calculate average duration
      const durations = conversations
        .filter(c => c.endedAt && c.startedAt)
        .map(c => (c.endedAt!.getTime() - c.startedAt.getTime()) / (1000 * 60)); // minutes
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length || 0;

      return {
        totalConversations,
        completedConversations,
        escalatedConversations,
        avgConversationDuration: avgDuration,
        containmentRate: totalConversations > 0 ? (completedConversations / totalConversations) * 100 : 0,
        escalationRate: totalConversations > 0 ? (escalatedConversations / totalConversations) * 100 : 0
      };

    } catch (error) {
      logger.error('Error getting chatbot analytics', { error });
      return {
        totalConversations: 0,
        completedConversations: 0,
        escalatedConversations: 0,
        avgConversationDuration: 0,
        containmentRate: 0,
        escalationRate: 0
      };
    }
  }

  private async analyzeMessage(message: string) {
    // Simulate NLU analysis
    // In real implementation, would use services like:
    // - Dialogflow, Rasa, GPT-4, or custom NLU models

    const intents = [
      { intent: 'quote_request', confidence: 0.85, keywords: ['quote', 'price', 'cost', 'how much'] },
      { intent: 'coverage_question', confidence: 0.75, keywords: ['coverage', 'what does', 'include', 'cover'] },
      { intent: 'contact_info', confidence: 0.9, keywords: ['call', 'phone', 'email', 'contact'] },
      { intent: 'policy_question', confidence: 0.7, keywords: ['policy', 'existing', 'current', 'renew'] },
      { intent: 'claim_help', confidence: 0.95, keywords: ['claim', 'accident', 'damage', 'file'] },
      { intent: 'greeting', confidence: 0.6, keywords: ['hello', 'hi', 'hey', 'good morning'] },
      { intent: 'escalate', confidence: 0.9, keywords: ['agent', 'person', 'talk to someone', 'human'] }
    ];

    // Find matching intent
    const matchedIntent = intents.find(ift => 
      ift.keywords.some(keyword => message.toLowerCase().includes(keyword))
    ) || { intent: 'unknown', confidence: 0.3, keywords: [] };

    // Extract entities
    const entities = this.extractEntities(message);

    return {
      intent: matchedIntent.intent,
      confidence: matchedIntent.confidence,
      entities,
      sentiment: this.analyzeSentiment(message),
      requiresEscalation: matchedIntent.intent === 'escalate' || matchedIntent.intent === 'claim_help'
    };
  }

  private async generateResponse(userMessage: string, messageAnalysis: any, context: Record<string, unknown>) {
    const responses: Record<string, { text: string; confidence: number; actions?: RecommendedAction[] }> = {
      quote_request: {
        text: 'I\'d be happy to help you get a quote! To provide you with an accurate estimate, I\'ll need some information. What type of insurance are you looking for (auto, home, life, health)?',
        confidence: 0.95,
        actions: [
          {
            action: 'collect_insurance_type',
            priority: 'high',
            assignedTo: 'bot'
          }
        ]
      },
      coverage_question: {
        text: 'Coverage details can vary based on your specific policy and needs. Let me connect you with an agent who can provide detailed information about coverage options.',
        confidence: 0.9,
        actions: [
          {
            action: 'escalate_to_agent',
            priority: 'high',
            assignedTo: 'system'
          }
        ]
      },
      contact_info: {
        text: 'I can connect you with an agent right away. May I have your name and a callback number (or email) so an agent can reach you?',
        confidence: 0.9,
        actions: [
          {
            action: 'collect_contact_info',
            priority: 'high',
            assignedTo: 'bot'
          }
        ]
      },
      policy_question: {
        text: 'For questions about your existing policy, I\'ll connect you with your assigned agent who has access to your account details.',
        confidence: 0.85,
        actions: [
          {
            action: 'escalate_to_assigned_agent',
            priority: 'medium',
            assignedTo: 'system'
          }
        ]
      },
      claim_help: {
        text: 'I\'m sorry to hear you need to file a claim. This is important and I want to make sure you get the best assistance. Let me connect you with our claims specialist immediately.',
        confidence: 0.98,
        actions: [
          {
            action: 'immediate_escalation',
            priority: 'high',
            assignedTo: 'system'
          },
          {
            action: 'collect_incident_info',
            priority: 'high',
            assignedTo: 'bot'
          }
        ]
      },
      greeting: {
        text: 'Hello! Welcome to ABC Insurance. I\'m your virtual assistant. How can I help you today? I can help with quotes, coverage questions, or connect you with an agent.',
        confidence: 0.8
      },
      escalate: {
        text: 'I understand you\'d like to speak with a person. Let me connect you with an agent who can help. Please hold for a moment.',
        confidence: 0.95,
        actions: [
          {
            action: 'escalate_to_agent',
            priority: 'high',
            assignedTo: 'system'
          }
        ]
      },
      unknown: {
        text: 'I\'m not sure I understand. Could you please rephrase your question? Or if you prefer, I can connect you with an agent who can help.',
        confidence: 0.4
      }
    };

    return responses[messageAnalysis.intent] || responses.unknown;
  }

  private extractEntities(message: string): EntityExtraction[] {
    const entities: EntityExtraction[] = [];
    
    // Extract person names (simple pattern)
    const namePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
    let match;
    while ((match = namePattern.exec(message)) !== null) {
      entities.push({
        entityType: 'person',
        value: match[1],
        confidence: 0.7
      });
    }
    
    // Extract phone numbers
    const phonePattern = /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g;
    while ((match = phonePattern.exec(message)) !== null) {
      entities.push({
        entityType: 'phone',
        value: match[1],
        confidence: 0.9
      });
    }
    
    // Extract insurance types
    const insuranceTypes = ['auto', 'car', 'home', 'house', 'life', 'health', 'medical', 'commercial'];
    insuranceTypes.forEach(type => {
      if (message.toLowerCase().includes(type)) {
        entities.push({
          entityType: 'insurance_type',
          value: type,
          confidence: 0.95
        });
      }
    });
    
    return entities;
  }

  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['great', 'good', 'helpful', 'thanks', 'excellent', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'frustrated', 'upset', 'claim', 'accident', 'damage'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (negativeCount > positiveCount && negativeCount > 0) return 'negative';
    if (positiveCount > negativeCount && positiveCount > 0) return 'positive';
    return 'neutral';
  }

  private async updateConversation(connection: any, userMessage: string, response: any, messageAnalysis: any) {
    const messages = connection.messages as any[] || [];
    
    const userChatMessage: ChatMessage = {
      messageId: `msg_${Date.now()}_user`,
      sender: 'user',
      content: userMessage,
      timestamp: new Date(),
      intent: messageAnalysis.intent,
      entities: messageAnalysis.entities,
      confidence: messageAnalysis.confidence,
      responseTime: 0
    };
    
    const botChatMessage: ChatMessage = {
      messageId: `msg_${Date.now()}_bot`,
      sender: 'bot',
      content: response.text,
      timestamp: new Date(),
      intent: response.actions ? 'action_response' : 'informational',
      entities: [],
      confidence: response.confidence,
      responseTime: 1000 // Simulated response time
    };
    
    messages.push(userChatMessage, botChatMessage);
    
    await prisma.chatbotConversation.update({
      where: { conversationId: connection.conversationId },
      data: {
        messages,
        summary: {
          primaryTopic: messageAnalysis.intent,
          topics: [...(connection.summary?.topics || []), messageAnalysis.intent],
          questionsAnswered: response.actions ? (connection.summary?.questionsAnswered || 0) + 1 : (connection.summary?.questionsAnswered || 0),
          pendingQuestions: [] // Would be populated based on conversation flow
        },
        nextActions: [...(connection.nextActions || []), ...(response.actions || [])]
      }
    });
  }

  private shouldEscalate(messageAnalysis: any, connection: any): { shouldEscalate: boolean; escalatedTo?: string } {
    if (messageAnalysis.requiresEscalation) {
      return { shouldEscalate: true, escalatedTo: 'agent' };
    }
    
    // Check conversation length (too long might need human)
    const messages = connection.messages || [];
    if (messages.length > 20) {
      return { shouldEscalate: true, escalatedTo: 'agent' };
    }
    
    // Check if bot is stuck in a loop
    const recentMessages = messages.slice(-6);
    if (recentMessages.length >= 6) {
      const isLooping = recentMessages.every((msg: any) => msg.sender === 'bot' && msg.intent === 'unknown');
      if (isLooping) {
        return { shouldEscalate: true, escalatedTo: 'agent' };
      }
    }
    
    return { shouldEscalate: false };
  }

  private async generateFinalSummary(connection: any): Promise<ConversationSummary> {
    const messages = connection.messages || [];
    const topics = [...(connection.summary?.topics || [])];
    
    return {
      primaryTopic: topics[0] || 'general_inquiry',
      topics: [...new Set(topics)], // Remove duplicates
      questionsAnswered: connection.summary?.questionsAnswered || 0,
      pendingQuestions: [], // Would be determined by conversation flow
      leadQualification: {
        level: this.determineQualificationLevel(messages),
        reasoning: 'Based on engagement level and information provided'
      },
      recommendedProducts: this.determineRecommendedProducts(topics),
      scheduleFollowUp: this.shouldScheduleFollowUp(messages), 
      followUpPriority: this.determineFollowUpPriority(messages)
    };
  }

  private determineQualificationLevel(messages: any[]): 'hot' | 'warm' | 'cold' {
    // Simple heuristic based on message content
    const hasContactInfo = messages.some(msg => 
      msg.sender === 'user' && 
      (msg.entities?.some((e: any) => e.entityType === 'phone' || e.entityType === 'email'))
    );
    
    const hasIntent = messages.some(msg => 
      msg.sender === 'user' && 
      ['quote_request', 'contact_info'].includes(msg.intent)
    );
    
    if (hasContactInfo && hasIntent) return 'hot';
    if (hasIntent) return 'warm';
    return 'cold';
  }

  private determineRecommendedProducts(topics: string[]): InsuranceType[] {
    const productMap: Record<string, InsuranceType> = {
      'quote_request': 'auto', // Default to auto
      'coverage_question': 'home',
    };
    
    return topics
      .map(topic => productMap[topic])
      .filter(Boolean)
      .slice(0, 2) as InsuranceType[];
  }

  private shouldScheduleFollowUp(messages: any[]): boolean {
    const hasQuoteRequest = messages.some(msg => msg.intent === 'quote_request');
    const hasContactInfo = messages.some(msg => 
      msg.entities?.some((e: any) => e.entityType === 'phone' || e.entityType === 'email')
    );
    
    return hasQuoteRequest || hasContactInfo;
  }

  private determineFollowUpPriority(messages: any[]): 'immediate' | 'high' | 'medium' | 'low' {
    const hasClaim = messages.some(msg => msg.intent === 'claim_help');
    const hasQuote = messages.some(msg => msg.intent === 'quote_request');
    
    if (hasClaim) return 'immediate';
    if (hasQuote) return 'high';
    return 'medium';
  }
}
