import { PrismaClient } from '@prisma/client';
import { 
  PredictConversionRequest, 
  PredictConversionResponse, 
  PredictChurnRequest, 
  PredictChurnResponse,
  PredictLifetimeValueRequest,
  PredictLifetimeValueResponse,
  ConversionPrediction,
  ChurnPrediction,
  LifetimeValuePrediction,
  InsuranceType,
  ConversionFactor,
  ConversionRecommendation,
  ChurnIndicator,
  RetentionRecommendation,
  PolicyChurnPrediction,
  ValueFactor,
  CrossSellOpportunity
} from '@insuraince/types';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class PredictiveModelsService {
  /**
   * Predict conversion probability for a lead
   */
  async predictConversion(request: PredictConversionRequest): Promise<PredictConversionResponse> {
    try {
      logger.info('Predicting conversion probability', { leadId: request.leadId });

      // Check if prediction already exists and is recent
      const existingPrediction = await prisma.predictiveModels.findFirst({
        where: {
          leadId: request.leadId,
          predictionType: 'conversion',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
          }
        }
      });

      if (existingPrediction && existingPrediction.confidence > 0.8) {
        return {
          success: true,
          prediction: existingPrediction.primaryFactors as unknown as ConversionPrediction
        };
      }

      // Generate prediction using ML model
      const prediction = await this.generateConversionPrediction(request);

      // Store prediction for feedback loop
      await prisma.predictiveModels.create({
        data: {
          leadId: request.leadId,
          insuranceType: request.insuranceType,
          predictionType: 'conversion',
          probability: prediction.probability,
          confidence: prediction.confidence,
          primaryFactors: prediction.primaryFactors as unknown as any,
          timelinePrediction: prediction.timelinePrediction,
          recommendations: prediction.recommendations as unknown as any,
          modelAccuracy: null // Will be updated with actual outcome
        }
      });

      return {
        success: true,
        prediction
      };

    } catch (error) {
      logger.error('Error predicting conversion', { error, leadId: request.leadId });
      return {
        success: false,
        prediction: {} as ConversionPrediction,
        error: 'Failed to predict conversion probability'
      };
    }
  }

  /**
   * Predict churn probability for a client
   */
  async predictChurn(request: PredictChurnRequest): Promise<PredictChurnResponse> {
    try {
      logger.info('Predicting churn probability', { clientId: request.clientId });

      // Check for existing recent prediction
      const existingPrediction = await prisma.predictiveModels.findFirst({
        where: {
          clientId: request.clientId,
          predictionType: 'churn',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        }
      });

      if (existingPrediction && existingPrediction.confidence > 0.75) {
        return {
          success: true,
          prediction: existingPrediction.primaryFactors as unknown as ChurnPrediction
        };
      }

      // Generate churn prediction
      const prediction = await this.generateChurnPrediction(request);

      // Store prediction
      await prisma.predictiveModels.create({
        data: {
          clientId: request.clientId,
          insuranceType: InsuranceType.AUTO, // Default, will be refined
          predictionType: 'churn',
          probability: prediction.probability,
          confidence: prediction.confidence,
          primaryFactors: prediction.primaryIndicators as unknown as any,
          recommendations: prediction.retentionRecommendations as unknown as any,
          modelAccuracy: null
        }
      });

      return {
        success: true,
        prediction
      };

    } catch (error) {
      logger.error('Error predicting churn', { error, clientId: request.clientId });
      return {
        success: false,
        prediction: {} as ChurnPrediction,
        error: 'Failed to predict churn probability'
      };
    }
  }

  /**
   * Predict lifetime value for a client
   */
  async predictLifetimeValue(request: PredictLifetimeValueRequest): Promise<PredictLifetimeValueResponse> {
    try {
      logger.info('Predicting lifetime value', { clientId: request.clientId });

      // Generate LTV prediction based on current policies and demographics
      const prediction = await this.generateLTVPrediction(request);

      // Store prediction
      await prisma.predictiveModels.create({
        data: {
          clientId: request.clientId,
          insuranceType: InsuranceType.AUTO,
          predictionType: 'lifetime_value',
          predictedValue: prediction.predictedValue,
          confidence: 0.8, // Assume high confidence for stored model
          primaryFactors: prediction.contributingFactors as unknown as any,
          recommendations: prediction.crossSellOpportunities as unknown as any,
          modelAccuracy: null
        }
      });

      return {
        success: true,
        prediction
      };

    } catch (error) {
      logger.error('Error predicting lifetime value', { error, clientId: request.clientId });
      return {
        success: false,
        prediction: {} as LifetimeValuePrediction,
        error: 'Failed to predict lifetime value'
      };
    }
  }

  /**
   * Update model accuracy based on actual outcomes
   */
  async updateModelAccuracy(predictionId: string, actualOutcome: boolean, actualValue?: number) {
    try {
      const prediction = await prisma.predictiveModels.findUnique({
        where: { id: predictionId }
      });

      if (!prediction) {
        throw new Error('Prediction not found');
      }

      let accuracy = 0;
      
      if (prediction.predictionType === 'conversion') {
        const predictedConversion = prediction.probability || 0;
        accuracy = actualOutcome ? predictedConversion : (1 - predictedConversion);
      } else if (prediction.predictionType === 'churn') {
        const predictedChurn = prediction.probability || 0;
        accuracy = actualOutcome ? predictedChurn : (1 - predictedChurn);
      } else if (prediction.predictionType === 'lifetime_value' && actualValue !== undefined) {
        const predictedValue = prediction.predictedValue || 0;
        accuracy = 1 - Math.abs(predictedValue - actualValue) / Math.max(predictedValue, actualValue);
      }

      await prisma.predictiveModels.update({
        where: { id: predictionId },
        data: {
          modelAccuracy: accuracy
        }
      });

      logger.info('Model accuracy updated', { predictionId, accuracy });

    } catch (error) {
      logger.error('Error updating model accuracy', { error, predictionId });
    }
  }

  private async generateConversionPrediction(request: PredictConversionRequest): Promise<ConversionPrediction> {
    // Simulate ML model prediction
    // In real implementation, this would call actual ML model
    
    const baseProbability = 0.6;
    
    // Adjust based on insurance type
    const typeAdjustments: Record<InsuranceType, number> = {
      auto: 0.1,
      home: 0.05,
      life: -0.1,
      health: 0.0,
      commercial: -0.05
    };

    const adjustedProbability = Math.min(0.9, Math.max(0.1, 
      baseProbability + (typeAdjustments[request.insuranceType] || 0)
    ));

    const factors: ConversionFactor[] = [
      {
        factor: 'Complete contact information',
        weight: 0.2,
        description: 'Lead has provided email, phone, and address',
        impact: 'positive'
      },
      {
        factor: 'High engagement signals',
        weight: 0.15,
        description: 'Multiple page views and form interactions',
        impact: 'positive'
      },
      {
        factor: 'Immediate need indicated',
        weight: 0.25,
        description: 'Lead mentioned urgent timeline',
        impact: 'positive'
      }
    ];

    const recommendations: ConversionRecommendation[] = [
      {
        action: 'Immediate phone call',
        priority: 'high',
        expectedImpact: 25,
        timeframe: 'within 1 hour',
        channel: 'phone'
      },
      {
        action: 'Send personalized quote',
        priority: 'medium',
        expectedImpact: 15,
        timeframe: 'within 4 hours',
        channel: 'email'
      }
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
        quarter: 0.05
      },
      recommendations,
      similarLeads: {
        converted: 65,
        total: 120,
        conversionRate: 0.54
      },
      createdAt: new Date()
    };
  }

  private async generateChurnPrediction(request: PredictChurnRequest): Promise<ChurnPrediction> {
    // Simulate churn prediction based on client data
    
    const churnProbability = 0.25; // 25% churn risk
    
    const indicators: ChurnIndicator[] = [
      {
        indicator: 'Price shopping behavior',
        severity: 0.6,
        description: 'Client comparing rates online',
        timeframe: 'last 30 days'
      },
      {
        indicator: 'Multiple service calls',
        severity: 0.4,
        description: 'Increased support interactions',
        timeframe: 'last 15 days'
      }
    ];

    const recommendations: RetentionRecommendation[] = [
      {
        strategy: 'Offer loyalty discount',
        cost: 200,
        expectedImpact: 40,
        urgency: 'high',
        personalizations: ['Good driver discount', 'Multi-policy savings']
      },
      {
        strategy: 'Personal outreach from agent',
        cost: 50,
        expectedImpact: 25,
        urgency: 'medium',
        personalizations: ['Annual review', 'Coverage check-up']
      }
    ];

    const policyPredictions: PolicyChurnPrediction[] = [
      {
        policyId: 'policy_1',
        policyType: InsuranceType.AUTO,
        renewalProbability: 0.8,
        priceSensitivity: 0.6,
        competitorRisk: 'medium',
        factors: ['Rate competitiveness', 'No recent claims']
      }
    ];

    return {
      clientId: request.clientId,
      probability: churnProbability,
      confidence: 0.75,
      riskLevel: 'medium',
      primaryIndicators: indicators,
      retentionRecommendations: recommendations,
      policyPredictions,
      createdAt: new Date()
    };
  }

  private async generateLTVPrediction(request: PredictLifetimeValueRequest): Promise<LifetimeValuePrediction> {
    // Simulate LTV prediction
    
    const baseValue = 15000; // $15,000 base LTV
    
    // Adjust based on current policies
    const policyMultiplier = request.currentPolicies.reduce((acc, policy) => {
      const multipliers: Record<InsuranceType, number> = {
        auto: 1.0,
        home: 1.5,
        life: 2.0,
        health: 1.2,
        commercial: 3.0
      };
      return acc + (policy.premium * 3 * (multipliers[policy.type] || 1.0));
    }, 0);

    const predictedValue = baseValue + policyMultiplier;

    const factors: ValueFactor[] = [
      {
        factor: 'Multi-policy discount retention',
        contribution: 2500,
        description: 'High probability of retaining multiple policies'
      },
      {
        factor: 'Low churn risk profile',
        contribution: 1800,
        description: 'Historical data indicates low cancellation rate'
      }
    ];

    const crossSellOpportunities: CrossSellOpportunity[] = [
      {
        insuranceType: InsuranceType.HOME,
        probability: 0.6,
        estimatedValue: 3000,
        timeframe: 'next 6 months',
        recommendedApproach: 'Bundle discount offer'
      },
      {
        insuranceType: InsuranceType.LIFE,
        probability: 0.3,
        estimatedValue: 5000,
        timeframe: 'next 12 months',
        recommendedApproach: 'Life event trigger campaign'
      }
    ];

    return {
      clientId: request.clientId,
      predictedValue,
      confidenceInterval: {
        lower: predictedValue * 0.7,
        upper: predictedValue * 1.3
      },
      timeline: {
        year1: predictedValue * 0.15,
        year2: predictedValue * 0.25,
        year3: predictedValue * 0.30,
        year5: predictedValue * 0.30
      },
      contributingFactors: factors,
      crossSellOpportunities,
      createdAt: new Date()
    };
  }
}
