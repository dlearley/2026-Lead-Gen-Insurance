import { Gauge, Counter, register } from 'prom-client';
import { Tracer } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface ScalingMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface ScalingRule {
  id: string;
  name: string;
  service: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  cooldown: number; // minutes
  action: 'scale_up' | 'scale_down';
  targetReplicas: number;
  enabled: boolean;
}

export interface CapacityForecast {
  service: string;
  currentCapacity: number;
  projectedCapacity: number;
  recommendedActions: string[];
  timeframe: string;
  confidence: number;
}

export interface ResourceUsage {
  service: string;
  cpu: {
    current: number;
    target: number;
    limit: number;
  };
  memory: {
    current: number;
    target: number;
    limit: number;
  };
  network: {
    requestsPerSecond: number;
    bandwidth: number;
  };
  storage: {
    used: number;
    available: number;
  };
}

// Auto-scaling manager
export class AutoScalingManager {
  private tracer: Tracer;
  
  // Scaling metrics
  private cpuUtilizationGauge: Gauge<string>;
  private memoryUtilizationGauge: Gauge<string>;
  private queueDepthGauge: Gauge<string>;
  private requestRateGauge: Gauge<string>;
  private replicaCountGauge: Gauge<string>;
  private scalingEventsCounter: Counter<string>;
  
  // Scaling rules storage
  private scalingRules: Map<string, ScalingRule> = new Map();
  
  // Last scaling events tracking
  private lastScalingEvents: Map<string, Date> = new Map();
  
  constructor() {
    this.tracer = getTracer('AutoScalingManager');
    
    // Initialize metrics
    this.cpuUtilizationGauge = new Gauge({
      name: 'scaling_cpu_utilization_percent',
      help: 'CPU utilization percentage',
      labelNames: ['service']
    });
    
    this.memoryUtilizationGauge = new Gauge({
      name: 'scaling_memory_utilization_percent',
      help: 'Memory utilization percentage',
      labelNames: ['service']
    });
    
    this.queueDepthGauge = new Gauge({
      name: 'scaling_queue_depth',
      help: 'Current queue depth',
      labelNames: ['service']
    });
    
    this.requestRateGauge = new Gauge({
      name: 'scaling_request_rate',
      help: 'Requests per second',
      labelNames: ['service']
    });
    
    this.replicaCountGauge = new Gauge({
      name: 'scaling_replica_count',
      help: 'Current number of replicas',
      labelNames: ['service']
    });
    
    this.scalingEventsCounter = new Counter({
      name: 'scaling_events_total',
      help: 'Total number of scaling events',
      labelNames: ['service', 'action', 'trigger']
    });
    
    register.registerMetric(this.cpuUtilizationGauge);
    register.registerMetric(this.memoryUtilizationGauge);
    register.registerMetric(this.queueDepthGauge);
    register.registerMetric(this.requestRateGauge);
    register.registerMetric(this.replicaCountGauge);
    register.registerMetric(this.scalingEventsCounter);
    
    // Load scaling rules
    this.loadScalingRules();
  }
  
  /**
   * Record scaling metric
   */
  async recordMetric(metric: ScalingMetric): Promise<void> {
    const span = this.tracer.startSpan('recordScalingMetric');
    
    try {
      const labels = { service: metric.labels?.service || 'unknown', ...metric.labels };
      
      switch (metric.name) {
        case 'cpu_utilization':
          this.cpuUtilizationGauge.labels(labels).set(metric.value);
          break;
        case 'memory_utilization':
          this.memoryUtilizationGauge.labels(labels).set(metric.value);
          break;
        case 'queue_depth':
          this.queueDepthGauge.labels(labels).set(metric.value);
          break;
        case 'request_rate':
          this.requestRateGauge.labels(labels).set(metric.value);
          break;
        case 'replica_count':
          this.replicaCountGauge.labels(labels).set(metric.value);
          break;
      }
      
      // Check if scaling is needed
      await this.checkScalingRules(metric);
      
    } catch (error) {
      logger.error('Failed to record scaling metric', {
        metric: metric.name,
        value: metric.value,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'auto-scaling-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Check scaling rules
   */
  private async checkScalingRules(metric: ScalingMetric): Promise<void> {
    const applicableRules = Array.from(this.scalingRules.values())
      .filter(rule => rule.enabled && rule.metric === metric.name && rule.service === metric.labels?.service);
    
    for (const rule of applicableRules) {
      if (this.evaluateCondition(rule, metric.value)) {
        await this.executeScalingAction(rule, metric);
      }
    }
  }
  
  /**
   * Evaluate scaling condition
   */
  private evaluateCondition(rule: ScalingRule, value: number): boolean {
    switch (rule.operator) {
      case '>':
        return value > rule.threshold;
      case '<':
        return value < rule.threshold;
      case '>=':
        return value >= rule.threshold;
      case '<=':
        return value <= rule.threshold;
      case '==':
        return value === rule.threshold;
      case '!=':
        return value !== rule.threshold;
      default:
        return false;
    }
  }
  
  /**
   * Execute scaling action
   */
  private async executeScalingAction(rule: ScalingRule, metric: ScalingMetric): Promise<void> {
    const lastEvent = this.lastScalingEvents.get(rule.id);
    const now = new Date();
    
    // Check cooldown period
    if (lastEvent && (now.getTime() - lastEvent.getTime()) < (rule.cooldown * 60 * 1000)) {
      logger.debug('Scaling action skipped due to cooldown', {
        ruleId: rule.id,
        cooldown: rule.cooldown,
        service: rule.service,
        service: 'auto-scaling-manager'
      });
      return;
    }
    
    const span = this.tracer.startSpan('executeScalingAction');
    
    try {
      // Get current replica count
      const currentReplicas = this.getCurrentReplicas(rule.service);
      
      // Calculate new replica count
      const newReplicas = this.calculateNewReplicas(rule.service, currentReplicas, rule.action, rule.targetReplicas);
      
      // Execute scaling
      await this.scaleService(rule.service, newReplicas, rule.action);
      
      // Update tracking
      this.lastScalingEvents.set(rule.id, now);
      this.scalingEventsCounter
        .labels(rule.service, rule.action, rule.trigger || rule.id)
        .inc();
      
      logger.info('Scaling action executed', {
        service: rule.service,
        action: rule.action,
        from: currentReplicas,
        to: newReplicas,
        trigger: rule.trigger || rule.id,
        service: 'auto-scaling-manager'
      });
      
    } catch (error) {
      logger.error('Failed to execute scaling action', {
        service: rule.service,
        action: rule.action,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'auto-scaling-manager'
      });
      span.recordException(error as Error);
    } finally {
      span.end();
    }
  }
  
  /**
   * Get current replicas for service
   */
  private getCurrentReplicas(service: string): number {
    // In a real implementation, query Kubernetes API or orchestrator
    // For now, return mock data
    const metrics = this.replicaCountGauge.getSingleValue({ service });
    return metrics || 1;
  }
  
  /**
   * Calculate new replica count
   */
  private calculateNewReplicas(service: string, current: number, action: string, target: number): number {
    switch (action) {
      case 'scale_up':
        return Math.min(current * 2, target);
      case 'scale_down':
        return Math.max(Math.floor(current / 2), 1);
      default:
        return target;
    }
  }
  
  /**
   * Scale service
   */
  private async scaleService(service: string, replicas: number, action: string): Promise<void> {
    // In a real implementation, call Kubernetes API or orchestrator
    // For now, just update the metric
    this.replicaCountGauge.labels({ service }).set(replicas);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('Service scaling initiated', {
      service,
      replicas,
      action,
      service: 'auto-scaling-manager'
    });
  }
  
  /**
   * Add scaling rule
   */
  async addScalingRule(rule: ScalingRule): Promise<void> {
    this.scalingRules.set(rule.id, rule);
    
    logger.info('Scaling rule added', {
      ruleId: rule.id,
      service: rule.service,
      metric: rule.metric,
      threshold: rule.threshold,
      service: 'auto-scaling-manager'
    });
  }
  
  /**
   * Remove scaling rule
   */
  async removeScalingRule(ruleId: string): Promise<void> {
    const rule = this.scalingRules.get(ruleId);
    if (rule) {
      this.scalingRules.delete(ruleId);
      
      logger.info('Scaling rule removed', {
        ruleId,
        service: rule.service,
        service: 'auto-scaling-manager'
      });
    }
  }
  
  /**
   * Get scaling rules
   */
  getScalingRules(): ScalingRule[] {
    return Array.from(this.scalingRules.values());
  }
  
  /**
   * Generate capacity forecast
   */
  async generateCapacityForecast(timeframe: string = '30d'): Promise<CapacityForecast[]> {
    const forecasts: CapacityForecast[] = [];
    const services = ['api-service', 'data-service', 'orchestrator', 'backend'];
    
    for (const service of services) {
      const usage = await this.getResourceUsage(service);
      const forecast = await this.calculateCapacityForecast(service, usage, timeframe);
      forecasts.push(forecast);
    }
    
    return forecasts;
  }
  
  /**
   * Get current resource usage
   */
  private async getResourceUsage(service: string): Promise<ResourceUsage> {
    const cpu = this.cpuUtilizationGauge.getSingleValue({ service }) || 0;
    const memory = this.memoryUtilizationGauge.getSingleValue({ service }) || 0;
    const requests = this.requestRateGauge.getSingleValue({ service }) || 0;
    const replicas = this.replicaCountGauge.getSingleValue({ service }) || 1;
    
    return {
      service,
      cpu: {
        current: cpu,
        target: 70,
        limit: 90
      },
      memory: {
        current: memory,
        target: 80,
        limit: 90
      },
      network: {
        requestsPerSecond: requests,
        bandwidth: requests * 1024 // Rough estimation
      },
      storage: {
        used: 0,
        available: 100
      }
    };
  }
  
  /**
   * Calculate capacity forecast
   */
  private async calculateCapacityForecast(service: string, usage: ResourceUsage, timeframe: string): Promise<CapacityForecast> {
    // Simple growth projection based on current trends
    const growthRate = this.calculateGrowthRate(service, timeframe);
    const currentCapacity = this.getCurrentReplicas(service);
    const projectedCapacity = Math.ceil(currentCapacity * (1 + growthRate));
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on current usage
    if (usage.cpu.current > 80) {
      recommendations.push('Consider vertical scaling or optimization');
    }
    if (usage.memory.current > 85) {
      recommendations.push('Monitor memory usage closely');
    }
    if (usage.network.requestsPerSecond > 1000) {
      recommendations.push('Consider horizontal scaling');
    }
    
    return {
      service,
      currentCapacity,
      projectedCapacity,
      recommendedActions: recommendations,
      timeframe,
      confidence: 0.8
    };
  }
  
  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(service: string, timeframe: string): number {
    // Mock growth rate calculation
    // In real implementation, analyze historical data
    switch (timeframe) {
      case '7d':
        return 0.1;
      case '30d':
        return 0.3;
      case '90d':
        return 0.8;
      default:
        return 0.2;
    }
  }
  
  /**
   * Load scaling rules
   */
  private async loadScalingRules(): Promise<void> {
    // Add default scaling rules
    const defaultRules: ScalingRule[] = [
      {
        id: 'api-cpu-scale-up',
        name: 'API CPU Scale Up',
        service: 'api-service',
        metric: 'cpu_utilization',
        operator: '>',
        threshold: 70,
        cooldown: 5,
        action: 'scale_up',
        targetReplicas: 10,
        enabled: true,
        trigger: 'high_cpu'
      },
      {
        id: 'api-cpu-scale-down',
        name: 'API CPU Scale Down',
        service: 'api-service',
        metric: 'cpu_utilization',
        operator: '<',
        threshold: 30,
        cooldown: 10,
        action: 'scale_down',
        targetReplicas: 1,
        enabled: true,
        trigger: 'low_cpu'
      },
      {
        id: 'api-queue-scale-up',
        name: 'API Queue Scale Up',
        service: 'api-service',
        metric: 'queue_depth',
        operator: '>',
        threshold: 100,
        cooldown: 2,
        action: 'scale_up',
        targetReplicas: 5,
        enabled: true,
        trigger: 'high_queue'
      }
    ];
    
    for (const rule of defaultRules) {
      await this.addScalingRule(rule);
    }
    
    logger.info('Default scaling rules loaded', {
      count: defaultRules.length,
      service: 'auto-scaling-manager'
    });
  }
}