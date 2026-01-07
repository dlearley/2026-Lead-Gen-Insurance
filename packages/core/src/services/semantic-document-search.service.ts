import { logger } from '../logger.js';
import type {
  DocumentEmbedding,
  SearchFilters,
  SearchResult,
  SimilarDocument,
  DocumentChunk,
  EntityOccurrence,
} from '@insurance-lead-gen/types';

/**
 * Semantic Document Search Service
 * Provides semantic search capabilities using embeddings and vector similarity
 */
export class SemanticDocumentSearchService {
  private embeddingModel: string;
  private vectorDimension: number;

  constructor(config?: { embeddingModel?: string; vectorDimension?: number }) {
    this.embeddingModel = config?.embeddingModel || 'openai-text-embedding-ada-002';
    this.vectorDimension = config?.vectorDimension || 1536;
  }

  /**
   * Index document for semantic search (generate embeddings)
   */
  async indexDocument(
    documentId: string,
    documentText: string,
    metadata?: { documentType?: string; documentClass?: string }
  ): Promise<void> {
    try {
      logger.info('Indexing document for semantic search', {
        documentId,
        textLength: documentText.length,
      });

      // Split document into chunks
      const chunks = this._splitDocumentIntoChunks(documentText);

      logger.debug('Document split into chunks', { documentId, chunkCount: chunks.length });

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this._generateEmbedding(chunk);

        const documentEmbedding: DocumentEmbedding = {
          id: `emb_${documentId}_${i}`,
          documentId,
          embeddingModel: this.embeddingModel,
          embeddingVector: embedding,
          chunkIndex: i,
          chunkText: chunk,
          createdAt: new Date(),
        };

        // In production, save to vector database (Qdrant, Pinecone, etc.)
        await this._saveEmbedding(documentEmbedding);
      }

      logger.info('Document indexed successfully', {
        documentId,
        chunksIndexed: chunks.length,
      });
    } catch (error) {
      logger.error('Failed to index document', { error, documentId });
      throw new Error(`Document indexing failed: ${error.message}`);
    }
  }

  /**
   * Semantic search across documents
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    options?: { limit?: number; minScore?: number }
  ): Promise<SearchResult[]> {
    try {
      logger.info('Performing semantic search', {
        query,
        filters,
        limit: options?.limit || 10,
      });

      // Generate embedding for query
      const queryEmbedding = await this._generateEmbedding(query);

      // Search for similar documents
      const results = await this._searchVectorDatabase(queryEmbedding, filters, options);

      logger.info('Semantic search completed', {
        query,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to perform semantic search', { error, query });
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  /**
   * Find similar documents
   */
  async findSimilarDocuments(
    documentId: string,
    limit: number = 5
  ): Promise<SimilarDocument[]> {
    try {
      logger.info('Finding similar documents', { documentId, limit });

      // Get document embeddings
      const documentEmbeddings = await this._getDocumentEmbeddings(documentId);

      if (!documentEmbeddings || documentEmbeddings.length === 0) {
        logger.warn('No embeddings found for document', { documentId });
        return [];
      }

      // Use first embedding as representative
      const representativeEmbedding = documentEmbeddings[0].embeddingVector;

      // Search for similar documents
      const similarEmbeddings = await this._searchSimilarVectors(
        representativeEmbedding!,
        { excludeDocumentId: documentId },
        limit
      );

      // Convert to SimilarDocument format
      const similarDocuments: SimilarDocument[] = [];

      for (const embedding of similarEmbeddings) {
        const document = await this._getDocumentById(embedding.documentId);
        const entities = await this._getDocumentEntities(embedding.documentId);

        similarDocuments.push({
          documentId: embedding.documentId,
          similarityScore: embedding.similarityScore,
          documentType: document?.documentType,
          sharedEntities: this._findSharedEntities(documentEmbeddings, entities),
          matchedTopics: await this._extractTopicsFromChunk(embedding.chunkText || ''),
        });
      }

      logger.info('Similar documents found', {
        documentId,
        count: similarDocuments.length,
      });

      return similarDocuments;
    } catch (error) {
      logger.error('Failed to find similar documents', { error, documentId });
      throw new Error(`Similar document search failed: ${error.message}`);
    }
  }

  /**
   * Get document chunks by relevance
   */
  async getRelevantChunks(
    documentId: string,
    query: string,
    limit: number = 5
  ): Promise<DocumentChunk[]> {
    try {
      logger.info('Getting relevant chunks', { documentId, query, limit });

      // Generate embedding for query
      const queryEmbedding = await this._generateEmbedding(query);

      // Get document embeddings
      const documentEmbeddings = await this._getDocumentEmbeddings(documentId);

      if (!documentEmbeddings || documentEmbeddings.length === 0) {
        logger.warn('No embeddings found for document', { documentId });
        return [];
      }

      // Calculate similarity scores
      const chunksWithScores = documentEmbeddings
        .map((emb) => ({
          chunkIndex: emb.chunkIndex,
          text: emb.chunkText,
          relevanceScore: this._calculateSimilarity(
            queryEmbedding,
            emb.embeddingVector!
          ),
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      logger.info('Relevant chunks retrieved', {
        documentId,
        count: chunksWithScores.length,
      });

      return chunksWithScores;
    } catch (error) {
      logger.error('Failed to get relevant chunks', { error, documentId, query });
      throw new Error(`Relevant chunk retrieval failed: ${error.message}`);
    }
  }

  /**
   * Cross-document entity resolution
   */
  async resolveEntityAcrossDocuments(entity: {
    type: string;
    value: string;
  }): Promise<EntityOccurrence[]> {
    try {
      logger.info('Resolving entity across documents', {
        type: entity.type,
        value: entity.value,
      });

      // Search for entity occurrences in documents
      const occurrences = await this._searchEntityOccurrences(entity);

      logger.info('Entity resolution completed', {
        type: entity.type,
        value: entity.value,
        occurrenceCount: occurrences.length,
      });

      return occurrences;
    } catch (error) {
      logger.error('Failed to resolve entity across documents', { error, entity });
      throw new Error(`Entity resolution failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private _splitDocumentIntoChunks(text: string, chunkSize: number = 500): string[] {
    const chunks: string[] = [];

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async _generateEmbedding(text: string): Promise<number[]> {
    // Simulate embedding generation
    // In production, use OpenAI embeddings, Cohere, or HuggingFace models

    logger.debug('Generating embedding', { textLength: text.length });

    // Generate a pseudo-random embedding based on text
    const embedding: number[] = [];
    const hash = this._hashText(text);

    for (let i = 0; i < this.vectorDimension; i++) {
      // Generate values between -1 and 1
      embedding.push(
        ((hash + i) * 9301 + 49297) % 233280 / 233280 * 2 - 1
      );
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map((val) => val / magnitude);

    return normalizedEmbedding;
  }

  private _hashText(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private async _saveEmbedding(embedding: DocumentEmbedding): Promise<void> {
    // In production, save to vector database (Qdrant, Pinecone, etc.)
    logger.debug('Saving embedding', {
      id: embedding.id,
      documentId: embedding.documentId,
      chunkIndex: embedding.chunkIndex,
    });
  }

  private async _searchVectorDatabase(
    queryEmbedding: number[],
    filters?: SearchFilters,
    options?: { limit?: number; minScore?: number }
  ): Promise<SearchResult[]> {
    // Simulate vector database search
    // In production, query actual vector database

    const limit = options?.limit || 10;
    const minScore = options?.minScore || 0.7;

    // Simulate search results
    const results: SearchResult[] = [];

    for (let i = 0; i < limit; i++) {
      const similarityScore = 0.7 + Math.random() * 0.29;

      if (similarityScore >= minScore) {
        results.push({
          documentId: `doc_${Math.random().toString(36).substring(7)}`,
          chunkText: this._generateSampleChunk(),
          relevanceScore: similarityScore,
          snippet: this._generateSampleSnippet(),
          metadata: {
            documentType: filters?.documentType || 'policy_auto',
            documentClass: filters?.documentClass || 'insurance_policy',
          },
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async _searchSimilarVectors(
    embedding: number[],
    filters?: { excludeDocumentId?: string },
    limit: number = 5
  ): Promise<Array<{ documentId: string; chunkText?: string; similarityScore: number }>> {
    // Simulate similar vector search
    const results: Array<{ documentId: string; chunkText?: string; similarityScore: number }> = [];

    for (let i = 0; i < limit; i++) {
      results.push({
        documentId: `doc_${Math.random().toString(36).substring(7)}`,
        chunkText: this._generateSampleChunk(),
        similarityScore: 0.75 + Math.random() * 0.24,
      });
    }

    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  private async _getDocumentEmbeddings(documentId: string): Promise<DocumentEmbedding[]> {
    // In production, query vector database
    // Simulate retrieving embeddings

    const embeddings: DocumentEmbedding[] = [];
    const chunkCount = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < chunkCount; i++) {
      embeddings.push({
        id: `emb_${documentId}_${i}`,
        documentId,
        embeddingModel: this.embeddingModel,
        embeddingVector: await this._generateEmbedding(this._generateSampleChunk()),
        chunkIndex: i,
        chunkText: this._generateSampleChunk(),
        createdAt: new Date(),
      });
    }

    return embeddings;
  }

  private async _getDocumentById(
    documentId: string
  ): Promise<{ documentType?: string; documentClass?: string } | null> {
    // In production, query database
    // Simulate document retrieval

    return {
      documentType: 'policy_auto',
      documentClass: 'insurance_policy',
    };
  }

  private async _getDocumentEntities(documentId: string): Promise<Array<{ type: string; value: string }>> {
    // In production, query database for extracted entities
    // Simulate entity retrieval

    return [
      { type: 'VEHICLE_VIN', value: '1HGCM82633A004352' },
      { type: 'VEHICLE_MAKE', value: 'Honda' },
      { type: 'COVERAGE_LIABILITY', value: '$50,000' },
    ];
  }

  private _findSharedEntities(
    sourceEmbeddings: DocumentEmbedding[],
    targetEntities: Array<{ type: string; value: string }>
  ): string[] {
    // Find shared entities between documents
    // In production, this would use actual entity data

    const sharedEntities: string[] = [];

    if (targetEntities.length > 0) {
      sharedEntities.push(targetEntities[0].value);
    }

    return sharedEntities;
  }

  private async _extractTopicsFromChunk(chunk: string): Promise<string[]> {
    // Extract topics from chunk
    const keywords = ['coverage', 'premium', 'liability', 'deductible', 'vehicle', 'policy'];

    const foundTopics: string[] = [];

    for (const keyword of keywords) {
      if (chunk.toLowerCase().includes(keyword)) {
        foundTopics.push(keyword);
      }
    }

    return foundTopics.slice(0, 3);
  }

  private async _searchEntityOccurrences(entity: {
    type: string;
    value: string;
  }): Promise<EntityOccurrence[]> {
    // Search for entity occurrences across documents
    // In production, query database

    const occurrences: EntityOccurrence[] = [];

    const occurrenceCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < occurrenceCount; i++) {
      occurrences.push({
        entityId: `entity_${Math.random().toString(36).substring(7)}`,
        entityValue: entity.value,
        entityType: entity.type,
        occurrences: [
          {
            documentId: `doc_${Math.random().toString(36).substring(7)}`,
            documentType: 'policy_auto',
            pageNumber: Math.floor(Math.random() * 10) + 1,
            context: this._generateSampleChunk(),
          },
        ],
      });
    }

    return occurrences;
  }

  private _calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Calculate cosine similarity
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  private _generateSampleChunk(): string {
    const samples = [
      'This policy provides liability coverage for bodily injury and property damage caused by the insured. The coverage limits are specified in the policy declarations.',
      'The deductible for collision coverage is $500. The insured must pay this amount before the insurance company pays for damages.',
      'Coverage extends to perils including fire, theft, vandalism, and weather-related damage as outlined in the policy terms.',
      'The insured has the right to cancel this policy at any time by providing written notice to the insurance company.',
      'All claims must be reported promptly. Failure to report a claim within a reasonable time may result in denial of coverage.',
    ];

    return samples[Math.floor(Math.random() * samples.length)];
  }

  private _generateSampleSnippet(): string {
    return 'Sample document snippet showing relevant information...';
  }
}
