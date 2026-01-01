import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';

export interface BuyingSignal {
  type: 'budget' | 'timeline' | 'decision' | 'action' | 'authority' | 'need' | 'comparison' | 'timing';
  signal: string;
  confidence: number;
  context: string;
  position: { start: number; end: number };
  weight: number;
  verticalSpecific?: boolean;
}

export interface BuyingSignalsResult {
  signals: BuyingSignal[];
  intentScore: number;
  urgencyScore: number;
  buyingStage: 'awareness' | 'interest' | 'consideration' | 'evaluation' | 'purchase';
  strongestSignals: BuyingSignal[];
  verticalInsights: Record<string, any>;
  nextBestAction: { action: string; priority: 'high' | 'medium' | 'low'; reasoning: string };
}

export class BuyingSignalDetector {
  private static instance: BuyingSignalDetector;
  
  static getInstance(): BuyingSignalDetector {
    if (!BuyingSignalDetector.instance) {
      BuyingSignalDetector.instance = new BuyingSignalDetector();
    }
    return BuyingSignalDetector.instance;
  }

  @Traceable('buyingSignals.detect')
  async detect(text: string, context?: { domain?: string }): Promise<BuyingSignalsResult> {
    try {
      logger.info('Detecting buying signals', { textLength: text.length, domain: context?.domain });
      
      const signals: BuyingSignal[] = [];
      
      // Extract various signal types
      signals.push(...await this.extractBudgetSignals(text));
      signals.push(...await this.extractTimelineSignals(text));
      signals.push(...await this.extractDecisionSignals(text));
      signals.push(...await this.extractAuthoritySignals(text));
      signals.push(...await this.extractNeedSignals(text));
      signals.push(...await this.extractActionSignals(text));
      
      // Add vertical specific signals if domain is provided
      if (context?.domain === 'insurance') {
        signals.push(...await this.extractInsuranceSignals(text));
      }
      
      // Calculate scores and insights
      const intentScore = this.calculateIntentScore(signals);
      const urgencyScore = this.calculateUrgencyScore(signals);
      const buyingStage = this.determineBuyingStage(signals);
      const strongestSignals = this.getStrongestSignals(signals);
      const nextBestAction = this.generateNextBestAction(buyingStage);
      
      const result: BuyingSignalsResult = {
        signals,
        intentScore,
        urgencyScore,
        buyingStage,
        strongestSignals,
        verticalInsights: context?.domain ? { [context.domain]: {} } : {},
        nextBestAction
      };
      
      logger.info('Buying signals detection completed', {
        signalsCount: signals.length,
        intentScore,
        buyingStage
      });
      
      return result;
    } catch (error) {
      logger.error('Buying signals detection failed', { error, text });
      throw error;
    }
  }

  private async extractBudgetSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const patterns = [
      /\b(budget\s*[:]?\s*\$?\d+(?:,\d{3})*(?:\.\d{2})?)\b/gi,
      /\b(\$?\d+(?:,\d{3})*(?:\.\d{2})?\s+(?:budget|dollars?|USD))\b/gi,
      /\b(price\s+range|pricing|cost|expensive|premium)\b/gi,
      /\b(\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:a\s+month|monthly|per\s+month))\b/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'budget',
            signal: match,
            confidence: 0.9,
            context: 'Budget-related mention',
            position: { start, end: start + match.length },
            weight: 1.2
          });
        });
      }
    });
    
    return signals;
  }

  private async extractTimelineSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const patterns = [
      { pattern: /\b(asap|urgent|immediately|ASAP|right away)\b/gi, weight: 1.5 },
      { pattern: /\b(by\s+\w+\s+\d{1,2}|within\s+\d+\s+days?)\b/gi, weight: 1.3 },
      { pattern: /\b(q[1-4]\s+\d{4}|quarter|deadline)\b/gi, weight: 1.1 },
      { pattern: /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/gi, weight: 1.2 }
    ];
    
    patterns.forEach(({pattern, weight}) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'timeline',
            signal: match,
            confidence: 0.85,
            context: 'Timeline/deadline indicator',
            position: { start, end: start + match.length },
            weight
          });
        });
      }
    });
    
    return signals;
  }

  private async extractDecisionSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const decisionKeywords = [
      'decided', 'decision made', 'approved', 'greenlit', 'signed off',
      'moving forward', 'final decision', 'chosen', 'selected'
    ];
    
    decisionKeywords.forEach(keyword => {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'decision',
            signal: match,
            confidence: 0.9,
            context: 'Decision-making signal',
            position: { start, end: start + match.length },
            weight: 1.4
          });
        });
      }
    });
    
    return signals;
  }

  private async extractAuthoritySignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const authorityPatterns = [
      /\b(vp|vice presidents?|directors?|managers?|ceos?|ctos?|cfo)\b[^.!?\n]*\b(insurance|sales|marketing|operations)\b/gi,
      /\b(decision\s+makers?|approval|in charge|responsible)\b/gi,
      /\b(heads?\s+of|leads?|supervisor|executive)\b/gi
    ];
    
    authorityPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'authority',
            signal: match,
            confidence: 0.8,
            context: 'Authority/decision-maker mentioned',
            position: { start, end: start + match.length },
            weight: 1.2
          });
        });
      }
    });
    
    return signals;
  }

  private async extractNeedSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const needIndicators = [
      'need to', 'must have', 'must get', 'having trouble', 'struggling with',
      'difficulty with', 'issues with', 'problems with', 'currently using',
      'gap in', 'missing', 'lack of'
    ];
    
    needIndicators.forEach(indicator => {
      const pattern = new RegExp(`\\b${indicator}\\b`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'need',
            signal: match,
            confidence: 0.75,
            context: 'Explicit need/problem statement',
            position: { start, end: start + match.length },
            weight: 1.1
          });
        });
      }
    });
    
    return signals;
  }

  private async extractActionSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const actionKeywords = [
      'get started', 'sign up', 'enroll', 'implement', 'deploy',
      'book a demo', 'schedule a call', 'send contract', 'place order'
    ];
    
    actionKeywords.forEach(keyword => {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'action',
            signal: match,
            confidence: 0.85,
            context: 'Action/intent to purchase',
            position: { start, end: start + match.length },
            weight: 1.3
          });
        });
      }
    });
    
    return signals;
  }

  private async extractInsuranceSignals(text: string): Promise<BuyingSignal[]> {
    const signals: BuyingSignal[] = [];
    const insurancePatterns = [
      { pattern: /\b(premium|rates?|pricing|cost)\b/gi, type: 'premium_sensitivity' },
      { pattern: /\b(compliance|regulation|audit|hipaa|gdpr)\b/gi, type: 'compliance' },
      { pattern: /\b(risk assessment|risk management|underwriting)\b/gi, type: 'risk_assessment' }
    ];
    
    insurancePatterns.forEach(({pattern, type}) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const start = text.indexOf(match);
          signals.push({
            type: 'need' as const,
            signal: match,
            confidence: 0.8,
            context: `Insurance-specific signal: ${type}`,
            position: { start, end: start + match.length },
            weight: 1.1,
            verticalSpecific: true
          });
        });
      }
    });
    
    return signals;
  }

  private calculateIntentScore(signals: BuyingSignal[]): number {
    if (signals.length === 0) return 20;
    
    const weightedSum = signals.reduce((sum, signal) => {
      return sum + (signal.confidence * signal.weight);
    }, 0);
    
    const normalizedScore = (weightedSum / signals.length) * 100;
    return Math.min(normalizedScore, 100);
  }

  private calculateUrgencyScore(signals: BuyingSignal[]): number {
    const timelineSignals = signals.filter(s => s.type === 'timeline');
    if (timelineSignals.length === 0) return 0;
    
    const avgWeight = timelineSignals.reduce((sum, s) => sum + s.weight, 0) / timelineSignals.length;
    return Math.min(avgWeight * 80, 100);
  }

  private determineBuyingStage(signals: BuyingSignal[]): BuyingSignalsResult['buyingStage'] {
    if (signals.length === 0) return 'awareness';
    
    // Check for purchase intent signals
    if (signals.some(s => s.type === 'action' && s.confidence > 0.8)) {
      return 'purchase';
    }
    
    // Check for decision signals
    if (signals.some(s => s.type === 'decision' && s.confidence > 0.8)) {
      return 'evaluation';
    }
    
    // Check for comparison signals
    if (signals.some(s => s.type === 'comparison')) {
      return 'consideration';
    }
    
    // Check for multiple need signals
    const needCount = signals.filter(s => s.type === 'need').length;
    if (needCount >= 3) {
      return 'interest';
    }
    
    return 'awareness';
  }

  private getStrongestSignals(signals: BuyingSignal[]): BuyingSignal[] {
    return signals
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, 5);
  }

  private generateNextBestAction(stage: BuyingSignalsResult['buyingStage']): BuyingSignalsResult['nextBestAction'] {
    const actions: Record<BuyingSignalsResult['buyingStage'], BuyingSignalsResult['nextBestAction']> = {
      awareness: {
        action: 'Provide educational content and case studies',
        priority: 'medium',
        reasoning: 'Lead is in early awareness stage'
      },
      interest: {
        action: 'Schedule product demo and discovery call',
        priority: 'high',
        reasoning: 'Lead shows interest and needs deeper engagement'
      },
      consideration: {
        action: 'Provide technical documentation and ROI analysis',
        priority: 'high',
        reasoning: 'Lead evaluating solutions needs technical details'
      },
      evaluation: {
        action: 'Offer pilot program and implementation timeline',
        priority: 'high',
        reasoning: 'Lead in final evaluation needs risk mitigation'
      },
      purchase: {
        action: 'Send final proposal and closing documents',
        priority: 'high',
        reasoning: 'Lead ready to purchase, focus on closing'
      }
    };
    
    return actions[stage];
  }

  @Traceable('buyingSignals.batchDetect')
  async batchDetect(texts: string[]): Promise<BuyingSignalsResult[]> {
    return Promise.all(texts.map(text => this.detect(text)));
  }

  @Traceable('buyingSignals.analyzeConversation')
  async analyzeConversation(messages: Array<{text: string; timestamp: Date; sender: string}>): Promise<{
    overallSignals: BuyingSignal[];
    progression: string[];
    dealAcceleration: number;
    riskFactors: string[];
  }> {
    if (messages.length === 0) {
      return {
        overallSignals: [],
        progression: [],
        dealAcceleration: 0,
        riskFactors: []
      };
    }
    
    const analyses = await Promise.all(
      messages.map(msg => this.detect(msg.text))
    );
    
    const overallSignals = analyses.flatMap(a => a.signals);
    const progression = analyses.map((a, i) => 
      `${messages[i].timestamp.toISOString()}: ${a.buyingStage} (intent: ${Math.round(a.intentScore)}%)`
    );
    
    // Calculate deal acceleration
    const firstAnalysis = analyses[0];
    const lastAnalysis = analyses[analyses.length - 1];
    const dealAcceleration = ((lastAnalysis.intentScore - firstAnalysis.intentScore) / Math.max(firstAnalysis.intentScore, 1)) * 100;
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(overallSignals);
    
    return {
      overallSignals,
      progression,
      dealAcceleration: Math.max(dealAcceleration, 0),
      riskFactors
    };
  }

  private identifyRiskFactors(signals: BuyingSignal[]): string[] {
    const risks: string[] = [];
    
    // Check for price sensitivity
    const budgetConcerns = signals.filter(s => 
      s.type === 'budget' && ['expensive', 'costly', 'premium'].some(word => 
        s.signal.toLowerCase().includes(word)
      )
    );
    
    if (budgetConcerns.length > 0) {
      risks.push('Price sensitivity detected');
    }
    
    // Check for timeline uncertainty
    const vagueTimelines = signals.filter(s => 
      s.type === 'timeline' && s.confidence < 0.7
    );
    
    if (vagueTimelines.length > 0) {
      risks.push('Unclear timeline may indicate low urgency');
    }
    
    // Check for competitor mentions
    const competitorMentions = signals.filter(s => 
      s.context.includes('competitor') || s.context.includes('alternative')
    );
    
    if (competitorMentions.length > 1) {
      risks.push('Multiple competitor mentions indicate evaluation shopping');
    }
    
    return risks;
  }
}