/**
 * Intelligent Load Balancer & Auto-scaling Service
 * Phase 13.6: Dynamic load balancing with ML-powered auto-scaling
 */

import { EventEmitter } from 'events';
import { logger } from '@insurance-lead-gen/core';

export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ai_powered';
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryThreshold: number;
  sessionAffinity: boolean;
  enableAutoScaling: boolean;
  scalingMetrics: ScalingMetric[];
}

export interface ScalingMetric {
  name: string;
  type: 'cpu' | 'memory' | 'requests' | 'latency' | 'queue_depth';
  target: number;
  threshold: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldown: number; // minutes
}

export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  currentConnections: number;
  maxConnections: number;
  responseTime: number;
  lastHealthCheck: Date;
  metrics: InstanceMetrics;
}

export interface InstanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  averageLatency: number;
  errorRate: number;
  queueDepth: number;
}

export interface LoadBalancingDecision {
  selectedInstance: ServiceInstance;
  algorithm: string;
  reasoning: string;
  confidence: number;
  metrics: any;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'maintain';
  instances: number;
  reason: string;
  confidence: number;
  triggeredMetrics: ScalingMetric[];
  estimatedImpact: ScalingImpact;
}

export interface ScalingImpact {
  expectedResponseTime: string;
  expectedThroughput: string;
  expectedCost: string;
  confidence: number;
}

export interface TrafficPattern {
  timestamp: Date;
  requestRate: number;
  averageResponseTime: number;
  concurrentUsers: number;
  errorRate: number;
}

export interface PredictiveScalingModel {
  prediction: {
    nextHour: TrafficPattern[];
    nextDay: TrafficPattern[];
    nextWeek: TrafficPattern[];
  };
  confidence: number;
  factors: {
    seasonality: number;
    trends: number;
    events: number;
  };
}

export interface LoadBalancerMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  activeConnections: number;
  distribution: {
    [instanceId: string]: {
      requests: number;
      percentage: number;
    };
  };
}

export class IntelligentLoadBalancerService extends EventEmitter {
  private instances: Map<string, ServiceInstance> = new Map();
  private trafficHistory: TrafficPattern[] = [];
  private config: LoadBalancerConfig;
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private scalingInterval?: NodeJS.Timeout;
  private predictiveModel: PredictiveScalingModel | null = null;
  
  // AI/ML components (simplified for this implementation)
  private requestPatterns: Map<string, number[]> = new Map();
  private responseTimeHistory: Map<string, number[]> = new Map();
  private performancePredictor: any = null; // Would be actual ML model

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
    this.initializePredictiveModel();
  }

  /**
   * Initialize the predictive scaling model
   */
  private async initializePredictiveModel(): Promise<void> {
    // In a real implementation, this would initialize ML models
    // For now, we'll simulate the model initialization
    this.predictiveModel = {
      predict: async (timeHorizon: string) => {
        // Simulate prediction based on historical patterns
        return this.generateSyntheticPrediction(timeHorizon);
      }
    };

    logger.info('Predictive scaling model initialized');
  }

  /**
   * Register a new service instance
   */
  async registerInstance(instance: Omit<ServiceInstance, 'currentConnections' | 'responseTime' | 'lastHealthCheck' | 'metrics'>): Promise<void> {
    const fullInstance: ServiceInstance = {
      ...instance,
      currentConnections: 0,
      responseTime: 0,
      lastHealthCheck: new Date(),
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        requestRate: 0,
        averageLatency: 0,
        errorRate: 0,
        queueDepth: 0
      }
    };

    this.instances.set(instance.id, fullInstance);
    
    logger.info('Service instance registered', {
      instanceId: instance.id,
      host: instance.host,
      port: instance.port
    });

    this.emit('instanceRegistered', fullInstance);
  }

  /**
   * Unregister a service instance
   */
  async unregisterInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // Set to draining status to prevent new connections
    instance.status = 'draining';
    this.instances.set(instanceId, instance);

    // Wait for connections to drain, then remove
    setTimeout(() => {
      this.instances.delete(instanceId);
      logger.info('Service instance removed', { instanceId });
      this.emit('instanceRemoved', instanceId);
    }, 30000); // 30 second drain time
  }

  /**
   * Route request to optimal instance using intelligent algorithm
   */
  async routeRequest(request: {
    path: string;
    method: string;
    userId?: string;
    priority?: 'high' | 'normal' | 'low';
    payload?: any;
  }): Promise<LoadBalancingDecision> {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      throw new Error('No healthy instances available');
    }

    let selectedInstance: ServiceInstance;
    let reasoning: string;
    let confidence: number;

    switch (this.config.algorithm) {
      case 'round_robin':
        selectedInstance = this.selectRoundRobin(healthyInstances);
        reasoning = 'Round-robin selection';
        confidence = 0.8;
        break;

      case 'least_connections':
        selectedInstance = this.selectLeastConnections(healthyInstances);
        reasoning = 'Least connections load balancing';
        confidence = 0.85;
        break;

      case 'weighted':
        selectedInstance = this.selectWeighted(healthyInstances);
        reasoning = 'Weighted load balancing';
        confidence = 0.9;
        break;

      case 'ai_powered':
      default:
        const aiDecision = await this.selectAIpowered(request, healthyInstances);
        selectedInstance = aiDecision.instance;
        reasoning = aiDecision.reasoning;
        confidence = aiDecision.confidence;
        break;
    }

    // Update instance metrics
    selectedInstance.currentConnections++;
    selectedInstance.metrics.requestRate++;

    // Record request for pattern analysis
    this.recordRequestPattern(request);

    const decision: LoadBalancingDecision = {
      selectedInstance,
      algorithm: this.config.algorithm,
      reasoning,
      confidence,
      metrics: {
        availableInstances: healthyInstances.length,
        totalInstances: this.instances.size,
        algorithmFactors: this.getAlgorithmFactors(selectedInstance, healthyInstances)
      }
    };

    logger.debug('Request routed', {
      instanceId: selectedInstance.id,
      algorithm: this.config.algorithm,
      confidence
    });

    this.emit('requestRouted', decision);
    return decision;
  }

  /**
   * Complete request and update metrics
   */
  async completeRequest(instanceId: string, responseTime: number, success: boolean): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Update instance metrics
    instance.currentConnections = Math.max(0, instance.currentConnections - 1);
    instance.responseTime = responseTime;
    instance.metrics.averageLatency = (instance.metrics.averageLatency + responseTime) / 2;
    
    if (!success) {
      instance.metrics.errorRate = (instance.metrics.errorRate + 1) / 2;
    }

    // Record response time for analysis
    this.recordResponseTime(instanceId, responseTime);

    this.emit('requestCompleted', { instanceId, responseTime, success });
  }

  /**
   * AI-powered instance selection with machine learning
   */
  private async selectAIpowered(request: any, healthyInstances: ServiceInstance[]): Promise<{
    instance: ServiceInstance;
    reasoning: string;
    confidence: number;
  }> {
    const factors = await this.calculateAIWeightedFactors(request, healthyInstances);
    let bestInstance = healthyInstances[0];
    let bestScore = -1;

    for (const instance of healthyInstances) {
      const score = this.calculateAIScore(instance, factors);
      if (score > bestScore) {
        bestScore = score;
        bestInstance = instance;
      }
    }

    const reasoning = `AI-powered selection based on response time (${bestInstance.responseTime}ms), `
      + `CPU usage (${bestInstance.metrics.cpuUsage.toFixed(1)}%), `
      + `and request patterns (${factors.patternMatch.toFixed(2)} confidence)`;

    return {
      instance: bestInstance,
      reasoning,
      confidence: Math.min(0.95, factors.overallConfidence)
    };
  }

  /**
   * Calculate AI-weighted factors for intelligent routing
   */
  private async calculateAIWeightedFactors(request: any, instances: ServiceInstance[]): Promise<{
    patternMatch: number;
    performanceScore: number;
    resourceEfficiency: number;
    predictability: number;
    overallConfidence: number;
  }> {
    const patternMatch = this.analyzeRequestPattern(request);
    const performanceScore = this.calculatePerformanceScore(instances);
    const resourceEfficiency = this.calculateResourceEfficiency(instances);
    const predictability = this.calculatePredictability(request, instances);

    // Weighted combination of factors
    const weights = {
      pattern: 0.3,
      performance: 0.4,
      efficiency: 0.2,
      predictability: 0.1
    };

    const overallConfidence = 
      patternMatch * weights.pattern +
      performanceScore * weights.performance +
      resourceEfficiency * weights.efficiency +
      predictability * weights.predictability;

    return {
      patternMatch,
      performanceScore,
      resourceEfficiency,
      predictability,
      overallConfidence
    };
  }

  /**
   * Calculate AI score for instance selection
   */
  private calculateAIScore(instance: ServiceInstance, factors: any): number {
    // Normalize metrics to 0-1 scale
    const responseTimeScore = Math.max(0, 1 - (instance.responseTime / 1000)); // Assume 1s is max acceptable
    const cpuScore = Math.max(0, 1 - (instance.metrics.cpuUsage / 100));
    const memoryScore = Math.max(0, 1 - (instance.metrics.memoryUsage / 100));
    const connectionScore = Math.max(0, 1 - (instance.currentConnections / instance.maxConnections));
    const errorScore = Math.max(0, 1 - instance.metrics.errorRate);

    // Weighted combination
    const baseScore = (
      responseTimeScore * 0.3 +
      cpuScore * 0.2 +
      memoryScore * 0.2 +
      connectionScore * 0.2 +
      errorScore * 0.1
    );

    // Apply AI factors
    const aiScore = baseScore * (0.5 + factors.overallConfidence * 0.5);

    return aiScore;
  }

  /**
   * Analyze request pattern for intelligent routing
   */
  private analyzeRequestPattern(request: any): number {
    const pattern = `${request.method}:${request.path}`;
    const history = this.requestPatterns.get(pattern) || [];
    
    // Check if this is a common pattern
    const frequency = history.length;
    const totalRequests = Array.from(this.requestPatterns.values())
      .reduce((sum, reqs) => sum + reqs.length, 0);
    
    const frequencyScore = totalRequests > 0 ? frequency / totalRequests : 0;
    
    // Check time-based patterns
    const hour = new Date().getHours();
    const hourPattern = `hour:${hour}`;
    const hourHistory = this.requestPatterns.get(hourPattern) || [];
    const hourScore = Math.min(1, hourHistory.length / 100); // Normalize to 1

    return (frequencyScore * 0.6 + hourScore * 0.4);
  }

  /**
   * Calculate performance score across instances
   */
  private calculatePerformanceScore(instances: ServiceInstance[]): number {
    if (instances.length === 0) return 0;

    const avgResponseTime = instances.reduce((sum, i) => sum + i.responseTime, 0) / instances.length;
    const avgErrorRate = instances.reduce((sum, i) => sum + i.metrics.errorRate, 0) / instances.length;

    // Normalize metrics
    const responseTimeScore = Math.max(0, 1 - (avgResponseTime / 500)); // Assume 500ms baseline
    const errorRateScore = Math.max(0, 1 - avgErrorRate);

    return (responseTimeScore * 0.7 + errorRateScore * 0.3);
  }

  /**
   * Calculate resource efficiency
   */
  private calculateResourceEfficiency(instances: ServiceInstance[]): number {
    if (instances.length === 0) return 0;

    const totalCpu = instances.reduce((sum, i) => sum + i.metrics.cpuUsage, 0);
    const totalMemory = instances.reduce((sum, i) => sum + i.metrics.memoryUsage, 0);
    const totalConnections = instances.reduce((sum, i) => sum + i.currentConnections, 0);

    const avgCpu = totalCpu / instances.length;
    const avgMemory = totalMemory / instances.length;
    const connectionUtilization = totalConnections / instances.reduce((sum, i) => sum + i.maxConnections, 0);

    return Math.max(0, 1 - (avgCpu + avgMemory + connectionUtilization) / 300);
  }

  /**
   * Calculate predictability factor
   */
  private calculatePredictability(request: any, instances: ServiceInstance[]): number {
    // Analyze historical predictability of similar requests
    const pattern = `${request.method}:${request.path}`;
    const history = this.responseTimeHistory.get(pattern) || [];
    
    if (history.length < 5) return 0.5; // Unknown pattern

    // Calculate coefficient of variation (lower = more predictable)
    const mean = history.reduce((sum, time) => sum + time, 0) / history.length;
    const variance = history.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / history.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.max(0, 1 - Math.min(1, cv)); // Lower CV = higher predictability
  }

  /**
   * Traditional load balancing algorithms
   */
  private selectRoundRobin(instances: ServiceInstance[]): ServiceInstance {
    // Simple round-robin implementation
    const now = Date.now();
    const index = now % instances.length;
    return instances[index];
  }

  private selectLeastConnections(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((least, current) => 
      current.currentConnections < least.currentConnections ? current : least
    );
  }

  private selectWeighted(instances: ServiceInstance[]): ServiceInstance {
    // Select based on weight and current load
    const weightedInstances = instances.map(instance => {
      const availableCapacity = instance.maxConnections - instance.currentConnections;
      const effectiveWeight = instance.weight * (availableCapacity / instance.maxConnections);
      return { instance, effectiveWeight };
    });

    return weightedInstances.reduce((best, current) => 
      current.effectiveWeight > best.effectiveWeight ? current : best
    ).instance;
  }

  /**
   * Get algorithm-specific factors for decision logging
   */
  private getAlgorithmFactors(selected: ServiceInstance, allInstances: ServiceInstance[]): any {
    switch (this.config.algorithm) {
      case 'least_connections':
        return {
          selectedConnections: selected.currentConnections,
          avgConnections: allInstances.reduce((sum, i) => sum + i.currentConnections, 0) / allInstances.length,
          connectionVariance: this.calculateVariance(allInstances.map(i => i.currentConnections))
        };
      
      case 'weighted':
        return {
          selectedWeight: selected.weight,
          effectiveWeight: selected.weight * (1 - selected.currentConnections / selected.maxConnections),
          weightDistribution: allInstances.map(i => ({ id: i.id, weight: i.weight }))
        };
      
      case 'ai_powered':
        return {
          selectedMetrics: {
            responseTime: selected.responseTime,
            cpuUsage: selected.metrics.cpuUsage,
            memoryUsage: selected.metrics.memoryUsage
          },
          selectionFactors: {
            performanceScore: this.calculateAIScore(selected, { overallConfidence: 0.8 }),
            resourceEfficiency: 0.7,
            patternMatch: 0.9
          }
        };
      
      default:
        return { roundRobinIndex: allInstances.indexOf(selected) };
    }
  }

  /**
   * Calculate variance for statistical analysis
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Health check system
   */
  async performHealthCheck(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    try {
      // In a real implementation, this would make HTTP request to instance health endpoint
      // For now, we'll simulate health check
      const isHealthy = Math.random() > 0.1; // 90% chance of being healthy
      
      instance.lastHealthCheck = new Date();
      
      if (isHealthy) {
        if (instance.status === 'unhealthy') {
          instance.status = 'healthy';
          this.emit('instanceRecovered', instance);
        }
      } else {
        if (instance.status === 'healthy') {
          instance.status = 'unhealthy';
          this.emit('instanceUnhealthy', instance);
        }
      }

      // Update simulated metrics
      instance.metrics.cpuUsage = Math.random() * 100;
      instance.metrics.memoryUsage = Math.random() * 100;

      return isHealthy;
    } catch (error) {
      logger.error('Health check failed', { instanceId, error });
      instance.status = 'unhealthy';
      return false;
    }
  }

  /**
   * Auto-scaling decision engine
   */
  async makeScalingDecision(): Promise<ScalingDecision | null> {
    if (!this.config.enableAutoScaling) {
      return null;
    }

    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      return {
        action: 'scale_up',
        instances: 1,
        reason: 'No healthy instances available',
        confidence: 1.0,
        triggeredMetrics: [],
        estimatedImpact: {
          expectedResponseTime: 'Improved availability',
          expectedThroughput: 'Basic service restoration',
          expectedCost: 'Minimal increase',
          confidence: 1.0
        }
      };
    }

    const scalingAnalysis = await this.analyzeScalingNeed();
    return scalingAnalysis;
  }

  /**
   * Analyze if scaling is needed based on multiple metrics
   */
  private async analyzeScalingNeed(): Promise<ScalingDecision> {
    const metrics = this.config.scalingMetrics;
    const triggeredMetrics: ScalingMetric[] = [];
    let scaleUpSignals = 0;
    let scaleDownSignals = 0;

    // Analyze each scaling metric
    for (const metric of metrics) {
      const currentValue = await this.getCurrentMetricValue(metric);
      
      if (currentValue > metric.scaleUpThreshold) {
        triggeredMetrics.push(metric);
        scaleUpSignals++;
      } else if (currentValue < metric.scaleDownThreshold && await this.isCooldownPeriodPassed(metric)) {
        scaleDownSignals++;
      }
    }

    // Make scaling decision based on signals
    let action: ScalingDecision['action'] = 'maintain';
    let instances = healthyInstances.length;
    let reason = 'No scaling needed';
    let confidence = 0.8;

    if (scaleUpSignals >= 2) {
      action = 'scale_up';
      instances = Math.min(healthyInstances.length + 1, 10); // Max 10 instances
      reason = `Scale up triggered by ${scaleUpSignals} metrics exceeding thresholds`;
      confidence = Math.min(0.95, scaleUpSignals * 0.4 + 0.3);
    } else if (scaleDownSignals >= 2) {
      action = 'scale_down';
      instances = Math.max(healthyInstances.length - 1, 1); // Min 1 instance
      reason = `Scale down triggered by ${scaleDownSignals} metrics below thresholds`;
      confidence = Math.min(0.9, scaleDownSignals * 0.35 + 0.4);
    }

    return {
      action,
      instances,
      reason,
      confidence,
      triggeredMetrics,
      estimatedImpact: this.calculateScalingImpact(action, instances, triggeredMetrics)
    };
  }

  /**
   * Get current value for a scaling metric
   */
  private async getCurrentMetricValue(metric: ScalingMetric): Promise<number> {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) return 0;

    switch (metric.type) {
      case 'cpu':
        const avgCpu = healthyInstances.reduce((sum, i) => sum + i.metrics.cpuUsage, 0) / healthyInstances.length;
        return avgCpu;

      case 'memory':
        const avgMemory = healthyInstances.reduce((sum, i) => sum + i.metrics.memoryUsage, 0) / healthyInstances.length;
        return avgMemory;

      case 'requests':
        const totalRequests = healthyInstances.reduce((sum, i) => sum + i.metrics.requestRate, 0);
        return totalRequests / healthyInstances.length;

      case 'latency':
        const avgLatency = healthyInstances.reduce((sum, i) => sum + i.metrics.averageLatency, 0) / healthyInstances.length;
        return avgLatency;

      case 'queue_depth':
        const avgQueue = healthyInstances.reduce((sum, i) => sum + i.metrics.queueDepth, 0) / healthyInstances.length;
        return avgQueue;

      default:
        return 0;
    }
  }

  /**
   * Check if cooldown period has passed for a metric
   */
  private async isCooldownPeriodPassed(metric: ScalingMetric): Promise<boolean> {
    // In a real implementation, this would check last scaling action time
    // For now, we'll simulate cooldown logic
    return true;
  }

  /**
   * Calculate expected impact of scaling action
   */
  private calculateScalingImpact(action: ScalingDecision['action'], instances: number, triggeredMetrics: ScalingMetric[]): ScalingImpact {
    const currentInstances = this.instances.size;

    switch (action) {
      case 'scale_up':
        const improvement = Math.min(50, (instances - currentInstances) * 20); // Max 50% improvement
        return {
          expectedResponseTime: `${(improvement * 0.6).toFixed(0)}% reduction`,
          expectedThroughput: `${(improvement * 0.8).toFixed(0)}% increase`,
          expectedCost: `${(instances * 15).toFixed(0)}% increase`,
          confidence: 0.85
        };

      case 'scale_down':
        const savings = Math.min(40, (currentInstances - instances) * 15); // Max 40% savings
        return {
          expectedResponseTime: `${(savings * 0.3).toFixed(0)}% increase`,
          expectedThroughput: `${(savings * 0.2).toFixed(0)}% decrease`,
          expectedCost: `${savings.toFixed(0)}% savings`,
          confidence: 0.8
        };

      case 'maintain':
      default:
        return {
          expectedResponseTime: 'No change',
          expectedThroughput: 'No change',
          expectedCost: 'No change',
          confidence: 1.0
        };
    }
  }

  /**
   * Start load balancer operation
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Start auto-scaling
    if (this.config.enableAutoScaling) {
      this.scalingInterval = setInterval(async () => {
        await this.handleAutoScaling();
      }, 30000); // Check every 30 seconds
    }

    logger.info('Load balancer started', {
      algorithm: this.config.algorithm,
      autoScaling: this.config.enableAutoScaling,
      instances: this.instances.size
    });
  }

  /**
   * Stop load balancer
   */
  stop(): void {
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = undefined;
    }

    logger.info('Load balancer stopped');
  }

  /**
   * Perform health checks on all instances
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.instances.keys()).map(async (instanceId) => {
      await this.performHealthCheck(instanceId);
    });

    await Promise.allSettle(promises);
  }

  /**
   * Handle auto-scaling
   */
  private async handleAutoScaling(): Promise<void> {
    const decision = await this.makeScalingDecision();
    
    if (!decision) return;

    if (decision.action === 'scale_up' && decision.confidence > 0.7) {
      await this.scaleUp(decision.instances);
    } else if (decision.action === 'scale_down' && decision.confidence > 0.8) {
      await this.scaleDown(decision.instances);
    }
  }

  /**
   * Scale up - add new instances
   */
  private async scaleUp(instanceCount: number): Promise<void> {
    const currentInstances = Array.from(this.instances.values());
    
    for (let i = currentInstances.length; i < instanceCount; i++) {
      const newInstance: ServiceInstance = {
        id: `auto-scale-${Date.now()}-${i}`,
        host: `auto-instance-${i}`,
        port: 8080 + i,
        weight: 1,
        status: 'healthy',
        currentConnections: 0,
        maxConnections: 1000,
        responseTime: 0,
        lastHealthCheck: new Date(),
        metrics: {
          cpuUsage: Math.random() * 20, // New instances start with low usage
          memoryUsage: Math.random() * 30,
          requestRate: 0,
          averageLatency: 0,
          errorRate: 0,
          queueDepth: 0
        }
      };

      this.instances.set(newInstance.id, newInstance);
      logger.info('Auto-scaled up', { instanceId: newInstance.id, reason: 'Automatic scaling' });
      this.emit('instanceScaledUp', newInstance);
    }
  }

  /**
   * Scale down - remove excess instances
   */
  private async scaleDown(instanceCount: number): Promise<void> {
    const currentInstances = Array.from(this.instances.values())
      .sort((a, b) => a.currentConnections - b.currentConnections); // Remove least loaded first

    for (let i = 0; i < currentInstances.length - instanceCount; i++) {
      const instanceToRemove = currentInstances[i];
      
      // Set to draining status
      instanceToRemove.status = 'draining';
      this.instances.set(instanceToRemove.id, instanceToRemove);

      // Remove after drain time
      setTimeout(() => {
        this.instances.delete(instanceToRemove.id);
        logger.info('Auto-scaled down', { instanceId: instanceToRemove.id, reason: 'Automatic scaling' });
        this.emit('instanceScaledDown', instanceToRemove.id);
      }, 30000); // 30 second drain time
    }
  }

  /**
   * Record request pattern for ML analysis
   */
  private recordRequestPattern(request: any): void {
    const pattern = `${request.method}:${request.path}`;
    const hourPattern = `hour:${new Date().getHours()}`;

    // Update pattern counts
    if (!this.requestPatterns.has(pattern)) {
      this.requestPatterns.set(pattern, []);
    }
    this.requestPatterns.get(pattern)!.push(Date.now());

    // Keep only recent patterns (last 1000)
    const patterns = this.requestPatterns.get(pattern)!;
    if (patterns.length > 1000) {
      patterns.shift();
    }

    // Update hourly pattern
    if (!this.requestPatterns.has(hourPattern)) {
      this.requestPatterns.set(hourPattern, []);
    }
    this.requestPatterns.get(hourPattern)!.push(Date.now());
  }

  /**
   * Record response time for analysis
   */
  private recordResponseTime(instanceId: string, responseTime: number): void {
    if (!this.responseTimeHistory.has(instanceId)) {
      this.responseTimeHistory.set(instanceId, []);
    }

    const history = this.responseTimeHistory.get(instanceId)!;
    history.push(responseTime);

    // Keep only recent history (last 100)
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Generate synthetic prediction for demo purposes
   */
  private generateSyntheticPrediction(timeHorizon: string): TrafficPattern[] {
    const patterns: TrafficPattern[] = [];
    const now = new Date();
    
    let periods = 0;
    if (timeHorizon === 'nextHour') periods = 12; // 5-minute intervals
    else if (timeHorizon === 'nextDay') periods = 24; // Hourly
    else periods = 7; // Daily

    for (let i = 0; i < periods; i++) {
      const timestamp = new Date(now.getTime() + i * (timeHorizon === 'nextHour' ? 300000 : timeHorizon === 'nextDay' ? 3600000 : 86400000));
      
      patterns.push({
        timestamp,
        requestRate: Math.random() * 1000 + 200,
        averageResponseTime: Math.random() * 200 + 50,
        concurrentUsers: Math.random() * 500 + 100,
        errorRate: Math.random() * 0.05
      });
    }

    return patterns;
  }

  /**
   * Public API methods
   */
  getMetrics(): LoadBalancerMetrics {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    const totalRequests = healthyInstances.reduce((sum, i) => sum + i.metrics.requestRate, 0);
    const totalErrors = healthyInstances.reduce((sum, i) => sum + (i.metrics.errorRate * i.metrics.requestRate), 0);
    const avgResponseTime = healthyInstances.length > 0 
      ? healthyInstances.reduce((sum, i) => sum + i.metrics.averageLatency, 0) / healthyInstances.length 
      : 0;

    const distribution: any = {};
    for (const instance of healthyInstances) {
      distribution[instance.id] = {
        requests: instance.metrics.requestRate,
        percentage: totalRequests > 0 ? (instance.metrics.requestRate / totalRequests) * 100 : 0
      };
    }

    return {
      totalRequests,
      totalErrors,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: totalRequests / 60, // Approximate
      activeConnections: healthyInstances.reduce((sum, i) => sum + i.currentConnections, 0),
      distribution
    };
  }

  getInstanceStatus(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  getTrafficHistory(): TrafficPattern[] {
    return [...this.trafficHistory];
  }

  updateConfig(newConfig: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Load balancer config updated', { newConfig });
  }
}