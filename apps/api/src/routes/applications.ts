/**
 * Phase 30: Partner Ecosystem & Integrations
 * Partner application management API routes
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApplicationService } from '@insurance-platform/core';
import type { CreateApplicationRequest, SubmitApplicationRequest } from '@insurance-platform/types';

const router = Router();
const prisma = new PrismaClient();
const applicationService = new ApplicationService(prisma);

/**
 * GET /api/applications
 * List applications
 */
router.get('/', async (req, res, next) => {
  try {
    const { partnerId, status, search, limit, offset } = req.query;

    const result = await applicationService.listApplications({
      partnerId: partnerId as string,
      status: status as any,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.applications,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/applications/:id
 * Get application by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications
 * Create new application
 */
router.post('/', async (req, res, next) => {
  try {
    const { partnerId, ...appData } = req.body;
    const applicationData: CreateApplicationRequest = appData;

    const application = await applicationService.createApplication(partnerId, applicationData);

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/applications/:id
 * Update application
 */
router.put('/:id', async (req, res, next) => {
  try {
    const application = await applicationService.updateApplication(req.params.id, req.body);

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await applicationService.deleteApplication(req.params.id);

    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/submit
 * Submit application for approval
 */
router.post('/:id/submit', async (req, res, next) => {
  try {
    const submitData: SubmitApplicationRequest = req.body;

    const application = await applicationService.submitForApproval(req.params.id, submitData);

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/applications/:id/approve
 * Approve application (admin only)
 */
router.put('/:id/approve', async (req, res, next) => {
  try {
    const { approverId, comments } = req.body;

    const application = await applicationService.approveApplication(
      req.params.id,
      approverId,
      comments
    );

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/applications/:id/reject
 * Reject application (admin only)
 */
router.put('/:id/reject', async (req, res, next) => {
  try {
    const { approverId, reason } = req.body;

    const application = await applicationService.rejectApplication(
      req.params.id,
      approverId,
      reason
    );

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/publish
 * Publish application to marketplace
 */
router.post('/:id/publish', async (req, res, next) => {
  try {
    const application = await applicationService.publishApplication(req.params.id);

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/suspend
 * Suspend application
 */
router.post('/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const application = await applicationService.suspendApplication(req.params.id, reason);

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/deprecate
 * Deprecate application
 */
router.post('/:id/deprecate', async (req, res, next) => {
  try {
    const { sunsetDate } = req.body;

    const application = await applicationService.deprecateApplication(
      req.params.id,
      sunsetDate ? new Date(sunsetDate) : undefined
    );

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/applications/:id/statistics
 * Get application statistics
 */
router.get('/:id/statistics', async (req, res, next) => {
  try {
    const statistics = await applicationService.getApplicationStatistics(req.params.id);

    res.json({ success: true, data: statistics });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/validate
 * Run security validation
 */
router.post('/:id/validate', async (req, res, next) => {
  try {
    const validation = await applicationService.runSecurityValidation(req.params.id);

    res.json({ success: true, data: validation });
  } catch (error) {
    next(error);
  }
});

export default router;
