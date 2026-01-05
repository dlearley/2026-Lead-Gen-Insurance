import { InsuranceLicenseService } from '../services/insurance-license.service.js';
import { DisparateImpactService } from '../services/disparate-impact.service.js';
import { logger } from '@insurance-lead-gen/core';

const licenseService = new InsuranceLicenseService();
const disparateImpactService = new DisparateImpactService();

/**
 * Checks for expiring licenses daily
 */
export async function checkExpiringLicensesJob() {
  logger.info('Starting daily license expiration check...');
  try {
    const expiringLicenses = await licenseService.checkExpiringLicenses(30); // Check for 30 days ahead
    for (const license of expiringLicenses) {
      await licenseService.notifyLicenseExpiration(license.agentId);
    }
    logger.info(`Finished license expiration check. Notified ${expiringLicenses.length} agents.`);
  } catch (error) {
    logger.error('Error in checkExpiringLicensesJob', { error });
  }
}

/**
 * Monthly disparate impact calculation
 */
export async function calculateDisparateImpactJob() {
  logger.info('Starting monthly disparate impact calculation...');
  try {
    await disparateImpactService.trackMonthlyMetrics();
    logger.info('Finished monthly disparate impact calculation.');
  } catch (error) {
    logger.error('Error in calculateDisparateImpactJob', { error });
  }
}

/**
 * Runs all compliance jobs
 */
export async function runComplianceJobs() {
  await checkExpiringLicensesJob();
  // Others could be added here
}
