import { ExternalVerificationResult } from '@insurance-lead-gen/types';

/**
 * Stub for NIPC (National Insurance Producer Registry) integration
 */
export async function verifyWithNIPC(licenseNumber: string): Promise<ExternalVerificationResult> {
  // In production, this would call the NIPC API
  return {
    verified: true,
    licenseNumber,
    status: 'Active',
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    states: ['CA', 'NY', 'TX'],
    lines: ['Auto', 'Home', 'Life'],
    source: 'NIPR',
    licenseType: 'Producer'
  };
}

/**
 * Stub for State Board verification
 */
export async function verifyWithStateBoard(licenseNumber: string, state: string): Promise<ExternalVerificationResult> {
  // In production, this would call the specific state's insurance board API
  return {
    verified: true,
    licenseNumber,
    status: 'Active',
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    states: [state],
    lines: ['Auto'],
    source: `StateBoard-${state}`,
    licenseType: 'Producer'
  };
}

/**
 * Stub for checking carrier appointments
 */
export async function checkCarrierAppointment(agentId: string, carrierId: string): Promise<any> {
  return {
    appointed: true,
    agentId,
    carrierId,
    status: 'Active',
    effectiveDate: new Date(),
  };
}
