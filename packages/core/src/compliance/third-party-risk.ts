// Third-party risk assessment and vendor compliance module
import {
  ComplianceDomain,
  ComplianceStatus,
  ComplianceSeverity,
  ThirdPartyVendor,
  EvidenceRecord,
  RemediationAction,
} from './types.js';
import { logger } from '../logger.js';

export class ThirdPartyRiskService {
  private vendors: Map<string, ThirdPartyVendor> = new Map();
  private riskAssessments: Map<string, any> = new Map();
  private contracts: Map<string, any> = new Map();
  private certifications: Map<string, any> = new Map();

  constructor() {
    this.initializeVendors();
    this.initializeContracts();
    this.initializeCertifications();
  }

  private initializeVendors(): void {
    const vendors: ThirdPartyVendor[] = [
      {
        id: 'VENDOR-001',
        name: 'CloudSecure Infrastructure',
        type: 'cloud',
        dataAccess: true,
        dataTypes: ['customer_data', 'financial_data', 'system_logs'],
        contractStatus: 'active',
        complianceCertifications: ['SOC2', 'ISO27001', 'PCI-DSS'],
        riskLevel: ComplianceSeverity.LOW,
        lastAssessmentDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        nextAssessmentDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000), // 275 days from now
        contactInfo: {
          name: 'John Smith',
          email: 'john.smith@cloudsecure.com',
          phone: '+1-555-0123',
        },
      },
      {
        id: 'VENDOR-002',
        name: 'PaymentGuard Pro',
        type: 'payment',
        dataAccess: true,
        dataTypes: ['financial_data', 'payment_information', 'customer_data'],
        contractStatus: 'active',
        complianceCertifications: ['PCI-DSS', 'SOC2'],
        riskLevel: ComplianceSeverity.MEDIUM,
        lastAssessmentDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        nextAssessmentDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000), // 245 days from now
        contactInfo: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@paymentguard.com',
          phone: '+1-555-0124',
        },
      },
      {
        id: 'VENDOR-003',
        name: 'Analytics Insights LLC',
        type: 'analytics',
        dataAccess: true,
        dataTypes: ['customer_data', 'behavioral_data', 'marketing_data'],
        contractStatus: 'active',
        complianceCertifications: ['SOC2', 'GDPR'],
        riskLevel: ComplianceSeverity.HIGH,
        lastAssessmentDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
        nextAssessmentDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000), // 185 days from now
        contactInfo: {
          name: 'Mike Chen',
          email: 'mike.chen@analyticsinsights.com',
          phone: '+1-555-0125',
        },
      },
      {
        id: 'VENDOR-004',
        name: 'DataBackup Solutions',
        type: 'processor',
        dataAccess: true,
        dataTypes: ['all_data_types'],
        contractStatus: 'pending',
        complianceCertifications: ['SOC2'],
        riskLevel: ComplianceSeverity.HIGH,
        lastAssessmentDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 365 days ago
        nextAssessmentDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        contactInfo: {
          name: 'Lisa Wang',
          email: 'lisa.wang@databackup.com',
          phone: '+1-555-0126',
        },
      },
      {
        id: 'VENDOR-005',
        name: 'Communication Services Inc',
        type: 'other',
        dataAccess: false,
        dataTypes: ['communication_logs'],
        contractStatus: 'active',
        complianceCertifications: [],
        riskLevel: ComplianceSeverity.MEDIUM,
        lastAssessmentDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
        nextAssessmentDate: new Date(Date.now() + 165 * 24 * 60 * 60 * 1000), // 165 days from now
        contactInfo: {
          name: 'David Brown',
          email: 'david.brown@commservices.com',
          phone: '+1-555-0127',
        },
      },
    ];

    for (const vendor of vendors) {
      this.vendors.set(vendor.id, vendor);
    }
  }

  private initializeContracts(): void {
    const contracts = [
      {
        vendorId: 'VENDOR-001',
        contractId: 'CONTRACT-001',
        type: 'service_agreement',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        dataProcessingAgreement: true,
        businessAssociateAgreement: true,
        liability: 1000000, // $1M
        insurance: {
          cyber: 5000000, // $5M
          professional: 2000000, // $2M
        },
        compliance: {
          auditRights: true,
          terminationClause: true,
          dataDeletionClause: true,
          breachNotificationClause: true,
        },
        status: 'active',
      },
      {
        vendorId: 'VENDOR-002',
        contractId: 'CONTRACT-002',
        type: 'payment_processing',
        startDate: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 135 * 24 * 60 * 60 * 1000),
        dataProcessingAgreement: true,
        businessAssociateAgreement: false,
        liability: 5000000, // $5M
        insurance: {
          cyber: 10000000, // $10M
          professional: 5000000, // $5M
        },
        compliance: {
          auditRights: true,
          terminationClause: true,
          dataDeletionClause: true,
          breachNotificationClause: true,
        },
        status: 'active',
      },
      {
        vendorId: 'VENDOR-003',
        contractId: 'CONTRACT-003',
        type: 'analytics_services',
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
        dataProcessingAgreement: true,
        businessAssociateAgreement: false,
        liability: 500000, // $500K
        insurance: {
          cyber: 2000000, // $2M
          professional: 1000000, // $1M
        },
        compliance: {
          auditRights: false,
          terminationClause: true,
          dataDeletionClause: true,
          breachNotificationClause: true,
        },
        status: 'active',
      },
    ];

    for (const contract of contracts) {
      this.contracts.set(contract.contractId, contract);
    }
  }

  private initializeCertifications(): void {
    const certifications = [
      {
        vendorId: 'VENDOR-001',
        certification: 'SOC2 Type II',
        issuer: 'AICPA',
        validFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
        scope: 'Security, Availability, Confidentiality',
        verified: true,
      },
      {
        vendorId: 'VENDOR-001',
        certification: 'ISO 27001',
        issuer: 'ISO',
        validFrom: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
        scope: 'Information Security Management',
        verified: true,
      },
      {
        vendorId: 'VENDOR-002',
        certification: 'PCI DSS Level 1',
        issuer: 'PCI Security Standards Council',
        validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
        scope: 'Payment Card Industry Data Security',
        verified: true,
      },
      {
        vendorId: 'VENDOR-003',
        certification: 'GDPR Compliance',
        issuer: 'EU Data Protection Authority',
        validFrom: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000),
        scope: 'General Data Protection Regulation',
        verified: false, // Self-certified
      },
    ];

    for (const cert of certifications) {
      const key = `${cert.vendorId}-${cert.certification}`;
      this.certifications.set(key, cert);
    }
  }

  async assessVendorRisk(vendorId: string): Promise<{
    vendor: ThirdPartyVendor;
    riskScore: number;
    riskLevel: ComplianceSeverity;
    factors: any[];
    mitigations: any[];
    recommendations: string[];
    nextAssessment: Date;
  }> {
    logger.info('Assessing vendor risk', { vendorId });

    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    const riskFactors: any[] = [];
    let riskScore = 0;

    // Assess data access risk
    if (vendor.dataAccess) {
      riskFactors.push({
        factor: 'Data Access',
        impact: 'high',
        score: 30,
        description: 'Vendor has access to sensitive data',
      });
      riskScore += 30;
    }

    // Assess contract status risk
    if (vendor.contractStatus === 'pending') {
      riskFactors.push({
        factor: 'Contract Status',
        impact: 'medium',
        score: 20,
        description: 'Contract is pending renewal',
      });
      riskScore += 20;
    } else if (vendor.contractStatus === 'expired') {
      riskFactors.push({
        factor: 'Contract Status',
        impact: 'critical',
        score: 50,
        description: 'Contract has expired',
      });
      riskScore += 50;
    }

    // Assess certification risk
    if (vendor.complianceCertifications.length === 0) {
      riskFactors.push({
        factor: 'Compliance Certifications',
        impact: 'medium',
        score: 15,
        description: 'No compliance certifications',
      });
      riskScore += 15;
    } else {
      // Check certification validity
      for (const cert of vendor.complianceCertifications) {
        const certKey = `${vendorId}-${cert}`;
        const certification = this.certifications.get(certKey);
        
        if (!certification || !certification.verified) {
          riskFactors.push({
            factor: 'Certification Validity',
            impact: 'medium',
            score: 10,
            description: `Certification ${cert} is not verified`,
          });
          riskScore += 10;
        } else if (certification.validTo < new Date()) {
          riskFactors.push({
            factor: 'Certification Expiry',
            impact: 'high',
            score: 25,
            description: `Certification ${cert} has expired`,
          });
          riskScore += 25;
        }
      }
    }

    // Assess assessment recency
    if (vendor.lastAssessmentDate) {
      const daysSinceAssessment = (Date.now() - vendor.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAssessment > 365) {
        riskFactors.push({
          factor: 'Assessment Recency',
          impact: 'medium',
          score: 15,
          description: 'Last assessment was more than 1 year ago',
        });
        riskScore += 15;
      }
    }

    // Assess data types risk
    const sensitiveDataTypes = ['financial_data', 'health_data', 'ssn', 'payment_information'];
    const hasSensitiveData = vendor.dataTypes.some(dt => sensitiveDataTypes.includes(dt));
    if (hasSensitiveData) {
      riskFactors.push({
        factor: 'Sensitive Data Types',
        impact: 'high',
        score: 20,
        description: 'Vendor processes sensitive data types',
      });
      riskScore += 20;
    }

    // Determine overall risk level
    let riskLevel: ComplianceSeverity;
    if (riskScore >= 70) {
      riskLevel = ComplianceSeverity.CRITICAL;
    } else if (riskScore >= 50) {
      riskLevel = ComplianceSeverity.HIGH;
    } else if (riskScore >= 30) {
      riskLevel = ComplianceSeverity.MEDIUM;
    } else {
      riskLevel = ComplianceSeverity.LOW;
    }

    // Generate mitigations
    const mitigations: any[] = [];
    
    if (vendor.contractStatus === 'pending' || vendor.contractStatus === 'expired') {
      mitigations.push({
        mitigation: 'Renew Vendor Contract',
        priority: ComplianceSeverity.HIGH,
        timeline: '30 days',
        owner: 'Procurement Team',
      });
    }

    if (vendor.complianceCertifications.length === 0) {
      mitigations.push({
        mitigation: 'Require Compliance Certifications',
        priority: ComplianceSeverity.MEDIUM,
        timeline: '60 days',
        owner: 'Compliance Team',
      });
    }

    if (hasSensitiveData) {
      mitigations.push({
        mitigation: 'Enhanced Data Protection Controls',
        priority: ComplianceSeverity.HIGH,
        timeline: '45 days',
        owner: 'Security Team',
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (riskLevel === ComplianceSeverity.CRITICAL || riskLevel === ComplianceSeverity.HIGH) {
      recommendations.push(`Conduct immediate risk assessment for ${vendor.name}`);
      recommendations.push(`Review and strengthen contract terms with ${vendor.name}`);
      recommendations.push(`Implement additional monitoring for ${vendor.name}`);
    }

    if (vendor.nextAssessmentDate && vendor.nextAssessmentDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      recommendations.push(`Schedule assessment for ${vendor.name} within 30 days`);
    }

    if (riskLevel === ComplianceSeverity.LOW) {
      recommendations.push(`Continue annual assessments for ${vendor.name}`);
    }

    return {
      vendor,
      riskScore,
      riskLevel,
      factors: riskFactors,
      mitigations,
      recommendations,
      nextAssessment: vendor.nextAssessmentDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  async performComprehensiveVendorAssessment(): Promise<{
    overallRisk: ComplianceSeverity;
    totalVendors: number;
    riskBreakdown: any;
    highRiskVendors: string[];
    recommendations: string[];
    actionItems: RemediationAction[];
  }> {
    logger.info('Performing comprehensive vendor assessment');

    const vendorAssessments: any[] = [];
    const highRiskVendors: string[] = [];
    const actionItems: RemediationAction[] = [];

    for (const vendor of this.vendors.values()) {
      const assessment = await this.assessVendorRisk(vendor.id);
      vendorAssessments.push(assessment);

      if (assessment.riskLevel === ComplianceSeverity.HIGH || assessment.riskLevel === ComplianceSeverity.CRITICAL) {
        highRiskVendors.push(vendor.name);
      }

      // Create action items for mitigations
      for (const mitigation of assessment.mitigations) {
        actionItems.push({
          id: `action-${vendor.id}-${mitigation.mitigation.replace(/\s+/g, '-').toLowerCase()}`,
          title: mitigation.mitigation,
          description: `Implement ${mitigation.mitigation} for ${vendor.name}`,
          owner: mitigation.owner,
          priority: mitigation.priority,
          status: 'pending',
          dueDate: new Date(Date.now() + parseInt(mitigation.timeline.split(' ')[0]) * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Calculate overall risk
    const riskScores = vendorAssessments.map(a => a.riskScore);
    const averageRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;

    let overallRisk: ComplianceSeverity;
    if (averageRiskScore >= 70) {
      overallRisk = ComplianceSeverity.CRITICAL;
    } else if (averageRiskScore >= 50) {
      overallRisk = ComplianceSeverity.HIGH;
    } else if (averageRiskScore >= 30) {
      overallRisk = ComplianceSeverity.MEDIUM;
    } else {
      overallRisk = ComplianceSeverity.LOW;
    }

    // Calculate risk breakdown
    const riskBreakdown = {
      critical: vendorAssessments.filter(a => a.riskLevel === ComplianceSeverity.CRITICAL).length,
      high: vendorAssessments.filter(a => a.riskLevel === ComplianceSeverity.HIGH).length,
      medium: vendorAssessments.filter(a => a.riskLevel === ComplianceSeverity.MEDIUM).length,
      low: vendorAssessments.filter(a => a.riskLevel === ComplianceSeverity.LOW).length,
    };

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (highRiskVendors.length > 0) {
      recommendations.push(`Immediate attention required for ${highRiskVendors.length} high-risk vendors`);
      recommendations.push('Review and strengthen vendor risk management program');
      recommendations.push('Implement enhanced monitoring for high-risk vendors');
    }

    recommendations.push('Conduct quarterly vendor risk assessments');
    recommendations.push('Establish vendor risk committee for oversight');
    recommendations.push('Implement automated vendor risk monitoring');

    return {
      overallRisk,
      totalVendors: this.vendors.size,
      riskBreakdown,
      highRiskVendors,
      recommendations,
      actionItems,
    };
  }

  async validateContractCompliance(): Promise<{
    compliant: boolean;
    contractStats: any;
    issues: any[];
    recommendations: string[];
  }> {
    logger.info('Validating contract compliance');

    const contracts = Array.from(this.contracts.values());
    const issues: any[] = [];

    for (const contract of contracts) {
      // Check for required clauses
      if (!contract.compliance.auditRights) {
        issues.push({
          contractId: contract.contractId,
          vendorId: contract.vendorId,
          issue: 'Missing audit rights clause',
          severity: ComplianceSeverity.HIGH,
          impact: 'Cannot verify vendor compliance',
        });
      }

      if (!contract.compliance.dataDeletionClause) {
        issues.push({
          contractId: contract.contractId,
          vendorId: contract.vendorId,
          issue: 'Missing data deletion clause',
          severity: ComplianceSeverity.MEDIUM,
          impact: 'Cannot ensure data deletion upon termination',
        });
      }

      if (!contract.compliance.breachNotificationClause) {
        issues.push({
          contractId: contract.contractId,
          vendorId: contract.vendorId,
          issue: 'Missing breach notification clause',
          severity: ComplianceSeverity.HIGH,
          impact: 'May not receive timely breach notifications',
        });
      }

      // Check contract expiration
      if (contract.endDate < new Date()) {
        issues.push({
          contractId: contract.contractId,
          vendorId: contract.vendorId,
          issue: 'Contract has expired',
          severity: ComplianceSeverity.CRITICAL,
          impact: 'Legal exposure and compliance violations',
        });
      }

      // Check insurance requirements
      const vendor = this.vendors.get(contract.vendorId);
      if (vendor && vendor.riskLevel === ComplianceSeverity.HIGH) {
        if (!contract.insurance.cyber || contract.insurance.cyber < 5000000) {
          issues.push({
            contractId: contract.contractId,
            vendorId: contract.vendorId,
            issue: 'Insufficient cyber insurance coverage',
            severity: ComplianceSeverity.HIGH,
            impact: 'Inadequate protection against cyber incidents',
          });
        }
      }
    }

    const compliantContracts = contracts.filter(c => {
      return !issues.some(i => i.contractId === c.contractId && i.severity === ComplianceSeverity.CRITICAL);
    }).length;

    const compliant = compliantContracts === contracts.length;

    const contractStats = {
      total: contracts.length,
      compliant: compliantContracts,
      nonCompliant: contracts.length - compliantContracts,
      criticalIssues: issues.filter(i => i.severity === ComplianceSeverity.CRITICAL).length,
      highIssues: issues.filter(i => i.severity === ComplianceSeverity.HIGH).length,
      mediumIssues: issues.filter(i => i.severity === ComplianceSeverity.MEDIUM).length,
    };

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Address all critical contract compliance issues immediately');
      recommendations.push('Review and update contract templates');
      recommendations.push('Implement contract compliance monitoring');
    } else {
      recommendations.push('Continue regular contract compliance reviews');
      recommendations.push('Maintain current contract standards');
    }

    return {
      compliant,
      contractStats,
      issues,
      recommendations,
    };
  }

  async generateThirdPartyRiskReport(): Promise<{
    summary: any;
    vendorAssessments: any[];
    contractCompliance: any;
    riskMatrix: any[];
    recommendations: string[];
  }> {
    const [comprehensiveAssessment, contractCompliance] = await Promise.all([
      this.performComprehensiveVendorAssessment(),
      this.validateContractCompliance(),
    ]);

    // Generate risk matrix
    const riskMatrix: any[] = [];
    for (const vendor of this.vendors.values()) {
      const assessment = await this.assessVendorRisk(vendor.id);
      riskMatrix.push({
        vendor: vendor.name,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        dataAccess: vendor.dataAccess,
        contractStatus: vendor.contractStatus,
        lastAssessment: vendor.lastAssessmentDate,
        nextAssessment: vendor.nextAssessmentDate,
      });
    }

    // Sort by risk score (highest first)
    riskMatrix.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      overallRisk: comprehensiveAssessment.overallRisk,
      totalVendors: comprehensiveAssessment.totalVendors,
      highRiskVendors: comprehensiveAssessment.highRiskVendors.length,
      contractCompliant: contractCompliance.compliant,
      totalContracts: Array.from(this.contracts.values()).length,
      criticalIssues: contractCompliance.contractStats.criticalIssues,
      recommendations: comprehensiveAssessment.recommendations.length,
    };

    return {
      summary,
      vendorAssessments: riskMatrix,
      contractCompliance,
      riskMatrix,
      recommendations: comprehensiveAssessment.recommendations,
    };
  }

  // Utility methods
  getVendor(vendorId: string): ThirdPartyVendor | undefined {
    return this.vendors.get(vendorId);
  }

  getAllVendors(): ThirdPartyVendor[] {
    return Array.from(this.vendors.values());
  }

  updateVendor(vendorId: string, updates: Partial<ThirdPartyVendor>): void {
    const vendor = this.vendors.get(vendorId);
    if (vendor) {
      Object.assign(vendor, updates);
    }
  }

  addVendor(vendor: ThirdPartyVendor): void {
    this.vendors.set(vendor.id, vendor);
  }

  getContract(contractId: string): any {
    return this.contracts.get(contractId);
  }

  getVendorContracts(vendorId: string): any[] {
    return Array.from(this.contracts.values()).filter(c => c.vendorId === vendorId);
  }
}

export const thirdPartyRiskService = new ThirdPartyRiskService();