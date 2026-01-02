import { Counter, Gauge, register } from 'prom-client';
import { Tracer } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface CostMetric {
  service: string;
  resource: string;
  cost: number;
  currency: string;
  period: string; // hourly, daily, monthly
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CostCategory {
  category: string;
  totalCost: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  services: string[];
}

export interface OptimizationOpportunity {
  id: string;
  title: string;
  description: string;
  category: 'compute' | 'storage' | 'network' | 'ai_api' | 'observability';
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  services: string[];
  implementation: string[];
  roi: number;
  priority: number;
}

export interface CostBudget {
  id: string;
  name: string;
  service?: string;
  category?: string;
  limit: number;
  spent: number;
  period: string;
  alerts: {
    threshold: number; // percentage
    enabled: boolean;
  };
}

// Cost optimization manager
export class CostOptimizationManager {
  private tracer: Tracer;
  
  // Cost metrics
  private costGauge: Gauge<string>;
  private costCounter: Counter<string>;
  private budgetUtilizationGauge: Gauge<string>;
  private optimizationSavingsCounter: Counter<string>;
  
  // Cost tracking
  private costHistory: Map<string, CostMetric[]> = new Map();
  private budgets: Map<string, CostBudget> = new Map();
  private optimizations: Map<string, OptimizationOpportunity> = new Map();
  
  // Cost thresholds
  private readonly HIGH_COST_THRESHOLD = 1000; // USD per month
  private readonly COST_GROWTH_THRESHOLD = 0.2; // 20% month-over-month
  private readonly OBSERVABILITY_COST_RATIO = 0.05; // 5% of infrastructure cost
  
  constructor() {
    this.tracer = getTracer('CostOptimizationManager');
    
    // Initialize metrics
    this.costGauge = new Gauge({
      name: 'cost_monthly_usd',
      help: 'Monthly cost in USD',
      labelNames: ['service', 'resource', 'category']
    });
    
    this.costCounter = new Counter({
      name: 'cost_accumulated_usd',
      help: 'Accumulated cost in USD',
      labelNames: ['service', 'resource', 'category', 'period']
    });
    
    this.budgetUtilizationGauge = new Gauge({
      name: 'cost_budget_utilization_percent',
      help: 'Budget utilization percentage',
      labelNames: ['budget_id', 'budget_name']
    });
    
    this.optimizationSavingsCounter = new Counter({
      name: 'cost_optimization_savings_usd',
      help: 'Total savings from optimizations',
      labelNames: ['optimization_id', 'category']
    });
    
    register.registerMetric(this.costGauge);
    register.registerMetric(this.costCounter);
    register.registerMetric(this.budgetUtilizationGauge);
    register.registerMetric(this.optimizationSavingsCounter);
    
    // Initialize budgets and optimizations
    this.initializeDefaultBudgets();
    this.identifyOptimizationOpportunities();
  }
  
  /**
   * Record cost metric
   */
  async recordCost(metric: CostMetric): Promise<void> {
    const span = this.tracer.startSpan('recordCost');
    
    try {
      // Update metrics
      this.costGauge
        .labels(metric.service, metric.resource, this.categorizeResource(metric.resource))
        .set(metric.cost);
      
      this.costCounter
        .labels(metric.service, metric.resource, this.categorizeResource(metric.resource), metric.period)
        .inc(metric.cost);
      
      // Store in history
      const key = `${metric.service}:${metric.resource}`;
      if (!this.costHistory.has(key)) {
        this.costHistory.set(key, []);
      }
      this.costHistory.get(key)!.push(metric);
      
      // Check budget alerts
      await this.checkBudgetAlerts(metric);
      
      // Analyze cost trends
      await this.analyzeCostTrends(metric);
      
      logger.info('Cost metric recorded', {
        service: metric.service,
        resource: metric.resource,
        cost: metric.cost,
        currency: metric.currency,
        service: 'cost-optimization-manager'
      });
      
    } catch (error) {
      logger.error('Failed to record cost metric', {
        service: metric.service,
        resource: metric.resource,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'cost-optimization-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(metric: CostMetric): Promise<void> {
    for (const budget of this.budgets.values()) {
      if (budget.enabled && this.isBudgetApplicable(budget, metric)) {
        const utilization = (budget.spent / budget.limit) * 100;
        
        this.budgetUtilizationGauge
          .labels(budget.id, budget.name)
          .set(utilization);
        
        if (utilization >= budget.alerts.threshold) {
          logger.warn('Budget alert triggered', {
            budgetName: budget.name,
            utilization: utilization.toFixed(1),
            limit: budget.limit,
            spent: budget.spent,
            service: 'cost-optimization-manager'
          });
          
          // In a real implementation, send notifications
          await this.sendBudgetAlert(budget, utilization);
        }
      }
    }
  }
  
  /**
   * Analyze cost trends
   */
  private async analyzeCostTrends(metric: CostMetric): Promise<void> {
    const key = `${metric.service}:${metric.resource}`;
    const history = this.costHistory.get(key);
    
    if (!history || history.length < 2) return;
    
    const current = metric.cost;
    const previous = history[history.length - 2].cost;
    const growthRate = (current - previous) / previous;
    
    if (growthRate > this.COST_GROWTH_THRESHOLD) {
      logger.warn('Cost growth anomaly detected', {
        service: metric.service,
        resource: metric.resource,
        growthRate: growthRate.toFixed(3),
        current,
        previous,
        service: 'cost-optimization-manager'
      });
    }
  }
  
  /**
   * Generate cost report
   */
  async generateCostReport(period: string = '30d'): Promise<{
    summary: {
      totalCost: number;
      costByCategory: CostCategory[];
      topCostDrivers: Array<{ service: string; resource: string; cost: number }>;
      trends: Array<{ service: string; trend: 'increasing' | 'decreasing' | 'stable' }>;
    };
    budgetStatus: Array<{
      budget: CostBudget;
      utilization: number;
      status: 'healthy' | 'warning' | 'critical';
    }>;
    optimizationOpportunities: OptimizationOpportunity[];
  }> {
    const costs = this.aggregateCosts(period);
    const categories = this.calculateCostCategories(costs);
    const topDrivers = this.getTopCostDrivers(costs);
    const trends = this.analyzeTrends();
    
    const budgetStatus = Array.from(this.budgets.values()).map(budget => {
      const utilization = (budget.spent / budget.limit) * 100;
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (utilization >= 90) status = 'critical';
      else if (utilization >= 70) status = 'warning';
      
      return { budget, utilization, status };
    });
    
    return {
      summary: {
        totalCost: costs.reduce((sum, c) => sum + c.cost, 0),
        costByCategory: categories,
        topCostDrivers: topDrivers,
        trends
      },
      budgetStatus,
      optimizationOpportunities: Array.from(this.optimizations.values())
    };
  }
  
  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Analyze cost patterns
    for (const [key, costs] of this.costHistory.entries()) {
      const [service, resource] = key.split(':');
      const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
      
      // High-cost resources
      if (totalCost > this.HIGH_COST_THRESHOLD) {
        opportunities.push({
          id: `optimize-${service}-${resource}`,
          title: `Optimize ${service} ${resource} costs`,
          description: `High cost resource identified: $${totalCost.toFixed(2)}/month`,
          category: this.categorizeResource(resource) as any,
          potentialSavings: totalCost * 0.3, // 30% potential savings
          effort: totalCost > 5000 ? 'high' : 'medium',
          impact: 'high',
          services: [service],
          implementation: [
            'Review resource utilization',
            'Implement auto-scaling',
            'Optimize query performance',
            'Consider reserved instances'
          ],
          roi: 300,
          priority: 1
        });
      }
    }
    
    // Observability cost optimization
    const observabilityCost = await this.calculateObservabilityCosts();
    const totalCost = opportunities.reduce((sum, o) => sum + o.potentialSavings, 0);
    const observabilityRatio = observabilityCost / totalCost;
    
    if (observabilityRatio > this.OBSERVABILITY_COST_RATIO) {
      opportunities.push({
        id: 'optimize-observability-costs',
        title: 'Reduce observability stack costs',
        description: 'Observability costs exceed recommended 5% ratio',
        category: 'observability',
        potentialSavings: observabilityCost * 0.4, // 40% potential savings
        effort: 'medium',
        impact: 'medium',
        services: ['monitoring-stack'],
        implementation: [
          'Implement trace sampling',
          'Reduce metric cardinality',
          'Optimize log retention policies',
          'Use cheaper storage tiers'
        ],
        roi: 250,
        priority: 2
      });
    }
    
    // AI/ML cost optimization
    const aiCosts = await this.calculateAICosts();
    if (aiCosts > 1000) {
      opportunities.push({
        id: 'optimize-ai-costs',
        title: 'Optimize AI/ML API costs',
        description: 'High AI API costs identified',
        category: 'ai_api',
        potentialSavings: aiCosts * 0.25, // 25% potential savings
        effort: 'medium',
        impact: 'high',
        services: ['ai-service', 'orchestrator'],
        implementation: [
          'Implement result caching',
          'Batch API requests',
          'Use cheaper models where appropriate',
          'Optimize prompt engineering'
        ],
        roi: 400,
        priority: 1
      });
    }
    
    return opportunities.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Calculate AI/ML costs
   */
  private async calculateAICosts(): Promise<number> {
    let total = 0;
    
    for (const [key, costs] of this.costHistory.entries()) {
      const [, resource] = key.split(':');
      if (resource.includes('ai') || resource.includes('openai') || resource.includes('langchain')) {
        total += costs.reduce((sum, c) => sum + c.cost, 0);
      }
    }
    
    return total;
  }
  
  /**
   * Calculate observability costs
   */
  private async calculateObservabilityCosts(): Promise<number> {
    let total = 0;
    
    for (const [key, costs] of this.costHistory.entries()) {
      const [, resource] = key.split(':');
      const lowerResource = resource.toLowerCase();
      if (lowerResource.includes('prometheus') || 
          lowerResource.includes('grafana') || 
          lowerResource.includes('loki') || 
          lowerResource.includes('jaeger') ||
          lowerResource.includes('observability')) {
        total += costs.reduce((sum, c) => sum + c.cost, 0);
      }
    }
    
    return total;
  }
  
  /**
   * Categorize resource by cost type
   */
  private categorizeResource(resource: string): string {
    const lowerResource = resource.toLowerCase();
    
    if (lowerResource.includes('compute') || lowerResource.includes('cpu') || lowerResource.includes('instance')) {
      return 'compute';
    } else if (lowerResource.includes('storage') || lowerResource.includes('disk') || lowerResource.includes('s3')) {
      return 'storage';
    } else if (lowerResource.includes('network') || lowerResource.includes('bandwidth') || lowerResource.includes('transfer')) {
      return 'network';
    } else if (lowerResource.includes('ai') || lowerResource.includes('openai') || lowerResource.includes('langchain')) {
      return 'ai_api';
    } else if (lowerResource.includes('prometheus') || lowerResource.includes('grafana') || lowerResource.includes('observability')) {
      return 'observability';
    } else {
      return 'other';
    }
  }
  
  /**
   * Check if budget is applicable to metric
   */
  private isBudgetApplicable(budget: CostBudget, metric: CostMetric): boolean {
    if (budget.service && budget.service !== metric.service) return false;
    if (budget.category && budget.category !== this.categorizeResource(metric.resource)) return false;
    return true;
  }
  
  /**
   * Send budget alert
   */
  private async sendBudgetAlert(budget: CostBudget, utilization: number): Promise<void> {
    // In a real implementation, send notifications via email, Slack, etc.
    logger.warn('Budget alert sent', {
      budgetName: budget.name,
      utilization,
      limit: budget.limit,
      spent: budget.spent,
      service: 'cost-optimization-manager'
    });
  }
  
  /**
   * Aggregate costs for period
   */
  private aggregateCosts(period: string): CostMetric[] {
    const allCosts: CostMetric[] = [];
    
    for (const costs of this.costHistory.values()) {
      allCosts.push(...costs);
    }
    
    // Filter by period (simplified - in real implementation, filter by date)
    return allCosts;
  }
  
  /**
   * Calculate cost categories
   */
  private calculateCostCategories(costs: CostMetric[]): CostCategory[] {
    const categoryTotals = new Map<string, number>();
    const categoryServices = new Map<string, Set<string>>();
    
    for (const cost of costs) {
      const category = this.categorizeResource(cost.resource);
      const current = categoryTotals.get(category) || 0;
      categoryTotals.set(category, current + cost.cost);
      
      if (!categoryServices.has(category)) {
        categoryServices.set(category, new Set());
      }
      categoryServices.get(category)!.add(cost.service);
    }
    
    const totalCost = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c, 0);
    
    return Array.from(categoryTotals.entries()).map(([category, total]) => ({
      category,
      totalCost,
      percentage: (total / totalCost) * 100,
      trend: 'stable' as const, // In real implementation, calculate trend
      services: Array.from(categoryServices.get(category) || [])
    }));
  }
  
  /**
   * Get top cost drivers
   */
  private getTopCostDrivers(costs: CostMetric[]): Array<{ service: string; resource: string; cost: number }> {
    const driverMap = new Map<string, { service: string; resource: string; cost: number }>();
    
    for (const cost of costs) {
      const key = `${cost.service}:${cost.resource}`;
      const current = driverMap.get(key);
      
      if (current) {
        current.cost += cost.cost;
      } else {
        driverMap.set(key, {
          service: cost.service,
          resource: cost.resource,
          cost: cost.cost
        });
      }
    }
    
    return Array.from(driverMap.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }
  
  /**
   * Analyze cost trends
   */
  private analyzeTrends(): Array<{ service: string; trend: 'increasing' | 'decreasing' | 'stable' }> {
    const trends = new Map<string, { service: string; trend: 'increasing' | 'decreasing' | 'stable' }>();
    
    for (const [key, costs] of this.costHistory.entries()) {
      const [service] = key.split(':');
      
      if (costs.length < 2) continue;
      
      const recent = costs.slice(-3); // Last 3 data points
      const first = recent[0].cost;
      const last = recent[recent.length - 1].cost;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const changeRate = (last - first) / first;
      
      if (changeRate > 0.1) trend = 'increasing';
      else if (changeRate < -0.1) trend = 'decreasing';
      
      trends.set(service, { service, trend });
    }
    
    return Array.from(trends.values());
  }
  
  /**
   * Initialize default budgets
   */
  private initializeDefaultBudgets(): void {
    const defaultBudgets: CostBudget[] = [
      {
        id: 'total-monthly',
        name: 'Total Monthly Budget',
        limit: 5000,
        spent: 0,
        period: 'monthly',
        alerts: {
          threshold: 80,
          enabled: true
        }
      },
      {
        id: 'ai-monthly',
        name: 'AI/ML Monthly Budget',
        limit: 2000,
        spent: 0,
        period: 'monthly',
        alerts: {
          threshold: 75,
          enabled: true
        }
      },
      {
        id: 'observability-monthly',
        name: 'Observability Monthly Budget',
        limit: 500,
        spent: 0,
        period: 'monthly',
        alerts: {
          threshold: 85,
          enabled: true
        }
      }
    ];
    
    for (const budget of defaultBudgets) {
      this.budgets.set(budget.id, budget);
    }
  }
  
  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(): void {
    // This will be populated with real opportunities based on cost analysis
    logger.info('Default optimization opportunities initialized', {
      count: this.optimizations.size,
      service: 'cost-optimization-manager'
    });
  }
}