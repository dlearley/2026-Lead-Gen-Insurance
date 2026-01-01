import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import { Document, Vector } from './ml-models';
import { NLPConfig } from '../../config/nlp.config';

export interface IntentClassification {
  intent: string;
  confidence: number;
  level: 'high' | 'medium' | 'low';
  signals: IntentSignal[];
  metadata: {
    questionDetected: boolean;
    questionType?: 'what' | 'why' | 'how' | 'when' | 'where' | 'who';
    comparativeIntent?: boolean;
    decisionMakingSignals?: DecisionSignal[];
    urgencyLevel: number;
  };
}

export interface IntentSignal {
  type: string;
  text: string;
  confidence: number;
  source: 'keyword' | 'phrase' | 'context';
}

export interface DecisionSignal {
  type: 'stakeholder' | 'budget' | 'timeline' | 'approval' | 'authority';
  text: string;
  confidence: number;
  importance: number;
}

export class IntentClassifier {
  private static instance: IntentClassifier;
  private patterns: Map<string, RegExp[]>;
  private questionPatterns: Map<string, RegExp>;
  private comparisonPatterns: RegExp[];
  private urgencyPatterns: RegExp[];
  private decisionPatterns: Map<string, RegExp[]>

  constructor() {
    this.patterns = new Map();
    this.questionPatterns = new Map();
    this.comparisonPatterns = [];
    this.urgencyPatterns = [];
    this.decisionPatterns = new Map();
    this.initializePatterns();
  }

  static getInstance(): IntentClassifier {
    if (!IntentClassifier.instance) {
      IntentClassifier.instance = new IntentClassifier();
    }
    return IntentClassifier.instance;
  }

  @Traceable('intent.classify')
  async classify(text: string, context?: {
    channel?: string;
    previousInteraction?: string;
    customerProfile?: Record<string, any>;
  }): Promise<IntentClassification> {
    try {
      logger.info('Classifying intent', { textLength: text.length, channel: context?.channel });

      // Detect question vs statement
      const questionDetection = this.detectQuestion(text);
      
      // Classify primary intent
      const intentResult = await this.classifyTextIntent(text);
      
      // Extract intent signals
      const signals = await this.extractIntentSignals(text);
      
      // Detect comparative intent
      const comparativeIntent = this.detectComparativeIntent(text);
      
      // Extract decision-making signals
      const decisionSignals = await this.extractDecisionSignals(text);
      
      // Calculate urgency
      const urgency = this.calculateUrgency(text);

      const classification: IntentClassification = {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        level: this.calculateIntentLevel(intentResult.confidence, signals, decisionSignals),
        signals,
        metadata: {
          questionDetected: questionDetection.isQuestion,
          questionType: questionDetection.questionType,
          comparativeIntent,
          decisionMakingSignals: decisionSignals,
          urgencyLevel: urgency
        }
      };

      logger.info('Intent classification completed', {
        intent: classification.intent,
        confidence: classification.confidence,
        signals: signals.length
      });

      return classification;
    } catch (error) {
      logger.error('Intent classification failed', { error, text });
      throw error;
    }
  }

  private detectQuestion(text: string): { isQuestion: boolean; questionType?: string } {
    const questionIndicators = [
      /^\s*(who|what|where|when|why|how|can|could|would|should|will|may|is|are|do|does|did)\b/i,
      /\?\s*$/,
      /\b(i'm\s+)?wonder(ing)?\b/i,
      /\b(i\s+)?(need|want|like)\s+to\s+know\b/i,
      /\bcan\s+you\s+(tell|explain|clarify|help)\b/i
    ];

    const isQuestion = questionIndicators.some(pattern => pattern.test(text));
    
    let questionType: string | undefined;
    if (isQuestion) {
      const typePatterns = {
        'what': /^\s*what\b/i,
        'why': /^\s*why\b/i,
        'how': /^\s*how\b/i,
        'when': /^\s*when\b/i,
        'where': /^\s*where\b/i,
        'who': /^\s*who\b/i
      };

      for (const [type, pattern] of Object.entries(typePatterns)) {
        if (pattern.test(text)) {
          questionType = type;
          break;
        }
      }
    }

    return { isQuestion, questionType };
  }

  private async classifyTextIntent(text: string): Promise<{ intent: string; confidence: number }> {
    const intentScores = new Map<string, number>();

    // Calculate matching scores for each intent
    this.patterns.forEach((patterns, intent) => {
      let score = 0;
      let matches = 0;

      patterns.forEach(pattern => {
        const patternMatches = text.match(pattern);
        if (patternMatches) {
          score += patternMatches.length;
          matches++;
        }
      });

      if (matches > 0) {
        intentScores.set(intent, score / matches);
      }
    });

    // Find best matching intent
    let bestIntent = 'general_inquiry';
    let bestScore = 0;

    intentScores.forEach((score, intent) => {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    });

    // If no good match, classify as general inquiry
    if (bestScore < 0.3) {
      bestIntent = 'general_inquiry';
      bestScore = 0.3;
    }

    return {
      intent: bestIntent,
      confidence: Math.min(bestScore, 0.95)
    };
  }

  private async extractIntentSignals(text: string): Promise<IntentSignal[]> {
    const signals: IntentSignal[] = [];

    // Define intent signals by type
    const signalDefinitions = {
      'high_buying_intent': {
        keywords: ['buy', 'purchase', 'order', 'get started', 'sign up', 'enroll'],
        phrases: ['ready to buy', 'decision made', 'want to purchase', 'send invoice', 'process order'],
        weight: 1.0
      },
      'demo_request': {
        keywords: ['demo', 'demonstration', 'walkthrough', 'presentation', 'show me'],
        phrases: ['schedule a demo', 'book demo', 'see in action', 'live demo'],
        weight: 0.9
      },
      'evaluation': {
        keywords: ['evaluate', 'assess', 'review', 'analyze', 'considering', 'looking at'],
        phrases: ['evaluating solutions', 'assess options', 'review platform', 'under consideration'],
        weight: 0.7
      },
      'comparison': {
        keywords: ['compare', 'versus', 'vs', 'alternative', 'instead of', 'instead'],
        phrases: ['compare with', 'looking at alternatives', 'vs competitor', 'switch from'],
        weight: 0.6
      },
      'learning': {
        keywords: ['learn', 'understand', 'how to', 'what is', 'explore', 'interested'],
        phrases: ['learn about', 'understand features', 'how does it work', 'explore options'],
        weight: 0.5
      },
      'problem_solving': {
        keywords: ['problem', 'issue', 'broken', 'doesnt work', 'fix', 'solution', 'help'],
        phrases: ['having trouble', 'need help with', 'problem with', 'looking for solution'],
        weight: 0.8
      },
      'implementation': {
        keywords: ['implement', 'deploy', 'setup', 'configure', 'install', 'integration'],
        phrases: ['get started', 'set up', 'deploy to', 'implement solution', 'integrate with'],
        weight: 0.85
      }
    };

    // Extract signals
    Object.entries(signalDefinitions).forEach(([signalType, config]) => {
      // Check keywords
      config.keywords.forEach(keyword => {
        const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(pattern);
        if (matches) {
          signals.push({
            type: signalType,
            text: keyword,
            confidence: config.weight * 0.8,
            source: 'keyword'
          });
        }
      });

      // Check phrases
      config.phrases.forEach(phrase => {
        const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(pattern);
        if (matches) {
          signals.push({
            type: signalType,
            text: phrase,
            confidence: config.weight * 0.9,
            source: 'phrase'
          });
        }
      });
    });

    // Remove duplicates and keep highest confidence per signal type
    const uniqueSignals: IntentSignal[] = [];
    const seenTypes = new Set<string>();

    signals.sort((a, b) => b.confidence - a.confidence).forEach(signal => {
      if (!seenTypes.has(signal.type)) {
        seenTypes.add(signal.type);
        uniqueSignals.push(signal);
      }
    });

    return uniqueSignals;
  }

  private detectComparativeIntent(text: string): boolean {
    return this.comparisonPatterns.some(pattern => pattern.test(text));
  }

  private async extractDecisionSignals(text: string): Promise<DecisionSignal[]> {
    const decisionSignals: DecisionSignal[] = [];

    // Stakeholder signals
    const stakeholderPattern = /\b(vp|vice presidents?|directors?|managers?|ceos?|ctos?|cfo\b|head\s+of|leads?|chiefs?|presidents?|founders?)\s+\w+/gi;
    const stakeholderMatches = text.matchAll(stakeholderPattern);
    Array.from(stakeholderMatches).forEach(match => {
      decisionSignals.push({
        type: 'stakeholder',
        text: match[0],
        confidence: 0.8,
        importance: 0.9
      });
    });

    // Budget signals
    const budgetPattern = /\b(budget|allocated|spending|\$\d+|dollars?|cost|pricing|price|expense|investment)\b/gi;
    const budgetMatches = text.matchAll(budgetPattern);
    Array.from(budgetMatches).forEach(match => {
      decisionSignals.push({
        type: 'budget',
        text: match[0],
        confidence: 0.7,
        importance: 0.8
      });
    });

    // Timeline signals
    const timelinePattern = /\b(asap|urgent|immediately|deadline|by\s+\w+|q[1-4]|quarter|month|week|day|timeline|schedule|plan)\b/gi;
    const timelineMatches = text.matchAll(timelinePattern);
    Array.from(timelineMatches).forEach(match => {
      decisionSignals.push({
        type: 'timeline',
        text: match[0],
        confidence: 0.6,
        importance: 0.7
      });
    });

    // Approval signals
    const approvalPattern = /\b(approved?|decided?|greenlit|authorized|cleared|go ahead|sign off)\b/gi;
    const approvalMatches = text.matchAll(approvalPattern);
    Array.from(approvalMatches).forEach(match => {
      decisionSignals.push({
        type: 'approval',
        text: match[0],
        confidence: 0.9,
        importance: 0.95
      });
    });

    // Authority signals
    const authorityPattern = /\b(decision maker|in charge|authority|responsible|deciding|make decision)\b/gi;
    const authorityMatches = text.matchAll(authorityPattern);
    Array.from(authorityMatches).forEach(match => {
      decisionSignals.push({
        type: 'authority',
        text: match[0],
        confidence: 0.85,
        importance: 0.9
      });
    });

    return decisionSignals;
  }

  private calculateUrgency(text: string): number {
    let urgencyScore = 0;
    let matches = 0;

    this.urgencyPatterns.forEach(pattern => {
      const patternMatches = text.match(pattern);
      if (patternMatches) {
        matches += patternMatches.length;
        urgencyScore += patternMatches.length;
      }
    });

    // Normalize to 0-1 scale
    return Math.min(urgencyScore / 3, 1.0);
  }

  private calculateIntentLevel(
    confidence: number, 
    signals: IntentSignal[], 
    decisionSignals: DecisionSignal[]
  ): 'high' | 'medium' | 'low' {
    const signalWeight = signals.reduce((sum, signal) => sum + signal.confidence, 0);
    const decisionWeight = decisionSignals.reduce((sum, signal) => sum + signal.importance, 0);
    
    const totalScore = (confidence * 0.4) + (signalWeight * 0.3) + (decisionWeight * 0.3);

    if (totalScore > 0.7) return 'high';
    if (totalScore > 0.4) return 'medium';
    return 'low';
  }

  private initializePatterns(): void {
    // Define intent patterns
    this.patterns.set('high_buying_intent', [
      /\b(buy|purchase|order|get started|sign up|enroll)\b/i,
      /\brea(fdy|dy)?\s+(to\s+)?buy\b/i,
      /\bdecision\s+made\s+to\s+buy\b/i,
      /\bsend\s+invoice|\bprocess\s+order|\bplace\s+order\b/i
    ]);

    this.patterns.set('demo_request', [
      /\bdemo(onstration)?\b/i,
      /\bwalk(\s|-)?through(\s+me)?\b/i,
      /\bpresentation|show\s+(me\s+)?(how\s+)?it\s+works\b/i
    ]);

    this.patterns.set('evaluation', [
      /\bevaluat(e|ing)|assess(ing)?|review(ing)?|analyz(e|ing)\b/i,
      /\bconsidering|looking\s+(at|for)\b/i,
      /\b(o|under)\s+evaluation|in\s+review\b/i
    ]);

    this.patterns.set('comparison', [
      /\bcompare(d)?\s+with|versus|vs\.?\b/i,
      /\balternative\s+(to|for)\b/i,
      /\bswitch(ing)?\s+from\s+competitor\b/i
    ]);

    this.patterns.set('learning', [
      /\blearn(\s+about)?|understand|explore|research(ing)?\b/i,
      /\bwhat\s+is|how\s+does|interested\s+in\b/i
    ]);

    this.patterns.set('problem_solving', [
      /\bproblem|issue|broken|not\s+working|error\b/i,
      /\bknow\s+how\s+to?|help\s+me\s+with|solution\s+for\b/i
    ]);

    this.patterns.set('implementation', [
      /\bimplement(ing)?|deploy(ing)?|set(\s+|-)?up|configure|install(ing)?\b/i,
      /\bintegrat(e|ing)\s+with|get\s+started|onboard(ing)?\b/i
    ]);

    // Initialize question patterns
    this.questionPatterns.set('what', /^\s*what\b/i);
    this.questionPatterns.set('why', /^\s*why\b/i);
    this.questionPatterns.set('how', /^\s*how\b/i);
    this.questionPatterns.set('when', /^\s*when\b/i);
    this.questionPatterns.set('where', /^\s*where\b/i);
    this.questionPatterns.set('who', /^\s*who\b/i);

    // Initialize comparison patterns
    this.comparisonPatterns = [
      /\bversus|vs\.?|compared?\s+to\b/i,
      /\balternative\s+(to|for)\b/i,
      /\binstead\s+of\s+competing\s+with\b/i
    ];

    // Initialize urgency patterns
    this.urgencyPatterns = [
      /\basap|urgent|immediately|right\s+away\b/i,
      /\bdeadline|by\s+\w+|end\s+of\s+\w+\b/i,
      /\bcritical|pressing|emergency\b/i
    ];

    // Initialize decision patterns
    this.decisionPatterns.set('budget', [
      /\bbudget|\$\d+|dollars?|cost|pricing\b/i,
      /\ballocated|spending|investment\b/i
    ]);

    this.decisionPatterns.set('timeline', [
      /\bdeadline|timeline|by\s+date|schedule|plan\b/i,
      /\bq[1-4]|quarter|month|week\b/i
    ]);
  }

  @Traceable('intent.batchClassify')
  async batchClassify(texts: string[]): Promise<IntentClassification[]> {
    return Promise.all(texts.map(text => this.classify(text)));
  }

  @Traceable('intent.extractComparisons')
  async extractComparisons(text: string): Promise<Array<{ 
    competitor: string;
    attributes: string[];
    preference: 'our' | 'competitor' | 'neutral'
  }>> {
    const comparisons = [];
    
    // Extract competitor mentions with attributes
    const comparisonPattern = /\b(?:better than|worse than|prefer|instead of|versus|vs\.?|compared to|alternative to)\s+(.+?)(?:\s+(?:because|since|as)\s+(.+?))?(?=\.|\b(?:but|and|or)\b|$)/gi;
    const matches = text.matchAll(comparisonPattern);
    
    Array.from(matches).forEach(match => {
      const competitor = match[1];
      const reason = match[2];
      
      comparisons.push({
        competitor,
        attributes: reason ? this.extractAttributes(reason) : [],
        preference: this.determinePreference(match[0])
      });
    });
    
    return comparisons;
  }

  private extractAttributes(text: string): string[] {
    // Extract features/attributes mentioned
    const attributePattern = /\b(price|cost|features?|functionality|integration|support|ease of use|ui|interface|speed|performance|reliability|scalability)\b/gi;
    const matches = text.match(attributePattern);
    return matches ? Array.from(new Set(matches)) : [];
  }

  private determinePreference(text: string): 'our' | 'competitor' | 'neutral' {
    if (/better than|prefer|instead of/i.test(text)) return 'our';
    if (/worse than|not as good as/i.test(text)) return 'competitor';
    return 'neutral';
  }
}