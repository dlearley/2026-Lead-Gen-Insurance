import { QdrantClient as QdrantJsClient } from '@qdrant/js-client-rest';
import { logger } from '@insurance-lead-gen/core';

export class QdrantClient {
  private client: QdrantJsClient;
  private url: string;

  constructor(url?: string) {
    this.url = url || process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new QdrantJsClient({ url: this.url });
  }

  async connect() {
    try {
      await this.client.getClusterInfo();
      logger.info('Qdrant connection verified', { url: this.url });
    } catch (error) {
      logger.error('Failed to connect to Qdrant', { error: error.message });
      throw error;
    }
  }

  async searchSimilar(
    collectionName: string,
    vector: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7
  ): Promise<any[]> {
    try {
      const result = await this.client.search(collectionName, {
        vector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      logger.debug(`Found ${result.length} similar leads in ${collectionName}`, {
        leadId: vector.slice(0, 10), // Log partial vector for debugging
      });

      return result.map((point: any) => ({
        id: point.id,
        similarity: point.score,
        leadId: point.payload?.leadId,
        insuranceType: point.payload?.insuranceType,
        qualityScore: point.payload?.qualityScore,
        status: point.payload?.status,
      }));
    } catch (error) {
      logger.error('Failed to search similar vectors', { error: error.message });
      throw error;
    }
  }

  async upsertEmbedding(
    collectionName: string,
    id: string,
    vector: number[],
    payload: Record<string, any>
  ): Promise<void> {
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
}

// Singleton instance
let qdrantClientInstance: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantClientInstance) {
    qdrantClientInstance = new QdrantClient();
  }
  return qdrantClientInstance;
}
