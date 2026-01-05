import { DisparateImpactAnalysis } from '@insurance-lead-gen/types';
import { prisma } from '../infra/prisma.js';

export class DisparateImpactService {
  /**
   * Analyzes approval rates for a period and product
   */
  async analyzeApprovalRates(period: string, product: string): Promise<DisparateImpactAnalysis> {
    // This would typically query application data grouped by protected class
    // For now, returning mock data that demonstrates the 80% rule
    return {
      product,
      period,
      metrics: {
        classes: [
          { name: 'Control Group', approvalRate: 0.80, count: 1000 },
          { name: 'Protected Group A', approvalRate: 0.70, count: 500 }, // 0.70/0.80 = 87.5% (Compliant)
          { name: 'Protected Group B', approvalRate: 0.60, count: 400 }, // 0.60/0.80 = 75% (Non-compliant)
        ],
        summary: "Potential disparate impact detected for Protected Group B",
      }
    };
  }

  /**
   * Calculates the ratio between two approval rates
   */
  calculateApprovalRateRatio(rate1: number, rate2: number): number {
    if (rate2 === 0) return 0;
    return rate1 / rate2;
  }

  /**
   * Checks if a protected class meets the 80% rule relative to a baseline
   */
  checkFor80PercentRule(protectedRate: number, baselineRate: number): { compliant: boolean; ratio: number } {
    const ratio = this.calculateApprovalRateRatio(protectedRate, baselineRate);
    return {
      compliant: ratio >= 0.8,
      ratio,
    };
  }

  /**
   * Identifies problematic patterns in underwriting or pricing
   */
  async identifyProblematicPatterns(): Promise<any[]> {
    // This could use ML or statistical analysis to find correlations
    return [];
  }

  /**
   * Generates a disparate impact report
   */
  async generateDisparateImpactReport(period: string): Promise<any> {
    const analysis = await this.analyzeApprovalRates(period, 'All');
    return {
      title: `Disparate Impact Analysis Report - ${period}`,
      generatedAt: new Date(),
      analysis,
    };
  }

  /**
   * Tracks monthly metrics and saves to database
   */
  async trackMonthlyMetrics(): Promise<void> {
    const period = new Date().toISOString().substring(0, 7);
    const analysis = await this.analyzeApprovalRates(period, 'Auto');

    for (const classData of analysis.metrics.classes) {
      if (classData.name === 'Control Group') continue;

      const { compliant, ratio } = this.checkFor80PercentRule(classData.approvalRate, 0.80);

      await prisma.disparateImpactMonitor.upsert({
        where: {
          monitoringPeriod_protectedClass_product: {
            monitoringPeriod: period,
            protectedClass: classData.name,
            product: 'Auto',
          },
        },
        update: {
          totalApplications: classData.count,
          approvedByClass: JSON.stringify({ count: Math.floor(classData.count * classData.approvalRate) }),
          deniedByClass: JSON.stringify({ count: Math.floor(classData.count * (1 - classData.approvalRate)) }),
          approvalRateByClass: classData.approvalRate.toString(),
          disparateImpact: !compliant,
          disparityRatio: ratio,
          flagged: !compliant,
        },
        create: {
          monitoringPeriod: period,
          protectedClass: classData.name,
          product: 'Auto',
          totalApplications: classData.count,
          approvedByClass: JSON.stringify({ count: Math.floor(classData.count * classData.approvalRate) }),
          deniedByClass: JSON.stringify({ count: Math.floor(classData.count * (1 - classData.approvalRate)) }),
          approvalRateByClass: classData.approvalRate.toString(),
          disparateImpact: !compliant,
          disparityRatio: ratio,
          flagged: !compliant,
        },
      });
    }
  }
}
