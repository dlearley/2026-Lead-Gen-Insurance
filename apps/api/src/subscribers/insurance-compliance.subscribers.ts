import { InsuranceLicenseService } from '../services/insurance-license.service.js';
import { ProductComplianceService } from '../services/product-compliance.service.js';
import { FairLendingService } from '../services/fair-lending.service.js';
import { logger } from '@insurance-lead-gen/core';

const licenseService = new InsuranceLicenseService();
const productService = new ProductComplianceService();
const fairLendingService = new FairLendingService();

/**
 * Initializes insurance compliance subscribers
 */
export function initComplianceSubscribers(events: any) {
  // Listen for quote creation
  events.on('quote.created', async (quoteData: any) => {
    logger.info('Validating quote compliance', { quoteId: quoteData.id });
    try {
      const result = await productService.validateQuoteCompliance(quoteData);
      if (!result.compliant) {
        logger.warn('Quote compliance violations detected', { quoteId: quoteData.id, violations: result.violations });
      }
    } catch (error) {
      logger.error('Error validating quote compliance', { error, quoteId: quoteData.id });
    }
  });

  // Listen for policy binding
  events.on('policy.bound', async (policyData: any) => {
    logger.info('Verifying agent authority for policy binding', { policyId: policyData.id });
    try {
      const result = await licenseService.validateAgentAuthority(
        policyData.agentId,
        policyData.productType,
        policyData.state
      );
      if (!result.canSell) {
        logger.error('Agent authority validation failed for policy binding', { 
          policyId: policyData.id, 
          reason: result.reason 
        });
      }
    } catch (error) {
      logger.error('Error verifying agent authority', { error, policyId: policyData.id });
    }
  });

  // Listen for agent signup
  events.on('agent.signup', async (agentData: any) => {
    logger.info('Verifying new agent license', { agentId: agentData.id });
    try {
      await licenseService.verifyLicense(agentData.id, agentData.licenseNumber);
    } catch (error) {
      logger.error('Error verifying agent license', { error, agentId: agentData.id });
    }
  });
}
