import { logger } from '@insurance-lead-gen/core';

export interface ABTestConfig {
  testName: string;
  startDate: Date;
  endDate?: Date;
  controlGroup: string; // e.g., 'rule_based_scoring'
  treatmentGroup: string; // e.g., 'ml_based_scoring'
  splitRatio: number; // 0-1, e.g., 0.5 for 50/50 split
  targetMetrics: string[]; // e.g., ['conversion_rate', 'lead_acceptance_rate']
  isActive: boolean;
}

export interface ABTestAssignment {
  leadId: string;
  testName: string;
  variant: 'control' | 'treatment';
  assignedAt: Date;
}

export interface ABTestMetrics {
  testName: string;
  variant: 'control' | 'treatment';
  leadsCount: number;
  conversionCount: number;
  conversionRate: number;
  avgLeadScore: number;
  avgTimeToConversion?: number;
  acceptanceRate?: number;
  revenue?: number;
}

export interface ABTestResults {
  testName: string;
  startDate: Date;
  endDate?: Date;
  duration: number; // days
  control: ABTestMetrics;
  treatment: ABTestMetrics;
  improvement: {
    conversionRate: number; // percentage
    revenue?: number; // percentage
    acceptanceRate?: number; // percentage
  };
  statisticalSignificance: {
    conversionRate: {
      pValue: number;
      isSignificant: boolean;
      confidenceLevel: number;
    };
  };
  recommendation: 'deploy' | 'iterate' | 'rollback';
  notes: string;
}

export class ABTestingService {
  private activeTests: Map<string, ABTestConfig> = new Map();
  private assignments: Map<string, ABTestAssignment> = new Map();

  constructor() {
    this.initializeTests();
  }

  private initializeTests(): void {
    // Initialize with ML Lead Scoring A/B test
    const mlScoringTest: ABTestConfig = {
      testName: 'ml_lead_scoring_v2',
      startDate: new Date(),
      controlGroup: 'rule_based_scoring',
      treatmentGroup: 'ml_based_scoring_v2',
      splitRatio: 0.5, // 50/50 split
      targetMetrics: [
        'conversion_rate',
        'lead_acceptance_rate',
        'time_to_conversion',
        'revenue_per_lead'
      ],
      isActive: true
    };

    this.activeTests.set(mlScoringTest.testName, mlScoringTest);
    logger.info('A/B Testing Service initialized', {
      activeTests: Array.from(this.activeTests.keys())
    });
  }

  /**
   * Assign a lead to a test variant (control or treatment)
   */
  assignLeadToVariant(leadId: string, testName: string): 'control' | 'treatment' {
    const test = this.activeTests.get(testName);
    
    if (!test || !test.isActive) {
      logger.warn('Test not found or inactive', { testName, leadId });
      return 'control'; // Default to control if test not active
    }

    // Check if already assigned
    const existingAssignment = this.assignments.get(`${testName}:${leadId}`);
    if (existingAssignment) {
      return existingAssignment.variant;
    }

    // Use hash-based assignment for consistency
    const variant = this.hashBasedAssignment(leadId, test.splitRatio);
    
    const assignment: ABTestAssignment = {
      leadId,
      testName,
      variant,
      assignedAt: new Date()
    };

    this.assignments.set(`${testName}:${leadId}`, assignment);
    
    logger.debug('Lead assigned to A/B test', {
      leadId,
      testName,
      variant
    });

    return variant;
  }

  /**
   * Hash-based assignment for consistent variant selection
   */
  private hashBasedAssignment(leadId: string, splitRatio: number): 'control' | 'treatment' {
    // Simple hash function (in production, use a more robust one)
    let hash = 0;
    for (let i = 0; i < leadId.length; i++) {
      const char = leadId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Normalize to 0-1
    const normalized = Math.abs(hash) / 2147483647;
    
    return normalized < splitRatio ? 'control' : 'treatment';
  }

  /**
   * Get variant for a lead
   */
  getLeadVariant(leadId: string, testName: string): 'control' | 'treatment' {
    const assignment = this.assignments.get(`${testName}:${leadId}`);
    
    if (assignment) {
      return assignment.variant;
    }

    // Assign if not already assigned
    return this.assignLeadToVariant(leadId, testName);
  }

  /**
   * Check if a lead should use ML scoring (treatment) or rule-based (control)
   */
  shouldUseMLScoring(leadId: string): boolean {
    const variant = this.getLeadVariant(leadId, 'ml_lead_scoring_v2');
    return variant === 'treatment';
  }

  /**
   * Calculate A/B test results (mock implementation)
   */
  async calculateTestResults(testName: string): Promise<ABTestResults | null> {
    const test = this.activeTests.get(testName);
    
    if (!test) {
      logger.warn('Test not found', { testName });
      return null;
    }

    // In a real implementation, this would query the database for actual metrics
    // For now, return mock data structure
    const mockControlMetrics: ABTestMetrics = {
      testName,
      variant: 'control',
      leadsCount: 1000,
      conversionCount: 150,
      conversionRate: 0.15,
      avgLeadScore: 58,
      avgTimeToConversion: 7.5,
      acceptanceRate: 0.72,
      revenue: 75000
    };

    const mockTreatmentMetrics: ABTestMetrics = {
      testName,
      variant: 'treatment',
      leadsCount: 1000,
      conversionCount: 195,
      conversionRate: 0.195,
      avgLeadScore: 72,
      avgTimeToConversion: 5.8,
      acceptanceRate: 0.85,
      revenue: 97500
    };

    // Calculate improvements
    const conversionRateImprovement = 
      ((mockTreatmentMetrics.conversionRate - mockControlMetrics.conversionRate) / 
       mockControlMetrics.conversionRate) * 100;

    const revenueImprovement = 
      ((mockTreatmentMetrics.revenue! - mockControlMetrics.revenue!) / 
       mockControlMetrics.revenue!) * 100;

    const acceptanceRateImprovement = 
      ((mockTreatmentMetrics.acceptanceRate! - mockControlMetrics.acceptanceRate!) / 
       mockControlMetrics.acceptanceRate!) * 100;

    // Calculate statistical significance (simplified z-test for proportions)
    const { pValue, isSignificant } = this.calculateZTest(
      mockControlMetrics.conversionCount,
      mockControlMetrics.leadsCount,
      mockTreatmentMetrics.conversionCount,
      mockTreatmentMetrics.leadsCount
    );

    const duration = test.endDate 
      ? (test.endDate.getTime() - test.startDate.getTime()) / (1000 * 60 * 60 * 24)
      : (Date.now() - test.startDate.getTime()) / (1000 * 60 * 60 * 24);

    const results: ABTestResults = {
      testName,
      startDate: test.startDate,
      endDate: test.endDate,
      duration,
      control: mockControlMetrics,
      treatment: mockTreatmentMetrics,
      improvement: {
        conversionRate: conversionRateImprovement,
        revenue: revenueImprovement,
        acceptanceRate: acceptanceRateImprovement
      },
      statisticalSignificance: {
        conversionRate: {
          pValue,
          isSignificant,
          confidenceLevel: (1 - pValue) * 100
        }
      },
      recommendation: this.getRecommendation(conversionRateImprovement, isSignificant),
      notes: this.generateRecommendationNotes(conversionRateImprovement, isSignificant, duration)
    };

    return results;
  }

  /**
   * Calculate z-test for proportions
   */
  private calculateZTest(
    controlSuccesses: number,
    controlTotal: number,
    treatmentSuccesses: number,
    treatmentTotal: number
  ): { pValue: number; isSignificant: boolean } {
    const p1 = controlSuccesses / controlTotal;
    const p2 = treatmentSuccesses / treatmentTotal;
    const pooledP = (controlSuccesses + treatmentSuccesses) / (controlTotal + treatmentTotal);
    
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/controlTotal + 1/treatmentTotal));
    const zScore = (p2 - p1) / se;
    
    // Calculate p-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    const isSignificant = pValue < 0.05; // 95% confidence level
    
    return { pValue, isSignificant };
  }

  /**
   * Normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Get recommendation based on test results
   */
  private getRecommendation(
    improvement: number,
    isSignificant: boolean
  ): 'deploy' | 'iterate' | 'rollback' {
    if (improvement > 15 && isSignificant) {
      return 'deploy';
    } else if (improvement > 5 && isSignificant) {
      return 'deploy';
    } else if (improvement < -5) {
      return 'rollback';
    } else {
      return 'iterate';
    }
  }

  /**
   * Generate recommendation notes
   */
  private generateRecommendationNotes(
    improvement: number,
    isSignificant: boolean,
    duration: number
  ): string {
    const notes: string[] = [];

    if (improvement > 20) {
      notes.push('Excellent performance! Treatment variant shows significant improvement.');
    } else if (improvement > 10) {
      notes.push('Good performance. Treatment variant shows meaningful improvement.');
    } else if (improvement > 0) {
      notes.push('Moderate improvement observed in treatment variant.');
    } else {
      notes.push('Treatment variant underperforming compared to control.');
    }

    if (isSignificant) {
      notes.push('Results are statistically significant at 95% confidence level.');
    } else {
      notes.push('Results are not yet statistically significant. Consider running test longer.');
    }

    if (duration < 14) {
      notes.push('Test duration is less than 2 weeks. Recommend running longer for more reliable results.');
    }

    return notes.join(' ');
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values()).filter(test => test.isActive);
  }

  /**
   * Stop a test
   */
  stopTest(testName: string): void {
    const test = this.activeTests.get(testName);
    if (test) {
      test.isActive = false;
      test.endDate = new Date();
      logger.info('A/B test stopped', { testName });
    }
  }

  /**
   * Get test summary
   */
  getTestSummary(testName: string): { test?: ABTestConfig; assignmentsCount: number } {
    const test = this.activeTests.get(testName);
    const assignmentsCount = Array.from(this.assignments.values())
      .filter(a => a.testName === testName)
      .length;

    return {
      test,
      assignmentsCount
    };
  }
}

// Singleton instance
let abTestingServiceInstance: ABTestingService | null = null;

export function getABTestingService(): ABTestingService {
  if (!abTestingServiceInstance) {
    abTestingServiceInstance = new ABTestingService();
  }
  return abTestingServiceInstance;
}
