import { PrismaClient } from '@prisma/client';
import {
  ComplianceViolation,
  ComplianceStatus,
  IComplianceMonitoringService,
} from '@types/compliance';
import { logger } from '@insurance-lead-gen/core';

export class ComplianceMonitoringService implements IComplianceMonitoringService {
  private prisma: PrismaClient;
  private alertThresholds: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeThresholds();
    this.startPeriodicMonitoring();
  }

  /**
   * Scan leads for compliance violations
   */
  async scanLeadsForViolations(): Promise<ComplianceViolation[]> {
    try {
      logger.info('Starting lead compliance scan');

      const activePolicies = await this.prisma.compliancePolicy.findMany({
        where: { status: 'Active' },
        include: { requirements: true },
      });

      if (activePolicies.length === 0) {
        logger.info('No active policies found, skipping lead scan');
        return [];
      }

      const leads = await this.prisma.lead.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      const violations: ComplianceViolation[] = [];

      for (const lead of leads) {
        const leadViolations = await this.scanLeadForViolations(lead, activePolicies);
        violations.push(...leadViolations);
      }

      // Store violations in database
      for (const violation of violations) {
        await this.createViolationRecord(violation);
      }

      // Generate alerts for critical violations
      const criticalViolations = violations.filter(v => v.severity === 'Critical');
      for (const violation of criticalViolations) {
        await this.alertOnViolation(violation);
      }

      logger.info(`Lead compliance scan completed. Found ${violations.length} violations.`);
      return violations;
    } catch (error) {
      logger.error('Error scanning leads for violations', { error });
      throw new Error(`Lead scan failed: ${error.message}`);
    }
  }

  /**
   * Monitor specific policy compliance
   */
  async monitorPolicyCompliance(policyId: string): Promise<ComplianceStatus> {
    try {
      const policy = await this.prisma.compliancePolicy.findUnique({
        where: { id: policyId },
        include: {
          requirements: true,
          violations: true,
        },
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      // Calculate compliance metrics
      const totalViolations = policy.violations.length;
      const openViolations = policy.violations.filter(v => v.status === 'Open').length;
      const resolvedViolations = policy.violations.filter(v => v.status === 'Resolved').length;

      // Calculate compliance score
      const complianceScore = this.calculatePolicyComplianceScore(policy);

      // Update status record
      const status = await this.prisma.complianceStatus.upsert({
        where: {
          domain_jurisdiction: {
            domain: policy.domain,
            jurisdiction: policy.jurisdiction || null,
          },
        },
        update: {
          totalPolicies: 1,
          activePolicies: policy.status === 'Active' ? 1 : 0,
          openViolations,
          resolvedViolations,
          complianceScore,
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          updatedAt: new Date(),
        },
        create: {
          domain: policy.domain,
          jurisdiction: policy.jurisdiction || null,
          totalPolicies: 1,
          activePolicies: policy.status === 'Active' ? 1 : 0,
          openViolations,
          resolvedViolations,
          complianceScore,
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      logger.info('Policy compliance monitored', { policyId, complianceScore, openViolations });
      return status;
    } catch (error) {
      logger.error('Error monitoring policy compliance', { error, policyId });
      throw new Error(`Policy monitoring failed: ${error.message}`);
    }
  }

  /**
   * Detect compliance anomalies using pattern analysis
   */
  async detectAnomalies(): Promise<any[]> {
    try {
      const anomalies: any[] = [];

      // Check for violation spikes
      const violationSpike = await this.detectViolationSpikes();
      if (violationSpike) {
        anomalies.push(violationSpike);
      }

      // Check for unusual user activity
      const userActivityAnomalies = await this.detectUserActivityAnomalies();
      anomalies.push(...userActivityAnomalies);

      // Check for policy effectiveness
      const policyAnomalies = await this.detectPolicyAnomalies();
      anomalies.push(...policyAnomalies);

      // Check for data access anomalies
      const accessAnomalies = await this.detectAccessAnomalies();
      anomalies.push(...accessAnomalies);

      if (anomalies.length > 0) {
        logger.warn('Compliance anomalies detected', { count: anomalies.length });
      }

      return anomalies;
    } catch (error) {
      logger.error('Error detecting anomalies', { error });
      throw new Error(`Anomaly detection failed: ${error.message}`);
    }
  }

  /**
   * Generate alerts for critical violations
   */
  async alertOnViolation(violation: ComplianceViolation): Promise<void> {
    try {
      // Determine alert severity
      const alertSeverity = this.mapViolationSeverityToAlert(violation.severity);

      // Create alert record
      const alertData = {
        type: 'COMPLIANCE_VIOLATION',
        severity: alertSeverity,
        title: `Compliance Violation: ${violation.violationType}`,
        message: violation.description,
        entityId: violation.id,
        entityType: 'ComplianceViolation',
        metadata: {
          policyId: violation.policyId,
          leadId: violation.leadId,
          agentId: violation.agentId,
          violationType: violation.violationType,
          detectedAt: violation.detectedAt,
        },
        createdAt: new Date(),
      };

      // In production, this would integrate with your alerting system
      // (PagerDuty, Slack, email, etc.)
      logger.error('Compliance violation alert', alertData);

      // Send to external alerting system if configured
      if (process.env.ALERT_WEBHOOK_URL) {
        await this.sendToExternalAlerting(alertData);
      }

      // Update monitoring thresholds based on this violation
      this.updateThresholdsFromViolation(violation);

      logger.info('Compliance violation alert generated', { 
        violationId: violation.id, 
        severity: alertSeverity 
      });
    } catch (error) {
      logger.error('Error generating violation alert', { error, violation });
    }
  }

  /**
   * Generate compliance trends analysis
   */
  async generateComplianceTrends(): Promise<any[]> {
    try {
      const trends: any[] = [];

      // Get data for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Violation trends
      const violationTrends = await this.getViolationTrends(thirtyDaysAgo, now);
      trends.push({
        type: 'violation_trends',
        period: { from: thirtyDaysAgo, to: now },
        data: violationTrends,
      });

      // Policy compliance trends
      const complianceTrends = await this.getComplianceTrends(thirtyDaysAgo, now);
      trends.push({
        type: 'compliance_trends',
        period: { from: thirtyDaysAgo, to: now },
        data: complianceTrends,
      });

      // Audit activity trends
      const auditTrends = await this.getAuditTrends(thirtyDaysAgo, now);
      trends.push({
        type: 'audit_trends',
        period: { from: thirtyDaysAgo, to: now },
        data: auditTrends,
      });

      // Domain-specific trends
      const domainTrends = await this.getDomainTrends(thirtyDaysAgo, now);
      trends.push({
        type: 'domain_trends',
        period: { from: thirtyDaysAgo, to: now },
        data: domainTrends,
      });

      logger.info('Compliance trends generated', { trendCount: trends.length });
      return trends;
    } catch (error) {
      logger.error('Error generating compliance trends', { error });
      throw new Error(`Trends generation failed: ${error.message}`);
    }
  }

  /**
   * Initialize alert thresholds
   */
  private initializeThresholds(): void {
    this.alertThresholds.set('critical_violations_per_hour', 5);
    this.alertThresholds.set('high_violations_per_hour', 10);
    this.alertThresholds.set('compliance_score_minimum', 80);
    this.alertThresholds.set('unusual_activity_threshold', 50);
  }

  /**
   * Start periodic monitoring
   */
  private startPeriodicMonitoring(): void {
    // Run every hour
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runPeriodicChecks();
      } catch (error) {
        logger.error('Error in periodic compliance monitoring', { error });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Run periodic compliance checks
   */
  private async runPeriodicChecks(): Promise<void> {
    logger.info('Running periodic compliance checks');

    // Scan for violations
    await this.scanLeadsForViolations();

    // Detect anomalies
    const anomalies = await this.detectAnomalies();
    if (anomalies.length > 0) {
      logger.warn('Anomalies detected in periodic check', { count: anomalies.length });
    }

    // Update compliance scores
    await this.updateAllComplianceScores();

    logger.info('Periodic compliance checks completed');
  }

  /**
   * Scan a single lead for violations
   */
  private async scanLeadForViolations(lead: any, policies: any[]): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    for (const policy of policies) {
      for (const requirement of policy.requirements) {
        const violation = await this.checkRequirementViolation(lead, requirement, policy);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    return violations;
  }

  /**
   * Check if a requirement is violated
   */
  private async checkRequirementViolation(lead: any, requirement: any, policy: any): Promise<ComplianceViolation | null> {
    try {
      // Apply domain-specific checks
      let isViolated = false;
      let violationType = '';
      let description = '';

      switch (policy.domain) {
        case 'GDPR':
          ({ isViolated, violationType, description } = this.checkGDPRViolation(lead, requirement));
          break;
        case 'HIPAA':
          ({ isViolated, violationType, description } = this.checkHIPAAViolation(lead, requirement));
          break;
        case 'CCPA':
          ({ isViolated, violationType, description } = this.checkCCPAViolation(lead, requirement));
          break;
        case 'Insurance':
          ({ isViolated, violationType, description } = this.checkInsuranceViolation(lead, requirement));
          break;
        default:
          ({ isViolated, violationType, description } = this.checkGenericViolation(lead, requirement));
      }

      if (isViolated) {
        return {
          id: '', // Will be generated by database
          policyId: policy.id,
          leadId: lead.id,
          violationType,
          severity: this.determineSeverity(requirement, policy),
          status: 'Open',
          description,
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking requirement violation', { error, leadId: lead.id, requirementId: requirement.id });
      return null;
    }
  }

  /**
   * Check GDPR-specific violations
   */
  private checkGDPRViolation(lead: any, requirement: any): { isViolated: boolean; violationType: string; description: string } {
    switch (requirement.name) {
      case 'Consent Required':
        if (!lead.consentGiven && !lead.consentDate) {
          return {
            isViolated: true,
            violationType: 'Missing Consent',
            description: 'GDPR consent not obtained for lead data processing',
          };
        }
        break;
      case 'Data Retention':
        if (lead.retentionExpiry && new Date(lead.retentionExpiry) < new Date()) {
          return {
            isViolated: true,
            violationType: 'Retention Expired',
            description: 'Lead data retention period has expired under GDPR',
          };
        }
        break;
      case 'Right to Erasure':
        if (lead.erasureRequested && !lead.erasureCompleted) {
          return {
            isViolated: true,
            violationType: 'Erasure Not Fulfilled',
            description: 'GDPR right to erasure not fulfilled within required timeframe',
          };
        }
        break;
    }

    return { isViolated: false, violationType: '', description: '' };
  }

  /**
   * Check HIPAA-specific violations
   */
  private checkHIPAAViolation(lead: any, requirement: any): { isViolated: boolean; violationType: string; description: string } {
    // For insurance leads, check if they contain health information
    if (lead.insuranceType === 'HEALTH' || lead.healthData) {
      switch (requirement.name) {
        case 'PHI Encryption':
          if (!lead.encrypted) {
            return {
              isViolated: true,
              violationType: 'PHI Not Encrypted',
              description: 'Health information (PHI) not encrypted',
            };
          }
          break;
        case 'Access Controls':
          if (!lead.accessControls) {
            return {
              isViolated: true,
              violationType: 'Missing Access Controls',
              description: 'HIPAA access controls not implemented for health data',
            };
          }
          break;
      }
    }

    return { isViolated: false, violationType: '', description: '' };
  }

  /**
   * Check CCPA-specific violations
   */
  private checkCCPAViolation(lead: any, requirement: any): { isViolated: boolean; violationType: string; description: string } {
    // Check if lead is from California
    const isCaliforniaResident = lead.state === 'CA' || lead.address?.state === 'CA';

    if (isCaliforniaResident) {
      switch (requirement.name) {
        case 'Opt-Out Mechanism':
          if (!lead.optOutAvailable) {
            return {
              isViolated: true,
              violationType: 'Missing Opt-Out',
              description: 'CCPA opt-out mechanism not provided for California resident',
            };
          }
          break;
        case 'Privacy Notice':
          if (!lead.privacyNoticeProvided) {
            return {
              isViolated: true,
              violationType: 'Missing Privacy Notice',
              description: 'CCPA privacy notice not provided at data collection',
            };
          }
          break;
      }
    }

    return { isViolated: false, violationType: '', description: '' };
  }

  /**
   * Check Insurance-specific violations
   */
  private checkInsuranceViolation(lead: any, requirement: any): { isViolated: boolean; violationType: string; description: string } {
    // This would check insurance-specific compliance requirements
    // For now, return no violations
    return { isViolated: false, violationType: '', description: '' };
  }

  /**
   * Check generic violations
   */
  private checkGenericViolation(lead: any, requirement: any): { isViolated: boolean; violationType: string; description: string } {
    // Basic validation - check if required fields are present
    const validationRule = JSON.parse(requirement.validationRule || '{}');
    
    if (validationRule.required) {
      const missingFields = validationRule.required.filter((field: string) => !lead[field]);
      if (missingFields.length > 0) {
        return {
          isViolated: true,
          violationType: 'Missing Required Fields',
          description: `Required fields missing: ${missingFields.join(', ')}`,
        };
      }
    }

    return { isViolated: false, violationType: '', description: '' };
  }

  /**
   * Determine violation severity
   */
  private determineSeverity(requirement: any, policy: any): string {
    // Critical violations for mandatory requirements in critical policies
    if (requirement.enforcementLevel === 'Mandatory' && policy.riskLevel === 'Critical') {
      return 'Critical';
    }
    
    // High for mandatory requirements
    if (requirement.enforcementLevel === 'Mandatory') {
      return 'High';
    }

    // Medium for recommended requirements in high-risk policies
    if (policy.riskLevel === 'High') {
      return 'Medium';
    }

    // Low for recommended requirements
    return 'Low';
  }

  /**
   * Create violation record in database
   */
  private async createViolationRecord(violation: ComplianceViolation): Promise<void> {
    try {
      await this.prisma.complianceViolation.create({
        data: {
          policyId: violation.policyId,
          leadId: violation.leadId,
          agentId: violation.agentId,
          violationType: violation.violationType,
          severity: violation.severity,
          status: violation.status,
          description: violation.description,
          detectedAt: violation.detectedAt,
          createdAt: violation.createdAt,
          updatedAt: violation.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error creating violation record', { error, violation });
    }
  }

  /**
   * Calculate policy compliance score
   */
  private calculatePolicyComplianceScore(policy: any): number {
    const totalViolations = policy.violations.length;
    const openViolations = policy.violations.filter((v: any) => v.status === 'Open').length;

    if (totalViolations === 0) return 100;

    const violationRate = openViolations / totalViolations;
    return Math.max(0, 100 - (violationRate * 100));
  }

  /**
   * Map violation severity to alert severity
   */
  private mapViolationSeverityToAlert(violationSeverity: string): string {
    switch (violationSeverity) {
      case 'Critical':
        return 'critical';
      case 'High':
        return 'high';
      case 'Medium':
        return 'medium';
      case 'Low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Send alert to external alerting system
   */
  private async sendToExternalAlerting(alertData: any): Promise<void> {
    try {
      // In production, implement integration with external alerting systems
      // like PagerDuty, Slack webhooks, email, etc.
      logger.info('Sending alert to external system', alertData);
    } catch (error) {
      logger.error('Error sending to external alerting', { error, alertData });
    }
  }

  /**
   * Update thresholds based on violation
   */
  private updateThresholdsFromViolation(violation: ComplianceViolation): void {
    // Dynamic threshold adjustment based on violation patterns
    // This is a simplified implementation
    const currentThreshold = this.alertThresholds.get('critical_violations_per_hour') || 5;
    
    // Could implement logic to temporarily lower thresholds during high violation periods
    // For now, just log the violation for monitoring
    logger.debug('Violation threshold check', { violationId: violation.id, currentThreshold });
  }

  // Additional helper methods for anomaly detection...

  /**
   * Detect violation spikes
   */
  private async detectViolationSpikes(): Promise<any | null> {
    // Implementation for detecting sudden increases in violations
    return null;
  }

  /**
   * Detect user activity anomalies
   */
  private async detectUserActivityAnomalies(): Promise<any[]> {
    // Implementation for detecting unusual user activity patterns
    return [];
  }

  /**
   * Detect policy anomalies
   */
  private async detectPolicyAnomalies(): Promise<any[]> {
    // Implementation for detecting policy effectiveness issues
    return [];
  }

  /**
   * Detect access anomalies
   */
  private async detectAccessAnomalies(): Promise<any[]> {
    // Implementation for detecting unusual data access patterns
    return [];
  }

  /**
   * Get violation trends
   */
  private async getViolationTrends(from: Date, to: Date): Promise<any> {
    // Implementation for violation trend analysis
    return {};
  }

  /**
   * Get compliance trends
   */
  private async getComplianceTrends(from: Date, to: Date): Promise<any> {
    // Implementation for compliance trend analysis
    return {};
  }

  /**
   * Get audit trends
   */
  private async getAuditTrends(from: Date, to: Date): Promise<any> {
    // Implementation for audit activity trend analysis
    return {};
  }

  /**
   * Get domain trends
   */
  private async getDomainTrends(from: Date, to: Date): Promise<any> {
    // Implementation for domain-specific trend analysis
    return {};
  }

  /**
   * Update all compliance scores
   */
  private async updateAllComplianceScores(): Promise<void> {
    const policies = await this.prisma.compliancePolicy.findMany({
      where: { status: 'Active' },
    });

    for (const policy of policies) {
      await this.monitorPolicyCompliance(policy.id);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    await this.prisma.$disconnect();
  }
}