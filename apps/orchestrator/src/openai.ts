import OpenAI from 'openai';
import { logger } from '@insurance-lead-gen/core';

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error: error.message });
      throw error;
    }
  }

  async completePrompt(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an insurance lead qualification expert.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Failed to complete prompt', { error: error.message });
      throw error;
    }
  }

  async classifyLead(leadData: any): Promise<{
    insuranceType: string;
    qualityScore: number;
    intent: string;
    urgency: string;
  }> {
    try {
      const prompt = `
        Analyze the following insurance lead and provide:
        1. Insurance type (auto, home, life, health, commercial)
        2. Quality score (0-100)
        3. Intent (information, quote, purchase, other)
        4. Urgency (low, medium, high)

        Lead data: ${JSON.stringify(leadData, null, 2)}

        Return only JSON format: {
          "insuranceType": "",
          "qualityScore": 0,
          "intent": "",
          "urgency": ""
        }
      `;

      const result = await this.completePrompt(prompt);
      
      // Parse the JSON response
      const parsedResult = JSON.parse(result);
      
      return {
        insuranceType: parsedResult.insuranceType,
        qualityScore: parsedResult.qualityScore,
        intent: parsedResult.intent,
        urgency: parsedResult.urgency,
      };
    } catch (error) {
      logger.error('Failed to classify lead', { error: error.message });
      throw error;
    }
  }
}