import { routingRepository } from '../repositories/routing.repository';
import { PrismaClient } from '@prisma/client';
import { metrics } from '@opentelemetry/api';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
  conversionRate: number;
  avgLeadValue: number;
  avgProcessingTime: number;
  slaComplianceRate: number;
  totalLeadsAssigned: number;
  totalLeadsConverted: number;
  revenueGenerated: number;
  customerSatisfaction: number;
  responseTimeAvg: number;
}

export interface PerformanceAnalysis {
  brokerId: string;
  currentMetrics: PerformanceMetrics;
  trends: {
    conversionTrend: 'improving' | 'declining' | 'stable';
    performanceScore: number;
    rank: number;
    peerComparison: Record<string, number>;
  };
  recommendations: string[];
}

export class BrokerPerformanceAnalyzer {
  private readonly CONVERSION_WEIGHT = 0.4;
  private readonly SPEED_WEIGHT = 0.3;
  private readonly SLA_WEIGHT = 0.2;
  private readonly VALUE_WEIGHT = 0.1;

  /**
   * Analyze broker performance based on historical data
   */
  async analyzeBrokerPerformance(brokerId: string): Promise<PerformanceAnalysis> {
    const currentMetrics = await this.calculateCurrentMetrics(brokerId);
    const trends = await this.analyzePerformanceTrends(brokerId, currentMetrics);
    const recommendations = this.generateRecommendations(currentMetrics, trends);

    return {
      brokerId,
      currentMetrics,
      trends,
      recommendations,
    };
  }

  /**
   * Calculate current performance metrics for a broker
   */
  private async calculateCurrentMetrics(brokerId: string): Promise<PerformanceMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get assignments and their outcomes
    const assignments = await prisma.leadAssignment.findMany({
      where: {
        agentId: brokerId,
        assignedAt: { gte: thirtyDaysAgo },
      },
      include: {
        lead: {
          select: {
            status: true,
            metadata: true,
          },
        },
      },
    });

    const totalAssigned = assignments.length;
    const converted = assignments.filter(a => a.lead.status === 'CONVERTED').length;
    
    // Calculate conversion rate
    const conversionRate = totalAssigned > 0 ? (converted / totalAssigned) * 100 : 0;

    // Calculate average lead value from converted leads
    const convertedLeads = assignments.filter(a => a.conversionValue);
    const avgLeadValue = convertedLeads.length > 0 
      ? convertedLeads.reduce((sum, a) => sum + (a.conversionValue || 0), 0) / convertedLeads.length
      : 0;

    // Calculate processing time (time from assignment to conversion or rejection)
    const completedAssignments = assignments.filter(a => a.convertedAt || a.rejectedAt);
    const avgProcessingTime = completedAssignments.length > 0
      ? completedAssignments.reduce((sum, a) => {
          const completionTime = a.convertedAt || a.rejectedAt;
          const assignedTime = a.assignedAt;
          const processingTime = completionTime ? (completionTime.getTime() - assignedTime.getTime()) / (1000 * 60) : 0;
          return sum + processingTime;
        }, 0) / completedAssignments.length
      : 0;

    // Calculate SLA compliance (assume SLA is 4 hours = 240 minutes)
    const slaThreshold = 240; // minutes
    const slaCompliant = completedAssignments.filter(a => {
      const completionTime = a.convertedAt || a.rejectedAt;
      if (!completionTime) return false;
      const processingTime = (completionTime.getTime() - a.assignedAt.getTime()) / (1000 * 60);
      return processingTime <= slaThreshold;
    }).length;
    const slaComplianceRate = completedAssignments.length > 0 
      ? (slaCompliant / completedAssignments.length) * 100 
      : 0;

    // Calculate total revenue generated
    const revenueGenerated = convertedLeads.reduce((sum, a) => sum + (a.conversionValue || 0), 0);

    // Calculate response time (time from assignment to first contact/accept)
    const responsiveAssignments = assignments.filter(a => a.acceptedAt);
    const responseTimeAvg = responsiveAssignments.length > 0
      ? responsiveAssignments.reduce((sum, a) => {
          const responseTime = (a.acceptedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60);
          return sum + responseTime;
        }, 0) / responsiveAssignments.length
      : 0;

    // Customer satisfaction (placeholder - would come from survey data)
    const customerSatisfaction = 85; // Default value

    return {
      conversionRate,
      avgLeadValue,
      avgProcessingTime,
      slaComplianceRate,
      totalLeadsAssigned: totalAssigned,
      totalLeadsConverted: converted,
      revenueGenerated,
      customerSatisfaction,
      responseTimeAvg,
    };
  }

  /**
   * Analyze performance trends over time
   */
  private async analyzePerformanceTrends(
    brokerId: string, 
    currentMetrics: PerformanceMetrics
  ) {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get historical data for comparison
    const historicalAssignments = await prisma.leadAssignment.findMany({
      where: {
        agentId: brokerId,
        assignedAt: { gte: sixtyDaysAgo },
      },
      include: {
        lead: {
          select: { status: true },
        },
      },
    });

    // Split into two periods for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAssignments = historicalAssignments.filter(a => a.assignedAt >= thirtyDaysAgo);
    const olderAssignments = historicalAssignments.filter(a => a.assignedAt < thirtyDaysAgo);

    // Calculate historical conversion rate
    const recentConverted = recentAssignments.filter(a => a.lead.status === 'CONVERTED').length;
    const olderConverted = olderAssignments.filter(a => a.lead.status === 'CONVERTED').length;
    
    const recentConversionRate = recentAssignments.length > 0 ? (recentConverted / recentAssignments.length) * 100 : 0;
    const olderConversionRate = olderAssignments.length > 0 ? (olderConverted / olderAssignments.length) * 100 : 0;

    // Determine trend
    let conversionTrend: 'improving' | 'declining' | 'stable';
    const conversionChange = recentConversionRate - olderConversionRate;
    
    if (conversionChange > 5) {
      conversionTrend = 'improving';
    } else if (conversionChange < -5) {
      conversionTrend = 'declining';
    } else {
      conversionTrend = 'stable';
    }

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(currentMetrics);

    // Get peer comparison
    const peerComparison = await this.getPeerComparison(brokerId, currentMetrics);

    // Get broker's rank
    const rank = await this.getBrokerRank(brokerId);

    return {
      conversionTrend,
      performanceScore,
      rank,
      peerComparison,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // Normalize metrics to 0-100 scale
    const normalizedConversionRate = Math.min(metrics.conversionRate, 100);
    const normalizedSpeedScore = Math.max(0, 100 - (metrics.avgProcessingTime / 10)); // Penalize slow processing
    const normalizedSlaCompliance = metrics.slaComplianceRate;
    const normalizedValueScore = Math.min(metrics.avgLeadValue / 100, 100); // Assuming $100 is baseline

    // Weighted average
    const score = 
      (normalizedConversionRate * this.CONVERSION_WEIGHT) +
      (normalizedSpeedScore * this.SPEED_WEIGHT) +
      (normalizedSlaCompliance * this.SLA_WEIGHT) +
      (normalizedValueScore * this.VALUE_WEIGHT);

    return Math.round(score);
  }

  /**
   * Compare broker performance with peers
   */
  private async getPeerComparison(brokerId: string, currentMetrics: PerformanceMetrics) {
    const allMetrics = await routingRepository.getAllBrokerPerformanceMetrics();
    
    const peerComparison = {
      conversionRate: 0,
      processingTime: 0,
      slaCompliance: 0,
      revenue: 0,
    };

    const broker = allMetrics.find(b => b.brokerId === brokerId);
    if (!broker || allMetrics.length === 1) {
      return peerComparison;
    }

    const avgConversionRate = allMetrics.reduce((sum, b) => sum + b.conversionRate, 0) / allMetrics.length;
    const avgProcessingTime = allMetrics.reduce((sum, b) => sum + b.avgProcessingTime, 0) / allMetrics.length;
    const avgSlaCompliance = allMetrics.reduce((sum, b) => sum + b.slaComplianceRate, 0) / allMetrics.length;
    const avgRevenue = allMetrics.reduce((sum, b) => sum + b.revenueGenerated, 0) / allMetrics.length;

    peerComparison.conversionRate = ((broker.conversionRate - avgConversionRate) / avgConversionRate) * 100;
    peerComparison.processingTime = ((avgProcessingTime - broker.avgProcessingTime) / avgProcessingTime) * 100; // Inverted
    peerComparison.slaCompliance = ((broker.slaComplianceRate - avgSlaCompliance) / avgSlaCompliance) * 100;
    peerComparison.revenue = ((broker.revenueGenerated - avgRevenue) / avgRevenue) * 100;

    return peerComparison;
  }

  /**
   * Get broker's rank among all brokers
   */
  private async getBrokerRank(brokerId: string): Promise<number> {
    const allMetrics = await routingRepository.getAllBrokerPerformanceMetrics();
    
    const broker = allMetrics.find(b => b.brokerId === brokerId);
    if (!broker) return allMetrics.length + 1;

    // Rank by conversion rate primarily, then by revenue
    const betterBrokers = allMetrics.filter(b => 
      b.conversionRate > broker.conversionRate || 
      (b.conversionRate === broker.conversionRate && b.revenueGenerated > broker.revenueGenerated)
    );

    return betterBrokers.length + 1;
  }

  /**
   * Generate performance improvement recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics, 
    trends: any
  ): string[] {
    const recommendations: string[] = [];

    // Conversion rate recommendations
    if (metrics.conversionRate < 20) {
      recommendations.push('Focus on improving lead qualification to increase conversion rates');
    }
    if (metrics.conversionRate < trends.peerComparison.conversionRate) {
      recommendations.push('Study top-performing brokers to identify best practices');
    }

    // Processing time recommendations
    if (metrics.avgProcessingTime > 480) { // 8 hours
      recommendations.push('Implement faster response protocols to reduce processing time');
    }
    if (metrics.responseTimeAvg > 120) { // 2 hours
      recommendations.push('Improve initial response time to leads');
    }

    // SLA compliance recommendations
    if (metrics.slaComplianceRate < 80) {
      recommendations.push('Implement SLA tracking and alerts to improve compliance');
    }

    // Revenue recommendations
    if (metrics.avgLeadValue < trends.peerComparison.revenue) {
      recommendations.push('Focus on higher-value insurance products to increase average lead value');
    }

    // Trend-based recommendations
    if (trends.conversionTrend === 'declining') {
      recommendations.push('Performance is declining - consider additional training or support');
    }
    if (trends.performanceScore < 50) {
      recommendations.push('Overall performance is below average - review workflow and processes');
    }

    return recommendations;
  }

  /**
   * Update broker performance metrics in database
   */
  async updateBrokerPerformanceMetrics(brokerId: string): Promise<void> {
    const analysis = await this.analyzeBrokerPerformance(brokerId);
    
    await routingRepository.updateBrokerPerformanceMetrics(brokerId, {
      conversionRate: analysis.currentMetrics.conversionRate,
      avgLeadValue: analysis.currentMetrics.avgLeadValue,
      avgProcessingTime: Math.round(analysis.currentMetrics.avgProcessingTime),
      slaComplianceRate: analysis.currentMetrics.slaComplianceRate,
      totalLeadsAssigned: analysis.currentMetrics.totalLeadsAssigned,
      totalLeadsConverted: analysis.currentMetrics.totalLeadsConverted,
      revenueGenerated: analysis.currentMetrics.revenueGenerated,
      customerSatisfaction: analysis.currentMetrics.customerSatisfaction,
      responseTimeAvg: Math.round(analysis.currentMetrics.responseTimeAvg),
      metrics: {
        trends: analysis.trends,
        recommendations: analysis.recommendations,
        lastAnalyzed: new Date().toISOString(),
      },
    });
  }

  /**
   * Generate performance leaderboard
   */
  async generatePerformanceLeaderboard(limit = 20): Promise<Array<{
    brokerId: string;
    rank: number;
    performanceScore: number;
    conversionRate: number;
    revenueGenerated: number;
    recommendations: string[];
  }>> {
    const leaderboard = await routingRepository.getBrokerPerformanceLeaderboard(limit);
    
    return leaderboard.map((broker, index) => ({
      brokerId: broker.brokerId,
      rank: index + 1,
      performanceScore: this.calculatePerformanceScore({
        conversionRate: broker.conversionRate,
        avgLeadValue: broker.avgLeadValue,
        avgProcessingTime: broker.avgProcessingTime,
        slaComplianceRate: broker.slaComplianceRate,
        totalLeadsAssigned: broker.totalLeadsAssigned,
        totalLeadsConverted: broker.totalLeadsConverted,
        revenueGenerated: broker.revenueGenerated,
        customerSatisfaction: broker.customerSatisfaction,
        responseTimeAvg: broker.responseTimeAvg,
      }),
      conversionRate: broker.conversionRate,
      revenueGenerated: broker.revenueGenerated,
      recommendations: [], // Would be populated by analyzing each broker
    }));
  }

  /**
   * Bulk update performance metrics for all brokers
   */
  async bulkUpdateAllBrokerMetrics(): Promise<void> {
    const brokers = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    console.log(`Updating performance metrics for ${brokers.length} brokers...`);
    
    const updatePromises = brokers.map(async (broker) => {
      try {
        await this.updateBrokerPerformanceMetrics(broker.id);
      } catch (error) {
        console.error(`Failed to update metrics for broker ${broker.id}:`, error);
      }
    });

    await Promise.all(updatePromises);
    console.log('Bulk performance metrics update completed');
  }
}

export const brokerPerformanceAnalyzer = new BrokerPerformanceAnalyzer();