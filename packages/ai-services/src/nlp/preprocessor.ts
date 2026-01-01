import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import nlp from 'compromise';
import compromiseNumbers from 'compromise-numbers';

nlp.plugin(compromiseNumbers);

export interface PreprocessingResult {
  originalText: string;
  processedText: string;
  tokens: string[];
  sentences: string[];
  lemmas: string[];
  entities: {
    emails: string[];
    urls: string[];
    phoneNumbers: string[];
    dates: string[];
    currencies: string[];
    numbers: string[];
  };
  metadata: {
    wordCount: number;
    sentenceCount: number;
    charCount: number;
    language: string;
    readabilityScore: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  normalization: {
    lowercased: boolean;
    punctuationRemoved: boolean;
    specialCharsRemoved: boolean;
    stopWordsRemoved: boolean;
    lemmatized: boolean;
  };
}

export interface PreprocessingOptions {
  lowercase?: boolean;
  removePunctuation?: boolean;
  removeSpecialChars?: boolean;
  removeStopWords?: boolean;
  lemmatize?: boolean;
  language?: string;
  preserveEntities?: boolean;
  expandContractions?: boolean;
  correctSpelling?: boolean;
}

export class TextPreprocessor {
  private static instance: TextPreprocessor;
  private stopWords: Set<string>;
  private contractionMap: Record<string, string>;
  private readonly domainSpecificTerms: Set<string>;

  constructor() {
    this.initializeStopWords();
    this.initializeContractions();
    this.initializeDomainTerms();
  }

  static getInstance(): TextPreprocessor {
    if (!TextPreprocessor.instance) {
      TextPreprocessor.instance = new TextPreprocessor();
    }
    return TextPreprocessor.instance;
  }

  @Traceable('preprocessor.preprocess')
  async preprocess(
    text: string,
    options: PreprocessingOptions = {}
  ): Promise<PreprocessingResult> {
    try {
      logger.debug('Starting text preprocessing', { textLength: text.length });

      const normalizedText = await this.normalizeText(text, options);
      const tokens = await this.tokenize(normalizedText, options);
      const doc = nlp(normalizedText);
      
      const sentences = doc.sentences().out('array');
      const lemmas = options.lemmatize ? await this.lemmatize(tokens) : tokens;
      
      // Extract entities before further processing
      const entities = await this.extractEntities(text, options);
      
      // Apply stop word removal if requested
      const filteredTokens = options.removeStopWords 
        ? this.removeStopWords(lemmas, entities)
        : lemmas;

      // Reconstruct processed text
      const processedText = filteredTokens.join(' ');

      // Calculate metadata
      const metadata = await this.calculateMetadata(text, filteredTokens, sentences);

      const result: PreprocessingResult = {
        originalText: text,
        processedText,
        tokens: filteredTokens,
        sentences,
        lemmas,
        entities,
        metadata,
        normalization: {
          lowercased: options.lowercase ?? true,
          punctuationRemoved: options.removePunctuation ?? true,
          specialCharsRemoved: options.removeSpecialChars ?? true,
          stopWordsRemoved: options.removeStopWords ?? false,
          lemmatized: options.lemmatize ?? false
        }
      };

      logger.info('Text preprocessing completed', {
        tokens: result.tokens.length,
        entities: Object.values(result.entities).flat().length
      });

      return result;
    } catch (error) {
      logger.error('Text preprocessing failed', { error, text });
      throw error;
    }
  }

  @Traceable('preprocessor.normalizeText')
  private async normalizeText(text: string, options: PreprocessingOptions): Promise<string> {
    let normalized = text.trim();

    // Locale-specific normalization
    if (options.language === 'en') {
      normalized = await this.normalizeEnglishText(normalized, options);
    }

    // Expand contractions
    if (options.expandContractions ?? true) {
      normalized = this.expandContractions(normalized);
    }

    // Lowercase
    if (options.lowercase ?? true) {
      normalized = normalized.toLowerCase();
    }

    // Remove special characters (but preserve entities if requested)
    if (options.removeSpecialChars ?? true) {
      normalized = this.removeSpecialCharacters(normalized, options.preserveEntities ?? true);
    }

    // Remove punctuation (but preserve entities if requested)
    if (options.removePunctuation ?? true) {
      normalized = this.removePunctuation(normalized, options.preserveEntities ?? true);
    }

    // Check for domain-specific terms and preserve them
    if (options.preserveEntities) {
      normalized = this.preserveDomainTerms(normalized);
    }

    return normalized;
  }

  private async normalizeEnglishText(text: string, options: PreprocessingOptions): Promise<string> {
    // Handle common business/insurance domain patterns
    let normalized = text;

    // Preserve common abbreviations
    const abbreviations = ['e.g.', 'i.e.', 'mr.', 'mrs.', 'dr.', 'inc.', 'co.', 'ltd.', 'corp.'];
    abbreviations.forEach(abbr => {
      const pattern = new RegExp(abbr.replace('.', '\\.'), 'gi');
      const replacement = abbr.replace('.', '<DOT>');
      normalized = normalized.replace(pattern, replacement);
    });

    // Replace multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');

    // Restore abbreviations
    normalized = normalized.replace(/<DOT>/g, '.');

    return normalized;
  }

  private expandContractions(text: string): string {
    let expanded = text;
    
    Object.entries(this.contractionMap).forEach(([contraction, expansion]) => {
      const pattern = new RegExp(`\\b${contraction}\\b`, 'gi');
      expanded = expanded.replace(pattern, expansion);
    });

    return expanded;
  }

  private removeSpecialCharacters(text: string, preserveEntities: boolean): string {
    if (preserveEntities) {
      // Extract entities first, then remove special chars, then restore entities
      const entityPatterns = [
        { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, placeholder: '___EMAIL___' },
        { regex: /https?:\/\/[^\s]+/g, placeholder: '___URL___' },
        { regex: /\+?[\d\s\(\)-]{10,}/g, placeholder: '___PHONE___' },
        { regex: /\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars?)/gi, placeholder: '___CURRENCY___' },
        { regex: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/gi, placeholder: '___DATE___' }
      ];

      const entities: string[] = [];
      let processedText = text;

      entityPatterns.forEach((pattern, index) => {
        processedText = processedText.replace(pattern.regex, (match) => {
          entities.push(match);
          return `${pattern.placeholder}_${index}_${entities.length - 1}`;
        });
      });

      // Remove remaining special characters
      processedText = processedText.replace(/[^\w\s]/g, ' ');

      // Restore entities
      processedText = processedText.replace(/___(\w+)_(\d+)_(\d+)___/g, (match, type, patternIndex, entityIndex) => {
        return entities[parseInt(entityIndex)] || match;
      });

      return processedText;
    }

    return text.replace(/[^\w\s]/g, ' ');
  }

  private removePunctuation(text: string, preserveEntities: boolean): string {
    if (preserveEntities) {
      return text.replace(/([^\w\s])(?=\s|\b)(?<!\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)(?<!https?:\/\/[^\s]+)(?<!\+?[\d\s\(\)-]{10,})(?<!\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars?))(?!\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)(?!https?:\/\/[^\s]+)(?!\+?[\d\s\(\)-]{10,})(?!\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars?))/g, ' ');
    }

    return text.replace(/[^\w\s]/g, ' ');
  }

  private preserveDomainTerms(text: string): string {
    let preserved = text;
    
    this.domainSpecificTerms.forEach(term => {
      const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const placeholder = term.replace(/\s+/g, '_').toUpperCase();
      preserved = preserved.replace(pattern, placeholder);
    });

    return preserved;
  }

  @Traceable('preprocessor.tokenize')
  private async tokenize(text: string, options: PreprocessingOptions): Promise<string[]> {
    const tokens = text.trim().split(/\s+/).filter(token => token.length > 0);
    
    // Additional token processing if needed
    if (options.correctSpelling) {
      return await this.correctSpelling(tokens);
    }

    return tokens;
  }

  private async lemmatize(tokens: string[]): Promise<string[]> {
    // Return original tokens for now - could implement actual lemmatization
    return tokens;
  }

  private async correctSpelling(tokens: string[]): Promise<string[]> {
    // Basic spell checking - could be enhanced with a proper dictionary
    const corrections = {
      'recieve': 'receive',
      'teh': 'the',
      'adn': 'and',
      'becuase': 'because',
      'infromation': 'information',
      'recomend': 'recommend',
      'intrested': 'interested',
      'sevice': 'service',
      'soluton': 'solution',
      'impliment': 'implement',
      'prodcut': 'product'
    };

    return tokens.map(token => corrections[token.toLowerCase()] || token);
  }

  @Traceable('preprocessor.extractEntities')
  private async extractEntities(text: string, options: PreprocessingOptions): Promise<PreprocessingResult['entities']> {
    const entities = {
      emails: [],
      urls: [],
      phoneNumbers: [],
      dates: [],
      currencies: [],
      numbers: []
    };

    // Email extraction
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    entities.emails = text.match(emailPattern) || [];

    // URL extraction
    const urlPattern = /https?:\/\/[^\s]+/g;
    entities.urls = text.match(urlPattern) || [];

    // Phone number extraction
    const phonePattern = /\+?[\d\s\(\)-]{10,}/g;
    entities.phoneNumbers = text.match(phonePattern) || [];

    // Date extraction
    const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/gi;
    entities.dates = text.match(datePattern) || [];

    // Currency extraction
    const currencyPattern = /\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars?)/gi;
    entities.currencies = text.match(currencyPattern) || [];

    // Number extraction
    const numberPattern = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
    entities.numbers = text.match(numberPattern) || [];

    return entities;
  }

  private removeStopWords(tokens: string[], entities: PreprocessingResult['entities']): string[] {
    const entityTokens = Object.values(entities).flat().join(' ').split(/\s+/);
    const preserveSet = new Set(this.domainSpecificTerms);
    entityTokens.forEach(token => preserveSet.add(token.toLowerCase()));

    return tokens.filter(token => 
      !this.stopWords.has(token.toLowerCase()) || 
      preserveSet.has(token.toLowerCase())
    );
  }

  @Traceable('preprocessor.calculateMetadata')
  private async calculateMetadata(
    originalText: string,
    tokens: string[],
    sentences: string[]
  ): Promise<PreprocessingResult['metadata']> {
    const wordCount = tokens.length;
    const sentenceCount = sentences.length;
    const charCount = originalText.length;
    
    const readabilityScore = this.calculateReadability(wordCount, sentenceCount, charCount);
    
    let complexity: 'simple' | 'moderate' | 'complex';
    if (readabilityScore > 60) complexity = 'simple';
    else if (readabilityScore > 30) complexity = 'moderate';
    else complexity = 'complex';

    return {
      wordCount,
      sentenceCount,
      charCount,
      language: 'en', // Could implement language detection
      readabilityScore,
      complexity
    };
  }

  private calculateReadability(wordCount: number, sentenceCount: number, charCount: number): number {
    if (wordCount === 0 || sentenceCount === 0) return 0;
    
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = charCount / wordCount / 3; // Rough estimation
    
    // Simplified readability formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  private initializeStopWords(): void {
    this.stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 
      "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 
      'but', 'by', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', 
      "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 
      'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", 
      "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', 
      "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', 
      "it's", 'its', 'itself', 'just', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 
      'no', 'nor', 
      'not', 
      "n't",
      'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
      'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', 
      "shouldn't", 'so', 'some', 'such', "than", "that", 'the', 'their', 'theirs', 'them', 
      'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", 
      "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 
      'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', 
      "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 
      'while', 'who', "who's", 'whom', 'why', "why's", "won't", 'would', "wouldn't", 
      'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves'
    ]);
  }

  private initializeContractions(): void {
    this.contractionMap = {
      "i'm": "i am",
      "i've": "i have",
      "i'll": "i will",
      "i'd": "i would",
      "you're": "you are",
      "you've": "you have",
      "you'll": "you will",
      "you'd": "you would",
      "he's": "he is",
      "he'll": "he will",
      "he'd": "he would",
      "she's": "she is",
      "she'll": "she will",
      "she'd": "she would",
      "it's": "it is",
      "it'll": "it will",
      "we're": "we are",
      "we've": "we have",
      "we'll": "we will",
      "we'd": "we would",
      "they're": "they are",
      "they've": "they have",
      "they'll": "they will",
      "they'd": "they would",
      "that's": "that is",
      "that'll": "that will",
      "who's": "who is",
      "who've": "who have",
      "who'll": "who will",
      "who'd": "who would",
      "what's": "what is",
      "what've": "what have",
      "what'll": "what will",
      "what'd": "what would",
      "where's": "where is",
      "where've": "where have",
      "where'll": "where will",
      "where'd": "where would",
      "when's": "when is",
      "when've": "when have", 
      "when'll": "when will",
      "when'd": "when would",
      "why's": "why is",
      "why've": "why have",
      "why'll": "why will",
      "why'd": "why would",
      "how's": "how is",
      "how've": "how have",
      "how'll": "how will",
      "how'd": "how would",
      "let's": "let us",
      "can't": "cannot",
      "won't": "will not",
      "don't": "do not",
      "didn't": "did not",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "haven't": "have not",
      "hasn't": "has not",
      "hadn't": "had not",
      "couldn't": "could not",
      "wouldn't": "would not",
      "shouldn't": "should not",
      "mightn't": "might not",
      "mustn't": "must not"
    };
  }

  private initializeDomainTerms(): void {
    this.domainSpecificTerms = new Set([
      'salesforce', 'hubspot', 'pipedrive', 'zoho', 'freshworks', 
      'crm', 'api', 'saas', 'kpi', 'roi', 'mvp',
      'insurance', 'insurer', 'policyholder', 'underwriting', 'actuarial',
      'premium', 'deductible', 'claim', 'coverage', 'endorsement',
      'implementation', 'deployment', 'integration', 'scalable', 'migration',
      'workflow', 'automation', 'pipeline', 'orchestration', 'architecture',
      'compliance', 'regulation', 'security', 'privacy', 'gdpr', 'hipaa',
      'budget', 'pricing', 'cost', 'expense', 'investment', 'allocation'
    ]);
  }
}