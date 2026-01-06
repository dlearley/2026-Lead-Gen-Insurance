// ========================================
// CLAIMS AUTOMATION SERVICE - Phase 27.4
// ========================================

import type {
  AutoApprovalResult,
  RoutingDecision,
  DocumentRequest,
  VendorAssignment,
  PaymentResult,
  AutomationRuleResult,
  EligibilityStatus,
  ClaimData,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Claims Automation Service
 * Automate claims processing workflows for eligible claims
 */
export class ClaimsAutomationService {
  private static AUTO_APPROVE_THRESHOLD = 0.3; // Fraud score below 30%
  private static MAX_AUTO_APPROVE_AMOUNT = 5000;
  private static MIN_DOCUMENTS_RECEIVED = 2;

  /**
   * Check if claim can be auto-approved
   */
  static async canAutoApprove(claimId: string, claimData: ClaimData, fraudScore: number): Promise<boolean> {
    try {
      logger.info('Checking auto-approval eligibility', { claimId, fraudScore });

      // Check fraud score
      if (fraudScore >= this.AUTO_APPROVE_THRESHOLD) {
        logger.info('Claim not eligible for auto-approval - fraud score too high', {
          claimId,
          fraudScore,
          threshold: this.AUTO_APPROVE_THRESHOLD,
        });
        return false;
      }

      // Check claim amount
      if (claimData.claimedAmount > this.MAX_AUTO_APPROVE_AMOUNT) {
        logger.info('Claim not eligible for auto-approval - amount exceeds limit', {
          claimId,
          amount: claimData.claimedAmount,
          limit: this.MAX_AUTO_APPROVE_AMOUNT,
        });
        return false;
      }

      // Check documents
      if (!claimData.documents || claimData.documents.length < this.MIN_DOCUMENTS_RECEIVED) {
        logger.info('Claim not eligible for auto-approval - insufficient documents', {
          claimId,
          documentsReceived: claimData.documents?.length || 0,
          required: this.MIN_DOCUMENTS_RECEIVED,
        });
        return false;
      }

      // Check policy coverage
      if (!claimData.policyInfo) {
        logger.info('Claim not eligible for auto-approval - no policy information', { claimId });
        return false;
      }

      // Check coverage limit
      if (claimData.claimedAmount > claimData.policyInfo.coverageAmount) {
        logger.info('Claim not eligible for auto-approval - amount exceeds coverage', {
          claimId,
          claimedAmount: claimData.claimedAmount,
          coverageAmount: claimData.policyInfo.coverageAmount,
        });
        return false;
      }

      logger.info('Claim eligible for auto-approval', { claimId });
      return true;
    } catch (error) {
      logger.error('Error checking auto-approval eligibility', { claimId, error });
      return false;
    }
  }

  /**
   * Auto-approve eligible claims
   */
  static async autoApproveClaim(claimId: string, claimData: ClaimData, fraudScore: number): Promise<AutoApprovalResult> {
    try {
      const canApprove = await this.canAutoApprove(claimId, claimData, fraudScore);

      if (!canApprove) {
        const reasons = this.getBlockingFactors(claimData, fraudScore);

        return {
          claimId,
          canAutoApprove: false,
          autoApproved: false,
          reasons: [],
          blockingFactors: reasons,
          processedAt: new Date(),
          processedBy: 'ClaimsAutomationService',
        };
      }

      // Process auto-approval
      // In production, this would:
      // 1. Update claim status to 'approved'
      // 2. Generate settlement amount
      // 3. Create payment record
      // 4. Send notifications
      // 5. Log audit trail

      const approvedAmount = Math.min(
        claimData.claimedAmount * 0.9, // 90% of claimed amount
        claimData.policyInfo?.coverageAmount || claimData.claimedAmount
      );

      logger.info('Claim auto-approved', {
        claimId,
        approvedAmount,
        fraudScore,
      });

      return {
        claimId,
        canAutoApprove: true,
        autoApproved: true,
        reasons: [
          'Fraud score below threshold',
          'Claim amount within limits',
          'All required documents received',
          'Policy coverage valid',
        ],
        blockingFactors: [],
        processedAt: new Date(),
        processedBy: 'ClaimsAutomationService',
      };
    } catch (error) {
      logger.error('Error auto-approving claim', { claimId, error });
      throw new Error(`Failed to auto-approve claim: ${error.message}`);
    }
  }

  /**
   * Auto-route claim to appropriate handler
   */
  static async autoRouteClaim(claimId: string, claimData: ClaimData): Promise<RoutingDecision> {
    try {
      logger.info('Auto-routing claim', { claimId });

      // Determine routing based on claim characteristics
      let routedTo: { type: 'agent' | 'team' | 'queue'; id: string; name: string };
      let priority = 'medium';
      let estimatedProcessingTime = 21; // days

      // High-value claims to senior adjusters
      if (claimData.claimedAmount > 50000) {
        routedTo = {
          type: 'team',
          id: 'senior-claims-team',
          name: 'Senior Claims Team',
        };
        priority = 'high';
        estimatedProcessingTime = 35;
      }
      // Complex claims to specialists
      else if (['liability_personal', 'liability_professional', 'home_fire'].includes(claimData.claimType)) {
        routedTo = {
          type: 'team',
          id: 'specialty-claims-team',
          name: 'Specialty Claims Team',
        };
        priority = 'high';
        estimatedProcessingTime = 28;
      }
      // Standard claims to general adjusters
      else {
        routedTo = {
          type: 'agent',
          id: 'general-adjuster-pool',
          name: 'General Adjuster Pool',
        };
        priority = 'medium';
        estimatedProcessingTime = 21;
      }

      // Fraud risk claims to fraud team
      if (claimData.claimantInfo) {
        // Check for fraud indicators (simplified)
        routedTo = {
          type: 'team',
          id: 'fraud-investigation-team',
          name: 'Fraud Investigation Team',
        };
        priority = 'high';
        estimatedProcessingTime = 45;
      }

      const routingRules = [
        `Claim type: ${claimData.claimType}`,
        `Claim amount: $${claimData.claimedAmount.toLocaleString()}`,
        `Insurance type: ${claimData.insuranceType}`,
      ];

      logger.info('Claim auto-routed', {
        claimId,
        routedTo,
        priority,
      });

      return {
        claimId,
        routedTo,
        routingRules,
        priority,
        estimatedProcessingTime,
        routedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error auto-routing claim', { claimId, error });
      throw new Error(`Failed to auto-route claim: ${error.message}`);
    }
  }

  /**
   * Auto-request required documents
   */
  static async autoRequestDocuments(claimId: string, claimData: ClaimData): Promise<DocumentRequest[]> {
    try {
      logger.info('Auto-requesting documents', { claimId });

      const requiredDocuments = this.getRequiredDocumentsForClaimType(claimData.claimType);
      const receivedDocuments = claimData.documents?.map((d: any) => d.documentType) || [];
      const missingDocuments = requiredDocuments.filter(doc => !receivedDocuments.includes(doc));

      const documentRequests: DocumentRequest[] = missingDocuments.map((docType, index) => ({
        documentType: docType,
        description: this.getDocumentDescription(docType),
        deadline: new Date(Date.now() + (7 + index * 3) * 24 * 60 * 60 * 1000), // Staggered deadlines
        priority: docType === 'police_report' ? 'high' : 'medium',
        sentAt: new Date(),
        status: 'pending',
      }));

      // In production, this would:
      // 1. Send notification/email to claimant
      // 2. Create document request records
      // 3. Set up reminders

      logger.info('Document requests sent', {
        claimId,
        count: documentRequests.length,
      });

      return documentRequests;
    } catch (error) {
      logger.error('Error auto-requesting documents', { claimId, error });
      throw new Error(`Failed to auto-request documents: ${error.message}`);
    }
  }

  /**
   * Auto-assign to vendor (repair, medical facility)
   */
  static async autoAssignVendor(claimId: string, claimData: ClaimData): Promise<VendorAssignment> {
    try {
      logger.info('Auto-assigning vendor', { claimId });

      let vendorType: 'repair' | 'medical' | 'inspection' | 'legal';
      let vendorId: string;
      let vendorName: string;
      let assignmentCriteria: string[];
      let estimatedCost: number | undefined;

      // Determine vendor type based on claim
      if (claimData.claimType.startsWith('auto_') && claimData.claimType !== 'auto_theft') {
        vendorType = 'repair';
        vendorId = 'auto-repair-network';
        vendorName = 'Auto Repair Network';
        assignmentCriteria = [
          'Geographic proximity',
          'Claim type',
          'Preferred vendor status',
        ];
        estimatedCost = claimData.claimedAmount * 0.7; // Repair is 70% of claim
      } else if (claimData.claimType.startsWith('health_') || claimData.claimType === 'auto_accident') {
        vendorType = 'medical';
        vendorId = 'medical-provider-network';
        vendorName = 'Medical Provider Network';
        assignmentCriteria = [
          'Provider specialization',
          'Location',
          'In-network status',
        ];
        estimatedCost = claimData.claimedAmount * 0.8; // Medical is 80% of claim
      } else if (claimData.claimType.startsWith('home_')) {
        vendorType = 'inspection';
        vendorId = 'home-inspection-network';
        vendorName = 'Home Inspection Network';
        assignmentCriteria = [
          'Inspection type',
          'Location',
          'Certification',
        ];
      } else {
        vendorType = 'legal';
        vendorId = 'legal-services-network';
        vendorName = 'Legal Services Network';
        assignmentCriteria = [
          'Case complexity',
          'Specialization',
        ];
      }

      logger.info('Vendor assigned', {
        claimId,
        vendorType,
        vendorId,
      });

      return {
        claimId,
        vendorType,
        vendorId,
        vendorName,
        assignedAt: new Date(),
        assignmentCriteria,
        estimatedCost,
      };
    } catch (error) {
      logger.error('Error auto-assigning vendor', { claimId, error });
      throw new Error(`Failed to auto-assign vendor: ${error.message}`);
    }
  }

  /**
   * Auto-pay approved claim
   */
  static async autoPayClaim(claimId: string, approvedAmount: number): Promise<PaymentResult> {
    try {
      logger.info('Auto-paying claim', { claimId, approvedAmount });

      // In production, this would:
      // 1. Generate payment record
      // 2. Process payment through payment gateway
      // 3. Update claim status to 'paid'
      // 4. Send payment confirmation
      // 5. Update financial records

      const transactionId = `PAY-${claimId}-${Date.now()}`;

      logger.info('Claim payment processed', {
        claimId,
        approvedAmount,
        transactionId,
      });

      return {
        claimId,
        paymentProcessed: true,
        paymentAmount: approvedAmount,
        paymentMethod: 'ACH',
        paymentDate: new Date(),
        transactionId,
      };
    } catch (error) {
      logger.error('Error auto-paying claim', { claimId, error });
      throw new Error(`Failed to auto-pay claim: ${error.message}`);
    }
  }

  /**
   * Apply claims automation rules
   */
  static async applyAutomationRules(claimId: string, claimData: ClaimData): Promise<AutomationRuleResult[]> {
    try {
      logger.info('Applying automation rules', { claimId });

      const results: AutomationRuleResult[] = [];

      // Define automation rules
      const rules = [
        {
          ruleId: 'AR001',
          ruleName: 'Auto-approve low-risk claims',
          ruleType: 'auto_approve',
          condition: (data: ClaimData, fraudScore: number) =>
            data.claimedAmount <= this.MAX_AUTO_APPROVE_AMOUNT &&
            fraudScore < this.AUTO_APPROVE_THRESHOLD,
          action: 'Approve claim and process payment',
        },
        {
          ruleId: 'AR002',
          ruleName: 'Request missing documents',
          ruleType: 'auto_request_docs',
          condition: (data: ClaimData) =>
            !data.documents || data.documents.length < this.MIN_DOCUMENTS_RECEIVED,
          action: 'Send document requests',
        },
        {
          ruleId: 'AR003',
          ruleName: 'Route high-value claims',
          ruleType: 'auto_route',
          condition: (data: ClaimData) => data.claimedAmount > 50000,
          action: 'Route to senior claims team',
        },
        {
          ruleId: 'AR004',
          ruleName: 'Assign repair vendor for auto claims',
          ruleType: 'auto_route',
          condition: (data: ClaimData) => data.claimType.startsWith('auto_') && data.claimType !== 'auto_theft',
          action: 'Assign to auto repair network',
        },
        {
          ruleId: 'AR005',
          ruleName: 'Escalate suspicious claims',
          ruleType: 'auto_route',
          condition: (data: ClaimData, fraudScore: number) => fraudScore > 0.7,
          action: 'Route to fraud investigation team',
        },
      ];

      // Apply each rule
      for (const rule of rules) {
        try {
          // Simulate fraud score for rule matching
          const fraudScore = 0.2; // Default for simulation

          const matched = rule.condition(claimData, fraudScore);
          let executed = false;
          let result: any;

          if (matched) {
            executed = true;

            if (rule.ruleType === 'auto_approve') {
              result = await this.autoApproveClaim(claimId, claimData, fraudScore);
            } else if (rule.ruleType === 'auto_request_docs') {
              result = await this.autoRequestDocuments(claimId, claimData);
            } else if (rule.ruleType === 'auto_route') {
              result = await this.autoRouteClaim(claimId, claimData);
            }
          }

          results.push({
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            matched,
            executed,
            actionTaken: matched ? rule.action : 'No action taken',
            result,
            executedAt: new Date(),
          });
        } catch (error) {
          logger.error('Error applying automation rule', { ruleId: rule.ruleId, error });
          results.push({
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            matched: false,
            executed: false,
            actionTaken: 'Error',
            result: null,
            executedAt: new Date(),
            error: error.message,
          });
        }
      }

      logger.info('Automation rules applied', {
        claimId,
        totalRules: rules.length,
        matchedRules: results.filter(r => r.matched).length,
        executedRules: results.filter(r => r.executed).length,
      });

      return results;
    } catch (error) {
      logger.error('Error applying automation rules', { claimId, error });
      throw new Error(`Failed to apply automation rules: ${error.message}`);
    }
  }

  /**
   * Get automation eligibility status
   */
  static async getAutomationEligibility(claimId: string, claimData: ClaimData, fraudScore: number): Promise<EligibilityStatus> {
    try {
      const eligibility: {
        criterion: string;
        met: boolean;
        reason?: string;
      }[] = [];

      // Check auto-approval eligibility
      eligibility.push({
        criterion: 'Fraud score below threshold',
        met: fraudScore < this.AUTO_APPROVE_THRESHOLD,
        reason: fraudScore >= this.AUTO_APPROVE_THRESHOLD ? `Fraud score ${fraudScore} exceeds threshold ${this.AUTO_APPROVE_THRESHOLD}` : undefined,
      });

      eligibility.push({
        criterion: 'Claim amount within limits',
        met: claimData.claimedAmount <= this.MAX_AUTO_APPROVE_AMOUNT,
        reason: claimData.claimedAmount > this.MAX_AUTO_APPROVE_AMOUNT
          ? `Claim amount $${claimData.claimedAmount} exceeds limit $${this.MAX_AUTO_APPROVE_AMOUNT}`
          : undefined,
      });

      eligibility.push({
        criterion: 'All required documents received',
        met: claimData.documents && claimData.documents.length >= this.MIN_DOCUMENTS_RECEIVED,
        reason: !claimData.documents || claimData.documents.length < this.MIN_DOCUMENTS_RECEIVED
          ? `Need ${this.MIN_DOCUMENTS_RECEIVED} documents, received ${claimData.documents?.length || 0}`
          : undefined,
      });

      eligibility.push({
        criterion: 'Policy coverage valid',
        met: !!claimData.policyInfo,
        reason: !claimData.policyInfo ? 'No policy information available' : undefined,
      });

      eligibility.push({
        criterion: 'Claim within coverage limit',
        met: !claimData.policyInfo || claimData.claimedAmount <= claimData.policyInfo.coverageAmount,
        reason: claimData.policyInfo && claimData.claimedAmount > claimData.policyInfo.coverageAmount
          ? `Claim amount $${claimData.claimedAmount} exceeds coverage $${claimData.policyInfo.coverageAmount}`
          : undefined,
      });

      const canAutoApprove = eligibility.every(e => e.met);
      const canAutoRoute = true; // All claims can be auto-routed
      const canAutoPay = canAutoApprove; // Can auto-pay if can auto-approve

      const recommendations: string[] = [];

      if (!canAutoApprove) {
        const blockingFactors = eligibility.filter(e => !e.met).map(e => e.reason);
        recommendations.push('Manual review required');
        recommendations.push(...blockingFactors);
      } else {
        recommendations.push('Claim eligible for full automation');
      }

      return {
        claimId,
        canAutoApprove,
        canAutoRoute,
        canAutoPay,
        eligibility,
        recommendations,
        assessedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error getting automation eligibility', { claimId, error });
      throw new Error(`Failed to get automation eligibility: ${error.message}`);
    }
  }

  /**
   * Get blocking factors
   */
  private static getBlockingFactors(claimData: ClaimData, fraudScore: number): string[] {
    const factors: string[] = [];

    if (fraudScore >= this.AUTO_APPROVE_THRESHOLD) {
      factors.push(`Fraud score ${fraudScore} exceeds threshold ${this.AUTO_APPROVE_THRESHOLD}`);
    }

    if (claimData.claimedAmount > this.MAX_AUTO_APPROVE_AMOUNT) {
      factors.push(`Claim amount $${claimData.claimedAmount} exceeds limit $${this.MAX_AUTO_APPROVE_AMOUNT}`);
    }

    if (!claimData.documents || claimData.documents.length < this.MIN_DOCUMENTS_RECEIVED) {
      factors.push(`Need ${this.MIN_DOCUMENTS_RECEIVED} documents, received ${claimData.documents?.length || 0}`);
    }

    if (!claimData.policyInfo) {
      factors.push('No policy information available');
    }

    if (claimData.policyInfo && claimData.claimedAmount > claimData.policyInfo.coverageAmount) {
      factors.push(`Claim amount exceeds coverage limit`);
    }

    return factors;
  }

  /**
   * Get required documents for claim type
   */
  private static getRequiredDocumentsForClaimType(claimType: string): string[] {
    const baseDocuments = ['incident_report', 'photo_evidence'];

    const claimTypeDocuments: Record<string, string[]> = {
      auto_accident: ['police_report', 'drivers_license', 'insurance_card', 'repair_estimate'],
      auto_theft: ['police_report', 'drivers_license', 'insurance_card'],
      auto_vandalism: ['police_report', 'photo_evidence', 'repair_estimate'],
      home_property_damage: ['photo_evidence', 'repair_estimate', 'receipt'],
      home_theft: ['police_report', 'photo_evidence', 'receipt'],
      home_fire: ['fire_department_report', 'photo_evidence', 'repair_estimate'],
      life_death: ['death_certificate', 'policy_document', 'beneficiary_id'],
      health_medical: ['medical_record', 'hospital_invoice', 'insurance_card'],
    };

    return [...baseDocuments, ...(claimTypeDocuments[claimType] || [])];
  }

  /**
   * Get document description
   */
  private static getDocumentDescription(documentType: string): string {
    const descriptions: Record<string, string> = {
      police_report: 'Official police report documenting the incident',
      medical_record: 'Medical records detailing injuries and treatment',
      photo_evidence: 'Photographic evidence of damage or loss',
      repair_estimate: 'Written estimate for repair costs',
      invoice: 'Invoice for expenses incurred',
      receipt: 'Receipt for purchases related to claim',
      witness_statement: 'Statement from witnesses to the incident',
      insurance_card: 'Copy of insurance card showing coverage',
      drivers_license: 'Copy of driver\'s license',
      incident_report: 'Detailed report of the incident',
      fire_department_report: 'Official fire department report',
      death_certificate: 'Official death certificate',
      policy_document: 'Copy of insurance policy',
      beneficiary_id: 'Identification of policy beneficiary',
      hospital_invoice: 'Invoice from hospital for medical treatment',
    };

    return descriptions[documentType] || 'Required documentation';
  }
}
