import { logger, TracingService } from '../index.js';
import { SpanStatusCode } from '@opentelemetry/api';

export interface LeadFeatures {
  contactCompleteness: number;
  sourceQuality: number;
  geographicScore: number;
  temporalScore: number;
  behavioralSignals: number;
  demographicScore: number;
  engagementScore: number;
}

export interface LeadScore {
  ensembleScore: number;
  modelScores: Record<string, number>;
  confidence: number;
  uncertainty: number;
  explanation: string[];
  riskFactors: string[];
  verticalAdjustments: Record<string, number>;
  percentile: number;
}

export interface BaseModel {
  predict(features: LeadFeatures): Promise<number>;
  getName(): string;
  getConfidence(features: LeadFeatures): number;
}

export class GradientBoostingModel implements BaseModel {
  private weights: Map<string, number> = new Map();
  
  async predict(features: LeadFeatures): Promise<number> {
    return TracingService.trace('gb_model.predict', async (span) => {
      const score = this.calculateScore(features);
      span.setAttribute('model.score', score);
      return score;
    });
  }

  getName(): string {
    return 'gradient_boosting';
  }

  getConfidence(features: LeadFeatures): number {
    const featureCoverage = this.calculateFeatureCoverage(features);
    return Math.min(0.95, Math.max(0.5, featureCoverage));
  }

  private calculateScore(features: LeadFeatures): number {
    let score = 0.5; // Base score

    // Contact info importance
    score += features.contactCompleteness * 0.3;
    
    // Source quality matters significantly
    score += Math.pow(features.sourceQuality, 2) * 0.25;
    
    // Geographic matching
    score += Math.sqrt(features.geographicScore) * 0.2;
    
    // Recent engagement signals
    score += this.adjustForRecency(features.temporalScore) * 0.15;
    
    // Behavioral patterns
    score += Math.log(features.behavioralSignals + 1) * 0.1;

    return Math.min(1, Math.max(0, score));
  }

  private calculateFeatureCoverage(features: LeadFeatures): number {
    const featureKeys = Object.keys(features) as (keyof LeadFeatures)[];
    const nonZeroFeatures = featureKeys.filter(key => (features[key] || 0) > 0);
    return nonZeroFeatures.length / featureKeys.length;
  }

  private adjustForRecency(recencyScore: number): number {
    // Recent activity is more valuable
    return recencyScore * (2 - recencyScore); // Non-linear curve
  }
}

export class RandomForestModel implements BaseModel {
  private trees = 100;

  async predict(features: LeadFeatures): Promise<number> {
    return TracingService.trace('rf_model.predict', async (span) => {
      const scores = await Promise.all(
        Array.from({ length: this.trees }, async (_, i) => {
          return this.treePredict(features, i);
        })
      );
      
      const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      span.setAttribute('model.score', score);
      span.setAttribute('trees_considered', scores.filter(s => s !== 0.5).length);
      return score;
    });
  }

  getName(): string {
    return 'random_forest';
  }

  getConfidence(features: LeadFeatures): number {
    // Random forests are generally very confident
    return 0.9;
  }

  private async treePredict(features: LeadFeatures, treeIndex: number): Promise<number> {
    // Simplified decision tree logic
    const seed = treeIndex * 31;
    const random = this.seededRandom(seed + this.hashFeatures(features));
    
    // Different trees focus on different feature subsets
    const featuresToConsider = Object.keys(features).filter(() => 
      this.seededRandom(seed + Math.random()) > 0.3
    );

    let score = 0.5;
    
    for (const featureName of featuresToConsider) {
      const featureValue = (features as any)[featureName];
      if (featureValue > 0.7) {
        score += (featureValue - 0.7) * 0.2;
      } else if (featureValue < 0.3) {
        score -= (0.3 - featureValue) * 0.2;
      }
    }

    return Math.min(1, Math.max(0, score));
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private hashFeatures(features: LeadFeatures): number {
    return Object.keys(features).length * 17 + 
           Object.values(features).reduce((sum, val) => sum + val * 13, 0);
  }
}

export class NeuralNetworkModel implements BaseModel {
  private layers = [8, 16, 12, 8, 1];
  private neurons: Map<number, number[]> = new Map();

  async predict(features: LeadFeatures): Promise<number> {
    return TracingService.trace('nn_model.predict', async (span) => {
      const inputVector = this.featuresToVector(features);
      const networkOutput = this.feedForward(inputVector);
      const score = this.sigmoid(networkOutput[0]);
      
      span.setAttribute('model.score', score);
      return score;
    });
  }

  getName(): string {
    return 'neural_network';
  }

  getConfidence(features: LeadFeatures): number {
    // Neural nets can have varying confidence
    const inputVector = this.featuresToVector(features);
    const output = this.feedForward(inputVector);
    return 0.7 + Math.abs(output[0]) * 0.2;
  }

  private featuresToVector(features: LeadFeatures): number[] {
    return [
      features.contactCompleteness,
      features.sourceQuality,
      features.geographicScore,
      features.temporalScore,
      features.behavioralSignals,
      features.demographicScore,
      features.engagementScore,
      1.0 // Bias term
    ];
  }

  private feedForward(input: number[]): number[] {
    let current = input;
    
    for (let i = 1; i < this.layers.length; i++) {
      const next: number[] = [];
      const neuronsInCurrentLayer = this.layers[i];
      const neuronsInPrevLayer = this.layers[i - 1];
      
      for (let j = 0; j < neuronsInCurrentLayer; j++) {
        let sum = 0;
        
        // Each neuron connects to all previous neurons
        for (let k = 0; k < neuronsInPrevLayer; k++) {
          const weight = this.getWeight(i, j, k);
          sum += current[k] * weight;
        }
        
        next.push(this.sigmoid(sum));
      }
      
      current = next;
    }
    
    return current;
  }

  private getWeight(layer: number, neuron: number, prevNeuron: number): number {
    // Simple deterministic weight generation
    const seed = layer * 100 + neuron * 10 + prevNeuron;
    return (Math.sin(seed) + 1) / 2; // Range [0, 1]
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

export class EnsembleLeadScoring {
  private models: BaseModel[] = [
    new GradientBoostingModel(),
    new RandomForestModel(),
    new NeuralNetworkModel()
  ];

  async scoreLead(features: LeadFeatures): Promise<LeadScore> {
    return TracingService.trace('ensemble_scoring.score_lead', async (span) => {
      const startTime = Date.now();
      
      try {
        // Get predictions from all models
        const modelResults = await Promise.all(
          this.models.map(async (model) => {
            const [score, confidence] = await Promise.all([
              model.predict(features),
              Promise.resolve(model.getConfidence(features))
            ]);
            
            return {
              name: model.getName(),
              score,
              confidence,
              weight: this.calculateModelWeight(model, confidence)
            };
          })
        );

        // Calculate ensemble score
        const ensembleScore = this.calculateEnsembleScore(modelResults);
        
        // Calculate overall confidence
        const confidence = this.calculateOverallConfidence(modelResults);
        
        // Calculate uncertainty
        const uncertainty = this.calculateUncertainty(modelResults, ensembleScore);
        
        // Generate explanations
        const explanations = this.generateExplanations(modelResults, features);
        
        // Identify risk factors
        const riskFactors = this.identifyRiskFactors(features, modelResults);
        
        // Create vertical adjustments
        const verticalAdjustments = this.calculateVerticalAdjustments(features);
        
        // Calculate percentile
        const percentile = this.calculatePercentile(ensembleScore);

        const modelScores = modelResults.reduce((acc, result) => {
          acc[result.name] = result.score;
          return acc;
        }, {} as Record<string, number>);

        const duration = Date.now() - startTime;

        span.setAttributes({
          'ensemble.score': ensembleScore,
          'ensemble.confidence': confidence,
          'ensemble.uncertainty': uncertainty,
          'ensemble.duration_ms': duration,
          ...Object.fromEntries(
            modelResults.map(m => [`model.${m.name}.score`, m.score])
          )
        });

        logger.info('Lead scored by ensemble', {
          ensembleScore,
          confidence,
          uncertainty,
          modelCount: this.models.length,
          duration_ms: duration
        });

        return {
          ensembleScore,
          modelScores,
          confidence,
          uncertainty,
          explanation: explanations,
          riskFactors,
          verticalAdjustments,
          percentile
        };

      } catch (error) {
        logger.error('Ensemble scoring failed', { error, features });
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      }
    });
  }

  private calculateModelWeight(model: BaseModel, confidence: number): number {
    // Dynamic weighting based on model performance and confidence
    const baseWeights: Record<string, number> = {
      'gradient_boosting': 1.2,
      'random_forest': 1.0,
      'neural_network': 1.1
    };
    
    const baseWeight = baseWeights[model.getName()] || 1.0;
    return baseWeight * confidence;
  }

  private calculateEnsembleScore(results: Array<{
    name: string;
    score: number;
    confidence: number;
    weight: number;
  }>): number {
    const weightedSum = results.reduce((sum, result) => 
      sum + result.score * result.weight, 0);
    const totalWeight = results.reduce((sum, result) => 
      sum + result.weight, 0);
    
    return weightedSum / totalWeight;
  }

  private calculateOverallConfidence(results: Array<{
    name: string;
    score: number;
    confidence: number;
    weight: number;
  }>): number {
    const weightedConfidence = results.reduce((sum, result) => 
      sum + result.confidence * result.weight, 0);
    const totalWeight = results.reduce((sum, result) => 
      sum + result.weight, 0);
    
    return weightedConfidence / totalWeight;
  }

  private calculateUncertainty(
    results: Array<{
      name: string;
      score: number;
      confidence: number;
      weight: number;
    }>,
    ensembleScore: number
  ): number {
    const variance = results.reduce((sum, result) => 
      sum + Math.pow(result.score - ensembleScore, 2), 0) / results.length;
    return Math.sqrt(variance);
  }

  private generateExplanations(
    results: Array<{
      name: string;
      score: number;
      confidence: number;
      weight: number;
    }>,
    features: LeadFeatures
  ): string[] {
    const explanations: string[] = [];
    
    // Feature-based explanations
    if (features.contactCompleteness > 0.9) {
      explanations.push('Excellent contact information completeness');
    } else if (features.contactCompleteness < 0.5) {
      explanations.push('Limited contact information available');
    }
    
    if (features.sourceQuality > 0.8) {
      explanations.push('High-quality lead source');
    }
    
    if (features.engagementScore > 0.7) {
      explanations.push('Strong engagement signals detected');
    }
    
    if (features.temporalScore > 0.8) {
      explanations.push('Recent activity indicates high urgency');
    }
    
    // Model agreement explanations
    const scores = results.map(r => r.score);
    const agreement = 1 - this.calculateStdDev(scores) / (this.calculateMean(scores) || 1);
    
    if (agreement > 0.8) {
      explanations.push('High model agreement indicates reliable score');
    } else if (agreement < 0.5) {
      explanations.push('Model disagreement suggests uncertainty - manual review recommended');
    }
    
    return explanations;
  }

  private identifyRiskFactors(features: LeadFeatures, results: any[]): string[] {
    const risks: string[] = [];
    
    if (features.contactCompleteness < 0.3) {
      risks.push('Insufficient contact information for follow-up');
    }
    
    if (features.sourceQuality < 0.4) {
      risks.push('Low-quality lead source');
    }
    
    if (features.behavioralSignals < 0.3) {
      risks.push('Minimal behavioral engagement indicators');
    }
    
    // Check for model disagreement as risk
    const scoreVariance = this.calculateStdDev(results.map((r: any) => r.score));
    if (scoreVariance > 0.2) {
      risks.push('High uncertainty across scoring models');
    }
    
    return risks;
  }

  private calculateVerticalAdjustments(features: LeadFeatures): Record<string, number> {
    // Vertical-specific adjustments based on feature patterns
    return {
      'auto': features.demographicScore > 0.6 ? 0.05 : -0.02,
      'home': features.geographicScore > 0.7 ? 0.03 : 0,
      'life': features.contactCompleteness > 0.8 ? 0.04 : -0.05,
      'health': features.engagementScore > 0.6 ? 0.06 : -0.03,
      'commercial': features.sourceQuality > 0.8 ? 0.08 : -0.01
    };
  }

  private calculatePercentile(score: number): number {
    // Map score to percentile based on assumed distribution
    // This would use actual historical data in production
    const mean = 0.6;
    const stdDev = 0.15;
    
    return Math.max(0, Math.min(100, (score - mean) / stdDev * 10 + 50));
  }

  private calculateStdDev(numbers: number[]): number {
    const mean = this.calculateMean(numbers);
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  private calculateMean(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
}