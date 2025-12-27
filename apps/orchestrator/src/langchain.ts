import { logger } from '@insurance-lead-gen/core';
import { Lead } from '@insurance-lead-gen/types';
import { OpenAIClient } from './openai.js';
import { EnrichmentService } from './enrichment.js';
import { getQdrantClient } from './qdrant.js';

export class LangChainEngine {
  private openaiClient: OpenAIClient;
  private enrichmentService: EnrichmentService;
  private qdrantClient = getQdrantClient();
  private readonly LEADS_COLLECTION = 'leads';

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

      // Store embedding in Qdrant for similarity search
      try {
        await this.qdrantClient.upsertEmbedding(this.LEADS_COLLECTION, leadData.id, embedding, {
          leadId: leadData.id,
          insuranceType: leadData.insuranceType,
          qualityScore: classification.qualityScore,
          status: leadData.status,
          source: leadData.source,
          email: leadData.email,
          phone: leadData.phone,
        });
        logger.debug('Lead embedding stored in Qdrant', { leadId: leadData.id });
      } catch (error) {
        logger.warn('Failed to store embedding in Qdrant', {
          leadId: leadData.id,
          error: error.message,
        });
        // Continue processing even if embedding storage fails
      }

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

  async findSimilarLeads(
    embedding: number[],
    leadId: string,
    limit: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<any[]> {
    try {
      logger.info('Finding similar leads using Qdrant', { leadId, limit, similarityThreshold });

      // Search for similar leads in Qdrant
      const similarLeads = await this.qdrantClient.searchSimilar(
        this.LEADS_COLLECTION,
        embedding,
        limit,
        similarityThreshold
      );

      // Filter out the current lead from results
      const filteredLeads = similarLeads.filter(lead => lead.id !== leadId);

      logger.info(`Found ${filteredLeads.length} similar leads for ${leadId}`, {
        leadId,
        count: filteredLeads.length,
      });

      return filteredLeads.map(lead => ({
        id: lead.id,
        leadId: lead.leadId,
        similarity: lead.similarity,
        insuranceType: lead.insuranceType,
        qualityScore: lead.qualityScore,
        status: lead.status,
      }));

    } catch (error) {
      if (error.message?.includes('not found') || error.message?.includes('collection')) {
        // Collection doesn't exist yet, return empty array
        logger.warn('Qdrant collection not found, returning empty results', {
          collection: this.LEADS_COLLECTION,
          error: error.message,
        });
        return [];
      }

      logger.error('Failed to find similar leads', {
        leadId,
        error: error.message,
      });
      // Return empty array on error to prevent breaking the workflow
      return [];
    }
  }
}