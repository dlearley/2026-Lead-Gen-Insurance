import {
  ExperimentConfig,
  RecommendationExperiment,
  ExperimentMetrics,
  WinnerAnalysis,
  SegmentMetrics,
  Optimization,
  DateRange,
} from '@insurance/types';
import logger from '../logger.js';

/**
 * Service for A/B testing and recommendation optimization
 */
export class RecommendationOptimizationService {
  /**
   * Create A/B test for recommendation strategy
   */
  async createRecommendationExperiment(config: ExperimentConfig): Promise<RecommendationExperiment> {
    logger.info('Creating recommendation experiment', { name: config.name });

    // Validate experiment configuration
    this.validateExperimentConfig(config);

    // Create experiment record
    const experiment = {
      id: this.generateId(),
      name: config.name,
      recommendationStrategy: config.recommendationStrategy,
      variantAStrategy: config.variantAStrategy,
      variantBStrategy: config.variantBStrategy,
      status: 'active' as const,
      trafficPercentage: config.trafficPercentage,
      startDate: config.startDate,
      endDate: config.endDate,
      successMetric: config.successMetric,
      controlGroupPerformance: 0,
      createdAt: new Date(),
    };

    logger.info('Experiment created', { experimentId: experiment.id, name: config.name });

    return experiment;
  }

  /**
   * Get experiment metrics
   */
  async getExperimentMetrics(experimentId: string): Promise<ExperimentMetrics> {
    logger.info('Getting experiment metrics', { experimentId });

    // In a real implementation, this would query experiment data
    const metrics = await this.calculateExperimentMetrics(experimentId);

    return metrics;
  }

  /**
   * Determine winning recommendation strategy
   */
  async determineWinner(experimentId: string): Promise<WinnerAnalysis> {
    logger.info('Determining experiment winner', { experimentId });

    const metrics = await this.getExperimentMetrics(experimentId);

    // Perform statistical significance test
    const statisticalSignificance = this.calculateStatisticalSignificance(
      metrics.variantAMetrics,
      metrics.variantBMetrics,
    );

    let winner: 'A' | 'B' | 'inconclusive' = 'inconclusive';
    let improvementPercentage = 0;

    // Determine winner based on success metric
    if (statisticalSignificance > 0.95) {
      const metricToCompare = this.getMetricValue(metrics.variantAMetrics, metrics.successMetric);
      const metricB = this.getMetricValue(metrics.variantBMetrics, metrics.successMetric);

      if (metricA > metricB) {
        winner = 'A';
        improvementPercentage = ((metricA - metricB) / metricB) * 100;
      } else if (metricB > metricA) {
        winner = 'B';
        improvementPercentage = ((metricB - metricA) / metricA) * 100;
      }
    }

    // Calculate revenue impact
    const revenueImpact = this.calculateRevenueImpact(
      metrics,
      winner,
      improvementPercentage,
    );

    // Determine recommendation
    const recommendation = this.getRecommendation(
      winner,
      statisticalSignificance,
      improvementPercentage,
    );

    logger.info('Winner determined', { experimentId, winner, recommendation });

    return {
      winner,
      confidenceLevel: statisticalSignificance,
      improvementPercentage,
      revenueImpact,
      recommendation,
    };
  }

  /**
   * Analyze customer segment performance
   */
  async analyzeSegmentPerformance(segment: string, dateRange: DateRange): Promise<SegmentMetrics> {
    logger.info('Analyzing segment performance', { segment, dateRange });

    // In a real implementation, this would query segment-specific data
    return {
      segment,
      totalCustomers: 500,
      acceptanceRate: 0.18,
      conversionRate: 0.15,
      averageRevenue: 875,
      topPerformingStrategies: [
        'coverage_gap',
        'cross_sell',
        'bundle_recommendation',
      ],
      improvementOpportunities: [
        'Increase personalization based on customer life stage',
        'Optimize recommendation timing based on engagement patterns',
        'Improve content quality and reasoning explanations',
      ],
    };
  }

  /**
   * Get recommendation improvement recommendations
   */
  async identifyOptimizations(): Promise<Optimization[]> {
    logger.info('Identifying optimization opportunities');

    const optimizations: Optimization[] = [];

    // Analyze current performance
    const bottlenecks = await this.analyzeRecommendationBottlenecks();

    bottlenecks.forEach(bottleneck => {
      optimizations.push({
        type: bottleneck.type,
        description: bottleneck.description,
        expectedImprovement: bottleneck.impact,
        implementationEffort: bottleneck.effort,
        priority: this.calculatePriority(bottleneck),
      });
    });

    // Add model-specific optimizations
    optimizations.push({
      type: 'model_retraining',
      description: 'Retrain ML models with latest conversion data',
      expectedImprovement: 0.08,
      implementationEffort: 'medium',
      priority: 4,
    });

    optimizations.push({
      type: 'personalization_enhancement',
      description: 'Add more granular customer segmentation',
      expectedImprovement: 0.12,
      implementationEffort: 'medium',
      priority: 3,
    });

    optimizations.push({
      type: 'timing_optimization',
      description: 'Optimize recommendation delivery timing',
      expectedImprovement: 0.05,
      implementationEffort: 'low',
      priority: 5,
    });

    // Sort by priority
    optimizations.sort((a, b) => a.priority - b.priority);

    return optimizations;
  }

  /**
   * Get active experiments
   */
  async getActiveExperiments(): Promise<RecommendationExperiment[]> {
    logger.info('Getting active experiments');

    // In a real implementation, this would query active experiments
    return [
      {
        id: 'exp-1',
        name: 'Personalization Strategy Test',
        recommendationStrategy: 'personalization',
        variantAStrategy: { level: 'basic' },
        variantBStrategy: { level: 'advanced' },
        status: 'active',
        trafficPercentage: 0.5,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        successMetric: 'conversion_rate',
        controlGroupPerformance: 0.15,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'exp-2',
        name: 'Recommendation Count Test',
        recommendationStrategy: 'count',
        variantAStrategy: { count: 3 },
        variantBStrategy: { count: 5 },
        status: 'active',
        trafficPercentage: 0.3,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        successMetric: 'acceptance_rate',
        controlGroupPerformance: 0.18,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ];
  }

  /**
   * Pause experiment
   */
  async pauseExperiment(experimentId: string): Promise<void> {
    logger.info('Pausing experiment', { experimentId });

    // In a real implementation, this would update experiment status
  }

  /**
   * Resume experiment
   */
  async resumeExperiment(experimentId: string): Promise<void> {
    logger.info('Resuming experiment', { experimentId });

    // In a real implementation, this would update experiment status
  }

  /**
   * Get experiment history
   */
  async getExperimentHistory(limit: number = 20): Promise<RecommendationExperiment[]> {
    logger.info('Getting experiment history', { limit });

    // In a real implementation, this would query completed experiments
    return [
      {
        id: 'exp-3',
        name: 'UI Layout Test',
        recommendationStrategy: 'ui_layout',
        variantAStrategy: { layout: 'list' },
        variantBStrategy: { layout: 'cards' },
        status: 'completed',
        trafficPercentage: 0.5,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        successMetric: 'acceptance_rate',
        controlGroupPerformance: 0.18,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'exp-4',
        name: 'Reasoning Text Test',
        recommendationStrategy: 'reasoning',
        variantAStrategy: { showReasoning: false },
        variantBStrategy: { showReasoning: true },
        status: 'completed',
        trafficPercentage: 0.4,
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        successMetric: 'conversion_rate',
        controlGroupPerformance: 0.15,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
    ];
  }

  // ==================== PRIVATE METHODS ====================

  private validateExperimentConfig(config: ExperimentConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Experiment name is required');
    }

    if (!config.recommendationStrategy) {
      throw new Error('Recommendation strategy is required');
    }

    if (!config.variantAStrategy || !config.variantBStrategy) {
      throw new Error('Both variant A and variant B strategies are required');
    }

    if (config.trafficPercentage <= 0 || config.trafficPercentage > 1) {
      throw new Error('Traffic percentage must be between 0 and 1');
    }

    if (!config.successMetric) {
      throw new Error('Success metric is required');
    }

    if (!config.startDate) {
      throw new Error('Start date is required');
    }

    if (config.endDate && config.endDate <= config.startDate) {
      throw new Error('End date must be after start date');
    }
  }

  private async calculateExperimentMetrics(experimentId: string): Promise<ExperimentMetrics> {
    // In a real implementation, this would query experiment data
    return {
      experimentId,
      status: 'active',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalParticipants: 1000,
      variantAParticipants: 500,
      variantBParticipants: 500,
      variantAMetrics: {
        totalRecommendations: 500,
        acceptanceRate: 0.18,
        conversionRate: 0.15,
        averageRevenue: 875,
        customerSatisfaction: 4.2,
      },
      variantBMetrics: {
        totalRecommendations: 500,
        acceptanceRate: 0.20,
        conversionRate: 0.16,
        averageRevenue: 925,
        customerSatisfaction: 4.3,
      },
      statisticalSignificance: 0.97,
      winner: 'B',
    };
  }

  private calculateStatisticalSignificance(
    metricsA: ExperimentVariantMetrics,
    metricsB: ExperimentVariantMetrics,
  ): number {
    // Perform z-test for comparing two proportions
    const p1 = metricsA.acceptanceRate;
    const p2 = metricsB.acceptanceRate;
    const n1 = metricsA.totalRecommendations;
    const n2 = metricsB.totalRecommendations;

    const pooledProportion = (p1 * n1 + p2 * n2) / (n1 + n2);
    const standardError = Math.sqrt(pooledProportion * (1 - pooledProportion) * (1 / n1 + 1 / n2));

    if (standardError === 0) return 0;

    const zScore = Math.abs(p2 - p1) / standardError;

    // Convert z-score to p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(zScore));

    return 1 - pValue; // Return confidence level
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((0.254829592 * t + -0.284496736) * t + 1.421413741) * t + -1.453152027) * t + 1.061405429) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  private getMetricValue(metrics: ExperimentVariantMetrics, metricName: string): number {
    switch (metricName) {
      case 'acceptance_rate':
        return metrics.acceptanceRate;
      case 'conversion_rate':
        return metrics.conversionRate;
      case 'average_revenue':
        return metrics.averageRevenue;
      case 'customer_satisfaction':
        return metrics.customerSatisfaction;
      default:
        return metrics.acceptanceRate;
    }
  }

  private calculateRevenueImpact(
    metrics: ExperimentMetrics,
    winner: 'A' | 'B' | 'inconclusive',
    improvementPercentage: number,
  ): number {
    if (winner === 'inconclusive') return 0;

    const totalRecommendations = metrics.totalParticipants;
    const winnerMetrics = winner === 'A' ? metrics.variantAMetrics : metrics.variantBMetrics;
    const additionalConversions = totalRecommendations * (improvementPercentage / 100) * winnerMetrics.acceptanceRate;

    return Math.round(additionalConversions * winnerMetrics.averageRevenue);
  }

  private getRecommendation(
    winner: 'A' | 'B' | 'inconclusive',
    confidence: number,
    improvement: number,
  ): 'promote' | 'continue' | 'abort' {
    if (winner === 'inconclusive') {
      return 'continue';
    }

    if (confidence > 0.95 && improvement > 5) {
      return 'promote';
    }

    if (confidence < 0.8 || improvement < 2) {
      return 'abort';
    }

    return 'continue';
  }

  private async analyzeRecommendationBottlenecks(): Promise<Array<{
    type: string;
    description: string;
    impact: number;
    effort: 'low' | 'medium' | 'high';
  }>> {
    // In a real implementation, this would analyze performance data
    return [
      {
        type: 'relevance_scoring',
        description: 'Recommendation relevance scores can be improved with better personalization',
        impact: 0.12,
        effort: 'medium',
      },
      {
        type: 'timing',
        description: 'Optimize when recommendations are shown to customers',
        impact: 0.08,
        effort: 'low',
      },
      {
        type: 'content_quality',
        description: 'Improve recommendation explanations and reasoning text',
        impact: 0.10,
        effort: 'medium',
      },
      {
        type: 'model_accuracy',
        description: 'Retrain ML models with latest conversion data',
        impact: 0.08,
        effort: 'medium',
      },
      {
        type: 'segmentation',
        description: 'Add more granular customer segments for better targeting',
        impact: 0.15,
        effort: 'high',
      },
    ];
  }

  private calculatePriority(bottleneck: { type: string; impact: number; effort: 'low' | 'medium' | 'high' }): number {
    // Priority based on impact-to-effort ratio
    const effortScore = { low: 3, medium: 2, high: 1 }[bottleneck.effort];
    return Math.round((1 - bottleneck.impact) * 10 + (3 - effortScore));
  }

  private generateId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== TYPES ====================

interface ExperimentVariantMetrics {
  totalRecommendations: number;
  acceptanceRate: number;
  conversionRate: number;
  averageRevenue: number;
  customerSatisfaction: number;
}
