import { logger } from '@insurance-lead-gen/core';
import { OpenAIClient } from './openai.js';

export class LangChainEngine {
  private openaiClient: OpenAIClient;

  constructor(openaiClient: OpenAIClient) {
    this.openaiClient = openaiClient;
  }

  async processLead(leadData: any): Promise<any> {
    try {
      logger.info('Processing lead with LangChain', { leadId: leadData.id });

      // Step 1: Classify the lead
      const classification = await this.openaiClient.classifyLead(leadData);
      logger.debug('Lead classification completed', { 
        leadId: leadData.id,
        classification
      });

      // Step 2: Generate embedding for semantic search
      const embeddingText = this.createEmbeddingText(leadData);
      const embedding = await this.openaiClient.generateEmbedding(embeddingText);
      logger.debug('Lead embedding generated', { 
        leadId: leadData.id,
        embeddingSize: embedding.length
      });

      // Step 3: Create enriched lead data
      const enrichedLead = {
        ...leadData,
        ...classification,
        embedding,
        processingStatus: 'qualified',
        processedAt: new Date().toISOString(),
      };

      logger.info('Lead processing completed', { leadId: leadData.id });
      return enrichedLead;

    } catch (error) {
      logger.error('Failed to process lead with LangChain', { 
        leadId: leadData.id,
        error: error.message
      });
      throw error;
    }
  }

  private createEmbeddingText(leadData: any): string {
    // Create text representation for embedding
    const parts = [
      `Lead ID: ${leadData.id}`,
      `Source: ${leadData.source || 'unknown'}`,
      `Name: ${leadData.firstName || ''} ${leadData.lastName || ''}`,
      `Email: ${leadData.email || 'none'}`,
      `Phone: ${leadData.phone || 'none'}`,
      `Location: ${leadData.address?.city || ''}, ${leadData.address?.state || ''}`,
      `Insurance Interest: ${leadData.insuranceType || 'unknown'}`,
      `Notes: ${leadData.notes || 'none'}`,
    ];

    return parts.filter(part => part && part !== 'none').join(' | ');
  }

  async findSimilarLeads(embedding: number[], leadId: string): Promise<any[]> {
    // TODO: Implement similarity search using Qdrant
    // This would connect to the data service's Qdrant client
    logger.info('Finding similar leads', { leadId });
    
    // Mock implementation for now
    return [
      {
        id: 'similar_lead_1',
        similarity: 0.85,
        insuranceType: 'auto',
        qualityScore: 88,
      },
      {
        id: 'similar_lead_2',
        similarity: 0.78,
        insuranceType: 'auto',
        qualityScore: 75,
      },
    ];
  }
}