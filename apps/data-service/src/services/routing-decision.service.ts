import { routingRepository } from '../repositories/routing.repository';
import { brokerPerformanceAnalyzer } from './broker-performance-analyzer';
import { specialtyMatcher } from './specialty-matcher';
import { capacityPlanner } from './capacity-planner';
import { experimentService } from './experiment-service';

export interface RoutingRequest {
  leadId: string;
  leadData: any;
  urgency?: string;
  maxProcessingTime?: number;
  excludeBrokers?: string[];
  requireSpecialties?: string[];
  experimentId?: string;
}

export interface RoutingResponse {
  leadId: string;
  assignedBrokerId: string;
  routingScore: number;
  confidence: number;
  reasoning: {
    primary: string;
    factors: Record<string, number>;
    alternatives: Array<{
      brokerId: string;
      score: number;
      reason: string;
    }>;
  };
  performancePrediction: {
    expectedConversionRate: number;
    expectedProcessingTime: number;
    expectedRevenue: number;
  };
  metadata: {
    routingMethod: string;
    processingTime: number;
    experimentId?: string;
  };
}

export interface RoutingStrategy {
  name: string;
  weights: {
    specialty: number;
    performance: number;
    capacity: number;
    proximity: number;
    experiment: number;
  };
  enabled: boolean;
}

export class RoutingDecisionService {
  private readonly DEFAULT_STRATEGY: RoutingStrategy = {
    name: 'balanced',
    weights: {
      specialty: 0.35,
      performance: 0.30,
      capacity: 0.20,
      proximity: 0.10,
      experiment: 0.05,
    },
    enabled: true,
  };

  private readonly STRATEGIES: Map<string, RoutingStrategy> = new Map([
    ['balanced', this.DEFAULT_STRATEGY],
    ['performance', {
      name: 'performance',
      weights: { specialty: 0.20, performance: 0.50, capacity: 0.15, proximity: 0.10, experiment: 0.05 },
      enabled: true,
    }],
    ['specialty', {
      name: 'specialty',
      weights: { specialty: 0.60, performance: 0.20, capacity: 0.15, proximity: 0.05, experiment: 0.0 },
      enabled: true,
    }],
    ['capacity', {
      name: 'capacity',
      weights: { specialty: 0.25, performance: 0.25, capacity: 0.40, proximity: 0.10, experiment: 0.0 },
      enabled: true,
    }],
    ['experiment', {
      name: 'experiment',
      weights: { specialty: 0.30, performance: 0.25, capacity: 0.20, proximity: 0.10, experiment: 0.15 },
      enabled: true,
    }],
  ]);

  /**
   * Make routing decision for a lead
   */
  async makeRoutingDecision(request: RoutingRequest): Promise<RoutingResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting routing decision for lead ${request.leadId}`);

      // 1. Get all available brokers
      const availableBrokers = await this.getAvailableBrokers(request.excludeBrokers);
      
      if (availableBrokers.length === 0) {
        throw new Error('No available brokers found');
      }

      // 2. Check if lead should be part of an experiment
      const experimentAssignment = await this.checkExperimentAssignment(request);
      
      // 3. Calculate scores for each broker
      const brokerScores = await this.calculateBrokerScores(request, availableBrokers, experimentAssignment);
      
      // 4. Apply capacity constraints
      const validBrokers = await this.applyCapacityConstraints(brokerScores);
      
      if (validBrokers.length === 0) {
        throw new Error('No brokers available within capacity constraints');
      }

      // 5. Select best broker
      const selectedBroker = validBrokers[0];
      
      // 6. Generate performance prediction
      const performancePrediction = await this.predictPerformance(request, selectedBroker);
      
      // 7. Create detailed reasoning
      const reasoning = this.generateReasoning(brokerScores, selectedBroker, request);
      
      // 8. Log routing decision
      await this.logRoutingDecision({
        leadId: request.leadId,
        brokerId: selectedBroker.brokerId,
        score: selectedBroker.totalScore,
        reason: reasoning.primary,
        routingMethod: selectedBroker.routingMethod,
        confidence: selectedBroker.confidence,
        alternativeBrokers: validBrokers.slice(1, 4).map(b => b.brokerId),
        performanceOutcome: performancePrediction,
        optimizationApplied: true,
        experimentId: experimentAssignment?.experimentId,
      });

      // 9. Update broker capacity
      await capacityPlanner.assignLeadToBroker(selectedBroker.brokerId, request.leadId);

      const processingTime = Date.now() - startTime;
      console.log(`Routing decision completed in ${processingTime}ms`);

      return {
        leadId: request.leadId,
        assignedBrokerId: selectedBroker.brokerId,
        routingScore: selectedBroker.totalScore,
        confidence: selectedBroker.confidence,
        reasoning,
        performancePrediction,
        metadata: {
          routingMethod: selectedBroker.routingMethod,
          processingTime,
          experimentId: experimentAssignment?.experimentId,
        },
      };

    } catch (error) {
      console.error(`Routing decision failed for lead ${request.leadId}:`, error);
      
      // Fallback to simple round-robin assignment
      return this.fallbackRouting(request, availableBrokers);
    }
  }

  /**
   * Get available brokers based on criteria
   */
  private async getAvailableBrokers(excludeBrokers: string[] = []): Promise<any[]> {
    // Get active brokers
    const brokers = await routingRepository.getAllBrokerPerformanceMetrics();
    
    // Filter out excluded brokers
    const filteredBrokers = brokers.filter(broker => 
      !excludeBrokers.includes(broker.brokerId)
    );

    return filteredBrokers;
  }

  /**
   * Check if lead should be part of an experiment
   */
  private async checkExperimentAssignment(request: RoutingRequest): Promise<any | null> {
    if (!request.experimentId) {
      // Check for active experiments that might include this lead
      const activeExperiments = await experimentService.getActiveExperiments();
      
      for (const experiment of activeExperiments) {
        if (await this.isLeadEligibleForExperiment(request.leadData, experiment)) {
          return experimentService.assignLeadToExperiment(experiment.id, request.leadId);
        }
      }
      return null;
    }

    // Specific experiment assignment
    return experimentService.assignLeadToExperiment(request.experimentId, request.leadId);
  }

  /**
   * Calculate scores for all brokers
   */
  private async calculateBrokerScores(
    request: RoutingRequest, 
    brokers: any[], 
    experimentAssignment: any | null
  ): Promise<any[]> {
    const scores = [];

    for (const broker of brokers) {
      // Get broker's current optimization settings
      const optimization = await routingRepository.getRoutingOptimization(broker.brokerId);
      
      // Calculate individual factor scores
      const specialtyScore = await this.calculateSpecialtyScore(request, broker);
      const performanceScore = this.calculatePerformanceScore(broker);
      const capacityScore = await this.calculateCapacityScore(broker.brokerId);
      const proximityScore = this.calculateProximityScore(request.leadData, broker);
      const experimentScore = experimentAssignment ? this.calculateExperimentScore(broker, experimentAssignment) : 0;

      // Apply strategy weights
      const strategy = this.getCurrentStrategy(experimentAssignment?.experimentId);
      const weightedScores = {
        specialty: specialtyScore * strategy.weights.specialty,
        performance: performanceScore * strategy.weights.performance,
        capacity: capacityScore * strategy.weights.capacity,
        proximity: proximityScore * strategy.weights.proximity,
        experiment: experimentScore * strategy.weights.experiment,
      };

      const totalScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
      const confidence = this.calculateConfidence(weightedScores, totalScore);

      scores.push({
        brokerId: broker.brokerId,
        totalScore,
        confidence,
        routingMethod: strategy.name,
        scores: weightedScores,
        specialtyScore,
        performanceScore,
        capacityScore,
        proximityScore,
        experimentScore,
      });
    }

    // Sort by total score descending
    return scores.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calculate specialty match score
   */
  private async calculateSpecialtyScore(request: RoutingRequest, broker: any): Promise<number> {
    try {
      // First try semantic matching
      const matchingResults = await specialtyMatcher.findMatchingBrokers(request.leadId, 5);
      const brokerMatch = matchingResults.find(m => m.brokerId === broker.brokerId);
      
      if (brokerMatch) {
        return brokerMatch.weightedScore;
      }

      // Fallback to basic specialty matching
      const brokerSpecialties = broker.brokerId ? await routingRepository.getRoutingOptimization(broker.brokerId) : null;
      const specialties = brokerSpecialties?.specialties || [];
      
      return this.basicSpecialtyMatch(request.leadData, specialties);
    } catch (error) {
      console.warn(`Failed to calculate specialty score for broker ${broker.brokerId}:`, error);
      return this.basicSpecialtyMatch(request.leadData, []);
    }
  }

  /**
   * Basic specialty matching fallback
   */
  private basicSpecialtyMatch(leadData: any, brokerSpecialties: string[]): number {
    const leadInsuranceTypes = leadData.insuranceTypes || [leadData.insuranceType].filter(Boolean);
    
    if (leadInsuranceTypes.length === 0 || brokerSpecialties.length === 0) {
      return 50; // Neutral score
    }

    const matches = leadInsuranceTypes.filter(type => 
      brokerSpecialties.includes(type)
    ).length;

    return (matches / leadInsuranceTypes.length) * 100;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(broker: any): number {
    // Combine multiple performance metrics
    const conversionScore = Math.min(broker.conversionRate || 0, 100);
    const slaScore = broker.slaComplianceRate || 0;
    const revenueScore = Math.min((broker.revenueGenerated || 0) / 1000, 100); // Normalize revenue
    
    return (conversionScore * 0.5 + slaScore * 0.3 + revenueScore * 0.2);
  }

  /**
   * Calculate capacity score
   */
  private async calculateCapacityScore(brokerId: string): Promise<number> {
    try {
      const capacity = await routingRepository.getBrokerCapacity(brokerId);
      
      if (!capacity) {
        return 50; // Neutral score if no capacity data
      }

      // Higher score for lower load percentage
      const loadScore = Math.max(0, 100 - capacity.currentLoadPercentage);
      
      // Consider processing time - faster is better
      const speedScore = Math.max(0, 100 - (capacity.avgProcessingTime / 10));
      
      return (loadScore * 0.7 + speedScore * 0.3);
    } catch (error) {
      console.warn(`Failed to calculate capacity score for broker ${brokerId}:`, error);
      return 50;
    }
  }

  /**
   * Calculate geographic proximity score
   */
  private calculateProximityScore(leadData: any, broker: any): number {
    // Simple state matching for now
    const leadState = leadData.state;
    const brokerState = broker.state; // Would need to get from broker data
    
    if (!leadState || !brokerState) {
      return 50; // Neutral score
    }

    return leadState === brokerState ? 100 : 0;
  }

  /**
   * Calculate experiment assignment score
   */
  private calculateExperimentScore(broker: any, experimentAssignment: any): number {
    // Return high score for experiment assignment
    return experimentAssignment.group === 'treatment' ? 100 : 0;
  }

  /**
   * Apply capacity constraints to filter valid brokers
   */
  private async applyCapacityConstraints(brokerScores: any[]): Promise<any[]> {
    const validBrokers = [];

    for (const brokerScore of brokerScores) {
      const capacity = await routingRepository.getBrokerCapacity(brokerScore.brokerId);
      
      if (!capacity || capacity.currentLoadPercentage < 90) { // 90% threshold
        validBrokers.push(brokerScore);
      }
    }

    return validBrokers;
  }

  /**
   * Predict performance for selected broker
   */
  private async predictPerformance(request: RoutingRequest, selectedBroker: any): Promise<any> {
    try {
      const brokerPerformance = await routingRepository.getBrokerPerformanceMetrics(selectedBroker.brokerId);
      
      if (!brokerPerformance) {
        // Use default values if no historical data
        return {
          expectedConversionRate: 15,
          expectedProcessingTime: 240, // 4 hours
          expectedRevenue: 2000,
        };
      }

      // Adjust prediction based on lead characteristics
      const urgencyMultiplier = this.getUrgencyMultiplier(request.urgency || 'MEDIUM');
      const complexityMultiplier = this.getComplexityMultiplier(request.leadData.complexity || 5);
      
      return {
        expectedConversionRate: Math.min(brokerPerformance.conversionRate * urgencyMultiplier, 100),
        expectedProcessingTime: Math.round(brokerPerformance.avgProcessingTime * complexityMultiplier),
        expectedRevenue: Math.round(brokerPerformance.avgLeadValue * urgencyMultiplier),
      };
    } catch (error) {
      console.warn(`Failed to predict performance for broker ${selectedBroker.brokerId}:`, error);
      return {
        expectedConversionRate: 15,
        expectedProcessingTime: 240,
        expectedRevenue: 2000,
      };
    }
  }

  /**
   * Generate detailed reasoning for routing decision
   */
  private generateReasoning(brokerScores: any[], selectedBroker: any, request: RoutingRequest): any {
    const topAlternative = brokerScores[1];
    const scoreDifference = selectedBroker.totalScore - (topAlternative?.totalScore || 0);
    
    const primaryFactors = [];
    if (selectedBroker.specialtyScore > 80) primaryFactors.push('strong specialty match');
    if (selectedBroker.performanceScore > 80) primaryFactors.push('excellent performance history');
    if (selectedBroker.capacityScore > 80) primaryFactors.push('available capacity');
    
    const primary = `Assigned to broker ${selectedBroker.brokerId} based on ${primaryFactors.join(', ') || 'overall best score'}`;
    
    return {
      primary,
      factors: {
        specialty: selectedBroker.specialtyScore,
        performance: selectedBroker.performanceScore,
        capacity: selectedBroker.capacityScore,
        proximity: selectedBroker.proximityScore,
        confidence: selectedBroker.confidence,
      },
      alternatives: brokerScores.slice(1, 4).map((broker, index) => ({
        brokerId: broker.brokerId,
        score: broker.totalScore,
        reason: `Alternative ${index + 1} with score ${broker.totalScore.toFixed(2)}`,
      })),
      scoreDifference: scoreDifference > 0 ? scoreDifference.toFixed(2) : '0.00',
    };
  }

  /**
   * Log routing decision for analysis
   */
  private async logRoutingDecision(decisionData: any): Promise<void> {
    try {
      await routingRepository.createRoutingDecision(decisionData);
    } catch (error) {
      console.error('Failed to log routing decision:', error);
    }
  }

  /**
   * Get current routing strategy
   */
  private getCurrentStrategy(experimentId?: string): RoutingStrategy {
    // In a real implementation, this would check experiment configuration
    return this.DEFAULT_STRATEGY;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(weightedScores: Record<string, number>, totalScore: number): number {
    // Higher confidence when scores are more evenly distributed
    const scoreVariance = Object.values(weightedScores).reduce((sum, score) => {
      const diff = score - (totalScore / Object.keys(weightedScores).length);
      return sum + (diff * diff);
    }, 0) / Object.keys(weightedScores).length;

    const normalizedVariance = Math.min(scoreVariance / 100, 1);
    return Math.max(50, 100 - (normalizedVariance * 50));
  }

  /**
   * Fallback routing when main algorithm fails
   */
  private async fallbackRouting(request: RoutingRequest, availableBrokers: any[]): Promise<RoutingResponse> {
    // Simple round-robin or random selection
    const selectedBroker = availableBrokers[Math.floor(Math.random() * availableBrokers.length)];
    
    return {
      leadId: request.leadId,
      assignedBrokerId: selectedBroker.brokerId,
      routingScore: 50,
      confidence: 30,
      reasoning: {
        primary: `Fallback assignment to broker ${selectedBroker.brokerId}`,
        factors: { fallback: 50 },
        alternatives: [],
      },
      performancePrediction: {
        expectedConversionRate: 15,
        expectedProcessingTime: 240,
        expectedRevenue: 2000,
      },
      metadata: {
        routingMethod: 'fallback',
        processingTime: 0,
      },
    };
  }

  /**
   * Check if lead is eligible for experiment
   */
  private async isLeadEligibleForExperiment(leadData: any, experiment: any): Promise<boolean> {
    // Implementation would check lead against experiment segment rules
    return Math.random() < 0.1; // 10% random assignment for demo
  }

  /**
   * Get urgency multiplier for performance prediction
   */
  private getUrgencyMultiplier(urgency: string): number {
    const multipliers = {
      LOW: 0.8,
      MEDIUM: 1.0,
      HIGH: 1.2,
      CRITICAL: 1.5,
    };
    return multipliers[urgency as keyof typeof multipliers] || 1.0;
  }

  /**
   * Get complexity multiplier for performance prediction
   */
  private getComplexityMultiplier(complexity: number): number {
    // More complex leads take longer to process
    return 0.5 + (complexity / 10);
  }

  /**
   * Batch process routing decisions
   */
  async batchProcessRouting(requests: RoutingRequest[]): Promise<RoutingResponse[]> {
    const results: RoutingResponse[] = [];
    
    console.log(`Batch processing ${requests.length} routing decisions...`);
    
    for (const request of requests) {
      try {
        const result = await this.makeRoutingDecision(request);
        results.push(result);
      } catch (error) {
        console.error(`Batch routing failed for lead ${request.leadId}:`, error);
        // Continue with next request
      }
    }
    
    console.log(`Batch processing completed: ${results.length}/${requests.length} successful`);
    return results;
  }

  /**
   * Get routing analytics
   */
  async getRoutingAnalytics(dateFrom?: Date, dateTo?: Date) {
    return routingRepository.getRoutingEfficiencyMetrics(dateFrom, dateTo);
  }
}

export const routingDecisionService = new RoutingDecisionService();