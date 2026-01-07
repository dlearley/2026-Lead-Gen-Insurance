import { Gauge, Counter, Histogram, register } from 'prom-client';
import { Tracer } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface CustomerMetrics {
  customerId: string;
  totalLeadsProcessed: number;
  leadsThisMonth: number;
  apiCallsToday: number;
  apiCallsThisMonth: number;
  featureAdoption: Map<string, number>; // feature -> adoption score (0-100)
  engagementScore: number; // 0-100
  lastActiveDate: Date;
  onboardingDate: Date;
  plan: 'starter' | 'professional' | 'enterprise';
  health: 'healthy' | 'at-risk' | 'churn-risk';
  npsScore?: number;
}

export interface FeatureAdoption {
  featureId: string;
  featureName: string;
  category: string;
  adoptionRate: number; // percentage of eligible customers using this feature
  usageFrequency: number; // average times used per month
  customerSegments: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  impact: 'low' | 'medium' | 'high';
  trend: 'growing' | 'stable' | 'declining';
}

export interface CustomerSegment {
  segmentId: string;
  name: string;
  criteria: {
    plan?: string[];
    leadsPerMonth?: { min?: number; max?: number };
    apiCallsPerMonth?: { min?: number; max?: number };
    tenure?: { min?: number; max?: number }; // days
  };
  characteristics: {
    averageRevenue: number;
    averageEngagement: number;
    churnRate: number;
    topFeatures: string[];
    painPoints: string[];
  };
}

export interface CustomerSuccessAction {
  id: string;
  customerId: string;
  type: 'check-in' | 'training' | 'optimization' | 'expansion' | 'retention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate?: Date;
  outcome?: string;
}

export interface AdoptionInsight {
  type: 'opportunity' | 'risk' | 'trend';
  title: string;
  description: string;
  affectedCustomers: number;
  impact: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  estimatedImpact: {
    revenue?: number;
    retention?: number;
    engagement?: number;
  };
}

// Customer success and adoption tracking system
export class CustomerSuccessManager {
  private tracer: Tracer;
  
  // Metrics
  private customerEngagementGauge: Gauge<string>;
  private featureAdoptionGauge: Gauge<string>;
  private customerHealthGauge: Gauge<string>;
  private churnRiskGauge: Gauge<string>;
  private adoptionEventsCounter: Counter<string>;
  private customerInteractionsHistogram: Histogram<string>;
  
  // Data storage
  private customers: Map<string, CustomerMetrics> = new Map();
  private featureAdoptions: Map<string, FeatureAdoption> = new Map();
  private customerSegments: Map<string, CustomerSegment> = new Map();
  private successActions: Map<string, CustomerSuccessAction> = new Map();
  
  constructor() {
    this.tracer = getTracer('CustomerSuccessManager');
    
    // Initialize metrics
    this.customerEngagementGauge = new Gauge({
      name: 'customer_engagement_score',
      help: 'Customer engagement score (0-100)',
      labelNames: ['customer_id', 'segment', 'plan']
    });
    
    this.featureAdoptionGauge = new Gauge({
      name: 'feature_adoption_rate_percent',
      help: 'Feature adoption rate percentage',
      labelNames: ['feature_id', 'feature_name', 'category']
    });
    
    this.customerHealthGauge = new Gauge({
      name: 'customer_health_score',
      help: 'Customer health score (0-100)',
      labelNames: ['customer_id', 'health_status']
    });
    
    this.churnRiskGauge = new Gauge({
      name: 'customer_churn_risk_score',
      help: 'Customer churn risk score (0-100)',
      labelNames: ['customer_id', 'risk_level']
    });
    
    this.adoptionEventsCounter = new Counter({
      name: 'feature_adoption_events_total',
      help: 'Total feature adoption events',
      labelNames: ['feature_id', 'event_type', 'customer_segment']
    });
    
    this.customerInteractionsHistogram = new Histogram({
      name: 'customer_interactions_duration_minutes',
      help: 'Duration of customer interactions in minutes',
      labelNames: ['interaction_type', 'customer_segment'],
      buckets: [15, 30, 60, 120, 240, 480]
    });
    
    register.registerMetric(this.customerEngagementGauge);
    register.registerMetric(this.featureAdoptionGauge);
    register.registerMetric(this.customerHealthGauge);
    register.registerMetric(this.churnRiskGauge);
    register.registerMetric(this.adoptionEventsCounter);
    register.registerMetric(this.customerInteractionsHistogram);
    
    // Initialize default data
    this.initializeDefaultSegments();
    this.initializeDefaultFeatures();
  }
  
  /**
   * Update customer metrics
   */
  async updateCustomerMetrics(customerId: string, metrics: Partial<CustomerMetrics>): Promise<void> {
    const span = this.tracer.startSpan('updateCustomerMetrics');
    
    try {
      const existing = this.customers.get(customerId) || this.createDefaultCustomer(customerId);
      const updated = { ...existing, ...metrics };
      
      // Recalculate derived metrics
      updated.engagementScore = this.calculateEngagementScore(updated);
      updated.health = this.calculateCustomerHealth(updated);
      
      this.customers.set(customerId, updated);
      
      // Update Prometheus metrics
      this.customerEngagementGauge
        .labels(customerId, this.getCustomerSegment(updated), updated.plan)
        .set(updated.engagementScore);
      
      this.customerHealthGauge
        .labels(customerId, updated.health)
        .set(updated.health === 'healthy' ? 100 : updated.health === 'at-risk' ? 50 : 0);
      
      // Check for churn risk
      const churnRisk = this.calculateChurnRisk(updated);
      this.churnRiskGauge
        .labels(customerId, churnRisk > 70 ? 'high' : churnRisk > 40 ? 'medium' : 'low')
        .set(churnRisk);
      
      // Trigger success actions if needed
      await this.evaluateSuccessActions(updated);
      
      logger.info('Customer metrics updated', {
        customerId,
        engagementScore: updated.engagementScore,
        health: updated.health,
        churnRisk,
        service: 'customer-success-manager'
      });
      
    } catch (error) {
      logger.error('Failed to update customer metrics', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'customer-success-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Track feature adoption
   */
  async trackFeatureAdoption(customerId: string, featureId: string, usageData: {
    frequency?: number;
    duration?: number;
    value?: number;
  }): Promise<void> {
    const span = this.tracer.startSpan('trackFeatureAdoption');
    
    try {
      const customer = this.customers.get(customerId);
      if (!customer) {
        logger.warn('Customer not found for feature adoption tracking', { customerId, service: 'customer-success-manager' });
        return;
      }
      
      // Update customer feature adoption
      if (!customer.featureAdoption) {
        customer.featureAdoption = new Map();
      }
      
      const currentAdoption = customer.featureAdoption.get(featureId) || 0;
      const newAdoption = Math.min(100, currentAdoption + (usageData.value || 10));
      customer.featureAdoption.set(featureId, newAdoption);
      
      // Update global feature adoption metrics
      const featureAdoption = this.featureAdoptions.get(featureId);
      if (featureAdoption) {
        // Recalculate adoption rate
        const totalCustomers = this.customers.size;
        const usingFeature = Array.from(this.customers.values())
          .filter(c => (c.featureAdoption?.get(featureId) || 0) > 0).length;
        
        featureAdoption.adoptionRate = (usingFeature / totalCustomers) * 100;
        
        // Update Prometheus metrics
        this.featureAdoptionGauge
          .labels(featureId, featureAdoption.featureName, featureAdoption.category)
          .set(featureAdoption.adoptionRate);
      }
      
      // Record adoption event
      this.adoptionEventsCounter
        .labels(featureId, 'usage', this.getCustomerSegment(customer))
        .inc();
      
      // Update customer engagement
      customer.engagementScore = this.calculateEngagementScore(customer);
      this.customerEngagementGauge
        .labels(customerId, this.getCustomerSegment(customer), customer.plan)
        .set(customer.engagementScore);
      
      logger.info('Feature adoption tracked', {
        customerId,
        featureId,
        adoptionRate: newAdoption,
        service: 'customer-success-manager'
      });
      
    } catch (error) {
      logger.error('Failed to track feature adoption', {
        customerId,
        featureId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'customer-success-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Generate customer success report
   */
  async generateCustomerSuccessReport(period: string = '30d'): Promise<{
    summary: {
      totalCustomers: number;
      healthyCustomers: number;
      atRiskCustomers: number;
      churnRiskCustomers: number;
      averageEngagementScore: number;
      featureAdoptionRate: number;
      customerGrowth: number;
    };
    segments: CustomerSegment[];
    topFeatures: FeatureAdoption[];
    atRiskCustomers: CustomerMetrics[];
    recommendations: string[];
    successActions: CustomerSuccessAction[];
  }> {
    const allCustomers = Array.from(this.customers.values());
    const allFeatures = Array.from(this.featureAdoptions.values());
    
    // Calculate summary metrics
    const totalCustomers = allCustomers.length;
    const healthyCustomers = allCustomers.filter(c => c.health === 'healthy').length;
    const atRiskCustomers = allCustomers.filter(c => c.health === 'at-risk').length;
    const churnRiskCustomers = allCustomers.filter(c => c.health === 'churn-risk').length;
    const averageEngagement = allCustomers.reduce((sum, c) => sum + c.engagementScore, 0) / totalCustomers;
    
    const totalFeatureAdoption = allFeatures.reduce((sum, f) => sum + f.adoptionRate, 0);
    const averageFeatureAdoption = allFeatures.length > 0 ? totalFeatureAdoption / allFeatures.length : 0;
    
    // Customer growth (simplified - in real implementation, compare with previous period)
    const customerGrowth = 15; // Mock data
    
    const atRisk = allCustomers.filter(c => c.health !== 'healthy');
    const topFeatures = allFeatures
      .sort((a, b) => b.adoptionRate - a.adoptionRate)
      .slice(0, 10);
    
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (atRiskCustomers > totalCustomers * 0.2) {
      recommendations.push('Increase customer success outreach to at-risk accounts');
    }
    
    if (averageEngagement < 60) {
      recommendations.push('Implement engagement campaigns to improve customer activity');
    }
    
    if (averageFeatureAdoption < 40) {
      recommendations.push('Focus on feature education and onboarding improvements');
    }
    
    const pendingActions = Array.from(this.successActions.values())
      .filter(a => a.status === 'pending');
    
    return {
      summary: {
        totalCustomers,
        healthyCustomers,
        atRiskCustomers,
        churnRiskCustomers,
        averageEngagementScore: averageEngagement,
        featureAdoptionRate: averageFeatureAdoption,
        customerGrowth
      },
      segments: Array.from(this.customerSegments.values()),
      topFeatures,
      atRiskCustomers: atRisk,
      recommendations,
      successActions: pendingActions
    };
  }
  
  /**
   * Identify optimization opportunities
   */
  async identifyOptimizationOpportunities(): Promise<AdoptionInsight[]> {
    const insights: AdoptionInsight[] = [];
    const allCustomers = Array.from(this.customers.values());
    const allFeatures = Array.from(this.featureAdoptions.values());
    
    // Low adoption features
    for (const feature of allFeatures) {
      if (feature.adoptionRate < 30 && feature.impact === 'high') {
        insights.push({
          type: 'opportunity',
          title: `Low adoption of ${feature.featureName}`,
          description: `Only ${feature.adoptionRate.toFixed(1)}% of customers are using this high-impact feature`,
          affectedCustomers: Math.floor(allCustomers.length * feature.adoptionRate / 100),
          impact: 'high',
          recommendedActions: [
            'Create targeted training content',
            'Implement in-app guidance',
            'Schedule customer webinars',
            'Offer one-on-one training sessions'
          ],
          estimatedImpact: {
            engagement: 15,
            retention: 5
          }
        });
      }
    }
    
    // At-risk customer patterns
    const atRiskCustomers = allCustomers.filter(c => c.health !== 'healthy');
    if (atRiskCustomers.length > 0) {
      insights.push({
        type: 'risk',
        title: 'High number of at-risk customers',
        description: `${atRiskCustomers.length} customers are showing signs of churn risk`,
        affectedCustomers: atRiskCustomers.length,
        impact: 'high',
        recommendedActions: [
          'Immediate outreach to at-risk accounts',
          'Conduct satisfaction surveys',
          'Offer additional training',
          'Provide personalized optimization recommendations'
        ],
        estimatedImpact: {
          retention: 20
        }
      });
    }
    
    // Engagement trends
    const lowEngagementCustomers = allCustomers.filter(c => c.engagementScore < 40);
    if (lowEngagementCustomers.length > allCustomers.length * 0.3) {
      insights.push({
        type: 'opportunity',
        title: 'Low customer engagement',
        description: `${lowEngagementCustomers.length} customers have low engagement scores`,
        affectedCustomers: lowEngagementCustomers.length,
        impact: 'medium',
        recommendedActions: [
          'Send engagement-focused email campaigns',
          'Highlight unused features',
          'Share success stories and best practices',
          'Create personalized feature recommendations'
        ],
        estimatedImpact: {
          engagement: 25
        }
      });
    }
    
    // Feature usage trends
    const decliningFeatures = allFeatures.filter(f => f.trend === 'declining');
    if (decliningFeatures.length > 0) {
      insights.push({
        type: 'trend',
        title: 'Declining feature usage',
        description: `${decliningFeatures.length} features show declining usage trends`,
        affectedCustomers: Math.floor(allCustomers.length * 0.5), // Estimate
        impact: 'medium',
        recommendedActions: [
          'Investigate root causes of declining usage',
          'Gather customer feedback',
          'Consider feature improvements or deprecation',
          'Provide additional training and resources'
        ],
        estimatedImpact: {
          engagement: 10
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Create customer success action
   */
  async createSuccessAction(action: Omit<CustomerSuccessAction, 'id' | 'status'>): Promise<string> {
    const id = `CSA-${Date.now()}`;
    
    const fullAction: CustomerSuccessAction = {
      ...action,
      id,
      status: 'pending'
    };
    
    this.successActions.set(id, fullAction);
    
    logger.info('Customer success action created', {
      actionId: id,
      customerId: action.customerId,
      type: action.type,
      priority: action.priority,
      service: 'customer-success-manager'
    });
    
    return id;
  }
  
  /**
   * Update success action status
   */
  async updateSuccessActionStatus(actionId: string, status: CustomerSuccessAction['status'], outcome?: string): Promise<void> {
    const action = this.successActions.get(actionId);
    if (!action) {
      logger.warn('Success action not found', { actionId, service: 'customer-success-manager' });
      return;
    }
    
    action.status = status;
    action.completedDate = status === 'completed' ? new Date() : undefined;
    action.outcome = outcome;
    
    logger.info('Success action status updated', {
      actionId,
      status,
      outcome,
      service: 'customer-success-manager'
    });
  }
  
  /**
   * Calculate customer engagement score
   */
  private calculateEngagementScore(customer: CustomerMetrics): number {
    let score = 0;
    
    // Lead processing activity (40% weight)
    if (customer.totalLeadsProcessed > 0) {
      score += Math.min(40, (customer.leadsThisMonth / 100) * 40);
    }
    
    // API usage (30% weight)
    if (customer.apiCallsThisMonth > 0) {
      score += Math.min(30, (customer.apiCallsThisMonth / 1000) * 30);
    }
    
    // Feature adoption (20% weight)
    if (customer.featureAdoption && customer.featureAdoption.size > 0) {
      const avgAdoption = Array.from(customer.featureAdoption.values()).reduce((a, b) => a + b, 0) / customer.featureAdoption.size;
      score += (avgAdoption / 100) * 20;
    }
    
    // Recency (10% weight)
    const daysSinceActive = (Date.now() - customer.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 1) {
      score += 10;
    } else if (daysSinceActive <= 7) {
      score += 7;
    } else if (daysSinceActive <= 30) {
      score += 3;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate customer health
   */
  private calculateCustomerHealth(customer: CustomerMetrics): CustomerMetrics['health'] {
    const engagement = customer.engagementScore;
    const daysSinceActive = (Date.now() - customer.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (engagement >= 70 && daysSinceActive <= 7) {
      return 'healthy';
    } else if (engagement >= 40 && daysSinceActive <= 30) {
      return 'at-risk';
    } else {
      return 'churn-risk';
    }
  }
  
  /**
   * Calculate churn risk score
   */
  private calculateChurnRisk(customer: CustomerMetrics): number {
    let risk = 0;
    
    // Low engagement
    if (customer.engagementScore < 30) risk += 30;
    else if (customer.engagementScore < 60) risk += 15;
    
    // Inactivity
    const daysSinceActive = (Date.now() - customer.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > 30) risk += 40;
    else if (daysSinceActive > 7) risk += 20;
    
    // Low feature adoption
    if (customer.featureAdoption) {
      const avgAdoption = Array.from(customer.featureAdoption.values()).reduce((a, b) => a + b, 0) / customer.featureAdoption.size;
      if (avgAdoption < 20) risk += 20;
      else if (avgAdoption < 50) risk += 10;
    }
    
    // Recent NPS score (if available)
    if (customer.npsScore !== undefined && customer.npsScore < 6) {
      risk += 20;
    }
    
    return Math.min(100, risk);
  }
  
  /**
   * Get customer segment
   */
  private getCustomerSegment(customer: CustomerMetrics): string {
    for (const segment of this.customerSegments.values()) {
      if (this.matchesSegment(customer, segment)) {
        return segment.name;
      }
    }
    return 'default';
  }
  
  /**
   * Check if customer matches segment criteria
   */
  private matchesSegment(customer: CustomerMetrics, segment: CustomerSegment): boolean {
    const criteria = segment.criteria;
    
    if (criteria.plan && !criteria.plan.includes(customer.plan)) return false;
    if (criteria.leadsPerMonth) {
      if (criteria.leadsPerMonth.min && customer.leadsThisMonth < criteria.leadsPerMonth.min) return false;
      if (criteria.leadsPerMonth.max && customer.leadsThisMonth > criteria.leadsPerMonth.max) return false;
    }
    if (criteria.apiCallsPerMonth) {
      if (criteria.apiCallsPerMonth.min && customer.apiCallsThisMonth < criteria.apiCallsPerMonth.min) return false;
      if (criteria.apiCallsPerMonth.max && customer.apiCallsThisMonth > criteria.apiCallsPerMonth.max) return false;
    }
    if (criteria.tenure) {
      const tenure = (Date.now() - customer.onboardingDate.getTime()) / (1000 * 60 * 60 * 24);
      if (criteria.tenure.min && tenure < criteria.tenure.min) return false;
      if (criteria.tenure.max && tenure > criteria.tenure.max) return false;
    }
    
    return true;
  }
  
  /**
   * Evaluate if success actions should be triggered
   */
  private async evaluateSuccessActions(customer: CustomerMetrics): Promise<void> {
    // At-risk customer check
    if (customer.health === 'churn-risk') {
      await this.createSuccessAction({
        customerId: customer.customerId,
        type: 'retention',
        priority: 'critical',
        description: 'Customer showing high churn risk - immediate outreach required',
        assignedTo: 'customer-success-team',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }
    
    // Low engagement check
    if (customer.engagementScore < 40) {
      await this.createSuccessAction({
        customerId: customer.customerId,
        type: 'training',
        priority: 'high',
        description: 'Customer engagement is low - provide training and best practices',
        assignedTo: 'customer-success-team',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }
    
    // New customer check
    const tenure = (Date.now() - customer.onboardingDate.getTime()) / (1000 * 60 * 60 * 24);
    if (tenure <= 30 && customer.engagementScore < 60) {
      await this.createSuccessAction({
        customerId: customer.customerId,
        type: 'check-in',
        priority: 'medium',
        description: 'New customer check-in and optimization recommendations',
        assignedTo: 'customer-success-team',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      });
    }
  }
  
  /**
   * Create default customer object
   */
  private createDefaultCustomer(customerId: string): CustomerMetrics {
    return {
      customerId,
      totalLeadsProcessed: 0,
      leadsThisMonth: 0,
      apiCallsToday: 0,
      apiCallsThisMonth: 0,
      featureAdoption: new Map(),
      engagementScore: 0,
      lastActiveDate: new Date(),
      onboardingDate: new Date(),
      plan: 'starter',
      health: 'healthy'
    };
  }
  
  /**
   * Initialize default customer segments
   */
  private initializeDefaultSegments(): void {
    const segments: CustomerSegment[] = [
      {
        segmentId: 'new-customers',
        name: 'New Customers',
        criteria: {
          tenure: { max: 30 }
        },
        characteristics: {
          averageRevenue: 99,
          averageEngagement: 45,
          churnRate: 15,
          topFeatures: ['basic-lead-processing', 'email-templates'],
          painPoints: ['onboarding-complexity', 'feature-discovery']
        }
      },
      {
        segmentId: 'power-users',
        name: 'Power Users',
        criteria: {
          leadsPerMonth: { min: 500 },
          apiCallsPerMonth: { min: 10000 }
        },
        characteristics: {
          averageRevenue: 499,
          averageEngagement: 85,
          churnRate: 2,
          topFeatures: ['advanced-automation', 'api-integration', 'custom-workflows'],
          painPoints: ['api-rate-limits', 'advanced-reporting']
        }
      },
      {
        segmentId: 'at-risk',
        name: 'At-Risk Customers',
        criteria: {
          leadsPerMonth: { max: 50 }
        },
        characteristics: {
          averageRevenue: 99,
          averageEngagement: 25,
          churnRate: 35,
          topFeatures: ['basic-lead-processing'],
          painPoints: ['low-utilization', 'value-realization']
        }
      }
    ];
    
    for (const segment of segments) {
      this.customerSegments.set(segment.segmentId, segment);
    }
  }
  
  /**
   * Initialize default features for adoption tracking
   */
  private initializeDefaultFeatures(): void {
    const features: FeatureAdoption[] = [
      {
        featureId: 'basic-lead-processing',
        featureName: 'Basic Lead Processing',
        category: 'core',
        adoptionRate: 95,
        usageFrequency: 50,
        customerSegments: {
          starter: 98,
          professional: 95,
          enterprise: 90
        },
        impact: 'high',
        trend: 'stable'
      },
      {
        featureId: 'advanced-automation',
        featureName: 'Advanced Marketing Automation',
        category: 'automation',
        adoptionRate: 45,
        usageFrequency: 12,
        customerSegments: {
          starter: 20,
          professional: 60,
          enterprise: 75
        },
        impact: 'high',
        trend: 'growing'
      },
      {
        featureId: 'ai-scoring',
        featureName: 'AI Lead Scoring',
        category: 'ai',
        adoptionRate: 35,
        usageFrequency: 8,
        customerSegments: {
          starter: 15,
          professional: 45,
          enterprise: 65
        },
        impact: 'high',
        trend: 'growing'
      },
      {
        featureId: 'api-integration',
        featureName: 'API Integration',
        category: 'integration',
        adoptionRate: 25,
        usageFrequency: 5,
        customerSegments: {
          starter: 5,
          professional: 30,
          enterprise: 55
        },
        impact: 'medium',
        trend: 'stable'
      }
    ];
    
    for (const feature of features) {
      this.featureAdoptions.set(feature.featureId, feature);
    }
  }
}