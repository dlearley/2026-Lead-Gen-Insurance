import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import { SentimentAnalyzer, SentimentResult } from './sentiment';
import { EntityRecognizer, EntityExtractionResult } from './ner';
import { IntentClassifier, IntentClassification } from './intent';
import { TopicModeler, TopicModelingResult } from './topic-modeling';
import { KeywordExtractor, KeywordExtractionResult } from './keyword-extraction';
import { BuyingSignalDetector, BuyingSignalsResult } from './buying-signals';
import { TextPreprocessor, PreprocessingResult } from './preprocessor';
import { NLPConfig } from '../../config/nlp.config';
import NodeCache from 'node-cache';

export interface CompleteNlpAnalysis {
  sentiment: SentimentResult;
  entities: EntityExtractionResult;
  intent: IntentClassification;
  keywords: KeywordExtractionResult;
  topics?: TopicModelingResult;
  buyingSignals: BuyingSignalsResult;
  preprocessing: PreprocessingResult;
  combinedInsights: {
    leadQualityScore: number;
    recommendedActions: string[];
    riskFactors: string[];
    opportunitySignals: string[];
    timelineEstimate: string;
    budgetRange?: string;
  };
}

export interface TopicModelingConfig {
  numTopics?: number;
  alpha?: number;
  beta?: number;
  maxIterations?: number;
}

export class NLPService {
  private static instance: NLPService;
  private sentimentAnalyzer: SentimentAnalyzer;
  private entityRecognizer: EntityRecognizer;
  private intentClassifier: IntentClassifier;
  private topicModeler: TopicModeler;
  private keywordExtractor: KeywordExtractor;
  private buyingSignalDetector: BuyingSignalDetector;
  private textPreprocessor: TextPreprocessor;
  private cache: NodeCache;

  constructor() {
    this.sentimentAnalyzer = SentimentAnalyzer.getInstance();
    this.entityRecognizer = EntityRecognizer.getInstance();
    this.intentClassifier = IntentClassifier.getInstance();
    this.topicModeler = TopicModeler.getInstance();
    this.keywordExtractor = KeywordExtractor.getInstance();
    this.buyingSignalDetector = BuyingSignalDetector.getInstance();
    this.textPreprocessor = TextPreprocessor.getInstance();
    this.cache = new NodeCache({ stdTTL: 3600, maxKeys: 10000 });
  }

  static getInstance(): NLPService {
    if (!NLPService.instance) {
      NLPService.instance = new NLPService();
    }
    return NLPService.instance;
  }

  @Traceable('nlp.analyze')
  async analyzeText(
    text: string,
    options?: {
      domain?: string;
      includeTopics?: boolean;
      maxProcessingTime?: number;
    }
  ): Promise<CompleteNlpAnalysis> {
    try {
      logger.info('Starting NLP analysis', { textLength: text.length, domain: options?.domain });
      
      // Check cache first
      const cacheKey = this.getCacheKey(text, options);
      const cached = this.cache.get<CompleteNlpAnalysis>(cacheKey);
      if (cached) {
        logger.debug('NLP analysis cache hit');
        return cached;
      }

      // Preprocess the text first
      const preprocessing = await this.textPreprocessor.preprocess(text);
      
      // Run parallel NLP analyses
      const [sentiment, entities, intent, keywords, buyingSignals] = await Promise.all([
        this.sentimentAnalyzer.analyze(text, { domain: options?.domain }),
        this.entityRecognizer.extractEntities(text, { domain: options?.domain }),
        this.intentClassifier.classify(text, { channel: 'crm' }),
        this.keywordExtractor.extract(text, {
          useDomainSpecific: true,
          detectCompetitive: true,
          extractActionable: true,
          numKeywords: 15
        }),
        this.buyingSignalDetector.detect(text, { domain: options?.domain })
      ]);

      // Optional topic modeling for batch analysis
      let topics: TopicModelingResult | undefined;
      if (options?.includeTopics) {
        topics = await this.topicModeler.analyze([text], {
          numTopics: 3,
          maxIterations: 50
        });
      }

      // Generate combined insights
      const combinedInsights = this.generateCombinedInsights(
        sentiment,
        entities,
        intent,
        buyingSignals
      );

      const result: CompleteNlpAnalysis = {
        sentiment,
        entities,
        intent,
        keywords,
        topics,
        buyingSignals,
        preprocessing,
        combinedInsights
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      logger.info('NLP analysis completed', {
        sentiment: result.sentiment.sentiment,
        entities: result.entities.entities.length,
        buyingStage: result.buyingSignals.buyingStage,
        leadQuality: result.combinedInsights.leadQualityScore
      });

      return result;
    } catch (error) {
      logger.error('NLP analysis failed', { error, text: text.substring(0, 100) });
      throw error;
    }
  }

  @Traceable('nlp.analyzeLead')
  async analyzeLead(
    leadId: string,
    leadData: {
      description?: string;
      email?: string;
      company?: string;
      industry?: string;
      conversationHistory?: Array<{
        message: string;
        timestamp: Date;
        sender: string;
      }>;
    }
  ): Promise<CompleteNlpAnalysis> {
    try {
      logger.info('Analyzing lead with NLP pipeline', { leadId, industry: leadData.industry });
      
      // Combine conversation history if available
      const textsToAnalyze: string[] = [];
      
      if (leadData.description) {
        textsToAnalyze.push(leadData.description);
      }
      
      if (leadData.conversationHistory?.length) {
        // Add recent conversation history
        const recentMessages = leadData.conversationHistory
          .slice(-3) // Last 3 messages
          .map(msg => `${msg.sender}: ${msg.message}`)
          .join('\n');
        textsToAnalyze.push(recentMessages);
      }
      
      // If no text to analyze, throw error
      if (textsToAnalyze.length === 0) {
        throw new Error('No text content available for analysis');
      }
      
      // Analyze main description
      const context = {
        domain: leadData.industry,
        source: leadData.email ? 'email' : 'crm',
      };
      
      const mainAnalysis = await this.analyzeText(textsToAnalyze[0], context);
      
      // If conversation history exists, enrich with conversation analysis
      if (leadData.conversationHistory?.length) {
        const conversationAnalysis = await this.buyingSignalDetector.analyzeConversation(
          leadData.conversationHistory
        );
        
        // Merge conversation insights
        mainAnalysis.combinedInsights.riskFactors.push(
          ...conversationAnalysis.riskFactors
        );
        
        if (conversationAnalysis.dealAcceleration > 0) {
          mainAnalysis.combinedInsights.opportunitySignals.push(
            `Deal acceleration: +${Math.round(conversationAnalysis.dealAcceleration)}%`
          );
        }
      }
      
      logger.info('Lead NLP analysis completed', { 
        leadId, 
        qualityScore: mainAnalysis.combinedInsights.leadQualityScore 
      });
      
      return mainAnalysis;
      
    } catch (error) {
      logger.error('Lead analysis failed', { error, leadId });
      throw error;
    }
  }

  @Traceable('nlp.analyzeEmailThread')
  async analyzeEmailThread(
    threadId: string,
    emails: Array<{
      subject: string;
      body: string;
      from: string;
      to: string[];
      date: Date;
    }>
  ): Promise<CompleteNlpAnalysis> {
    try {
      logger.info('Analyzing email thread', { threadId, emailCount: emails.length });
      
      // Extract text from emails
      const threadText = emails.map(email => 
        `
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}
Body: ${email.body}
        `.trim()
      ).join('\n\n---\n\n');
      
      // Infer domain from email content
      const domain = this.inferDomainFromThread(threadText);
      
      const analysis = await this.analyzeText(threadText, { domain });
      
      logger.info('Email thread analysis completed', { threadId });
      return analysis;
      
    } catch (error) {
      logger.error('Email thread analysis failed', { error, threadId });
      throw error;
    }
  }

  @Traceable('nlp.batchAnalyze')
  async batchAnalyze(
    texts: string[],
    options?: {
      batchSize?: number;
      includeTopics?: boolean;
    }
  ): Promise<CompleteNlpAnalysis[]> {
    try {
      logger.info('Starting batch NLP analysis', { textCount: texts.length });
      
      const batchSize = options?.batchSize || NLPConfig.maxConcurrentRequests;
      const results: CompleteNlpAnalysis[] = [];
      
      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(text => this.analyzeText(text, options))
        );
        results.push(...batchResults);
        
        logger.debug('Batch processed', { 
          processed: Math.min(i + batchSize, texts.length), 
          total: texts.length 
        });
      }
      
      logger.info('Batch analysis completed', { 
        processed: results.length,
        avgQuality: results.reduce((sum, r) => sum + r.combinedInsights.leadQualityScore, 0) / results.length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Batch analysis failed', { error, textCount: texts.length });
      throw error;
    }
  }

  async getTopicModeling(texts: string[], options?: TopicModelingConfig): Promise<TopicModelingResult> {
    try {
      logger.info('Performing topic modeling', { documentCount: texts.length });
      
      const result = await this.topicModeler.analyze(texts, options);
      
      logger.info('Topic modeling completed', {
        numTopics: result.topics.length,
        coherence: result.coherence
      });
      
      return result;
    } catch (error) {
      logger.error('Topic modeling failed', { error, documentCount: texts.length });
      throw error;
    }
  }

  async analyzeSentimentTrends(
    textTimestamps: Array<{ text: string; timestamp: Date }>
  ): Promise<Array<{
    date: Date;
    sentiment: string;
    confidence: number;
    change: number;
  }>> {
    try {
      logger.info('Analyzing sentiment trends', { sampleCount: textTimestamps.length });
      
      const analyses = await Promise.all(
        textTimestamps.map(item => this.sentimentAnalyzer.analyze(item.text))
      );
      
      return textTimestamps.map((item, index) => ({
        date: item.timestamp,
        sentiment: analyses[index].sentiment,
        confidence: analyses[index].confidence,
        change: analyses[index].intensity - 50
      }));
      
    } catch (error) {
      logger.error('Sentiment trend analysis failed', { error });
      throw error;
    }
  }

  private generateCombinedInsights(
    sentiment: SentimentResult,
    entities: EntityExtractionResult,
    intent: IntentClassification,
    buyingSignals: BuyingSignalsResult
  ): CompleteNlpAnalysis['combinedInsights'] {
    const insights: CompleteNlpAnalysis['combinedInsights'] = {
      leadQualityScore: 0,
      recommendedActions: [],
      riskFactors: [],
      opportunitySignals: [],
      timelineEstimate: buyingSignals.buyingStage,
    };

    // Calculate lead quality score
    insights.leadQualityScore = this.calculateLeadQualityScore(
      sentiment,
      intent,
      buyingSignals
    );

    // Generate recommendations based on signals
    insights.recommendedActions = this.generateRecommendations(
      buyingSignals.buyingStage
    );

    // Identify risk factors
    insights.riskFactors = this.identifyRiskFactors(buyingSignals);

    // Extract opportunity signals
    insights.opportunitySignals = this.extractOpportunitySignals(entities, buyingSignals);

    // Extract budget range from monetary entities
    const budgetEntity = entities.entities.find(e => e.type === 'MONEY');
    if (budgetEntity) {
      insights.budgetRange = budgetEntity.text;
    }

    return insights;
  }

  private calculateLeadQualityScore(
    sentiment: SentimentResult,
    intent: IntentClassification,
    buyingSignals: BuyingSignalsResult
  ): number {
    let score = 0;

    // Sentiment factor (20%)
    const sentimentFactor = sentiment.sentiment === 'positive' ? 1.0 : 
                           sentiment.sentiment === 'neutral' ? 0.5 : 0.2;
    score += sentimentFactor * 20;

    // Intent level (25%)
    const intentLevelScore = intent.level === 'high' ? 1.0 : 
                            intent.level === 'medium' ? 0.6 : 0.3;
    score += intentLevelScore * 25;

    // Buying intent (25%)
    score += (buyingSignals.intentScore / 100) * 25;

    // Urgency (15%)
    score += (buyingSignals.urgencyScore / 100) * 15;

    // Buying stage bonus (15%)
    const stageScores = {
      awareness: 0.2,
      interest: 0.4,
      consideration: 0.6,
      evaluation: 0.8,
      purchase: 1.0
    };
    score += stageScores[buyingSignals.buyingStage] * 15;

    return Math.min(score, 100);
  }

  private generateRecommendations(stage: BuyingSignalsResult['buyingStage']): string[] {
    const recommendations: string[] = [];

    const stageRecommendations: Record<BuyingSignalsResult['buyingStage'], string[]> = {
      awareness: [
        'Share educational content and industry insights',
        'Provide relevant case studies',
        'Schedule discovery call to understand needs'
      ],
      interest: [
        'Schedule comprehensive product demo',
        'Provide ROI calculator and value analysis',
        'Share customer testimonials and success stories'
      ],
      consideration: [
        'Provide technical documentation',
        'Schedule technical deep-dive session',
        'Discuss integration requirements'
      ],
      evaluation: [
        'Offer pilot program or trial access',
        'Provide detailed implementation timeline',
        'Schedule executive business case presentation'
      ],
      purchase: [
        'Send final proposal and contract terms',
        'Coordinate implementation kickoff',
        'Discuss onboarding and training plan'
      ]
    };

    return stageRecommendations[stage] || stageRecommendations.awareness;
  }

  private identifyRiskFactors(buyingSignals: BuyingSignalsResult): string[] {
    return buyingSignals.signals.length > 0 ? [] : ['Limited engagement signals detected'];
  }

  private extractOpportunitySignals(
    entities: EntityExtractionResult,
    buyingSignals: BuyingSignalsResult
  ): string[] {
    const opportunities: string[] = [];

    // High buying intent
    if (buyingSignals.intentScore > 70) {
      opportunities.push(`Strong buying intent (${Math.round(buyingSignals.intentScore)}%)`);
    }

    // High urgency
    if (buyingSignals.urgencyScore > 60) {
      opportunities.push(`High urgency detected (${Math.round(buyingSignals.urgencyScore)}%)`);
    }

    // Technology identified
    const techCount = entities.entities.filter(e => e.type === 'TECHNOLOGY').length;
    if (techCount > 0) {
      opportunities.push(`${techCount} technology stack components identified`);
    }

    return opportunities;
  }

  private inferDomainFromThread(threadText: string): string {
    // Check for insurance keywords
    if (/\b(insurance|policy|premium|claim|coverage|underwriting)\b/i.test(threadText)) {
      return 'insurance';
    }
    
    return 'general';
  }

  private getCacheKey(text: string, options?: any): string {
    const contextHash = options ? JSON.stringify(options) : '';
    const textHash = text.substring(0, 100);
    return `nlp:${textHash}:${contextHash}`;
  }

  generateSummary(analysis: CompleteNlpAnalysis): string {
    const parts: string[] = [];
    
    parts.push(`Sentiment: ${analysis.sentiment.sentiment} (${Math.round(analysis.sentiment.confidence * 100)}% confidence)`);
    parts.push(`Lead quality: ${Math.round(analysis.combinedInsights.leadQualityScore)}/100`);
    parts.push(`Buying stage: ${analysis.buyingSignals.buyingStage}`);
    
    if (analysis.combinedInsights.budgetRange) {
      parts.push(`Budget: ${analysis.combinedInsights.budgetRange}`);
    }
    
    if (analysis.combinedInsights.opportunitySignals.length > 0) {
      parts.push(`Opportunities: ${analysis.combinedInsights.opportunitySignals.join(', ')}`);
    }
    
    return parts.join('. ');
  }
}