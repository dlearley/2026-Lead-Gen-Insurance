// Financial compliance service for SOX controls and financial data integrity
import {
  ComplianceDomain,
  ComplianceStatus,
  ComplianceSeverity,
  RegulationType,
  FinancialControl,
  EvidenceRecord,
  RemediationAction,
} from './types.js';
import { logger } from '../logger.js';

export class FinancialComplianceService {
  private controls: Map<string, FinancialControl> = new Map();
  private financialTransactions: any[] = [];
  private reconciliationRecords: any[] = [];

  constructor() {
    this.initializeFinancialControls();
    this.initializeSampleData();
  }

  private initializeFinancialControls(): void {
    const controls: FinancialControl[] = [
      {
        id: 'FC-001',
        name: 'Segregation of Duties - Financial Transactions',
        description: 'Ensure proper segregation between authorization, recording, and custody of assets',
        controlType: 'preventive',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'quarterly_review',
        frequency: 'quarterly',
        owner: 'Finance Manager',
        evidence: [],
      },
      {
        id: 'FC-002',
        name: 'Dual Authorization for Large Transactions',
        description: 'Require dual authorization for transactions exceeding $10,000',
        controlType: 'preventive',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'monthly_sample_testing',
        frequency: 'monthly',
        owner: 'CFO',
        evidence: [],
      },
      {
        id: 'FC-003',
        name: 'Monthly Financial Reconciliation',
        description: 'Perform monthly reconciliation of all financial accounts',
        controlType: 'detective',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'monthly_reconciliation_review',
        frequency: 'monthly',
        owner: 'Controller',
        evidence: [],
      },
      {
        id: 'FC-004',
        name: 'Financial Data Access Controls',
        description: 'Restrict access to financial systems based on job responsibilities',
        controlType: 'preventive',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'access_review',
        frequency: 'quarterly',
        owner: 'IT Security Manager',
        evidence: [],
      },
      {
        id: 'FC-005',
        name: 'Transaction Logging and Audit Trail',
        description: 'Maintain complete audit trail for all financial transactions',
        controlType: 'detective',
        effectiveness: ComplianceStatus.PARTIAL,
        testing: 'audit_trail_review',
        frequency: 'monthly',
        owner: 'Internal Auditor',
        evidence: [],
      },
      {
        id: 'FC-006',
        name: 'Financial Reporting Controls',
        description: 'Validate accuracy and completeness of financial reports',
        controlType: 'detective',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'report_reconciliation',
        frequency: 'quarterly',
        owner: 'CFO',
        evidence: [],
      },
      {
        id: 'FC-007',
        name: 'Vendor Payment Authorization',
        description: 'Verify proper authorization for all vendor payments',
        controlType: 'preventive',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'payment_authorization_test',
        frequency: 'monthly',
        owner: 'Accounts Payable Manager',
        evidence: [],
      },
      {
        id: 'FC-008',
        name: 'Bank Account Reconciliation',
        description: 'Daily reconciliation of all bank accounts',
        controlType: 'detective',
        effectiveness: ComplianceStatus.COMPLIANT,
        testing: 'daily_reconciliation_review',
        frequency: 'daily',
        owner: 'Treasury Manager',
        evidence: [],
      },
    ];

    for (const control of controls) {
      this.controls.set(control.id, control);
    }
  }

  private initializeSampleData(): void {
    // Initialize sample financial transactions
    const now = new Date();
    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(now.getTime() - i * 3600000); // Hour intervals
      this.financialTransactions.push({
        id: `txn-${i.toString().padStart(6, '0')}`,
        type: i % 5 === 0 ? 'premium_payment' : i % 3 === 0 ? 'commission' : 'expense',
        amount: Math.round(Math.random() * 10000 * 100) / 100,
        currency: 'USD',
        timestamp,
        authorized: Math.random() > 0.02, // 98% authorized
        recorded: Math.random() > 0.01, // 99% recorded
        userId: `user-${(i % 50) + 1}`,
        description: `Financial transaction ${i + 1}`,
        status: Math.random() > 0.05 ? 'completed' : 'pending',
      });
    }

    // Initialize sample reconciliation records
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Daily intervals
      this.reconciliationRecords.push({
        id: `recon-${i.toString().padStart(3, '0')}`,
        accountId: `account-${(i % 10) + 1}`,
        date,
        balance: Math.round(Math.random() * 1000000 * 100) / 100,
        reconciled: Math.random() > 0.05, // 95% reconciled
        reconciledBy: `user-${(i % 20) + 1}`,
        reconciledAt: Math.random() > 0.05 ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : null,
        discrepancies: Math.random() > 0.95 ? [Math.round(Math.random() * 100 * 100) / 100] : [],
      });
    }
  }

  async validateSOXControls(): Promise<{
    compliant: boolean;
    score: number;
    controls: FinancialControl[];
    deficiencies: any[];
    recommendations: string[];
  }> {
    logger.info('Validating SOX controls');

    // Simulate SOX control testing
    const soxControls = Array.from(this.controls.values()).map(control => {
      // Simulate control effectiveness testing
      const testResult = Math.random();
      let effectiveness: ComplianceStatus;

      if (testResult > 0.9) {
        effectiveness = ComplianceStatus.COMPLIANT;
      } else if (testResult > 0.7) {
        effectiveness = ComplianceStatus.PARTIAL;
      } else {
        effectiveness = ComplianceStatus.NON_COMPLIANT;
      }

      // Update control effectiveness
      control.effectiveness = effectiveness;

      return {
        ...control,
        lastTested: new Date(),
        testResult: effectiveness === ComplianceStatus.COMPLIANT ? 'effective' : 'deficient',
        testEvidence: [
          `control_test_${control.id}_${Date.now()}`,
          `evidence_${control.id}_${Date.now()}`,
        ],
      };
    });

    const compliantControls = soxControls.filter(c => c.effectiveness === ComplianceStatus.COMPLIANT).length;
    const score = (compliantControls / soxControls.length) * 100;
    const compliant = score >= 95; // 95% threshold for SOX

    const deficiencies = soxControls
      .filter(c => c.effectiveness !== ComplianceStatus.COMPLIANT)
      .map(c => ({
        controlId: c.id,
        controlName: c.name,
        deficiency: c.effectiveness === ComplianceStatus.NON_COMPLIANT ? 'material_weakness' : 'significant_deficiency',
        severity: c.effectiveness === ComplianceStatus.NON_COMPLIANT ? ComplianceSeverity.HIGH : ComplianceSeverity.MEDIUM,
        description: `${c.name} is not operating effectively`,
        remediation: `Strengthen ${c.name} control procedures`,
      }));

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Address all SOX control deficiencies within 30 days');
      recommendations.push('Implement additional testing for deficient controls');
      recommendations.push('Enhance documentation for control procedures');
      recommendations.push('Conduct management review of control environment');
    } else {
      recommendations.push('Continue quarterly SOX control testing');
      recommendations.push('Maintain current control documentation');
      recommendations.push('Conduct annual SOX compliance review');
    }

    return {
      compliant,
      score,
      controls: soxControls,
      deficiencies,
      recommendations,
    };
  }

  async validateTransactionIntegrity(): Promise<{
    compliant: boolean;
    score: number;
    transactionStats: any;
    integrityIssues: any[];
    recommendations: string[];
  }> {
    logger.info('Validating transaction integrity');

    const totalTransactions = this.financialTransactions.length;
    const authorizedTransactions = this.financialTransactions.filter(t => t.authorized).length;
    const recordedTransactions = this.financialTransactions.filter(t => t.recorded).length;
    const completedTransactions = this.financialTransactions.filter(t => t.status === 'completed').length;

    const integrityIssues: any[] = [];

    // Check for unauthorized transactions
    const unauthorizedTransactions = this.financialTransactions.filter(t => !t.authorized);
    if (unauthorizedTransactions.length > 0) {
      integrityIssues.push({
        type: 'unauthorized_transactions',
        count: unauthorizedTransactions.length,
        severity: ComplianceSeverity.HIGH,
        description: `${unauthorizedTransactions.length} transactions lack proper authorization`,
        impact: 'Financial fraud risk',
      });
    }

    // Check for unrecorded transactions (simulate)
    const unrecordedCount = Math.round(totalTransactions * 0.01); // 1% potential unrecorded
    if (unrecordedCount > 0) {
      integrityIssues.push({
        type: 'unrecorded_transactions',
        count: unrecordedCount,
        severity: ComplianceSeverity.MEDIUM,
        description: `${unrecordedCount} transactions may not be properly recorded`,
        impact: 'Financial reporting accuracy risk',
      });
    }

    // Check for incomplete transactions
    const incompleteTransactions = this.financialTransactions.filter(t => t.status !== 'completed');
    if (incompleteTransactions.length > totalTransactions * 0.05) { // More than 5% incomplete
      integrityIssues.push({
        type: 'incomplete_transactions',
        count: incompleteTransactions.length,
        severity: ComplianceSeverity.MEDIUM,
        description: `${incompleteTransactions.length} transactions are incomplete`,
        impact: 'Financial reconciliation risk',
      });
    }

    // Calculate integrity score
    const authorizedScore = (authorizedTransactions / totalTransactions) * 100;
    const recordedScore = ((recordedTransactions + unrecordedCount) / totalTransactions) * 100;
    const completedScore = (completedTransactions / totalTransactions) * 100;
    
    const score = (authorizedScore + recordedScore + completedScore) / 3;
    const compliant = score >= 98 && integrityIssues.length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Investigate all unauthorized transactions immediately');
      recommendations.push('Implement additional controls for transaction authorization');
      recommendations.push('Enhance transaction recording procedures');
      recommendations.push('Review and reconcile incomplete transactions');
    } else {
      recommendations.push('Continue monitoring transaction integrity');
      recommendations.push('Maintain current authorization controls');
      recommendations.push('Conduct monthly transaction integrity reviews');
    }

    const transactionStats = {
      total: totalTransactions,
      authorized: authorizedTransactions,
      recorded: recordedTransactions,
      completed: completedTransactions,
      unauthorized: unauthorizedTransactions.length,
      incomplete: incompleteTransactions.length,
      integrityScore: Math.round(score * 100) / 100,
    };

    return {
      compliant,
      score,
      transactionStats,
      integrityIssues,
      recommendations,
    };
  }

  async validateAccountReconciliation(): Promise<{
    compliant: boolean;
    score: number;
    reconciliationStats: any;
    discrepancies: any[];
    recommendations: string[];
  }> {
    logger.info('Validating account reconciliation');

    const totalReconciliations = this.reconciliationRecords.length;
    const reconciledAccounts = this.reconciliationRecords.filter(r => r.reconciled).length;
    const accountsWithDiscrepancies = this.reconciliationRecords.filter(r => r.discrepancies.length > 0).length;

    const discrepancies: any[] = [];

    // Analyze discrepancies
    for (const record of this.reconciliationRecords) {
      if (record.discrepancies.length > 0) {
        for (const discrepancy of record.discrepancies) {
          discrepancies.push({
            accountId: record.accountId,
            date: record.date,
            amount: discrepancy,
            severity: Math.abs(discrepancy) > 1000 ? ComplianceSeverity.HIGH : ComplianceSeverity.MEDIUM,
            description: `Reconciliation discrepancy of $${discrepancy} for account ${record.accountId}`,
            resolved: Math.random() > 0.3, // 70% resolved
          });
        }
      }
    }

    // Calculate reconciliation score
    const reconciliationRate = (reconciledAccounts / totalReconciliations) * 100;
    const discrepancyRate = (accountsWithDiscrepancies / totalReconciliations) * 100;
    
    let score = reconciliationRate;
    if (discrepancyRate > 0) {
      score = score * (1 - discrepancyRate / 100); // Penalize for discrepancies
    }

    const compliant = score >= 95 && discrepancies.filter(d => !d.resolved).length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Resolve all unresolved reconciliation discrepancies');
      recommendations.push('Implement daily reconciliation procedures');
      recommendations.push('Enhance discrepancy investigation procedures');
      recommendations.push('Review and update reconciliation timelines');
    } else {
      recommendations.push('Continue daily reconciliation procedures');
      recommendations.push('Maintain current reconciliation controls');
      recommendations.push('Conduct monthly reconciliation effectiveness reviews');
    }

    const reconciliationStats = {
      total: totalReconciliations,
      reconciled: reconciledAccounts,
      unreconciled: totalReconciliations - reconciledAccounts,
      withDiscrepancies: accountsWithDiscrepancies,
      totalDiscrepancies: discrepancies.length,
      resolvedDiscrepancies: discrepancies.filter(d => d.resolved).length,
      reconciliationRate: Math.round(reconciliationRate * 100) / 100,
      score: Math.round(score * 100) / 100,
    };

    return {
      compliant,
      score,
      reconciliationStats,
      discrepancies,
      recommendations,
    };
  }

  async validateAuditTrailRequirements(): Promise<{
    compliant: boolean;
    score: number;
    auditTrailStats: any;
    gaps: any[];
    recommendations: string[];
  }> {
    logger.info('Validating audit trail requirements');

    // Analyze audit trail completeness
    const transactionsWithTrail = this.financialTransactions.filter(t => t.authorized && t.recorded);
    const completeAuditTrails = transactionsWithTrail.filter(t => {
      // Simulate audit trail completeness check
      return Math.random() > 0.05; // 95% complete
    });

    const auditTrailGaps: any[] = [];

    // Check for missing audit trail elements
    const missingElements = this.financialTransactions.length - completeAuditTrails.length;
    if (missingElements > 0) {
      auditTrailGaps.push({
        type: 'missing_audit_trail',
        count: missingElements,
        severity: ComplianceSeverity.MEDIUM,
        description: `${missingElements} transactions lack complete audit trail`,
        impact: 'Audit and compliance risk',
      });
    }

    // Check audit trail retention
    const oldTransactions = this.financialTransactions.filter(t => {
      const ageInDays = (Date.now() - t.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays > 2555; // 7 years
    });

    if (oldTransactions.length > 0) {
      auditTrailGaps.push({
        type: 'retention_violation',
        count: oldTransactions.length,
        severity: ComplianceSeverity.LOW,
        description: `${oldTransactions.length} audit trail records may violate retention requirements`,
        impact: 'Potential regulatory violation',
      });
    }

    // Calculate audit trail score
    const completenessScore = (completeAuditTrails.length / this.financialTransactions.length) * 100;
    const retentionScore = oldTransactions.length === 0 ? 100 : Math.max(0, 100 - (oldTransactions.length / this.financialTransactions.length) * 100);
    
    const score = (completenessScore + retentionScore) / 2;
    const compliant = score >= 95 && auditTrailGaps.length === 0;

    const recommendations: string[] = [];
    if (!compliant) {
      recommendations.push('Implement complete audit trail for all financial transactions');
      recommendations.push('Establish audit trail retention and archival procedures');
      recommendations.push('Review and enhance audit trail monitoring');
      recommendations.push('Conduct audit trail integrity testing');
    } else {
      recommendations.push('Continue maintaining complete audit trails');
      recommendations.push('Conduct quarterly audit trail reviews');
      recommendations.push('Implement automated audit trail monitoring');
    }

    const auditTrailStats = {
      totalTransactions: this.financialTransactions.length,
      completeAuditTrails: completeAuditTrails.length,
      completenessScore: Math.round(completenessScore * 100) / 100,
      oldTransactions: oldTransactions.length,
      retentionScore: Math.round(retentionScore * 100) / 100,
      overallScore: Math.round(score * 100) / 100,
      gaps: auditTrailGaps.length,
    };

    return {
      compliant,
      score,
      auditTrailStats,
      gaps: auditTrailGaps,
      recommendations,
    };
  }

  async generateFinancialComplianceReport(): Promise<{
    summary: any;
    soxControls: any;
    transactionIntegrity: any;
    reconciliation: any;
    auditTrail: any;
    overallScore: number;
    recommendations: string[];
  }> {
    const [soxControls, transactionIntegrity, reconciliation, auditTrail] = await Promise.all([
      this.validateSOXControls(),
      this.validateTransactionIntegrity(),
      this.validateAccountReconciliation(),
      this.validateAuditTrailRequirements(),
    ]);

    // Calculate overall financial compliance score
    const scores = [soxControls.score, transactionIntegrity.score, reconciliation.score, auditTrail.score];
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const recommendations: string[] = [];
    
    // Collect recommendations from all areas
    recommendations.push(...soxControls.recommendations);
    recommendations.push(...transactionIntegrity.recommendations);
    recommendations.push(...reconciliation.recommendations);
    recommendations.push(...auditTrail.recommendations);

    // Remove duplicates
    const uniqueRecommendations = [...new Set(recommendations)];

    const summary = {
      compliant: soxControls.compliant && transactionIntegrity.compliant && reconciliation.compliant && auditTrail.compliant,
      score: Math.round(overallScore * 100) / 100,
      totalControls: this.controls.size,
      effectiveControls: Array.from(this.controls.values()).filter(c => c.effectiveness === ComplianceStatus.COMPLIANT).length,
      transactionVolume: this.financialTransactions.length,
      reconciliationRate: Math.round((reconciliation.reconciliationStats.reconciled / reconciliation.reconciliationStats.total) * 10000) / 100,
      auditTrailCompleteness: Math.round((auditTrail.auditTrailStats.completeAuditTrails / auditTrail.auditTrailStats.totalTransactions) * 10000) / 100,
    };

    return {
      summary,
      soxControls,
      transactionIntegrity,
      reconciliation,
      auditTrail,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendations: uniqueRecommendations,
    };
  }

  // Utility methods
  getControl(controlId: string): FinancialControl | undefined {
    return this.controls.get(controlId);
  }

  updateControlEffectiveness(controlId: string, effectiveness: ComplianceStatus): void {
    const control = this.controls.get(controlId);
    if (control) {
      control.effectiveness = effectiveness;
    }
  }

  getAllControls(): FinancialControl[] {
    return Array.from(this.controls.values());
  }

  getTransactions(from?: Date, to?: Date): any[] {
    return this.financialTransactions.filter(t => {
      if (from && t.timestamp < from) return false;
      if (to && t.timestamp > to) return false;
      return true;
    });
  }

  getReconciliationRecords(from?: Date, to?: Date): any[] {
    return this.reconciliationRecords.filter(r => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      return true;
    });
  }
}

export const financialComplianceService = new FinancialComplianceService();