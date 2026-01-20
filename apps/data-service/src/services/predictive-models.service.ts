import type {
  ChurnPrediction,
  ConversionPrediction,
  LifetimeValuePrediction,
  PredictChurnRequest,
  PredictChurnResponse,
  PredictConversionRequest,
  PredictConversionResponse,
  PredictLifetimeValueRequest,
  PredictLifetimeValueResponse,
  ConversionFactor,
  ConversionRecommendation,
  ChurnIndicator,
  RetentionRecommendation,
  PolicyChurnPrediction,
  ValueFactor,
  CrossSellOpportunity,
  InsuranceType,
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

type StoredPrediction<T> = {
  prediction: T;
  createdAtMs: number;
  confidence: number;
  modelAccuracy?: number;
};

export class PredictiveModelsService {
  private static conversionPredictions = new Map<string, StoredPrediction<ConversionPrediction>>();
  private static churnPredictions = new Map<string, StoredPrediction<ChurnPrediction>>();
  private static ltvPredictions = new Map<string, StoredPrediction<LifetimeValuePrediction>>();

  async predictConversion(request: PredictConversionRequest): Promise<PredictConversionResponse> {
    try {
      logger.info('Predicting conversion probability', { leadId: request.leadId });

      const existing = PredictiveModelsService.conversionPredictions.get(request.leadId);
      if (existing && Date.now() - existing.createdAtMs < 24 * 60 * 60 * 1000 && existing.confidence > 0.8) {
        return { success: true, prediction: existing.prediction };
      }

      const prediction = await this.generateConversionPrediction(request);
      PredictiveModelsService.conversionPredictions.set(request.leadId, {
        prediction,
        createdAtMs: Date.now(),
        confidence: prediction.confidence,
      });

      return { success: true, prediction };
    } catch (error) {
      logger.error('Error predicting conversion', { error, leadId: request.leadId });
      return {
        success: false,
        prediction: {} as ConversionPrediction,
        error: 'Failed to predict conversion probability',
      };
    }
  }

  async predictChurn(request: PredictChurnRequest): Promise<PredictChurnResponse> {
    try {
      logger.info('Predicting churn probability', { clientId: request.clientId });

      const existing = PredictiveModelsService.churnPredictions.get(request.clientId);
      if (existing && Date.now() - existing.createdAtMs < 7 * 24 * 60 * 60 * 1000 && existing.confidence > 0.75) {
        return { success: true, prediction: existing.prediction };
      }

      const prediction = await this.generateChurnPrediction(request);
      PredictiveModelsService.churnPredictions.set(request.clientId, {
        prediction,
        createdAtMs: Date.now(),
        confidence: prediction.confidence,
      });

      return { success: true, prediction };
    } catch (error) {
      logger.error('Error predicting churn', { error, clientId: request.clientId });
      return {
        success: false,
        prediction: {} as ChurnPrediction,
        error: 'Failed to predict churn probability',
      };
    }
  }

  async predictLifetimeValue(request: PredictLifetimeValueRequest): Promise<PredictLifetimeValueResponse> {
    try {
      logger.info('Predicting lifetime value', { clientId: request.clientId });

      const existing = PredictiveModelsService.ltvPredictions.get(request.clientId);
      if (existing && Date.now() - existing.createdAtMs < 24 * 60 * 60 * 1000 && existing.confidence > 0.75) {
        return { success: true, prediction: existing.prediction };
      }

      const prediction = await this.generateLTVPrediction(request);
      PredictiveModelsService.ltvPredictions.set(request.clientId, {
        prediction,
        createdAtMs: Date.now(),
        confidence: 0.8,
      });

      return { success: true, prediction };
    } catch (error) {
      logger.error('Error predicting lifetime value', { error, clientId: request.clientId });
      return {
        success: false,
        prediction: {} as LifetimeValuePrediction,
        error: 'Failed to predict lifetime value',
      };
    }
  }

  async updateModelAccuracy(predictionKey: string, actualOutcome: boolean, actualValue?: number): Promise<void> {
    const stored =
      PredictiveModelsService.conversionPredictions.get(predictionKey) ||
      PredictiveModelsService.churnPredictions.get(predictionKey) ||
      PredictiveModelsService.ltvPredictions.get(predictionKey);

    if (!stored) return;

    let accuracy = 0;

    const anyPred: any = stored.prediction;
    if (typeof anyPred?.probability === 'number') {
      const predicted = anyPred.probability;
      accuracy = actualOutcome ? predicted : 1 - predicted;
    } else if (typeof anyPred?.predictedValue === 'number' && actualValue !== undefined) {
      const predictedValue = anyPred.predictedValue;
      accuracy = 1 - Math.abs(predictedValue - actualValue) / Math.max(predictedValue, actualValue);
    }

    stored.modelAccuracy = accuracy;
    logger.info('Model accuracy updated', { predictionKey, accuracy });
  }

  private async generateConversionPrediction(request: PredictConversionRequest): Promise<ConversionPrediction> {
    const baseProbability = 0.6;

    const typeAdjustments: Record<InsuranceType, number> = {
      auto: 0.1,
      home: 0.05,
      life: -0.1,
      health: 0.0,
      commercial: -0.05,
    };

    const adjustedProbability = Math.min(
      0.9,
      Math.max(0.1, baseProbability + (typeAdjustments[request.insuranceType] || 0))
    );

    const factors: ConversionFactor[] = [
      {
        factor: 'Complete contact information',
        weight: 0.2,
        description: 'Lead has provided email, phone, and address',
        impact: 'positive',
      },
      {
        factor: 'High engagement signals',
        weight: 0.15,
        description: 'Multiple page views and form interactions',
        impact: 'positive',
      },
      {
        factor: 'Immediate need indicated',
        weight: 0.25,
        description: 'Lead mentioned urgent timeline',
        impact: 'positive',
      },
    ];

    const recommendations: ConversionRecommendation[] = [
      {
        action: 'Immediate phone call',
        priority: 'high',
        expectedImpact: 25,
        timeframe: 'within 1 hour',
        channel: 'phone',
      },
      {
        action: 'Send personalized quote',
        priority: 'medium',
        expectedImpact: 15,
        timeframe: 'within 4 hours',
        channel: 'email',
      },
    ];

    return {
      leadId: request.leadId,
      insuranceType: request.insuranceType,
      probability: adjustedProbability,
      confidence: 0.85,
      primaryFactors: factors,
      timelinePrediction: {
        immediate: 0.3,
        week: 0.5,
        month: 0.15,
        quarter: 0.05,
      },
      recommendations,
      similarLeads: {
        converted: 65,
        total: 120,
        conversionRate: 0.54,
      },
      createdAt: new Date(),
    };
  }

  private async generateChurnPrediction(request: PredictChurnRequest): Promise<ChurnPrediction> {
    const churnProbability = 0.25;

    const indicators: ChurnIndicator[] = [
      {
        indicator: 'Price shopping behavior',
        severity: 0.6,
        description: 'Client comparing rates online',
        timeframe: 'last 30 days',
      },
      {
        indicator: 'Multiple service calls',
        severity: 0.4,
        description: 'Increased support interactions',
        timeframe: 'last 15 days',
      },
    ];

    const recommendations: RetentionRecommendation[] = [
      {
        strategy: 'Offer loyalty discount',
        cost: 200,
        expectedImpact: 40,
        urgency: 'high',
        personalizations: ['Good driver discount', 'Multi-policy savings'],
      },
      {
        strategy: 'Personal outreach from agent',
        cost: 50,
        expectedImpact: 25,
        urgency: 'medium',
        personalizations: ['Annual review', 'Coverage check-up'],
      },
    ];

    const policyPredictions: PolicyChurnPrediction[] = [
      {
        policyId: request.policyIds[0] || 'policy_1',
        policyType: 'auto',
        renewalProbability: 0.8,
        priceSensitivity: 0.6,
        competitorRisk: 'medium',
        factors: ['Rate competitiveness', 'No recent claims'],
      },
    ];

    return {
      clientId: request.clientId,
      probability: churnProbability,
      confidence: 0.75,
      riskLevel: 'medium',
      primaryIndicators: indicators,
      retentionRecommendations: recommendations,
      policyPredictions,
      createdAt: new Date(),
    };
  }

  private async generateLTVPrediction(request: PredictLifetimeValueRequest): Promise<LifetimeValuePrediction> {
    const baseValue = 15000;

    const policyMultiplier = request.currentPolicies.reduce((acc, policy) => {
      const multipliers: Record<InsuranceType, number> = {
        auto: 1.0,
        home: 1.5,
        life: 2.0,
        health: 1.2,
        commercial: 3.0,
      };
      return acc + policy.premium * 3 * (multipliers[policy.type] || 1.0);
    }, 0);

    const predictedValue = baseValue + policyMultiplier;

    const factors: ValueFactor[] = [
      {
        factor: 'Multi-policy discount retention',
        contribution: 2500,
        description: 'High probability of retaining multiple policies',
      },
      {
        factor: 'Low churn risk profile',
        contribution: 1800,
        description: 'Historical data indicates low cancellation rate',
      },
    ];

    const crossSellOpportunities: CrossSellOpportunity[] = [
      {
        insuranceType: 'home',
        probability: 0.6,
        estimatedValue: 3000,
        timeframe: 'next 6 months',
        recommendedApproach: 'Bundle discount offer',
      },
      {
        insuranceType: 'life',
        probability: 0.3,
        estimatedValue: 5000,
        timeframe: 'next 12 months',
        recommendedApproach: 'Life event trigger campaign',
      },
    ];

    return {
      clientId: request.clientId,
      predictedValue,
      confidenceInterval: {
        lower: predictedValue * 0.7,
        upper: predictedValue * 1.3,
      },
      timeline: {
        year1: predictedValue * 0.15,
        year2: predictedValue * 0.25,
        year3: predictedValue * 0.3,
        year5: predictedValue * 0.3,
      },
      contributingFactors: factors,
      crossSellOpportunities,
      createdAt: new Date(),
    };
  }
}
