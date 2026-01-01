// ========================================
// Risk Validation Service
// Validates leads for fraud risk and compliance
// ========================================

import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import {
  RiskValidationResult,
  RiskValidationType,
  RiskSeverity,
  ValidationCheck,
  CreateRiskValidationDto,
  LeadEnrichmentProfile,
} from '@insurance-lead-gen/types';

interface ValidationRule {
  name: string;
  category: ValidationCheck['category'];
  type: RiskValidationType;
  description: string;
  check: (data: any) => Promise<{ result: boolean; details?: Record<string, unknown> }>;
  severity: RiskSeverity;
  enabled: boolean;
}

export class RiskValidationService {
  private validationRules: ValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Perform risk validation on a lead
   */
  async validateLead(
    leadId: string,
    enrichmentProfile: LeadEnrichmentProfile,
    request?: CreateRiskValidationDto
  ): Promise<RiskValidationResult> {
    const validationType = request?.validationType || 'fraud';
    const startTime = Date.now();

    const checks: ValidationCheck[] = [];
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    try {
      // Get lead data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Get applicable validation rules
      const applicableRules = this.validationRules.filter(
        (r) => r.type === validationType && r.enabled
      );

      // Execute each validation check
      for (const rule of applicableRules) {
        try {
          const checkResult = await rule.check({
            lead,
            enrichmentProfile,
          });

          const check: ValidationCheck = {
            name: rule.name,
            category: rule.category,
            status: checkResult.result ? 'passed' : 'failed',
            severity: rule.severity,
            result: checkResult.result,
            message: checkResult.result
              ? `✓ ${rule.description}`
              : `✗ ${rule.description}`,
            details: checkResult.details,
            checkedAt: new Date(),
          };

          if (checkResult.result) {
            passedChecks++;
          } else {
            failedChecks++;
          }

          checks.push(check);
        } catch (error) {
          // Log error but continue with other checks
          console.error(`Validation check failed: ${rule.name}`, error);
          failedChecks++;
        }
      }

      // Calculate overall risk score
      const overallRiskScore = this.calculateRiskScore(checks);

      // Determine severity
      const severity = this.determineSeverity(overallRiskScore, checks);

      // Determine approval status
      const isApproved = failedChecks === 0 && overallRiskScore < 50;

      // Determine if review is needed
      const requiresReview = overallRiskScore >= 50 || failedChecks > 0;

      // Determine auto-escalation
      const autoEscalate = severity === 'critical' || overallRiskScore >= 80;

      // Calculate expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save validation result
      const result = await prisma.riskValidationResult.create({
        data: {
          leadId,
          validationType,
          overallRiskScore,
          severity,
          isApproved,
          requiresReview,
          autoEscalate,
          validationChecks: checks as any,
          validationMetadata: {
            checksPerformed: checks.length,
            checksPassed: passedChecks,
            checksFailed: failedChecks,
            checksWarning: warningChecks,
            validationDuration: Date.now() - startTime,
          },
          validatedAt: new Date(),
          expiresAt,
        },
      });

      return result as RiskValidationResult;
    } catch (error) {
      console.error('Error validating lead:', error);

      // Return failed validation result
      return {
        id: crypto.randomUUID(),
        leadId,
        validationType,
        overallRiskScore: 100,
        severity: 'critical',
        isApproved: false,
        requiresReview: true,
        autoEscalate: true,
        validationChecks: [],
        validationMetadata: {
          checksPerformed: 0,
          checksPassed: 0,
          checksFailed: 0,
          checksWarning: 0,
          validationDuration: Date.now() - startTime,
        },
        validatedAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
      };
    }
  }

  /**
   * Calculate overall risk score from checks
   */
  private calculateRiskScore(checks: ValidationCheck[]): number {
    if (checks.length === 0) return 0;

    let totalScore = 0;
    let weightSum = 0;

    for (const check of checks) {
      const weight = this.getCheckWeight(check.category, check.severity);

      if (check.status === 'failed') {
        totalScore += weight * 100;
      } else if (check.status === 'warning') {
        totalScore += weight * 50;
      }

      weightSum += weight;
    }

    return weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  }

  /**
   * Get check weight based on category and severity
   */
  private getCheckWeight(category: ValidationCheck['category'], severity: RiskSeverity): number {
    const categoryWeight: Record<ValidationCheck['category'], number> = {
      identity: 0.3,
      contact: 0.15,
      behavioral: 0.2,
      compliance: 0.25,
      financial: 0.1,
    };

    const severityMultiplier: Record<RiskSeverity, number> = {
      critical: 1.5,
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };

    return categoryWeight[category] * severityMultiplier[severity];
  }

  /**
   * Determine severity from risk score and checks
   */
  private determineSeverity(
    riskScore: number,
    checks: ValidationCheck[]
  ): RiskSeverity {
    // Check for critical failures
    if (checks.some((c) => c.status === 'failed' && c.severity === 'critical')) {
      return 'critical';
    }

    // Determine by risk score
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Identity verification checks
    this.validationRules.push(
      {
        name: 'Phone Number Validation',
        category: 'identity',
        type: 'fraud',
        description: 'Validates phone number format and carrier',
        severity: 'medium',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const phone = lead.phone || enrichmentProfile.behavioral?.phone;
          if (!phone) {
            return { result: false, details: { reason: 'No phone provided' } };
          }

          // Basic format validation
          const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
          const isValid = phoneRegex.test(phone);

          // Check enrichment verification status
          const isVerified = enrichmentProfile.risk?.phoneVerified;

          return {
            result: isValid && isVerified !== false,
            details: {
              isValid,
              isVerified,
              phone: phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
            },
          };
        },
      },
      {
        name: 'Email Address Validation',
        category: 'identity',
        type: 'fraud',
        description: 'Validates email format and domain',
        severity: 'low',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const email = lead.email;
          if (!email) {
            return { result: false, details: { reason: 'No email provided' } };
          }

          // Email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const isValid = emailRegex.test(email);

          // Check for disposable email domains
          const disposableDomains = ['tempmail.com', 'throwaway.com', 'guerrillamail.com'];
          const domain = email.split('@')[1]?.toLowerCase();
          const isDisposable = disposableDomains.includes(domain);

          // Check enrichment verification status
          const isVerified = enrichmentProfile.risk?.emailVerified;

          return {
            result: isValid && !isDisposable && isVerified !== false,
            details: {
              isValid,
              isDisposable,
              isVerified,
              domain,
            },
          };
        },
      },
      {
        name: 'Address Verification',
        category: 'identity',
        type: 'fraud',
        description: 'Verifies address format and existence',
        severity: 'medium',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const hasStreet = !!(lead.street || enrichmentProfile.propertyData?.address);
          const hasCity = !!lead.city;
          const hasState = !!lead.state;
          const hasZip = !!lead.zipCode;

          const isComplete = hasStreet && hasCity && hasState && hasZip;

          // Check enrichment verification status
          const isVerified = enrichmentProfile.risk?.addressVerified;

          return {
            result: isComplete && isVerified !== false,
            details: {
              isComplete,
              hasStreet,
              hasCity,
              hasState,
              hasZip,
              isVerified,
            },
          };
        },
      }
    );

    // Behavioral checks
    this.validationRules.push(
      {
        name: 'Synthetic Identity Detection',
        category: 'behavioral',
        type: 'fraud',
        description: 'Detects potentially synthetic or fraudulent identities',
        severity: 'critical',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const riskSignals: string[] = [];

          // Check for inconsistent data
          if (
            lead.firstName &&
            lead.lastName &&
            enrichmentProfile.demographics?.age &&
            enrichmentProfile.demographics.age < 18
          ) {
            riskSignals.push('Minor with adult-sounding name');
          }

          // Check for missing critical data
          if (!lead.email || !lead.phone) {
            riskSignals.push('Missing contact information');
          }

          // Check enrichment risk score
          if (enrichmentProfile.risk?.fraudRiskScore && enrichmentProfile.risk.fraudRiskScore > 70) {
            riskSignals.push(`High fraud risk score: ${enrichmentProfile.risk.fraudRiskScore}`);
          }

          // Check for synthetic identity risk
          if (enrichmentProfile.risk?.syntheticIdentityRisk === 'high') {
            riskSignals.push('High synthetic identity risk');
          }

          return {
            result: riskSignals.length === 0,
            details: {
              riskSignals,
              fraudRiskScore: enrichmentProfile.risk?.fraudRiskScore,
            },
          };
        },
      },
      {
        name: 'Behavioral Anomaly Detection',
        category: 'behavioral',
        type: 'fraud',
        description: 'Detects unusual behavioral patterns',
        severity: 'high',
        enabled: true,
        check: async ({ enrichmentProfile }) => {
          const anomalies: string[] = [];

          // Check for excessive activity (bot-like)
          const websiteVisits = enrichmentProfile.behavioral?.websiteVisits || 0;
          if (websiteVisits > 50) {
            anomalies.push('Excessive website activity');
          }

          // Check for rapid engagement
          const intents = enrichmentProfile.behavioral?.intentSignals || [];
          const highIntensityIntents = intents.filter((i: any) => i.strength === 'high').length;
          if (highIntensityIntents > 5) {
            anomalies.push('Unusually high intent intensity');
          }

          return {
            result: anomalies.length === 0,
            details: {
              anomalies,
              websiteVisits,
              highIntensityIntents,
            },
          };
        },
      }
    );

    // Compliance checks
    this.validationRules.push(
      {
        name: 'Age Eligibility Check',
        category: 'compliance',
        type: 'compliance',
        description: 'Verifies lead meets minimum age requirements',
        severity: 'critical',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const age = enrichmentProfile.demographics?.age;

          if (!age) {
            return { result: false, details: { reason: 'Age not available' } };
          }

          const isEligible = age >= 18;

          return {
            result: isEligible,
            details: {
              age,
              isEligible,
            },
          };
        },
      },
      {
        name: 'Geographic Restrictions Check',
        category: 'compliance',
        type: 'compliance',
        description: 'Verifies lead is in supported geographic area',
        severity: 'high',
        enabled: true,
        check: async ({ lead }) => {
          const supportedStates = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
          const isSupported = lead.state ? supportedStates.includes(lead.state) : false;

          return {
            result: isSupported,
            details: {
              state: lead.state,
              isSupported,
            },
          };
        },
      },
      {
        name: 'Coverage Appropriateness Check',
        category: 'compliance',
        type: 'compliance',
        description: 'Ensures coverage type is appropriate for demographic',
        severity: 'medium',
        enabled: true,
        check: async ({ lead, enrichmentProfile }) => {
          const issues: string[] = [];

          // Check life insurance age limits
          if (lead.insuranceType === 'life') {
            const age = enrichmentProfile.demographics?.age;
            if (age && age > 75) {
              issues.push('Life insurance age limit exceeded');
            }
          }

          // Check commercial insurance requirements
          if (lead.insuranceType === 'commercial') {
            if (!enrichmentProfile.firmographics?.companySize) {
              issues.push('Missing business information for commercial insurance');
            }
          }

          return {
            result: issues.length === 0,
            details: {
              issues,
            },
          };
        },
      }
    );

    // Contact checks
    this.validationRules.push({
      name: 'Contact Completeness Check',
      category: 'contact',
      type: 'quality',
      description: 'Ensures sufficient contact information is provided',
      severity: 'medium',
      enabled: true,
      check: async ({ lead }) => {
        const hasEmail = !!lead.email;
        const hasPhone = !!lead.phone;

        const isComplete = hasEmail || hasPhone;

        return {
          result: isComplete,
          details: {
            hasEmail,
            hasPhone,
            isComplete,
          },
        };
      },
    });

    // Financial checks
    this.validationRules.push({
      name: 'Credit Score Proxy Check',
      category: 'financial',
      type: 'fraud',
      description: 'Evaluates financial stability indicators',
      severity: 'medium',
      enabled: true,
      check: async ({ enrichmentProfile }) => {
        const creditScore = enrichmentProfile.risk?.creditScoreProxy;
        const financialStability = enrichmentProfile.risk?.financialStabilityScore;

        if (!creditScore) {
          return { result: true, details: { reason: 'Credit score not available' } };
        }

        const isAcceptable = creditScore >= 450; // Minimum threshold

        return {
          result: isAcceptable,
          details: {
            creditScore,
            financialStability,
            isAcceptable,
          },
        };
      },
    });
  }

  /**
   * Get validation result for a lead
   */
  async getValidationResult(leadId: string): Promise<RiskValidationResult | null> {
    const result = await prisma.riskValidationResult.findFirst({
      where: {
        leadId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { validatedAt: 'desc' },
    });

    return result as RiskValidationResult | null;
  }

  /**
   * Get recent validation results for analytics
   */
  async getRecentValidationResults(
    limit: number = 100
  ): Promise<RiskValidationResult[]> {
    const results = await prisma.riskValidationResult.findMany({
      take: limit,
      orderBy: { validatedAt: 'desc' },
    });

    return results as RiskValidationResult[];
  }
}
