/**
 * Phase 30: Partner Ecosystem & Integrations
 * Partner management API routes
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PartnerService } from '@insurance-platform/core';
import type { CreatePartnerRequest, UpdatePartnerRequest } from '@insurance-platform/types';

const router = Router();
const prisma = new PrismaClient();
const partnerService = new PartnerService(prisma);

/**
 * GET /api/partners
 * List all partners with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, type, tier, search, limit, offset } = req.query;

    const result = await partnerService.listPartners({
      status: status as any,
      type: type as any,
      tier: tier as any,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.partners,
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
 * GET /api/partners/:id
 * Get partner by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const partner = await partnerService.getPartnerById(req.params.id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Partner not found' },
      });
    }

    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/partners
 * Create new partner (admin only)
 */
router.post('/', async (req, res, next) => {
  try {
    const partnerData: CreatePartnerRequest = req.body;

    const partner = await partnerService.createPartner(partnerData);

    res.status(201).json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/partners/:id
 * Update partner
 */
router.put('/:id', async (req, res, next) => {
  try {
    const updates: UpdatePartnerRequest = req.body;

    const partner = await partnerService.updatePartner(req.params.id, updates);

    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/partners/:id
 * Delete partner (admin only)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await partnerService.deletePartner(req.params.id);

    res.json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/partners/:id/activate
 * Activate partner
 */
router.post('/:id/activate', async (req, res, next) => {
  try {
    const partner = await partnerService.activatePartner(req.params.id);

    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/partners/:id/suspend
 * Suspend partner
 */
router.post('/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const partner = await partnerService.suspendPartner(req.params.id, reason);

    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/partners/:id/contacts
 * Get partner contacts
 */
router.get('/:id/contacts', async (req, res, next) => {
  try {
    const contacts = await partnerService.getContacts(req.params.id);

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/partners/:id/contacts
 * Add partner contact
 */
router.post('/:id/contacts', async (req, res, next) => {
  try {
    const contact = await partnerService.addContact(req.params.id, req.body);

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/partners/:id/agreements
 * Get partner agreements
 */
router.get('/:id/agreements', async (req, res, next) => {
  try {
    const agreements = await partnerService.getAgreements(req.params.id);

    res.json({ success: true, data: agreements });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/partners/:id/agreements
 * Create partner agreement
 */
router.post('/:id/agreements', async (req, res, next) => {
  try {
    const agreement = await partnerService.createAgreement(req.params.id, req.body);

    res.status(201).json({ success: true, data: agreement });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/partners/:id/agreements/:agreementId/sign
 * Sign agreement
 */
router.put('/:id/agreements/:agreementId/sign', async (req, res, next) => {
  try {
    const { signedDate } = req.body;

    const agreement = await partnerService.signAgreement(
      req.params.agreementId,
      signedDate ? new Date(signedDate) : new Date()
    );

    res.json({ success: true, data: agreement });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/partners/:id/statistics
 * Get partner statistics
 */
router.get('/:id/statistics', async (req, res, next) => {
  try {
    const statistics = await partnerService.getPartnerStatistics(req.params.id);

    res.json({ success: true, data: statistics });
  } catch (error) {
    next(error);
  }
});

export default router;
