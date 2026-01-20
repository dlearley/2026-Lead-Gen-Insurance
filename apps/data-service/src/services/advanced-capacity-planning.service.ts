/**
 * AI-Powered Capacity Planning & Forecasting Service
 * Phase 13.6: Predictive capacity planning with machine learning insights
 */

import { EventEmitter } from 'events';
import { logger } from '@insurance-lead-gen/core';

export interface CapacityForecast {
  resourceType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database' | 'connections';
  currentUsage: number;
  currentCapacity: number;
  utilizationRate: number;
  predictions: CapacityPrediction[];
  recommendations: CapacityRecommendation[];
  confidence: number;
  lastUpdated: Date;
}

export interface CapacityPrediction {
  timestamp: Date;
  predictedUsage: number;
  predictedCapacity: number;
  utilizationRate: number;
  confidence: number;
  factors: PredictionFactor[];
  scenario: 'baseline' | 'optimistic' | 'pessimistic';
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1, negative means reducing usage
  description: string;
  weight: number;
}

export interface CapacityRecommendation {
  id: string;
  resourceType: string;
  action: 'scale-up' | 'scale-out' | 'optimize' | 'archive' | 'migrate';
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  title: string;
  description: string;
  impact: {
    cost: string;
    performance: string;
    risk: string;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    steps: string[];
    risks: string[];
  };
  metrics: {
    expectedImprovement: string;
    costSavings?: string;
    riskReduction?: string;
  };
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
  createdAt: Date;
  estimatedCost?: number;
  roi?: number;
}

export interface CapacityTrend {
  resourceType: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter';
  growth: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  seasonality: SeasonalityPattern;
  anomalyScore: number;
  dataPoints: DataPoint[];
  forecastAccuracy: number;
}

export interface SeasonalityPattern {
  hourly: number[]; // 24 values for each hour
  daily: number[]; // 7 values for each day of week
  weekly: number[]; // 52 values for each week of year
  monthly: number[]; // 12 values for each month
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  confidence: number;
}

export interface BottleneckAnalysis {
  id: string;
  resourceType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: {
    currentImpact: string;
    projectedImpact: string;
    userExperience: string;
  };
  rootCause: string;
  solutions: BottleneckSolution[];
  timeline: {
    detected: Date;
    projectedCritical: Date;
    resolution?: Date;
  };
}

export interface BottleneckSolution {
  type: 'immediate' | 'short-term' | 'long-term';
  description: string;
  implementation: string;
  estimatedCost: number;
  effectiveness: number; // 0-1 scale
  timeline: string;
  risks: string[];
}

export interface CapacityDashboard {
  timestamp: Date;
  summary: {
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    criticalIssues: number;
    predictedIssues: number;
    costOptimizationOpportunities: number;
    lastAssessment: Date;
  };
  resources: {
    [resourceType: string]: {
      current: CapacityForecast;
      trend: CapacityTrend;
      bottleneck?: BottleneckAnalysis;
    };
  };
  recommendations: CapacityRecommendation[];
  alerts: CapacityAlert[];
}

export interface CapacityAlert {
  id: string;
  resourceType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold: number;
  currentValue: number;
  predictedValue?: number;
  timestamp: Date;
  resolved: boolean;
  resolutionTime?: Date;
}

export interface OptimizationOpportunity {
  id: string;
  type: 'cost_reduction' | 'performance_boost' | 'risk_mitigation' | 'efficiency_gain';
  resourceType: string;
  title: string;
  description: string;
  potentialSavings: number;
  implementationCost: number;
  roi: number;
  paybackPeriod: number; // days
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  risks: string[];
  steps: string[];
}

export class AdvancedCapacityPlanningService extends EventEmitter {
  private historicalData: Map<string, DataPoint[]> = new Map();
  private forecasts: Map<string, CapacityForecast> = new Map();
  private trends: Map<string, CapacityTrend> = new Map();
  private bottlenecks: Map<string, BottleneckAnalysis> = new Map();
  private alerts: Map<string, CapacityAlert> = new Map();
  private optimizationOpportunities: Map<string, OptimizationOpportunity> = new Map();
  
  // ML/AI components (simplified for implementation)
  private forecastingModel: any = null;
  private anomalyDetector: any = null;
  private trendAnalyzer: any = null;
  
  // Configuration
  private readonly FORECAST_HORIZON = 90; // days
  private readonly ANOMALY_THRESHOLD = 2.5; // standard deviations
  private readonly CRITICAL_UTILIZATION = 0.85; // 85%
  private readonly WARNING_UTILIZATION = 0.70; // 70%
  private readonly ANALYSIS_RETENTION_DAYS = 180;

  constructor() {
    super();
    this.initializeMLModels();
    this.startPeriodicAnalysis();
  }

  /**
   * Initialize ML models for forecasting and analysis
   */
  private async initializeMLModels(): Promise<void> {
    // In a real implementation, this would load trained ML models
    // For this demo, we'll simulate the model initialization
    this.forecastingModel = {
      forecast: async (data: number[], horizon: number) => {
        return this.generateSyntheticForecast(data, horizon);
      },
      predictTrend: async (data: number[]) => {
        return this.analyzeTrend(data);
      },
      detectSeasonality: async (data: number[]) => {
        return this.detectSeasonalPatterns(data);
      }
    };

    this.anomalyDetector = {
      detect: async (data: number[]) => {
        return this.detectAnomalies(data);
      }
    };

    this.trendAnalyzer = {
      analyze: async (data: DataPoint[]) => {
        return this.analyzeComplexTrend(data);
      }
    };

    logger.info('ML models initialized for capacity planning');
  }

  /**
   * Generate comprehensive capacity forecast
   */
  async generateCapacityForecast(resourceType: string, options?: {
    horizon?: number;
    includeRecommendations?: boolean;
    scenario?: 'baseline' | 'optimistic' | 'pessimistic';
  }): Promise<CapacityForecast> {
    const horizon = options?.horizon || this.FORECAST_HORIZON;
    const scenario = options?.scenario || 'baseline';
    
    try {
      // Get historical data
      const historicalData = this.getHistoricalData(resourceType);
      
      if (historicalData.length === 0) {
        throw new Error(`No historical data available for ${resourceType}`);
      }

      // Generate forecast using ML model
      const predictions = await this.forecastingModel.forecast(
        historicalData.map(d => d.value), 
        horizon
      );

      // Calculate current metrics
      const currentUsage = historicalData[historicalData.length - 1]?.value || 0;
      const currentCapacity = this.getCurrentCapacity(resourceType);
      const utilizationRate = currentCapacity > 0 ? currentUsage / currentCapacity : 0;

      // Generate predictions array
      const capacityPredictions: CapacityPrediction[] = [];
      const now = new Date();

      for (let i = 0; i < predictions.length; i++) {
        const timestamp = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const predictedUsage = predictions[i];
        const confidence = this.calculateForecastConfidence(i, historicalData.length);
        
        capacityPredictions.push({
          timestamp,
          predictedUsage,
          predictedCapacity: this.getFutureCapacity(resourceType, i + 1),
          utilizationRate: this.getFutureCapacity(resourceType, i + 1) > 0 ? predictedUsage / this.getFutureCapacity(resourceType, i + 1) : 0,
          confidence,
          factors: await this.generatePredictionFactors(resourceType, predictedUsage, i + 1),
          scenario
        });
      }

      // Generate recommendations if requested
      const recommendations = options?.includeRecommendations 
        ? await this.generateRecommendations(resourceType, capacityPredictions)
        : [];

      const forecast: CapacityForecast = {
        resourceType: resourceType as any,
        currentUsage,
        currentCapacity,
        utilizationRate,
        predictions: capacityPredictions,
        recommendations,
        confidence: this.calculateOverallConfidence(capacityPredictions),
        lastUpdated: new Date()
      };

      // Store forecast
      this.forecasts.set(resourceType, forecast);

      // Generate alerts if needed
      await this.generateCapacityAlerts(resourceType, forecast);

      logger.info('Capacity forecast generated', {
        resourceType,
        horizon,
        predictions: predictions.length,
        confidence: forecast.confidence
      });

      return forecast;
    } catch (error) {
      logger.error('Failed to generate capacity forecast', { resourceType, error });
      throw error;
    }
  }

  /**
   * Analyze capacity trends with ML insights
   */
  async analyzeCapacityTrend(resourceType: string, period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<CapacityTrend> {
    try {
      const historicalData = this.getHistoricalData(resourceType);
      
      if (historicalData.length === 0) {
        throw new Error(`No historical data available for ${resourceType}`);
      }

      // Analyze trend using ML model
      const trendAnalysis = await this.trendAnalyzer.analyze(historicalData);
      
      // Detect seasonality patterns
      const seasonality = await this.forecastingModel.detectSeasonality(
        historicalData.map(d => d.value)
      );

      // Calculate growth rate
      const growth = this.calculateGrowthRate(historicalData);
      
      // Determine trend direction
      let trend: 'increasing' | 'stable' | 'decreasing';
      if (growth > 0.05) trend = 'increasing';
      else if (growth < -0.05) trend = 'decreasing';
      else trend = 'stable';

      // Detect anomalies
      const anomalyScore = await this.calculateAnomalyScore(historicalData);

      const capacityTrend: CapacityTrend = {
        resourceType,
        period,
        growth,
        trend,
        seasonality,
        anomalyScore,
        dataPoints: historicalData,
        forecastAccuracy: this.calculateForecastAccuracy(resourceType)
      };

      this.trends.set(resourceType, capacityTrend);

      logger.info('Capacity trend analysis completed', {
        resourceType,
        period,
        trend,
        growth,
        anomalyScore
      });

      return capacityTrend;
    } catch (error) {
      logger.error('Failed to analyze capacity trend', { resourceType, error });
      throw error;
    }
  }

  /**
   * Identify capacity bottlenecks
   */
  async identifyBottlenecks(): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];

    try {
      const resourceTypes = ['cpu', 'memory', 'storage', 'bandwidth', 'database', 'connections'];
      
      for (const resourceType of resourceTypes) {
        const forecast = this.forecasts.get(resourceType);
        const trend = this.trends.get(resourceType);
        
        if (!forecast || !trend) continue;

        // Check for critical utilization
        const criticalPredictions = forecast.predictions.filter(p => p.utilizationRate > this.CRITICAL_UTILIZATION);
        if (criticalPredictions.length > 0) {
          const bottleneck = await this.analyzeResourceBottleneck(resourceType, forecast, criticalPredictions);
          if (bottleneck) {
            bottlenecks.push(bottleneck);
            this.bottlenecks.set(bottleneck.id, bottleneck);
          }
        }

        // Check for rapid growth
        if (trend.growth > 0.2) {
          const bottleneck = await this.analyzeGrowthBottleneck(resourceType, forecast, trend);
          if (bottleneck) {
            bottlenecks.push(bottleneck);
            this.bottlenecks.set(bottleneck.id, bottleneck);
          }
        }
      }

      logger.info('Bottleneck analysis completed', {
        count: bottlenecks.length,
        resourceTypes: bottlenecks.map(b => b.resourceType)
      });

      return bottlenecks.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      logger.error('Failed to identify bottlenecks', { error });
      throw error;
    }
  }

  /**
   * Generate capacity recommendations using AI
   */
  async generateRecommendations(resourceType: string, predictions?: CapacityPrediction[]): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = [];
    
    try {
      const forecast = predictions 
        ? { predictions } as CapacityForecast
        : this.forecasts.get(resourceType);
      
      if (!forecast) {
        throw new Error(`No forecast available for ${resourceType}`);
      }

      // Analyze predictions for recommendation triggers
      const criticalPredictions = forecast.predictions.filter(p => p.utilizationRate > this.CRITICAL_UTILIZATION);
      const warningPredictions = forecast.predictions.filter(p => 
        p.utilizationRate > this.WARNING_UTILIZATION && p.utilizationRate <= this.CRITICAL_UTILIZATION
      );

      // Generate scaling recommendations
      if (criticalPredictions.length > 0) {
        const firstCritical = criticalPredictions[0];
        const daysToCritical = Math.ceil((firstCritical.timestamp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        recommendations.push({
          id: this.generateId(),
          resourceType,
          action: 'scale-up',
          priority: daysToCritical <= 7 ? 'immediate' : daysToCritical <= 30 ? 'short-term' : 'medium-term',
          title: `Scale up ${resourceType} capacity`,
          description: `Projected ${resourceType} utilization will reach ${(firstCritical.utilizationRate * 100).toFixed(1)}% in ${daysToCritical} days`,
          impact: {
            cost: 'Medium',
            performance: 'High',
            risk: 'Low'
          },
          implementation: {
            effort: 'medium',
            timeline: '1-2 weeks',
            steps: [
              'Assess current capacity needs',
              'Provision additional resources',
              'Update monitoring thresholds',
              'Validate performance improvement'
            ],
            risks: ['Temporary service interruption', 'Cost increase']
          },
          metrics: {
            expectedImprovement: 'Prevent service degradation',
            costSavings: 'Avoid emergency scaling costs'
          },
          status: 'pending',
          createdAt: new Date(),
          estimatedCost: this.estimateScalingCost(resourceType, 'scale-up'),
          roi: this.calculateScalingROI(resourceType, 'scale-up')
        });
      }

      // Generate optimization recommendations
      const optimizationOpportunity = await this.generateOptimizationRecommendation(resourceType);
      if (optimizationOpportunity) {
        recommendations.push(optimizationOpportunity);
      }

      // Generate archival recommendations
      const archivalRecommendation = await this.generateArchivalRecommendation(resourceType, forecast);
      if (archivalRecommendation) {
        recommendations.push(archivalRecommendation);
      }

      logger.info('Capacity recommendations generated', {
        resourceType,
        count: recommendations.length
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations', { resourceType, error });
      return [];
    }
  }

  /**
   * Get comprehensive capacity dashboard
   */
  async getCapacityDashboard(): Promise<CapacityDashboard> {
    try {
      const resourceTypes = ['cpu', 'memory', 'storage', 'bandwidth', 'database', 'connections'];
      const resources: any = {};
      const recommendations: CapacityRecommendation[] = [];
      const alerts: CapacityAlert[] = [];

      // Analyze each resource type
      for (const resourceType of resourceTypes) {
        // Ensure we have forecasts and trends
        if (!this.forecasts.has(resourceType)) {
          await this.generateCapacityForecast(resourceType, { includeRecommendations: true });
        }
        if (!this.trends.has(resourceType)) {
          await this.analyzeCapacityTrend(resourceType);
        }

        const current = this.forecasts.get(resourceType)!;
        const trend = this.trends.get(resourceType)!;
        
        resources[resourceType] = {
          current,
          trend,
          bottleneck: this.bottlenecks.get(`${resourceType}-bottleneck`) || undefined
        };

        // Collect recommendations
        recommendations.push(...current.recommendations);

        // Collect alerts
        for (const alert of this.alerts.values()) {
          if (alert.resourceType === resourceType) {
            alerts.push(alert);
          }
        }
      }

      // Calculate overall health
      const criticalIssues = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
      const predictedIssues = recommendations.filter(r => r.priority === 'immediate').length;
      const costOptimizationOpportunities = recommendations.filter(r => r.roi && r.roi > 2).length;

      let overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
      if (criticalIssues > 0) {
        overallHealth = 'critical';
      } else if (predictedIssues > 2 || costOptimizationOpportunities > 5) {
        overallHealth = 'warning';
      } else if (costOptimizationOpportunities > 0) {
        overallHealth = 'good';
      } else {
        overallHealth = 'excellent';
      }

      const dashboard: CapacityDashboard = {
        timestamp: new Date(),
        summary: {
          overallHealth,
          criticalIssues,
          predictedIssues,
          costOptimizationOpportunities,
          lastAssessment: new Date()
        },
        resources,
        recommendations: recommendations.slice(0, 20), // Top 20 recommendations
        alerts: alerts.filter(a => !a.resolved).slice(0, 10) // Active alerts
      };

      logger.info('Capacity dashboard generated', {
        overallHealth,
        resourceCount: resourceTypes.length,
        recommendationCount: recommendations.length,
        alertCount: alerts.length
      });

      return dashboard;
    } catch (error) {
      logger.error('Failed to generate capacity dashboard', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private getHistoricalData(resourceType: string): DataPoint[] {
    if (!this.historicalData.has(resourceType)) {
      // Generate synthetic historical data for demonstration
      this.historicalData.set(resourceType, this.generateSyntheticHistoricalData(resourceType));
    }
    return this.historicalData.get(resourceType)!;
  }

  private generateSyntheticHistoricalData(resourceType: string): DataPoint[] {
    const data: DataPoint[] = [];
    const now = new Date();
    
    // Generate 90 days of synthetic data
    for (let i = 90; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Base value with trend and seasonality
      let baseValue = this.getBaseResourceUsage(resourceType);
      const trendFactor = 1 + (0.001 * (90 - i)); // Slight upward trend
      const seasonalFactor = this.getSeasonalFactor(resourceType, timestamp);
      const randomFactor = 0.9 + Math.random() * 0.2; // ±10% random variation
      
      const value = baseValue * trendFactor * seasonalFactor * randomFactor;
      
      data.push({
        timestamp,
        value,
        isAnomaly: Math.random() < 0.05, // 5% anomaly rate
        confidence: 0.9
      });
    }

    return data;
  }

  private getBaseResourceUsage(resourceType: string): number {
    const baseValues: { [key: string]: number } = {
      cpu: 60,        // 60% average CPU usage
      memory: 70,     // 70% average memory usage
      storage: 40,    // 40% average storage usage
      bandwidth: 50,  // 50% average bandwidth usage
      database: 65,   // 65% average database usage
      connections: 45  // 45% average connection usage
    };
    return baseValues[resourceType] || 50;
  }

  private getSeasonalFactor(resourceType: string, timestamp: Date): number {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const month = timestamp.getMonth();

    // Simple seasonality patterns
    switch (resourceType) {
      case 'cpu':
      case 'memory':
        return 0.8 + (Math.sin((hour / 24) * 2 * Math.PI) * 0.2); // Daily pattern
      case 'bandwidth':
        return 0.7 + (Math.sin((dayOfWeek / 7) * 2 * Math.PI) * 0.3); // Weekly pattern
      case 'storage':
        return 0.9 + (Math.sin((month / 12) * 2 * Math.PI) * 0.1); // Monthly pattern
      default:
        return 1.0;
    }
  }

  private generateSyntheticForecast(data: number[], horizon: number): number[] {
    const predictions: number[] = [];
    const lastValue = data[data.length - 1] || 50;
    
    // Simple trend continuation with noise
    const trend = this.calculateGrowthRate(data.map((d, i) => ({ timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000), value: d })));
    
    for (let i = 1; i <= horizon; i++) {
      const trendValue = lastValue * Math.pow(1 + trend, i);
      const seasonalValue = 1 + (Math.sin((i / 30) * 2 * Math.PI) * 0.1);
      const noise = 0.95 + Math.random() * 0.1; // ±5% noise
      
      predictions.push(trendValue * seasonalValue * noise);
    }

    return predictions;
  }

  private calculateGrowthRate(data: DataPoint[]): number {
    if (data.length < 2) return 0;
    
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const periods = data.length;
    
    if (first <= 0 || last <= 0) return 0;
    
    return Math.pow(last / first, 1 / periods) - 1;
  }

  private async generatePredictionFactors(resourceType: string, predictedUsage: number, daysAhead: number): Promise<PredictionFactor[]> {
    const factors: PredictionFactor[] = [];
    
    // Growth trend factor
    const growthRate = this.calculateGrowthRate(this.getHistoricalData(resourceType));
    factors.push({
      name: 'Growth Trend',
      impact: growthRate > 0 ? 0.3 : -0.1,
      description: `Historical growth rate of ${(growthRate * 100).toFixed(1)}%`,
      weight: 0.4
    });

    // Seasonality factor
    const seasonalFactor = this.getSeasonalFactor(resourceType, new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000));
    factors.push({
      name: 'Seasonality',
      impact: (seasonalFactor - 1) * 0.5,
      description: `Expected seasonal variation: ${((seasonalFactor - 1) * 100).toFixed(1)}%`,
      weight: 0.3
    });

    // Business events factor (simulated)
    if (Math.random() > 0.8) {
      factors.push({
        name: 'Business Events',
        impact: 0.2,
        description: 'Expected business growth or seasonal demand',
        weight: 0.3
      });
    }

    return factors;
  }

  private calculateForecastConfidence(dayIndex: number, historyLength: number): number {
    // Confidence decreases with distance and increases with history length
    const timeDecay = Math.max(0.1, 1 - (dayIndex * 0.01));
    const historyBoost = Math.min(1, historyLength / 30);
    return Math.max(0.3, timeDecay * (0.5 + historyBoost * 0.5));
  }

  private calculateOverallConfidence(predictions: CapacityPrediction[]): number {
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    return Math.max(0.3, avgConfidence);
  }

  private getCurrentCapacity(resourceType: string): number {
    const capacities: { [key: string]: number } = {
      cpu: 100,        // 100 cores
      memory: 100,     // 100 GB
      storage: 1000,   // 1 TB
      bandwidth: 1000, // 1 Gbps
      database: 100,   // 100 connections
      connections: 500 // 500 max connections
    };
    return capacities[resourceType] || 100;
  }

  private getFutureCapacity(resourceType: string, daysAhead: number): number {
    // Assume capacity scaling happens gradually
    const currentCapacity = this.getCurrentCapacity(resourceType);
    return currentCapacity * (1 + (daysAhead / 365) * 0.1); // 10% capacity growth per year
  }

  private async analyzeTrend(data: number[]): Promise<any> {
    return {
      direction: this.calculateGrowthRate(data.map((v, i) => ({ timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000), value: v }))) > 0 ? 'increasing' : 'stable',
      strength: Math.abs(this.calculateGrowthRate(data.map((v, i) => ({ timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000), value: v })))),
      confidence: 0.8
    };
  }

  private detectSeasonalPatterns(data: number[]): SeasonalityPattern {
    return {
      hourly: Array.from({ length: 24 }, () => 0.8 + Math.random() * 0.4),
      daily: Array.from({ length: 7 }, () => 0.7 + Math.random() * 0.6),
      weekly: Array.from({ length: 52 }, () => 0.9 + Math.random() * 0.2),
      monthly: Array.from({ length: 12 }, () => 0.8 + Math.random() * 0.4)
    };
  }

  private detectAnomalies(data: number[]): number[] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
    
    return data.map(val => (val - mean) / stdDev);
  }

  private async analyzeComplexTrend(data: DataPoint[]): Promise<any> {
    const values = data.map(d => d.value);
    const growth = this.calculateGrowthRate(data);
    
    return {
      direction: growth > 0.05 ? 'increasing' : growth < -0.05 ? 'decreasing' : 'stable',
      strength: Math.abs(growth),
      pattern: 'linear', // Simplified
      confidence: 0.75
    };
  }

  private async calculateAnomalyScore(data: DataPoint[]): Promise<number> {
    const anomalies = data.filter(d => d.isAnomaly).length;
    return anomalies / data.length;
  }

  private calculateForecastAccuracy(resourceType: string): number {
    // Simplified accuracy calculation
    return 0.85;
  }

  private async analyzeResourceBottleneck(resourceType: string, forecast: CapacityForecast, criticalPredictions: CapacityPrediction[]): Promise<BottleneckAnalysis | null> {
    const firstCritical = criticalPredictions[0];
    const daysToCritical = Math.ceil((firstCritical.timestamp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    let severity: 'critical' | 'high' | 'medium' | 'low';
    if (daysToCritical <= 7) severity = 'critical';
    else if (daysToCritical <= 30) severity = 'high';
    else if (daysToCritical <= 90) severity = 'medium';
    else severity = 'low';

    return {
      id: `${resourceType}-bottleneck`,
      resourceType,
      severity,
      description: `${resourceType} capacity will be exceeded in ${daysToCritical} days`,
      impact: {
        currentImpact: 'No current impact',
        projectedImpact: `${(firstCritical.utilizationRate * 100).toFixed(1)}% utilization`,
        userExperience: severity === 'critical' ? 'Severe degradation expected' : 'Performance impact likely'
      },
      rootCause: 'Capacity planning not keeping pace with demand growth',
      solutions: [
        {
          type: 'immediate',
          description: `Increase ${resourceType} capacity by 25%`,
          implementation: 'Provision additional resources',
          estimatedCost: this.estimateScalingCost(resourceType, 'scale-up'),
          effectiveness: 0.9,
          timeline: '1-2 weeks',
          risks: ['Temporary service interruption']
        }
      ],
      timeline: {
        detected: new Date(),
        projectedCritical: firstCritical.timestamp
      }
    };
  }

  private async analyzeGrowthBottleneck(resourceType: string, forecast: CapacityForecast, trend: CapacityTrend): Promise<BottleneckAnalysis | null> {
    return {
      id: `${resourceType}-growth-bottleneck`,
      resourceType,
      severity: trend.growth > 0.5 ? 'critical' : trend.growth > 0.2 ? 'high' : 'medium',
      description: `Rapid ${resourceType} growth detected: ${(trend.growth * 100).toFixed(1)}% per period`,
      impact: {
        currentImpact: 'Accelerating resource consumption',
        projectedImpact: 'Capacity planning challenges',
        userExperience: 'Performance degradation risk'
      },
      rootCause: 'Higher than expected business growth or inefficient resource usage',
      solutions: [
        {
          type: 'long-term',
          description: 'Implement capacity scaling automation',
          implementation: 'Deploy auto-scaling policies',
          estimatedCost: this.estimateScalingCost(resourceType, 'optimize'),
          effectiveness: 0.8,
          timeline: '2-4 weeks',
          risks: ['Complexity increase', 'False scaling events']
        }
      ],
      timeline: {
        detected: new Date(),
        projectedCritical: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    };
  }

  private async generateOptimizationRecommendation(resourceType: string): Promise<CapacityRecommendation | null> {
    const forecast = this.forecasts.get(resourceType);
    if (!forecast || forecast.utilizationRate < 0.6) {
      return null;
    }

    return {
      id: this.generateId(),
      resourceType,
      action: 'optimize',
      priority: 'medium-term',
      title: `Optimize ${resourceType} usage`,
      description: `Current ${resourceType} usage can be optimized for better efficiency`,
      impact: {
        cost: 'Low',
        performance: 'Medium',
        risk: 'Low'
      },
      implementation: {
        effort: 'low',
        timeline: '1 week',
        steps: [
          'Analyze current usage patterns',
          'Identify optimization opportunities',
          'Implement efficiency improvements',
          'Monitor performance impact'
        ],
        risks: ['Minor performance variance during optimization']
      },
      metrics: {
        expectedImprovement: '15-25% efficiency gain',
        costSavings: '10-20% cost reduction'
      },
      status: 'pending',
      createdAt: new Date(),
      estimatedCost: 5000,
      roi: 3.5
    };
  }

  private async generateArchivalRecommendation(resourceType: string, forecast: CapacityForecast): Promise<CapacityRecommendation | null> {
    if (resourceType !== 'storage') return null;

    return {
      id: this.generateId(),
      resourceType,
      action: 'archive',
      priority: 'medium-term',
      title: 'Implement data archival strategy',
      description: 'Archive old data to reduce storage requirements',
      impact: {
        cost: 'Low',
        performance: 'High',
        risk: 'Low'
      },
      implementation: {
        effort: 'medium',
        timeline: '2-3 weeks',
        steps: [
          'Identify archival candidates',
          'Implement archival policy',
          'Move old data to cheaper storage',
          'Update access patterns'
        ],
        risks: ['Data retrieval delay for archived content']
      },
      metrics: {
        expectedImprovement: '30-50% storage reduction',
        costSavings: '40-60% storage cost savings'
      },
      status: 'pending',
      createdAt: new Date(),
      estimatedCost: 15000,
      roi: 4.2
    };
  }

  private estimateScalingCost(resourceType: string, action: string): number {
    const baseCosts: { [key: string]: number } = {
      cpu: 10000,
      memory: 8000,
      storage: 5000,
      bandwidth: 15000,
      database: 12000,
      connections: 3000
    };
    
    const multipliers = {
      'scale-up': 1.0,
      'scale-out': 1.5,
      'optimize': 0.3,
      'archive': 0.2
    };

    return (baseCosts[resourceType] || 10000) * (multipliers[action as keyof typeof multipliers] || 1.0);
  }

  private calculateScalingROI(resourceType: string, action: string): number {
    const roiByAction = {
      'scale-up': 2.1,
      'scale-out': 1.8,
      'optimize': 3.5,
      'archive': 4.2
    };

    return roiByAction[action as keyof typeof roiByAction] || 2.0;
  }

  private async generateCapacityAlerts(resourceType: string, forecast: CapacityForecast): Promise<void> {
    const criticalPredictions = forecast.predictions.filter(p => p.utilizationRate > this.CRITICAL_UTILIZATION);
    const warningPredictions = forecast.predictions.filter(p => 
      p.utilizationRate > this.WARNING_UTILIZATION && p.utilizationRate <= this.CRITICAL_UTILIZATION
    );

    if (criticalPredictions.length > 0) {
      const firstCritical = criticalPredictions[0];
      const alert: CapacityAlert = {
        id: this.generateId(),
        resourceType,
        severity: 'critical',
        message: `${resourceType} utilization will exceed critical threshold`,
        threshold: this.CRITICAL_UTILIZATION,
        currentValue: forecast.utilizationRate,
        predictedValue: firstCritical.utilizationRate,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }

    if (warningPredictions.length > 0) {
      const firstWarning = warningPredictions[0];
      const alert: CapacityAlert = {
        id: this.generateId(),
        resourceType,
        severity: 'warning',
        message: `${resourceType} utilization approaching warning threshold`,
        threshold: this.WARNING_UTILIZATION,
        currentValue: forecast.utilizationRate,
        predictedValue: firstWarning.utilizationRate,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }
  }

  private generateId(): string {
    return `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicAnalysis(): void {
    // Run comprehensive analysis every 6 hours
    setInterval(() => {
      this.performComprehensiveAnalysis().catch((error) => {
        logger.error('Periodic capacity analysis failed', { error });
      });
    }, 6 * 60 * 60 * 1000);

    // Update forecasts every hour
    setInterval(() => {
      this.updateForecasts().catch((error) => {
        logger.error('Forecast update failed', { error });
      });
    }, 60 * 60 * 1000);
  }

  private async performComprehensiveAnalysis(): Promise<void> {
    try {
      logger.info('Starting comprehensive capacity analysis');

      const resourceTypes = ['cpu', 'memory', 'storage', 'bandwidth', 'database', 'connections'];
      
      for (const resourceType of resourceTypes) {
        await this.generateCapacityForecast(resourceType, { includeRecommendations: true });
        await this.analyzeCapacityTrend(resourceType);
      }

      // Identify bottlenecks
      await this.identifyBottlenecks();

      // Clean up old alerts
      this.cleanupOldAlerts();

      logger.info('Comprehensive capacity analysis completed');
    } catch (error) {
      logger.error('Comprehensive capacity analysis error', { error });
    }
  }

  private async updateForecasts(): Promise<void> {
    try {
      const resourceTypes = ['cpu', 'memory', 'storage', 'bandwidth', 'database', 'connections'];
      
      for (const resourceType of resourceTypes) {
        if (this.forecasts.has(resourceType)) {
          await this.generateCapacityForecast(resourceType, { 
            includeRecommendations: false,
            scenario: 'baseline'
          });
        }
      }
    } catch (error) {
      logger.error('Forecast update error', { error });
    }
  }

  private cleanupOldAlerts(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7); // Keep alerts for 7 days

    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Public API methods
   */

  async getCapacityForecast(resourceType: string): Promise<CapacityForecast | null> {
    return this.forecasts.get(resourceType) || null;
  }

  async getCapacityTrend(resourceType: string): Promise<CapacityTrend | null> {
    return this.trends.get(resourceType) || null;
  }

  async getBottlenecks(): Promise<BottleneckAnalysis[]> {
    return Array.from(this.bottlenecks.values());
  }

  async getAlerts(includeResolved = false): Promise<CapacityAlert[]> {
    if (includeResolved) {
      return Array.from(this.alerts.values());
    }
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolutionTime = new Date();
      this.alerts.set(alertId, alert);
    }
  }

  async getOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
    return Array.from(this.optimizationOpportunities.values());
  }

  async implementRecommendation(recommendationId: string): Promise<void> {
    // This would trigger the implementation process
    logger.info('Recommendation implementation triggered', { recommendationId });
  }
}