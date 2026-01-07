import OpenAI from 'openai';
import { routingRepository } from '../repositories/routing.repository';
import { qdrantClient } from '../qdrant';

export interface SpecialtyVector {
  leadId: string;
  brokerId: string;
  specialtyMatch: number;
  semanticMatch: number;
  weightedScore: number;
  matchingFactors: {
    insuranceType: number;
    geographic: number;
    urgency: number;
    value: number;
    complexity: number;
  };
}

export interface LeadFeatures {
  insuranceTypes: string[];
  urgency: string;
  geographicLocation: {
    state: string;
    city?: string;
  };
  estimatedValue: number;
  complexity: number; // 1-10 scale
  specialRequirements: string[];
}

export interface BrokerSpecialties {
  brokerId: string;
  specialties: string[];
  insuranceTypes: string[];
  geographicCoverage: string[];
  expertiseLevel: Record<string, number>;
  maxLeadValue: number;
  capacity: number;
  performanceScore: number;
}

export class SpecialtyMatcher {
  private openai: OpenAI;
  private readonly QDRANT_LEADS_COLLECTION = 'lead_specialties';
  private readonly QDRANT_BROKERS_COLLECTION = 'broker_specialties';
  private readonly VECTOR_DIMENSION = 1536; // OpenAI ada-002 dimensions

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate and store lead embedding
   */
  async generateLeadEmbedding(leadId: string, leadData: any): Promise<void> {
    try {
      // Extract features from lead data
      const leadFeatures = this.extractLeadFeatures(leadData);
      
      // Create text representation for embedding
      const leadText = this.createLeadText(leadFeatures);
      
      // Generate embedding using OpenAI
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: leadText,
      });

      // Store embedding in database
      await routingRepository.createLeadEmbedding({
        leadId,
        vector: embedding.data[0].embedding,
        embeddingModel: 'text-embedding-ada-002',
        features: leadFeatures,
      });

      // Store in Qdrant for similarity search
      await qdrantClient.upsert(this.QDRANT_LEADS_COLLECTION, {
        points: [{
          id: leadId,
          vector: embedding.data[0].embedding,
          payload: {
            leadId,
            insuranceTypes: leadFeatures.insuranceTypes,
            urgency: leadFeatures.urgency,
            state: leadFeatures.geographicLocation.state,
            estimatedValue: leadFeatures.estimatedValue,
            complexity: leadFeatures.complexity,
            createdAt: new Date().toISOString(),
          },
        }],
      });

      console.log(`Generated and stored embedding for lead ${leadId}`);
    } catch (error) {
      console.error(`Failed to generate lead embedding for ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Generate and store broker embedding
   */
  async generateBrokerEmbedding(brokerId: string, brokerData: any): Promise<void> {
    try {
      // Extract specialties from broker data
      const brokerSpecialties = this.extractBrokerSpecialties(brokerId, brokerData);
      
      // Create text representation for embedding
      const brokerText = this.createBrokerText(brokerSpecialties);
      
      // Generate embedding using OpenAI
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: brokerText,
      });

      // Update routing optimization with embedding
      await routingRepository.upsertRoutingOptimization(brokerId, {
        specialties: brokerSpecialties.specialties,
        expertise: brokerSpecialties.expertiseLevel,
        embeddingVector: embedding.data[0].embedding,
        modelVersion: 'text-embedding-ada-002',
      });

      // Store in Qdrant for similarity search
      await qdrantClient.upsert(this.QDRANT_BROKERS_COLLECTION, {
        points: [{
          id: brokerId,
          vector: embedding.data[0].embedding,
          payload: {
            brokerId,
            specialties: brokerSpecialties.specialties,
            insuranceTypes: brokerSpecialties.insuranceTypes,
            geographicCoverage: brokerSpecialties.geographicCoverage,
            performanceScore: brokerSpecialties.performanceScore,
            capacity: brokerSpecialties.capacity,
            maxLeadValue: brokerSpecialties.maxLeadValue,
            createdAt: new Date().toISOString(),
          },
        }],
      });

      console.log(`Generated and stored embedding for broker ${brokerId}`);
    } catch (error) {
      console.error(`Failed to generate broker embedding for ${brokerId}:`, error);
      throw error;
    }
  }

  /**
   * Find best matching brokers for a lead
   */
  async findMatchingBrokers(leadId: string, limit = 10): Promise<SpecialtyVector[]> {
    try {
      // Get lead embedding
      const leadEmbedding = await routingRepository.getLeadEmbedding(leadId);
      if (!leadEmbedding) {
        throw new Error(`No embedding found for lead ${leadId}`);
      }

      // Search Qdrant for similar broker embeddings
      const searchResults = await qdrantClient.search(this.QDRANT_BROKERS_COLLECTION, {
        vector: leadEmbedding.vector,
        limit,
        with_payload: true,
        with_vectors: false,
      });

      // Calculate detailed matching scores
      const matchingScores: SpecialtyVector[] = [];

      for (const result of searchResults) {
        const brokerId = result.payload.brokerId as string;
        const semanticScore = result.score;

        // Get additional broker data for detailed matching
        const brokerOptimization = await routingRepository.getRoutingOptimization(brokerId);
        const brokerPerformance = await routingRepository.getBrokerPerformanceMetrics(brokerId);
        const brokerCapacity = await routingRepository.getBrokerCapacity(brokerId);

        // Calculate specialty matching factors
        const matchingFactors = await this.calculateMatchingFactors(leadId, brokerId, result.payload);
        
        // Calculate weighted score
        const weightedScore = this.calculateWeightedScore(
          semanticScore,
          matchingFactors,
          brokerPerformance,
          brokerCapacity
        );

        const specialtyVector: SpecialtyVector = {
          leadId,
          brokerId,
          specialtyMatch: this.calculateSpecialtyMatch(leadId, brokerId),
          semanticMatch: semanticScore,
          weightedScore,
          matchingFactors,
        };

        matchingScores.push(specialtyVector);

        // Store the matching result
        await routingRepository.createSpecialtyMatching({
          leadId,
          brokerId,
          specialtyMatch: specialtyVector.specialtyMatch,
          semanticMatch: semanticScore,
          weightedScore,
          matchingFactors,
        });
      }

      // Sort by weighted score descending
      return matchingScores.sort((a, b) => b.weightedScore - a.weightedScore);

    } catch (error) {
      console.error(`Failed to find matching brokers for lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Extract features from lead data
   */
  private extractLeadFeatures(leadData: any): LeadFeatures {
    return {
      insuranceTypes: leadData.insuranceTypes || [leadData.insuranceType].filter(Boolean),
      urgency: leadData.urgency || 'MEDIUM',
      geographicLocation: {
        state: leadData.state || 'UNKNOWN',
        city: leadData.city,
      },
      estimatedValue: this.estimateLeadValue(leadData),
      complexity: this.calculateLeadComplexity(leadData),
      specialRequirements: this.extractSpecialRequirements(leadData),
    };
  }

  /**
   * Extract specialties from broker data
   */
  private extractBrokerSpecialties(brokerId: string, brokerData: any): BrokerSpecialties {
    return {
      brokerId,
      specialties: brokerData.specializations || [],
      insuranceTypes: brokerData.specializations || [],
      geographicCoverage: [brokerData.state],
      expertiseLevel: this.calculateExpertiseLevel(brokerData),
      maxLeadValue: brokerData.maxLeadValue || 50000,
      capacity: brokerData.maxLeadCapacity || 10,
      performanceScore: brokerData.conversionRate || 0,
    };
  }

  /**
   * Create text representation of lead for embedding
   */
  private createLeadText(leadFeatures: LeadFeatures): string {
    let text = `Lead requiring ${leadFeatures.insuranceTypes.join(' and ')} insurance`;
    
    if (leadFeatures.geographicLocation.city) {
      text += ` in ${leadFeatures.geographicLocation.city}, ${leadFeatures.geographicLocation.state}`;
    } else {
      text += ` in ${leadFeatures.geographicLocation.state}`;
    }
    
    text += `. Urgency level: ${leadFeatures.urgency.toLowerCase()}`;
    text += `. Estimated value: $${leadFeatures.estimatedValue.toLocaleString()}`;
    text += `. Complexity level: ${leadFeatures.complexity}/10`;
    
    if (leadFeatures.specialRequirements.length > 0) {
      text += `. Special requirements: ${leadFeatures.specialRequirements.join(', ')}`;
    }
    
    return text;
  }

  /**
   * Create text representation of broker for embedding
   */
  private createBrokerText(brokerSpecialties: BrokerSpecialties): string {
    let text = `Insurance broker specializing in ${brokerSpecialties.specialties.join(', ')}`;
    text += ` serving ${brokerSpecialties.geographicCoverage.join(', ')}`;
    text += `. Performance score: ${brokerSpecialties.performanceScore}% conversion rate`;
    text += `. Capacity: ${brokerSpecialties.capacity} leads maximum`;
    text += `. Handles leads up to $${brokerSpecialties.maxLeadValue.toLocaleString()} value`;
    
    // Add expertise levels
    Object.entries(brokerSpecialties.expertiseLevel).forEach(([area, level]) => {
      if (level > 0.7) {
        text += `. Expert in ${area}`;
      }
    });
    
    return text;
  }

  /**
   * Calculate detailed matching factors
   */
  private async calculateMatchingFactors(
    leadId: string, 
    brokerId: string, 
    brokerPayload: any
  ) {
    const leadFeatures = await routingRepository.getLeadEmbedding(leadId);
    const leadData = leadFeatures?.features as LeadFeatures;

    return {
      insuranceType: this.calculateInsuranceTypeMatch(
        leadData?.insuranceTypes || [], 
        brokerPayload.insuranceTypes || []
      ),
      geographic: this.calculateGeographicMatch(
        leadData?.geographicLocation.state, 
        brokerPayload.geographicCoverage || []
      ),
      urgency: this.calculateUrgencyMatch(leadData?.urgency || 'MEDIUM'),
      value: this.calculateValueMatch(leadData?.estimatedValue || 0, brokerPayload.maxLeadValue || 0),
      complexity: this.calculateComplexityMatch(leadData?.complexity || 5, brokerPayload.performanceScore || 0),
    };
  }

  /**
   * Calculate weighted final score
   */
  private calculateWeightedScore(
    semanticScore: number,
    matchingFactors: any,
    brokerPerformance: any,
    brokerCapacity: any
  ): number {
    const SEMANTIC_WEIGHT = 0.4;
    const SPECIALTY_WEIGHT = 0.25;
    const PERFORMANCE_WEIGHT = 0.2;
    const CAPACITY_WEIGHT = 0.15;

    // Calculate individual scores
    const specialtyScore = Object.values(matchingFactors).reduce((sum: number, factor: any) => sum + factor, 0) / Object.keys(matchingFactors).length;
    
    const performanceScore = brokerPerformance ? (brokerPerformance.conversionRate / 100) * (brokerPerformance.slaComplianceRate / 100) : 0.5;
    
    const capacityScore = brokerCapacity ? Math.max(0, 1 - brokerCapacity.currentLoadPercentage / 100) : 0.5;

    // Weighted combination
    const weightedScore = 
      (semanticScore * SEMANTIC_WEIGHT) +
      (specialtyScore * SPECIALTY_WEIGHT) +
      (performanceScore * PERFORMANCE_WEIGHT) +
      (capacityScore * CAPACITY_WEIGHT);

    return Math.min(weightedScore * 100, 100); // Scale to 0-100
  }

  /**
   * Calculate specialty match score
   */
  private calculateSpecialtyMatch(leadId: string, brokerId: string): number {
    // This would compare lead requirements with broker specialties
    // For now, return a placeholder based on some basic logic
    return Math.random() * 100; // Replace with actual implementation
  }

  // Helper methods for matching calculations
  private calculateInsuranceTypeMatch(leadTypes: string[], brokerTypes: string[]): number {
    const matches = leadTypes.filter(type => brokerTypes.includes(type));
    return leadTypes.length > 0 ? (matches.length / leadTypes.length) * 100 : 0;
  }

  private calculateGeographicMatch(leadState: string, brokerCoverage: string[]): number {
    return brokerCoverage.includes(leadState) ? 100 : 0;
  }

  private calculateUrgencyMatch(urgency: string): number {
    const urgencyScores = { LOW: 50, MEDIUM: 75, HIGH: 90, CRITICAL: 100 };
    return urgencyScores[urgency as keyof typeof urgencyScores] || 75;
  }

  private calculateValueMatch(leadValue: number, maxBrokerValue: number): number {
    if (leadValue > maxBrokerValue) return 0;
    return Math.min((leadValue / maxBrokerValue) * 100, 100);
  }

  private calculateComplexityMatch(leadComplexity: number, brokerPerformance: number): number {
    // Higher complexity leads need higher-performing brokers
    const expectedPerformance = (leadComplexity / 10) * 100;
    return Math.min((brokerPerformance / expectedPerformance) * 100, 100);
  }

  private estimateLeadValue(leadData: any): number {
    // Simple estimation based on insurance type and other factors
    const baseValues = {
      LIFE: 25000,
      HEALTH: 15000,
      AUTO: 8000,
      HOME: 20000,
      COMMERCIAL: 50000,
    };
    
    const insuranceType = leadData.insuranceType || 'AUTO';
    return baseValues[insuranceType as keyof typeof baseValues] || 10000;
  }

  private calculateLeadComplexity(leadData: any): number {
    let complexity = 5; // Base complexity
    
    // Increase complexity based on factors
    if (leadData.urgency === 'HIGH' || leadData.urgency === 'CRITICAL') complexity += 2;
    if (leadData.insuranceTypes && leadData.insuranceTypes.length > 1) complexity += 1;
    if (leadData.estimatedValue && leadData.estimatedValue > 30000) complexity += 1;
    
    return Math.min(complexity, 10);
  }

  private extractSpecialRequirements(leadData: any): string[] {
    const requirements: string[] = [];
    
    if (leadData.currentProvider) requirements.push('has_current_coverage');
    if (leadData.policyExpiryDate) requirements.push('renewal_lead');
    if (leadData.urgency === 'CRITICAL') requirements.push('immediate_response');
    
    return requirements;
  }

  private calculateExpertiseLevel(brokerData: any): Record<string, number> {
    const expertise: Record<string, number> = {};
    
    if (brokerData.specializations) {
      brokerData.specializations.forEach((spec: string) => {
        expertise[spec] = 0.8 + (Math.random() * 0.2); // 0.8-1.0 range
      });
    }
    
    return expertise;
  }

  /**
   * Batch process embeddings for leads and brokers
   */
  async batchProcessEmbeddings(): Promise<void> {
    try {
      // Process recent leads without embeddings
      const recentLeads = await this.getLeadsWithoutEmbeddings();
      console.log(`Processing ${recentLeads.length} lead embeddings...`);
      
      for (const lead of recentLeads) {
        await this.generateLeadEmbedding(lead.id, lead);
        await this.delay(100); // Rate limiting
      }

      // Process brokers without embeddings
      const brokersWithoutEmbeddings = await this.getBrokersWithoutEmbeddings();
      console.log(`Processing ${brokersWithoutEmbeddings.length} broker embeddings...`);
      
      for (const broker of brokersWithoutEmbeddings) {
        await this.generateBrokerEmbedding(broker.id, broker);
        await this.delay(100); // Rate limiting
      }

      console.log('Batch embedding processing completed');
    } catch (error) {
      console.error('Batch embedding processing failed:', error);
      throw error;
    }
  }

  private async getLeadsWithoutEmbeddings() {
    // This would query for leads that don't have embeddings yet
    // For now, return empty array
    return [];
  }

  private async getBrokersWithoutEmbeddings() {
    // This would query for brokers that don't have embeddings yet
    // For now, return empty array
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const specialtyMatcher = new SpecialtyMatcher();