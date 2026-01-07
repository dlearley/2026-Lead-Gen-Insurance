import { InsuranceLicense } from '@prisma/client';
import { prisma } from '../infra/prisma.js';

export class InsuranceLicenseService {
  /**
   * Verifies an agent's license
   */
  async verifyLicense(agentId: string, licenseNumber: string): Promise<LicenseVerificationResult> {
    const license = await prisma.insuranceLicense.findUnique({
      where: {
        agentId_licenseNumber: {
          agentId,
          licenseNumber,
        },
      },
    });

    if (!license) {
      // In a real scenario, we might call an external service here
      const externalResult = await this.verifyLicenseWithNIPC(licenseNumber);
      return {
        verified: externalResult.verified,
        licenseNumber: licenseNumber,
        licenseType: externalResult.licenseType || 'Unknown',
        states: externalResult.states || [],
        lines: externalResult.lines || [],
        status: (externalResult.status as any) || 'Pending',
        expiryDate: externalResult.expiryDate || new Date(),
      };
    }

    return {
      verified: license.status === 'Active',
      licenseNumber: license.licenseNumber,
      licenseType: license.licenseType,
      states: license.states,
      lines: license.lines,
      status: license.status as any,
      expiryDate: license.expiryDate,
    };
  }

  /**
   * Checks the status of an agent's licenses
   */
  async checkLicenseStatus(agentId: string): Promise<LicenseStatus> {
    const licenses = await prisma.insuranceLicense.findMany({
      where: { agentId },
    });

    if (licenses.length === 0) {
      return { status: 'NoLicense', lastChecked: new Date() };
    }

    const allActive = licenses.every(l => l.status === 'Active');
    const anyExpired = licenses.some(l => l.status === 'Expired' || l.expiryDate < new Date());

    if (anyExpired) return { status: 'Expired', lastChecked: new Date() };
    if (allActive) return { status: 'Active', lastChecked: new Date() };
    
    return { status: 'Suspended', lastChecked: new Date() };
  }

  /**
   * Verifies if an agent is licensed in a specific state and line
   */
  async isAgentLicensed(agentId: string, state: string, line: string): Promise<boolean> {
    const license = await prisma.insuranceLicense.findFirst({
      where: {
        agentId,
        states: { has: state },
        lines: { has: line },
        status: 'Active',
        expiryDate: { gt: new Date() },
      },
    });

    return !!license;
  }

  /**
   * Mock NIPC verification
   */
  async verifyLicenseWithNIPC(licenseNumber: string): Promise<ExternalVerificationResult> {
    // Stub for external NIPC integration
    return {
      verified: true,
      licenseNumber,
      status: 'Active',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      states: ['CA', 'NY'],
      lines: ['Auto', 'Home'],
      source: 'NIPR',
    };
  }

  /**
   * Mock state board verification
   */
  async verifyLicenseWithState(licenseNumber: string, state: string): Promise<ExternalVerificationResult> {
    // Stub for state board integration
    return {
      verified: true,
      licenseNumber,
      status: 'Active',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      states: [state],
      lines: ['Auto'],
      source: 'StateBoard',
    };
  }

  /**
   * Updates license status
   */
  async updateLicenseStatus(agentId: string, licenseId: string, status: string): Promise<void> {
    await prisma.insuranceLicense.update({
      where: { id: licenseId },
      data: { status, verificationDate: new Date() },
    });
  }

  /**
   * Lists all licenses for an agent
   */
  async listAgentLicenses(agentId: string): Promise<InsuranceLicense[]> {
    return prisma.insuranceLicense.findMany({
      where: { agentId },
    });
  }

  /**
   * Checks for licenses expiring within a given number of days
   */
  async checkExpiringLicenses(daysUntilExpiry: number): Promise<InsuranceLicense[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return prisma.insuranceLicense.findMany({
      where: {
        expiryDate: {
          lte: expiryDate,
          gt: new Date(),
        },
        status: 'Active',
      },
    });
  }

  /**
   * Notifies agent of license expiration (Mock)
   */
  async notifyLicenseExpiration(agentId: string): Promise<void> {
    console.log(`Notifying agent ${agentId} about license expiration`);
  }

  /**
   * Handles expired license
   */
  async handleExpiredLicense(licenseId: string): Promise<void> {
    await prisma.insuranceLicense.update({
      where: { id: licenseId },
      data: { status: 'Expired' },
    });
  }

  /**
   * Records a license violation
   */
  async recordLicenseViolation(licenseId: string, violation: ViolationData): Promise<void> {
    const license = await prisma.insuranceLicense.findUnique({
      where: { id: licenseId },
    });

    if (license) {
      await prisma.insuranceLicense.update({
        where: { id: licenseId },
        data: {
          complianceIssues: {
            push: violation.description,
          },
        },
      });
      
      await prisma.agentComplianceRecord.create({
        data: {
          agentId: license.agentId,
          eventType: 'Violation',
          severity: violation.severity,
          description: violation.description,
          dateOccurred: new Date(),
          status: 'Open',
        },
      });
    }
  }

  /**
   * Suspends a license
   */
  async suspendLicense(licenseId: string, reason: string): Promise<void> {
    await this.updateLicenseStatus('', licenseId, 'Suspended');
    // Also record violation or compliance issue
  }

  /**
   * Revokes a license
   */
  async revokeLicense(licenseId: string, reason: string): Promise<void> {
    await this.updateLicenseStatus('', licenseId, 'Revoked');
  }

  /**
   * Checks if an agent can operate in a state
   */
  async canAgentOperateInState(agentId: string, state: string): Promise<boolean> {
    const licenses = await prisma.insuranceLicense.findMany({
      where: {
        agentId,
        states: { has: state },
        status: 'Active',
        expiryDate: { gt: new Date() },
      },
    });
    return licenses.length > 0;
  }

  /**
   * Checks if an agent can sell a specific product in a state
   */
  async canAgentSellProduct(agentId: string, productType: string, state: string): Promise<boolean> {
    const license = await prisma.insuranceLicense.findFirst({
      where: {
        agentId,
        states: { has: state },
        lines: { has: productType },
        status: 'Active',
        expiryDate: { gt: new Date() },
      },
    });
    return !!license;
  }

  /**
   * Validates full agent authority
   */
  async validateAgentAuthority(agentId: string, productType: string, state: string): Promise<AuthorityValidation> {
    const licensed = await this.canAgentSellProduct(agentId, productType, state);
    
    // Also need to check carrier appointments
    const appointment = await prisma.carrierAppointment.findFirst({
      where: {
        agentId,
        authorizedLines: { has: productType },
        appointmentStatus: 'Active',
      },
    });

    const canSell = licensed && !!appointment;

    return {
      canSell,
      reason: canSell ? undefined : (!licensed ? 'Agent not licensed for this product/state' : 'Agent not appointed by carrier for this product'),
      licenseStatus: licensed ? 'Active' : 'Invalid',
      appointmentStatus: appointment ? 'Active' : 'Invalid',
      applicableRules: [],
    };
  }
}
