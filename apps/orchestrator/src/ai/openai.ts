import OpenAI from 'openai';
import { logger } from '@insurance-lead-gen/core';
import { config } from '@insurance-lead-gen/config';

export class OpenAIClient {
  private client: OpenAI | null = null;

  async initialize(): Promise<void> {
    try {
      const apiKey = config.openaiApiKey;
      if (!apiKey) {
        logger.warn('OpenAI API key not configured. Using mock mode.');
        return;
      }

      this.client = new OpenAI({
        apiKey: apiKey,
      });

      logger.info('OpenAI client initialized');
    } catch (error) {
      logger.error('Failed to initialize OpenAI client', { error });
      throw error;
    }
  }

  async qualifyLead(leadData: any): Promise<{
    qualityScore: number;
    insuranceType: string;
    intent: string;
    urgency: string;
    reasoning: string;
  }> {
    try {
      if (!this.client) {
        // Mock response for development
        return this.generateMockQualification(leadData);
      }

      // Create prompt for lead qualification
      const prompt = this.createQualificationPrompt(leadData);

      const response = await this.client.chat.completions.create({
        model: config.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert insurance lead qualification assistant. Analyze leads and provide structured responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      logger.info('Lead qualified by OpenAI', {
        leadId: leadData.id,
        qualityScore: result.qualityScore,
        insuranceType: result.insuranceType,
      });

      return result;
    } catch (error) {
      logger.error('Failed to qualify lead with OpenAI', { error, leadId: leadData.id });
      // Fallback to mock response
      return this.generateMockQualification(leadData);
    }
  }

  private createQualificationPrompt(leadData: any): string {
    return `Analyze the following insurance lead and provide a structured JSON response:

Lead Data:
- Source: ${leadData.source}
- Name: ${leadData.firstName || ''} ${leadData.lastName || ''}
- Email: ${leadData.email || 'N/A'}
- Phone: ${leadData.phone || 'N/A'}
- Location: ${leadData.city || ''}, ${leadData.state || ''}
- Insurance Type Hint: ${leadData.insuranceType || 'unknown'}

Please provide:
1. qualityScore (0-100): Numerical score representing lead quality
2. insuranceType: One of: auto, home, life, health, commercial
3. intent: What the lead is looking for (e.g., "quote", "information", "purchase")
4. urgency: One of: low, medium, high
5. reasoning: Brief explanation of your analysis

Respond only with valid JSON, no additional text.`;
  }

  private generateMockQualification(leadData: any): {
    qualityScore: number;
    insuranceType: string;
    intent: string;
    urgency: string;
    reasoning: string;
  } {
    // Simple mock logic based on available data
    const insuranceTypes = ['auto', 'home', 'life', 'health', 'commercial'];
    const selectedType = leadData.insuranceType || insuranceTypes[Math.floor(Math.random() * insuranceTypes.length)];

    return {
      qualityScore: this.calculateMockQualityScore(leadData),
      insuranceType: selectedType,
      intent: 'quote',
      urgency: 'medium',
      reasoning: `Mock qualification: Lead appears to be interested in ${selectedType} insurance based on available data.`,
    };
  }

  private calculateMockQualityScore(leadData: any): number {
    let score = 50; // Base score

    // Add points for complete contact info
    if (leadData.email) score += 10;
    if (leadData.phone) score += 15;
    if (leadData.firstName && leadData.lastName) score += 10;
    if (leadData.city && leadData.state) score += 10;

    // Add points for specific insurance type
    if (leadData.insuranceType) score += 15;

    // Ensure score is between 0-100
    return Math.min(100, Math.max(0, score));
  }
}