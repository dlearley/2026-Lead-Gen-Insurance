import { FairLendingService } from './fair-lending.service.js';
import { DisclosureService } from './disclosure.service.js';
import { prisma } from '../infra/prisma.js';
const fairLendingService = new FairLendingService();
const disclosureService = new DisclosureService();

export class ComplianceReportingService {
  /**
   * Generates a monthly fair lending report
   */
  async generateMonthlyFairLendingReport(): Promise<any> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

    return fairLendingService.generateFairLendingReport(startDate, endDate);
  }

  /**
   * Generates a quarterly disparate impact analysis
   */
  async generateQuarterlyDisparateImpactAnalysis(): Promise<any> {
    // Simplified: pulling last 3 months of monitors
    const monitors = await prisma.disparateImpactMonitor.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      reportType: 'Quarterly Disparate Impact',
      generatedAt: new Date(),
      monitors,
    };
  }

  /**
   * Summarizes all compliance violations
   */
  async getViolationSummaryReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await prisma.agentComplianceRecord.findMany({
      where: {
        dateOccurred: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalViolations: records.length,
      bySeverity: {
        Critical: records.filter(r => r.severity === 'Critical').length,
        High: records.filter(r => r.severity === 'High').length,
        Medium: records.filter(r => r.severity === 'Medium').length,
        Low: records.filter(r => r.severity === 'Low').length,
      },
      byStatus: {
        Open: records.filter(r => r.status === 'Open').length,
        Resolved: records.filter(r => r.status === 'Resolved').length,
      }
    };
  }

  /**
   * Reports on license and appointment status
   */
  async getLicenseAppointmentInventory(): Promise<any> {
    const totalLicenses = await prisma.insuranceLicense.count();
    const activeLicenses = await prisma.insuranceLicense.count({ where: { status: 'Active' } });
    const totalAppointments = await prisma.carrierAppointment.count();

    return {
      licenses: { total: totalLicenses, active: activeLicenses },
      appointments: { total: totalAppointments },
    };
  }
}
