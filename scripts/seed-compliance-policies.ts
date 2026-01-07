import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

// Pre-configured compliance policies for different domains and jurisdictions
const COMPLIANCE_POLICIES = [
  // GDPR Policies
  {
    name: 'GDPR Data Processing Consent',
    description: 'Ensure explicit consent is obtained for processing personal data of EU residents',
    domain: 'GDPR',
    jurisdiction: 'EU',
    riskLevel: 'Critical',
    status: 'Active',
    requirements: [
      {
        name: 'Consent Required',
        description: 'Explicit consent must be obtained before processing personal data',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['consentGiven', 'consentDate'],
          properties: {
            consentGiven: { type: 'boolean' },
            consentDate: { type: 'string', format: 'date-time' },
            consentType: { type: 'string' }
          }
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Data Retention',
        description: 'Personal data must not be retained longer than necessary',
        validationRule: JSON.stringify({
          type: 'function',
          function: 'checkDataRetention'
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Right to Erasure',
        description: 'Data subjects can request deletion of their personal data',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['erasureRequestable']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },
  {
    name: 'GDPR Data Subject Rights',
    description: 'Implementation of data subject rights under GDPR',
    domain: 'GDPR',
    jurisdiction: 'EU',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'Access Request Handling',
        description: 'Data subject access requests must be processed within 30 days',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['dsarProcessTime']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Data Portability',
        description: 'Data must be provided in a structured, commonly used format',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['portableFormat']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },

  // HIPAA Policies
  {
    name: 'HIPAA Privacy Rule',
    description: 'Protection of Protected Health Information (PHI)',
    domain: 'HIPAA',
    jurisdiction: 'US',
    riskLevel: 'Critical',
    status: 'Active',
    requirements: [
      {
        name: 'PHI Encryption',
        description: 'All PHI must be encrypted at rest and in transit',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['encrypted', 'encryptionStandard']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Access Controls',
        description: 'Only authorized personnel can access PHI',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['accessControls', 'accessLogging']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Minimum Necessary',
        description: 'Only the minimum necessary PHI should be accessed',
        validationRule: JSON.stringify({
          type: 'function',
          function: 'checkMinimumNecessary'
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },
  {
    name: 'HIPAA Security Rule',
    description: 'Administrative, physical, and technical safeguards for PHI',
    domain: 'HIPAA',
    jurisdiction: 'US',
    riskLevel: 'Critical',
    status: 'Active',
    requirements: [
      {
        name: 'Audit Trail',
        description: 'All PHI access must be logged and monitored',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['auditTrail', 'auditRetention']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Incident Response',
        description: 'Security incidents must be reported within 60 days',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['incidentResponsePlan']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },

  // CCPA Policies
  {
    name: 'CCPA Consumer Privacy',
    description: 'California Consumer Privacy Act compliance for California residents',
    domain: 'CCPA',
    jurisdiction: 'CA',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'Privacy Notice',
        description: 'Privacy notice must be provided at data collection',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['privacyNoticeProvided', 'noticeContent']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Opt-Out Mechanism',
        description: 'Consumers must be able to opt-out of data sale',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['optOutAvailable', 'optOutProcess']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Consumer Rights',
        description: 'Right to know, delete, and correct personal information',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['consumerRightsProcess']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },

  // GLBA Policies
  {
    name: 'GLBA Financial Privacy',
    description: 'Gramm-Leach-Bliley Act financial privacy requirements',
    domain: 'GLBA',
    jurisdiction: 'US',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'Financial Privacy Notice',
        description: 'Privacy notices must be provided to consumers',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['privacyNoticeProvided', 'optOutRights']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Safeguards Rule',
        description: 'Administrative, technical, and physical safeguards required',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['safeguardsImplemented', 'safeguardAssessment']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },

  // Insurance-Specific Policies
  {
    name: 'California Insurance Regulations',
    description: 'California Department of Insurance regulations',
    domain: 'Insurance',
    jurisdiction: 'CA',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'License Verification',
        description: 'All agents must have valid California insurance licenses',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['licenseVerified', 'licenseNumber']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'E&O Insurance',
        description: 'Agents must maintain errors and omissions insurance',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['eAndOInsurance', 'eAndOCoverage']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },
  {
    name: 'New York Insurance Regulations',
    description: 'New York State Department of Financial Services regulations',
    domain: 'Insurance',
    jurisdiction: 'NY',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'License Verification',
        description: 'All agents must have valid New York insurance licenses',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['licenseVerified', 'licenseNumber']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Continuing Education',
        description: 'Agents must complete required continuing education',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['ceCompleted', 'ceHours']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },
  {
    name: 'Texas Insurance Regulations',
    description: 'Texas Department of Insurance regulations',
    domain: 'Insurance',
    jurisdiction: 'TX',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'License Verification',
        description: 'All agents must have valid Texas insurance licenses',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['licenseVerified', 'licenseNumber']
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  },
  {
    name: 'Florida Insurance Regulations',
    description: 'Florida Office of Insurance Regulation requirements',
    domain: 'Insurance',
    jurisdiction: 'FL',
    riskLevel: 'High',
    status: 'Active',
    requirements: [
      {
        name: 'License Verification',
        description: 'All agents must have valid Florida insurance licenses',
        validationRule: JSON.stringify({
          type: 'schema',
          required: ['licenseVerified', 'licenseNumber']
        }),
        enforcementLevel: 'Mandatory',
      },
      {
        name: 'Unfair Trade Practices',
        description: 'Compliance with Florida unfair trade practices regulations',
        validationRule: JSON.stringify({
          type: 'function',
          function: 'checkUnfairTradePractices'
        }),
        enforcementLevel: 'Mandatory',
      }
    ]
  }
];

// Regulatory requirements for tracking implementation status
const REGULATORY_REQUIREMENTS = [
  // GDPR Requirements
  {
    domain: 'GDPR',
    jurisdiction: 'EU',
    requirement: 'Lawful basis for processing personal data',
    description: 'Establish and document lawful basis for all personal data processing activities',
    status: 'Completed',
    implementationDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'Implemented consent management system and data processing records'
  },
  {
    domain: 'GDPR',
    jurisdiction: 'EU',
    requirement: 'Data Protection Impact Assessments (DPIA)',
    description: 'Conduct DPIA for high-risk processing activities',
    status: 'InProgress',
    lastVerified: new Date('2024-11-15'),
    verificationNotes: 'DPIA process documented, need to complete assessments for legacy systems'
  },
  {
    domain: 'GDPR',
    jurisdiction: 'EU',
    requirement: 'Data Protection Officer (DPO) appointment',
    description: 'Appoint a Data Protection Officer if required',
    status: 'Completed',
    implementationDate: new Date('2024-02-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'DPO appointed and registered with supervisory authority'
  },

  // HIPAA Requirements
  {
    domain: 'HIPAA',
    jurisdiction: 'US',
    requirement: 'Administrative Safeguards',
    description: 'Implement administrative safeguards for PHI protection',
    status: 'Completed',
    implementationDate: new Date('2024-01-15'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'Security policies and procedures implemented and staff trained'
  },
  {
    domain: 'HIPAA',
    jurisdiction: 'US',
    requirement: 'Physical Safeguards',
    description: 'Implement physical safeguards for PHI protection',
    status: 'Completed',
    implementationDate: new Date('2024-01-15'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'Facility access controls and workstation security measures in place'
  },
  {
    domain: 'HIPAA',
    jurisdiction: 'US',
    requirement: 'Technical Safeguards',
    description: 'Implement technical safeguards for PHI protection',
    status: 'InProgress',
    lastVerified: new Date('2024-11-20'),
    verificationNotes: 'Encryption implemented, working on audit controls enhancement'
  },

  // CCPA Requirements
  {
    domain: 'CCPA',
    jurisdiction: 'CA',
    requirement: 'Consumer Rights Implementation',
    description: 'Implement mechanisms for consumers to exercise their CCPA rights',
    status: 'Completed',
    implementationDate: new Date('2024-03-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'Consumer request portal implemented and tested'
  },
  {
    domain: 'CCPA',
    jurisdiction: 'CA',
    requirement: 'Data Inventory and Mapping',
    description: 'Maintain comprehensive inventory of personal information',
    status: 'Completed',
    implementationDate: new Date('2024-02-15'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'Data mapping completed and maintained quarterly'
  },

  // Insurance Requirements by State
  {
    domain: 'Insurance',
    jurisdiction: 'CA',
    requirement: 'California Insurance Code Section 1661',
    description: 'License renewal and continuing education requirements',
    status: 'Completed',
    implementationDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'License tracking system implemented and CE monitoring active'
  },
  {
    domain: 'Insurance',
    jurisdiction: 'NY',
    requirement: 'New York Insurance Law Article 21',
    description: 'Licensing and conduct regulations for insurance agents',
    status: 'Completed',
    implementationDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'NY license verification and compliance monitoring implemented'
  },
  {
    domain: 'Insurance',
    jurisdiction: 'TX',
    requirement: 'Texas Insurance Code Title 11',
    description: 'General regulation of insurance companies and agents',
    status: 'Completed',
    implementationDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'TX compliance procedures documented and implemented'
  },
  {
    domain: 'Insurance',
    jurisdiction: 'FL',
    requirement: 'Florida Insurance Code Chapter 626',
    description: 'Insurance Field Representatives and Operations',
    status: 'Completed',
    implementationDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-12-01'),
    verificationNotes: 'FL license and E&O insurance verification active'
  }
];

async function seedCompliancePolicies() {
  const prisma = new PrismaClient();

  try {
    logger.info('Starting compliance policy seed data creation');

    // Check if policies already exist
    const existingPolicies = await prisma.compliancePolicy.count();
    if (existingPolicies > 0) {
      logger.info(`Found ${existingPolicies} existing policies. Skipping policy seeding.`);
      return;
    }

    // Create compliance policies
    for (const policyData of COMPLIANCE_POLICIES) {
      const { requirements, ...policy } = policyData;
      
      await prisma.compliancePolicy.create({
        data: {
          ...policy,
          requirements: {
            create: requirements,
          },
        },
      });

      logger.info(`Created policy: ${policy.name}`);
    }

    // Create regulatory requirements
    for (const requirementData of REGULATORY_REQUIREMENTS) {
      await prisma.regulatoryRequirement.create({
        data: requirementData,
      });

      logger.info(`Created requirement: ${requirementData.requirement}`);
    }

    // Initialize compliance status records
    const domains = ['GDPR', 'HIPAA', 'CCPA', 'GLBA', 'Insurance'];
    const now = new Date();
    const nextAssessment = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    for (const domain of domains) {
      await prisma.complianceStatus.create({
        data: {
          domain,
          jurisdiction: null, // Overall domain status
          totalPolicies: COMPLIANCE_POLICIES.filter(p => p.domain === domain).length,
          activePolicies: COMPLIANCE_POLICIES.filter(p => p.domain === domain && p.status === 'Active').length,
          openViolations: 0,
          resolvedViolations: 0,
          complianceScore: 100.0, // Start with perfect score
          lastAssessment: now,
          nextAssessment,
        },
      });

      logger.info(`Created compliance status for domain: ${domain}`);
    }

    logger.info('Compliance seed data creation completed successfully');

  } catch (error) {
    logger.error('Error creating compliance seed data', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seed function
if (require.main === module) {
  seedCompliancePolicies()
    .then(() => {
      logger.info('Seed data creation completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed data creation failed', { error });
      process.exit(1);
    });
}

export { seedCompliancePolicies, COMPLIANCE_POLICIES, REGULATORY_REQUIREMENTS };