// Compliance API routes for Phase 19.9
import { Router, Request, Response } from 'express';
import {
  complianceAuditEngine,
  regulatoryComplianceService,
  dataPrivacyComplianceService,
  financialComplianceService,
  thirdPartyRiskService,
  auditTrailValidationService,
  complianceReportsService,
  remediationTracker,
} from '@insurance-lead-gen/core';
import {
  ComplianceDomain,
  RegulationType,
  ComplianceSeverity,
  RemediationAction,
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

// Middleware to ensure compliance mode is enabled
const requireComplianceMode = (req: Request, res: Response, next: Function) => {
  const complianceMode = process.env.COMPLIANCE_MODE || 'full';
  if (complianceMode === 'disabled') {
    return res.status(503).json({
      error: 'Compliance features disabled',
      message: 'Compliance mode is currently disabled',
    });
  }
  next();
};

// Apply compliance mode middleware to all routes
router.use(requireComplianceMode);

// GET /api/v1/compliance/dashboard - Executive compliance dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    logger.info('Generating executive compliance dashboard');

    // Run quick compliance assessment for dashboard
    const auditResults = await complianceAuditEngine.runComplianceAudit({
      includeEvidence: false,
    });

    const dashboard = await complianceReportsService.generateExecutiveComplianceDashboard(
      {
        overallScore: auditResults.summary.overallScore,
        criticalIssues: auditResults.summary.criticalIssues,
        highIssues: auditResults.summary.highIssues,
        auditTrailCompleteness: 92,
        totalRequirements: auditResults.summary.totalRequirements,
        compliant: auditResults.summary.compliant,
        nonCompliant: auditResults.summary.nonCompliant,
        partial: auditResults.summary.partial,
        notApplicable: auditResults.summary.notApplicable,
        totalVendors: 5,
        highRiskVendors: 2,
        overallRisk: 'medium',
        totalContracts: 8,
        criticalIssues: 1,
      },
      {
        includeTrends: true,
        includeBenchmarks: true,
        timeframe: 'quarterly',
      }
    );

    res.json({
      success: true,
      data: dashboard.dashboard,
      summary: dashboard.summary,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error generating compliance dashboard', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance dashboard',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/compliance/audit - Run comprehensive compliance audit
router.post('/audit', async (req: Request, res: Response) => {
  try {
    const {
      domains,
      regulations,
      includeEvidence = true,
    } = req.body;

    logger.info('Starting compliance audit', { domains, regulations, includeEvidence });

    const auditResults = await complianceAuditEngine.runComplianceAudit({
      domains: domains as ComplianceDomain[],
      regulations: regulations as RegulationType[],
      includeEvidence,
    });

    res.json({
      success: true,
      data: auditResults,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error running compliance audit', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to run compliance audit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/reports - List compliance reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { type, limit = 10, offset = 0 } = req.query;

    // In a real implementation, this would query the database
    const reports = await complianceReportsService.getAllReports();

    res.json({
      success: true,
      data: {
        reports: reports.slice(Number(offset), Number(offset) + Number(limit)),
        total: reports.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('Error listing compliance reports', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list compliance reports',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/reports/:id - Get specific compliance report
router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await complianceReportsService.getReport(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        message: `Compliance report with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error getting compliance report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/compliance/reports - Generate new compliance report
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const {
      type = 'comprehensive',
      options = {},
    } = req.body;

    // Run audit first
    const auditResults = await complianceAuditEngine.runComplianceAudit({
      includeEvidence: options.includeEvidence,
    });

    let report;
    switch (type) {
      case 'executive':
        report = await complianceReportsService.generateExecutiveComplianceDashboard(
          auditResults,
          options
        );
        break;
      case 'regulatory':
        report = await complianceReportsService.generateRegulatoryGapAnalysis(
          auditResults,
          options
        );
        break;
      case 'privacy':
        report = await complianceReportsService.generateDataPrivacyImpactAssessment(
          auditResults,
          options
        );
        break;
      case 'third_party':
        report = await complianceReportsService.generateThirdPartyRiskAssessmentReport(
          auditResults,
          options
        );
        break;
      case 'audit_trail':
        report = await complianceReportsService.generateAuditTrailValidationReport(
          auditResults,
          options
        );
        break;
      default:
        report = await complianceReportsService.generateComprehensiveComplianceReport(
          auditResults,
          options
        );
    }

    res.json({
      success: true,
      data: report,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error('Error generating compliance report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/compliance/remediation - Create remediation action
router.post('/remediation', async (req: Request, res: Response) => {
  try {
    const { title, description, owner, priority, dueDate, findingId } = req.body;

    if (!title || !description || !owner || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'title, description, owner, and priority are required',
      });
    }

    const action = await remediationTracker.createRemediationAction({
      title,
      description,
      owner,
      priority: priority as ComplianceSeverity,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    }, findingId);

    res.status(201).json({
      success: true,
      data: action,
    });
  } catch (error) {
    logger.error('Error creating remediation action', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create remediation action',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/remediation - Get remediation actions
router.get('/remediation', async (req: Request, res: Response) => {
  try {
    const {
      owner,
      priority,
      status,
      overdue,
      limit = 50,
      offset = 0,
    } = req.query;

    const progress = await remediationTracker.getRemediationProgress({
      owner: owner as string,
      priority: priority as ComplianceSeverity,
      status: status as RemediationAction['status'],
      overdue: overdue === 'true',
    });

    res.json({
      success: true,
      data: {
        actions: progress.actions.slice(Number(offset), Number(offset) + Number(limit)),
        summary: progress.summary,
        progressMetrics: progress.progressMetrics,
        trends: progress.trends,
        total: progress.actions.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('Error getting remediation actions', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get remediation actions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/v1/compliance/remediation/:id - Update remediation status
router.put('/remediation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, updatedBy } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'status is required',
      });
    }

    await remediationTracker.updateRemediationStatus(
      id,
      status as RemediationAction['status'],
      notes,
      updatedBy
    );

    const action = remediationTracker.getAction(id);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Remediation action not found',
        message: `Remediation action with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    logger.error('Error updating remediation action', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update remediation action',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/vendors - Get vendor risk assessments
router.get('/vendors', async (req: Request, res: Response) => {
  try {
    const report = await thirdPartyRiskService.generateThirdPartyRiskReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error getting vendor assessments', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor assessments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/compliance/vendors/:id/assess - Assess specific vendor risk
router.post('/vendors/:id/assess', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assessment = await thirdPartyRiskService.assessVendorRisk(id);

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error assessing vendor risk', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to assess vendor risk',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/audit-trail - Validate audit trail
router.get('/audit-trail', async (req: Request, res: Response) => {
  try {
    const report = await auditTrailValidationService.generateAuditTrailValidationReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error validating audit trail', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate audit trail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/gdpr - GDPR compliance check
router.get('/gdpr', async (req: Request, res: Response) => {
  try {
    const compliance = await dataPrivacyComplianceService.performGDPRComplianceCheck();

    res.json({
      success: true,
      data: compliance,
    });
  } catch (error) {
    logger.error('Error checking GDPR compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check GDPR compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/gdpr/export - GDPR data export
router.get('/gdpr/export', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'userId parameter is required',
      });
    }

    const exportData = await dataPrivacyComplianceService.generateDataProcessingInventory();

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Error exporting GDPR data', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to export GDPR data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/compliance/gdpr/delete - GDPR data deletion
router.post('/gdpr/delete', async (req: Request, res: Response) => {
  try {
    const { userId, reason, retainAnalytics = false } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'userId is required',
      });
    }

    await dataPrivacyComplianceService.recordConsent(userId, {
      userId,
      purpose: 'data_deletion',
      granted: true,
      reason,
      retainAnalytics,
    });

    res.json({
      success: true,
      message: 'Data deletion request recorded successfully',
    });
  } catch (error) {
    logger.error('Error processing GDPR data deletion', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process data deletion',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/hipaa - HIPAA compliance check
router.get('/hipaa', async (req: Request, res: Response) => {
  try {
    const compliance = await dataPrivacyComplianceService.performHIPAAComplianceCheck();

    res.json({
      success: true,
      data: compliance,
    });
  } catch (error) {
    logger.error('Error checking HIPAA compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check HIPAA compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/ccpa - CCPA compliance check
router.get('/ccpa', async (req: Request, res: Response) => {
  try {
    const compliance = await dataPrivacyComplianceService.performCCPAComplianceCheck();

    res.json({
      success: true,
      data: compliance,
    });
  } catch (error) {
    logger.error('Error checking CCPA compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check CCPA compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/sox - SOX controls validation
router.get('/sox', async (req: Request, res: Response) => {
  try {
    const validation = await financialComplianceService.validateSOXControls();

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Error validating SOX controls', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate SOX controls',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/financial - Financial compliance check
router.get('/financial', async (req: Request, res: Response) => {
  try {
    const report = await financialComplianceService.generateFinancialComplianceReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error checking financial compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check financial compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/compliance/regulatory - Regulatory compliance check
router.get('/regulatory', async (req: Request, res: Response) => {
  try {
    const { states = 'CA,NY,TX' } = req.query;
    const stateArray = (states as string).split(',');

    const results = await Promise.all(
      stateArray.map(async (state) => ({
        state,
        compliance: await regulatoryComplianceService.validateStateCompliance(state.trim()),
      }))
    );

    const overall = await regulatoryComplianceService.generateRegulatoryMapping();

    res.json({
      success: true,
      data: {
        stateCompliance: results,
        regulatoryMapping: overall,
        summary: {
          totalStates: stateArray.length,
          compliantStates: results.filter(r => r.compliance.compliant).length,
          overallCompliance: results.reduce((sum, r) => sum + r.compliance.score, 0) / stateArray.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error checking regulatory compliance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check regulatory compliance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;