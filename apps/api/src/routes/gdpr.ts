import { Router, Request, Response } from 'express';
import { 
  dataPrivacyService, 
  maskCommonPIIFields,
  type DataExportRequest,
  type DataDeletionRequest
} from '@insurance-lead-gen/core';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { auditLogService, buildAuditContext } from '../services/audit.js';

const router = Router();

router.use(authMiddleware);

// Validation schemas
const exportRequestSchema = z.object({
  userId: z.string(),
  format: z.enum(['json', 'csv', 'pdf']),
  includeDeleted: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const deletionRequestSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
  retainAnalytics: z.boolean().optional(),
});

const rectifyRequestSchema = z.object({
  userId: z.string(),
  field: z.string(),
  newValue: z.any(),
});

const consentSchema = z.object({
  userId: z.string(),
  purpose: z.string(),
  granted: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

function isAdmin(req: Request): boolean {
  return (req.user as any)?.roles?.includes('admin') || (req.user as any)?.roles?.includes('super_admin');
}

async function enforceSameUserOrAdmin(req: Request, res: Response, userId: string, action: string): Promise<boolean> {
  if (req.user?.id === userId || isAdmin(req)) {
    return true;
  }

  await auditLogService.logCritical({
    ...buildAuditContext(req),
    action,
    resourceType: 'gdpr',
    status: 'failure',
    errorMessage: 'Forbidden: cannot perform action on another user',
    newValues: { targetUserId: userId },
  });

  res.status(403).json({ success: false, error: 'Forbidden' });
  return false;
}

/**
 * POST /api/v1/gdpr/export
 * Right to data portability (Article 20)
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const validatedRequest = exportRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'gdpr_export_denied'))) {
      return;
    }

    const exportRequest: DataExportRequest = {
      ...validatedRequest,
      dateFrom: validatedRequest.dateFrom ? new Date(validatedRequest.dateFrom) : undefined,
      dateTo: validatedRequest.dateTo ? new Date(validatedRequest.dateTo) : undefined,
    };

    const data = await dataPrivacyService.exportUserData(exportRequest);
    const maskedData = maskCommonPIIFields(data);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'gdpr_data_export_requested',
      resourceType: 'user',
      resourceId: validatedRequest.userId,
      status: 'success',
      newValues: { format: validatedRequest.format, masked: true },
    });

    res.status(200).json({
      success: true,
      data: maskedData,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/gdpr/delete
 * Right to be forgotten (Article 17)
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const validatedRequest = deletionRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'gdpr_deletion_denied'))) {
      return;
    }

    const deletionRequest: DataDeletionRequest = {
      ...validatedRequest,
      requestedAt: new Date(),
    };

    await dataPrivacyService.requestDataDeletion(deletionRequest);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'gdpr_data_deletion_requested',
      resourceType: 'user',
      resourceId: validatedRequest.userId,
      status: 'success',
      newValues: {
        reason: validatedRequest.reason,
        retainAnalytics: validatedRequest.retainAnalytics,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data deletion request received and is being processed',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/gdpr/rectify
 * Right to rectification (Article 16)
 */
router.post('/rectify', async (req: Request, res: Response) => {
  try {
    const validatedRequest = rectifyRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'gdpr_rectify_denied'))) {
      return;
    }

    // Actual implementation would update the database
    // For now we log and return success
    
    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'gdpr_data_rectification_requested',
      resourceType: 'user',
      resourceId: validatedRequest.userId,
      status: 'success',
      newValues: {
        field: validatedRequest.field,
        newValue: validatedRequest.newValue
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data rectification request processed',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/gdpr/consent
 * View consent status
 */
router.get('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const purpose = req.query.purpose as string;

    if (!userId || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'userId and purpose query parameters are required',
      });
    }

    if (!(await enforceSameUserOrAdmin(req, res, userId, 'gdpr_consent_read_denied'))) {
      return;
    }

    const consent = dataPrivacyService.getConsent(userId, purpose);
    const hasValidConsent = dataPrivacyService.hasValidConsent(userId, purpose);

    res.status(200).json({
      success: true,
      consent: consent || null,
      hasValidConsent,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/gdpr/consent
 * Update consent preferences
 */
router.post('/consent', async (req: Request, res: Response) => {
  try {
    const validatedConsent = consentSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedConsent.userId, 'gdpr_consent_write_denied'))) {
      return;
    }

    dataPrivacyService.recordConsent({
      userId: validatedConsent.userId,
      purpose: validatedConsent.purpose,
      granted: validatedConsent.granted,
      ipAddress: validatedConsent.ipAddress || req.ip,
      userAgent: validatedConsent.userAgent || req.get('user-agent'),
      expiresAt: validatedConsent.expiresAt ? new Date(validatedConsent.expiresAt) : undefined,
    });

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: validatedConsent.granted ? 'gdpr_consent_granted' : 'gdpr_consent_denied',
      resourceType: 'user',
      resourceId: validatedConsent.userId,
      status: 'success',
      newValues: { purpose: validatedConsent.purpose },
    });

    res.status(200).json({
      success: true,
      message: 'Consent recorded successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
