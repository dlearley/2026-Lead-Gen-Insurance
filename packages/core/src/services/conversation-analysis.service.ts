import { logger } from '../logger.js';
import type {
  Transcription,
  ConversationAnalysis,
  IntentDetection,
  SentimentAnalysis,
  EmotionDetection,
  Topic,
  ActionItem,
  EscalationFlag,
  SpeakerSegment,
} from '@insurance-lead-gen/types';

/**
 * Conversation Analysis Service
 * Handles transcription, intent detection, sentiment analysis, and emotion detection
 */
export class ConversationAnalysisService {
  private transcriptionService: string;
  private intentModel: string;
  private sentimentModel: string;
  private emotionModel: string;

  constructor(config?: {
    transcriptionService?: string;
    intentModel?: string;
    sentimentModel?: string;
    emotionModel?: string;
  }) {
    this.transcriptionService = config?.transcriptionService || 'speech-to-text';
    this.intentModel = config?.intentModel || 'intent-classifier';
    this.sentimentModel = config?.sentimentModel || 'sentiment-analyzer';
    this.emotionModel = config?.emotionModel || 'emotion-detector';
  }

  /**
   * Transcribe conversation (speech-to-text)
   */
  async transcribeConversation(
    audioPath: string,
    options?: { language?: string; enableDiarization?: boolean }
  ): Promise<Transcription> {
    const startTime = Date.now();

    try {
      logger.info('Transcribing conversation', { audioPath, options });

      // Simulate transcription (in production, use Google Speech-to-Text, AWS Transcribe, or Deepgram)
      const text = await this._runSpeechToText(audioPath, options?.language);
      const confidence = 0.92 + Math.random() * 0.07;

      let speakerDiarization: SpeakerSegment[] | undefined;
      if (options?.enableDiarization) {
        speakerDiarization = await this._performSpeakerDiarization(text);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Conversation transcribed successfully', {
        audioPath,
        confidence,
        processingTime,
      });

      return {
        conversationId: this._generateConversationId(audioPath),
        text,
        confidence,
        language: options?.language || 'en',
        processingTime,
        speakerDiarization,
      };
    } catch (error) {
      logger.error('Failed to transcribe conversation', { error, audioPath });
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Analyze conversation comprehensively
   */
  async analyzeConversation(conversationId: string, text: string): Promise<ConversationAnalysis> {
    const startTime = Date.now();

    try {
      logger.info('Analyzing conversation', {
        conversationId,
        textLength: text.length,
      });

      // Run all analyses in parallel
      const [intentResult, sentimentResult, emotionResult, topicsResult, keyPhrasesResult] =
        await Promise.all([
          this.detectIntent(text),
          this.analyzeSentiment(text),
          this.detectEmotions(text),
          this.extractTopics(text),
          this._extractKeyPhrases(text),
        ]);

      // Identify issues raised
      const issuesRaised = this._identifyIssues(text, sentimentResult);

      // Check for escalation
      const escalationFlag = this._checkEscalation(sentimentResult, emotionResult, issuesRaised);

      const processingTime = Date.now() - startTime;

      logger.info('Conversation analysis completed', {
        conversationId,
        primaryIntent: intentResult.primaryIntent,
        sentiment: sentimentResult.sentiment,
        escalation: escalationFlag.isEscalation,
        processingTime,
      });

      return {
        id: `analysis_${conversationId}`,
        conversationId,
        primaryIntent: intentResult.primaryIntent,
        secondaryIntents: intentResult.secondaryIntents,
        overallSentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        emotionDetected: emotionResult.emotions,
        customerSatisfactionScore: this._calculateSatisfactionScore(sentimentResult, emotionResult),
        topicsDiscussed: topicsResult.map((t) => t.name),
        keyPhrases: keyPhrasesResult,
        issuesRaised: issuesRaised.map((i) => i),
        escalationFlag: escalationFlag.isEscalation,
        escalationReason: escalationFlag.reason,
      };
    } catch (error) {
      logger.error('Failed to analyze conversation', { error, conversationId });
      throw new Error(`Conversation analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect customer intent
   */
  async detectIntent(text: string): Promise<IntentDetection> {
    const startTime = Date.now();

    try {
      logger.debug('Detecting intent', { textLength: text.length });

      // Simulate intent detection (in production, use trained classifier)
      const intentResult = await this._runIntentModel(text);

      const processingTime = Date.now() - startTime;

      logger.debug('Intent detected', {
        primaryIntent: intentResult.primaryIntent,
        confidence: intentResult.confidence,
        processingTime,
      });

      return {
        ...intentResult,
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to detect intent', { error });
      throw new Error(`Intent detection failed: ${error.message}`);
    }
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const startTime = Date.now();

    try {
      logger.debug('Analyzing sentiment', { textLength: text.length });

      // Simulate sentiment analysis (in production, use trained model)
      const sentimentResult = await this._runSentimentModel(text);

      const processingTime = Date.now() - startTime;

      logger.debug('Sentiment analyzed', {
        sentiment: sentimentResult.sentiment,
        score: sentimentResult.score,
        processingTime,
      });

      return {
        ...sentimentResult,
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to analyze sentiment', { error });
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect emotions
   */
  async detectEmotions(text: string): Promise<EmotionDetection> {
    const startTime = Date.now();

    try {
      logger.debug('Detecting emotions', { textLength: text.length });

      // Simulate emotion detection (in production, use trained model)
      const emotionResult = await this._runEmotionModel(text);

      const processingTime = Date.now() - startTime;

      logger.debug('Emotions detected', {
        primaryEmotion: emotionResult.primaryEmotion,
        confidence: emotionResult.confidence,
        processingTime,
      });

      return {
        ...emotionResult,
      };
    } catch (error) {
      logger.error('Failed to detect emotions', { error });
      throw new Error(`Emotion detection failed: ${error.message}`);
    }
  }

  /**
   * Extract topics from conversation
   */
  async extractTopics(text: string): Promise<Topic[]> {
    try {
      logger.debug('Extracting topics', { textLength: text.length });

      // Simulate topic extraction (in production, use LDA or neural topic modeling)
      const topics = await this._runTopicModel(text);

      logger.debug('Topics extracted', { topicCount: topics.length });

      return topics;
    } catch (error) {
      logger.error('Failed to extract topics', { error });
      throw new Error(`Topic extraction failed: ${error.message}`);
    }
  }

  /**
   * Identify action items in conversation
   */
  async identifyActionItems(text: string): Promise<ActionItem[]> {
    try {
      logger.debug('Identifying action items', { textLength: text.length });

      // Simulate action item extraction
      const actionItems = await this._extractActionItems(text);

      logger.debug('Action items identified', { count: actionItems.length });

      return actionItems;
    } catch (error) {
      logger.error('Failed to identify action items', { error });
      throw new Error(`Action item identification failed: ${error.message}`);
    }
  }

  /**
   * Flag escalations based on sentiment and emotions
   */
  async flagEscalations(conversationId: string, text: string): Promise<EscalationFlag[]> {
    try {
      logger.info('Flagging escalations', { conversationId });

      const [sentiment, emotions] = await Promise.all([
        this.analyzeSentiment(text),
        this.detectEmotions(text),
      ]);

      const issues = this._identifyIssues(text, sentiment);
      const escalation = this._checkEscalation(sentiment, emotions, issues);

      logger.info('Escalation flags generated', {
        conversationId,
        isEscalation: escalation.isEscalation,
      });

      return [
        {
          conversationId,
          ...escalation,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
        },
      ];
    } catch (error) {
      logger.error('Failed to flag escalations', { error, conversationId });
      throw new Error(`Escalation flagging failed: ${error.message}`);
    }
  }

  // ========================================
  // Private ML Model Methods
  // ========================================

  private async _runSpeechToText(audioPath: string, language?: string): Promise<string> {
    // Simulate speech-to-text processing
    // In production, this would use Google Speech-to-Text, AWS Transcribe, or Deepgram

    const sampleConversations = [
      "Hello, I'm calling about my auto insurance policy. I'd like to get a quote for additional coverage.",
      "I need to report a claim. I had an accident yesterday and my car was damaged.",
      "I have a question about my billing. Why was my premium increased this month?",
      "I'm very frustrated with your service. I've been waiting for my claim to be processed for weeks!",
      "I'd like to upgrade my home insurance policy. Can you tell me about the available options?",
    ];

    return sampleConversations[Math.floor(Math.random() * sampleConversations.length)];
  }

  private async _performSpeakerDiarization(text: string): Promise<SpeakerSegment[]> {
    // Simulate speaker diarization
    const sentences = text.split(/(?<=[.!?])\s+/);
    const segments: SpeakerSegment[] = [];

    sentences.forEach((sentence, index) => {
      segments.push({
        speaker: index % 2 === 0 ? 'customer' : 'agent',
        startTime: index * 5,
        endTime: (index + 1) * 5,
        text: sentence,
      });
    });

    return segments;
  }

  private async _runIntentModel(
    text: string
  ): Promise<Pick<IntentDetection, 'primaryIntent' | 'confidence' | 'secondaryIntents'>> {
    // Simulate intent detection model
    const lowerText = text.toLowerCase();

    const intentMap: Record<string, { intent: IntentDetection['primaryIntent'] }> = {
      quote: { intent: 'quote_request' },
      policy: { intent: 'policy_inquiry' },
      claim: { intent: 'claims_submission' },
      claim_status: { intent: 'claims_status' },
      billing: { intent: 'billing_payment_question' },
      payment: { intent: 'billing_payment_question' },
      coverage: { intent: 'coverage_verification' },
      complain: { intent: 'complaint_escalation' },
      frustrated: { intent: 'complaint_escalation' },
      document: { intent: 'document_request' },
      cancel: { intent: 'cancellation_non_renewal' },
      upgrade: { intent: 'product_upgrade' },
    };

    let primaryIntent: IntentDetection['primaryIntent'] = 'other';
    let maxScore = 0;

    for (const [keyword, { intent }] of Object.entries(intentMap)) {
      const score = (text.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    }

    return {
      primaryIntent,
      confidence: 0.80 + Math.random() * 0.19,
      secondaryIntents: maxScore > 0
        ? [
            {
              intent: 'other',
              confidence: 0.3 + Math.random() * 0.2,
            },
          ]
        : undefined,
    };
  }

  private async _runSentimentModel(
    text: string
  ): Promise<Pick<SentimentAnalysis, 'sentiment' | 'score' | 'confidence' | 'emotions'>> {
    // Simulate sentiment analysis model
    const lowerText = text.toLowerCase();

    const positiveWords = ['thank', 'good', 'great', 'happy', 'satisfied', 'please', 'appreciate'];
    const negativeWords = ['frustrat', 'angry', 'terrible', 'hate', 'worst', 'disappointed', 'unhappy'];

    const positiveScore = positiveWords.filter((w) => lowerText.includes(w)).length;
    const negativeScore = negativeWords.filter((w) => lowerText.includes(w)).length;

    let sentiment: SentimentAnalysis['sentiment'];
    let score: number;

    if (negativeScore >= 2) {
      sentiment = negativeScore >= 3 ? 'very_negative' : 'negative';
      score = -0.5 - (negativeScore * 0.15);
    } else if (positiveScore >= 2) {
      sentiment = 'positive';
      score = 0.5 + (positiveScore * 0.15);
    } else {
      sentiment = 'neutral';
      score = (Math.random() - 0.5) * 0.3;
    }

    // Clamp score between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    const emotions: SentimentAnalysis['emotions'] = {
      anger: sentiment === 'negative' || sentiment === 'very_negative' ? 0.6 + Math.random() * 0.3 : Math.random() * 0.2,
      frustration: sentiment === 'negative' ? 0.5 + Math.random() * 0.3 : Math.random() * 0.3,
      confusion: Math.random() * 0.4,
      satisfaction: sentiment === 'positive' ? 0.7 + Math.random() * 0.2 : Math.random() * 0.3,
      gratitude: sentiment === 'positive' ? 0.5 + Math.random() * 0.3 : Math.random() * 0.2,
      concern: Math.random() * 0.5,
    };

    return {
      sentiment,
      score,
      confidence: 0.82 + Math.random() * 0.17,
      emotions,
    };
  }

  private async _runEmotionModel(text: string): Promise<Pick<EmotionDetection, 'primaryEmotion' | 'emotions' | 'confidence'>> {
    // Simulate emotion detection model
    const lowerText = text.toLowerCase();

    const emotions = {
      anger: lowerText.includes('angry') || lowerText.includes('furious') ? 0.7 + Math.random() * 0.2 : Math.random() * 0.3,
      frustration: lowerText.includes('frustrat') ? 0.7 + Math.random() * 0.2 : Math.random() * 0.4,
      confusion: lowerText.includes('confus') ? 0.6 + Math.random() * 0.3 : Math.random() * 0.3,
      satisfaction: lowerText.includes('satisfi') || lowerText.includes('happy') ? 0.7 + Math.random() * 0.2 : Math.random() * 0.3,
      gratitude: lowerText.includes('thank') || lowerText.includes('appreciate') ? 0.7 + Math.random() * 0.2 : Math.random() * 0.2,
      concern: lowerText.includes('concern') || lowerText.includes('worry') ? 0.6 + Math.random() * 0.3 : Math.random() * 0.3,
      disappointment: lowerText.includes('disappoint') ? 0.6 + Math.random() * 0.3 : Math.random() * 0.2,
      relief: lowerText.includes('relief') || lowerText.includes('glad') ? 0.6 + Math.random() * 0.3 : Math.random() * 0.2,
    };

    const primaryEmotion = Object.entries(emotions).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    return {
      primaryEmotion,
      emotions,
      confidence: 0.75 + Math.random() * 0.24,
    };
  }

  private async _runTopicModel(text: string): Promise<Topic[]> {
    // Simulate topic extraction
    const keywords = [
      'coverage',
      'premium',
      'claim',
      'policy',
      'deductible',
      'payment',
      'billing',
      'accident',
      'vehicle',
      'home',
    ];

    const topics: Topic[] = [];

    keywords.forEach((keyword) => {
      const count = (text.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        topics.push({
          name: keyword,
          confidence: Math.min(0.95, 0.5 + count * 0.1),
          keywords: [keyword],
        });
      }
    });

    return topics.slice(0, 5);
  }

  private async _extractKeyPhrases(text: string): Promise<string[]> {
    // Simulate key phrase extraction
    const sentences = text.split(/[.!?]/);
    const keyPhrases: string[] = [];

    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length >= 3 && words.length <= 10) {
        keyPhrases.push(sentence.trim());
      }
    });

    return keyPhrases.slice(0, 10);
  }

  private async _extractActionItems(text: string): Promise<ActionItem[]> {
    // Simulate action item extraction
    const actionItems: ActionItem[] = [];

    const actionPatterns = [
      { pattern: /(?:I need|need to|please|can you)\s+(?:send|email|provide|give)\s+(.+?)(?:\.|$)/gi, priority: 'medium' as const },
      { pattern: /(?:call|contact|reach out to)\s+(.+?)(?:\.|$)/gi, priority: 'low' as const },
      { pattern: /(?:urgent|asap|immediately)\s+(.+?)(?:\.|$)/gi, priority: 'urgent' as const },
    ];

    actionPatterns.forEach(({ pattern, priority }) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        actionItems.push({
          id: `action_${Math.random().toString(36).substring(7)}`,
          description: match[0],
          priority,
          status: 'open',
        });
      }
    });

    return actionItems.slice(0, 5);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private _identifyIssues(text: string, sentiment: SentimentAnalysis): string[] {
    const issues: string[] = [];

    if (sentiment.sentiment === 'negative' || sentiment.sentiment === 'very_negative') {
      if (sentiment.emotions?.anger && sentiment.emotions.anger > 0.5) {
        issues.push('Customer is angry');
      }
      if (sentiment.emotions?.frustration && sentiment.emotions.frustration > 0.5) {
        issues.push('Customer is frustrated');
      }
      if (sentiment.emotions?.confusion && sentiment.emotions.confusion > 0.5) {
        issues.push('Customer is confused');
      }
    }

    if (text.toLowerCase().includes('wait') || text.toLowerCase().includes('delay')) {
      issues.push('Customer experienced delays');
    }

    if (text.toLowerCase().includes('expensive') || text.toLowerCase().includes('cost too much')) {
      issues.push('Price concern');
    }

    return issues;
  }

  private _checkEscalation(sentiment: SentimentAnalysis, emotions: EmotionDetection, issues: string[]): EscalationFlag {
    let isEscalation = false;
    let reason: string | undefined;
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';

    // Very negative sentiment with high anger
    if (sentiment.sentiment === 'very_negative' && sentiment.score < -0.7) {
      isEscalation = true;
      reason = 'Customer is very dissatisfied and highly emotional';
      severity = emotions.emotions.anger > 0.7 ? 'critical' : 'high';
    }

    // High anger or frustration
    if (emotions.emotions.anger > 0.6 || emotions.emotions.frustration > 0.6) {
      isEscalation = true;
      if (!reason) reason = 'Customer showing strong negative emotions';
      severity = 'high';
    }

    // Multiple issues raised
    if (issues.length >= 3) {
      isEscalation = true;
      if (!reason) reason = 'Customer raised multiple concerns';
      severity = 'medium';
    }

    return {
      conversationId: '',
      isEscalation,
      reason,
      severity,
    };
  }

  private _calculateSatisfactionScore(sentiment: SentimentAnalysis, emotions: EmotionDetection): number {
    // Calculate satisfaction score (0-10)
    let score = 5;

    if (sentiment.sentiment === 'positive') {
      score += sentiment.score * 5;
    } else if (sentiment.sentiment === 'negative') {
      score += sentiment.score * 5;
    }

    if (emotions.emotions.satisfaction) {
      score += emotions.emotions.satisfaction * 2;
    }

    if (emotions.emotions.gratitude) {
      score += emotions.emotions.gratitude * 1.5;
    }

    if (emotions.emotions.anger) {
      score -= emotions.emotions.anger * 2;
    }

    if (emotions.emotions.frustration) {
      score -= emotions.emotions.frustration * 1.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  private _generateConversationId(audioPath: string): string {
    return `conv_${Buffer.from(audioPath).toString('base64').substring(0, 16)}`;
  }
}
