/**
 * Capacity Planning Service
 * Analyzes system performance and forecasts capacity needs
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  CapacityForecast,
  CapacityProjection,
  CapacityRecommendation,
  CapacityPlanningDashboard,
  CapacityAlert,
  CapacityTrend,
  PerformanceBottleneck,
} from '@insurance-lead-gen/types';

export class CapacityPlanningService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async forecastCapacity(
    resourceType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database',
    months: number = 6
  ): Promise<CapacityForecast> {
    const historicalData = await this.getHistoricalData(resourceType);
    const currentMetrics = await this.getCurrentMetrics(resourceType);

    const projections = this.generateProjections(
      historicalData,
      currentMetrics,
      months
    );

    const recommendations = this.generateRecommendations(
      resourceType,
      currentMetrics,
      projections
    );

    return {
      resourceType,
      currentUsage: currentMetrics.usage,
      currentCapacity: currentMetrics.capacity,
      utilizationRate: currentMetrics.usage / currentMetrics.capacity,
      projections,
      recommendations,
    };
  }

  private async getHistoricalData(resourceType: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    switch (resourceType) {
      case 'database':
        return this.getDatabaseHistoricalData(thirtyDaysAgo);
      case 'storage':
        return this.getStorageHistoricalData(thirtyDaysAgo);
      default:
        return [];
    }
  }

  private async getDatabaseHistoricalData(since: Date): Promise<any[]> {
    try {
      const leads = await this.prisma.lead.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: true,
      });

      return leads.map((item) => ({
        date: item.createdAt,
        count: item._count,
      }));
    } catch (error) {
      logger.error('Failed to get database historical data', { error });
      return [];
    }
  }

  private async getStorageHistoricalData(since: Date): Promise<any[]> {
    return [];
  }

  private async getCurrentMetrics(
    resourceType: string
  ): Promise<{ usage: number; capacity: number }> {
    switch (resourceType) {
      case 'database':
        return this.getDatabaseMetrics();
      case 'storage':
        return this.getStorageMetrics();
      case 'cpu':
        return { usage: 0.45, capacity: 1.0 };
      case 'memory':
        return { usage: 2.5, capacity: 4.0 };
      case 'bandwidth':
        return { usage: 100, capacity: 1000 };
      default:
        return { usage: 0, capacity: 1 };
    }
  }

  private async getDatabaseMetrics(): Promise<{ usage: number; capacity: number }> {
    try {
      const [leadCount, agentCount, eventCount] = await Promise.all([
        this.prisma.lead.count(),
        this.prisma.agent.count(),
        this.prisma.event.count(),
      ]);

      const totalRecords = leadCount + agentCount + eventCount;
      const capacity = 10000000;

      return {
        usage: totalRecords,
        capacity,
      };
    } catch (error) {
      logger.error('Failed to get database metrics', { error });
      return { usage: 0, capacity: 1 };
    }
  }

  private async getStorageMetrics(): Promise<{ usage: number; capacity: number }> {
    return { usage: 0, capacity: 1 };
  }

  private generateProjections(
    historicalData: any[],
    currentMetrics: { usage: number; capacity: number },
    months: number
  ): CapacityProjection[] {
    const projections: CapacityProjection[] = [];

    const growthRate = this.calculateGrowthRate(historicalData);

    for (let i = 1; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      const predictedUsage = currentMetrics.usage * Math.pow(1 + growthRate, i);
      const predictedCapacity = currentMetrics.capacity;
      const utilizationRate = predictedUsage / predictedCapacity;

      const confidence = Math.max(0.5, 1 - (i * 0.1));

      projections.push({
        date,
        predictedUsage,
        predictedCapacity,
        utilizationRate,
        confidence,
      });
    }

    return projections;
  }

  private calculateGrowthRate(historicalData: any[]): number {
    if (historicalData.length < 2) {
      return 0.05;
    }

    const sortedData = historicalData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const first = sortedData[0].count || sortedData[0].usage || 0;
    const last = sortedData[sortedData.length - 1].count || sortedData[sortedData.length - 1].usage || 0;

    if (first === 0) return 0.05;

    const periods = sortedData.length;
    const growthRate = Math.pow(last / first, 1 / periods) - 1;

    return Math.max(0, Math.min(0.5, growthRate));
  }

  private generateRecommendations(
    resourceType: string,
    currentMetrics: { usage: number; capacity: number },
    projections: CapacityProjection[]
  ): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];
    const utilizationRate = currentMetrics.usage / currentMetrics.capacity;

    if (utilizationRate > 0.8) {
      recommendations.push({
        resourceType,
        action: 'scale-up',
        priority: 'immediate',
        description: `Current ${resourceType} utilization is at ${(utilizationRate * 100).toFixed(1)}%. Immediate scaling recommended.`,
        estimatedImpact: 'Prevent performance degradation and potential outages',
      });
    }

    const threeMonthProjection = projections[2];
    if (threeMonthProjection && threeMonthProjection.utilizationRate > 0.7) {
      recommendations.push({
        resourceType,
        action: 'scale-out',
        priority: 'short-term',
        description: `${resourceType} utilization projected to reach ${(threeMonthProjection.utilizationRate * 100).toFixed(1)}% in 3 months`,
        estimatedImpact: 'Maintain optimal performance as demand grows',
      });
    }

    if (resourceType === 'database' && utilizationRate > 0.6) {
      recommendations.push({
        resourceType,
        action: 'optimize',
        priority: 'medium-term',
        description: 'Implement data archival strategy for historical records',
        estimatedImpact: 'Reduce database size by 20-30% and improve query performance',
      });
    }

    if (utilizationRate < 0.3) {
      recommendations.push({
        resourceType,
        action: 'optimize',
        priority: 'long-term',
        description: `${resourceType} is under-utilized at ${(utilizationRate * 100).toFixed(1)}%`,
        estimatedCost: -500,
        estimatedImpact: 'Potential cost savings through right-sizing',
      });
    }

    return recommendations;
  }

  async getCapacityDashboard(): Promise<CapacityPlanningDashboard> {
    const resourceTypes: Array<'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database'> = [
      'cpu',
      'memory',
      'storage',
      'bandwidth',
      'database',
    ];

    const forecasts = await Promise.all(
      resourceTypes.map((type) => this.forecastCapacity(type, 6))
    );

    const alerts = this.generateAlerts(forecasts);
    const trends = await this.generateTrends();

    return {
      timestamp: new Date(),
      forecasts,
      alerts,
      trends,
    };
  }

  private generateAlerts(forecasts: CapacityForecast[]): CapacityAlert[] {
    const alerts: CapacityAlert[] = [];

    for (const forecast of forecasts) {
      if (forecast.utilizationRate > 0.9) {
        alerts.push({
          resourceType: forecast.resourceType,
          severity: 'critical',
          message: `${forecast.resourceType} utilization critical at ${(forecast.utilizationRate * 100).toFixed(1)}%`,
          threshold: 0.9,
          currentValue: forecast.utilizationRate,
          timestamp: new Date(),
        });
      } else if (forecast.utilizationRate > 0.75) {
        alerts.push({
          resourceType: forecast.resourceType,
          severity: 'warning',
          message: `${forecast.resourceType} utilization high at ${(forecast.utilizationRate * 100).toFixed(1)}%`,
          threshold: 0.75,
          currentValue: forecast.utilizationRate,
          timestamp: new Date(),
        });
      }

      const nearTermProjection = forecast.projections[0];
      if (nearTermProjection && nearTermProjection.utilizationRate > 0.85) {
        alerts.push({
          resourceType: forecast.resourceType,
          severity: 'warning',
          message: `${forecast.resourceType} projected to reach ${(nearTermProjection.utilizationRate * 100).toFixed(1)}% next month`,
          threshold: 0.85,
          currentValue: nearTermProjection.utilizationRate,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  private async generateTrends(): Promise<CapacityTrend[]> {
    const trends: CapacityTrend[] = [];

    const leadTrend = await this.getLeadTrend();
    trends.push(leadTrend);

    return trends;
  }

  private async getLeadTrend(): Promise<CapacityTrend> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const leads = await this.prisma.lead.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        _count: true,
      });

      const dataPoints = leads.map((item) => ({
        timestamp: item.createdAt,
        value: item._count,
      }));

      const values = dataPoints.map((dp) => dp.value);
      const avgGrowth =
        values.length > 1
          ? (values[values.length - 1] - values[0]) / values.length
          : 0;

      return {
        resourceType: 'leads',
        period: 'month',
        growth: avgGrowth,
        trend: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable',
        dataPoints,
      };
    } catch (error) {
      logger.error('Failed to get lead trend', { error });
      return {
        resourceType: 'leads',
        period: 'month',
        growth: 0,
        trend: 'stable',
        dataPoints: [],
      };
    }
  }

  async identifyBottlenecks(): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    const dbMetrics = await this.getDatabaseMetrics();
    const dbUtilization = dbMetrics.usage / dbMetrics.capacity;

    if (dbUtilization > 0.8) {
      bottlenecks.push({
        component: 'Database',
        type: 'database',
        severity: 'high',
        description: `Database at ${(dbUtilization * 100).toFixed(1)}% capacity`,
        impact: 'Query performance degradation and potential timeouts',
        recommendation:
          'Implement data archival, add read replicas, or upgrade database instance',
      });
    }

    const leadCount = await this.prisma.lead.count();
    if (leadCount > 100000) {
      bottlenecks.push({
        component: 'Lead Table',
        type: 'database',
        severity: 'medium',
        description: `Lead table has ${leadCount} records`,
        impact: 'Slower queries on lead listing and filtering',
        recommendation:
          'Add composite indexes on commonly filtered columns and implement pagination',
      });
    }

    return bottlenecks;
  }
}
