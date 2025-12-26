import { QdrantClient as QdrantJsClient } from '@qdrant/js-client-rest';
import { logger } from '@insurance-lead-gen/core';

export class QdrantClient {
  private client: QdrantJsClient;
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.client = new QdrantJsClient({ url });
  }

  async connect() {
    try {
      // Test connection by getting cluster info
      await this.client.getClusterInfo();
      logger.info('Qdrant connection verified');
    } catch (error) {
      logger.error('Failed to connect to Qdrant', { error: error.message });
      throw error;
    }
  }

  async close() {
    // Qdrant client doesn't have an explicit close method
    logger.info('Qdrant client closed');
  }

  async createCollection(collectionName: string, vectorSize: number = 1536) {
    try {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
      logger.info(`Created Qdrant collection: ${collectionName}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        logger.info(`Qdrant collection ${collectionName} already exists`);
      } else {
        logger.error('Failed to create Qdrant collection', { error: error.message });
        throw error;
      }
    }
  }

  async upsertEmbedding(
    collectionName: string,
    id: string,
    vector: number[],
    payload: Record<string, any>
  ) {
    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });
      logger.debug(`Upserted embedding for ${id} in collection ${collectionName}`);
    } catch (error) {
      logger.error('Failed to upsert embedding', { error: error.message });
      throw error;
    }
  }

  async searchSimilar(
    collectionName: string,
    vector: number[],
    limit: number = 5
  ) {
    try {
      const result = await this.client.search(collectionName, {
        vector,
        limit,
      });
      return result;
    } catch (error) {
      logger.error('Failed to search similar vectors', { error: error.message });
      throw error;
    }
  }
}