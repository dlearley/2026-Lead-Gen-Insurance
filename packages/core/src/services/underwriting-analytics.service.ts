import {
  UnderwritingMetrics,
  DateRange,
  ApprovalRate,
  DecisionTimeMetrics,
  ExceptionAnalytics,
  AcceptanceMetrics,
  AccuracyMetrics,
  Bottleneck,
} from '@insurance-lead-gen/types';
import logger from '../logger.js';

/**
 * Service for underwriting analytics and metrics
 */
export class UnderwritingAnalyticsService {
  /**
   * Get underwriting metrics
   */
  async getUnderwritingMetrics(dateRange: DateRange): Promise<UnderwritingMetrics> {
    logger.info('Getting underwriting metrics', { dateRange });

    // In a real implementation, this would query aggregated data from database
    const byInsuranceLine = await this.getApprovalRatesByLine(dateRange);

    return {
      period: dateRange,
      totalApplications: 1000,
      autoApproved: 700,
      manualReview: 250,
      denied: 50,
      approvalRate: 0.70,
      averageDecisionTime: 4.2, // minutes
      exceptionsRate: 0.05,
      averagePremium: 1350,
      byInsuranceLine,
    };
  }

  /**
   * Get approval rates by insurance line
   */
  async getApprovalRatesByLine(dateRange: DateRange): Promise<ApprovalRate[]> {
    logger.info('Getting approval rates by line', { dateRange });

    // In a real implementation, this would query aggregated data
    return [
      { insuranceLine: 'auto', date: dateRange.startDate, approvalRate: 0.72, totalApplications: 350 },
      { insuranceLine: 'home', date: dateRange.startDate, approvalRate: 0.68, totalApplications: 300 },
      { insuranceLine: 'life', date: dateRange.startDate, approvalRate: 0.65, totalApplications: 200 },
      { insuranceLine: 'health', date: dateRange.startDate, approvalRate: 0.75, totalApplications: 100 },
      { insuranceLine: 'commercial', date: dateRange.startDate, approvalRate: 0.60, totalApplications: 50 },
    ];
  }

  /**
   * Get decision time analytics
   */
  async getDecisionTimeAnalytics(dateRange: DateRange): Promise<DecisionTimeMetrics> {
    logger.info('Getting decision time analytics', { dateRange });

    // In a real implementation, this would query decision times
    return {
      averageTime: 4.2,
      medianTime: 3.5,
      p95Time: 8.5,
      p99Time: 12.0,
      byInsuranceLine: {
        auto: 3.8,
        home: 4.5,
        life: 5.2,
        health: 4.0,
        commercial: 6.0,
      },
    };
  }

  /**
   * Get exception rates and trends
   */
  async getExceptionAnalytics(dateRange: DateRange): Promise<ExceptionAnalytics> {
    logger.info('Getting exception analytics', { dateRange });

    // In a real implementation, this would query exception data
    return {
      totalExceptions: 50,
      byType: {
        high_risk_score: 20,
        excessive_violations: 15,
        conflicting_rules: 8,
        missing_data: 5,
        duplicate_coverage: 2,
      },
      bySeverity: {
        Critical: 5,
        High: 15,
        Medium: 20,
        Low: 10,
      },
      resolutionTime: {
        average: 120, // minutes
        median: 90,
      },
      byInsuranceLine: {
        auto: 25,
        home: 12,
        life: 8,
        health: 3,
        commercial: 2,
      },
    };
  }

  /**
   * Get recommendation acceptance rates
   */
  async getRecommendationAcceptanceRate(dateRange: DateRange): Promise<AcceptanceMetrics> {
    logger.info('Getting recommendation acceptance rates', { dateRange });

    // In a real implementation, this would query recommendation performance
    return {
      totalRecommendations: 1000,
      viewed: 800,
      accepted: 180,
      declined: 620,
      acceptanceRate: 0.18,
      conversionRate: 0.15,
      averageRevenue: 875,
      byRecommendationType: {
        new_policy: { total: 400, accepted: 60, acceptanceRate: 0.15, averageRevenue: 950 },
        coverage_upgrade: { total: 300, accepted: 50, acceptanceRate: 0.17, averageRevenue: 725 },
        cross_sell: { total: 200, accepted: 50, acceptanceRate: 0.25, averageRevenue: 875 },
        upsell: { total: 100, accepted: 20, acceptanceRate: 0.20, averageRevenue: 1250 },
        retention: { total: 0, accepted: 0, acceptanceRate: 0, averageRevenue: 0 },
      },
    };
  }

  /**
   * Get premium prediction accuracy
   */
  async getPremiumAccuracy(dateRange: DateRange): Promise<AccuracyMetrics> {
    logger.info('Getting premium accuracy metrics', { dateRange });

    // In a real implementation, this would compare predicted vs actual premiums
    return {
      premiumPrediction: {
        mae: 85, // Mean Absolute Error in dollars
        mape: 0.063, // Mean Absolute Percentage Error (6.3%)
        rmse: 120, // Root Mean Square Error in dollars
      },
      riskPrediction: {
        accuracy: 0.89,
        precision: 0.87,
        recall: 0.91,
        f1Score: 0.89,
      },
    };
  }

  /**
   * Identify underwriting bottlenecks
   */
  async identifyBottlenecks(): Promise<Bottleneck[]> {
    logger.info('Identifying underwriting bottlenecks');

    const bottlenecks: Bottleneck[] = [];

    // Analyze decision times
    const decisionTimeMetrics = await this.getDecisionTimeAnalytics({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    if (decisionTimeMetrics.p95Time > 8) {
      bottlenecks.push({
        type: 'decision_time',
        description: '95th percentile decision time exceeds 8 minutes',
        impact: 0.25,
        suggestions: [
          'Optimize rule engine performance',
          'Implement parallel processing for independent rules',
          'Add caching for frequently accessed data',
        ],
      });
    }

    // Analyze exception rates
    const exceptionAnalytics = await this.getExceptionAnalytics({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    if (exceptionAnalytics.resolutionTime.average > 100) {
      bottlenecks.push({
        type: 'exception_resolution',
        description: 'Average exception resolution time is high',
        impact: 0.20,
        suggestions: [
          'Improve exception prioritization',
          'Provide better context for underwriters',
          'Automate resolution of common exception types',
        ],
      });
    }

    // Analyze manual review queue
    const manualReviewQueue = await this.getManualReviewQueueMetrics();
    if (manualReviewQueue.averageWaitTime > 60) {
      bottlenecks.push({
        type: 'manual_review',
        description: 'Manual review queue has high wait times',
        impact: 0.30,
        suggestions: [
          'Auto-assign underwriters to manual review cases',
          'Implement SLA alerts for aged cases',
          'Consider expanding underwriting capacity',
        ],
      });
    }

    // Analyze recommendation performance
    const acceptanceMetrics = await this.getRecommendationAcceptanceRate({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    if (acceptanceMetrics.acceptanceRate < 0.15) {
      bottlenecks.push({
        type: 'recommendation_quality',
        description: 'Recommendation acceptance rate is below target',
        impact: 0.15,
        suggestions: [
          'Improve recommendation scoring algorithm',
          'Increase personalization based on customer profile',
          'A/B test different recommendation strategies',
        ],
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get underwriting trends over time
   */
  async getUnderwritingTrends(days: number = 30): Promise<UnderwritingTrendData[]> {
    logger.info('Getting underwriting trends', { days });

    const trends: UnderwritingTrendData[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      // Simulate trend data
      const baseApprovalRate = 0.70;
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? -0.05 : 0;
      const randomFactor = (Math.random() - 0.5) * 0.1;

      trends.push({
        date,
        applications: Math.floor(30 + Math.random() * 10),
        approvals: 0,
        approvalRate: baseApprovalRate + weekendFactor + randomFactor,
        averageDecisionTime: 4 + (Math.random() - 0.5) * 2,
        exceptions: Math.floor(1 + Math.random() * 3),
      });
    }

    // Calculate approvals based on rates
    trends.forEach(trend => {
      trend.approvals = Math.round(trend.applications * trend.approvalRate);
    });

    return trends;
  }

  /**
   * Get underwriter performance metrics
   */
  async getUnderwriterPerformance(underwriterId?: string): Promise<UnderwriterPerformance[]> {
    logger.info('Getting underwriter performance', { underwriterId });

    // In a real implementation, this would query underwriter metrics
    return [
      {
        underwriterId: underwriterId || 'uw-1',
        name: 'John Smith',
        totalCases: 150,
        casesApproved: 105,
        casesDenied: 30,
        manualReview: 15,
        approvalRate: 0.70,
        averageDecisionTime: 3.8,
        averagePremium: 1380,
        accuracy: 0.92,
        productivity: 25, // cases per week
      },
      {
        underwriterId: 'uw-2',
        name: 'Jane Doe',
        totalCases: 180,
        casesApproved: 135,
        casesDenied: 30,
        manualReview: 15,
        approvalRate: 0.75,
        averageDecisionTime: 4.2,
        averagePremium: 1420,
        accuracy: 0.94,
        productivity: 30,
      },
    ];
  }

  /**
   * Get risk score distribution
   */
  async getRiskScoreDistribution(dateRange: DateRange): Promise<RiskScoreDistribution> {
    logger.info('Getting risk score distribution', { dateRange });

    return {
      totalScores: 1000,
      distribution: {
        low: { count: 400, percentage: 0.40, range: '0-40' },
        medium: { count: 350, percentage: 0.35, range: '41-60' },
        high: { count: 200, percentage: 0.20, range: '61-80' },
        critical: { count: 50, percentage: 0.05, range: '81-100' },
      },
      averageScore: 42,
      medianScore: 40,
      byInsuranceLine: {
        auto: { average: 38, median: 35 },
        home: { average: 42, median: 40 },
        life: { average: 48, median: 45 },
        health: { average: 35, median: 32 },
        commercial: { average: 55, median: 50 },
      },
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async getManualReviewQueueMetrics(): Promise<ManualReviewQueueMetrics> {
    // In a real implementation, this would query the manual review queue
    return {
      totalCases: 25,
      averageWaitTime: 45, // minutes
      oldestCaseAge: 120, // minutes
      byPriority: {
        urgent: 5,
        high: 10,
        normal: 8,
        low: 2,
      },
    };
  }
}

// ==================== TYPES ====================

interface UnderwritingTrendData {
  date: Date;
  applications: number;
  approvals: number;
  approvalRate: number;
  averageDecisionTime: number;
  exceptions: number;
}

interface UnderwriterPerformance {
  underwriterId: string;
  name: string;
  totalCases: number;
  casesApproved: number;
  casesDenied: number;
  manualReview: number;
  approvalRate: number;
  averageDecisionTime: number;
  averagePremium: number;
  accuracy: number;
  productivity: number;
}

interface RiskScoreDistribution {
  totalScores: number;
  distribution: {
    low: { count: number; percentage: number; range: string };
    medium: { count: number; percentage: number; range: string };
    high: { count: number; percentage: number; range: string };
    critical: { count: number; percentage: number; range: string };
  };
  averageScore: number;
  medianScore: number;
  byInsuranceLine: Record<string, { average: number; median: number }>;
}

interface ManualReviewQueueMetrics {
  totalCases: number;
  averageWaitTime: number;
  oldestCaseAge: number;
  byPriority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
}
