import { OpenAIClient } from '../ai/openai.js';
import { logger } from '@insurance-lead-gen/core';

export class LeadQualificationService {
  constructor(private openAIClient: OpenAIClient) {}

  async qualifyLead(leadData: any): Promise<{
    qualityScore: number;
    insuranceType: string;
    intent: string;
    urgency: string;
    reasoning: string;
  }> {
    try {
      logger.info('Starting lead qualification', { leadId: leadData.id });

      // Use OpenAI to qualify the lead
      const result = await this.openAIClient.qualifyLead(leadData);

      logger.info('Lead qualification completed', {
        leadId: leadData.id,
        qualityScore: result.qualityScore,
        insuranceType: result.insuranceType,
      });

      return result;
    } catch (error) {
      logger.error('Failed to qualify lead', { error, leadId: leadData.id });
      throw error;
    }
  }

  // Additional qualification methods can be added here
  // For example: document analysis, data enrichment, etc.
}