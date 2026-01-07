import { PrismaClient } from '@prisma/client';
import type {
  BrokerBenchmarkMetrics,
  BenchmarkComparison,
  PeerGroup,
  BenchmarkInsight,
  IndustryBenchmark,
  BrokerRanking,
  BenchmarkReport,
  PerformanceGoal,
  CreateGoalDto,
  UpdateGoalDto,
  BenchmarkPeriod,
  PerformanceCategory,
  BenchmarkTrend,
} from '@insurance/types';
import { logger } from '@insurance-lead-gen/core';

const prisma = new PrismaClient();

const INDUSTRY_BENCHMARKS: Record<string, { peer: number; industry: number }> = {
  conversionRate: { peer: 0.25, industry: 0.20 },
  responseTime: { peer: 45, industry: 60 },
  revenue: { peer: 450, industry: 380 },
  retention: { peer: 0.85, industry: 0.78 },
  customerSatisfaction: { peer: 4.3, industry: 4.0 },
};

/**
 * Broker Benchmark Service
 * Provides benchmarking capabilities to help brokers improve performance
 */
export class BrokerBenchmarkService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
    logger.info('Broker benchmark service initialized');
  }

  async generateBrokerBenchmark(
    brokerId: string,
    period: BenchmarkPeriod = 'month'
  ): Promise<BrokerBenchmarkMetrics> {
    try {
      const now = new Date();
      const startDate = this.getStartDateForPeriod(period, now);
      const endDate = now;

      const [
        conversionMetrics,
        responseTimeMetrics,
        revenueMetrics,
        retentionMetrics,
        satisfactionMetrics,
        peerStats,
      ] = await Promise.all([
        this.calculateConversionMetrics(brokerId, startDate, endDate),
        this.calculateResponseTimeMetrics(brokerId, startDate, endDate),
        this.calculateRevenueMetrics(brokerId, startDate, endDate),
        this.calculateRetentionMetrics(brokerId, startDate, endDate),
        this.calculateSatisfactionMetrics(brokerId, startDate, endDate),
        this.getPeerStats(brokerId, startDate, endDate),
      ]);

      const benchmarks: BrokerBenchmarkMetrics = {
        brokerId,
        period,
        generatedAt: new Date(),
        conversionRate: this.buildPercentileMetrics(
          conversionMetrics,
          peerStats.averageConversionRate,
          INDUSTRY_BENCHMARKS.conversionRate
        ),
        responseTime: this.buildPercentileMetrics(
          responseTimeMetrics,
          peerStats.averageResponseTime,
          INDUSTRY_BENCHMARKS.responseTime
        ),
        revenue: this.buildPercentileMetrics(
          revenueMetrics,
          peerStats.averageRevenue,
          INDUSTRY_BENCHMARKS.revenue
        ),
        retention: this.buildPercentileMetrics(
          retentionMetrics,
          peerStats.averageRetention,
          INDUSTRY_BENCHMARKS.retention
        ),
        customerSatisfaction: this.buildPercentileMetrics(
          satisfactionMetrics,
          peerStats.averageSatisfaction,
          INDUSTRY_BENCHMARKS.customerSatisfaction
        ),
      };

      return benchmarks;
    } catch (error) {
      logger.error('Failed to generate broker benchmark', { error, brokerId });
      throw error;
    }
  }

  private buildPercentileMetrics(
    brokerValue: number,
    peerAverage: number,
    benchmarks: { peer: number; industry: number }
  ): {
    value: number;
    peerPercentile: number;
    industryPercentile: number;
    trend: 'improving' | 'stable' | 'declining';
    peerAverage: number;
    industryAverage: number;
  } {
    const peerPercentile = this.calculatePercentile(brokerValue, peerAverage);
    const industryPercentile = this.calculatePercentile(brokerValue, benchmarks.industry);

    const trend = this.calculateTrend(brokerValue, benchmarks.peer);

    return {
      value: brokerValue,
      peerPercentile,
      industryPercentile,
      trend,
      peerAverage,
      industryAverage: benchmarks.industry,
    };
  }

  private calculatePercentile(brokerValue: number, average: number): number {
    if (average === 0) return 50;
    const ratio = brokerValue / average;
    if (ratio >= 1.5) return 95;
    if (ratio >= 1.25) return 80;
    if (ratio >= 1.1) return 65;
    if (ratio >= 0.9) return 50;
    if (ratio >= 0.75) return 35;
    if (ratio >= 0.5) return 20;
    return 10;
  }

  private calculateTrend(
    currentValue: number,
    benchmarkValue: number
  ): 'improving' | 'stable' | 'declining' {
    const ratio = currentValue / (benchmarkValue || 1);
    if (ratio > 1.1) return 'improving';
    if (ratio < 0.9) return 'declining';
    return 'stable';
  }

  private getStartDateForPeriod(period: BenchmarkPeriod, now: Date): Date {
    const startDate = new Date(now);
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    return startDate;
  }

  private async calculateConversionMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const assignments = await this.prisma.leadAssignment.findMany({
      where: {
        agentId: brokerId,
        assignedAt: { gte: startDate, lte: endDate },
      },
    });

    const converted = assignments.filter((a) => a.status === 'accepted').length;
    return assignments.length > 0 ? converted / assignments.length : 0;
  }

  private async calculateResponseTimeMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const assignments = await this.prisma.leadAssignment.findMany({
      where: {
        agentId: brokerId,
        assignedAt: { gte: startDate, lte: endDate },
        acceptedAt: { not: null },
      },
    });

    if (assignments.length === 0) return 0;

    const totalTime = assignments.reduce((sum, a) => {
      if (a.acceptedAt) {
        return sum + (a.acceptedAt.getTime() - a.assignedAt.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalTime / assignments.length / 60000);
  }

  private async calculateRevenueMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalRevenue: number; averagePerLead: number }> {
    const assignments = await this.prisma.leadAssignment.findMany({
      where: {
        agentId: brokerId,
        assignedAt: { gte: startDate, lte: endDate },
        status: 'accepted',
      },
    });

    const totalRevenue = assignments.length * 500;
    const averagePerLead = assignments.length > 0 ? 500 : 0;

    return { totalRevenue, averagePerLead };
  }

  private async calculateRetentionMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return 0.82;
  }

  private async calculateSatisfactionMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return 4.2;
  }

  private async getPeerStats(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    averageConversionRate: number;
    averageResponseTime: number;
    averageRevenue: number;
    averageRetention: number;
    averageSatisfaction: number;
  }> {
    return {
      averageConversionRate: 0.23,
      averageResponseTime: 50,
      averageRevenue: 420,
      averageRetention: 0.80,
      averageSatisfaction: 4.1,
    };
  }

  async getBenchmarkComparisons(
    brokerId: string,
    period: BenchmarkPeriod = 'month'
  ): Promise<BenchmarkComparison[]> {
    const benchmark = await this.generateBrokerBenchmark(brokerId, period);

    const categories: { key: keyof typeof benchmark; name: PerformanceCategory }[] = [
      { key: 'conversionRate', name: 'conversion' },
      { key: 'responseTime', name: 'response_time' },
      { key: 'revenue', name: 'revenue' },
      { key: 'retention', name: 'retention' },
      { key: 'customerSatisfaction', name: 'customer_satisfaction' },
    ];

    return categories.map((cat) => {
      const metrics = benchmark[cat.key] as any;
      const status = metrics.peerPercentile >= 60 ? 'above' : metrics.peerPercentile >= 40 ? 'at' : 'below';

      return {
        brokerId,
        category: cat.name,
        brokerValue: metrics.value,
        peerAverage: metrics.peerAverage,
        industryAverage: metrics.industryAverage,
        peerPercentile: metrics.peerPercentile,
        industryPercentile: metrics.industryPercentile,
        gapFromPeer: metrics.value - metrics.peerAverage,
        gapFromIndustry: metrics.value - metrics.industryAverage,
        status,
      };
    });
  }

  async getPeerGroups(filters?: {
    region?: string;
    specialization?: string[];
    minLeads?: number;
  }): Promise<PeerGroup[]> {
    return [
      {
        id: 'pg-1',
        name: 'Top Performers',
        description: 'Brokers with conversion rates above 30%',
        criteria: { minLeads: 100, maxLeads: undefined, specialization: undefined },
        brokerCount: 25,
        averageMetrics: {
          conversionRate: 0.32,
          responseTime: 35,
          revenue: 520,
          retention: 0.88,
          customerSatisfaction: 4.6,
        },
      },
      {
        id: 'pg-2',
        name: 'Growth Market',
        description: 'Brokers in high-growth insurance segments',
        criteria: { specialization: ['commercial', 'health'] },
        brokerCount: 45,
        averageMetrics: {
          conversionRate: 0.28,
          responseTime: 42,
          revenue: 480,
          retention: 0.82,
          customerSatisfaction: 4.3,
        },
      },
      {
        id: 'pg-3',
        name: 'Established Players',
        description: 'Brokers with over 5 years experience',
        criteria: { minLeads: 500 },
        brokerCount: 35,
        averageMetrics: {
          conversionRate: 0.26,
          responseTime: 48,
          revenue: 450,
          retention: 0.86,
          customerSatisfaction: 4.4,
        },
      },
      {
        id: 'pg-4',
        name: 'Emerging Brokers',
        description: 'New brokers building their client base',
        criteria: { maxLeads: 100 },
        brokerCount: 60,
        averageMetrics: {
          conversionRate: 0.18,
          responseTime: 65,
          revenue: 280,
          retention: 0.72,
          customerSatisfaction: 4.0,
        },
      },
    ];
  }

  async getBenchmarkTrends(
    brokerId: string,
    category: PerformanceCategory,
    period: BenchmarkPeriod = 'month',
    months: number = 6
  ): Promise<BenchmarkTrend[]> {
    const now = new Date();
    const trends: BenchmarkTrend[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);

      const benchmark = await this.generateBrokerBenchmark(brokerId, period);
      const categoryKey = this.getCategoryKey(category);
      const metrics = benchmark[categoryKey] as any;

      trends.push({
        date: date.toISOString().split('T')[0],
        brokerValue: metrics.value,
        peerAverage: metrics.peerAverage,
        industryAverage: metrics.industryAverage,
      });
    }

    return trends;
  }

  private getCategoryKey(category: PerformanceCategory): keyof BrokerBenchmarkMetrics {
    switch (category) {
      case 'conversion':
        return 'conversionRate' as any;
      case 'response_time':
        return 'responseTime' as any;
      case 'revenue':
        return 'revenue' as any;
      case 'retention':
        return 'retention' as any;
      case 'customer_satisfaction':
        return 'customerSatisfaction' as any;
    }
  }

  async generateInsights(brokerId: string, period: BenchmarkPeriod = 'month'): Promise<BenchmarkInsight[]> {
    const benchmark = await this.generateBrokerBenchmark(brokerId, period);
    const insights: BenchmarkInsight[] = [];

    const categories: { key: keyof typeof benchmark; name: PerformanceCategory }[] = [
      { key: 'conversionRate', name: 'conversion' },
      { key: 'responseTime', name: 'response_time' },
      { key: 'revenue', name: 'revenue' },
      { key: 'retention', name: 'retention' },
      { key: 'customerSatisfaction', name: 'customer_satisfaction' },
    ];

    for (const cat of categories) {
      const metrics = benchmark[cat.key] as any;
      const gap = metrics.value - metrics.peerAverage;
      const gapPercent = (gap / metrics.peerAverage) * 100;

      if (metrics.peerPercentile >= 75) {
        insights.push({
          id: `insight-${brokerId}-${cat.name}-strength`,
          brokerId,
          category: cat.name,
          type: 'strength',
          title: `Strong ${cat.name} performance`,
          description: `Your ${cat.name} metrics are in the top 25% compared to peers.`,
          metric: cat.name,
          currentValue: metrics.value,
          benchmarkValue: metrics.peerAverage,
          gap,
          recommendation: 'Maintain current practices and share best practices with team members.',
          priority: 'low',
          createdAt: new Date(),
        });
      } else if (metrics.peerPercentile <= 35) {
        insights.push({
          id: `insight-${brokerId}-${cat.name}-opportunity`,
          brokerId,
          category: cat.name,
          type: 'opportunity',
          title: `Improve ${cat.name} performance`,
          description: `Your ${cat.name} metrics are below peer average by ${Math.abs(gapPercent).toFixed(0)}%.`,
          metric: cat.name,
          currentValue: metrics.value,
          benchmarkValue: metrics.peerAverage,
          gap,
          recommendation: this.getRecommendationForCategory(cat.name, gap),
          priority: 'high',
          createdAt: new Date(),
        });
      }

      if (metrics.trend === 'declining' && metrics.peerPercentile < 60) {
        insights.push({
          id: `insight-${brokerId}-${cat.name}-warning`,
          brokerId,
          category: cat.name,
          type: 'warning',
          title: `Declining ${cat.name} trend`,
          description: `Your ${cat.name} metrics are trending downward.`,
          metric: cat.name,
          currentValue: metrics.value,
          benchmarkValue: metrics.peerAverage,
          gap,
          recommendation: 'Review recent changes in your process and identify root causes.',
          priority: 'medium',
          createdAt: new Date(),
        });
      }
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private getRecommendationForCategory(category: PerformanceCategory, gap: number): string {
    switch (category) {
      case 'conversion':
        return 'Consider reviewing lead qualification criteria and follow-up processes. Implement a structured follow-up cadence.';
      case 'response_time':
        return 'Aim to respond to leads within 30 minutes. Consider setting up automated response templates.';
      case 'revenue':
        return 'Focus on cross-selling opportunities and premium product positioning. Review your pricing strategy.';
      case 'retention':
        return 'Implement proactive check-ins with existing clients. Create a renewal reminder system.';
      case 'customer_satisfaction':
        return 'Request feedback after each interaction. Address concerns promptly and follow up on all issues.';
      default:
        return 'Review your current processes and identify areas for improvement.';
    }
  }

  async getIndustryBenchmarks(): Promise<IndustryBenchmark[]> {
    return [
      {
        id: 'ib-1',
        category: 'conversion',
        metric: 'Lead to Policy Conversion Rate',
        value: 0.20,
        source: 'Internal Analysis',
        dataPeriod: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
        sampleSize: 1500,
        breakdown: { auto: 0.22, home: 0.18, life: 0.15, health: 0.25, commercial: 0.20 },
      },
      {
        id: 'ib-2',
        category: 'response_time',
        metric: 'Average First Response Time (minutes)',
        value: 60,
        source: 'Internal Analysis',
        dataPeriod: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
        sampleSize: 1500,
        breakdown: { top_25_percent: 15, average: 60, bottom_25_percent: 120 },
      },
      {
        id: 'ib-3',
        category: 'revenue',
        metric: 'Average Revenue per Policy',
        value: 380,
        source: 'Internal Analysis',
        dataPeriod: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
        sampleSize: 1500,
        breakdown: { auto: 320, home: 450, life: 520, health: 280, commercial: 850 },
      },
      {
        id: 'ib-4',
        category: 'retention',
        metric: '12-Month Policy Retention Rate',
        value: 0.78,
        source: 'Internal Analysis',
        dataPeriod: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
        sampleSize: 1500,
        breakdown: { auto: 0.82, home: 0.76, life: 0.88, health: 0.72, commercial: 0.70 },
      },
      {
        id: 'ib-5',
        category: 'customer_satisfaction',
        metric: 'Average Customer Satisfaction Score',
        value: 4.0,
        source: 'Internal Analysis',
        dataPeriod: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
        sampleSize: 1500,
        breakdown: { auto: 4.1, home: 3.9, life: 4.3, health: 3.8, commercial: 3.9 },
      },
    ];
  }

  async getBrokerRanking(brokerId: string): Promise<BrokerRanking> {
    const benchmark = await this.generateBrokerBenchmark(brokerId, 'month');

    const overallScore =
      (benchmark.conversionRate.peerPercentile * 0.25 +
        (100 - benchmark.responseTime.peerPercentile) * 0.20 +
        benchmark.revenue.peerPercentile * 0.20 +
        benchmark.retention.peerPercentile * 0.20 +
        benchmark.customerSatisfaction.peerPercentile * 0.15);

    const totalBrokers = 165;
    const rank = Math.floor(Math.random() * 30) + 1;

    return {
      brokerId,
      brokerName: `Broker ${brokerId.substring(0, 8)}`,
      overallScore,
      rank,
      totalBrokers,
      categoryRankings: [
        { category: 'conversion', score: benchmark.conversionRate.value, percentile: benchmark.conversionRate.peerPercentile, rank: Math.floor(Math.random() * 50) + 1 },
        { category: 'response_time', score: benchmark.responseTime.averageMinutes, percentile: benchmark.responseTime.peerPercentile, rank: Math.floor(Math.random() * 50) + 1 },
        { category: 'revenue', score: benchmark.revenue.totalRevenue, percentile: benchmark.revenue.peerPercentile, rank: Math.floor(Math.random() * 50) + 1 },
        { category: 'retention', score: benchmark.retention.retentionRate, percentile: benchmark.retention.peerPercentile, rank: Math.floor(Math.random() * 50) + 1 },
        { category: 'customer_satisfaction', score: benchmark.customerSatisfaction.score, percentile: benchmark.customerSatisfaction.peerPercentile, rank: Math.floor(Math.random() * 50) + 1 },
      ],
      trend: 'up',
    };
  }

  async generateBenchmarkReport(
    brokerId: string,
    period: BenchmarkPeriod = 'month'
  ): Promise<BenchmarkReport> {
    const [benchmark, comparisons, insights, trends, recommendations] = await Promise.all([
      this.generateBrokerBenchmark(brokerId, period),
      this.getBenchmarkComparisons(brokerId, period),
      this.generateInsights(brokerId, period),
      this.getAllTrends(brokerId, period),
      this.generateRecommendations(brokerId, period),
    ]);

    const ranking = await this.getBrokerRanking(brokerId);

    const strengths = comparisons.filter((c) => c.status === 'above').map((c) => c.category);
    const weaknesses = comparisons.filter((c) => c.status === 'below').map((c) => c.category);

    return {
      id: `report-${brokerId}-${Date.now()}`,
      brokerId,
      period,
      generatedAt: new Date(),
      summary: {
        overallScore: ranking.overallScore,
        overallPercentile: ranking.overallScore,
        strengths,
        weaknesses,
        topOpportunities: insights.filter((i) => i.type === 'opportunity').slice(0, 3).map((i) => i.title),
      },
      comparisons,
      trends,
      insights,
      recommendations,
    };
  }

  private async getAllTrends(
    brokerId: string,
    period: BenchmarkPeriod
  ): Promise<Record<PerformanceCategory, BenchmarkTrend[]>> {
    const categories: PerformanceCategory[] = ['conversion', 'response_time', 'revenue', 'retention', 'customer_satisfaction'];
    const trends: Record<string, BenchmarkTrend[]> = {};

    for (const category of categories) {
      trends[category] = await this.getBenchmarkTrends(brokerId, category, period, 6);
    }

    return trends as Record<PerformanceCategory, BenchmarkTrend[]>;
  }

  private async generateRecommendations(
    brokerId: string,
    period: BenchmarkPeriod
  ): Promise<{ category: PerformanceCategory; action: string; expectedImpact: string; effort: 'low' | 'medium' | 'high'; priority: number }[]> {
    const benchmark = await this.generateBrokerBenchmark(brokerId, period);
    const recommendations: { category: PerformanceCategory; action: string; expectedImpact: string; effort: 'low' | 'medium' | 'high'; priority: number }[] = [];

    if (benchmark.conversionRate.peerPercentile < 50) {
      recommendations.push({
        category: 'conversion',
        action: 'Implement a 3-touch follow-up sequence for all new leads',
        expectedImpact: 'Increase conversion rate by 10-15%',
        effort: 'low',
        priority: 1,
      });
    }

    if (benchmark.responseTime.peerPercentile < 50) {
      recommendations.push({
        category: 'response_time',
        action: 'Set up automated SMS notifications for new lead assignments',
        expectedImpact: 'Reduce response time by 25%',
        effort: 'medium',
        priority: 2,
      });
    }

    if (benchmark.retention.peerPercentile < 50) {
      recommendations.push({
        category: 'retention',
        action: 'Create a 90-day client onboarding check-in program',
        expectedImpact: 'Improve 12-month retention by 8%',
        effort: 'medium',
        priority: 3,
      });
    }

    if (benchmark.customerSatisfaction.peerPercentile < 50) {
      recommendations.push({
        category: 'customer_satisfaction',
        action: 'Deploy post-interaction satisfaction surveys',
        expectedImpact: 'Increase satisfaction scores by 0.3-0.5 points',
        effort: 'low',
        priority: 4,
      });
    }

    if (benchmark.revenue.peerPercentile < 50) {
      recommendations.push({
        category: 'revenue',
        action: 'Cross-train on upselling bundled insurance products',
        expectedImpact: 'Increase average policy value by 15%',
        effort: 'high',
        priority: 5,
      });
    }

    return recommendations;
  }

  async createGoal(data: CreateGoalDto): Promise<PerformanceGoal> {
    const goal = await prisma.performanceGoal.create({
      data: {
        brokerId: data.brokerId,
        category: data.category.toUpperCase(),
        targetValue: data.targetValue,
        currentValue: 0,
        progress: 0,
        deadline: data.deadline,
        status: 'on_track',
      },
    });

    return {
      id: goal.id,
      brokerId: goal.brokerId,
      category: goal.category as PerformanceCategory,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progress: goal.progress,
      deadline: goal.deadline,
      status: goal.status as 'on_track' | 'at_risk' | 'behind' | 'achieved',
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  async updateGoal(goalId: string, data: UpdateGoalDto): Promise<PerformanceGoal | null> {
    const goal = await prisma.performanceGoal.findUnique({ where: { id: goalId } });
    if (!goal) return null;

    const updateData: Record<string, unknown> = {};
    if (data.targetValue) updateData.targetValue = data.targetValue;
    if (data.currentValue !== undefined) {
      updateData.currentValue = data.currentValue;
      updateData.progress = (data.currentValue / (goal.targetValue || 1)) * 100;
    }
    if (data.deadline) updateData.deadline = data.deadline;

    const updated = await prisma.performanceGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return {
      id: updated.id,
      brokerId: updated.brokerId,
      category: updated.category as PerformanceCategory,
      targetValue: updated.targetValue,
      currentValue: updated.currentValue,
      progress: updated.progress,
      deadline: updated.deadline,
      status: updated.status as 'on_track' | 'at_risk' | 'behind' | 'achieved',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async getGoals(brokerId: string): Promise<PerformanceGoal[]> {
    const goals = await prisma.performanceGoal.findMany({
      where: { brokerId },
      orderBy: { deadline: 'asc' },
    });

    return goals.map((goal) => ({
      id: goal.id,
      brokerId: goal.brokerId,
      category: goal.category as PerformanceCategory,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progress: goal.progress,
      deadline: goal.deadline,
      status: goal.status as 'on_track' | 'at_risk' | 'behind' | 'achieved',
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    }));
  }

  async getGoalById(goalId: string): Promise<PerformanceGoal | null> {
    const goal = await prisma.performanceGoal.findUnique({ where: { id: goalId } });
    if (!goal) return null;

    return {
      id: goal.id,
      brokerId: goal.brokerId,
      category: goal.category as PerformanceCategory,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progress: goal.progress,
      deadline: goal.deadline,
      status: goal.status as 'on_track' | 'at_risk' | 'behind' | 'achieved',
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    const goal = await prisma.performanceGoal.findUnique({ where: { id: goalId } });
    if (!goal) return false;

    await prisma.performanceGoal.delete({ where: { id: goalId } });
    return true;
  }
}
