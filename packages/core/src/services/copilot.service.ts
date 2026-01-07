import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type {
  CopilotSession,
  CopilotSuggestion,
  CopilotContext,
  CopilotSuggestionType,
  CopilotSuggestionPriority,
  RealTimeInsight,
  InsightType,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

export class CopilotService {
  private llm: ChatOpenAI;
  private outputParser: StringOutputParser;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    });
    this.outputParser = new StringOutputParser();
  }

  /**
   * Generate context-aware suggestions for agents
   */
  async generateSuggestion(
    sessionId: string,
    type: CopilotSuggestionType,
    context: CopilotContext,
    userInput?: string
  ): Promise<CopilotSuggestion> {
    logger.info('Generating copilot suggestion', { sessionId, type });

    try {
      const prompt = this.buildPromptForType(type, context, userInput);
      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      const response = await chain.invoke({
        context: JSON.stringify(context),
        userInput: userInput || '',
      });

      const suggestion: CopilotSuggestion = {
        id: this.generateId(),
        sessionId,
        type,
        priority: this.calculatePriority(type, context),
        title: this.getTitleForType(type),
        content: response,
        reasoning: this.generateReasoning(type, context),
        confidence: this.calculateConfidence(type, context),
        context: context as Record<string, unknown>,
        alternatives: await this.generateAlternatives(type, context),
        createdAt: new Date(),
      };

      logger.info('Generated copilot suggestion', {
        suggestionId: suggestion.id,
        type,
        confidence: suggestion.confidence,
      });

      return suggestion;
    } catch (error) {
      logger.error('Failed to generate copilot suggestion', { error, type });
      throw error;
    }
  }

  /**
   * Generate response templates based on conversation context
   */
  async generateResponseTemplate(
    context: CopilotContext,
    userInput?: string
  ): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping insurance agents craft professional responses to leads.

Context:
{context}

Agent's input (if any): {userInput}

Generate a professional, empathetic response that:
1. Addresses the lead's specific situation
2. Demonstrates expertise in {insuranceType} insurance
3. Includes a clear call-to-action
4. Maintains a consultative tone

Response:
    `);

    const chain = prompt.pipe(this.llm).pipe(this.outputParser);
    return chain.invoke({
      context: JSON.stringify(context),
      userInput: userInput || '',
      insuranceType: context.insuranceType || 'insurance',
    });
  }

  /**
   * Suggest next best action based on current context
   */
  async suggestNextAction(context: CopilotContext): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping insurance agents decide their next best action.

Context:
{context}

Current stage: {stage}
Insurance type: {insuranceType}

Based on the context, suggest the single most important next action the agent should take.
Be specific and actionable.

Next best action:
    `);

    const chain = prompt.pipe(this.llm).pipe(this.outputParser);
    return chain.invoke({
      context: JSON.stringify(context),
      stage: context.stage || 'initial_contact',
      insuranceType: context.insuranceType || 'insurance',
    });
  }

  /**
   * Handle objections with smart suggestions
   */
  async handleObjection(
    context: CopilotContext,
    objection: string
  ): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping insurance agents handle objections effectively.

Context:
{context}

Lead's objection: {objection}

Provide a thoughtful, empathetic response that:
1. Acknowledges the concern
2. Provides a counter-perspective
3. Offers value and reassurance
4. Moves the conversation forward

Response:
    `);

    const chain = prompt.pipe(this.llm).pipe(this.outputParser);
    return chain.invoke({
      context: JSON.stringify(context),
      objection,
    });
  }

  /**
   * Recommend insurance products based on lead profile
   */
  async recommendProduct(context: CopilotContext): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping insurance agents recommend the right products.

Lead context:
{context}

Based on the lead's profile, demographics, and situation:
1. Recommend the most suitable insurance product(s)
2. Explain why this recommendation fits their needs
3. Highlight key benefits
4. Mention any potential concerns to address

Recommendation:
    `);

    const chain = prompt.pipe(this.llm).pipe(this.outputParser);
    return chain.invoke({
      context: JSON.stringify(context),
    });
  }

  /**
   * Analyze real-time insights from conversation and lead data
   */
  async analyzeRealTimeInsights(
    context: CopilotContext,
    conversationHistory?: string[]
  ): Promise<RealTimeInsight[]> {
    logger.info('Analyzing real-time insights');

    const insights: RealTimeInsight[] = [];

    try {
      // Risk assessment
      const riskInsight = await this.assessRisk(context);
      if (riskInsight) {
        insights.push(riskInsight);
      }

      // Opportunity detection
      const opportunityInsight = await this.detectOpportunity(context);
      if (opportunityInsight) {
        insights.push(opportunityInsight);
      }

      // Churn risk analysis
      if (conversationHistory && conversationHistory.length > 0) {
        const churnInsight = await this.analyzeChurnRisk(context, conversationHistory);
        if (churnInsight) {
          insights.push(churnInsight);
        }
      }

      // Sentiment analysis
      if (conversationHistory && conversationHistory.length > 0) {
        const sentimentInsight = await this.analyzeSentiment(conversationHistory);
        if (sentimentInsight) {
          insights.push(sentimentInsight);
        }
      }

      logger.info('Generated real-time insights', { count: insights.length });
      return insights;
    } catch (error) {
      logger.error('Failed to analyze real-time insights', { error });
      return insights;
    }
  }

  /**
   * Assess risk level of a lead
   */
  private async assessRisk(context: CopilotContext): Promise<RealTimeInsight | null> {
    // Placeholder implementation - would use more sophisticated logic
    const leadData = context.leadData as { qualityScore?: number; age?: number };
    if (leadData?.qualityScore && leadData.qualityScore < 30) {
      return {
        id: this.generateId(),
        type: 'risk_alert',
        leadId: context.leadId,
        agentId: context.agentId,
        title: 'Low Quality Score Alert',
        message: 'This lead has a low quality score. Focus on qualification before investing significant time.',
        severity: 'warning',
        actionable: true,
        actions: [
          { id: '1', label: 'Quick Qualify', action: 'quick_qualify', params: {} },
          { id: '2', label: 'Schedule Follow-up', action: 'schedule_followup', params: {} },
        ],
        timestamp: new Date(),
      };
    }
    return null;
  }

  /**
   * Detect upsell/cross-sell opportunities
   */
  private async detectOpportunity(context: CopilotContext): Promise<RealTimeInsight | null> {
    // Placeholder implementation
    const leadData = context.leadData as { insuranceType?: string; hasMultiplePolicies?: boolean };
    if (leadData?.insuranceType === 'auto' && !leadData.hasMultiplePolicies) {
      return {
        id: this.generateId(),
        type: 'upsell_opportunity',
        leadId: context.leadId,
        agentId: context.agentId,
        title: 'Bundle Opportunity Detected',
        message: 'This lead has auto insurance but no home coverage. Consider discussing multi-policy discounts.',
        severity: 'info',
        actionable: true,
        actions: [
          { id: '1', label: 'Suggest Bundle', action: 'suggest_bundle', params: { type: 'auto_home' } },
        ],
        timestamp: new Date(),
      };
    }
    return null;
  }

  /**
   * Analyze churn risk from conversation patterns
   */
  private async analyzeChurnRisk(
    context: CopilotContext,
    conversationHistory: string[]
  ): Promise<RealTimeInsight | null> {
    // Check for negative sentiment indicators
    const negativeIndicators = ['cancel', 'unhappy', 'disappointed', 'expensive', 'switching'];
    const hasNegativeSignals = conversationHistory.some((message) =>
      negativeIndicators.some((indicator) =>
        message.toLowerCase().includes(indicator)
      )
    );

    if (hasNegativeSignals) {
      return {
        id: this.generateId(),
        type: 'churn_risk',
        leadId: context.leadId,
        agentId: context.agentId,
        title: 'Churn Risk Detected',
        message: 'Lead shows signs of dissatisfaction. Consider retention strategies.',
        severity: 'critical',
        actionable: true,
        actions: [
          { id: '1', label: 'Escalate to Supervisor', action: 'escalate', params: {} },
          { id: '2', label: 'Offer Retention Discount', action: 'retention_offer', params: {} },
        ],
        timestamp: new Date(),
      };
    }
    return null;
  }

  /**
   * Analyze sentiment from conversation
   */
  private async analyzeSentiment(conversationHistory: string[]): Promise<RealTimeInsight | null> {
    // Simple sentiment analysis - in production, use more sophisticated NLP
    const positiveWords = ['great', 'excellent', 'perfect', 'thank', 'appreciate'];
    const negativeWords = ['problem', 'issue', 'concern', 'worried', 'confused'];

    const text = conversationHistory.join(' ').toLowerCase();
    const positiveCount = positiveWords.filter((word) => text.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => text.includes(word)).length;

    if (negativeCount > positiveCount && negativeCount > 2) {
      return {
        id: this.generateId(),
        type: 'sentiment_analysis',
        title: 'Negative Sentiment Detected',
        message: 'Lead conversation shows negative sentiment. Consider adjusting approach.',
        severity: 'warning',
        actionable: true,
        actions: [
          { id: '1', label: 'Show Empathy Script', action: 'empathy_script', params: {} },
        ],
        timestamp: new Date(),
      };
    }
    return null;
  }

  /**
   * Build prompt template for specific suggestion type
   */
  private buildPromptForType(
    type: CopilotSuggestionType,
    context: CopilotContext,
    userInput?: string
  ): PromptTemplate {
    const templates: Record<CopilotSuggestionType, string> = {
      response_template: `Generate a professional response template for the insurance agent.
Context: {context}
Agent input: {userInput}`,
      
      next_action: `Suggest the next best action for the agent to take.
Context: {context}`,
      
      objection_handling: `Provide a strategy to handle this objection.
Context: {context}
Objection: {userInput}`,
      
      product_recommendation: `Recommend the best insurance product for this lead.
Context: {context}`,
      
      competitive_insight: `Provide competitive intelligence relevant to this situation.
Context: {context}`,
      
      policy_explanation: `Explain this insurance policy in simple terms.
Context: {context}
Policy: {userInput}`,
      
      risk_assessment: `Assess the insurance risk for this lead.
Context: {context}`,
      
      cross_sell: `Identify cross-sell opportunities for this customer.
Context: {context}`,
      
      upsell: `Identify upsell opportunities for this customer.
Context: {context}`,
      
      follow_up: `Suggest an effective follow-up strategy.
Context: {context}`,
    };

    return PromptTemplate.fromTemplate(templates[type]);
  }

  /**
   * Calculate priority based on suggestion type and context
   */
  private calculatePriority(
    type: CopilotSuggestionType,
    context: CopilotContext
  ): CopilotSuggestionPriority {
    const criticalTypes: CopilotSuggestionType[] = ['objection_handling', 'risk_assessment'];
    const highTypes: CopilotSuggestionType[] = ['next_action', 'product_recommendation'];

    if (criticalTypes.includes(type)) {
      return 'critical';
    } else if (highTypes.includes(type)) {
      return 'high';
    } else {
      return 'medium';
    }
  }

  /**
   * Get human-readable title for suggestion type
   */
  private getTitleForType(type: CopilotSuggestionType): string {
    const titles: Record<CopilotSuggestionType, string> = {
      response_template: 'Suggested Response',
      next_action: 'Next Best Action',
      objection_handling: 'Handle Objection',
      product_recommendation: 'Product Recommendation',
      competitive_insight: 'Competitive Intelligence',
      policy_explanation: 'Policy Explanation',
      risk_assessment: 'Risk Assessment',
      cross_sell: 'Cross-Sell Opportunity',
      upsell: 'Upsell Opportunity',
      follow_up: 'Follow-Up Strategy',
    };
    return titles[type];
  }

  /**
   * Generate reasoning for the suggestion
   */
  private generateReasoning(type: CopilotSuggestionType, context: CopilotContext): string {
    return `Based on the current context and ${context.stage || 'stage'}, this ${type} suggestion was generated to help optimize the conversation flow.`;
  }

  /**
   * Calculate confidence score for suggestion
   */
  private calculateConfidence(type: CopilotSuggestionType, context: CopilotContext): number {
    // Simple confidence calculation - would be more sophisticated in production
    let confidence = 0.7;

    if (context.conversationHistory && context.conversationHistory.length > 3) {
      confidence += 0.1;
    }

    if (context.leadData) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Generate alternative suggestions
   */
  private async generateAlternatives(
    type: CopilotSuggestionType,
    context: CopilotContext
  ): Promise<string[]> {
    // Placeholder - would generate actual alternatives in production
    return [];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `copilot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
