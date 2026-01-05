import { PrismaClient } from '@prisma/client';
import {
  CompliancePolicy,
  ComplianceViolation,
  ComplianceStatus,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  ComplianceReportRequest,
  ComplianceReport,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
  ValidationResult,
  ComplianceDomain,
  ComplianceViolationFilter,
  ComplianceAuditLogFilter,
  IComplianceService,
} from '@types/compliance';

import { CompliancePolicyEngine } from './compliance-policy.engine';
import { AuditTrailService } from './audit-trail.service';
import { ComplianceMonitoringService } from './compliance-monitoring.service';
import { logger } from '@insurance-lead-gen/core';

export class ComplianceService implements IComplianceService {
  private prisma: PrismaClient;
  private policyEngine: CompliancePolicyEngine;
  private auditService: AuditTrailService;
  private monitoringService: ComplianceMonitoringService;

  constructor() {
    this.prisma = new PrismaClient();
    this.policyEngine = new CompliancePolicyEngine();
    this.auditService = new AuditTrailService();
    this.monitoringService = new ComplianceMonitoringService();
  }

  /**
   * Validate lead data against all active compliance policies
   */
  async validateLeadCompliance(leadData: any): Promise<ValidationResult> {
    try {
      const activePolicies = await this.getActivePolicies();
      const context: PolicyEvaluationContext = {
        entityId: leadData.id || 'unknown',
        entityType: 'Lead',
        data: leadData,
        userId: leadData.userId || 'system',
        jurisdiction: this.determineJurisdiction(leadData),
        timestamp: new Date(),
      };

      const validationResults = await this.policyEngine.evaluatePolicies(activePolicies, context);
      
      const errors: any[] = [];
      const warnings: any[] = [];

      validationResults.forEach(result => {
        if (!result.isCompliant) {
          result.violations.forEach(violation => {
            errors.push({
              field: 'compliance',
              message: `Policy "${result.policyName}" violation: ${violation}`,
              code: 'COMPLIANCE_VIOLATION',
            });
          });
        }

        result.warnings.forEach(warning => {
          warnings.push({
            field: 'compliance',
            message: `Policy "${result.policyName}" warning: ${warning}`,
            suggestion: 'Review compliance requirements',
          });
        });
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Error validating lead compliance', { error, leadData });
      throw new Error(`Compliance validation failed: ${error.message}`);
    }
  }

  /**
   * Register a new compliance policy
   */
  async registerPolicy(policyConfig: CreatePolicyRequest): Promise<CompliancePolicy> {
    try {
      // Validate policy configuration
      const validation = await this.policyEngine.validateData(policyConfig, '');
      if (!validation.isValid) {
        throw new Error(`Invalid policy configuration: ${JSON.stringify(validation.errors)}`);
      }

      // Create policy with requirements
      const policy = await this.prisma.compliancePolicy.create({
        data: {
          name: policyConfig.name,
          description: policyConfig.description,
          domain: policyConfig.domain,
          jurisdiction: policyConfig.jurisdiction,
          riskLevel: policyConfig.riskLevel,
          status: policyConfig.status || 'Active',
          requirements: {
            create: policyConfig.requirements.map(req => ({
              name: req.name,
              description: req.description,
              validationRule: req.validationRule,
              enforcementLevel: req.enforcementLevel,
            })),
          },
        },
        include: {
          requirements: true,
        },
      });

      // Log policy creation
      await this.auditService.logAction(
        'system',
        'PolicyCreated',
        'CompliancePolicy',
        policy.id,
        { policyConfig },
        [policy.id]
      );

      // Update compliance status
      await this.updateComplianceStatus(policy.domain);

      logger.info('Compliance policy registered', { policyId: policy.id, domain: policy.domain });
      return policy;
    } catch (error) {
      logger.error('Error registering compliance policy', { error, policyConfig });
      throw new Error(`Policy registration failed: ${error.message}`);
    }
  }

  /**
   * Get policies by compliance domain
   */
  async getPoliciesByDomain(domain: ComplianceDomain): Promise<CompliancePolicy[]> {
    try {
      const policies = await this.prisma.compliancePolicy.findMany({
        where: { domain, status: { not: 'Archived' } },
        include: {
          requirements: true,
          violations: {
            where: { status: 'Open' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return policies;
    } catch (error) {
      logger.error('Error fetching policies by domain', { error, domain });
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }
  }

  /**
   * Check for compliance violations on an entity
   */
  async checkViolations(entityType: string, entityId: string): Promise<ComplianceViolation[]> {
    try {
      const violations = await this.prisma.complianceViolation.findMany({
        where: {
          entityType: entityType.toLowerCase(),
          entityId: entityId,
          status: 'Open',
        },
        include: {
          policy: true,
        },
        orderBy: { detectedAt: 'desc' },
      });

      return violations;
    } catch (error) {
      logger.error('Error checking violations', { error, entityType, entityId });
      throw new Error(`Failed to check violations: ${error.message}`);
    }
  }

  /**
   * Calculate overall platform compliance score
   */
  async getComplianceScore(): Promise<number> {
    try {
      const statusRecords = await this.prisma.complianceStatus.findMany();
      
      if (statusRecords.length === 0) {
        return 100; // No policies means perfect compliance
      }

      const totalScore = statusRecords.reduce((sum, status) => sum + status.complianceScore, 0);
      return totalScore / statusRecords.length;
    } catch (error) {
      logger.error('Error calculating compliance score', { error });
      throw new Error(`Failed to calculate compliance score: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(request: ComplianceReportRequest): Promise<ComplianceReport> {
    try {
      const { domain, jurisdiction, dateFrom, dateTo, includeViolations = true, includeAuditLogs = true } = request;

      // Build where clause for filtering
      const whereClause: any = {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      };

      if (domain) {
        whereClause.policy = { domain };
      }

      if (jurisdiction) {
        whereClause.policy = { ...whereClause.policy, jurisdiction };
      }

      // Get violations
      const violations = includeViolations 
        ? await this.prisma.complianceViolation.findMany({
            where: whereClause,
            include: { policy: true },
            orderBy: { detectedAt: 'desc' },
          })
        : [];

      // Get audit logs
      const auditLogs = includeAuditLogs
        ? await this.prisma.complianceAuditLog.findMany({
            where: {
              timestamp: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
            orderBy: { timestamp: 'desc' },
          })
        : [];

      // Get policy summary
      const policySummary = await this.getPolicySummary(domain, jurisdiction);

      // Calculate compliance score for the period
      const complianceScore = await this.calculatePeriodComplianceScore(violations);

      const report: ComplianceReport = {
        domain: domain || 'All',
        jurisdiction,
        period: { from: dateFrom, to: dateTo },
        summary: {
          totalPolicies: policySummary.totalPolicies,
          activePolicies: policySummary.activePolicies,
          totalViolations: violations.length,
          openViolations: violations.filter(v => v.status === 'Open').length,
          resolvedViolations: violations.filter(v => v.status === 'Resolved').length,
          complianceScore,
        },
        violations,
        auditLogs,
        generatedAt: new Date(),
      };

      logger.info('Compliance report generated', { 
        domain, 
        jurisdiction, 
        violationCount: violations.length,
        auditLogCount: auditLogs.length 
      });

      return report;
    } catch (error) {
      logger.error('Error generating compliance report', { error, request });
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  }

  /**
   * Archive a compliance policy
   */
  async archivePolicy(policyId: string): Promise<void> {
    try {
      const policy = await this.prisma.compliancePolicy.findUnique({
        where: { id: policyId },
        include: { violations: true },
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      // Archive the policy
      await this.prisma.compliancePolicy.update({
        where: { id: policyId },
        data: { status: 'Archived' },
      });

      // Resolve any open violations
      await this.prisma.complianceViolation.updateMany({
        where: { policyId, status: 'Open' },
        data: { 
          status: 'Resolved',
          resolution: 'Policy archived - violations automatically resolved',
          resolvedAt: new Date(),
        },
      });

      // Log the archive action
      await this.auditService.logAction(
        'system',
        'PolicyArchived',
        'CompliancePolicy',
        policyId,
        { policyName: policy.name, openViolations: policy.violations.length }
      );

      // Update compliance status
      await this.updateComplianceStatus(policy.domain);

      logger.info('Compliance policy archived', { policyId, policyName: policy.name });
    } catch (error) {
      logger.error('Error archiving policy', { error, policyId });
      throw new Error(`Failed to archive policy: ${error.message}`);
    }
  }

  /**
   * Evaluate a specific policy against data
   */
  async evaluatePolicy(policyId: string, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    try {
      const policy = await this.prisma.compliancePolicy.findUnique({
        where: { id: policyId },
        include: { requirements: true },
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      const result = await this.policyEngine.evaluatePolicies([policy], context);
      return result[0];
    } catch (error) {
      logger.error('Error evaluating policy', { error, policyId, context });
      throw new Error(`Failed to evaluate policy: ${error.message}`);
    }
  }

  /**
   * Update compliance status for a domain
   */
  private async updateComplianceStatus(domain: string): Promise<void> {
    try {
      const policies = await this.prisma.compliancePolicy.findMany({
        where: { domain, status: { not: 'Archived' } },
        include: { violations: true },
      });

      const totalPolicies = policies.length;
      const activePolicies = policies.filter(p => p.status === 'Active').length;
      const openViolations = policies.reduce((sum, p) => sum + p.violations.filter(v => v.status === 'Open').length, 0);
      const resolvedViolations = policies.reduce((sum, p) => sum + p.violations.filter(v => v.status === 'Resolved').length, 0);
      
      const complianceScore = this.calculateComplianceScore(openViolations, totalPolicies);

      await this.prisma.complianceStatus.upsert({
        where: {
          domain_jurisdiction: {
            domain,
            jurisdiction: null, // This would need a composite unique constraint in real implementation
          },
        },
        update: {
          totalPolicies,
          activePolicies,
          openViolations,
          resolvedViolations,
          complianceScore,
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updatedAt: new Date(),
        },
        create: {
          domain,
          jurisdiction: null,
          totalPolicies,
          activePolicies,
          openViolations,
          resolvedViolations,
          complianceScore,
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      logger.error('Error updating compliance status', { error, domain });
      throw error;
    }
  }

  /**
   * Get active policies
   */
  private async getActivePolicies(): Promise<CompliancePolicy[]> {
    return this.prisma.compliancePolicy.findMany({
      where: { status: 'Active' },
      include: { requirements: true },
    });
  }

  /**
   * Determine jurisdiction from lead data
   */
  private determineJurisdiction(leadData: any): string | undefined {
    if (leadData.address?.state) {
      return leadData.address.state;
    }
    if (leadData.state) {
      return leadData.state;
    }
    if (leadData.country) {
      return leadData.country === 'US' ? 'US' : 'International';
    }
    return 'US'; // Default
  }

  /**
   * Get policy summary statistics
   */
  private async getPolicySummary(domain?: string, jurisdiction?: string) {
    const whereClause: any = { status: { not: 'Archived' } };
    
    if (domain) {
      whereClause.domain = domain;
    }
    
    if (jurisdiction) {
      whereClause.jurisdiction = jurisdiction;
    }

    const policies = await this.prisma.compliancePolicy.findMany({ where: whereClause });

    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'Active').length,
    };
  }

  /**
   * Calculate compliance score for a period
   */
  private async calculatePeriodComplianceScore(violations: any[]): Promise<number> {
    const totalPossible = 100;
    const criticalViolationPenalty = 25;
    const highViolationPenalty = 15;
    const mediumViolationPenalty = 10;
    const lowViolationPenalty = 5;

    let penalty = 0;
    
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'Critical':
          penalty += criticalViolationPenalty;
          break;
        case 'High':
          penalty += highViolationPenalty;
          break;
        case 'Medium':
          penalty += mediumViolationPenalty;
          break;
        case 'Low':
          penalty += lowViolationPenalty;
          break;
      }
    });

    return Math.max(0, totalPossible - penalty);
  }

  /**
   * Calculate compliance score from violations
   */
  private calculateComplianceScore(openViolations: number, totalPolicies: number): number {
    if (totalPolicies === 0) return 100;
    
    const violationRate = openViolations / totalPolicies;
    return Math.max(0, 100 - (violationRate * 100));
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}