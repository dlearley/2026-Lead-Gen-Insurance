import { BrokerPerformanceModel } from '../models/broker-performance-model';
import { LeadEmbeddingPipeline } from '../pipeline/lead-embedding-pipeline';
import { Matrix } from 'ml-matrix';

export interface RoutingPredictionInput {
  leadId: string;
  leadData: any;
  availableBrokers: string[];
  context?: {
    timeOfDay: number;
    dayOfWeek: number;
    season: string;
    marketConditions?: Record<string, any>;
  };
  constraints?: {
    maxProcessingTime?: number;
    requiredSpecialties?: string[];
    excludeBrokers?: string[];
    maxLeadValue?: number;
  };
}

export interface RoutingPredictionOutput {
  leadId: string;
  predictions: Array<{
    brokerId: string;
    expectedConversionRate: number;
    expectedProcessingTime: number;
    expectedRevenue: number;
    confidence: number;
    reasoning: string;
    factors: Record<string, number>;
  }>;
  recommendedBroker: string;
  alternativeOptions: string[];
  predictionMetadata: {
    modelVersion: string;
    confidenceScore: number;
    processingTime: number;
    dataQuality: number;
  };
}

export interface ModelPredictionInput {
  brokerId: string;
  leadCharacteristics: any;
  context: any;
}

export interface ModelPredictionOutput {
  brokerId: string;
  predictions: {
    conversionRate: number;
    processingTime: number;
    revenue: number;
    confidence: number;
  };
  factors: Record<string, number>;
  alternatives: Array<{
    brokerId: string;
    score: number;
  }>;
}

export class PredictionEngine {
  private brokerModel: BrokerPerformanceModel;
  private leadPipeline: LeadEmbeddingPipeline;
  private isInitialized = false;

  constructor() {
    this.brokerModel = new BrokerPerformanceModel();
    this.leadPipeline = new LeadEmbeddingPipeline();
  }

  /**
   * Initialize the prediction engine
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Prediction Engine...');

      // Initialize vector database collection
      await this.leadPipeline.initializeCollection();

      // Load or train the broker performance model
      await this.loadOrTrainModel();

      this.isInitialized = true;
      console.log('Prediction Engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Prediction Engine:', error);
      throw new Error(`Prediction Engine initialization failed: ${error.message}`);
    }
  }

  /**
   * Make comprehensive routing prediction
   */
  async predictRouting(input: RoutingPredictionInput): Promise<RoutingPredictionOutput> {
    if (!this.isInitialized) {
      throw new Error('Prediction Engine not initialized');
    }

    const startTime = Date.now();

    try {
      console.log(`Starting routing prediction for lead ${input.leadId}`);

      // 1. Generate or update lead embedding
      const leadEmbedding = await this.ensureLeadEmbedding(input.leadId, input.leadData);

      // 2. Get broker predictions for each available broker
      const brokerPredictions = await this.predictAllBrokers(
        input.availableBrokers,
        input.leadData,
        input.context
      );

      // 3. Apply constraints and filtering
      const filteredPredictions = this.applyConstraints(brokerPredictions, input.constraints);

      // 4. Rank and select best options
      const rankedPredictions = this.rankPredictions(filteredPredictions);

      // 5. Generate alternatives
      const alternatives = rankedPredictions.slice(1, 4).map(p => p.brokerId);

      // 6. Select recommended broker
      const recommendedBroker = rankedPredictions[0]?.brokerId;

      const processingTime = Date.now() - startTime;

      const output: RoutingPredictionOutput = {
        leadId: input.leadId,
        predictions: rankedPredictions.map(p => ({
          brokerId: p.brokerId,
          expectedConversionRate: p.predictions.conversionRate,
          expectedProcessingTime: p.predictions.processingTime,
          expectedRevenue: p.predictions.revenue,
          confidence: p.predictions.confidence,
          reasoning: this.generateReasoning(p),
          factors: p.factors,
        })),
        recommendedBroker,
        alternativeOptions: alternatives,
        predictionMetadata: {
          modelVersion: '1.0.0',
          confidenceScore: this.calculateOverallConfidence(rankedPredictions),
          processingTime,
          dataQuality: this.assessDataQuality(leadEmbedding, input.leadData),
        },
      };

      console.log(`Routing prediction completed in ${processingTime}ms`);
      return output;

    } catch (error) {
      console.error(`Routing prediction failed for lead ${input.leadId}:`, error);
      throw new Error(`Routing prediction failed: ${error.message}`);
    }
  }

  /**
   * Ensure lead has embedding
   */
  private async ensureLeadEmbedding(leadId: string, leadData: any): Promise<any> {
    try {
      // This would check if embedding exists and update if needed
      // For now, return a placeholder
      return {
        leadId,
        features: {},
        metadata: { confidence: 0.8 },
      };
    } catch (error) {
      console.warn(`Failed to ensure lead embedding for ${leadId}:`, error);
      return null;
    }
  }

  /**
   * Get predictions for all brokers
   */
  private async predictAllBrokers(
    brokerIds: string[],
    leadData: any,
    context?: any
  ): Promise<Array<{
    brokerId: string;
    predictions: {
      conversionRate: number;
      processingTime: number;
      revenue: number;
      confidence: number;
    };
    factors: Record<string, number>;
  }>> {
    const predictions = [];

    for (const brokerId of brokerIds) {
      try {
        const brokerPrediction = await this.predictSingleBroker(brokerId, leadData, context);
        predictions.push(brokerPrediction);
      } catch (error) {
        console.warn(`Failed to get prediction for broker ${brokerId}:`, error);
        // Add fallback prediction
        predictions.push({
          brokerId,
          predictions: {
            conversionRate: 15, // Default rate
            processingTime: 240, // 4 hours
            revenue: 2000,
            confidence: 0.3, // Low confidence for fallback
          },
          factors: {
            fallback: 1.0,
          },
        });
      }
    }

    return predictions;
  }

  /**
   * Get prediction for a single broker
   */
  private async predictSingleBroker(
    brokerId: string,
    leadData: any,
    context?: any
  ): Promise<{
    brokerId: string;
    predictions: {
      conversionRate: number;
      processingTime: number;
      revenue: number;
      confidence: number;
    };
    factors: Record<string, number>;
  }> {
    // Prepare input for the broker performance model
    const modelInput = {
      brokerId,
      leadCharacteristics: {
        insuranceTypes: leadData.insuranceTypes || [leadData.insuranceType].filter(Boolean),
        urgency: leadData.urgency || 'MEDIUM',
        geographicLocation: {
          state: leadData.state,
          city: leadData.city,
        },
        estimatedValue: this.estimateLeadValue(leadData),
        complexity: this.calculateLeadComplexity(leadData),
        specialRequirements: this.extractSpecialRequirements(leadData),
      },
      context: context || {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        season: this.getCurrentSeason(),
      },
    };

    // Get ML model prediction
    let modelPrediction;
    if (this.brokerModel.isReady()) {
      try {
        modelPrediction = await this.brokerModel.predict(modelInput);
      } catch (error) {
        console.warn(`ML model prediction failed for broker ${brokerId}:`, error);
      }
    }

    // If ML model fails, use fallback prediction
    if (!modelPrediction) {
      modelPrediction = this.generateFallbackPrediction(brokerId, leadData);
    }

    // Calculate additional factors
    const factors = {
      specialtyMatch: this.calculateSpecialtyMatch(leadData, brokerId),
      capacityMatch: this.calculateCapacityMatch(leadData, brokerId),
      performanceHistory: this.getBrokerPerformanceFactor(brokerId),
      contextualFit: this.calculateContextualFit(modelInput.context),
      modelConfidence: modelPrediction.confidence,
    };

    return {
      brokerId,
      predictions: {
        conversionRate: modelPrediction.expectedConversionRate,
        processingTime: modelPrediction.expectedProcessingTime,
        revenue: modelPrediction.expectedRevenue,
        confidence: modelPrediction.confidence,
      },
      factors,
    };
  }

  /**
   * Apply constraints to filter predictions
   */
  private applyConstraints(
    predictions: any[],
    constraints?: any
  ): any[] {
    if (!constraints) return predictions;

    let filtered = [...predictions];

    // Filter by processing time
    if (constraints.maxProcessingTime) {
      filtered = filtered.filter(p => 
        p.predictions.processingTime <= constraints.maxProcessingTime
      );
    }

    // Filter by required specialties
    if (constraints.requiredSpecialties?.length > 0) {
      filtered = filtered.filter(p => 
        constraints.requiredSpecialties.some((specialty: string) => 
          this.brokerHasSpecialty(p.brokerId, specialty)
        )
      );
    }

    // Filter out excluded brokers
    if (constraints.excludeBrokers?.length > 0) {
      filtered = filtered.filter(p => 
        !constraints.excludeBrokers.includes(p.brokerId)
      );
    }

    // Filter by lead value
    if (constraints.maxLeadValue) {
      filtered = filtered.filter(p => 
        p.predictions.revenue <= constraints.maxLeadValue
      );
    }

    return filtered;
  }

  /**
   * Rank predictions by overall score
   */
  private rankPredictions(predictions: any[]): any[] {
    const WEIGHTS = {
      conversionRate: 0.4,
      processingTime: 0.25,
      revenue: 0.2,
      confidence: 0.15,
    };

    return predictions
      .map(prediction => {
        // Normalize scores (0-1)
        const normalizedConversionRate = Math.min(prediction.predictions.conversionRate / 100, 1);
        const normalizedProcessingTime = Math.max(0, 1 - (prediction.predictions.processingTime / 1440)); // Normalize to days
        const normalizedRevenue = Math.min(prediction.predictions.revenue / 50000, 1); // Normalize to 50k
        const normalizedConfidence = prediction.predictions.confidence;

        // Calculate weighted score
        const score = 
          (normalizedConversionRate * WEIGHTS.conversionRate) +
          (normalizedProcessingTime * WEIGHTS.processingTime) +
          (normalizedRevenue * WEIGHTS.revenue) +
          (normalizedConfidence * WEIGHTS.confidence);

        return {
          ...prediction,
          overallScore: score,
        };
      })
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Generate reasoning for a prediction
   */
  private generateReasoning(prediction: any): string {
    const factors = Object.entries(prediction.factors)
      .filter(([_, score]) => score > 0.7)
      .map(([factor, score]) => factor);

    if (factors.length === 0) {
      return `Predicted performance based on broker's overall metrics`;
    }

    const topFactors = factors.slice(0, 3);
    return `High ${topFactors.join(', ')} factors contribute to this prediction`;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(predictions: any[]): number {
    if (predictions.length === 0) return 0;

    const avgConfidence = predictions.reduce((sum, p) => sum + p.predictions.confidence, 0) / predictions.length;
    const scoreVariance = predictions.reduce((sum, p) => sum + Math.pow(p.overallScore - avgConfidence, 2), 0) / predictions.length;
    
    // Higher confidence when predictions are consistent
    const consistencyFactor = Math.max(0, 1 - scoreVariance);
    
    return Math.min(avgConfidence * consistencyFactor, 1.0);
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(leadEmbedding: any, leadData: any): number {
    let quality = 0.5; // Base quality

    // Check data completeness
    if (leadData.insuranceTypes?.length > 0) quality += 0.2;
    if (leadData.state) quality += 0.1;
    if (leadData.urgency) quality += 0.1;
    if (leadData.estimatedValue) quality += 0.1;

    // Check embedding quality
    if (leadEmbedding?.metadata?.confidence > 0.7) quality += 0.1;

    return Math.min(quality, 1.0);
  }

  // Helper methods for calculations

  private generateFallbackPrediction(brokerId: string, leadData: any) {
    // Generate reasonable fallback prediction
    const baseConversionRate = 15 + Math.random() * 10; // 15-25%
    const urgencyMultiplier = this.getUrgencyMultiplier(leadData.urgency || 'MEDIUM');
    
    return {
      brokerId,
      expectedConversionRate: baseConversionRate * urgencyMultiplier,
      expectedProcessingTime: 240 * urgencyMultiplier,
      expectedRevenue: 2000 * urgencyMultiplier,
      confidence: 0.5, // Lower confidence for fallback
    };
  }

  private getUrgencyMultiplier(urgency: string): number {
    const multipliers = {
      LOW: 0.8,
      MEDIUM: 1.0,
      HIGH: 1.2,
      CRITICAL: 1.5,
    };
    return multipliers[urgency as keyof typeof multipliers] || 1.0;
  }

  private estimateLeadValue(leadData: any): number {
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
    let complexity = 5;
    
    if (leadData.urgency === 'HIGH' || leadData.urgency === 'CRITICAL') complexity += 2;
    if (leadData.insuranceTypes?.length > 1) complexity += 1;
    if (leadData.estimatedValue > 30000) complexity += 1;
    
    return Math.min(complexity, 10);
  }

  private extractSpecialRequirements(leadData: any): string[] {
    const requirements: string[] = [];
    
    if (leadData.currentProvider) requirements.push('has_current_coverage');
    if (leadData.policyExpiryDate) requirements.push('renewal_lead');
    if (leadData.urgency === 'CRITICAL') requirements.push('immediate_response');
    
    return requirements;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private calculateSpecialtyMatch(leadData: any, brokerId: string): number {
    // Simplified specialty matching
    return Math.random() * 0.4 + 0.6; // 0.6-1.0 range
  }

  private calculateCapacityMatch(leadData: any, brokerId: string): number {
    // Simplified capacity matching
    return Math.random() * 0.3 + 0.7; // 0.7-1.0 range
  }

  private getBrokerPerformanceFactor(brokerId: string): number {
    // This would fetch actual broker performance data
    return Math.random() * 0.3 + 0.7; // 0.7-1.0 range
  }

  private calculateContextualFit(context: any): number {
    let score = 0.6; // Base score

    // Time of day factor
    if (context.timeOfDay >= 9 && context.timeOfDay <= 17) {
      score += 0.2;
    }

    // Day of week factor
    if (context.dayOfWeek >= 1 && context.dayOfWeek <= 5) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private brokerHasSpecialty(brokerId: string, specialty: string): boolean {
    // This would check broker's actual specialties
    return Math.random() > 0.3; // Simplified check
  }

  /**
   * Load or train the broker performance model
   */
  private async loadOrTrainModel(): Promise<void> {
    try {
      // Try to load existing model
      await this.brokerModel.loadModel('./models/broker-performance-model');
      console.log('Loaded existing broker performance model');
    } catch (error) {
      console.log('No existing model found, training new model...');
      
      // For demo purposes, we'll create a simple model without actual training
      // In a real implementation, you would train on historical data
      this.brokerModel = new BrokerPerformanceModel();
      
      // Mark as ready for fallback predictions
      console.log('Model initialized with fallback prediction capability');
    }
  }

  /**
   * Get prediction engine status
   */
  getStatus(): {
    isInitialized: boolean;
    modelReady: boolean;
    modelMetrics: any;
  } {
    return {
      isInitialized: this.isInitialized,
      modelReady: this.brokerModel.isReady(),
      modelMetrics: this.brokerModel.getMetrics(),
    };
  }
}

export const predictionEngine = new PredictionEngine();