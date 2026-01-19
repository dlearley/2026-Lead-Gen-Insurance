/**
 * Advanced Monitoring & Cost Optimization Types - Task 10.8
 * 
 * Type definitions for advanced monitoring, cost tracking, 
 * optimization recommendations, and infrastructure management.
 */

/**
 * Cost metric for tracking service costs
 */
export interface CostMetric {
  id: string;
  service: string;
  resource: string;
  cost: number;
  currency: string;
  period: 'hourly' | 'daily' | 'monthly' | 'yearly';
  timestamp: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Cost category aggregation
 */
export interface CostCategory {
  category: string;
  totalCost: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  services: string[];
  monthOverMonth?: number;
}

/**
 * Cost optimization opportunity
 */
export interface OptimizationOpportunity {
  id: string;
  title: string;
  description: string;
  category: 'compute' | 'storage' | 'network' | 'ai_api' | 'observability' | 'database' | 'other';
  potentialSavings: number;
  currency: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  priority: 1 | 2 | 3 | 4 | 5;
  services: string[];
  implementation: string[];
  roi: number;
  status: 'identified' | 'in_progress' | 'implemented' | 'rejected';
  createdAt: Date;
  implementedAt?: Date;
}

/**
 * Cost budget configuration
 */
export interface CostBudget {
  id: string;
  name: string;
  service?: string;
  category?: string;
  limit: number;
  spent: number;
  remaining: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alerts: BudgetAlert[];
  enabled: boolean;
}

/**
 * Budget alert configuration
 */
export interface BudgetAlert {
  threshold: number; // percentage
  enabled: boolean;
  recipients: string[];
  channels: ('email' | 'slack' | 'sms' | 'webhook')[];
  lastTriggered?: Date;
}

/**
 * Cost allocation by service/team
 */
export interface CostAllocation {
  service: string;
  team?: string;
  department?: string;
  cost: number;
  percentage: number;
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    ai: number;
    database: number;
    other: number;
  };
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
  service: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'network';
  current: number;
  allocated: number;
  utilization: number; // percentage
  recommendation?: 'increase' | 'decrease' | 'optimal';
  timestamp: Date;
}

/**
 * System health status
 */
export interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'critical' | 'down';
  uptime: number; // seconds
  responseTime: number; // ms
  errorRate: number; // percentage
  throughput: number; // requests per second
  checks: HealthCheck[];
  lastCheck: Date;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  duration: number; // ms
  details?: Record<string, any>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  service: string;
  metrics: {
    p50: number; // median response time in ms
    p95: number;
    p99: number;
    average: number;
    min: number;
    max: number;
  };
  throughput: number; // requests per second
  errorRate: number; // percentage
  timestamp: Date;
}

/**
 * Monitoring alert
 */
export interface MonitoringAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  service: string;
  metric: string;
  threshold: number;
  currentValue: number;
  status: 'firing' | 'resolved' | 'acknowledged';
  createdAt: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  tags?: string[];
}

/**
 * Cost report
 */
export interface CostReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalCost: number;
    currency: string;
    costByCategory: CostCategory[];
    topCostDrivers: Array<{
      service: string;
      resource: string;
      cost: number;
    }>;
    trends: Array<{
      service: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      change: number; // percentage
    }>;
  };
  budgetStatus: Array<{
    budget: CostBudget;
    utilization: number;
    status: 'healthy' | 'warning' | 'critical';
    daysRemaining: number;
  }>;
  optimizationOpportunities: OptimizationOpportunity[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Infrastructure monitoring dashboard
 */
export interface MonitoringDashboard {
  name: string;
  description: string;
  sections: DashboardSection[];
  refreshInterval: number; // seconds
  filters?: Record<string, any>;
}

/**
 * Dashboard section
 */
export interface DashboardSection {
  title: string;
  widgets: DashboardWidget[];
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'cost';
  title: string;
  query: string;
  visualization?: {
    type: 'line' | 'bar' | 'pie' | 'gauge' | 'number';
    options?: Record<string, any>;
  };
  size: 'small' | 'medium' | 'large';
}

/**
 * Auto-scaling configuration
 */
export interface AutoScalingConfig {
  service: string;
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCPU: number; // percentage
  targetMemory: number; // percentage
  scaleUpPolicy: ScalingPolicy;
  scaleDownPolicy: ScalingPolicy;
  cooldownPeriod: number; // seconds
}

/**
 * Scaling policy
 */
export interface ScalingPolicy {
  type: 'step' | 'target' | 'simple';
  threshold: number;
  adjustment: number;
  stabilizationWindow: number; // seconds
}

/**
 * Auto-scaling event
 */
export interface AutoScalingEvent {
  id: string;
  service: string;
  action: 'scale_up' | 'scale_down';
  fromReplicas: number;
  toReplicas: number;
  trigger: string;
  reason: string;
  timestamp: Date;
  duration?: number; // seconds
  success: boolean;
}

/**
 * Cost anomaly detection
 */
export interface CostAnomaly {
  id: string;
  service: string;
  resource: string;
  detectedAt: Date;
  expectedCost: number;
  actualCost: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  rootCause?: string;
  resolution?: string;
}

/**
 * Infrastructure recommendation
 */
export interface InfrastructureRecommendation {
  id: string;
  type: 'resize' | 'autoscale' | 'reservation' | 'spot' | 'shutdown' | 'other';
  service: string;
  resource: string;
  currentConfig: Record<string, any>;
  recommendedConfig: Record<string, any>;
  estimatedSavings: number;
  confidence: number; // percentage
  reasoning: string;
  risks: string[];
  createdAt: Date;
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
}

/**
 * Cloud provider integration
 */
export interface CloudProviderCost {
  provider: 'aws' | 'gcp' | 'azure' | 'other';
  accountId: string;
  service: string;
  cost: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  resources: Array<{
    id: string;
    name: string;
    type: string;
    cost: number;
    tags: Record<string, string>;
  }>;
}

/**
 * Extended observability cost tracking with recommendations
 */
export interface ObservabilityCostExtended {
  traces: {
    count: number;
    storage: number; // GB
    cost: number;
  };
  logs: {
    bytes: number;
    storage: number; // GB
    cost: number;
  };
  metrics: {
    count: number;
    dataPoints: number;
    cost: number;
  };
  total: number;
  ratio: number; // As percentage of total infrastructure cost
  recommendations: string[];
}

/**
 * SLA/SLO tracking
 */
export interface SLOTracking {
  service: string;
  slo: {
    name: string;
    target: number; // percentage
    window: string; // e.g., "30d"
  };
  current: {
    value: number; // percentage
    errorBudget: number;
    errorBudgetRemaining: number;
  };
  status: 'meeting' | 'at_risk' | 'breached';
  history: Array<{
    timestamp: Date;
    value: number;
  }>;
}

/**
 * Resource tag for cost allocation
 */
export interface ResourceTag {
  key: string;
  value: string;
  category?: 'team' | 'environment' | 'project' | 'cost_center' | 'other';
}

/**
 * Cost forecast
 */
export interface CostForecast {
  service: string;
  period: {
    start: Date;
    end: Date;
  };
  forecast: Array<{
    date: Date;
    predictedCost: number;
    confidence: {
      lower: number;
      upper: number;
    };
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
  recommendations: string[];
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // seconds
  retentionPeriod: number; // days
  alertingEnabled: boolean;
  costTrackingEnabled: boolean;
  providers: {
    prometheus?: {
      endpoint: string;
      scrapeInterval: number;
    };
    grafana?: {
      endpoint: string;
      apiKey: string;
    };
    cloudWatch?: {
      region: string;
      namespace: string;
    };
  };
}

/**
 * Cost optimization settings
 */
export interface CostOptimizationSettings {
  autoOptimize: boolean;
  approvalRequired: boolean;
  maxSavingsThreshold: number; // Only optimize if savings exceed this
  excludedServices: string[];
  optimizationStrategies: {
    rightSizing: boolean;
    autoScaling: boolean;
    reservedInstances: boolean;
    spotInstances: boolean;
    storageOptimization: boolean;
    networkOptimization: boolean;
  };
  notifications: {
    channels: ('email' | 'slack' | 'webhook')[];
    recipients: string[];
  };
}

/**
 * DTO for creating cost metric
 */
export interface CreateCostMetricDTO {
  service: string;
  resource: string;
  cost: number;
  currency?: string;
  period: 'hourly' | 'daily' | 'monthly' | 'yearly';
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * DTO for creating budget
 */
export interface CreateBudgetDTO {
  name: string;
  service?: string;
  category?: string;
  limit: number;
  currency?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alerts: BudgetAlert[];
}

/**
 * DTO for cost report filters
 */
export interface CostReportFilters {
  startDate?: Date;
  endDate?: Date;
  services?: string[];
  categories?: string[];
  minCost?: number;
  maxCost?: number;
  tags?: Record<string, string>;
}

/**
 * DTO for monitoring query
 */
export interface MonitoringQuery {
  metric: string;
  service?: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeRange: {
    start: Date;
    end: Date;
  };
  groupBy?: string[];
  filters?: Record<string, any>;
}
