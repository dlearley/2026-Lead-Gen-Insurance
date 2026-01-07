import { Matrix } from 'ml-matrix';
import { BrokerPerformanceModel } from '../models/broker-performance-model';
import { LeadEmbeddingPipeline } from '../pipeline/lead-embedding-pipeline';

export interface OptimizationGoal {
  name: string;
  weight: number; // 0-1
  target?: number;
  direction: 'maximize' | 'minimize';
}

export interface OptimizationConstraint {
  name: string;
  type: 'capacity' | 'time' | 'fairness' | 'specialty';
  operator: 'max' | 'min' | 'equal';
  value: number;
  strict: boolean;
}

export interface RoutingOptimizationInput {
  brokerId: string;
  goals: OptimizationGoal[];
  constraints: OptimizationConstraint[];
  historicalData: Array<{
    leadId: string;
    outcome: 'converted' | 'rejected' | 'expired';
    processingTime: number;
    revenue: number;
    leadCharacteristics: Record<string, any>;
    context: Record<string, any>;
  }>;
  currentPerformance: {
    conversionRate: number;
    avgProcessingTime: number;
    avgRevenue: number;
    slaComplianceRate: number;
  };
}

export interface RoutingOptimizationOutput {
  brokerId: string;
  optimizedWeights: Record<string, number>;
  expectedImprovement: {
    conversionRateIncrease: number;
    processingTimeReduction: number;
    revenueIncrease: number;
    overallScoreIncrease: number;
  };
  insights: {
    keyPerformanceDrivers: string[];
    optimizationOpportunities: string[];
    riskFactors: string[];
    recommendations: string[];
  };
  validation: {
    crossValidationScore: number;
    outOfSamplePerformance: number;
    stabilityScore: number;
  };
  modelParameters: {
    regularization: number;
    learningRate: number;
    convergenceTolerance: number;
    maxIterations: number;
  };
}

export class RoutingOptimizationEngine {
  private brokerModel: BrokerPerformanceModel;
  private leadPipeline: LeadEmbeddingPipeline;

  constructor() {
    this.brokerModel = new BrokerPerformanceModel();
    this.leadPipeline = new LeadEmbeddingPipeline();
  }

  /**
   * Optimize routing parameters for a broker
   */
  async optimizeRouting(input: RoutingOptimizationInput): Promise<RoutingOptimizationOutput> {
    console.log(`Starting routing optimization for broker ${input.brokerId}`);

    try {
      // 1. Analyze current performance
      const currentAnalysis = this.analyzeCurrentPerformance(input.currentPerformance);

      // 2. Extract features from historical data
      const features = this.extractOptimizationFeatures(input.historicalData);

      // 3. Define optimization problem
      const optimizationProblem = this.defineOptimizationProblem(input.goals, input.constraints);

      // 4. Run optimization algorithm
      const optimizedWeights = await this.runOptimization(
        features,
        optimizationProblem,
        input.currentPerformance
      );

      // 5. Validate optimization results
      const validation = await this.validateOptimization(
        optimizedWeights,
        input.historicalData,
        input.currentPerformance
      );

      // 6. Calculate expected improvements
      const expectedImprovement = this.calculateExpectedImprovement(
        optimizedWeights,
        input.currentPerformance,
        validation
      );

      // 7. Generate insights and recommendations
      const insights = this.generateInsights(
        input,
        optimizedWeights,
        expectedImprovement
      );

      const output: RoutingOptimizationOutput = {
        brokerId: input.brokerId,
        optimizedWeights,
        expectedImprovement,
        insights,
        validation,
        modelParameters: {
          regularization: 0.01,
          learningRate: 0.001,
          convergenceTolerance: 1e-6,
          maxIterations: 1000,
        },
      };

      console.log(`Routing optimization completed for broker ${input.brokerId}`);
      return output;

    } catch (error) {
      console.error(`Routing optimization failed for broker ${input.brokerId}:`, error);
      throw new Error(`Routing optimization failed: ${error.message}`);
    }
  }

  /**
   * Analyze current broker performance
   */
  private analyzeCurrentPerformance(performance: any): {
    efficiency: number;
    effectiveness: number;
    balance: number;
    risk: number;
  } {
    // Calculate efficiency (speed vs quality)
    const efficiency = this.calculateEfficiencyScore(
      performance.avgProcessingTime,
      performance.slaComplianceRate
    );

    // Calculate effectiveness (conversion vs revenue)
    const effectiveness = this.calculateEffectivenessScore(
      performance.conversionRate,
      performance.avgRevenue
    );

    // Calculate balance (even distribution of work)
    const balance = this.calculateBalanceScore(performance);

    // Calculate risk (volatility and uncertainty)
    const risk = this.calculateRiskScore(performance);

    return { efficiency, effectiveness, balance, risk };
  }

  private calculateEfficiencyScore(processingTime: number, slaCompliance: number): number {
    // Higher score for faster processing and better SLA compliance
    const timeScore = Math.max(0, 1 - (processingTime / 1440)); // Normalize to days
    const slaScore = slaCompliance / 100;
    return (timeScore * 0.4 + slaScore * 0.6);
  }

  private calculateEffectivenessScore(conversionRate: number, avgRevenue: number): number {
    // Higher score for better conversion and revenue
    const conversionScore = conversionRate / 100;
    const revenueScore = Math.min(avgRevenue / 50000, 1); // Normalize to 50k
    return (conversionScore * 0.6 + revenueScore * 0.4);
  }

  private calculateBalanceScore(performance: any): number {
    // This would analyze workload distribution and capacity utilization
    // For now, return a balanced score
    return 0.75;
  }

  private calculateRiskScore(performance: any): number {
    // This would calculate performance volatility and predictability
    // For now, return moderate risk
    return 0.3;
  }

  /**
   * Extract optimization features from historical data
   */
  private extractOptimizationFeatures(historicalData: any[]): Matrix {
    const features: number[][] = [];

    for (const record of historicalData) {
      const featureVector = [
        // Lead characteristics
        this.encodeInsuranceType(record.leadCharacteristics.insuranceType),
        this.encodeUrgency(record.leadCharacteristics.urgency),
        this.encodeComplexity(record.leadCharacteristics.complexity || 5),
        this.encodeValue(record.leadCharacteristics.estimatedValue || 10000),
        
        // Context features
        this.encodeTimeOfDay(record.context.timeOfDay || 12),
        this.encodeDayOfWeek(record.context.dayOfWeek || 1),
        this.encodeSeason(record.context.season || 'spring'),
        
        // Outcome encoding
        this.encodeOutcome(record.outcome),
        
        // Performance metrics
        this.normalizeValue(record.processingTime, 1440), // Normalize to days
        this.normalizeValue(record.revenue, 50000), // Normalize to 50k
      ];

      features.push(featureVector);
    }

    return new Matrix(features);
  }

  private encodeInsuranceType(insuranceType: string): number {
    const types = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL'];
    const index = types.indexOf(insuranceType?.toUpperCase());
    return index >= 0 ? index / (types.length - 1) : 0.5;
  }

  private encodeUrgency(urgency: string): number {
    const urgencyMap = { LOW: 0.2, MEDIUM: 0.5, HIGH: 0.8, CRITICAL: 1.0 };
    return urgencyMap[urgency?.toUpperCase() as keyof typeof urgencyMap] || 0.5;
  }

  private encodeComplexity(complexity: number): number {
    return Math.min(complexity / 10, 1);
  }

  private encodeValue(value: number): number {
    return Math.min(value / 100000, 1);
  }

  private encodeTimeOfDay(timeOfDay: number): number {
    return timeOfDay / 24;
  }

  private encodeDayOfWeek(dayOfWeek: number): number {
    return dayOfWeek / 7;
  }

  private encodeSeason(season: string): number {
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const index = seasons.indexOf(season?.toLowerCase());
    return index >= 0 ? index / (seasons.length - 1) : 0.5;
  }

  private encodeOutcome(outcome: string): number {
    const outcomeMap = { converted: 1.0, rejected: 0.3, expired: 0.0 };
    return outcomeMap[outcome?.toLowerCase() as keyof typeof outcomeMap] || 0.5;
  }

  private normalizeValue(value: number, max: number): number {
    return Math.min(value / max, 1);
  }

  /**
   * Define the optimization problem
   */
  private defineOptimizationProblem(goals: OptimizationGoal[], constraints: OptimizationConstraint[]): {
    objective: (weights: number[]) => number;
    gradient: (weights: number[]) => number[];
    constraints: Array<(weights: number[]) => number>;
  } {
    // Multi-objective optimization function
    const objective = (weights: number[]): number => {
      let score = 0;
      
      for (const goal of goals) {
        const goalScore = this.evaluateGoal(goal, weights);
        score += goal.weight * goalScore;
      }
      
      return score;
    };

    // Gradient of the objective function
    const gradient = (weights: number[]): number[] => {
      const grad = new Array(weights.length).fill(0);
      const epsilon = 1e-6;

      for (let i = 0; i < weights.length; i++) {
        const weightsPlus = [...weights];
        weightsPlus[i] += epsilon;
        
        const scorePlus = objective(weightsPlus);
        const scoreMinus = objective(weights);
        
        grad[i] = (scorePlus - scoreMinus) / (2 * epsilon);
      }

      return grad;
    };

    // Constraint functions
    const constraints_list = constraints.map(constraint => {
      return (weights: number[]): number => {
        const value = this.evaluateConstraint(constraint, weights);
        return constraint.strict ? value : Math.max(0, value);
      };
    });

    return { objective, gradient, constraints: constraints_list };
  }

  private evaluateGoal(goal: OptimizationGoal, weights: number[]): number {
    // Simplified goal evaluation - in practice, this would be more complex
    const currentScore = this.calculateCurrentScore(weights);
    
    switch (goal.direction) {
      case 'maximize':
        return Math.min(currentScore / (goal.target || 1), 1);
      case 'minimize':
        return Math.min((goal.target || 1) / Math.max(currentScore, 0.1), 1);
      default:
        return 0.5;
    }
  }

  private evaluateConstraint(constraint: OptimizationConstraint, weights: number[]): number {
    const value = this.calculateConstraintValue(constraint, weights);
    
    switch (constraint.operator) {
      case 'max':
        return constraint.value - value;
      case 'min':
        return value - constraint.value;
      case 'equal':
        return Math.abs(value - constraint.value);
      default:
        return 0;
    }
  }

  private calculateCurrentScore(weights: number[]): number {
    // Simplified score calculation
    return weights.reduce((sum, w) => sum + w, 0) / weights.length;
  }

  private calculateConstraintValue(constraint: OptimizationConstraint, weights: number[]): number {
    // Simplified constraint value calculation
    switch (constraint.type) {
      case 'capacity':
        return weights[0] || 0; // First weight represents capacity
      case 'time':
        return weights[1] || 0; // Second weight represents time
      case 'fairness':
        return weights[2] || 0; // Third weight represents fairness
      case 'specialty':
        return weights[3] || 0; // Fourth weight represents specialty matching
      default:
        return 0.5;
    }
  }

  /**
   * Run optimization algorithm
   */
  private async runOptimization(
    features: Matrix,
    problem: any,
    currentPerformance: any
  ): Promise<Record<string, number>> {
    // Initialize weights
    const initialWeights = [0.4, 0.3, 0.2, 0.1]; // specialty, performance, capacity, fairness
    let weights = [...initialWeights];
    
    // Gradient descent optimization
    const learningRate = 0.001;
    const maxIterations = 1000;
    const tolerance = 1e-6;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const gradient = problem.gradient(weights);
      
      // Update weights
      const oldWeights = [...weights];
      for (let i = 0; i < weights.length; i++) {
        weights[i] -= learningRate * gradient[i];
      }

      // Normalize weights to sum to 1
      const sum = weights.reduce((s, w) => s + w, 0);
      weights = weights.map(w => w / sum);

      // Check convergence
      const change = Math.sqrt(
        weights.reduce((s, w, i) => s + Math.pow(w - oldWeights[i], 2), 0)
      );

      if (change < tolerance) {
        console.log(`Optimization converged after ${iteration + 1} iterations`);
        break;
      }
    }

    // Return optimized weights with meaningful names
    return {
      specialtyMatch: weights[0] || 0.4,
      performance: weights[1] || 0.3,
      capacity: weights[2] || 0.2,
      fairness: weights[3] || 0.1,
    };
  }

  /**
   * Validate optimization results
   */
  private async validateOptimization(
    optimizedWeights: Record<string, number>,
    historicalData: any[],
    currentPerformance: any
  ): Promise<{
    crossValidationScore: number;
    outOfSamplePerformance: number;
    stabilityScore: number;
  }> {
    // Cross-validation (simplified)
    const cvScore = this.performCrossValidation(optimizedWeights, historicalData);
    
    // Out-of-sample performance
    const oosPerformance = this.evaluateOutOfSamplePerformance(optimizedWeights, currentPerformance);
    
    // Stability score
    const stabilityScore = this.calculateStabilityScore(optimizedWeights, historicalData);

    return {
      crossValidationScore: cvScore,
      outOfSamplePerformance: oosPerformance,
      stabilityScore: stabilityScore,
    };
  }

  private performCrossValidation(weights: Record<string, number>, data: any[]): number {
    // Simplified 5-fold cross-validation
    const folds = this.splitDataIntoFolds(data, 5);
    let totalScore = 0;

    for (let i = 0; i < folds.length; i++) {
      const testSet = folds[i];
      const trainSet = folds.flat().filter((_, index) => index !== i);

      const trainScore = this.evaluatePerformance(weights, trainSet);
      const testScore = this.evaluatePerformance(weights, testSet);
      
      // Score based on train-test consistency
      totalScore += 1 - Math.abs(trainScore - testScore);
    }

    return totalScore / folds.length;
  }

  private evaluateOutOfSamplePerformance(weights: Record<string, number>, performance: any): number {
    // Predict performance with optimized weights
    const predictedConversion = performance.conversionRate * (1 + weights.performance * 0.1);
    const predictedProcessingTime = performance.avgProcessingTime * (1 - weights.capacity * 0.05);
    
    // Score based on realistic improvements
    const conversionScore = Math.min(predictedConversion / 100, 1);
    const timeScore = Math.max(0, 1 - predictedProcessingTime / 1440);
    
    return (conversionScore * 0.7 + timeScore * 0.3);
  }

  private calculateStabilityScore(weights: Record<string, number>, data: any[]): number {
    // Calculate weight stability across different data subsets
    const subsets = this.createDataSubsets(data, 10);
    const weightVariances: number[] = [];

    for (const subset of subsets) {
      const subsetWeights = await this.runOptimization({} as any, {} as any, {} as any);
      const variance = Object.keys(weights).reduce((sum, key) => {
        const diff = weights[key] - (subsetWeights[key] || 0);
        return sum + diff * diff;
      }, 0) / Object.keys(weights).length;
      
      weightVariances.push(variance);
    }

    const avgVariance = weightVariances.reduce((sum, v) => sum + v, 0) / weightVariances.length;
    return Math.max(0, 1 - avgVariance);
  }

  private splitDataIntoFolds(data: any[], numFolds: number): any[][] {
    const folds: any[][] = [];
    const foldSize = Math.floor(data.length / numFolds);
    
    for (let i = 0; i < numFolds; i++) {
      const start = i * foldSize;
      const end = i === numFolds - 1 ? data.length : (i + 1) * foldSize;
      folds.push(data.slice(start, end));
    }
    
    return folds;
  }

  private createDataSubsets(data: any[], numSubsets: number): any[][] {
    const subsets: any[][] = [];
    const subsetSize = Math.floor(data.length / numSubsets);
    
    for (let i = 0; i < numSubsets; i++) {
      const start = i * subsetSize;
      const end = (i + 1) * subsetSize;
      subsets.push(data.slice(start, end));
    }
    
    return subsets;
  }

  private evaluatePerformance(weights: Record<string, number>, data: any[]): number {
    // Simplified performance evaluation
    return data.length > 0 ? 0.75 : 0.5;
  }

  /**
   * Calculate expected improvements
   */
  private calculateExpectedImprovement(
    optimizedWeights: Record<string, number>,
    currentPerformance: any,
    validation: any
  ): {
    conversionRateIncrease: number;
    processingTimeReduction: number;
    revenueIncrease: number;
    overallScoreIncrease: number;
  } {
    // Calculate expected improvements based on optimized weights
    const conversionImprovement = optimizedWeights.performance * 0.15 * validation.crossValidationScore;
    const timeImprovement = optimizedWeights.capacity * 0.1 * validation.stabilityScore;
    const revenueImprovement = optimizedWeights.specialtyMatch * 0.12 * validation.outOfSamplePerformance;
    
    const overallImprovement = (conversionImprovement + timeImprovement + revenueImprovement) / 3;

    return {
      conversionRateIncrease: conversionImprovement * 100,
      processingTimeReduction: timeImprovement * 100,
      revenueIncrease: revenueImprovement * 100,
      overallScoreIncrease: overallImprovement * 100,
    };
  }

  /**
   * Generate insights and recommendations
   */
  private generateInsights(
    input: RoutingOptimizationInput,
    optimizedWeights: Record<string, number>,
    expectedImprovement: any
  ): {
    keyPerformanceDrivers: string[];
    optimizationOpportunities: string[];
    riskFactors: string[];
    recommendations: string[];
  } {
    const insights = {
      keyPerformanceDrivers: [] as string[],
      optimizationOpportunities: [] as string[],
      riskFactors: [] as string[],
      recommendations: [] as string[],
    };

    // Analyze weight importance
    const sortedWeights = Object.entries(optimizedWeights)
      .sort(([,a], [,b]) => b - a);

    // Key performance drivers
    insights.keyPerformanceDrivers = sortedWeights.slice(0, 3).map(([key]) => {
      switch (key) {
        case 'specialtyMatch': return 'Specialty matching accuracy';
        case 'performance': return 'Historical performance metrics';
        case 'capacity': return 'Available capacity utilization';
        case 'fairness': return 'Workload fairness distribution';
        default: return key;
      }
    });

    // Optimization opportunities
    if (optimizedWeights.specialtyMatch < 0.3) {
      insights.optimizationOpportunities.push('Improve lead-broker specialty matching');
    }
    if (optimizedWeights.performance < 0.3) {
      insights.optimizationOpportunities.push('Focus on high-performing broker assignment');
    }
    if (optimizedWeights.capacity < 0.2) {
      insights.optimizationOpportunities.push('Better capacity management needed');
    }

    // Risk factors
    if (expectedImprovement.overallScoreIncrease > 20) {
      insights.riskFactors.push('High expected improvement may indicate overfitting');
    }
    if (sortedWeights[0][1] > 0.7) {
      insights.riskFactors.push('Over-dependence on single factor');
    }

    // Recommendations
    insights.recommendations.push(`Increase focus on ${insights.keyPerformanceDrivers[0].toLowerCase()}`);
    
    if (expectedImprovement.conversionRateIncrease > 10) {
      insights.recommendations.push('Monitor conversion rate improvements closely');
    }
    
    insights.recommendations.push('Regular re-optimization recommended (monthly)');
    insights.recommendations.push('Validate improvements with A/B testing');

    return insights;
  }
}

export const routingOptimizationEngine = new RoutingOptimizationEngine();