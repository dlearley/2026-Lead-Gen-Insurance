// ========================================
// Coaching Suggestion Service
// Provides real-time coaching suggestions for agents during calls
// ========================================

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  CoachingSuggestion,
  SuggestionType,
  SuggestionConfidence,
  SuggestionTrigger,
  SuggestionContext,
  LeadEnrichmentProfile,
  GetCoachingSuggestionsRequest,
} from '@insurance-lead-gen/types';

interface SuggestionRule {
  type: SuggestionType;
  title: string;
  content: string;
  suggestedScript?: string;
  talkingPoints?: string[];
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedImpact: string;
  triggers: {
    type: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
    value: unknown;
  }[];
  minConfidence: SuggestionConfidence;
}

export class CoachingSuggestionService {
  private suggestionRules: Map<SuggestionType, SuggestionRule[]> = new Map();

  constructor() {
    this.initializeSuggestionRules();
  }

  /**
   * Generate coaching suggestions for a lead
   */
  async generateSuggestions(
    leadId: string,
    enrichmentProfile: LeadEnrichmentProfile,
    request?: GetCoachingSuggestionsRequest,
    callContext?: {
      currentSentiment?: string;
      detectedIntents?: string[];
      conversationStage?: string;
    }
  ): Promise<CoachingSuggestion[]> {
    const suggestions: CoachingSuggestion[] = [];

    try {
      // Build context from enrichment and call data
      const context = this.buildContext(enrichmentProfile, callContext);

      // Get scoring/intent data if available
      const scoringData = await this.getScoringData(leadId);
      const intentSignals = enrichmentProfile.behavioral?.intentSignals || [];

      // Evaluate all suggestion rules
      for (const [type, rules] of this.suggestionRules.entries()) {
        // Filter by requested types
        if (request?.suggestionTypes && !request.suggestionTypes.includes(type)) {
          continue;
        }

        for (const rule of rules) {
          // Check if rule is triggered
          const triggers = this.evaluateTriggers(rule, context, scoringData, intentSignals);

          if (triggers.length === 0) {
            continue;
          }

          // Calculate confidence
          const confidence = this.calculateConfidence(triggers, context);

          // Filter by minimum confidence
          if (request?.minConfidence && this.confidenceToNumber(confidence) < this.confidenceToNumber(request.minConfidence)) {
            continue;
          }

          // Generate suggestion
          const suggestion: CoachingSuggestion = {
            id: crypto.randomUUID(),
            leadId,
            callId: request?.callId,
            agentId: request?.callId ? await this.getAgentIdFromCall(request.callId) : undefined,
            type,
            title: rule.title,
            content: rule.content,
            suggestedScript: rule.suggestedScript,
            talkingPoints: rule.talkingPoints,
            confidence,
            priority: rule.priority,
            triggeredBy: triggers,
            context,
            estimatedImpact: rule.estimatedImpact,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          suggestions.push(suggestion);
        }
      }

      // Filter by max suggestions
      const maxSuggestions = request?.maxSuggestions || 10;
      const filtered = this.prioritizeSuggestions(suggestions).slice(0, maxSuggestions);

      // Save suggestions to database
      await this.saveSuggestions(filtered);

      return filtered;
    } catch (error) {
      console.error('Error generating coaching suggestions:', error);
      return [];
    }
  }

  /**
   * Build suggestion context
   */
  private buildContext(
    profile: LeadEnrichmentProfile,
    callContext?: {
      currentSentiment?: string;
      detectedIntents?: string[];
      conversationStage?: string;
    }
  ): SuggestionContext {
    // Determine sentiment from enrichment or call context
    const currentSentiment = callContext?.currentSentiment || this.inferSentiment(profile);

    // Extract intents from behavioral data or call context
    const detectedIntents = callContext?.detectedIntents ||
      (profile.behavioral?.intentSignals?.map((s: any) => s.type) || []);

    // Extract pain points from risk and behavioral data
    const painPoints = this.extractPainPoints(profile);

    // Extract potential objections
    const objections = this.extractObjections(profile);

    // Extract risk flags
    const riskFlags = profile.risk?.riskFlags?.map((r: any) => r.type) || [];

    return {
      currentSentiment: currentSentiment as any,
      detectedIntents,
      painPoints,
      objections,
      riskFlags,
      conversationStage: callContext?.conversationStage,
    };
  }

  /**
   * Infer sentiment from enrichment data
   */
  private inferSentiment(profile: LeadEnrichmentProfile): string {
    // Use risk score as a proxy for sentiment
    if (profile.risk?.fraudRiskScore && profile.risk.fraudRiskScore > 70) {
      return 'negative';
    }

    // Use engagement level
    if (profile.behavioral?.websiteVisits && profile.behavioral.websiteVisits > 5) {
      return 'interested';
    }

    return 'neutral';
  }

  /**
   * Extract pain points from profile
   */
  private extractPainPoints(profile: LeadEnrichmentProfile): string[] {
    const painPoints: string[] = [];

    if (profile.risk?.creditScoreProxy && profile.risk.creditScoreProxy < 600) {
      painPoints.push('Financial constraints');
    }

    if (profile.propertyData?.hasClaimsHistory && profile.propertyData.numberOfClaims > 0) {
      painPoints.push('Previous claims experience');
    }

    if (profile.vehicleData?.some((v: any) => !v.hasCoverage)) {
      painPoints.push('Lack of current coverage');
    }

    if (profile.demographics?.age && profile.demographics.age < 25) {
      painPoints.push('High premium concerns');
    }

    return painPoints;
  }

  /**
   * Extract potential objections
   */
  private extractObjections(profile: LeadEnrichmentProfile): string[] {
    const objections: string[] = [];

    if (profile.demographics?.incomeRange === 'low') {
      objections.push('Price objection');
    }

    if (profile.behavioral?.intentSignals?.some((s: any) => s.type === 'comparison_shopping')) {
      objections.push('Competitor comparison');
    }

    if (profile.risk?.fraudRiskScore && profile.risk.fraudRiskScore > 50) {
      objections.push('Trust/verification concerns');
    }

    return objections;
  }

  /**
   * Evaluate suggestion triggers
   */
  private evaluateTriggers(
    rule: SuggestionRule,
    context: SuggestionContext,
    scoring?: any,
    intentSignals?: any[]
  ): SuggestionTrigger[] {
    const triggered: SuggestionTrigger[] = [];

    for (const trigger of rule.triggers) {
      let value: unknown = undefined;

      // Get value from appropriate source
      if (trigger.type.startsWith('sentiment')) {
        value = context.currentSentiment;
      } else if (trigger.type.startsWith('intent')) {
        value = context.detectedIntents;
      } else if (trigger.type.startsWith('pain')) {
        value = context.painPoints;
      } else if (trigger.type.startsWith('objection')) {
        value = context.objections;
      } else if (trigger.type.startsWith('risk')) {
        value = context.riskFlags;
      } else if (trigger.type.startsWith('score')) {
        value = scoring?.normalizedScore;
      }

      // Evaluate condition
      if (this.evaluateCondition(value, trigger.operator, trigger.value)) {
        triggered.push({
          type: trigger.type as any,
          value: String(value),
          detectedAt: new Date(),
          confidence: this.calculateTriggerConfidence(trigger, context),
        });
      }
    }

    return triggered;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    value: unknown,
    operator: string,
    ruleValue: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === ruleValue;
      case 'ne':
        return value !== ruleValue;
      case 'gt':
        return typeof value === 'number' && typeof ruleValue === 'number' && value > ruleValue;
      case 'gte':
        return typeof value === 'number' && typeof ruleValue === 'number' && value >= ruleValue;
      case 'lt':
        return typeof value === 'number' && typeof ruleValue === 'number' && value < ruleValue;
      case 'lte':
        return typeof value === 'number' && typeof ruleValue === 'number' && value <= ruleValue;
      case 'in':
        return Array.isArray(value) && value.includes(ruleValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(ruleValue);
      case 'contains':
        return typeof value === 'string' && String(value).includes(String(ruleValue));
      default:
        return false;
    }
  }

  /**
   * Calculate trigger confidence
   */
  private calculateTriggerConfidence(
    trigger: any,
    context: SuggestionContext
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence if multiple signals align
    if (context.detectedIntents?.length > 2) {
      confidence += 0.1;
    }

    if (context.painPoints?.length > 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall suggestion confidence
   */
  private calculateConfidence(
    triggers: SuggestionTrigger[],
    context: SuggestionContext
  ): SuggestionConfidence {
    if (triggers.length === 0) return 'low';

    const avgTriggerConfidence =
      triggers.reduce((sum, t) => sum + t.confidence, 0) / triggers.length;

    if (avgTriggerConfidence >= 0.8) return 'high';
    if (avgTriggerConfidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Convert confidence to number for comparison
   */
  private confidenceToNumber(confidence: SuggestionConfidence): number {
    switch (confidence) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Prioritize suggestions
   */
  private prioritizeSuggestions(suggestions: CoachingSuggestion[]): CoachingSuggestion[] {
    const priorityScore: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return suggestions.sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      const confidenceDiff = this.confidenceToNumber(b.confidence) - this.confidenceToNumber(a.confidence);
      if (confidenceDiff !== 0) return confidenceDiff;

      // Then by number of triggers
      return b.triggeredBy.length - a.triggeredBy.length;
    });
  }

  /**
   * Get agent ID from call
   */
  private async getAgentIdFromCall(callId: string): Promise<string | undefined> {
    // Placeholder - would fetch from calls table
    return undefined;
  }

  /**
   * Get scoring data
   */
  private async getScoringData(leadId: string): Promise<any> {
    // Placeholder - would integrate with scoring service
    return {
      normalizedScore: 60,
      primaryInsuranceType: 'auto',
    };
  }

  /**
   * Save suggestions to database
   */
  private async saveSuggestions(suggestions: CoachingSuggestion[]): Promise<void> {
    await Promise.all(
      suggestions.map((suggestion) =>
        prisma.coachingSuggestion.create({
          data: suggestion,
        })
      )
    );
  }

  /**
   * Acknowledge suggestion with feedback
   */
  async acknowledgeSuggestion(
    suggestionId: string,
    feedback: {
      used: boolean;
      usedScript?: boolean;
      effectivenessRating?: number;
      notes?: string;
    }
  ): Promise<void> {
    await prisma.coachingSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: feedback.used ? 'used' : 'dismissed',
        usedAt: feedback.used ? new Date() : null,
        dismissedAt: feedback.used ? null : new Date(),
        feedback: {
          helpful: feedback.used,
          usedScript: feedback.usedScript || false,
          effectivenessRating: feedback.effectivenessRating,
          notes: feedback.notes,
          providedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get suggestions for a call
   */
  async getCallSuggestions(callId: string): Promise<CoachingSuggestion[]> {
    const suggestions = await prisma.coachingSuggestion.findMany({
      where: {
        callId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return suggestions as CoachingSuggestion[];
  }

  /**
   * Initialize suggestion rules
   */
  private initializeSuggestionRules(): void {
    // Sentiment adjustment suggestions
    this.suggestionRules.set('sentiment_adjustment', [
      {
        type: 'sentiment_adjustment',
        title: 'Adjust for Frustrated Sentiment',
        content: 'Lead appears frustrated. Practice active listening and show empathy.',
        suggestedScript: "I understand your frustration. Let me help you find a solution that works for you. Can you tell me more about what's concerning you?",
        talkingPoints: [
          'Acknowledge their frustration',
          'Use active listening',
          'Focus on solutions',
          'Be patient and supportive',
        ],
        priority: 'high',
        estimatedImpact: 'Reduce call abandonment by 15%',
        triggers: [
          { type: 'sentiment', operator: 'eq', value: 'frustrated' },
          { type: 'sentiment', operator: 'eq', value: 'negative' },
        ],
        minConfidence: 'medium',
      },
    ]);

    // Objection handling suggestions
    this.suggestionRules.set('objection_handling', [
      {
        type: 'objection_handling',
        title: 'Address Price Objection',
        content: 'Lead has price concerns. Emphasize value and flexible payment options.',
        suggestedScript: "I understand cost is important. Let me show you how our comprehensive coverage actually saves you money in the long run, plus we offer flexible payment plans to fit your budget.",
        talkingPoints: [
          'Highlight long-term value',
          'Mention payment flexibility',
          'Share cost-saving features',
          'Compare vs. competitors',
        ],
        priority: 'high',
        estimatedImpact: 'Improve conversion by 20%',
        triggers: [
          { type: 'objection', operator: 'contains', value: 'Price objection' },
        ],
        minConfidence: 'high',
      },
    ]);

    // Pain point response suggestions
    this.suggestionRules.set('pain_point_response', [
      {
        type: 'pain_point_response',
        title: 'High Premium Concerns',
        content: 'Lead is concerned about high premiums. Address with discounts and bundling.',
        suggestedScript: "I hear you on the premium costs. There are several ways we can bring that down - good driver discounts, bundling options, and flexible deductibles that still give you great protection.",
        talkingPoints: [
          'Good driver discounts',
          'Multi-policy bundles',
          'Adjustable deductibles',
          'Flexible payment options',
        ],
        priority: 'medium',
        estimatedImpact: 'Improve quote acceptance by 18%',
        triggers: [
          { type: 'pain', operator: 'contains', value: 'High premium concerns' },
          { type: 'sentiment', operator: 'eq', value: 'negative' },
        ],
        minConfidence: 'medium',
      },
    ]);

    // Competitive positioning suggestions
    this.suggestionRules.set('competitive_positioning', [
      {
        type: 'competitive_positioning',
        title: 'Competitor Comparison Detected',
        content: 'Lead is comparing. Highlight our unique advantages and differentiators.',
        suggestedScript: "I appreciate you doing your research. Here's what sets us apart: our 24/7 claims support, accident forgiveness program, and personalized coverage options many competitors don't offer.",
        talkingPoints: [
          '24/7 claims support',
          'Accident forgiveness',
          'Personalized coverage',
          'Customer satisfaction ratings',
          'Financial stability',
        ],
        priority: 'medium',
        estimatedImpact: 'Improve win rate by 12%',
        triggers: [
          { type: 'objection', operator: 'contains', value: 'Competitor comparison' },
          { type: 'intent', operator: 'contains', value: 'comparison_shopping' },
        ],
        minConfidence: 'low',
      },
    ]);

    // Risk awareness suggestions
    this.suggestionRules.set('risk_awareness', [
      {
        type: 'risk_awareness',
        title: 'Fraud Risk Alert - Proceed with Caution',
        content: 'Elevated risk profile detected. Verify information carefully and follow compliance procedures.',
        talkingPoints: [
          'Verify all personal information',
          'Document the conversation thoroughly',
          'Follow compliance procedures',
          'Consider additional verification steps',
        ],
        priority: 'urgent',
        estimatedImpact: 'Reduce fraud losses',
        triggers: [
          { type: 'risk', operator: 'contains', value: 'suspicious_activity' },
        ],
        minConfidence: 'high',
      },
    ]);

    // Upsell opportunities
    this.suggestionRules.set('upsell_opportunity', [
      {
        type: 'upsell_opportunity',
        title: 'Bundle Upsell Opportunity',
        content: 'Lead has multiple insurance needs. Suggest bundling for significant savings.',
        suggestedScript: "Since you're looking at both auto and home coverage, I can offer you a bundle discount of up to 25% that will save you substantially on both policies.",
        talkingPoints: [
          'Bundle discount up to 25%',
          'One bill for all policies',
          'Dedicated support',
          'Comprehensive protection',
        ],
        priority: 'medium',
        estimatedImpact: 'Increase policy count by 30%',
        triggers: [
          { type: 'intent', operator: 'contains', value: 'quote' },
          { type: 'intent', operator: 'contains', value: 'purchase' },
          { type: 'score', operator: 'gte', value: 70 },
        ],
        minConfidence: 'medium',
      },
    ]);
  }
}
