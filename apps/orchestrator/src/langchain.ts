import { logger } from '@insurance-lead-gen/core';
import { Lead } from '@insurance-lead-gen/types';
import { OpenAIClient } from './openai.js';
import { EnrichmentService } from './enrichment.js';
import { getQdrantClient } from './qdrant.js';
import { KnowledgeBaseService } from './services/knowledge-base.service.js';

export class LangChainEngine {
  private openaiClient: OpenAIClient;
  private enrichmentService: EnrichmentService;
  private qdrantClient = getQdrantClient();
  private knowledgeBaseService: KnowledgeBaseService;
  private readonly LEADS_COLLECTION = 'leads';

  constructor(openaiClient: OpenAIClient, enrichmentService?: EnrichmentService) {
    this.openaiClient = openaiClient;
    this.enrichmentService = enrichmentService || new EnrichmentService();
    this.knowledgeBaseService = new KnowledgeBaseService(openaiClient);
    // Initialize knowledge base service
    this.knowledgeBaseService.initialize().catch(error => {
      logger.error('Failed to initialize knowledge base service in LangChain', { error: error.message });
    });
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

      // Step 3: Get knowledge base insights (new feature)
      const knowledgeInsights = await this.getKnowledgeBaseInsights(
        leadData,
        classification.insuranceType
      );
      logger.debug('Knowledge base insights generated', { 
        leadId: leadData.id,
        knowledgeCount: knowledgeInsights.relevantKnowledge.length,
        hasInsights: !!knowledgeInsights.insights
      });

      // Step 4: Generate embedding for semantic search
      const embeddingText = this.createEmbeddingText({ ...leadData, enrichment });
      const embedding = await this.openaiClient.generateEmbedding(embeddingText);
      logger.debug('Lead embedding generated', { 
        leadId: leadData.id,
        embeddingSize: embedding.length
      });

      // Step 5: Create enriched lead data with knowledge insights
      const enrichedLead = {
        ...leadData,
        ...classification,
        enrichment,
        embedding,
        knowledgeInsights: {
          relevantKnowledge: knowledgeInsights.relevantKnowledge,
          insights: knowledgeInsights.insights,
          knowledgeBaseUsed: knowledgeInsights.relevantKnowledge.length > 0,
        },
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

      logger.info('Lead processing completed with enrichment and knowledge insights', { 
        leadId: leadData.id,
        knowledgeCount: knowledgeInsights.relevantKnowledge.length
      });
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

  async getKnowledgeBaseInsights(leadData: Lead, insuranceType: string): Promise<{
    relevantKnowledge: any[];
    insights: string;
  }> {
    try {
      // Create a query based on lead data and insurance type
      const query = this.createKnowledgeBaseQuery(leadData, insuranceType);

      logger.info('Searching knowledge base for insights', {
        leadId: leadData.id,
        insuranceType,
        queryLength: query.length,
      });

      // Search knowledge base for relevant information
      const knowledgeResults = await this.knowledgeBaseService.search(
        query,
        3, // Get top 3 relevant knowledge entries
        0.6 // Minimum similarity threshold
      );

      // Generate insights from the knowledge base results
      const insights = this.generateInsightsFromKnowledge(knowledgeResults, leadData);

      logger.info('Generated knowledge base insights', {
        leadId: leadData.id,
        knowledgeCount: knowledgeResults.length,
        hasInsights: !!insights,
      });

      return {
        relevantKnowledge: knowledgeResults,
        insights,
      };

    } catch (error) {
      logger.error('Failed to get knowledge base insights', {
        leadId: leadData.id,
        error: error.message,
      });
      // Return empty results on error to prevent breaking the workflow
      return {
        relevantKnowledge: [],
        insights: '',
      };
    }
  }

  private createKnowledgeBaseQuery(leadData: Lead, insuranceType: string): string {
    // Create a comprehensive query for knowledge base search
    const parts = [
      `Insurance type: ${insuranceType}`,
      `Lead source: ${leadData.source || 'unknown'}`,
    ];

    if (leadData.firstName || leadData.lastName) {
      parts.push(`Customer name: ${leadData.firstName || ''} ${leadData.lastName || ''}`);
    }

    if (leadData.email) {
      parts.push(`Email: ${leadData.email}`);
    }

    if (leadData.phone) {
      parts.push(`Phone: ${leadData.phone}`);
    }

    if (leadData.address) {
      const addressParts = [];
      if (leadData.address.city) addressParts.push(leadData.address.city);
      if (leadData.address.state) addressParts.push(leadData.address.state);
      if (addressParts.length > 0) {
        parts.push(`Location: ${addressParts.join(', ')}`);
      }
    }

    if (leadData.notes) {
      parts.push(`Notes: ${leadData.notes}`);
    }

    // Add specific insurance type context
    parts.push(`Context: ${this.getInsuranceTypeContext(insuranceType)}`);

    return parts.join(' | ');
  }

  private getInsuranceTypeContext(insuranceType: string): string {
    // Return context based on insurance type for better knowledge base search
    const contexts: Record<string, string> = {
      auto: 'auto insurance, vehicle coverage, car insurance policies, automobile protection',
      home: 'home insurance, property coverage, homeowners insurance, dwelling protection',
      life: 'life insurance, term life, whole life, life coverage, beneficiary protection',
      health: 'health insurance, medical coverage, healthcare plans, health protection',
      commercial: 'commercial insurance, business coverage, liability protection, commercial policies',
    };

    return contexts[insuranceType] || 'general insurance information';
  }

  private generateInsightsFromKnowledge(
    knowledgeResults: any[],
    leadData: Lead
  ): string {
    if (knowledgeResults.length === 0) {
      return '';
    }

    try {
      // Create a summary of relevant knowledge
      const knowledgeSummary = knowledgeResults
        .map((result, index) => {
          return `Knowledge ${index + 1} (${result.similarity.toFixed(2)} similarity):
` +
                 `- Title: ${result.title}
` +
                 `- Category: ${result.category}
` +
                 `- Content: ${result.content.substring(0, 200)}...`;
        })
        .join('\n\n');

      // Generate insights based on the knowledge and lead data
      const prompt = `
        Based on the following knowledge base information and lead data,
        provide concise insights that could help qualify and route this lead:

        Knowledge Base Information:
        ${knowledgeSummary}

        Lead Data:
        - Insurance Type: ${leadData.insuranceType}
        - Source: ${leadData.source}
        - Name: ${leadData.firstName || ''} ${leadData.lastName || ''}
        - Email: ${leadData.email || 'N/A'}
        - Phone: ${leadData.phone || 'N/A'}
        - Location: ${leadData.address?.city || ''}, ${leadData.address?.state || ''}
        - Notes: ${leadData.notes || 'None'}

        Provide insights in the following format:
        1. Relevance assessment (high/medium/low)
        2. Key considerations for this lead
        3. Potential questions to ask the customer
        4. Recommended next steps

        Keep the response concise and actionable.
      `;

      // Use OpenAI to generate insights
      if (this.openaiClient && typeof (this.openaiClient as any).completePrompt === 'function') {
        return (this.openaiClient as any).completePrompt(prompt);
      }

      // Fallback: Simple summary if OpenAI is not available
      return `Knowledge base insights: Found ${knowledgeResults.length} relevant knowledge entries about ${leadData.insuranceType} insurance.`;

    } catch (error) {
      logger.error('Failed to generate insights from knowledge', {
        error: error.message,
        leadId: leadData.id,
      });
      return '';
    }
  }
}