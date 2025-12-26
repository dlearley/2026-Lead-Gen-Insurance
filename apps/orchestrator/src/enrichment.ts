import { logger } from '@insurance-lead-gen/core';
import { Lead } from '@insurance-lead-gen/types';

export interface EnrichmentData {
  company?: {
    name?: string;
    industry?: string;
    size?: string;
    revenue?: string;
    website?: string;
  };
  person?: {
    jobTitle?: string;
    linkedin?: string;
    seniority?: string;
  };
  demographics?: {
    estimatedIncome?: string;
    homeOwnership?: boolean;
  };
}

export class EnrichmentService {
  constructor() {}

  async enrichLead(leadData: Lead): Promise<EnrichmentData> {
    logger.info('Enriching lead data from external sources', { leadId: leadData.id });

    try {
      // Simulate calls to external APIs
      const companyData = await this.enrichCompanyData(leadData);
      const personData = await this.enrichPersonData(leadData);
      const demographicData = await this.enrichDemographicData(leadData);

      return {
        company: companyData,
        person: personData,
        demographics: demographicData,
      };
    } catch (error) {
      logger.error('Error during lead enrichment', { 
        leadId: leadData.id, 
        error: error instanceof Error ? error.message : String(error)
      });
      // Return empty enrichment on error rather than failing the whole pipeline
      return {};
    }
  }

  private async enrichCompanyData(leadData: Lead): Promise<EnrichmentData['company']> {
    // Mock D&B / Clearbit company enrichment
    if (leadData.insuranceType === 'commercial' || (leadData.email && !this.isPersonalEmail(leadData.email))) {
      logger.debug('Fetching company data', { leadId: leadData.id });
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        name: (leadData.metadata?.companyName as string) || 'Unknown Corp',
        industry: 'Professional Services',
        size: '50-200 employees',
        revenue: '$10M-$50M',
        website: leadData.email ? `https://www.${leadData.email.split('@')[1]}` : undefined,
      };
    }
    return undefined;
  }

  private async enrichPersonData(leadData: Lead): Promise<EnrichmentData['person']> {
    // Mock Clearbit person enrichment
    if (leadData.email) {
      logger.debug('Fetching person data', { leadId: leadData.id });
      
      await new Promise(resolve => setTimeout(resolve, 80));

      return {
        jobTitle: 'Senior Manager',
        linkedin: `linkedin.com/in/${leadData.firstName?.toLowerCase()}${leadData.lastName?.toLowerCase()}`,
        seniority: 'Senior',
      };
    }
    return undefined;
  }

  private async enrichDemographicData(leadData: Lead): Promise<EnrichmentData['demographics']> {
    // Mock consumer data enrichment
    if (leadData.insuranceType !== 'commercial') {
      logger.debug('Fetching demographic data', { leadId: leadData.id });

      await new Promise(resolve => setTimeout(resolve, 120));

      return {
        estimatedIncome: '$75k-$100k',
        homeOwnership: true,
      };
    }
    return undefined;
  }

  private isPersonalEmail(email: string): boolean {
    const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const domain = email.split('@')[1];
    return personalDomains.includes(domain?.toLowerCase());
  }
}
