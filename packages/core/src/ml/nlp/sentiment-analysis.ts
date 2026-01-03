import { logger, TracingService } from '../../index.js';

export interface SentimentAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  confidence: number; // 0 to 1
  aspects: SentimentAspect[];
  emotionalTone: EmotionalTone;
}

export interface SentimentAspect {
  aspect: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  mentions: number;
}

export interface EmotionalTone {
  primaryEmotion: string;
  emotionScores: Record<string, number>;
  urgencyLevel: 'low' | 'medium' | 'high';
  formalityLevel: 'formal' | 'informal';
}

export interface EntityExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  categories: string[];
}

export interface Entity {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  normalizedValue?: any;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface TopicModelingResult {
  topics: Topic[];
  dominantTopic: Topic;
  topicDistribution: Record<string, number>;
}

export interface Topic {
  id: string;
  keywords: string[];
  weight: number;
  coherence: number;
}

export interface LeadQualityNarrative {
  leadId: string;
  qualityIndicators: string[];
  redFlags: string[];
  scoringRationale: string;
  narrative: string;
  actionPriority: 'low' | 'medium' | 'high' | 'urgent';
}

export class AdvancedNLPAnalyzer {
  private positiveWords = new Set([
    'excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic', 'love',
    'perfect', 'best', 'awesome', 'incredible', 'outstanding', 'superb',
    'satisfied', 'happy', 'pleased', 'excited', 'enthusiastic', 'confident',
    'recommend', 'trust', 'reliable', 'professional', 'helpful'
  ]);

  private negativeWords = new Set([
    'terrible', 'bad', 'awful', 'horrible', 'hate', 'worst', 'disappointed',
    'frustrated', 'angry', 'upset', 'annoyed', 'confused', 'worried', 'concerned',
    'problem', 'issue', 'complaint', 'difficult', 'complicated', 'expensive'
  ]);

  private urgencyWords = new Set([
    'urgent', 'immediate', 'asap', 'quickly', 'fast', 'soon', 'now',
    'deadline', 'emergency', 'critical', 'pressing', 'time-sensitive'
  ]);

  private insuranceTerms = new Set([
    'coverage', 'premium', 'deductible', 'policy', 'claim', 'benefits',
    'limits', 'liability', 'comprehensive', 'collision', 'homeowners',
    'life', 'health', 'auto', 'vehicle', 'property', 'rental'
  ]);

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    return TracingService.trace('nlp.sentiment', async (span) => {
      const startTime = Date.now();
      
      try {
        const tokens = this.tokenize(text.toLowerCase());
        const sentimentScore = this.calculateSentimentScore(tokens);
        const aspects = this.extractSentimentAspects(tokens, text);
        const emotionalTone = this.analyzeEmotionalTone(tokens, text);
        
        const overallSentiment = sentimentScore > 0.1 ? 'positive' :
                                sentimentScore < -0.1 ? 'negative' : 'neutral';
        
        const confidence = this.calculateSentimentConfidence(tokens, sentimentScore);
        
        const result: SentimentAnalysis = {
          overallSentiment,
          sentimentScore,
          confidence,
          aspects,
          emotionalTone
        };

        span.setAttributes({
          'nlp.text_length': text.length,
          'nlp.sentiment_score': sentimentScore,
          'nlp.overall_sentiment': overallSentiment,
          'nlp.confidence': confidence,
          'nlp.aspect_count': aspects.length,
          'nlp.duration_ms': Date.now() - startTime
        });

        logger.info('Sentiment analysis completed', {
          sentiment: overallSentiment,
          score: sentimentScore,
          aspectCount: aspects.length
        });

        return result;

      } catch (error) {
        logger.error('Sentiment analysis failed', { error, textLength: text.length });
        span.recordException(error as Error);
        throw error;
      }
    });
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private calculateSentimentScore(tokens: string[]): number {
    let positiveCount = 0;
    let negativeCount = 0;
    let totalSentimentWords = 0;

    for (const token of tokens) {
      if (this.positiveWords.has(token)) {
        positiveCount++;
        totalSentimentWords++;
      } else if (this.negativeWords.has(token)) {
        negativeCount++;
        totalSentimentWords++;
      }
    }

    if (totalSentimentWords === 0) return 0;
    
    const rawScore = (positiveCount - negativeCount) / totalSentimentWords;
    return Math.max(-1, Math.min(1, rawScore));
  }

  private extractSentimentAspects(tokens: string[], originalText: string): SentimentAspect[] {
    const aspects: SentimentAspect[] = [];
    const aspectKeywords = {
      'service': ['service', 'support', 'help', 'assistance', 'customer'],
      'price': ['price', 'cost', 'expensive', 'cheap', 'affordable', 'premium', 'budget'],
      'coverage': ['coverage', 'policy', 'protection', 'benefits', 'limit', 'terms'],
      'process': ['process', 'application', 'paperwork', 'approval', 'fast', 'slow', 'easy'],
      'agent': ['agent', 'representative', 'staff', 'person', 'professional']
    };

    for (const [aspect, keywords] of Object.entries(aspectKeywords)) {
      let aspectSentiment = 0;
      let mentions = 0;

      for (const token of tokens) {
        if (keywords.some(keyword => token.includes(keyword) || keyword.includes(token))) {
          mentions++;
          // Check sentiment of surrounding tokens
          const tokenIndex = tokens.indexOf(token);
          const window = tokens.slice(Math.max(0, tokenIndex - 3), tokenIndex + 4);
          
          const windowSentiment = this.calculateSentimentScore(window);
          aspectSentiment += windowSentiment;
        }
      }

      if (mentions > 0) {
        const avgSentiment = aspectSentiment / mentions;
        aspects.push({
          aspect,
          sentiment: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral',
          score: avgSentiment,
          mentions
        });
      }
    }

    return aspects;
  }

  private analyzeEmotionalTone(tokens: string[], text: string): EmotionalTone {
    const emotionScores: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      neutral: 0
    };

    // Check for urgency
    const hasUrgency = this.urgencyWords.some(word => 
      tokens.some(token => token.includes(word) || word.includes(token))
    );

    // Check for formality (simple heuristic)
    const formalIndicators = text.includes('Dear') || text.includes('Sincerely') || 
                            text.includes('Thank you') || text.includes('please');
    const informalIndicators = tokens.includes('hey') || tokens.includes('thanks') || 
                              tokens.includes('cool') || tokens.includes('awesome');

    // Determine primary emotion based on sentiment and words
    const sentimentScore = this.calculateSentimentScore(tokens);
    if (sentimentScore > 0.3) {
      emotionScores.joy = Math.abs(sentimentScore);
    } else if (sentimentScore < -0.3) {
      emotionScores.anger = Math.abs(sentimentScore) * 0.6;
      emotionScores.sadness = Math.abs(sentimentScore) * 0.4;
    } else {
      emotionScores.neutral = 0.7;
    }

    // Find dominant emotion
    let primaryEmotion = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryEmotion = emotion;
      }
    }

    return {
      primaryEmotion,
      emotionScores,
      urgencyLevel: hasUrgency ? 'high' : 'medium',
      formalityLevel: formalIndicators > informalIndicators ? 'formal' : 'informal'
    };
  }

  private calculateSentimentConfidence(tokens: string[], sentimentScore: number): number {
    const sentimentWordCount = tokens.filter(token => 
      this.positiveWords.has(token) || this.negativeWords.has(token)
    ).length;
    
    const totalTokens = tokens.length;
    const coverage = sentimentWordCount / Math.max(1, totalTokens);
    
    // Confidence based on sentiment word coverage and extremity of score
    const extremity = Math.abs(sentimentScore);
    return Math.min(0.95, (coverage * 0.6 + extremity * 0.4));
  }

  async extractEntities(text: string): Promise<EntityExtractionResult> {
    return TracingService.trace('nlp.entities', async (span) => {
      const entities: Entity[] = [];
      const relationships: Relationship[] = [];
      
      // Extract contact information
      entities.push(...this.extractContactEntities(text));
      
      // Extract insurance-specific entities
      entities.push(...this.extractInsuranceEntities(text));
      
      // Extract dates and numbers
      entities.push(...this.extractTemporalEntities(text));
      
      // Extract locations
      entities.push(...this.extractLocationEntities(text));
      
      // Identify simple relationships
      relationships.push(...this.identifyRelationships(entities));
      
      const categories = this.identifyCategories(text, entities);
      
      span.setAttributes({
        'nlp.entity_count': entities.length,
        'nlp.relationship_count': relationships.length,
        'nlp.category_count': categories.length
      });

      logger.info('Entity extraction completed', {
        entityCount: entities.length,
        relationshipCount: relationships.length
      });

      return { entities, relationships, categories };
    });
  }

  private extractContactEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      const match = emailRegex.exec(text);
      if (match) {
        entities.push({
          text: email,
          type: 'EMAIL',
          startIndex: match.index,
          endIndex: match.index + email.length,
          confidence: 0.95
        });
      }
    });
    
    // Phone numbers
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach((phone, index) => {
      const match = phoneRegex.exec(text);
      if (match) {
        entities.push({
          text: phone,
          type: 'PHONE',
          startIndex: match.index,
          endIndex: match.index + phone.length,
          confidence: 0.9
        });
      }
    });
    
    return entities;
  }

  private extractInsuranceEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    const insuranceTypes = ['auto', 'home', 'life', 'health', 'commercial', 'property', 'liability'];
    const coverageTerms = ['comprehensive', 'collision', 'liability', 'full coverage', 'basic'];
    
    const tokens = this.tokenize(text);
    
    // Find insurance types
    tokens.forEach((token, index) => {
      if (insuranceTypes.some(type => token.includes(type))) {
        entities.push({
          text: token,
          type: 'INSURANCE_TYPE',
          startIndex: text.toLowerCase().indexOf(token),
          endIndex: text.toLowerCase().indexOf(token) + token.length,
          confidence: 0.85
        });
      }
      
      if (coverageTerms.some(term => token.includes(term.replace(' ', '')))) {
        entities.push({
          text: token,
          type: 'COVERAGE_TYPE',
          startIndex: text.toLowerCase().indexOf(token),
          endIndex: text.toLowerCase().indexOf(token) + token.length,
          confidence: 0.8
        });
      }
    });
    
    return entities;
  }

  private extractTemporalEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // Dates
    const dateRegex = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      const match = dateRegex.exec(text);
      if (match) {
        entities.push({
          text: date,
          type: 'DATE',
          startIndex: match.index,
          endIndex: match.index + date.length,
          confidence: 0.9,
          normalizedValue: this.normalizeDate(date)
        });
      }
    });
    
    // Money amounts
    const moneyRegex = /\$\d+(?:,\d+)*(?:\.\d{2})?/g;
    const amounts = text.match(moneyRegex) || [];
    amounts.forEach(amount => {
      const match = moneyRegex.exec(text);
      if (match) {
        entities.push({
          text: amount,
          type: 'MONEY',
          startIndex: match.index,
          endIndex: match.index + amount.length,
          confidence: 0.95
        });
      }
    });
    
    return entities;
  }

  private extractLocationEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    const states = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
      'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
      'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];
    
    const stateRegex = new RegExp(`\\b(${states.join('|')})\\b`, 'g');
    const foundStates = text.match(stateRegex) || [];
    
    foundStates.forEach(state => {
      const match = text.match(new RegExp(`\\b${state}\\b`));
      if (match) {
        entities.push({
          text: state,
          type: 'LOCATION',
          startIndex: match.index || 0,
          endIndex: (match.index || 0) + state.length,
          confidence: 0.95
        });
      }
    });
    
    return entities;
  }

  private identifyRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Simple relationship identification
    const emails = entities.filter(e => e.type === 'EMAIL');
    const phones = entities.filter(e => e.type === 'PHONE');
    
    if (emails.length > 0 && phones.length > 0) {
      relationships.push({
        source: emails[0].text,
        target: phones[0].text,
        type: 'CONTACT_RELATED',
        confidence: 0.7
      });
    }
    
    return relationships;
  }

  private identifyCategories(text: string, entities: Entity[]): string[] {
    const categories = new Set<string>();
    
    // Insurance-related categories
    if (entities.some(e => e.type === 'INSURANCE_TYPE')) {
      categories.add('INSURANCE_INQUIRY');
    }
    
    if (entities.some(e => e.type === 'MONEY')) {
      categories.add('PRICING_DISCUSSION');
    }
    
    // Urgency detection
    const tokens = this.tokenize(text);
    if (this.urgencyWords.some(word => tokens.includes(word))) {
      categories.add('URGENT');
    }
    
    return Array.from(categories);
  }

  async analyzeTopics(texts: string[]): Promise<TopicModelingResult> {
    return TracingService.trace('nlp.topics', async (span) => {
      const topics: Topic[] = [];
      const tokenFrequencies = new Map<string, number>();
      
      // Simple topic modeling - in production, use LDA or other algorithms
      for (const text of texts) {
        const tokens = this.tokenize(text);
        for (const token of tokens) {
          if (token.length > 3 && !this.isStopWord(token)) {
            tokenFrequencies.set(token, (tokenFrequencies.get(token) || 0) + 1);
          }
        }
      }
      
      // Group similar terms into topics
      const sortedTokens = Array.from(tokenFrequencies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      
      // Create topics from frequent terms
      const topicGroups = [
        {
          keywords: ['coverage', 'policy', 'benefits', 'protection', 'limit'],
          name: 'insurance_coverage'
        },
        {
          keywords: ['price', 'cost', 'expensive', 'affordable', 'budget', 'premium'],
          name: 'pricing_concerns'
        },
        {
          keywords: ['service', 'help', 'support', 'assist', 'responsive', 'professional'],
          name: 'customer_service'
        },
        {
          keywords: ['claim', 'accident', 'damage', 'repair', 'incident', 'loss'],
          name: 'claims_experience'
        }
      ];
      
      topicGroups.forEach((group, index) => {
        const matchingTokens = sortedTokens.filter(([token]) => 
          group.keywords.some(keyword => token.includes(keyword) || keyword.includes(token))
        );
        
        if (matchingTokens.length > 0) {
          const totalWeight = matchingTokens.reduce((sum, [, freq]) => sum + freq, 0);
          topics.push({
            id: group.name,
            keywords: matchingTokens.map(([token]) => token).slice(0, 5),
            weight: totalWeight / texts.length,
            coherence: 0.7 + Math.random() * 0.2 // Mock coherence score
          });
        }
      });
      
      const dominantTopic = topics.reduce((max, topic) => 
        topic.weight > max.weight ? topic : max, topics[0]);
      
      const topicDistribution = topics.reduce((dist, topic) => {
        dist[topic.id] = topic.weight;
        return dist;
      }, {} as Record<string, number>);
      
      span.setAttributes({
        'nlp.topic_count': topics.length,
        'nlp.dominant_topic': dominantTopic.id,
        'nlp.text_count': texts.length
      });
      
      logger.info('Topic modeling completed', {
        topicCount: topics.length,
        dominantTopic: dominantTopic.id
      });
      
      return {
        topics,
        dominantTopic,
        topicDistribution
      };
    });
  }

  private isStopWord(token: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those', 'a', 'an'
    ]);
    return stopWords.has(token);
  }

  private normalizeDate(dateStr: string): string {
    // Simple date normalization - in production, use proper date parsing
    return dateStr;
  }

  async analyzeLeadQualityNarrative(leadId: string, text: string): Promise<LeadQualityNarrative> {
    return TracingService.trace('nlp.lead_quality', async (span) => {
      const [sentiment, entities] = await Promise.all([
        this.analyzeSentiment(text),
        this.extractEntities(text)
      ]);
      
      const qualityIndicators: string[] = [];
      const redFlags: string[] = [];
      let actionPriority: LeadQualityNarrative['actionPriority'] = 'medium';
      
      // Analyze sentiment for quality
      if (sentiment.overallSentiment === 'positive' && sentiment.confidence > 0.7) {
        qualityIndicators.push('Positive sentiment with high confidence');
      } else if (sentiment.overallSentiment === 'negative') {
        redFlags.push('Negative sentiment detected');
        actionPriority = 'high';
      }
      
      // Check for urgency
      if (sentiment.emotionalTone.urgencyLevel === 'high') {
        qualityIndicators.push('High urgency indicated');
        actionPriority = 'urgent';
      }
      
      // Check entities for completeness
      const hasContactInfo = entities.entities.some(e => 
        e.type === 'EMAIL' || e.type === 'PHONE'
      );
      if (hasContactInfo) {
        qualityIndicators.push('Contact information provided');
      }
      
      const hasInsuranceType = entities.entities.some(e => e.type === 'INSURANCE_TYPE');
      if (hasInsuranceType) {
        qualityIndicators.push('Specific insurance type mentioned');
      }
      
      // Generate narrative
      const narrative = this.composeQualityNarrative(sentiment, entities, qualityIndicators, redFlags);
      
      const scoringRationale = [
        `Sentiment: ${sentiment.overallSentiment} (${sentiment.confidence.toFixed(2)} confidence)`,
        `Urgency: ${sentiment.emotionalTone.urgencyLevel}`,
        `Contact info: ${hasContactInfo ? 'provided' : 'missing'}`,
        `Insurance type: ${hasInsuranceType ? 'specified' : 'not specified'}`
      ].join(', ');
      
      span.setAttributes({
        'nlp.lead_id': leadId,
        'nlp.sentiment': sentiment.overallSentiment,
        'nlp.action_priority': actionPriority,
        'nlp.red_flag_count': redFlags.length
      });
      
      logger.info('Lead quality narrative analyzed', {
        leadId,
        sentiment: sentiment.overallSentiment,
        actionPriority,
        qualityIndicators: qualityIndicators.length
      });
      
      return {
        leadId,
        qualityIndicators,
        redFlags,
        scoringRationale,
        narrative,
        actionPriority
      };
    });
  }

  private composeQualityNarrative(
    sentiment: SentimentAnalysis,
    entities: EntityExtractionResult,
    indicators: string[],
    redFlags: string[]
  ): string {
    const parts: string[] = [];
    
    if (sentiment.emotionalTone.urgencyLevel === 'high') {
      parts.push('This lead expresses high urgency and should be prioritized.');
    }
    
    if (indicators.length > redFlags.length) {
      parts.push('Overall quality indicators are positive.');
    } else if (redFlags.length > 0) {
      parts.push('Several concerns were identified that require attention.');
    }
    
    if (entities.entities.length > 3) {
      parts.push('Good amount of specific information provided.');
    }
    
    return parts.join(' ');
  }
}