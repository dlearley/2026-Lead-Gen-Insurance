import { prisma } from '../infra/prisma.js';

export class AgentComplianceDashboardService {
  /**
   * Aggregates compliance data for an agent
   */
  async getAgentComplianceStatus(agentId: string): Promise<any> {
    const licenses = await prisma.insuranceLicense.findMany({
      where: { agentId },
    });
    
    const appointments = await prisma.carrierAppointment.findMany({
      where: { agentId },
    });

    const violations = await prisma.agentComplianceRecord.findMany({
      where: { agentId, status: 'Open' },
    });

    return {
      agentId,
      overallStatus: violations.length > 0 ? 'ActionRequired' : 'Compliant',
      licenseCount: licenses.length,
      activeLicenses: licenses.filter(l => l.status === 'Active').length,
      appointmentCount: appointments.length,
      openViolations: violations.length,
    };
  }

  /**
   * Generates a compliance scorecard for an agent
   */
  async getComplianceScorecard(agentId: string, period: string): Promise<any> {
    const status = await this.getAgentComplianceStatus(agentId);
    
    return {
      period,
      score: status.openViolations === 0 ? 100 : Math.max(0, 100 - (status.openViolations * 10)),
      factors: [
        { name: 'Licensing', status: status.activeLicenses === status.licenseCount ? 'Pass' : 'Warning' },
        { name: 'Appointments', status: status.appointmentCount > 0 ? 'Pass' : 'Fail' },
        { name: 'Regulatory History', status: status.openViolations === 0 ? 'Pass' : 'Fail' },
      ],
    };
  }

  /**
   * Lists all violations for an agent
   */
  async listAgentViolations(agentId: string): Promise<any[]> {
    return prisma.agentComplianceRecord.findMany({
      where: { agentId },
      orderBy: { dateOccurred: 'desc' },
    });
  }

  /**
   * Gets licenses and appointments expiring soon
   */
  async getExpiringLicensesAndAppointments(agentId: string): Promise<any> {
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const expiringLicenses = await prisma.insuranceLicense.findMany({
      where: {
        agentId,
        expiryDate: { lte: next30Days, gte: new Date() },
      },
    });

    return {
      expiringLicenses,
      expiringAppointments: [], // Carrier appointments usually don't have hard expiry like licenses
    };
  }

  /**
   * Generates a comprehensive compliance report for an agent
   */
  async generateAgentComplianceReport(agentId: string): Promise<any> {
    const status = await this.getAgentComplianceStatus(agentId);
    const scorecard = await this.getComplianceScorecard(agentId, 'Current');
    const violations = await this.listAgentViolations(agentId);

    return {
      agentId,
      generatedAt: new Date(),
      status,
      scorecard,
      violations,
    };
  }
}
