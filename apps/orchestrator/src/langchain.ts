import { logger } from '@insurance-lead-gen/core';
import { Lead } from '@insurance-lead-gen/types';
import { OpenAIClient } from './openai.js';
import { EnrichmentService } from './enrichment.js';

export class LangChainEngine {
  private openaiClient: OpenAIClient;
  private enrichmentService: EnrichmentService;

  constructor(openaiClient: OpenAIClient, enrichmentService?: EnrichmentService) {
    this.openaiClient = openaiClient;
    this.enrichmentService = enrichmentService || new EnrichmentService();
  }

  async processLead(leadData: Lead): Promise<any> {
    try {
      logger.info('Processing lead with LangChain', { leadId: leadData.id });

      // Step 1: Classify the lead
      const classification = await this.openaiClient.classifyLead(leadData);
      logger.debug('Lead classification completed', { 
        leadId: leadData.id,
        classification
      });

      // Step 2: Enrich lead data from external sources
      const enrichment = await this.enrichmentService.enrichLead(leadData);
      logger.debug('Lead enrichment completed', { 
        leadId: leadData.id,
        hasCompanyData: !!enrichment.company,
        hasPersonData: !!enrichment.person
      });

      // Step 3: Generate embedding for semantic search
      const embeddingText = this.createEmbeddingText({ ...leadData, enrichment });
      const embedding = await this.openaiClient.generateEmbedding(embeddingText);
      logger.debug('Lead embedding generated', { 
        leadId: leadData.id,
        embeddingSize: embedding.length
      });

      // Step 4: Create enriched lead data
      const enrichedLead = {
        ...leadData,
        ...classification,
        enrichment,
        embedding,
        processingStatus: 'qualified',
        processedAt: new Date().toISOString(),
      };

      logger.info('Lead processing completed with enrichment', { leadId: leadData.id });
      return enrichedLead;

    } catch (error) {
      logger.error('Failed to process lead with LangChain', { 
        leadId: leadData.id,
        error: error.message
      });
      throw error;
    }
  }

  private createEmbeddingText(data: any): string {
    // Create text representation for embedding, including enriched data
    const parts = [
      `Lead ID: ${data.id}`,
      `Source: ${data.source || 'unknown'}`,
      `Name: ${data.firstName || ''} ${data.lastName || ''}`,
      `Email: ${data.email || 'none'}`,
      `Phone: ${data.phone || 'none'}`,
      `Location: ${data.address?.city || ''}, ${data.address?.state || ''}`,
      `Insurance Interest: ${data.insuranceType || 'unknown'}`,
      `Notes: ${data.notes || 'none'}`,
    ];

    if (data.enrichment?.company) {
      parts.push(`Company: ${data.enrichment.company.name} (${data.enrichment.company.industry})`);
    }

    if (data.enrichment?.person) {
      parts.push(`Job: ${data.enrichment.person.jobTitle} (${data.enrichment.person.seniority})`);
    }

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