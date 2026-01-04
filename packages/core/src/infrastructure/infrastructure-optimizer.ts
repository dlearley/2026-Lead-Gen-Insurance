import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Infrastructure optimization configuration
 */
export interface InfrastructureOptimizationConfig {
  autoScaling?: {
    enabled?: boolean;
    minReplicas?: number;
    maxReplicas?: number;
    cpuThreshold?: number; // percentage
    memoryThreshold?: number; // percentage
    cooldownPeriod?: number; // seconds
  };
  resourceAllocation?: {
    cpu?: {
      request?: number;
      limit?: number;
    };
    memory?: {
      request?: number; // MB
      limit?: number; // MB
    };
  };
  connectionPooling?: {
    minConnections?: number;
    maxConnections?: number;
    idleTimeout?: number; // seconds
    maxLifetime?: number; // seconds
  };
  rateLimiting?: {
    enabled?: boolean;
    windowMs?: number;
    maxRequests?: number;
    burstLimit?: number;
  };
  circuitBreaker?: {
    enabled?: boolean;
    failureThreshold?: number;
    resetTimeout?: number; // seconds
    halfOpenAfter?: number; // seconds
  };
}

/**
 * Infrastructure resource recommendation
 */
export interface InfrastructureResourceRecommendation {
  service: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'network';
  currentAllocation: number;
  recommendedAllocation: number;
  utilization: number; // percentage
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Auto-scaling recommendation
 */
export interface AutoScalingRecommendation {
  service: string;
  currentReplicas: number;
  recommendedReplicas: number;
  reason: string;
  metric: 'cpu' | 'memory' | 'throughput' | 'latency';
  currentValue: number;
  targetValue: number;
}

/**
 * Connection pool optimization
 */
export interface ConnectionPoolOptimization {
  poolName: string;
  currentMin: number;
  currentMax: number;
  recommendedMin: number;
  recommendedMax: number;
  currentUsage: number;
  waitTime: number; // ms
  timeoutRate: number; // percentage
}

/**
 * Infrastructure cost analysis
 */
export interface InfrastructureCostAnalysis {
  service: string;
  resourceType: string;
  currentCost: number; // per hour
  optimizedCost: number; // per hour
  savings: number; // per hour
  savingsPercentage: number; // percentage
  recommendations: string[];
}

/**
 * Infrastructure optimization report
 */
export interface InfrastructureOptimizationReport {
  resourceRecommendations: InfrastructureResourceRecommendation[];
  autoScalingRecommendations: AutoScalingRecommendation[];
  connectionPoolOptimizations: ConnectionPoolOptimization[];
  costAnalysis: InfrastructureCostAnalysis[];
  totalSavings: number;
  totalSavingsPercentage: number;
  generatedAt: Date;
}

/**
 * Infrastructure health check
 */
export interface InfrastructureHealthCheck {
  service: string;
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details?: any;
  }>;
  timestamp: Date;
}

/**
 * Infrastructure Optimization Service
 */
export class InfrastructureOptimizer {
  private metrics: MetricsCollector;
  private config: InfrastructureOptimizationConfig;
  private resourceHistory: Map<string, Array<{ timestamp: Date; utilization: number }>>;
  private scalingHistory: Map<string, Array<{ timestamp: Date; replicas: number }>>;
  private connectionPoolHistory: Map<string, Array<{ timestamp: Date; usage: number; waitTime: number }>>;

  constructor(options: {
    config?: InfrastructureOptimizationConfig;
    metrics?: MetricsCollector;
  } = {}) {
    this.config = options.config || this.getDefaultConfig();
    this.metrics = options.metrics || new MetricsCollector();
    this.resourceHistory = new Map();
    this.scalingHistory = new Map();
    this.connectionPoolHistory = new Map();
    
    this.setupMetrics();
  }

  private getDefaultConfig(): InfrastructureOptimizationConfig {
    return {
      autoScaling: {
        enabled: true,
        minReplicas: 2,
        maxReplicas: 10,
        cpuThreshold: 70,
        memoryThreshold: 80,
        cooldownPeriod: 300
      },
      resourceAllocation: {
        cpu: {
          request: 0.5,
          limit: 1.0
        },
        memory: {
          request: 512,
          limit: 1024
        }
      },
      connectionPooling: {
        minConnections: 5,
        maxConnections: 50,
        idleTimeout: 300,
        maxLifetime: 3600
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 100,
        burstLimit: 20
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30,
        halfOpenAfter: 60
      }
    };
  }

  private setupMetrics(): void {
    // Infrastructure optimization metrics
    this.metrics.gauge('infrastructure.resource_optimizations', 0);
    this.metrics.gauge('infrastructure.scaling_operations', 0);
    this.metrics.gauge('infrastructure.connection_pool_optimizations', 0);
    this.metrics.gauge('infrastructure.cost_savings', 0);
    this.metrics.gauge('infrastructure.health_status', 1);
  }

  /**
   * Analyze infrastructure resources and generate recommendations
   */
  async analyzeResources(
    currentMetrics: Array<{
      service: string;
      resourceType: 'cpu' | 'memory' | 'storage' | 'network';
      currentAllocation: number;
      currentUtilization: number; // percentage
      timestamp: Date;
    }>
  ): Promise<InfrastructureResourceRecommendation[]> {
    const recommendations: InfrastructureResourceRecommendation[] = [];
    
    currentMetrics.forEach(metric => {
      const recommendation = this.generateResourceRecommendation(metric);
      if (recommendation) {
        recommendations.push(recommendation);
        this.updateResourceHistory(metric.service, metric.resourceType, metric.currentUtilization);
      }
    });
    
    this.metrics.gauge('infrastructure.resource_optimizations', recommendations.length);
    
    return recommendations;
  }

  private generateResourceRecommendation(
    metric: {
      service: string;
      resourceType: 'cpu' | 'memory' | 'storage' | 'network';
      currentAllocation: number;
      currentUtilization: number;
    }
  ): InfrastructureResourceRecommendation | null {
    const key = `${metric.service}:${metric.resourceType}`;
    const history = this.resourceHistory.get(key) || [];
    
    // Calculate average utilization over last 10 samples
    const recentUtilization = history.slice(-10).map(h => h.utilization);
    const avgUtilization = recentUtilization.length > 0
      ? recentUtilization.reduce((sum, val) => sum + val, 0) / recentUtilization.length
      : metric.currentUtilization;
    
    let severity: 'high' | 'medium' | 'low' = 'low';
    let reason = '';
    let recommendedAllocation = metric.currentAllocation;
    
    // CPU optimization
    if (metric.resourceType === 'cpu') {
      if (avgUtilization > 90) {
        // Overutilized - increase allocation
        recommendedAllocation = metric.currentAllocation * 1.5;
        severity = 'high';
        reason = `CPU overutilized: ${avgUtilization.toFixed(1)}% > 90%`;
      } else if (avgUtilization > 80) {
        // High utilization - consider increasing
        recommendedAllocation = metric.currentAllocation * 1.2;
        severity = 'medium';
        reason = `CPU high utilization: ${avgUtilization.toFixed(1)}% > 80%`;
      } else if (avgUtilization < 30) {
        // Underutilized - decrease allocation
        recommendedAllocation = metric.currentAllocation * 0.8;
        severity = 'low';
        reason = `CPU underutilized: ${avgUtilization.toFixed(1)}% < 30%`;
      }
    }
    
    // Memory optimization
    if (metric.resourceType === 'memory') {
      if (avgUtilization > 90) {
        // Overutilized - increase allocation
        recommendedAllocation = metric.currentAllocation * 1.5;
        severity = 'high';
        reason = `Memory overutilized: ${avgUtilization.toFixed(1)}% > 90%`;
      } else if (avgUtilization > 80) {
        // High utilization - consider increasing
        recommendedAllocation = metric.currentAllocation * 1.2;
        severity = 'medium';
        reason = `Memory high utilization: ${avgUtilization.toFixed(1)}% > 80%`;
      } else if (avgUtilization < 40) {
        // Underutilized - decrease allocation
        recommendedAllocation = metric.currentAllocation * 0.9;
        severity = 'low';
        reason = `Memory underutilized: ${avgUtilization.toFixed(1)}% < 40%`;
      }
    }
    
    // Storage optimization
    if (metric.resourceType === 'storage') {
      if (avgUtilization > 85) {
        // High utilization - consider increasing
        recommendedAllocation = metric.currentAllocation * 1.3;
        severity = 'medium';
        reason = `Storage high utilization: ${avgUtilization.toFixed(1)}% > 85%`;
      } else if (avgUtilization < 20) {
        // Underutilized - decrease allocation
        recommendedAllocation = metric.currentAllocation * 0.8;
        severity = 'low';
        reason = `Storage underutilized: ${avgUtilization.toFixed(1)}% < 20%`;
      }
    }
    
    if (recommendedAllocation !== metric.currentAllocation) {
      return {
        service: metric.service,
        resourceType: metric.resourceType,
        currentAllocation: metric.currentAllocation,
        recommendedAllocation,
        utilization: avgUtilization,
        reason,
        severity
      };
    }
    
    return null;
  }

  private updateResourceHistory(service: string, resourceType: string, utilization: number): void {
    const key = `${service}:${resourceType}`;
    const history = this.resourceHistory.get(key) || [];
    
    history.push({
      timestamp: new Date(),
      utilization
    });
    
    // Keep only last 100 samples
    if (history.length > 100) {
      history.shift();
    }
    
    this.resourceHistory.set(key, history);
  }

  /**
   * Analyze auto-scaling requirements
   */
  async analyzeAutoScaling(
    currentMetrics: Array<{
      service: string;
      currentReplicas: number;
      cpuUtilization: number; // percentage
      memoryUtilization: number; // percentage
      throughput: number; // requests per second
      latency: number; // ms
      timestamp: Date;
    }>
  ): Promise<AutoScalingRecommendation[]> {
    const recommendations: AutoScalingRecommendation[] = [];
    
    currentMetrics.forEach(metric => {
      const recommendation = this.generateScalingRecommendation(metric);
      if (recommendation) {
        recommendations.push(recommendation);
        this.updateScalingHistory(metric.service, metric.currentReplicas);
      }
    });
    
    this.metrics.gauge('infrastructure.scaling_operations', recommendations.length);
    
    return recommendations;
  }

  private generateScalingRecommendation(
    metric: {
      service: string;
      currentReplicas: number;
      cpuUtilization: number;
      memoryUtilization: number;
      throughput: number;
      latency: number;
    }
  ): AutoScalingRecommendation | null {
    if (!this.config.autoScaling?.enabled) return null;
    
    const minReplicas = this.config.autoScaling.minReplicas || 2;
    const maxReplicas = this.config.autoScaling.maxReplicas || 10;
    const cpuThreshold = this.config.autoScaling.cpuThreshold || 70;
    const memoryThreshold = this.config.autoScaling.memoryThreshold || 80;
    
    let recommendedReplicas = metric.currentReplicas;
    let reason = '';
    let scalingMetric: 'cpu' | 'memory' | 'throughput' | 'latency' = 'cpu';
    let currentValue = metric.cpuUtilization;
    let targetValue = cpuThreshold;
    
    // Check CPU utilization
    if (metric.cpuUtilization > cpuThreshold && metric.currentReplicas < maxReplicas) {
      // Scale up based on CPU
      const scaleFactor = Math.ceil(metric.cpuUtilization / cpuThreshold);
      recommendedReplicas = Math.min(maxReplicas, metric.currentReplicas * scaleFactor);
      reason = `CPU utilization exceeds threshold: ${metric.cpuUtilization.toFixed(1)}% > ${cpuThreshold}%`;
      scalingMetric = 'cpu';
      currentValue = metric.cpuUtilization;
      targetValue = cpuThreshold;
    } else if (metric.cpuUtilization < cpuThreshold * 0.5 && metric.currentReplicas > minReplicas) {
      // Scale down based on CPU
      recommendedReplicas = Math.max(minReplicas, metric.currentReplicas - 1);
      reason = `CPU utilization below threshold: ${metric.cpuUtilization.toFixed(1)}% < ${cpuThreshold * 0.5}%`;
      scalingMetric = 'cpu';
      currentValue = metric.cpuUtilization;
      targetValue = cpuThreshold * 0.5;
    }
    
    // Check memory utilization
    if (metric.memoryUtilization > memoryThreshold && metric.currentReplicas < maxReplicas) {
      // Scale up based on memory
      const scaleFactor = Math.ceil(metric.memoryUtilization / memoryThreshold);
      recommendedReplicas = Math.min(maxReplicas, metric.currentReplicas * scaleFactor);
      reason = `Memory utilization exceeds threshold: ${metric.memoryUtilization.toFixed(1)}% > ${memoryThreshold}%`;
      scalingMetric = 'memory';
      currentValue = metric.memoryUtilization;
      targetValue = memoryThreshold;
    } else if (metric.memoryUtilization < memoryThreshold * 0.5 && metric.currentReplicas > minReplicas) {
      // Scale down based on memory
      recommendedReplicas = Math.max(minReplicas, metric.currentReplicas - 1);
      reason = `Memory utilization below threshold: ${metric.memoryUtilization.toFixed(1)}% < ${memoryThreshold * 0.5}%`;
      scalingMetric = 'memory';
      currentValue = metric.memoryUtilization;
      targetValue = memoryThreshold * 0.5;
    }
    
    // Check latency (scale up if latency is high)
    if (metric.latency > 1000 && metric.currentReplicas < maxReplicas) {
      // Scale up based on latency
      recommendedReplicas = Math.min(maxReplicas, metric.currentReplicas + 1);
      reason = `High latency detected: ${metric.latency.toFixed(1)}ms > 1000ms`;
      scalingMetric = 'latency';
      currentValue = metric.latency;
      targetValue = 1000;
    }
    
    if (recommendedReplicas !== metric.currentReplicas) {
      return {
        service: metric.service,
        currentReplicas: metric.currentReplicas,
        recommendedReplicas,
        reason,
        metric: scalingMetric,
        currentValue,
        targetValue
      };
    }
    
    return null;
  }

  private updateScalingHistory(service: string, replicas: number): void {
    const history = this.scalingHistory.get(service) || [];
    
    history.push({
      timestamp: new Date(),
      replicas
    });
    
    // Keep only last 100 samples
    if (history.length > 100) {
      history.shift();
    }
    
    this.scalingHistory.set(service, history);
  }

  /**
   * Analyze connection pool performance
   */
  async analyzeConnectionPools(
    currentMetrics: Array<{
      poolName: string;
      currentMin: number;
      currentMax: number;
      currentUsage: number;
      waitTime: number; // ms
      timeoutRate: number; // percentage
      timestamp: Date;
    }>
  ): Promise<ConnectionPoolOptimization[]> {
    const optimizations: ConnectionPoolOptimization[] = [];
    
    currentMetrics.forEach(metric => {
      const optimization = this.generateConnectionPoolOptimization(metric);
      if (optimization) {
        optimizations.push(optimization);
        this.updateConnectionPoolHistory(metric.poolName, metric.currentUsage, metric.waitTime);
      }
    });
    
    this.metrics.gauge('infrastructure.connection_pool_optimizations', optimizations.length);
    
    return optimizations;
  }

  private generateConnectionPoolOptimization(
    metric: {
      poolName: string;
      currentMin: number;
      currentMax: number;
      currentUsage: number;
      waitTime: number;
      timeoutRate: number;
    }
  ): ConnectionPoolOptimization | null {
    let recommendedMin = metric.currentMin;
    let recommendedMax = metric.currentMax;
    let reason = '';
    
    // Check for connection pool exhaustion
    if (metric.timeoutRate > 5 && metric.currentUsage > metric.currentMax * 0.9) {
      // Increase max connections
      recommendedMax = Math.min(200, metric.currentMax * 1.5);
      reason = `High timeout rate (${metric.timeoutRate.toFixed(1)}%) and pool near capacity`;
    }
    
    // Check for underutilized pool
    if (metric.currentUsage < metric.currentMin * 0.5 && metric.currentMin > 5) {
      // Decrease min connections
      recommendedMin = Math.max(5, Math.floor(metric.currentMin * 0.8));
      reason = `Pool underutilized: ${metric.currentUsage} < ${metric.currentMin * 0.5}`;
    }
    
    // Check for high wait time
    if (metric.waitTime > 100 && metric.currentUsage > metric.currentMax * 0.8) {
      // Increase max connections
      recommendedMax = Math.min(200, metric.currentMax * 1.3);
      reason = `High wait time (${metric.waitTime}ms) and pool near capacity`;
    }
    
    if (recommendedMin !== metric.currentMin || recommendedMax !== metric.currentMax) {
      return {
        poolName: metric.poolName,
        currentMin: metric.currentMin,
        currentMax: metric.currentMax,
        recommendedMin,
        recommendedMax,
        currentUsage: metric.currentUsage,
        waitTime: metric.waitTime,
        timeoutRate: metric.timeoutRate
      };
    }
    
    return null;
  }

  private updateConnectionPoolHistory(poolName: string, usage: number, waitTime: number): void {
    const history = this.connectionPoolHistory.get(poolName) || [];
    
    history.push({
      timestamp: new Date(),
      usage,
      waitTime
    });
    
    // Keep only last 100 samples
    if (history.length > 100) {
      history.shift();
    }
    
    this.connectionPoolHistory.set(poolName, history);
  }

  /**
   * Perform cost analysis
   */
  async performCostAnalysis(
    currentResources: Array<{
      service: string;
      resourceType: string;
      currentAllocation: number;
      hourlyCost: number;
    }>,
    recommendations: InfrastructureResourceRecommendation[]
  ): Promise<InfrastructureCostAnalysis[]> {
    const costAnalysis: InfrastructureCostAnalysis[] = [];
    
    currentResources.forEach(resource => {
      const recommendation = recommendations.find(
        r => r.service === resource.service && r.resourceType === resource.resourceType
      );
      
      if (recommendation) {
        // Calculate cost savings
        const allocationRatio = recommendation.recommendedAllocation / resource.currentAllocation;
        const optimizedCost = resource.hourlyCost * allocationRatio;
        const savings = resource.hourlyCost - optimizedCost;
        const savingsPercentage = (savings / resource.hourlyCost) * 100;
        
        costAnalysis.push({
          service: resource.service,
          resourceType: resource.resourceType,
          currentCost: resource.hourlyCost,
          optimizedCost,
          savings,
          savingsPercentage,
          recommendations: [recommendation.reason]
        });
      }
    });
    
    // Calculate total savings
    const totalSavings = costAnalysis.reduce((sum, analysis) => sum + analysis.savings, 0);
    this.metrics.gauge('infrastructure.cost_savings', totalSavings);
    
    return costAnalysis;
  }

  /**
   * Generate comprehensive infrastructure optimization report
   */
  async generateOptimizationReport(
    currentMetrics: {
      resources: Array<{
        service: string;
        resourceType: 'cpu' | 'memory' | 'storage' | 'network';
        currentAllocation: number;
        currentUtilization: number;
        hourlyCost: number;
      }>;
      scaling: Array<{
        service: string;
        currentReplicas: number;
        cpuUtilization: number;
        memoryUtilization: number;
        throughput: number;
        latency: number;
      }>;
      connectionPools: Array<{
        poolName: string;
        currentMin: number;
        currentMax: number;
        currentUsage: number;
        waitTime: number;
        timeoutRate: number;
      }>;
    }
  ): Promise<InfrastructureOptimizationReport> {
    // Analyze resources
    const resourceRecommendations = await this.analyzeResources(currentMetrics.resources);
    
    // Analyze scaling
    const scalingRecommendations = await this.analyzeAutoScaling(currentMetrics.scaling);
    
    // Analyze connection pools
    const connectionPoolOptimizations = await this.analyzeConnectionPools(currentMetrics.connectionPools);
    
    // Perform cost analysis
    const costAnalysis = await this.performCostAnalysis(
      currentMetrics.resources,
      resourceRecommendations
    );
    
    // Calculate total savings
    const totalSavings = costAnalysis.reduce((sum, analysis) => sum + analysis.savings, 0);
    const totalCurrentCost = currentMetrics.resources.reduce((sum, resource) => sum + resource.hourlyCost, 0);
    const totalSavingsPercentage = totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0;
    
    return {
      resourceRecommendations,
      autoScalingRecommendations: scalingRecommendations,
      connectionPoolOptimizations,
      costAnalysis,
      totalSavings,
      totalSavingsPercentage,
      generatedAt: new Date()
    };
  }

  /**
   * Perform infrastructure health check
   */
  async performHealthCheck(
    services: string[]
  ): Promise<InfrastructureHealthCheck[]> {
    const healthChecks: InfrastructureHealthCheck[] = [];
    
    services.forEach(service => {
      const checks = this.performServiceHealthCheck(service);
      const healthy = checks.every(check => check.status === 'healthy');
      
      healthChecks.push({
        service,
        healthy,
        checks,
        timestamp: new Date()
      });
    });
    
    // Update overall health status
    const healthyServices = healthChecks.filter(hc => hc.healthy).length;
    const healthStatus = (healthyServices / healthChecks.length) * 100;
    this.metrics.gauge('infrastructure.health_status', healthStatus);
    
    return healthChecks;
  }

  private performServiceHealthCheck(service: string): Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details?: any;
  }> {
    const checks: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      message: string;
      details?: any;
    }> = [];
    
    // Check resource utilization
    const resourceKey = `${service}:cpu`;
    const cpuHistory = this.resourceHistory.get(resourceKey) || [];
    
    if (cpuHistory.length > 0) {
      const avgCpu = cpuHistory.slice(-5).reduce((sum, h) => sum + h.utilization, 0) / cpuHistory.slice(-5).length;
      
      if (avgCpu > 90) {
        checks.push({
          name: 'cpu_utilization',
          status: 'critical',
          message: `High CPU utilization: ${avgCpu.toFixed(1)}%`,
          details: { utilization: avgCpu }
        });
      } else if (avgCpu > 80) {
        checks.push({
          name: 'cpu_utilization',
          status: 'warning',
          message: `Elevated CPU utilization: ${avgCpu.toFixed(1)}%`,
          details: { utilization: avgCpu }
        });
      } else {
        checks.push({
          name: 'cpu_utilization',
          status: 'healthy',
          message: `CPU utilization normal: ${avgCpu.toFixed(1)}%`,
          details: { utilization: avgCpu }
        });
      }
    }
    
    // Check memory utilization
    const memoryKey = `${service}:memory`;
    const memoryHistory = this.resourceHistory.get(memoryKey) || [];
    
    if (memoryHistory.length > 0) {
      const avgMemory = memoryHistory.slice(-5).reduce((sum, h) => sum + h.utilization, 0) / memoryHistory.slice(-5).length;
      
      if (avgMemory > 90) {
        checks.push({
          name: 'memory_utilization',
          status: 'critical',
          message: `High memory utilization: ${avgMemory.toFixed(1)}%`,
          details: { utilization: avgMemory }
        });
      } else if (avgMemory > 80) {
        checks.push({
          name: 'memory_utilization',
          status: 'warning',
          message: `Elevated memory utilization: ${avgMemory.toFixed(1)}%`,
          details: { utilization: avgMemory }
        });
      } else {
        checks.push({
          name: 'memory_utilization',
          status: 'healthy',
          message: `Memory utilization normal: ${avgMemory.toFixed(1)}%`,
          details: { utilization: avgMemory }
        });
      }
    }
    
    // Check scaling status
    const scalingHistory = this.scalingHistory.get(service) || [];
    
    if (scalingHistory.length > 1) {
      const recentScaling = scalingHistory.slice(-2);
      const scalingEvents = recentScaling.filter((_, index) => 
        index > 0 && recentScaling[index].replicas !== recentScaling[index - 1].replicas
      ).length;
      
      if (scalingEvents > 3) {
        checks.push({
          name: 'scaling_stability',
          status: 'warning',
          message: `Frequent scaling events detected (${scalingEvents} in last 2 samples)`
        });
      } else {
        checks.push({
          name: 'scaling_stability',
          status: 'healthy',
          message: 'Scaling stable'
        });
      }
    }
    
    return checks;
  }

  /**
   * Update infrastructure optimization configuration
   */
  updateConfig(config: Partial<InfrastructureOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Infrastructure optimization configuration updated', { config });
  }

  /**
   * Clear all infrastructure optimization data
   */
  clearAllData(): void {
    this.resourceHistory.clear();
    this.scalingHistory.clear();
    this.connectionPoolHistory.clear();
    
    this.metrics.gauge('infrastructure.resource_optimizations', 0);
    this.metrics.gauge('infrastructure.scaling_operations', 0);
    this.metrics.gauge('infrastructure.connection_pool_optimizations', 0);
    this.metrics.gauge('infrastructure.cost_savings', 0);
    this.metrics.gauge('infrastructure.health_status', 100);
    
    logger.info('All infrastructure optimization data cleared');
  }

  /**
   * Generate Kubernetes resource configuration
   */
  static generateKubernetesResources(
    service: string,
    recommendations: InfrastructureResourceRecommendation[]
  ): any {
    const serviceRecommendations = recommendations.filter(r => r.service === service);
    
    const cpuRequest = serviceRecommendations.find(r => r.resourceType === 'cpu')?.recommendedAllocation || 0.5;
    const cpuLimit = cpuRequest * 1.5;
    
    const memoryRequest = serviceRecommendations.find(r => r.resourceType === 'memory')?.recommendedAllocation || 512;
    const memoryLimit = memoryRequest * 1.5;
    
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: service,
        labels: {
          app: service
        }
      },
      spec: {
        replicas: 2,
        selector: {
          matchLabels: {
            app: service
          }
        },
        template: {
          metadata: {
            labels: {
              app: service
            }
          },
          spec: {
            containers: [
              {
                name: service,
                image: `${service}:latest`,
                ports: [
                  {
                    containerPort: 3000
                  }
                ],
                resources: {
                  requests: {
                    cpu: `${cpuRequest}`,
                    memory: `${memoryRequest}Mi`
                  },
                  limits: {
                    cpu: `${cpuLimit}`,
                    memory: `${memoryLimit}Mi`
                  }
                }
              }
            ]
          }
        }
      }
    };
  }

  /**
   * Generate Kubernetes Horizontal Pod Autoscaler configuration
   */
  static generateKubernetesHPA(
    service: string,
    recommendations: AutoScalingRecommendation[]
  ): any {
    const serviceRecommendation = recommendations.find(r => r.service === service);
    
    if (!serviceRecommendation) {
      return null;
    }
    
    return {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${service}-hpa`
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: service
        },
        minReplicas: serviceRecommendation.currentReplicas,
        maxReplicas: serviceRecommendation.recommendedReplicas,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: serviceRecommendation.metric === 'cpu' ? 'cpu' : 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: serviceRecommendation.targetValue
              }
            }
          }
        ],
        behavior: {
          scaleDown: {
            stabilizationWindowSeconds: 300,
            policies: [
              {
                type: 'Percent',
                value: 10,
                periodSeconds: 60
              }
            ]
          },
          scaleUp: {
            stabilizationWindowSeconds: 60,
            policies: [
              {
                type: 'Percent',
                value: 20,
                periodSeconds: 60
              },
              {
                type: 'Pods',
                value: 4,
                periodSeconds: 60
              }
            ]
          }
        }
      }
    };
  }

  /**
   * Generate Docker Compose resource limits
   */
  static generateDockerComposeResources(
    service: string,
    recommendations: InfrastructureResourceRecommendation[]
  ): any {
    const serviceRecommendations = recommendations.filter(r => r.service === service);
    
    const cpuLimit = serviceRecommendations.find(r => r.resourceType === 'cpu')?.recommendedAllocation || 1.0;
    const memoryLimit = serviceRecommendations.find(r => r.resourceType === 'memory')?.recommendedAllocation || 1024;
    
    return {
      deploy: {
        resources: {
          limits: {
            cpus: cpuLimit.toString(),
            memory: `${memoryLimit}M`
          },
          reservations: {
            cpus: (cpuLimit * 0.5).toString(),
            memory: `${Math.floor(memoryLimit * 0.5)}M`
          }
        }
      }
    };
  }

  /**
   * Generate connection pool configuration
   */
  static generateConnectionPoolConfig(
    poolName: string,
    optimization: ConnectionPoolOptimization
  ): any {
    return {
      poolName,
      minConnections: optimization.recommendedMin,
      maxConnections: optimization.recommendedMax,
      idleTimeout: 300000, // 5 minutes
      maxLifetime: 3600000, // 1 hour
      testOnBorrow: true,
      testOnReturn: true,
      testWhileIdle: true,
      validationInterval: 30000 // 30 seconds
    };
  }

  /**
   * Infrastructure optimization decorators
   */

  /**
   * Decorator to monitor infrastructure resource usage
   */
  MonitorResourceUsage() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          const memoryUsed = process.memoryUsage().heapUsed - startMemory;
          
          // Get infrastructure optimizer from context
          const infraOptimizer: InfrastructureOptimizer = this.infraOptimizer;
          if (infraOptimizer) {
            // This would be enhanced in a real implementation
            infraOptimizer.metrics.increment('infrastructure.resource_usage');
            infraOptimizer.metrics.timing('infrastructure.resource_time', duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Get infrastructure optimizer from context
          const infraOptimizer: InfrastructureOptimizer = this.infraOptimizer;
          if (infraOptimizer) {
            infraOptimizer.metrics.increment('infrastructure.resource_errors');
            infraOptimizer.metrics.timing('infrastructure.resource_time', duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Decorator to optimize resource allocation
   */
  OptimizeResourceAllocation() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        // Get infrastructure optimizer from context
        const infraOptimizer: InfrastructureOptimizer = this.infraOptimizer;
        
        if (infraOptimizer) {
          // This would analyze the method and provide optimization recommendations
          // For this decorator, we'll just track metrics
          infraOptimizer.metrics.increment('infrastructure.optimization_attempts');
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}

/**
 * Factory function to create InfrastructureOptimizer
 */
export function createInfrastructureOptimizer(options?: {
  config?: InfrastructureOptimizationConfig;
  metrics?: MetricsCollector;
}): InfrastructureOptimizer {
  return new InfrastructureOptimizer(options);
}

/**
 * Infrastructure optimization utilities
 */
export class InfrastructureOptimizationUtils {
  /**
   * Calculate optimal resource allocation based on utilization
   */
  static calculateOptimalAllocation(
    currentAllocation: number,
    utilization: number,
    resourceType: 'cpu' | 'memory' | 'storage'
  ): number {
    let optimalAllocation = currentAllocation;
    
    switch (resourceType) {
      case 'cpu':
        if (utilization > 90) {
          optimalAllocation = currentAllocation * 1.5;
        } else if (utilization > 80) {
          optimalAllocation = currentAllocation * 1.2;
        } else if (utilization < 30) {
          optimalAllocation = currentAllocation * 0.8;
        }
        break;
      
      case 'memory':
        if (utilization > 90) {
          optimalAllocation = currentAllocation * 1.5;
        } else if (utilization > 80) {
          optimalAllocation = currentAllocation * 1.2;
        } else if (utilization < 40) {
          optimalAllocation = currentAllocation * 0.9;
        }
        break;
      
      case 'storage':
        if (utilization > 85) {
          optimalAllocation = currentAllocation * 1.3;
        } else if (utilization < 20) {
          optimalAllocation = currentAllocation * 0.8;
        }
        break;
    }
    
    return optimalAllocation;
  }

  /**
   * Calculate optimal replicas based on load
   */
  static calculateOptimalReplicas(
    currentReplicas: number,
    cpuUtilization: number,
    memoryUtilization: number,
    minReplicas: number = 2,
    maxReplicas: number = 10
  ): number {
    let optimalReplicas = currentReplicas;
    
    // Scale up based on CPU
    if (cpuUtilization > 70 && currentReplicas < maxReplicas) {
      optimalReplicas = Math.min(maxReplicas, currentReplicas + 1);
    }
    
    // Scale up based on memory
    if (memoryUtilization > 80 && currentReplicas < maxReplicas) {
      optimalReplicas = Math.min(maxReplicas, currentReplicas + 1);
    }
    
    // Scale down if underutilized
    if (cpuUtilization < 30 && memoryUtilization < 30 && currentReplicas > minReplicas) {
      optimalReplicas = Math.max(minReplicas, currentReplicas - 1);
    }
    
    return optimalReplicas;
  }

  /**
   * Calculate optimal connection pool size
   */
  static calculateOptimalConnectionPool(
    currentMin: number,
    currentMax: number,
    currentUsage: number,
    waitTime: number,
    timeoutRate: number
  ): { min: number; max: number } {
    let optimalMin = currentMin;
    let optimalMax = currentMax;
    
    // Increase max if high timeout rate and pool near capacity
    if (timeoutRate > 5 && currentUsage > currentMax * 0.9) {
      optimalMax = Math.min(200, currentMax * 1.5);
    }
    
    // Increase max if high wait time and pool near capacity
    if (waitTime > 100 && currentUsage > currentMax * 0.8) {
      optimalMax = Math.min(200, currentMax * 1.3);
    }
    
    // Decrease min if underutilized
    if (currentUsage < currentMin * 0.5 && currentMin > 5) {
      optimalMin = Math.max(5, Math.floor(currentMin * 0.8));
    }
    
    return { min: optimalMin, max: optimalMax };
  }

  /**
   * Calculate cost savings from optimization
   */
  static calculateCostSavings(
    currentCost: number,
    currentAllocation: number,
    optimizedAllocation: number
  ): { savings: number; savingsPercentage: number } {
    const allocationRatio = optimizedAllocation / currentAllocation;
    const optimizedCost = currentCost * allocationRatio;
    const savings = currentCost - optimizedCost;
    const savingsPercentage = (savings / currentCost) * 100;
    
    return { savings, savingsPercentage };
  }

  /**
   * Generate infrastructure optimization report summary
   */
  static generateReportSummary(report: InfrastructureOptimizationReport): string {
    const lines: string[] = [];
    
    lines.push('Infrastructure Optimization Report Summary');
    lines.push('='.repeat(50));
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push('');
    
    lines.push('Resource Recommendations:');
    report.resourceRecommendations.forEach(rec => {
      lines.push(`  - ${rec.service} ${rec.resourceType}: ${rec.currentAllocation} -> ${rec.recommendedAllocation} (${rec.severity})`);
    });
    
    lines.push('');
    lines.push('Auto-Scaling Recommendations:');
    report.autoScalingRecommendations.forEach(rec => {
      lines.push(`  - ${rec.service}: ${rec.currentReplicas} -> ${rec.recommendedReplicas} replicas`);
    });
    
    lines.push('');
    lines.push('Connection Pool Optimizations:');
    report.connectionPoolOptimizations.forEach(opt => {
      lines.push(`  - ${opt.poolName}: min=${opt.currentMin}->${opt.recommendedMin}, max=${opt.currentMax}->${opt.recommendedMax}`);
    });
    
    lines.push('');
    lines.push('Cost Analysis:');
    lines.push(`  - Total Savings: $${report.totalSavings.toFixed(2)}/hour (${report.totalSavingsPercentage.toFixed(1)}%)`);
    
    return lines.join('\n');
  }

  /**
   * Generate infrastructure health report
   */
  static generateHealthReport(healthChecks: InfrastructureHealthCheck[]): string {
    const lines: string[] = [];
    
    lines.push('Infrastructure Health Report');
    lines.push('='.repeat(40));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    healthChecks.forEach(check => {
      lines.push(`${check.service}: ${check.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      check.checks.forEach(subCheck => {
        const symbol = subCheck.status === 'healthy' ? '✓' : subCheck.status === 'warning' ? '⚠' : '✗';
        lines.push(`  ${symbol} ${subCheck.name}: ${subCheck.message}`);
      });
      lines.push('');
    });
    
    const healthyCount = healthChecks.filter(hc => hc.healthy).length;
    lines.push(`Overall Health: ${healthyCount}/${healthChecks.length} services healthy`);
    
    return lines.join('\n');
  }

  /**
   * Generate Kubernetes resource recommendations
   */
  static generateKubernetesRecommendations(
    service: string,
    recommendations: InfrastructureResourceRecommendation[]
  ): string {
    const serviceRecs = recommendations.filter(r => r.service === service);
    
    const cpuRec = serviceRecs.find(r => r.resourceType === 'cpu');
    const memoryRec = serviceRecs.find(r => r.resourceType === 'memory');
    
    const lines: string[] = [];
    
    lines.push(`Kubernetes Resource Recommendations for ${service}`);
    lines.push('='.repeat(50));
    
    if (cpuRec) {
      lines.push(`CPU:`);
      lines.push(`  Request: ${cpuRec.recommendedAllocation}`);
      lines.push(`  Limit: ${cpuRec.recommendedAllocation * 1.5}`);
      lines.push(`  Reason: ${cpuRec.reason}`);
    }
    
    if (memoryRec) {
      lines.push(`Memory:`);
      lines.push(`  Request: ${memoryRec.recommendedAllocation}Mi`);
      lines.push(`  Limit: ${memoryRec.recommendedAllocation * 1.5}Mi`);
      lines.push(`  Reason: ${memoryRec.reason}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate cost optimization report
   */
  static generateCostReport(costAnalysis: InfrastructureCostAnalysis[]): string {
    const lines: string[] = [];
    
    lines.push('Infrastructure Cost Optimization Report');
    lines.push('='.repeat(50));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    let totalSavings = 0;
    
    costAnalysis.forEach(analysis => {
      lines.push(`${analysis.service} (${analysis.resourceType}):`);
      lines.push(`  Current Cost: $${analysis.currentCost.toFixed(2)}/hour`);
      lines.push(`  Optimized Cost: $${analysis.optimizedCost.toFixed(2)}/hour`);
      lines.push(`  Savings: $${analysis.savings.toFixed(2)}/hour (${analysis.savingsPercentage.toFixed(1)}%)`);
      lines.push(`  Recommendations: ${analysis.recommendations.join(', ')}`);
      lines.push('');
      
      totalSavings += analysis.savings;
    });
    
    lines.push(`Total Savings: $${totalSavings.toFixed(2)}/hour`);
    
    return lines.join('\n');
  }
}