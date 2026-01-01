import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import nlp from 'compromise';
import compromiseSentimentsPlugin from 'compromise-sentiments';
import { createHfInference } from './huggingface-client';
import { NLPConfig } from '../../config/nlp.config';
import NodeCache from 'node-cache';

nlp.plugin(compromiseSentimentsPlugin);

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  intensity: number; // 0-100
  emotions: {
    happy?: number;
    sad?: number;
    angry?: number;
    frustrated?: number;
    curious?: number;
    skeptical?: number;
    excited?: number;
    anxious?: number;
  };
  tone: {
    professional: number;
    casual: number;
    urgent: number;
    hesitant: number;
    confident: number;
  };
  aspects: Array<{
    topic: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }>;
  comparative: Array<{
    comparison: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }>;
}

export class SentimentAnalyzer {
  private static instance: SentimentAnalyzer;
  private cache: NodeCache;
  private hfInference: any;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 1800, maxKeys: 10000 });
    this.hfInference = createHfInference();
  }

  static getInstance(): SentimentAnalyzer {
    if (!SentimentAnalyzer.instance) {
      SentimentAnalyzer.instance = new SentimentAnalyzer();
    }
    return SentimentAnalyzer.instance;
  }

  @Traceable('sentiment.analyze')
  async analyze(
    text: string,
    context?: {
      domain?: string;
      previousAnalysis?: SentimentResult;
      relatedTexts?: string[];
    }
  ): Promise<SentimentResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text, context);
      const cached = this.cache.get<SentimentResult>(cacheKey);
      if (cached) {
        logger.debug('Sentiment analysis cache hit');
        return cached;
      }

      logger.info('Analyzing sentiment', { textLength: text.length });

      // Parallel processing: rule-based + ML approaches
      const [ruleBasedResult, mlResult] = await Promise.allSettled([
        this.ruleBasedSentiment(text),
        NLPConfig.useAdvancedModels ? this.mlSentiment(text) : null
      ]);

      // Combine results
      const combinedResult = await this.combineResults(
        ruleBasedResult,
        mlResult
      );

      // Add contextual analysis
      const contextAwareResult = await this.addContextualAnalysis(
        combinedResult,
        text,
        context
      );

      // Cache the result
      this.cache.set(cacheKey, contextAwareResult);
      
      logger.info('Sentiment analysis completed', {
        sentiment: contextAwareResult.sentiment,
        confidence: contextAwareResult.confidence
      });

      return contextAwareResult;
    } catch (error) {
      logger.error('Sentiment analysis failed', { error, text });
      throw error;
    }
  }

  @Traceable('sentiment.ruleBased')
  private async ruleBasedSentiment(text: string): Promise<SentimentResult> {
    const doc = nlp(text);
    const sentiment = doc.sentiment();

    // Analyze emotions
    const emotions = this.extractEmotions(text);
    
    // Analyze tone
    const tone = this.analyzeTone(text);
    
    // Extract aspect-based sentiment
    const aspects = this.extractAspectSentiment(text, doc);
    
    // Detect comparative sentiment
    const comparative = this.extractComparativeSentiment(text);

    const overallSentiment = this.determineOverallSentiment(sentiment, emotions, tone);
    const confidence = this.calculateConfidence(sentiment, text);

    return {
      sentiment: overallSentiment,
      confidence,
      intensity: Math.abs(sentiment.score) * 20 + 50, // Scale to 0-100
      emotions,
      tone,
      aspects,
      comparative
    };
  }

  @Traceable('sentiment.mlBased')
  private async mlSentiment(text: string): Promise<SentimentResult | null> {
    try {
      // Use Hugging Face or other ML models if available
      if (!this.hfInference) {
        logger.warn('ML inference not available, falling back to rule-based');
        return null;
      }

      const result = await this.hfInference.textClassification({
        inputs: text,
        model: 'distilbert-base-uncased-finetuned-sst-2-english'
      });

      // Transform ML result to our format
      return this.transformMlResult(result[0]);
    } catch (error) {
      logger.warn('ML sentiment analysis failed', { error });
      return null;
    }
  }

  @Traceable('sentiment.combineResults')
  private async combineResults(
    ruleBased: PromiseSettledResult<SentimentResult>,
    mlResult: PromiseSettledResult<SentimentResult | null>
  ): Promise<SentimentResult> {
    if (ruleBased.status === 'rejected') {
      throw ruleBased.reason;
    }

    const baseResult = ruleBased.value;
    
    if (mlResult.status === 'fulfilled' && mlResult.value) {
      // Ensemble approach: weight ML and rule-based results
      return this.ensembleResults(baseResult, mlResult.value);
    }

    return baseResult;
  }

  private ensembleResults(ruleBased: SentimentResult, ml: SentimentResult): SentimentResult {
    const weights = {
      rule: 0.4,
      ml: 0.6
    };

    const combined = { ...ruleBased };
    
    // Weighted average of confidences
    combined.confidence = (ruleBased.confidence * weights.rule + ml.confidence * weights.ml);
    
    // Momentum-based sentiment selection
    if (ml.confidence > 0.8 && ruleBased.confidence > 0.7) {
      if (ml.sentiment === ruleBased.sentiment) {
        combined.sentiment = ml.sentiment;
      } else {
        // Choose ML if it's significantly more confident
        combined.sentiment = ml.confidence > ruleBased.confidence + 0.1 ? ml.sentiment : ruleBased.sentiment;
      }
    }
    
    // Average of emotions and tone
    Object.keys(combined.emotions).forEach(emotion => {
      if (ml.emotions[emotion]) {
        combined.emotions[emotion] = 
          (combined.emotions[emotion] || 0) * weights.rule + 
          ml.emotions[emotion] * weights.ml;
      }
    });

    Object.keys(combined.tone).forEach(toneKey => {
      if (ml.tone[toneKey]) {
        combined.tone[toneKey] = 
          (combined.tone[toneKey] || 0) * weights.rule + 
          ml.tone[toneKey] * weights.ml;
      }
    });

    return combined;
  }

  private extractEmotions(text: string): SentimentResult['emotions'] {
    const emotions = {};
    const emotionPatterns = {
      happy: /\b(happy|excited|pleased|joyful|great|amazing|wonderful|excellent|fantastic|love|perfect|thrilled)\b/gi,
      sad: /\b((sad|disappointed|unhappy|frustrated|upset|gloomy|depressed|miserable)\b|\b(tear|cry|weep)\b)/gi,
      angry: /\b(angry|frustrated|mad|furious|irate|raging|annoyed|irritated|hostile|opposing|against)\b/gi,
      frustrated: /\b(frustrat|struggling|difficult|hard|challenge|issue|problem|broken|doesn't work|bug|error|broke|can't|unable|struggle|stuck)\b/gi,
      curious: /\b(curio|wonder|interested|intrigued|like to know|how to|what is|questions?|would like)\b/gi,
      skeptical: /\b(doubt|concern|worried|skeptical|question|uncertain|hesitant|unsure|worry|but|however|although|thought|though|concerned)\b/gi,
      excited: /\b(interest|excited|looking forward|can't wait|eager|enthusiastic|keen|ready|optimal|right|now|\bnice\b)\b/gi,
      anxious: /\b(urgent|asap|now|immediately|right away|critical|pressing|right now|deadline|soon|quickly|fast|expedite)\b/gi
    };

    Object.entries(emotionPatterns).forEach(([emotion, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        emotions[emotion] = Math.min(matches.length * 0.3, 1.0); // Normalize to 0-1 scale
      }
    });

    return emotions;
  }

  private analyzeTone(text: string): SentimentResult['tone'] {
    const tone = {
      professional: 0,
      casual: 0,
      urgent: 0,
      hesitant: 0,
      confident: 0
    };

    // Professional indicators
    if (/\b(respectively|professionally|accordingly|formal|business|proposal|solution|implementation|deployment|adoption|integration|strategic|enterprise|technology)\b/.test(text)) {
      tone.professional += 0.4;
    }

    // Casual indicators 
    if (/\b(hey|hi|hello|thanks* you|thanks|cheers|speak soon|chat|talk|catch up|quick question|quick note)\b/i.test(text)) {
      tone.casual += 0.4;
    }

    // Urgent indicators
    if (/\b(urgent|asap|deadline|immediately|right now|critical|pressing|expedite|fast|quick)\b/.test(text)) {
      tone.urgent += 0.6;
    }

    // Hesitant indicators
    if (/\b(might|maybe|perhaps|possibly|consider|thinking|wondering|could|would|interested|looking into|exploring|evaluating|need to|need|about|try|makes sense)\b/.test(text)) {
      tone.hesitant += 0.3;
    }

    // Confident indicators
    if (/\b(sure|certain|know|understand|ready|when|how|what|where|who|which|implemented|done|complete|working|great|optimal|perfect|work)\b/.test(text)) {
      tone.confident += 0.3;
    }

    return tone;
  }

  private extractAspectSentiment(text: string, doc: any): Array<{topic: string, sentiment: string, confidence: number}> {
    const aspects = [];
    
    // Extract key topics and their sentiment
    const topics = ['solution', 'service', 'product', 'price', 'integration', 'support'];
    
    topics.forEach(topic => {
      const topicDoc = nlp(text).match(`#${topic}`);
      if (topicDoc.length > 0) {
        const topicSentiment = topicDoc.sentiment();
        aspects.push({
          topic,
          sentiment: topicSentiment.score > 0 ? 'positive' : topicSentiment.score < 0 ? 'negative' : 'neutral',
          confidence: Math.min(Math.abs(topicSentiment.score) * 0.8, 1.0)
        });
      }
    });

    return aspects;
  }

  private extractComparativeSentiment(text: string): Array<{comparison: string, sentiment: string, confidence: number}> {
    const comparative = [];
    const comparativeRegex = /\b(better than|worse than|prefer|instead of|compared to|versus|vs\.?|alternative to|replace)\s+(.+?)(?=\.|\band\b|\bbut\b|\,|$)/gi;
    
    let match;
    while ((match = comparativeRegex.exec(text)) !== null) {
      const sentiment = /better|prefer/.test(match[1]) ? 'positive' : 'negative';
      comparative.push({
        comparison: match[0],
        sentiment,
        confidence: 0.8
      });
    }

    return comparative;
  }

  private async addContextualAnalysis(
    result: SentimentResult,
    text: string,
    context?: { domain?: string; previousAnalysis?: SentimentResult; relatedTexts?: string[] }
  ): Promise<SentimentResult> {
    if (!context) return result;

    // Domain-specific adjustments
    if (context.domain === 'insurance') {
      // Adjust sentiment for insurance terminology
      result = this.adjustForInsuranceDomain(result, text);
    }

    // Temporal sentiment analysis
    if (context.previousAnalysis) {
      result = await this.analyzeSentimentTrend(result, context.previousAnalysis);
    }

    return result;
  }

  private adjustForInsuranceDomain(result: SentimentResult, text: string): SentimentResult {
    const adjusted = { ...result };
    
    // Insurance domain often uses neutral/positive language even when expressing concerns
    if (/\b(rate|rates|premium|cost|expensive|budget|high|quote|pricing|cheaper)\b/i.test(text)) {
      if (adjusted.sentiment === 'negative' && adjusted.emotions.frustrated && adjusted.emotions.frustrated < 0.5) {
        adjusted.sentiment = 'neutral';
        adjusted.confidence *= 0.8;
      }
    }

    return adjusted;
  }

  private async analyzeSentimentTrend(
    current: SentimentResult,
    previous: SentimentResult
  ): Promise<SentimentResult> {
    const trend: SentimentResult = { ...current };
    
    // Analyze if sentiment is improving or declining
    if (current.sentiment !== previous.sentiment) {
      const sentimentScores = { positive: 1, neutral: 0, negative: -1 };
      const currentScore = sentimentScores[current.sentiment];
      const previousScore = sentimentScores[previous.sentiment];
      
      trend['sentimentChange'] = currentScore - previousScore;
    }

    return trend;
  }

  private determineOverallSentiment(sentiment: any, emotions: any, tone: any): 'positive' | 'negative' | 'neutral' | 'mixed' {
    if (sentiment.score === 0 && Object.values(emotions).every(e => e === 0)) {
      return 'neutral';
    }

    const positiveIndicators = ['excited', 'curious', 'happy'];
    const negativeIndicators = ['frustrated', 'angry', 'sad', 'anxious'];
    
    const positiveCount = positiveIndicators.filter(emotion => emotions[emotion] > 0.3).length;
    const negativeCount = negativeIndicators.filter(emotion => emotions[emotion] > 0.3).length;

    if (positiveCount > 0 && negativeCount > 0) {
      return 'mixed';
    }

    return sentiment.score > 0 ? 'positive' : 'negative';
  }

  private calculateConfidence(sentiment: any, text: string): number {
    let confidence = Math.min(Math.abs(sentiment.score) + 0.5, 0.95);
    
    // Increase confidence for longer, more expressive texts
    if (text.length > 50) confidence += 0.1;
    if (sentiment.negative.length > 1 || sentiment.positive.length > 1) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private getCacheKey(text: string, context?: any): string {
    const contextHash = context ? JSON.stringify(context) : '';
    const textHash = text.substring(0, 100); // Use first 100 chars for cache key
    return `sentiment:${textHash}:${contextHash}`;
  }

  private transformMlResult(mlResult: any): SentimentResult {
    // Transform Hugging Face result to our format
    const labelMap = {
      'POSITIVE': 'positive',
      'NEGATIVE': 'negative',
      'NEUTRAL': 'neutral'
    };

    return {
      sentiment: labelMap[mlResult.label] || 'neutral',
      confidence: mlResult.score || 0.5,
      intensity: Math.abs(mlResult.score) * 100,
      emotions: {},
      tone: {
        professional: 0.5,
        casual: 0.5,
        urgent: 0.5,
        hesitant: 0.5,
        confident: 0.5
      },
      aspects: [],
      comparative: []
    };
  }

  @Traceable('sentiment.batchAnalyze')
  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map(text => this.analyze(text)));
  }

  @Traceable('sentiment.realTimeAnalyze')
  async realTimeAnalyze(
    text: string,
    onProgress?: (progress: number, partialResult?: Partial<SentimentResult>) => void
  ): Promise<SentimentResult> {
    // For real-time analysis, start with quick rule-based analysis
    onProgress?.(0.2);
    
    setTimeout(() => onProgress?.(0.5), 50); // Simulate progressive analysis
    
    const result = await this.analyze(text);
    
    onProgress?.(1.0, result);
    
    return result;
  }
}