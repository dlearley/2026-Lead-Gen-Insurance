import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface LeadEmbeddingInput {
  leadId: string;
  leadData: {
    insuranceTypes: string[];
    urgency: string;
    geographicLocation: {
      state: string;
      city?: string;
      zipCode?: string;
    };
    personalInfo: {
      age?: number;
      income?: number;
      profession?: string;
    };
    coverage: {
      currentProvider?: string;
      policyExpiryDate?: Date;
      claims?: number;
    };
    requirements: {
      specialFeatures: string[];
      budget?: number;
      riskFactors: string[];
    };
  };
  context?: {
    source: string;
    campaign?: string;
    referrer?: string;
  };
}

export interface LeadEmbeddingOutput {
  leadId: string;
  vector: number[];
  embeddingModel: string;
  features: {
    insuranceType: string[];
    urgency: number;
    geographic: number[];
    demographics: number[];
    coverage: number[];
    requirements: number[];
  };
  metadata: {
    embeddingDimensions: number;
    createdAt: Date;
    confidence: number;
    processingTime: number;
  };
}

export interface LeadFeatures {
  insuranceType: number[];
  urgency: number;
  geographic: number[];
  demographics: number[];
  coverage: number[];
  requirements: number[];
}

export class LeadEmbeddingPipeline {
  private openai: OpenAI;
  private qdrant: QdrantClient;
  private readonly COLLECTION_NAME = 'lead_embeddings';
  private readonly EMBEDDING_MODEL = 'text-embedding-ada-002';
  private readonly VECTOR_DIMENSION = 1536;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  /**
   * Create comprehensive text representation of a lead
   */
  private createLeadText(leadInput: LeadEmbeddingInput): string {
    const { leadData } = leadInput;
    
    let text = 'Lead Profile: ';

    // Insurance types
    if (leadData.insuranceTypes && leadData.insuranceTypes.length > 0) {
      text += `Seeking ${leadData.insuranceTypes.join(' and ')} insurance coverage. `;
    }

    // Geographic information
    if (leadData.geographicLocation.city) {
      text += `Located in ${leadData.geographicLocation.city}, ${leadData.geographicLocation.state}`;
    } else {
      text += `Located in ${leadData.geographicLocation.state}`;
    }

    if (leadData.geographicLocation.zipCode) {
      text += ` ${leadData.geographicLocation.zipCode}. `;
    } else {
      text += '. ';
    }

    // Urgency
    const urgencyMap = {
      LOW: 'low urgency',
      MEDIUM: 'moderate urgency',
      HIGH: 'high urgency',
      CRITICAL: 'immediate urgency'
    };
    text += `Contact urgency: ${urgencyMap[leadData.urgency as keyof typeof urgencyMap] || 'medium'}. `;

    // Demographics
    if (leadData.personalInfo.age) {
      text += `Age: ${leadData.personalInfo.age}. `;
    }

    if (leadData.personalInfo.income) {
      text += `Income level: ${this.categorizeIncome(leadData.personalInfo.income)}. `;
    }

    if (leadData.personalInfo.profession) {
      text += `Profession: ${leadData.personalInfo.profession}. `;
    }

    // Current coverage
    if (leadData.coverage.currentProvider) {
      text += `Currently insured with ${leadData.coverage.currentProvider}. `;
    }

    if (leadData.coverage.policyExpiryDate) {
      const daysUntilExpiry = Math.ceil(
        (leadData.coverage.policyExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      text += `Policy expires in ${daysUntilExpiry} days. `;
    }

    if (leadData.coverage.claims && leadData.coverage.claims > 0) {
      text += `Has filed ${leadData.coverage.claims} previous claims. `;
    }

    // Special requirements
    if (leadData.requirements.specialFeatures.length > 0) {
      text += `Special requirements: ${leadData.requirements.specialFeatures.join(', ')}. `;
    }

    if (leadData.requirements.budget) {
      text += `Budget range: ${this.categorizeBudget(leadData.requirements.budget)}. `;
    }

    if (leadData.requirements.riskFactors.length > 0) {
      text += `Risk factors: ${leadData.requirements.riskFactors.join(', ')}. `;
    }

    // Context
    if (leadInput.context?.source) {
      text += `Lead source: ${leadInput.context.source}. `;
    }

    if (leadInput.context?.campaign) {
      text += `Marketing campaign: ${leadInput.context.campaign}. `;
    }

    return text.trim();
  }

  /**
   * Extract structured features from lead data
   */
  private extractStructuredFeatures(leadInput: LeadEmbeddingInput): LeadFeatures {
    const { leadData } = leadInput;

    // Insurance type features (one-hot encoded)
    const insuranceTypes = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL', 'RENTERS', 'UMBRELLA'];
    const insuranceType = insuranceTypes.map(type => 
      leadData.insuranceTypes.includes(type) ? 1 : 0
    );

    // Urgency (normalized 0-1)
    const urgencyMap = { LOW: 0.2, MEDIUM: 0.5, HIGH: 0.8, CRITICAL: 1.0 };
    const urgency = urgencyMap[leadData.urgency as keyof typeof urgencyMap] || 0.5;

    // Geographic features
    const geographic = this.encodeGeographic(leadData.geographicLocation);

    // Demographics
    const demographics = this.encodeDemographics(leadData.personalInfo);

    // Coverage features
    const coverage = this.encodeCoverage(leadData.coverage);

    // Requirements features
    const requirements = this.encodeRequirements(leadData.requirements);

    return {
      insuranceType,
      urgency,
      geographic,
      demographics,
      coverage,
      requirements,
    };
  }

  private encodeGeographic(location: any): number[] {
    // State encoding (simplified - would use proper geographic encoding)
    const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
    const stateEncoding = states.map(state => location.state === state ? 1 : 0);
    
    // Urban/Rural classification (simplified)
    const urbanClassification = location.city ? 1 : 0;
    
    // Population density proxy (simplified)
    const populationDensity = urbanClassification * 0.8 + (1 - urbanClassification) * 0.2;

    return [...stateEncoding, urbanClassification, populationDensity];
  }

  private encodeDemographics(personalInfo: any): number[] {
    const demographics: number[] = [];

    // Age encoding
    if (personalInfo.age) {
      demographics.push(personalInfo.age / 100); // Normalized 0-1
    } else {
      demographics.push(0.5); // Default middle age
    }

    // Income encoding
    if (personalInfo.income) {
      demographics.push(Math.min(personalInfo.income / 200000, 1)); // Normalize to 200k
    } else {
      demographics.push(0.5);
    }

    // Profession risk encoding (simplified)
    const professionRiskMap: Record<string, number> = {
      'DOCTOR': 0.1, 'LAWYER': 0.2, 'ENGINEER': 0.3, 'TEACHER': 0.4,
      'SALES': 0.5, 'CONSTRUCTION': 0.8, 'ATHLETE': 0.9, 'STUNT_PERFORMER': 1.0
    };
    
    const profession = personalInfo.profession?.toUpperCase() || '';
    const riskScore = Object.entries(professionRiskMap).find(([key]) => 
      profession.includes(key)
    )?.[1] || 0.5;

    demographics.push(riskScore);

    return demographics;
  }

  private encodeCoverage(coverage: any): number[] {
    const features: number[] = [];

    // Current provider quality (simplified)
    const providerQualityMap: Record<string, number> = {
      'STATE_FARM': 0.8, 'GEICO': 0.9, 'ALLSTATE': 0.7, 'PROGRESSIVE': 0.8,
      'LIBERTY_MUTUAL': 0.7, 'FARMERS': 0.6, 'NATIONWIDE': 0.6, 'USAA': 0.9
    };
    
    const provider = coverage.currentProvider?.toUpperCase() || '';
    const qualityScore = Object.entries(providerQualityMap).find(([key]) => 
      provider.includes(key)
    )?.[1] || 0.5;

    features.push(qualityScore);

    // Policy maturity (time since last renewal)
    if (coverage.policyExpiryDate) {
      const daysUntilExpiry = Math.ceil(
        (coverage.policyExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      features.push(Math.min(daysUntilExpiry / 365, 1)); // Normalize to years
    } else {
      features.push(0.5); // No policy data
    }

    // Claims history
    features.push(Math.min((coverage.claims || 0) / 5, 1)); // Normalize to 5+ claims

    return features;
  }

  private encodeRequirements(requirements: any): number[] {
    const features: number[] = [];

    // Budget constraint
    if (requirements.budget) {
      features.push(Math.min(requirements.budget / 10000, 1)); // Normalize to 10k
    } else {
      features.push(0.5);
    }

    // Special features complexity
    features.push(Math.min(requirements.specialFeatures.length / 5, 1));

    // Risk factors
    features.push(Math.min(requirements.riskFactors.length / 10, 1));

    return features;
  }

  private categorizeIncome(income: number): string {
    if (income < 30000) return 'low income';
    if (income < 60000) return 'moderate income';
    if (income < 100000) return 'good income';
    if (income < 150000) return 'high income';
    return 'very high income';
  }

  private categorizeBudget(budget: number): string {
    if (budget < 1000) return 'basic budget';
    if (budget < 3000) return 'moderate budget';
    if (budget < 5000) return 'good budget';
    if (budget < 10000) return 'premium budget';
    return 'luxury budget';
  }

  /**
   * Generate embedding for a lead
   */
  async generateEmbedding(leadInput: LeadEmbeddingInput): Promise<LeadEmbeddingOutput> {
    const startTime = Date.now();

    try {
      // Create text representation
      const leadText = this.createLeadText(leadInput);

      // Generate embedding using OpenAI
      const embeddingResponse = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: leadText,
      });

      const vector = embeddingResponse.data[0].embedding;

      // Extract structured features
      const features = this.extractStructuredFeatures(leadInput);

      // Store in Qdrant
      await this.storeInVectorDB(leadInput.leadId, vector, leadInput, features);

      const processingTime = Date.now() - startTime;

      const output: LeadEmbeddingOutput = {
        leadId: leadInput.leadId,
        vector,
        embeddingModel: this.EMBEDDING_MODEL,
        features: {
          insuranceType: features.insuranceType,
          urgency: features.urgency,
          geographic: features.geographic,
          demographics: features.demographics,
          coverage: features.coverage,
          requirements: features.requirements,
        },
        metadata: {
          embeddingDimensions: vector.length,
          createdAt: new Date(),
          confidence: this.calculateEmbeddingConfidence(features),
          processingTime,
        },
      };

      console.log(`Generated embedding for lead ${leadInput.leadId} in ${processingTime}ms`);
      return output;

    } catch (error) {
      console.error(`Failed to generate embedding for lead ${leadInput.leadId}:`, error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Store embedding in vector database
   */
  private async storeInVectorDB(
    leadId: string, 
    vector: number[], 
    leadInput: LeadEmbeddingInput,
    features: LeadFeatures
  ): Promise<void> {
    try {
      await this.qdrant.upsert(this.COLLECTION_NAME, {
        points: [{
          id: leadId,
          vector,
          payload: {
            leadId,
            insuranceTypes: leadInput.leadData.insuranceTypes,
            urgency: leadInput.leadData.urgency,
            state: leadInput.leadData.geographicLocation.state,
            city: leadInput.leadData.geographicLocation.city,
            age: leadInput.leadData.personalInfo.age,
            income: leadInput.leadData.personalInfo.income,
            profession: leadInput.leadData.personalInfo.profession,
            currentProvider: leadInput.leadData.coverage.currentProvider,
            budget: leadInput.leadData.requirements.budget,
            specialFeatures: leadInput.leadData.requirements.specialFeatures,
            riskFactors: leadInput.leadData.requirements.riskFactors,
            source: leadInput.context?.source,
            campaign: leadInput.context?.campaign,
            createdAt: new Date().toISOString(),
            // Store structured features
            features: JSON.stringify(features),
          },
        }],
      });

      console.log(`Stored embedding for lead ${leadId} in vector database`);
    } catch (error) {
      console.error(`Failed to store embedding in vector DB:`, error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for embedding
   */
  private calculateEmbeddingConfidence(features: LeadFeatures): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on data completeness
    const insuranceTypeConfidence = features.insuranceType.some(v => v === 1) ? 0.2 : 0;
    const geographicConfidence = features.geographic.some(v => v === 1) ? 0.1 : 0;
    const demographicsConfidence = features.demographics.some(v => v > 0) ? 0.1 : 0;
    const coverageConfidence = features.coverage.some(v => v > 0) ? 0.1 : 0;

    confidence += insuranceTypeConfidence + geographicConfidence + 
                 demographicsConfidence + coverageConfidence;

    return Math.min(confidence, 1.0);
  }

  /**
   * Search for similar leads
   */
  async searchSimilarLeads(
    leadId: string, 
    limit = 10, 
    scoreThreshold = 0.7
  ): Promise<Array<{
    leadId: string;
    similarity: number;
    payload: any;
  }>> {
    try {
      // Get the embedding for the source lead
      const searchResult = await this.qdrant.search(this.COLLECTION_NAME, {
        vector: [], // This would need to be populated with actual vector
        limit: limit + 1, // +1 to exclude the source lead
        with_payload: true,
        with_vectors: false,
        score_threshold: scoreThreshold,
      });

      // Filter out the source lead
      const similarLeads = searchResult
        .filter(result => result.id !== leadId)
        .slice(0, limit);

      return similarLeads.map(result => ({
        leadId: result.id as string,
        similarity: result.score,
        payload: result.payload,
      }));

    } catch (error) {
      console.error(`Failed to search similar leads for ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Batch process multiple leads
   */
  async batchProcessLeads(leadInputs: LeadEmbeddingInput[]): Promise<LeadEmbeddingOutput[]> {
    const results: LeadEmbeddingOutput[] = [];
    const batchSize = 10; // Process in batches to avoid rate limiting

    console.log(`Processing ${leadInputs.length} leads in batches of ${batchSize}`);

    for (let i = 0; i < leadInputs.length; i += batchSize) {
      const batch = leadInputs.slice(i, i + batchSize);
      
      try {
        const batchPromises = batch.map(leadInput => 
          this.generateEmbedding(leadInput)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Failed to process lead ${batch[index].leadId}:`, result.reason);
          }
        });

        // Rate limiting delay
        if (i + batchSize < leadInputs.length) {
          await this.delay(1000); // 1 second delay between batches
        }

      } catch (error) {
        console.error(`Batch processing error at index ${i}:`, error);
      }
    }

    console.log(`Completed batch processing: ${results.length}/${leadInputs.length} successful`);
    return results;
  }

  /**
   * Initialize vector database collection
   */
  async initializeCollection(): Promise<void> {
    try {
      // Create collection if it doesn't exist
      await this.qdrant.createCollection(this.COLLECTION_NAME, {
        vectors: {
          size: this.VECTOR_DIMENSION,
          distance: 'Cosine',
        },
      });

      console.log(`Initialized vector collection: ${this.COLLECTION_NAME}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`Collection ${this.COLLECTION_NAME} already exists`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Clean up old embeddings
   */
  async cleanupOldEmbeddings(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // This would need to be implemented based on your retention policy
      // For now, return 0 as placeholder
      console.log(`Cleanup not implemented yet for embeddings older than ${olderThanDays} days`);
      return 0;
    } catch (error) {
      console.error('Failed to cleanup old embeddings:', error);
      return 0;
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    averageProcessingTime: number;
    modelUsed: string;
    vectorDimension: number;
    collectionName: string;
  }> {
    try {
      // This would query the vector database for statistics
      // For now, return mock data
      return {
        totalEmbeddings: 0,
        averageProcessingTime: 0,
        modelUsed: this.EMBEDDING_MODEL,
        vectorDimension: this.VECTOR_DIMENSION,
        collectionName: this.COLLECTION_NAME,
      };
    } catch (error) {
      console.error('Failed to get embedding stats:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const leadEmbeddingPipeline = new LeadEmbeddingPipeline();