import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ComplianceService } from '@insurance-lead-gen/data-service';
import {
  ConsentType,
  DeletionRequestType,
  ReportType,
  ReportFormat,
  ViolationType,
  ViolationSeverity,
  DataSubjectRequestType,
  RetentionAction,
  EntityType,
} from '@insurance-lead-gen/types';
import { prisma } from '../infra/prisma.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      complianceService?: ComplianceService;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

const router = Router();

// Validation Schemas
const CreateConsentSchema = z.object({
  leadId: z.string().optional(),
  email: z.string().email().optional(),
  consentType: z.nativeEnum(ConsentType),
  consentGiven: z.boolean(),
  consentText: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.string().optional(),
});

const CreateDeletionRequestSchema = z.object({
  leadId: z.string().optional(),
  email: z.string().email().optional(),
  requestType: z.nativeEnum(DeletionRequestType),
  requestedBy: z.string(),
  requestedByEmail: z.string().email().optional(),
  ipAddress: z.string().optional(),
  reason: z.string().optional(),
});

const CreateReportSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  reportFormat: z.nativeEnum(ReportFormat),
  title: z.string(),
  description: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  filters: z.record(z.any()).optional(),
});

const CreateRetentionPolicySchema = z.object({
  entityType: z.nativeEnum(EntityType),
  retentionPeriod: z.number().int().positive(),
  action: z.nativeEnum(RetentionAction),
  condition: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

const CreateViolationSchema = z.object({
  violationType: z.nativeEnum(ViolationType),
  severity: z.nativeEnum(ViolationSeverity),
  description: z.string(),
  entityId: z.string().optional(),
  entityType: z.nativeEnum(EntityType).optional(),
  detectedBy: z.string().optional(),
  detectionMethod: z.string().optional(),
  affectedRecords: z.number().int().optional(),
  riskScore: z.number().optional(),
  notes: z.string().optional(),
});

const CreateDataSubjectRequestSchema = z.object({
  leadId: z.string().optional(),
  email: z.string().email(),
  requestType: z.nativeEnum(DataSubjectRequestType),
  verificationData: z.record(z.any()).optional(),
  requestData: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  requestedBy: z.string(),
});

// Middleware to get compliance service
const getComplianceService = (
  req: Request,
  res: Response,
  next: express.NextFunction,
) => {
  req.complianceService = new ComplianceService(req.prisma);
  next();
};

router.use(getComplianceService);

// ==================== CONSENT ENDPOINTS ====================

/**
 * POST /api/v1/compliance/consents
 * Create a new consent record
 */
router.post('/consents', async (req, res) => {
  try {
    const input = CreateConsentSchema.parse(req.body);
    const consent = await req.complianceService.createConsent(input);

    res.status(201).json({
      success: true,
      data: consent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create consent',
    });
  }
});

/**
 * GET /api/v1/compliance/consents/:id
 * Get consent by ID
 */
router.get('/consents/:id', async (req, res) => {
  try {
    const consent = await req.complianceService.getConsent(req.params.id);

    if (!consent) {
      return res.status(404).json({
        success: false,
        error: 'Consent not found',
      });
    }

    res.json({
      success: true,
      data: consent,
    });
  } catch (error) {
    console.error('Error getting consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consent',
    });
  }
});

/**
 * GET /api/v1/compliance/consents/lead/:leadId
 * Get all consents for a lead
 */
router.get('/consents/lead/:leadId', async (req, res) => {
  try {
    const consents = await req.complianceService.getConsentsByLead(req.params.leadId);

    res.json({
      success: true,
      data: consents,
    });
  } catch (error) {
    console.error('Error getting consents by lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consents',
    });
  }
});

/**
 * GET /api/v1/compliance/consents/email/:email
 * Get all consents for an email
 */
router.get('/consents/email/:email', async (req, res) => {
  try {
    const consents = await req.complianceService.getConsentsByEmail(req.params.email);

    res.json({
      success: true,
      data: consents,
    });
  } catch (error) {
    console.error('Error getting consents by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consents',
    });
  }
});

/**
 * GET /api/v1/compliance/consents/check
 * Check if user has valid consent
 */
router.get('/consents/check', async (req, res) => {
  try {
    const { email, consentType } = req.query;

    if (!email || !consentType) {
      return res.status(400).json({
        success: false,
        error: 'Email and consentType are required',
      });
    }

    const result = await req.complianceService.checkConsent(
      email as string,
      consentType as ConsentType,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check consent',
    });
  }
});

/**
 * POST /api/v1/compliance/consents/:id/withdraw
 * Withdraw consent
 */
router.post('/consents/:id/withdraw', async (req, res) => {
  try {
    const consent = await req.complianceService.withdrawConsent(
      req.params.id,
      req.ip,
      req.user?.id,
    );

    res.json({
      success: true,
      data: consent,
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw consent',
    });
  }
});

// ==================== DELETION REQUEST ENDPOINTS ====================

/**
 * POST /api/v1/compliance/deletion-requests
 * Create a data deletion request
 */
router.post('/deletion-requests', async (req, res) => {
  try {
    const input = CreateDeletionRequestSchema.parse(req.body);
    const request = await req.complianceService.createDeletionRequest({
      ...input,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: request,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating deletion request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deletion request',
    });
  }
});

/**
 * GET /api/v1/compliance/deletion-requests/:id
 * Get deletion request by ID
 */
router.get('/deletion-requests/:id', async (req, res) => {
  try {
    const request = await req.complianceService.getDeletionRequest(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error getting deletion request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deletion request',
    });
  }
});

/**
 * POST /api/v1/compliance/deletion-requests/:id/verify
 * Verify deletion request
 */
router.post('/deletion-requests/:id/verify', async (req, res) => {
  try {
    const request = await req.complianceService.verifyDeletionRequest(
      req.params.id,
      req.user?.id || 'SYSTEM',
    );

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error verifying deletion request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify deletion request',
    });
  }
});

/**
 * POST /api/v1/compliance/deletion-requests/:id/process
 * Process deletion request
 */
router.post('/deletion-requests/:id/process', async (req, res) => {
  try {
    await req.complianceService.processDeletionRequest(
      req.params.id,
      req.user?.id || 'SYSTEM',
    );

    res.json({
      success: true,
      message: 'Deletion request processed successfully',
    });
  } catch (error) {
    console.error('Error processing deletion request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deletion request',
    });
  }
});

// ==================== AUDIT LOG ENDPOINTS ====================

/**
 * GET /api/v1/compliance/audit-logs
 * Get audit logs with filters
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      actionType,
      performedBy,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const { logs, total } = await req.complianceService.getAuditLogs({
      entityType: entityType as any,
      entityId: entityId as string,
      actionType: actionType as any,
      performedBy: performedBy as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs',
    });
  }
});

// ==================== REPORT ENDPOINTS ====================

/**
 * POST /api/v1/compliance/reports
 * Create a new compliance report
 */
router.post('/reports', async (req, res) => {
  try {
    const input = CreateReportSchema.parse(req.body);
    const report = await req.complianceService.createReport({
      ...input,
      generatedBy: req.user?.id || 'SYSTEM',
      periodStart: input.periodStart ? new Date(input.periodStart) : undefined,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : undefined,
    });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
    });
  }
});

/**
 * POST /api/v1/compliance/reports/:id/generate
 * Generate a compliance report
 */
router.post('/reports/:id/generate', async (req, res) => {
  try {
    const report = await req.complianceService.generateReport(req.params.id);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
});

// ==================== RETENTION POLICY ENDPOINTS ====================

/**
 * POST /api/v1/compliance/retention-policies
 * Create a retention policy
 */
router.post('/retention-policies', async (req, res) => {
  try {
    const input = CreateRetentionPolicySchema.parse(req.body);
    const policy = await req.complianceService.createRetentionPolicy({
      ...input,
      createdBy: req.user?.id || 'SYSTEM',
    });

    res.status(201).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating retention policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create retention policy',
    });
  }
});

/**
 * POST /api/v1/compliance/retention-policies/:id/apply
 * Apply a retention policy
 */
router.post('/retention-policies/:id/apply', async (req, res) => {
  try {
    const policy = await req.complianceService.applyRetentionPolicy(req.params.id);

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    console.error('Error applying retention policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply retention policy',
    });
  }
});

// ==================== VIOLATION ENDPOINTS ====================

/**
 * POST /api/v1/compliance/violations
 * Create a compliance violation
 */
router.post('/violations', async (req, res) => {
  try {
    const input = CreateViolationSchema.parse(req.body);
    const violation = await req.complianceService.createViolation(input);

    res.status(201).json({
      success: true,
      data: violation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating violation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create violation',
    });
  }
});

/**
 * POST /api/v1/compliance/violations/:id/remediate
 * Remediate a violation
 */
router.post('/violations/:id/remediate', async (req, res) => {
  try {
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
      });
    }

    const violation = await req.complianceService.remediateViolation(
      req.params.id,
      action,
      req.user?.id || 'SYSTEM',
    );

    res.json({
      success: true,
      data: violation,
    });
  } catch (error) {
    console.error('Error remediating violation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remediate violation',
    });
  }
});

// ==================== DATA SUBJECT REQUEST ENDPOINTS ====================

/**
 * POST /api/v1/compliance/data-subject-requests
 * Create a data subject request
 */
router.post('/data-subject-requests', async (req, res) => {
  try {
    const input = CreateDataSubjectRequestSchema.parse(req.body);
    const request = await req.complianceService.createDataSubjectRequest({
      ...input,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: request,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating data subject request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create data subject request',
    });
  }
});

// ==================== METRICS ENDPOINT ====================

/**
 * GET /api/v1/compliance/metrics
 * Get compliance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await req.complianceService.getComplianceMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting compliance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance metrics',
    });
  }
});

export default router;
export { router as complianceRouter };
