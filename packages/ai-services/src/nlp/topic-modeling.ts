import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import { Document, KMeans, LDAModel } from '../nlp/ml-models';
import { NLPConfig } from '../../config/nlp.config';

export interface TopicModelingResult {
  topics: Array<{
    id: string;
    name: string;
    keywords: Array<{
      word: string;
      score: number;
    }>;
    importance: number;
    documentCount: number;
    coherence: number;
    representativeDocuments: string[];
  }>;
  documentTopics: Array<{
    documentId: string;
    topics: Array<{
      topicId: string;
      probability: number;
    }>;
  }>;
  coherence: number;
  perplexity: number;
  modelMetadata: {
    numTopics: number;
    alpha: number;
    beta: number;
    iterations: number;
    algorithm: string;
  };
}

export class TopicModeler {
  private static instance: TopicModeler;
  private ldaModel: LDAModel;
  private stopWords: Set<string>;

  constructor() {
    this.ldaModel = new LDAModel();
    this.stopWords = this.initializeStopWords();
  }

  static getInstance(): TopicModeler {
    if (!TopicModeler.instance) {
      TopicModeler.instance = new TopicModeler();
    }
    return TopicModeler.instance;
  }

  @Traceable('topicModeling.analyze')
  async analyze(
    documents: string[],
    options?: {
      numTopics?: number;
      alpha?: number;
      beta?: number;
      maxIterations?: number;
    }
  ): Promise<TopicModelingResult> {
    try {
      logger.info('Starting topic modeling', { documentCount: documents.length });
      
      const numTopics = options?.numTopics || Math.min(8, Math.floor(Math.sqrt(documents.length)));
      const maxIterations = options?.maxIterations || 50;
      
      // Preprocess documents
      const processedDocs = documents.map(doc => this.preprocessDocument(doc));
      
      // Use LDA for topic modeling
      const topics = await this.ldaModel.fit(
        processedDocs,
        numTopics,
        maxIterations
      );
      
      // Calculate document-topic distributions
      const documentTopics = await this.calculateDocumentTopics(processedDocs, topics);
      
      // Calculate model quality metrics
      const coherence = await this.calculateCoherence(topics, processedDocs);
      const perplexity = await this.calculatePerplexity(topics, documentTopics);
      
      const result: TopicModelingResult = {
        topics: topics.map((topic, index) => ({
          ...topic,
          importance: topic.keywords.reduce((sum, kw) => sum + kw.score, 0) / Math.max(topic.keywords.length, 1),
          documentCount: this.countTopicDocuments(topic.id, documentTopics),
          coherence: this.calculateTopicCoherence(topic.keywords, processedDocs),
          representativeDocuments: this.findRepresentativeDocuments(topic.id, processedDocs, documentTopics)
        })),
        documentTopics,
        coherence,
        perplexity,
        modelMetadata: {
          numTopics,
          alpha: options?.alpha || 0.1,
          beta: options?.beta || 0.01,
          iterations: maxIterations,
          algorithm: 'LDA'
        }
      };
      
      logger.info('Topic modeling completed', {
        numTopics: result.topics.length,
        coherence,
        avgKeywords: result.topics.reduce((sum, t) => sum + t.keywords.length, 0) / result.topics.length
      });
      
      return result;
      
    } catch (error) {
      logger.error('Topic modeling failed', { error, documentCount: documents.length });
      throw error;
    }
  }

  private preprocessDocument(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word))
      .join(' ');
  }

  private initializeStopWords(): Set<string> {
    return new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were',
      'been', 'be', 'to', 'of', 'in', 'for', 'with', 'that', 'this', 'these', 'those',
      'by', 'from', 'or', 'but', 'if', 'then', 'than', 'so', 'yet', 'nor', 'once',
      'when', 'while', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
  }

  private calculateDocumentTopics(
    documents: string[],
    topics: Array<{id: string; keywords: Array<{word: string; score: number}>}>
  ): TopicModelingResult['documentTopics'] {
    return documents.map((doc, index) => {
      const docTokens = new Set(doc.toLowerCase().split(/\s+/));
      
      const topicProbabilities = topics.map(topic => {
        const topicWords = new Set(topic.keywords.map(kw => kw.word.toLowerCase()));
        const overlap = Array.from(topicWords).filter(word => docTokens.has(word)).length;
        
        return {
          topicId: topic.id,
          probability: overlap / Math.max(topicWords.size, 1)
        };
      });
      
      return {
        documentId: `doc_${index}`,
        topics: topicProbabilities.sort((a, b) => b.probability - a.probability)
      };
    });
  }

  private countTopicDocuments(topicId: string, documentTopics: TopicModelingResult['documentTopics']): number {
    return documentTopics.filter(doc => 
      doc.topics[0]?.topicId === topicId
    ).length;
  }

  private calculateTopicCoherence(
    keywords: Array<{word: string; score: number}>,
    documents: string[]
  ): number {
    if (keywords.length < 2) return 0.5;
    
    const coOccurrences = this.calculateCoOccurrences(keywords, documents);
    return Math.min(coOccurrences, 1.0);
  }

  private calculateCoOccurrences(
    keywords: Array<{word: string; score: number}>,
    documents: string[]
  ): number {
    const topWords = keywords.slice(0, 5).map(kw => kw.word.toLowerCase());
    let coOccurrenceScore = 0;
    
    documents.forEach(doc => {
      const docLower = doc.toLowerCase();
      const presentWords = topWords.filter(word => docLower.includes(word));
      if (presentWords.length > 1) {
        coOccurrenceScore += 1;
      }
    });
    
    return documents.length > 0 ? coOccurrenceScore / documents.length : 0;
  }

  private findRepresentativeDocuments(
    topicId: string,
    documents: string[],
    documentTopics: TopicModelingResult['documentTopics']
  ): string[] {
    const representative = documentTopics
      .map((doc, index) => ({
        doc: documents[index],
        probability: doc.topics.find(t => t.topicId === topicId)?.probability || 0
      }))
      .filter(item => item.probability > 0.3)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)
      .map(item => item.doc);
    
    return representative;
  }

  private async calculateCoherence(
    topics: Array<{id: string; keywords: Array<{word: string; score: number}>}>,
    documents: string[]
  ): Promise<number> {
    const coherenceScores = topics.map(topic => 
      this.calculateTopicCoherence(topic.keywords, documents)
    );
    
    return coherenceScores.reduce((sum, score) => sum + score, 0) / Math.max(coherenceScores.length, 1);
  }

  private async calculatePerplexity(
    topics: Array<{id: string; keywords: Array<{word: string; score: number}>}>,
    documentTopics: TopicModelingResult['documentTopics']
  ): Promise<number> {
    // Simplified perplexity calculation
    const avgProbability = documentTopics.reduce((sum, doc) => {
      const maxProb = Math.max(...doc.topics.map(t => t.probability), 0);
      return sum + maxProb;
    }, 0) / Math.max(documentTopics.length, 1);
    
    return Math.exp(-avgProbability) * 10;
  }

  @Traceable('topicModeling.batchAnalyze')
  async batchAnalyze(
    documentBatches: string[][],
    options?: any
  ): Promise<TopicModelingResult[]> {
    return Promise.all(
      documentBatches.map(documents => this.analyze(documents, options))
    );
  }

  @Traceable('topicModeling.analyzeDistribution')
  async analyzeDistribution(
    documents: string[],
    topics: TopicModelingResult['topics']
  ): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};
    
    topics.forEach(topic => {
      distribution[topic.id] = 0;
    });
    
    const documentTopics = await this.calculateDocumentTopics(documents, topics);
    documentTopics.forEach(doc => {
      const primaryTopic = doc.topics[0];
      if (primaryTopic) {
        distribution[primaryTopic.topicId] += 1;
      }
    });
    
    return distribution;
  }
}