import { logger } from '../logger.js';
import type {
  LanguageDetection,
  MultiLanguageAnalysis,
  MultiLanguageEntity,
  ProcessingResult,
  Language,
} from '@insurance-lead-gen/types';

/**
 * Multi-Language Processing Service
 * Handles language detection, translation, and multi-language NLP
 */
export class MultiLanguageProcessingService {
  private translationService: string;
  private languageDetectionModel: string;
  private supportedLanguages: Map<string, Language>;

  constructor(config?: {
    translationService?: string;
    languageDetectionModel?: string;
  }) {
    this.translationService = config?.translationService || 'google-translate';
    this.languageDetectionModel = config?.languageDetectionModel || 'language-detector';
    this.supportedLanguages = this._initializeSupportedLanguages();
  }

  /**
   * Detect document language
   */
  async detectLanguage(text: string): Promise<LanguageDetection> {
    try {
      logger.info('Detecting language', { textLength: text.length });

      // Simulate language detection
      const detectedLanguage = await this._runLanguageDetection(text);

      const isSupported = this.supportedLanguages.has(detectedLanguage.languageCode);

      logger.info('Language detected', {
        language: detectedLanguage.language,
        languageCode: detectedLanguage.languageCode,
        confidence: detectedLanguage.confidence,
        isSupported,
      });

      return {
        ...detectedLanguage,
        isSupported,
      };
    } catch (error) {
      logger.error('Failed to detect language', { error });
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  /**
   * Translate document to target language
   */
  async translateDocument(
    documentId: string,
    text: string,
    targetLanguage: string
  ): Promise<{ originalLanguage: string; translatedText: string; confidence: number }> {
    try {
      logger.info('Translating document', {
        documentId,
        targetLanguage,
        textLength: text.length,
      });

      // Detect source language
      const languageDetection = await this.detectLanguage(text);

      // Translate text
      const translatedText = await this._runTranslation(text, languageDetection.languageCode, targetLanguage);

      const confidence = languageDetection.confidence;

      logger.info('Document translated successfully', {
        documentId,
        originalLanguage: languageDetection.language,
        targetLanguage,
        confidence,
      });

      return {
        originalLanguage: languageDetection.language,
        translatedText,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to translate document', { error, documentId });
      throw new Error(`Document translation failed: ${error.message}`);
    }
  }

  /**
   * Analyze conversation in multiple languages
   */
  async analyzeMultiLanguageConversation(
    conversationText: string,
    targetAnalysisLanguage: string = 'en'
  ): Promise<MultiLanguageAnalysis> {
    try {
      logger.info('Analyzing multi-language conversation', {
        textLength: conversationText.length,
        targetAnalysisLanguage,
      });

      // Detect language
      const languageDetection = await this.detectLanguage(conversationText);

      // Translate if needed
      let translatedText = conversationText;
      let originalLanguage = languageDetection.language;

      if (languageDetection.languageCode !== targetAnalysisLanguage) {
        const translationResult = await this.translateDocument(
          'conversation',
          conversationText,
          targetAnalysisLanguage
        );
        translatedText = translationResult.translatedText;
      }

      // Simulate entity extraction
      const entities = await this._extractEntitiesMultiLanguage(conversationText, languageDetection.languageCode);

      // Simulate intent detection
      const intent = await this._detectIntentMultiLanguage(translatedText);

      // Simulate sentiment analysis
      const sentiment = await this._analyzeSentimentMultiLanguage(translatedText);

      const confidence = languageDetection.confidence;

      logger.info('Multi-language conversation analysis completed', {
        originalLanguage,
        targetAnalysisLanguage,
        entityCount: entities.length,
        intent: intent?.intent,
        sentiment: sentiment?.sentiment,
        confidence,
      });

      return {
        originalLanguage,
        translatedText: languageDetection.languageCode !== targetAnalysisLanguage ? translatedText : undefined,
        entities,
        intent,
        sentiment,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to analyze multi-language conversation', { error });
      throw new Error(`Multi-language conversation analysis failed: ${error.message}`);
    }
  }

  /**
   * Extract entities in multiple languages
   */
  async extractEntitiesMultiLanguage(
    documentText: string,
    language: string
  ): Promise<MultiLanguageEntity[]> {
    try {
      logger.info('Extracting entities in multiple languages', {
        textLength: documentText.length,
        language,
      });

      // Simulate multi-language entity extraction
      const entities = await this._runMultiLanguageEntityExtraction(documentText, language);

      logger.info('Multi-language entities extracted', {
        language,
        entityCount: entities.length,
      });

      return entities;
    } catch (error) {
      logger.error('Failed to extract entities in multiple languages', {
        error,
        language,
      });
      throw new Error(`Multi-language entity extraction failed: ${error.message}`);
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<Language[]> {
    try {
      logger.debug('Getting supported languages');

      const languages = Array.from(this.supportedLanguages.values());

      logger.debug('Supported languages retrieved', { count: languages.length });

      return languages;
    } catch (error) {
      logger.error('Failed to get supported languages', { error });
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }

  /**
   * Process document in original language
   */
  async processInOriginalLanguage(documentId: string, text: string): Promise<ProcessingResult> {
    try {
      logger.info('Processing document in original language', {
        documentId,
        textLength: text.length,
      });

      // Detect language
      const languageDetection = await this.detectLanguage(text);

      // Extract entities in original language
      const entities = await this.extractEntitiesMultiLanguage(text, languageDetection.languageCode);

      // Simulate classification
      const classification = await this._classifyDocumentMultiLanguage(text, languageDetection.languageCode);

      // Simulate validation
      const validation = {
        documentId,
        overallScore: 0.85 + Math.random() * 0.14,
        readabilityScore: 0.8 + Math.random() * 0.19,
        completenessScore: 0.85 + Math.random() * 0.14,
        validationScore: 0.9 + Math.random() * 0.09,
        recommendation: 'accept' as const,
        issues: [],
      };

      const success = languageDetection.isSupported && entities.length > 0;

      logger.info('Document processed in original language', {
        documentId,
        originalLanguage: languageDetection.language,
        entityCount: entities.length,
        success,
      });

      return {
        documentId,
        originalLanguage: languageDetection.language,
        processedLanguage: languageDetection.language,
        entities,
        classification,
        validation,
        success,
      };
    } catch (error) {
      logger.error('Failed to process document in original language', {
        error,
        documentId,
      });
      throw new Error(`Document processing in original language failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private _initializeSupportedLanguages(): Map<string, Language> {
    const languages = new Map<string, Language>();

    languages.set('en', {
      code: 'en',
      name: 'English',
      isSupported: true,
      features: ['entity_extraction', 'intent_detection', 'sentiment_analysis', 'summarization'],
    });

    languages.set('es', {
      code: 'es',
      name: 'Spanish',
      isSupported: true,
      features: ['entity_extraction', 'intent_detection', 'sentiment_analysis', 'summarization'],
    });

    languages.set('zh', {
      code: 'zh',
      name: 'Mandarin Chinese',
      isSupported: true,
      features: ['entity_extraction', 'intent_detection', 'sentiment_analysis', 'summarization'],
    });

    languages.set('vi', {
      code: 'vi',
      name: 'Vietnamese',
      isSupported: true,
      features: ['entity_extraction', 'intent_detection', 'sentiment_analysis'],
    });

    languages.set('ko', {
      code: 'ko',
      name: 'Korean',
      isSupported: true,
      features: ['entity_extraction', 'intent_detection', 'sentiment_analysis'],
    });

    languages.set('fr', {
      code: 'fr',
      name: 'French',
      isSupported: false,
      features: [],
    });

    languages.set('de', {
      code: 'de',
      name: 'German',
      isSupported: false,
      features: [],
    });

    languages.set('ja', {
      code: 'ja',
      name: 'Japanese',
      isSupported: false,
      features: [],
    });

    return languages;
  }

  private async _runLanguageDetection(text: string): Promise<
    Pick<LanguageDetection, 'language' | 'languageCode' | 'confidence'>
  > {
    // Simulate language detection
    // In production, use actual language detection libraries (langdetect, franc, etc.)

    const languagePatterns: Record<string, { code: string; name: string; pattern: RegExp }> = {
      spanish: { code: 'es', name: 'Spanish', pattern: /[ñáéíóúü¿¡]/gi },
      chinese: { code: 'zh', name: 'Mandarin Chinese', pattern: /[\u4e00-\u9fff]/g },
      vietnamese: { code: 'vi', name: 'Vietnamese', pattern: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi },
      korean: { code: 'ko', name: 'Korean', pattern: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g },
      french: { code: 'fr', name: 'French', pattern: /[àâäéèêëïîôùûüÿçœæ]/gi },
      german: { code: 'de', name: 'German', pattern: /[äöüß]/gi },
      japanese: { code: 'ja', name: 'Japanese', pattern: /[\u3040-\u309f\u30a0-\u30ff]/g },
    };

    let detectedLanguage = { code: 'en', name: 'English', pattern: /./ };

    for (const [lang, data] of Object.entries(languagePatterns)) {
      const matches = text.match(data.pattern);
      if (matches && matches.length > 0) {
        // If multiple languages detected, pick the one with most matches
        const englishMatches = (text.match(/[a-zA-Z]/g) || []).length;
        const otherMatches = matches.length;

        if (otherMatches > englishMatches * 0.3) {
          detectedLanguage = data;
          break;
        }
      }
    }

    return {
      language: detectedLanguage.name,
      languageCode: detectedLanguage.code,
      confidence: 0.85 + Math.random() * 0.14,
    };
  }

  private async _runTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    // Simulate translation
    // In production, use Google Translate, AWS Translate, or DeepL

    if (sourceLanguage === targetLanguage) {
      return text;
    }

    logger.debug('Translating text', {
      sourceLanguage,
      targetLanguage,
      textLength: text.length,
    });

    // Simulate translation by returning text with language indicator
    return `[Translated from ${sourceLanguage} to ${targetLanguage}]: ${text}`;
  }

  private async _extractEntitiesMultiLanguage(
    text: string,
    languageCode: string
  ): Promise<MultiLanguageEntity[]> {
    // Simulate multi-language entity extraction
    const entities: MultiLanguageEntity[] = [];

    // Language-specific patterns
    const patterns: Record<string, Record<string, RegExp>> = {
      en: {
        name: /(?:name|insured|policyholder)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        amount: /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      },
      es: {
        name: /(?:nombre|asegurado)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        amount: /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      },
      zh: {
        name: /(?:姓名|被保险人)[:\s]+([\u4e00-\u9fff]+)/g,
        amount: /(?:金额|费用)[:\s]+(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      },
      vi: {
        name: /(?:tên|người được bảo hiểm)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        amount: /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      },
      ko: {
        name: /(?:이름|피보험자)[:\s]+([\uac00-\ud7af]+)/g,
        amount: /(?:금액|비용)[:\s]+(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      },
    };

    const languagePatterns = patterns[languageCode] || patterns['en'];

    // Extract name entities
    const nameMatches = text.matchAll(languagePatterns.name);
    for (const match of nameMatches) {
      const entityName = this._mapEntityName('name', languageCode);
      entities.push({
        entityValue: match[1],
        entityType: entityName,
        language: languageCode,
        confidence: 0.80 + Math.random() * 0.19,
      });
    }

    // Extract amount entities
    const amountMatches = text.matchAll(languagePatterns.amount);
    for (const match of amountMatches) {
      entities.push({
        entityValue: match[1],
        entityType: 'financial_premium',
        language: languageCode,
        confidence: 0.85 + Math.random() * 0.14,
      });
    }

    return entities.slice(0, 10);
  }

  private _mapEntityName(name: string, languageCode: string): string {
    // Map entity names to standard entity types
    const entityMap: Record<string, Record<string, string>> = {
      en: { name: 'party_insured' },
      es: { name: 'party_insured' },
      zh: { name: 'party_insured' },
      vi: { name: 'party_insured' },
      ko: { name: 'party_insured' },
    };

    return entityMap[languageCode]?.[name] || 'party_insured';
  }

  private async _detectIntentMultiLanguage(
    translatedText: string
  ): Promise<{ intent: string; confidence: number } | undefined> {
    // Simulate intent detection
    // In production, use actual intent detection model

    const intentPatterns: Record<string, RegExp> = {
      quote_request: /(?:quote|quote request|get a quote)/i,
      policy_inquiry: /(?:policy|coverage|insurance)/i,
      claim: /(?:claim|report|accident|damage)/i,
      billing: /(?:bill|payment|premium|cost)/i,
    };

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(translatedText)) {
        return {
          intent,
          confidence: 0.80 + Math.random() * 0.19,
        };
      }
    }

    return undefined;
  }

  private async _analyzeSentimentMultiLanguage(
    translatedText: string
  ): Promise<{ sentiment: string; score: number; confidence: number } | undefined> {
    // Simulate sentiment analysis
    // In production, use actual sentiment analysis model

    const positiveWords = ['good', 'great', 'happy', 'satisfied', 'thank', 'excellent'];
    const negativeWords = ['bad', 'angry', 'frustrated', 'disappointed', 'terrible'];

    const lowerText = translatedText.toLowerCase();
    const positiveCount = positiveWords.filter((w) => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lowerText.includes(w)).length;

    if (positiveCount === 0 && negativeCount === 0) {
      return undefined;
    }

    const score = (positiveCount - negativeCount) / (positiveCount + negativeCount);
    const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';

    return {
      sentiment,
      score: Math.max(-1, Math.min(1, score)),
      confidence: 0.80 + Math.random() * 0.19,
    };
  }

  private async _classifyDocumentMultiLanguage(
    text: string,
    languageCode: string
  ): Promise<{ documentType: string; documentClass: string; confidence: number }> {
    // Simulate document classification
    // In production, use actual ML model

    const lowerText = text.toLowerCase();

    let documentType = 'other';
    let documentClass = 'supporting_document';

    if (lowerText.includes('policy') || lowerText.includes('insurance')) {
      documentType = 'policy_auto';
      documentClass = 'insurance_policy';
    } else if (lowerText.includes('claim')) {
      documentType = 'claim_form';
      documentClass = 'claim_documentation';
    } else if (lowerText.includes('estimate')) {
      documentType = 'repair_estimate';
      documentClass = 'estimate';
    }

    return {
      documentType,
      documentClass,
      confidence: 0.85 + Math.random() * 0.14,
    };
  }
}
