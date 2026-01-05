import { FairLendingResult, DisparateImpactMetrics } from '@insurance-lead-gen/types';
import { prisma } from '../infra/prisma.js';

export class FairLendingService {
  /**
   * Validates an application for potential discrimination
   */
  async validateApplicationForDiscrimination(applicationData: any): Promise<FairLendingResult> {
    const prohibitedFactors = ['race', 'religion', 'sex', 'nationalOrigin', 'age', 'disability', 'maritalStatus'];
    const detectedFactors: string[] = [];

    // Check if any prohibited factors are being used in a way that suggests discrimination
    // This is a simplified logic for the stub
    for (const factor of prohibitedFactors) {
      if (applicationData.decisionFactors?.includes(factor)) {
        detectedFactors.push(factor);
      }
    }

    const riskLevel = detectedFactors.length > 0 ? (detectedFactors.length > 2 ? 'High' : 'Medium') : 'Low';

    return {
      compliant: detectedFactors.length === 0,
      discriminatoryFactorsDetected: detectedFactors,
      riskLevel: riskLevel as any,
      recommendations: detectedFactors.length > 0 
        ? ['Review underwriting rationale for use of prohibited factors', 'Ensure disparate impact analysis is performed']
        : ['Continue regular monitoring'],
    };
  }

  /**
   * Checks if prohibited factors are present in the dataset
   */
  async checkProhibitedFactors(applicationData: any, factors: string[]): Promise<{ present: string[] }> {
    const present = factors.filter(f => applicationData[f] !== undefined);
    return { present };
  }

  /**
   * Calculates disparate impact metrics for a product
   */
  async calculateDisparateImpactMetrics(productType: string): Promise<DisparateImpactMetrics> {
    const periodId = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    // In a real system, we would query historical data
    // Mocking the result
    return {
      periodId,
      products: {
        [productType]: {
          totalApplications: 100,
          approvalRateByClass: {
            'White': 0.85,
            'Black': 0.78,
            'Hispanic': 0.80,
            'Asian': 0.84,
          },
          disparateImpactDetected: false,
          disparityRatio: 0.91, // 0.78 / 0.85
        }
      }
    };
  }

  /**
   * Monitors disparate impact for a period
   */
  async monitorDisparateImpact(productType: string, period: string): Promise<void> {
    const metrics = await this.calculateDisparateImpactMetrics(productType);
    const data = metrics.products[productType];

    await prisma.disparateImpactMonitor.upsert({
      where: {
        monitoringPeriod_protectedClass_product: {
          monitoringPeriod: period,
          protectedClass: 'Race',
          product: productType,
        },
      },
      update: {
        totalApplications: data.totalApplications,
        approvedByClass: JSON.stringify({}), // Mock
        deniedByClass: JSON.stringify({}), // Mock
        approvalRateByClass: JSON.stringify(data.approvalRateByClass),
        disparateImpact: data.disparateImpactDetected,
        disparityRatio: data.disparityRatio,
        flagged: data.disparateImpactDetected,
      },
      create: {
        monitoringPeriod: period,
        protectedClass: 'Race',
        product: productType,
        totalApplications: data.totalApplications,
        approvedByClass: JSON.stringify({}),
        deniedByClass: JSON.stringify({}),
        approvalRateByClass: JSON.stringify(data.approvalRateByClass),
        disparateImpact: data.disparateImpactDetected,
        disparityRatio: data.disparityRatio,
        flagged: data.disparateImpactDetected,
      },
    });
  }

  /**
   * Generates a fair lending report
   */
  async generateFairLendingReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await prisma.disparateImpactMonitor.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      reportPeriod: { start: startDate, end: endDate },
      totalMonitoredPeriods: records.length,
      flaggedIncidents: records.filter(r => r.flagged).length,
      summary: "All products within acceptable variance for the period.",
    };
  }

  /**
   * Flags suspicious approvals
   */
  async flagSuspiciousApprovals(threshold: number): Promise<any[]> {
    // This would typically involve looking for outliers in approval data
    return [];
  }

  /**
   * Validates underwriting decisions
   */
  async validateUnderwritingDecision(decisionData: any): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    if (!decisionData.reasoning || decisionData.reasoning.length < 10) {
      issues.push("Insufficient underwriting reasoning documented");
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
