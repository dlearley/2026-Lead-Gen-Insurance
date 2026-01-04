/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing */
import { Router, Request, Response } from 'express';
import {
  dataPrivacyService,
  maskCommonPIIFields,
  type DataExportRequest,
  type DataDeletionRequest,
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

const consentSchema = z.object({
  userId: z.string(),
  purpose: z.string(),
  granted: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

function isAdmin(req: Request): boolean {
  return req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
}

async function enforceSameUserOrAdmin(req: Request, res: Response, userId: string, action: string): Promise<boolean> {
  if (req.user?.id === userId || isAdmin(req)) {
    return true;
  }

  await auditLogService.logCritical({
    ...buildAuditContext(req),
    action,
    resourceType: 'privacy',
    status: 'failure',
    errorMessage: 'Forbidden: cannot perform action on another user',
    newValues: { targetUserId: userId },
  });

  res.status(403).json({ success: false, error: 'Forbidden' });
  return false;
}

// POST /api/v1/privacy/export - Export user data (GDPR Article 20 - Right to data portability)
router.post('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedRequest = exportRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'privacy_export_denied'))) {
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
      action: 'data_export_requested',
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

// POST /api/v1/privacy/delete - Request data deletion (GDPR Article 17 - Right to be forgotten)
router.post('/delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedRequest = deletionRequestSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedRequest.userId, 'privacy_deletion_denied'))) {
      return;
    }

    const deletionRequest: DataDeletionRequest = {
      ...validatedRequest,
      requestedAt: new Date(),
    };

    await dataPrivacyService.requestDataDeletion(deletionRequest);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'data_deletion_requested',
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

// GET /api/v1/privacy/consent/:userId - Get user consent status
router.get('/consent/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { purpose } = req.query;

    if (!purpose || typeof purpose !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Purpose query parameter is required',
      });
      return;
    }

    if (!(await enforceSameUserOrAdmin(req, res, userId, 'privacy_consent_read_denied'))) {
      return;
    }

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'consent_status_read',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
      newValues: { purpose },
    });

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

// POST /api/v1/privacy/consent - Record user consent
router.post('/consent', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedConsent = consentSchema.parse(req.body);

    if (!(await enforceSameUserOrAdmin(req, res, validatedConsent.userId, 'privacy_consent_write_denied'))) {
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
      action: validatedConsent.granted ? 'consent_granted' : 'consent_denied',
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

// DELETE /api/v1/privacy/consent/:userId - Withdraw consent
router.delete('/consent/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { purpose } = req.query;

    if (!purpose || typeof purpose !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Purpose query parameter is required',
      });
      return;
    }

    if (!(await enforceSameUserOrAdmin(req, res, userId, 'privacy_consent_withdraw_denied'))) {
      return;
    }

    dataPrivacyService.withdrawConsent(userId, purpose);

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'consent_withdrawn',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
      newValues: { purpose },
    });

    res.status(200).json({
      success: true,
      message: 'Consent withdrawn successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/v1/privacy/notice - Get privacy notice
router.get('/notice', (req: Request, res: Response): void => {
  const purposes = [
    'Lead qualification and scoring',
    'Agent matching and routing',
    'Communication with insurance agents',
    'Analytics and reporting',
    'Legal compliance',
  ];

  const notice = dataPrivacyService.generatePrivacyNotice(purposes);

  res.status(200).send(notice);
});

// GET /api/v1/privacy/report - Get GDPR compliance report (Admin only)
router.get('/report', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  const report = dataPrivacyService.generateGDPRReport();

  await auditLogService.logCritical({
    ...buildAuditContext(req),
    action: 'gdpr_report_viewed',
    resourceType: 'privacy',
    status: 'success',
  });

  res.status(200).json({
    success: true,
    report,
  });
});

export default router;
