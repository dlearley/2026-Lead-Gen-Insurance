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
const ccpaRequestSchema = z.object({
  userId: z.string(),
});

const deletionRequestSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

const optOutSchema = z.object({
  userId: z.string(),
  optOut: z.boolean(),
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
    resourceType: 'ccpa',
    status: 'failure',
    errorMessage: 'Forbidden: cannot perform action on another user',
    newValues: { targetUserId: userId },
  });

  res.status(403).json({ success: false, error: 'Forbidden' });
  return false;
}

/**
 * GET /api/v1/ccpa/know
 * Right to know (what data is collected)
 */
router.get('/know', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required',
      });
    }

    if (!(await enforceSameUserOrAdmin(req, res, userId, 'ccpa_know_denied'))) {
      return;
    }

    const exportRequest: DataExportRequest = {
      userId,
      format: 'json',
    };

    const data = await dataPrivacyService.exportUserData(exportRequest);
    const maskedData = maskCommonPIIFields(data);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'ccpa_right_to_know_requested',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
    });

    res.status(200).json({
      success: true,
      data: maskedData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/ccpa/delete
 * Right to delete
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const validatedRequest = deletionRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'ccpa_deletion_denied'))) {
      return;
    }

    const deletionRequest: DataDeletionRequest = {
      ...validatedRequest,
      requestedAt: new Date(),
    };

    await dataPrivacyService.requestDataDeletion(deletionRequest);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'ccpa_data_deletion_requested',
      resourceType: 'user',
      resourceId: validatedRequest.userId,
      status: 'success',
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
 * POST /api/v1/ccpa/opt-out
 * Right to opt-out of sale
 */
router.post('/opt-out', async (req: Request, res: Response) => {
  try {
    const validatedRequest = optOutSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'ccpa_optout_denied'))) {
      return;
    }

    dataPrivacyService.recordConsent({
      userId: validatedRequest.userId,
      purpose: 'sale_of_data',
      granted: !validatedRequest.optOut,
    });

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: validatedRequest.optOut ? 'ccpa_opt_out_sale' : 'ccpa_opt_in_sale',
      resourceType: 'user',
      resourceId: validatedRequest.userId,
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: `Successfully ${validatedRequest.optOut ? 'opted-out of' : 'opted-in to'} data sales`,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
