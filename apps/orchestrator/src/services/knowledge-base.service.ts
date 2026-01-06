import { logger } from '@insurance-lead-gen/core';
import { getQdrantClient } from '../qdrant';
import { OpenAIClient } from '../ai/openai';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBaseSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export class KnowledgeBaseService {
  private qdrantClient = getQdrantClient();
  private openaiClient: OpenAIClient;
  private readonly KNOWLEDGE_BASE_COLLECTION = 'knowledge_base';
  private readonly EMBEDDING_MODEL = 'text-embedding-ada-002';

  constructor(openaiClient: OpenAIClient) {
    this.openaiClient = openaiClient;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure the knowledge base collection exists
      await this.ensureCollectionExists();
      logger.info('Knowledge base service initialized');
    } catch (error) {
      logger.error('Failed to initialize knowledge base service', { error: error.message });
      throw error;
    }
  }

  private async ensureCollectionExists(): Promise<void> {
    try {
      // Check if collection exists by trying to get its info
      await this.qdrantClient.client.getCollection(this.KNOWLEDGE_BASE_COLLECTION);
      logger.debug('Knowledge base collection already exists');
    } catch (error) {
      if (error.message.includes('not found')) {
        // Collection doesn't exist, create it
        await this.qdrantClient.client.createCollection(this.KNOWLEDGE_BASE_COLLECTION, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine',
          },
        });
        logger.info('Created knowledge base collection');
      } else {
        logger.error('Failed to check/create knowledge base collection', { error: error.message });
        throw error;
      }
    }
  }

  async addEntry(entry: KnowledgeBaseEntry): Promise<KnowledgeBaseEntry> {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(entry);

      // Prepare payload for Qdrant
      const payload = {
        id: entry.id,
        title: entry.title,
        category: entry.category,
        tags: entry.tags || [],
        metadata: entry.metadata || {},
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: entry.updatedAt || new Date().toISOString(),
        content: entry.content,
      };

      // Store in Qdrant
      await this.qdrantClient.upsertEmbedding(
        this.KNOWLEDGE_BASE_COLLECTION,
        entry.id,
        embedding,
        payload
      );

      logger.info('Added knowledge base entry', { entryId: entry.id, title: entry.title });
      return { ...entry, createdAt: payload.createdAt, updatedAt: payload.updatedAt };
    } catch (error) {
      logger.error('Failed to add knowledge base entry', { error: error.message, entryId: entry.id });
      throw error;
    }
  }

  async updateEntry(entryId: string, updates: Partial<KnowledgeBaseEntry>): Promise<KnowledgeBaseEntry> {
    try {
      // Get existing entry
      const existingEntry = await this.getEntryById(entryId);
      if (!existingEntry) {
        throw new Error('Entry not found');
      }

      // Merge updates
      const updatedEntry: KnowledgeBaseEntry = {
        ...existingEntry,
        ...updates,
        id: entryId,
        updatedAt: new Date().toISOString(),
      };

      // Generate new embedding
      const embedding = await this.generateEmbedding(updatedEntry);

      // Prepare payload
      const payload = {
        id: entryId,
        title: updatedEntry.title,
        category: updatedEntry.category,
        tags: updatedEntry.tags || [],
        metadata: updatedEntry.metadata || {},
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt,
        content: updatedEntry.content,
      };

      // Update in Qdrant
      await this.qdrantClient.upsertEmbedding(
        this.KNOWLEDGE_BASE_COLLECTION,
        entryId,
        embedding,
        payload
      );

      logger.info('Updated knowledge base entry', { entryId });
      return updatedEntry;
    } catch (error) {
      logger.error('Failed to update knowledge base entry', { error: error.message, entryId });
      throw error;
    }
  }

  async deleteEntry(entryId: string): Promise<boolean> {
    try {
      await this.qdrantClient.client.deletePoints(this.KNOWLEDGE_BASE_COLLECTION, {
        points: [entryId],
      });

      logger.info('Deleted knowledge base entry', { entryId });
      return true;
    } catch (error) {
      logger.error('Failed to delete knowledge base entry', { error: error.message, entryId });
      throw error;
    }
  }

  async getEntryById(entryId: string): Promise<KnowledgeBaseEntry | null> {
    try {
      const result = await this.qdrantClient.client.getPoints(this.KNOWLEDGE_BASE_COLLECTION, {
        ids: [entryId],
        with_payload: true,
      });

      if (result.points && result.points.length > 0) {
        const point = result.points[0];
        return {
          id: point.id,
          title: point.payload.title,
          content: point.payload.content,
          category: point.payload.category,
          tags: point.payload.tags,
          metadata: point.payload.metadata,
          createdAt: point.payload.createdAt,
          updatedAt: point.payload.updatedAt,
        };
      }

      return null;
    } catch (error) {
      if (error.message.includes('not found')) {
        return null;
      }
      logger.error('Failed to get knowledge base entry', { error: error.message, entryId });
      throw error;
    }
  }

  async search(query: string, limit: number = 5, similarityThreshold: number = 0.6): Promise<KnowledgeBaseSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding({ content: query, title: 'Query', id: 'query', category: 'search' });

      // Search in Qdrant
      const results = await this.qdrantClient.client.search(this.KNOWLEDGE_BASE_COLLECTION, {
        vector: queryEmbedding,
        limit,
        score_threshold: similarityThreshold,
        with_payload: true,
      });

      // Map results to search result format
      return results.map((result: any) => ({
        id: result.id,
        title: result.payload.title,
        content: result.payload.content,
        category: result.payload.category,
        similarity: result.score,
        metadata: result.payload.metadata,
      }));
    } catch (error) {
      logger.error('Failed to search knowledge base', { error: error.message, query });
      // Return empty array on error to prevent breaking the workflow
      return [];
    }
  }

  async searchByCategory(category: string, query: string, limit: number = 5): Promise<KnowledgeBaseSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding({ content: query, title: 'Query', id: 'query', category });

      // Search with filter
      const results = await this.qdrantClient.client.search(this.KNOWLEDGE_BASE_COLLECTION, {
        vector: queryEmbedding,
        limit,
        filter: {
          must: [
            {
              key: 'category',
              match: { value: category },
            },
          ],
        },
        with_payload: true,
      });

      // Map results to search result format
      return results.map((result: any) => ({
        id: result.id,
        title: result.payload.title,
        content: result.payload.content,
        category: result.payload.category,
        similarity: result.score,
        metadata: result.payload.metadata,
      }));
    } catch (error) {
      logger.error('Failed to search knowledge base by category', { error: error.message, category, query });
      return [];
    }
  }

  private async generateEmbedding(entry: KnowledgeBaseEntry): Promise<number[]> {
    try {
      // Create text representation for embedding
      const textToEmbed = this.createEmbeddingText(entry);

      // Use OpenAI to generate embedding
      if (this.openaiClient && typeof (this.openaiClient as any).generateEmbedding === 'function') {
        return (this.openaiClient as any).generateEmbedding(textToEmbed);
      }

      // Fallback: Mock embedding for development
      logger.warn('OpenAI generateEmbedding method not available, using mock embedding');
      return this.generateMockEmbedding(textToEmbed);
    } catch (error) {
      logger.error('Failed to generate embedding', { error: error.message, entryId: entry.id });
      throw error;
    }
  }

  private createEmbeddingText(entry: KnowledgeBaseEntry): string {
    // Create comprehensive text representation for embedding
    const parts = [
      `Title: ${entry.title}`,
      `Category: ${entry.category}`,
      `Content: ${entry.content}`,
    ];

    if (entry.tags && entry.tags.length > 0) {
      parts.push(`Tags: ${entry.tags.join(', ')}`);
    }

    if (entry.metadata) {
      const metadataParts = Object.entries(entry.metadata).map(([key, value]) => `${key}: ${value}`);
      parts.push(`Metadata: ${metadataParts.join(' | ')}`);
    }

    return parts.join(' | ');
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a mock embedding vector (1536 dimensions)
    // This is just for development purposes
    const embedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      embedding.push(Math.random() * 2 - 1); // Values between -1 and 1
    }
    return embedding;
  }
}