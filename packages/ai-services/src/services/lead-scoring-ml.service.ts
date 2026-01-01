import { logger } from '@insurance-lead-gen/core';
import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';

export interface LeadFeatures {
  // Contact completeness
  has_email: number;
  has_phone: number;
  has_full_name: number;
  has_address: number;
  has_zipcode: number;
  contact_completeness: number;
  
  // Engagement features
  form_completed: number;
  requested_quote: number;
  pages_visited: number;
  time_on_site: number;
  return_visitor: number;
  mobile_device: number;
  source_engagement_level: number;
  
  // Temporal features
  hour_of_day: number;
  day_of_week: number;
  is_weekend: number;
  is_business_hours: number;
  month: number;
  quarter: number;
  
  // Email features
  is_generic_email: number;
  
  // Agent features (optional, can be 0 if no agent assigned yet)
  agent_avg_response_time?: number;
  agent_conversion_rate?: number;
  agent_rating?: number;
  
  // Timing features (optional)
  time_to_assignment?: number;
  time_to_acceptance?: number;
  
  // Categorical features (encoded)
  source_encoded?: number;
  insuranceType_encoded?: number;
  state_encoded?: number;
  browser_encoded?: number;
  utm_source_encoded?: number;
  utm_medium_encoded?: number;
  utm_campaign_encoded?: number;
}

export interface MLLeadScore {
  leadId: string;
  score: number; // 0-100
  probability: number; // 0-1
  confidence: number; // 0-1
  qualityLevel: 'high' | 'medium' | 'low' | 'very_low';
  topFactors: Array<{
    feature: string;
    contribution: number;
    description: string;
  }>;
  modelVersion: string;
  modelType: string;
  vertical?: string;
  processingTimeMs: number;
  createdAt: Date;
}

export interface ModelConfig {
  name: string;
  version: string;
  path: string;
  thresholds: {
    high_quality: number;
    medium_quality: number;
    low_quality: number;
    very_low_quality: number;
  };
}

export class LeadScoringMLService {
  private models: Map<string, ort.InferenceSession> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private isInitialized = false;
  private featureNames: string[] = [];

  constructor(
    private modelsBasePath: string = path.join(__dirname, '../../../../ml-models/models')
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing ML Lead Scoring Service...');

      // Load ensemble model (primary model)
      await this.loadModel('ensemble', 'ensemble');
      
      // Load vertical-specific models
      await this.loadModel('pc', 'verticals/PC');
      await this.loadModel('health', 'verticals/HEALTH');
      await this.loadModel('commercial', 'verticals/COMMERCIAL');

      this.isInitialized = true;
      logger.info('ML Lead Scoring Service initialized successfully', {
        modelsLoaded: Array.from(this.models.keys())
      });
    } catch (error) {
      logger.error('Failed to initialize ML Lead Scoring Service', { error });
      throw error;
    }
  }

  private async loadModel(modelName: string, modelPath: string): Promise<void> {
    try {
      const fullPath = path.join(this.modelsBasePath, modelPath, `${modelName}_model.onnx`);
      
      // Check if ONNX model exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`ONNX model not found at ${fullPath}, skipping...`);
        return;
      }

      // Load ONNX model
      const session = await ort.InferenceSession.create(fullPath, {
        executionProviders: ['cpu']
      });

      this.models.set(modelName, session);
      
      // Load model config (thresholds, metadata)
      const configPath = path.join(this.modelsBasePath, modelPath, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.modelConfigs.set(modelName, config);
      }

      logger.info(`Loaded model: ${modelName} from ${fullPath}`);
    } catch (error) {
      logger.error(`Failed to load model: ${modelName}`, { error });
      // Don't throw - allow service to work with available models
    }
  }

  async scoreLead(
    leadId: string,
    features: LeadFeatures,
    vertical?: 'pc' | 'health' | 'commercial'
  ): Promise<MLLeadScore> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Determine which model to use
      const modelName = vertical && this.models.has(vertical) ? vertical : 'ensemble';
      const model = this.models.get(modelName);

      if (!model) {
        throw new Error(`Model not available: ${modelName}`);
      }

      // Prepare features tensor
      const featureTensor = this.prepareFeatureTensor(features);
      
      // Run inference
      const feeds = { input: featureTensor };
      const results = await model.run(feeds);
      
      // Extract probability (assuming output is named 'output' or 'probabilities')
      const outputName = model.outputNames[0];
      const outputData = results[outputName].data as Float32Array;
      
      // Probability of conversion (class 1)
      const probability = outputData[1] || outputData[0]; // Handle different output formats
      const score = probability * 100; // Convert to 0-100 scale

      // Determine quality level based on thresholds
      const config = this.modelConfigs.get(modelName);
      const qualityLevel = this.determineQualityLevel(probability, config);

      // Get top contributing factors (simplified - would need SHAP integration for real explanations)
      const topFactors = this.getTopFactors(features);

      // Calculate confidence (simplified)
      const confidence = this.calculateConfidence(probability);

      const processingTime = Date.now() - startTime;

      logger.info('Lead scored successfully', {
        leadId,
        score: score.toFixed(2),
        qualityLevel,
        modelName,
        processingTimeMs: processingTime
      });

      return {
        leadId,
        score: Math.round(score * 100) / 100,
        probability,
        confidence,
        qualityLevel,
        topFactors,
        modelVersion: config?.version || '2.0.0',
        modelType: modelName,
        vertical,
        processingTimeMs: processingTime,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to score lead', { error, leadId });
      throw error;
    }
  }

  private prepareFeatureTensor(features: LeadFeatures): ort.Tensor {
    // Prepare feature array in correct order
    const featureArray = [
      features.has_email,
      features.has_phone,
      features.has_full_name,
      features.has_address,
      features.has_zipcode,
      features.contact_completeness,
      features.form_completed,
      features.requested_quote,
      features.pages_visited,
      features.time_on_site,
      features.return_visitor,
      features.mobile_device,
      features.source_engagement_level,
      features.hour_of_day,
      features.day_of_week,
      features.is_weekend,
      features.is_business_hours,
      features.month,
      features.quarter,
      features.is_generic_email,
      features.agent_avg_response_time || 0,
      features.agent_conversion_rate || 0,
      features.agent_rating || 0,
      features.time_to_assignment || -1,
      features.time_to_acceptance || -1,
      features.source_encoded || 0,
      features.insuranceType_encoded || 0,
      features.state_encoded || 0,
      features.browser_encoded || 0,
      features.utm_source_encoded || 0,
      features.utm_medium_encoded || 0,
      features.utm_campaign_encoded || 0
    ];

    // Create 2D tensor (1 sample, N features)
    const tensor = new ort.Tensor('float32', Float32Array.from(featureArray), [1, featureArray.length]);
    return tensor;
  }

  private determineQualityLevel(
    probability: number,
    config?: ModelConfig
  ): 'high' | 'medium' | 'low' | 'very_low' {
    const thresholds = config?.thresholds || {
      high_quality: 0.8,
      medium_quality: 0.6,
      low_quality: 0.4,
      very_low_quality: 0.0
    };

    if (probability >= thresholds.high_quality) return 'high';
    if (probability >= thresholds.medium_quality) return 'medium';
    if (probability >= thresholds.low_quality) return 'low';
    return 'very_low';
  }

  private getTopFactors(features: LeadFeatures): Array<{
    feature: string;
    contribution: number;
    description: string;
  }> {
    // Simplified feature importance (in production, use SHAP values)
    const factors: Array<{ feature: string; contribution: number; description: string }> = [];

    if (features.requested_quote === 1) {
      factors.push({
        feature: 'requested_quote',
        contribution: 0.25,
        description: 'Lead requested a quote'
      });
    }

    if (features.contact_completeness >= 0.8) {
      factors.push({
        feature: 'contact_completeness',
        contribution: 0.20,
        description: 'Complete contact information provided'
      });
    }

    if (features.form_completed === 1) {
      factors.push({
        feature: 'form_completed',
        contribution: 0.18,
        description: 'Lead completed full form'
      });
    }

    if (features.source_engagement_level === 3) {
      factors.push({
        feature: 'source_engagement',
        contribution: 0.15,
        description: 'Lead from high-engagement source'
      });
    }

    if (features.pages_visited > 3) {
      factors.push({
        feature: 'pages_visited',
        contribution: 0.12,
        description: `Visited ${features.pages_visited} pages`
      });
    }

    // Sort by contribution and return top 5
    return factors.sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  }

  private calculateConfidence(probability: number): number {
    // Confidence is higher when probability is closer to 0 or 1 (more certain)
    // Lower when probability is around 0.5 (uncertain)
    const distance_from_middle = Math.abs(probability - 0.5);
    const confidence = distance_from_middle * 2; // Scale to 0-1
    return Math.round(confidence * 100) / 100;
  }

  async batchScore(
    leads: Array<{ leadId: string; features: LeadFeatures; vertical?: 'pc' | 'health' | 'commercial' }>
  ): Promise<MLLeadScore[]> {
    const startTime = Date.now();
    logger.info('Starting batch scoring', { count: leads.length });

    const results = await Promise.all(
      leads.map(lead => this.scoreLead(lead.leadId, lead.features, lead.vertical))
    );

    const totalTime = Date.now() - startTime;
    const throughput = (leads.length / totalTime) * 1000; // scores per second

    logger.info('Batch scoring completed', {
      count: leads.length,
      totalTimeMs: totalTime,
      throughput: throughput.toFixed(2),
      avgTimePerLead: (totalTime / leads.length).toFixed(2)
    });

    return results;
  }

  getModelInfo(): Array<{ name: string; loaded: boolean; config?: ModelConfig }> {
    return ['ensemble', 'pc', 'health', 'commercial'].map(name => ({
      name,
      loaded: this.models.has(name),
      config: this.modelConfigs.get(name)
    }));
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down ML Lead Scoring Service...');
    
    // ONNX Runtime sessions are automatically cleaned up
    this.models.clear();
    this.modelConfigs.clear();
    this.isInitialized = false;
    
    logger.info('ML Lead Scoring Service shut down successfully');
  }
}

// Singleton instance
let mlScoringServiceInstance: LeadScoringMLService | null = null;

export function getMLScoringService(modelsBasePath?: string): LeadScoringMLService {
  if (!mlScoringServiceInstance) {
    mlScoringServiceInstance = new LeadScoringMLService(modelsBasePath);
  }
  return mlScoringServiceInstance;
}
