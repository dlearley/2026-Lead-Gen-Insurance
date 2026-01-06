// ========================================
// INVESTIGATION RECOMMENDATION SERVICE - Phase 27.4
// ========================================

import type {
  InvestigationRec,
  InvestigationType,
  PrioritizedInvestigation,
  InvestigatorAssignment,
  InvestigationResults,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Investigation Recommendation Service
 * Recommend and manage claims investigations
 */
export class InvestigationRecommendationService {
  /**
   * Get investigation recommendations
   */
  static async getInvestigationRecommendations(claimId: string, fraudScore: number): Promise<InvestigationRec[]> {
    try {
      logger.info('Getting investigation recommendations', { claimId, fraudScore });

      const recommendations: InvestigationRec[] = [];

      // Fraud investigation
      if (fraudScore > 0.6) {
        recommendations.push({
          claimId,
          recommendedInvestigation: true,
          investigationType: 'fraud',
          priority: fraudScore > 0.8 ? 'high' : 'medium',
          reason: `High fraud score (${fraudScore.toFixed(2)}) indicates potential fraud`,
          keyAreas: [
            'Verify claimant identity',
            'Validate supporting documents',
            'Review previous claims history',
            'Check for network connections',
            'Interview witnesses',
          ],
          estimatedDuration: fraudScore > 0.8 ? 30 : 21, // days
          estimatedCost: fraudScore > 0.8 ? 5000 : 3000,
          resources: [
            'Fraud investigator',
            'Document analyst',
            'Data analyst',
          ],
        });
      }

      // Coverage investigation
      recommendations.push({
        claimId,
        recommendedInvestigation: true,
        investigationType: 'coverage',
        priority: 'medium',
        reason: 'Verify policy coverage and terms',
        keyAreas: [
          'Review policy language',
          'Verify coverage limits',
          'Check for exclusions',
          'Validate endorsements',
        ],
        estimatedDuration: 7,
        estimatedCost: 1000,
        resources: [
          'Claims adjuster',
          'Policy analyst',
        ],
      });

      logger.info('Investigation recommendations retrieved', {
        claimId,
        count: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting investigation recommendations', { claimId, error });
      throw new Error(`Failed to get investigation recommendations: ${error.message}`);
    }
  }

  /**
   * Recommend investigation type
   */
  static async recommendInvestigationType(claimId: string, claimData: any, fraudScore: number): Promise<InvestigationType> {
    try {
      logger.info('Recommending investigation type', { claimId });

      let investigationType: InvestigationType;

      if (fraudScore > 0.7) {
        investigationType = {
          type: 'fraud',
          description: 'Full fraud investigation including document verification, background checks, and network analysis',
          triggers: [
            'Fraud score exceeds 0.7',
            'Multiple fraud indicators present',
            'Anomalous claim patterns',
          ],
          requiredSteps: [
            'Verify claimant identity',
            'Validate all documents',
            'Conduct background check',
            'Review claims history',
            'Analyze network connections',
            'Interview witnesses if applicable',
            'Assess provider relationships',
          ],
          typicalDuration: 30, // days
        };
      } else if (fraudScore > 0.4) {
        investigationType = {
          type: 'coverage',
          description: 'Investigation focused on verifying policy coverage and claim validity',
          triggers: [
            'Fraud score between 0.4 and 0.7',
            'Unclear coverage terms',
            'High claim value',
          ],
          requiredSteps: [
            'Review policy language',
            'Verify coverage limits',
            'Check for exclusions',
            'Validate claim documentation',
            'Assess liability if applicable',
          ],
          typicalDuration: 14,
        };
      } else {
        investigationType = {
          type: 'liability',
          description: 'Investigation to determine liability and fault',
          triggers: [
            'Disputed liability',
            'Multiple parties involved',
            'Complex circumstances',
          ],
          requiredSteps: [
            'Gather evidence',
            'Review accident reports',
            'Interview witnesses',
            'Analyze liability factors',
            'Determine fault percentages',
          ],
          typicalDuration: 21,
        };
      }

      logger.info('Investigation type recommended', {
        claimId,
        type: investigationType.type,
      });

      return investigationType;
    } catch (error) {
      logger.error('Error recommending investigation type', { claimId, error });
      throw new Error(`Failed to recommend investigation type: ${error.message}`);
    }
  }

  /**
   * Prioritize investigations
   */
  static async prioritizeInvestigations(claims: any[]): Promise<PrioritizedInvestigation[]> {
    try {
      logger.info('Prioritizing investigations', { claimCount: claims.length });

      const prioritized: PrioritizedInvestigation[] = claims.map(claim => {
        let priority = 50; // Base priority
        const urgencyFactors: string[] = [];

        // Fraud score
        if (claim.fraudScore > 0.8) {
          priority += 40;
          urgencyFactors.push('Critical fraud risk');
        } else if (claim.fraudScore > 0.6) {
          priority += 25;
          urgencyFactors.push('High fraud risk');
        } else if (claim.fraudScore > 0.4) {
          priority += 10;
          urgencyFactors.push('Moderate fraud risk');
        }

        // Claim amount
        if (claim.claimedAmount > 100000) {
          priority += 25;
          urgencyFactors.push('High claim value');
        } else if (claim.claimedAmount > 50000) {
          priority += 15;
          urgencyFactors.push('Significant claim value');
        }

        // Claim age
        const daysSinceSubmission = (Date.now() - new Date(claim.submittedDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSubmission > 60) {
          priority += 20;
          urgencyFactors.push('Overdue for resolution');
        } else if (daysSinceSubmission > 30) {
          priority += 10;
          urgencyFactors.push('Approaching SLA deadline');
        }

        // Claimant complaints
        if (claim.hasComplaints) {
          priority += 15;
          urgencyFactors.push('Claimant complaints');
        }

        // Regulatory implications
        if (claim.hasRegulatoryImplications) {
          priority += 20;
          urgencyFactors.push('Regulatory implications');
        }

        return {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          investigationType: claim.fraudScore > 0.6 ? 'fraud' : 'coverage',
          priority: Math.min(priority, 100),
          fraudScore: claim.fraudScore || 0,
          claimAmount: claim.claimedAmount,
          urgencyFactors,
          recommendedInvestigator: priority > 70 ? 'senior-investigator' : 'general-investigator',
        };
      });

      // Sort by priority (highest first)
      prioritized.sort((a, b) => b.priority - a.priority);

      logger.info('Investigations prioritized', {
        totalClaims: claims.length,
        highPriority: prioritized.filter(p => p.priority > 70).length,
        mediumPriority: prioritized.filter(p => p.priority >= 40 && p.priority <= 70).length,
        lowPriority: prioritized.filter(p => p.priority < 40).length,
      });

      return prioritized;
    } catch (error) {
      logger.error('Error prioritizing investigations', { error });
      throw new Error(`Failed to prioritize investigations: ${error.message}`);
    }
  }

  /**
   * Assign investigator
   */
  static async assignInvestigator(claimId: string, investigationType: string): Promise<InvestigatorAssignment> {
    try {
      logger.info('Assigning investigator', { claimId, investigationType });

      // In production, this would:
      // 1. Query available investigators
      // 2. Match based on specialization and workload
      // 3. Consider investigator skill level
      // 4. Balance workload across team

      let investigatorId: string;
      let investigatorName: string;
      let specialization: string[];

      if (investigationType === 'fraud') {
        investigatorId = 'investigator-fraud-001';
        investigatorName = 'John Smith';
        specialization = ['fraud_detection', 'document_analysis', 'background_checks'];
      } else if (investigationType === 'coverage') {
        investigatorId = 'investigator-coverage-001';
        investigatorName = 'Jane Doe';
        specialization = ['policy_analysis', 'coverage_verification', 'liability_assessment'];
      } else {
        investigatorId = 'investigator-general-001';
        investigatorName = 'Bob Johnson';
        specialization = ['general_claims', 'evidence_gathering', 'interviewing'];
      }

      const assignedAt = new Date();
      const dueDate = new Date(assignedAt.getTime() + 21 * 24 * 60 * 60 * 1000); // 21 days
      const workload = 5; // Number of active investigations

      const assignment: InvestigatorAssignment = {
        claimId,
        investigationId: `INV-${claimId}-${Date.now()}`,
        investigatorId,
        investigatorName,
        assignedAt,
        dueDate,
        specialization,
        workload,
      };

      logger.info('Investigator assigned', {
        claimId,
        investigatorId,
        dueDate,
      });

      return assignment;
    } catch (error) {
      logger.error('Error assigning investigator', { claimId, error });
      throw new Error(`Failed to assign investigator: ${error.message}`);
    }
  }

  /**
   * Track investigation progress
   */
  static async updateInvestigationStatus(investigationId: string, status: string, notes?: string): Promise<void> {
    try {
      logger.info('Updating investigation status', {
        investigationId,
        status,
        notes,
      });

      // In production, this would:
      // 1. Update investigation record
      // 2. Log status change
      // 3. Send notifications if needed
      // 4. Update milestones

      // Valid statuses: open, in_progress, pending_information, completed, closed

      logger.info('Investigation status updated', {
        investigationId,
        status,
      });
    } catch (error) {
      logger.error('Error updating investigation status', { investigationId, error });
      throw new Error(`Failed to update investigation status: ${error.message}`);
    }
  }

  /**
   * Get investigation results
   */
  static async getInvestigationResults(investigationId: string): Promise<InvestigationResults> {
    try {
      logger.info('Getting investigation results', { investigationId });

      // In production, this would query database

      const results: InvestigationResults = {
        investigationId,
        claimId: `claim-${investigationId}`,
        investigatorId: 'investigator-fraud-001',
        status: 'completed',
        findings: `
          Investigation Summary:
          - Claimant identity verified
          - All supporting documents validated
          - No anomalies detected in claims history
          - No suspicious network connections identified
          - Witness interviews conducted
          - Evidence collection complete

          Conclusion: Claim appears legitimate. No fraud indicators found.
        `,
        fraudConfirmed: false,
        fraudConfirmedAmount: undefined,
        evidenceCollected: [
          {
            type: 'Identity Verification',
            description: 'Claimant identity verified against multiple sources',
            source: 'Credit bureau',
            dateCollected: new Date(),
            collectedBy: 'investigator-fraud-001',
            importance: 'high',
          },
          {
            type: 'Document Validation',
            description: 'All submitted documents verified as authentic',
            source: 'Document analysis',
            dateCollected: new Date(),
            collectedBy: 'document-analyst-001',
            importance: 'high',
          },
          {
            type: 'Claims History',
            description: 'No fraudulent activity in previous claims',
            source: 'Claims database',
            dateCollected: new Date(),
            collectedBy: 'data-analyst-001',
            importance: 'medium',
          },
        ],
        recommendations: [
          'Proceed with standard claims processing',
          'No further investigation required',
        ],
        nextSteps: [
          'Close investigation',
          'Update claim status',
          'Proceed to settlement phase',
        ],
        completedAt: new Date(),
      };

      logger.info('Investigation results retrieved', {
        investigationId,
        fraudConfirmed: results.fraudConfirmed,
      });

      return results;
    } catch (error) {
      logger.error('Error getting investigation results', { investigationId, error });
      throw new Error(`Failed to get investigation results: ${error.message}`);
    }
  }

  /**
   * Close investigation
   */
  static async closeInvestigation(investigationId: string, findings: string, fraudConfirmed: boolean): Promise<void> {
    try {
      logger.info('Closing investigation', {
        investigationId,
        fraudConfirmed,
      });

      // In production, this would:
      // 1. Update investigation record
      // 2. Store findings
      // 3. Update claim status if fraud confirmed
      // 4. Notify relevant parties
      // 5. Archive investigation

      if (fraudConfirmed) {
        // Update claim status, flag for legal action, etc.
        logger.warn('Fraud confirmed', { investigationId });
      }

      logger.info('Investigation closed', {
        investigationId,
        fraudConfirmed,
      });
    } catch (error) {
      logger.error('Error closing investigation', { investigationId, error });
      throw new Error(`Failed to close investigation: ${error.message}`);
    }
  }

  /**
   * Generate investigation report
   */
  static async generateInvestigationReport(investigationId: string): Promise<{
    reportId: string;
    generatedAt: Date;
    summary: string;
    findings: string;
    recommendations: string[];
    attachments: string[];
  }> {
    try {
      logger.info('Generating investigation report', { investigationId });

      const results = await this.getInvestigationResults(investigationId);

      const report = {
        reportId: `INV-RPT-${Date.now()}`,
        generatedAt: new Date(),
        summary: `Investigation ${investigationId} ${results.status}. ${results.fraudConfirmed ? 'Fraud confirmed.' : 'No fraud detected.'}`,
        findings: results.findings,
        recommendations: results.recommendations,
        attachments: [
          'evidence_report.pdf',
          'witness_interviews.pdf',
          'supporting_documents.pdf',
        ],
      };

      logger.info('Investigation report generated', {
        investigationId,
        reportId: report.reportId,
      });

      return report;
    } catch (error) {
      logger.error('Error generating investigation report', { investigationId, error });
      throw new Error(`Failed to generate investigation report: ${error.message}`);
    }
  }

  /**
   * Calculate investigation metrics
   */
  static async getInvestigationMetrics(dateRange: any): Promise<{
    totalInvestigations: number;
    fraudConfirmed: number;
    fraudRate: number;
    averageDuration: number;
    averageCost: number;
    investigatorUtilization: Record<string, number>;
  }> {
    try {
      logger.info('Getting investigation metrics', { dateRange });

      // In production, this would query database

      const metrics = {
        totalInvestigations: 100,
        fraudConfirmed: 15,
        fraudRate: 0.15, // 15%
        averageDuration: 21, // days
        averageCost: 3500, // dollars
        investigatorUtilization: {
          'investigator-fraud-001': 0.85,
          'investigator-coverage-001': 0.72,
          'investigator-general-001': 0.68,
        },
      };

      logger.info('Investigation metrics retrieved', metrics);

      return metrics;
    } catch (error) {
      logger.error('Error getting investigation metrics', { dateRange, error });
      throw new Error(`Failed to get investigation metrics: ${error.message}`);
    }
  }
}
