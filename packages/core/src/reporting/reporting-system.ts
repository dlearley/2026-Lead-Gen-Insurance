import { PerformanceAnalyzer } from '../performance/performance-analyzer';
import { AutoScalingManager } from '../scaling/auto-scaling-manager';
import { CostOptimizationManager } from '../cost/cost-optimization-manager';
import { OperationalExcellenceManager } from '../operations/operational-excellence-manager';
import { CustomerSuccessManager } from '../customer-success/customer-success-manager';
import { Tracer } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface ExecutiveReport {
  generatedAt: Date;
  period: string;
  summary: {
    systemHealth: {
      uptime: number;
      performance: string;
      incidents: number;
      sloCompliance: number;
    };
    business: {
      totalCustomers: number;
      newCustomers: number;
      churnRate: number;
      monthlyRecurringRevenue: number;
      customerGrowth: number;
    };
    operations: {
      totalIncidents: number;
      averageMTTR: number;
      criticalIncidents: number;
      incidentTrends: 'improving' | 'stable' | 'worsening';
    };
    costs: {
      totalMonthlyCost: number;
      costTrend: 'increasing' | 'decreasing' | 'stable';
      costOptimizationSavings: number;
      observabilityRatio: number;
    };
  };
  keyMetrics: {
    metric: string;
    value: number;
    target: number;
    status: 'on-track' | 'at-risk' | 'off-track';
    trend: 'up' | 'down' | 'stable';
  }[];
  alerts: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionRequired: boolean;
  }[];
  recommendations: string[];
}

export interface EngineeringReport {
  generatedAt: Date;
  period: string;
  systemHealth: {
    serviceStatus: Array<{
      service: string;
      status: 'healthy' | 'degraded' | 'down';
      uptime: number;
      responseTime: number;
      errorRate: number;
    }>;
    performance: {
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      throughput: number;
      errorRate: number;
    };
    infrastructure: {
      cpuUtilization: number;
      memoryUtilization: number;
      storageUtilization: number;
      networkUtilization: number;
    };
  };
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    duration: number;
    impact: string;
  }>;
  deployments: Array<{
    service: string;
    version: string;
    status: 'success' | 'failure' | 'rollback';
    timestamp: Date;
    rollbackTime?: number;
  }>;
  technicalDebt: Array<{
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedEffort: string;
  }>;
  performanceOptimizations: Array<{
    area: string;
    improvement: string;
    impact: string;
    status: 'planned' | 'in-progress' | 'completed';
  }>;
}

export interface CustomerSuccessReport {
  generatedAt: Date;
  period: string;
  customerOverview: {
    totalCustomers: number;
    newCustomers: number;
    churnedCustomers: number;
    netGrowth: number;
    averageCustomerValue: number;
  };
  customerHealth: {
    healthy: number;
    atRisk: number;
    churnRisk: number;
    healthScore: number;
  };
  featureAdoption: Array<{
    feature: string;
    adoptionRate: number;
    usage: number;
    trend: 'growing' | 'stable' | 'declining';
    priority: 'low' | 'medium' | 'high';
  }>;
  engagement: {
    averageEngagementScore: number;
    activeCustomers: number;
    highlyEngagedCustomers: number;
    engagementTrend: 'improving' | 'stable' | 'declining';
  };
  support: {
    tickets: number;
    averageResolutionTime: number;
    satisfactionScore: number;
    topIssues: string[];
  };
  successActions: {
    completed: number;
    pending: number;
    overdue: number;
    effectiveness: number;
  };
  recommendations: string[];
}

export interface FinancialReport {
  generatedAt: Date;
  period: string;
  costSummary: {
    totalCost: number;
    previousPeriodCost: number;
    costChange: number;
    costChangePercent: number;
    budgetUtilization: number;
    budgetVariance: number;
  };
  costBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    budget: number;
    variance: number;
  }[];
  serviceCosts: {
    service: string;
    cost: number;
    percentage: number;
    trend: string;
    efficiency: 'efficient' | 'moderate' | 'inefficient';
  }[];
  optimization: {
    totalSavings: number;
    projectedSavings: number;
    opportunities: Array<{
      area: string;
      savings: number;
      effort: 'low' | 'medium' | 'high';
      timeline: string;
    }>;
  };
  forecasts: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    confidence: number;
  };
}

// Comprehensive reporting system
export class ReportingSystem {
  private tracer: Tracer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private autoScalingManager: AutoScalingManager;
  private costOptimizationManager: CostOptimizationManager;
  private operationalExcellenceManager: OperationalExcellenceManager;
  private customerSuccessManager: CustomerSuccessManager;
  
  constructor(
    performanceAnalyzer: PerformanceAnalyzer,
    autoScalingManager: AutoScalingManager,
    costOptimizationManager: CostOptimizationManager,
    operationalExcellenceManager: OperationalExcellenceManager,
    customerSuccessManager: CustomerSuccessManager
  ) {
    this.tracer = getTracer('ReportingSystem');
    this.performanceAnalyzer = performanceAnalyzer;
    this.autoScalingManager = autoScalingManager;
    this.costOptimizationManager = costOptimizationManager;
    this.operationalExcellenceManager = operationalExcellenceManager;
    this.customerSuccessManager = customerSuccessManager;
  }
  
  /**
   * Generate executive report
   */
  async generateExecutiveReport(period: string = '30d'): Promise<ExecutiveReport> {
    const span = this.tracer.startSpan('generateExecutiveReport');
    
    try {
      // Gather data from all managers
      const [operationalReport, costReport, customerReport, performanceReport] = await Promise.all([
        this.operationalExcellenceManager.generateOperationalReport(period),
        this.costOptimizationManager.generateCostReport(period),
        this.customerSuccessManager.generateCustomerSuccessReport(period),
        this.performanceAnalyzer.generatePerformanceReport()
      ]);
      
      const summary = {
        systemHealth: {
          uptime: this.calculateSystemUptime(operationalReport.slos),
          performance: this.assessSystemPerformance(operationalReport.slos),
          incidents: operationalReport.summary.totalIncidents,
          sloCompliance: operationalReport.summary.sloCompliance
        },
        business: {
          totalCustomers: customerReport.summary.totalCustomers,
          newCustomers: Math.floor(customerReport.summary.totalCustomers * 0.15), // Mock data
          churnRate: this.calculateChurnRate(customerReport.summary),
          monthlyRecurringRevenue: this.calculateMRR(customerReport.summary),
          customerGrowth: customerReport.summary.customerGrowth
        },
        operations: {
          totalIncidents: operationalReport.summary.totalIncidents,
          averageMTTR: operationalReport.summary.averageMTTR,
          criticalIncidents: operationalReport.summary.criticalIncidents,
          incidentTrends: this.analyzeIncidentTrends(operationalReport.incidents)
        },
        costs: {
          totalMonthlyCost: costReport.summary.totalCost,
          costTrend: this.analyzeCostTrend(costReport.summary),
          costOptimizationSavings: 2500, // Mock optimization savings
          observabilityRatio: this.calculateObservabilityRatio(costReport.summary)
        }
      };
      
      const keyMetrics = this.generateKeyMetrics(operationalReport, customerReport, costReport);
      const alerts = this.generateExecutiveAlerts(summary, keyMetrics);
      const recommendations = this.generateExecutiveRecommendations(summary, keyMetrics);
      
      const report: ExecutiveReport = {
        generatedAt: new Date(),
        period,
        summary,
        keyMetrics,
        alerts,
        recommendations
      };
      
      logger.info('Executive report generated', {
        period,
        totalCustomers: summary.business.totalCustomers,
        totalIncidents: summary.operations.totalIncidents,
        totalCost: summary.costs.totalMonthlyCost,
        service: 'reporting-system'
      });
      
      return report;
      
    } catch (error) {
      logger.error('Failed to generate executive report', {
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'reporting-system'
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Generate engineering report
   */
  async generateEngineeringReport(period: string = '30d'): Promise<EngineeringReport> {
    const span = this.tracer.startSpan('generateEngineeringReport');
    
    try {
      const [operationalReport, performanceReport] = await Promise.all([
        this.operationalExcellenceManager.generateOperationalReport(period),
        this.performanceAnalyzer.generatePerformanceReport()
      ]);
      
      const serviceStatus = this.generateServiceStatus(operationalReport.slos);
      const infrastructure = await this.gatherInfrastructureMetrics();
      
      const report: EngineeringReport = {
        generatedAt: new Date(),
        period,
        systemHealth: {
          serviceStatus,
          performance: this.aggregatePerformanceMetrics(performanceReport),
          infrastructure
        },
        incidents: operationalReport.incidents.map(incident => ({
          id: incident.id,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          duration: incident.endTime ? 
            (incident.endTime.getTime() - incident.startTime.getTime()) / (1000 * 60) : 0,
          impact: incident.impact
        })),
        deployments: this.generateDeploymentHistory(), // Mock data
        technicalDebt: this.identifyTechnicalDebt(),
        performanceOptimizations: this.generatePerformanceOptimizations(performanceReport)
      };
      
      logger.info('Engineering report generated', {
        period,
        services: serviceStatus.length,
        incidents: report.incidents.length,
        service: 'reporting-system'
      });
      
      return report;
      
    } catch (error) {
      logger.error('Failed to generate engineering report', {
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'reporting-system'
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Generate customer success report
   */
  async generateCustomerSuccessReport(period: string = '30d'): Promise<CustomerSuccessReport> {
    const span = this.tracer.startSpan('generateCustomerSuccessReport');
    
    try {
      const report = await this.customerSuccessManager.generateCustomerSuccessReport(period);
      const optimizationInsights = await this.customerSuccessManager.identifyOptimizationOpportunities();
      
      const enrichedReport: CustomerSuccessReport = {
        generatedAt: new Date(),
        period,
        customerOverview: {
          totalCustomers: report.summary.totalCustomers,
          newCustomers: Math.floor(report.summary.totalCustomers * 0.12), // Mock new customers
          churnedCustomers: Math.floor(report.summary.totalCustomers * 0.03), // Mock churn
          netGrowth: report.summary.customerGrowth,
          averageCustomerValue: 250 // Mock ARPU
        },
        customerHealth: {
          healthy: report.summary.healthyCustomers,
          atRisk: report.summary.atRiskCustomers,
          churnRisk: report.summary.churnRiskCustomers,
          healthScore: this.calculateOverallHealthScore(report.summary)
        },
        featureAdoption: report.topFeatures.map(feature => ({
          feature: feature.featureName,
          adoptionRate: feature.adoptionRate,
          usage: feature.usageFrequency,
          trend: feature.trend,
          priority: feature.impact === 'high' ? 'high' : feature.impact === 'medium' ? 'medium' : 'low'
        })),
        engagement: {
          averageEngagementScore: report.summary.averageEngagementScore,
          activeCustomers: Math.floor(report.summary.totalCustomers * 0.8), // Mock active customers
          highlyEngagedCustomers: Math.floor(report.summary.totalCustomers * 0.3), // Mock highly engaged
          engagementTrend: this.analyzeEngagementTrend(report.summary.averageEngagementScore)
        },
        support: {
          tickets: 45, // Mock ticket count
          averageResolutionTime: 4.2, // Mock resolution time in hours
          satisfactionScore: 4.3, // Mock NPS/CSAT
          topIssues: this.identifyTopIssues(report.atRiskCustomers)
        },
        successActions: {
          completed: report.successActions.filter(a => a.status === 'completed').length,
          pending: report.successActions.filter(a => a.status === 'pending').length,
          overdue: this.calculateOverdueActions(report.successActions),
          effectiveness: 85 // Mock effectiveness percentage
        },
        recommendations: this.generateCustomerSuccessRecommendations(optimizationInsights, report)
      };
      
      logger.info('Customer success report generated', {
        period,
        totalCustomers: enrichedReport.customerOverview.totalCustomers,
        healthyCustomers: enrichedReport.customerHealth.healthy,
        averageEngagement: enrichedReport.engagement.averageEngagementScore,
        service: 'reporting-system'
      });
      
      return enrichedReport;
      
    } catch (error) {
      logger.error('Failed to generate customer success report', {
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'reporting-system'
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Generate financial report
   */
  async generateFinancialReport(period: string = '30d'): Promise<FinancialReport> {
    const span = this.tracer.startSpan('generateFinancialReport');
    
    try {
      const costReport = await this.costOptimizationManager.generateCostReport(period);
      const optimizationOpportunities = await this.costOptimizationManager.getOptimizationRecommendations();
      
      const totalCost = costReport.summary.totalCost;
      const previousPeriodCost = totalCost * 0.9; // Mock previous period
      const costChange = totalCost - previousPeriodCost;
      const costChangePercent = (costChange / previousPeriodCost) * 100;
      
      const report: FinancialReport = {
        generatedAt: new Date(),
        period,
        costSummary: {
          totalCost,
          previousPeriodCost,
          costChange,
          costChangePercent,
          budgetUtilization: 78, // Mock budget utilization
          budgetVariance: -500 // Mock budget variance
        },
        costBreakdown: costReport.summary.costByCategory.map(category => ({
          category: category.category,
          amount: category.totalCost,
          percentage: category.percentage,
          trend: category.trend,
          budget: category.totalCost * 1.2, // Mock budget
          variance: category.totalCost - (category.totalCost * 1.2) // Mock variance
        })),
        serviceCosts: this.generateServiceCosts(costReport.summary.topCostDrivers),
        optimization: {
          totalSavings: optimizationOpportunities.reduce((sum, opt) => sum + opt.potentialSavings, 0) * 0.3, // Realized savings
          projectedSavings: optimizationOpportunities.reduce((sum, opt) => sum + opt.potentialSavings, 0),
          opportunities: optimizationOpportunities.map(opt => ({
            area: opt.category,
            savings: opt.potentialSavings,
            effort: opt.effort,
            timeline: this.calculateImplementationTimeline(opt.effort)
          }))
        },
        forecasts: {
          nextMonth: totalCost * 1.05, // Mock forecast
          nextQuarter: totalCost * 3.2,
          nextYear: totalCost * 12.5,
          confidence: 0.85
        }
      };
      
      logger.info('Financial report generated', {
        period,
        totalCost: report.costSummary.totalCost,
        costChange: report.costSummary.costChangePercent,
        projectedSavings: report.optimization.projectedSavings,
        service: 'reporting-system'
      });
      
      return report;
      
    } catch (error) {
      logger.error('Failed to generate financial report', {
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'reporting-system'
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Schedule automatic report generation
   */
  async scheduleReports(): Promise<void> {
    // Weekly reports (every Monday at 9 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 9) {
        await this.generateAndDistributeReports('weekly');
      }
    }, 60 * 60 * 1000); // Check every hour
    
    // Monthly reports (1st of month at 9 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 9) {
        await this.generateAndDistributeReports('monthly');
      }
    }, 60 * 60 * 1000); // Check every hour
    
    // Quarterly reports (1st of quarter at 9 AM)
    setInterval(async () => {
      const now = new Date();
      if ([1, 4, 7, 10].includes(now.getMonth() + 1) && now.getDate() === 1 && now.getHours() === 9) {
        await this.generateAndDistributeReports('quarterly');
      }
    }, 60 * 60 * 1000); // Check every hour
  }
  
  /**
   * Generate and distribute reports
   */
  private async generateAndDistributeReports(type: 'weekly' | 'monthly' | 'quarterly'): Promise<void> {
    const period = type === 'weekly' ? '7d' : type === 'monthly' ? '30d' : '90d';
    
    try {
      const [executive, engineering, customerSuccess, financial] = await Promise.all([
        this.generateExecutiveReport(period),
        this.generateEngineeringReport(period),
        this.generateCustomerSuccessReport(period),
        this.generateFinancialReport(period)
      ]);
      
      // In a real implementation, distribute via email, Slack, etc.
      logger.info(`${type} reports generated and distributed`, {
        period,
        timestamp: new Date(),
        service: 'reporting-system'
      });
      
    } catch (error) {
      logger.error(`Failed to generate ${type} reports`, {
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'reporting-system'
      });
    }
  }
  
  // Helper methods for report generation
  
  private calculateSystemUptime(slos: any[]): number {
    const availabilitySLOs = slos.filter(slo => slo.measurement === 'availability');
    if (availabilitySLOs.length === 0) return 99.9;
    
    const totalUptime = availabilitySLOs.reduce((sum, slo) => sum + slo.currentValue, 0);
    return totalUptime / availabilitySLOs.length;
  }
  
  private assessSystemPerformance(slos: any[]): string {
    const latencySLOs = slos.filter(slo => slo.measurement === 'latency');
    const errorRateSLOs = slos.filter(slo => slo.measurement === 'error_rate');
    
    const allSLOs = [...latencySLOs, ...errorRateSLOs];
    const healthySLOs = allSLOs.filter(slo => slo.status === 'healthy');
    
    const healthyPercentage = (healthySLOs.length / allSLOs.length) * 100;
    
    if (healthyPercentage >= 90) return 'Excellent';
    if (healthyPercentage >= 80) return 'Good';
    if (healthyPercentage >= 70) return 'Fair';
    return 'Poor';
  }
  
  private calculateChurnRate(summary: any): number {
    // Simplified churn rate calculation
    return Math.max(0, (summary.churnRiskCustomers / summary.totalCustomers) * 100);
  }
  
  private calculateMRR(summary: any): number {
    // Simplified MRR calculation
    return summary.totalCustomers * 250; // $250 average customer value
  }
  
  private analyzeIncidentTrends(incidents: any[]): 'improving' | 'stable' | 'worsening' {
    if (incidents.length < 2) return 'stable';
    
    const recent = incidents.slice(-7); // Last 7 incidents
    const earlier = incidents.slice(-14, -7); // Previous 7 incidents
    
    const recentAvg = recent.length;
    const earlierAvg = earlier.length;
    
    if (recentAvg < earlierAvg * 0.8) return 'improving';
    if (recentAvg > earlierAvg * 1.2) return 'worsening';
    return 'stable';
  }
  
  private analyzeCostTrend(summary: any): 'increasing' | 'decreasing' | 'stable' {
    // Simplified cost trend analysis
    return 'stable';
  }
  
  private calculateObservabilityRatio(summary: any): number {
    const observabilityCost = summary.costByCategory
      .find((cat: any) => cat.category === 'observability')?.totalCost || 0;
    const totalCost = summary.totalCost;
    
    return totalCost > 0 ? (observabilityCost / totalCost) * 100 : 0;
  }
  
  private generateKeyMetrics(operational: any, customer: any, cost: any): any[] {
    return [
      {
        metric: 'System Uptime',
        value: 99.95,
        target: 99.9,
        status: 'on-track' as const,
        trend: 'stable' as const
      },
      {
        metric: 'Customer Health Score',
        value: customer.summary.averageEngagementScore,
        target: 70,
        status: customer.summary.averageEngagementScore >= 70 ? 'on-track' as const : 'at-risk' as const,
        trend: 'up' as const
      },
      {
        metric: 'Monthly Recurring Revenue',
        value: customer.summary.totalCustomers * 250,
        target: 50000,
        status: 'on-track' as const,
        trend: 'up' as const
      },
      {
        metric: 'Infrastructure Cost',
        value: cost.summary.totalCost,
        target: 5000,
        status: cost.summary.totalCost <= 5000 ? 'on-track' as const : 'at-risk' as const,
        trend: 'stable' as const
      }
    ];
  }
  
  private generateExecutiveAlerts(summary: any, metrics: any[]): any[] {
    const alerts = [];
    
    if (summary.systemHealth.incidents > 5) {
      alerts.push({
        severity: 'high' as const,
        title: 'High Incident Count',
        description: `Received ${summary.systemHealth.incidents} incidents in the last 30 days`,
        actionRequired: true
      });
    }
    
    if (summary.operations.criticalIncidents > 0) {
      alerts.push({
        severity: 'critical' as const,
        title: 'Critical Incidents',
        description: `${summary.operations.criticalIncidents} critical incidents occurred`,
        actionRequired: true
      });
    }
    
    return alerts;
  }
  
  private generateExecutiveRecommendations(summary: any, metrics: any[]): string[] {
    const recommendations = [];
    
    if (summary.business.churnRate > 5) {
      recommendations.push('Implement customer retention program to reduce churn');
    }
    
    if (summary.costs.totalMonthlyCost > 5000) {
      recommendations.push('Review infrastructure costs and implement optimization strategies');
    }
    
    if (summary.systemHealth.incidents > 3) {
      recommendations.push('Conduct incident root cause analysis and implement preventive measures');
    }
    
    return recommendations;
  }
  
  // Additional helper methods would continue here...
  private generateServiceStatus(slos: any[]): any[] {
    return slos.map(slo => ({
      service: slo.service,
      status: slo.status === 'healthy' ? 'healthy' : slo.status === 'warning' ? 'degraded' : 'down',
      uptime: slo.measurement === 'availability' ? slo.currentValue : 99.9,
      responseTime: slo.measurement === 'latency' ? slo.currentValue : 200,
      errorRate: slo.measurement === 'error_rate' ? slo.currentValue : 0.1
    }));
  }
  
  private async gatherInfrastructureMetrics(): Promise<any> {
    return {
      cpuUtilization: 65,
      memoryUtilization: 70,
      storageUtilization: 45,
      networkUtilization: 30
    };
  }
  
  private aggregatePerformanceMetrics(performance: any): any {
    return {
      averageResponseTime: performance.summary.averageResponseTime,
      p95ResponseTime: 450,
      p99ResponseTime: 520,
      throughput: 1000,
      errorRate: performance.summary.totalErrorRate * 100
    };
  }
  
  private generateDeploymentHistory(): any[] {
    return [
      {
        service: 'api-service',
        version: '1.2.3',
        status: 'success',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];
  }
  
  private identifyTechnicalDebt(): any[] {
    return [
      {
        category: 'Database',
        description: 'Missing indexes on frequently queried tables',
        priority: 'high' as const,
        estimatedEffort: '2 weeks'
      }
    ];
  }
  
  private generatePerformanceOptimizations(performance: any): any[] {
    return performance.endpoints.map((endpoint: any) => ({
      area: endpoint.endpoint,
      improvement: `Optimize ${endpoint.endpoint} endpoint`,
      impact: 'Reduce response time by 20%',
      status: endpoint.issues.length > 0 ? 'planned' as const : 'completed' as const
    }));
  }
  
  private calculateOverallHealthScore(summary: any): number {
    const healthScore = (summary.healthyCustomers / summary.totalCustomers) * 100;
    return Math.round(healthScore);
  }
  
  private analyzeEngagementTrend(score: number): 'improving' | 'stable' | 'declining' {
    if (score >= 70) return 'improving';
    if (score >= 50) return 'stable';
    return 'declining';
  }
  
  private identifyTopIssues(atRiskCustomers: any[]): string[] {
    const issues = new Map<string, number>();
    
    for (const customer of atRiskCustomers) {
      if (customer.featureAdoption) {
        for (const [feature, adoption] of customer.featureAdoption.entries()) {
          if (adoption < 30) {
            issues.set(feature, (issues.get(feature) || 0) + 1);
          }
        }
      }
    }
    
    return Array.from(issues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);
  }
  
  private calculateOverdueActions(actions: any[]): number {
    const now = new Date();
    return actions.filter(action => 
      action.status === 'pending' && action.dueDate < now
    ).length;
  }
  
  private generateCustomerSuccessRecommendations(insights: any[], report: any): string[] {
    const recommendations = [];
    
    if (report.summary.atRiskCustomers > report.summary.totalCustomers * 0.2) {
      recommendations.push('Increase customer success team capacity to handle at-risk accounts');
    }
    
    if (report.summary.averageEngagementScore < 60) {
      recommendations.push('Launch engagement campaign to improve customer activity');
    }
    
    return recommendations;
  }
  
  private generateServiceCosts(topDrivers: any[]): any[] {
    return topDrivers.slice(0, 5).map(driver => ({
      service: driver.service,
      cost: driver.cost,
      percentage: (driver.cost / topDrivers.reduce((sum, d) => sum + d.cost, 0)) * 100,
      trend: 'stable',
      efficiency: driver.cost > 1000 ? 'moderate' : 'efficient'
    }));
  }
  
  private calculateImplementationTimeline(effort: string): string {
    switch (effort) {
      case 'low': return '1-2 weeks';
      case 'medium': return '1-2 months';
      case 'high': return '3-6 months';
      default: return 'Unknown';
    }
  }
}