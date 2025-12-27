// Partner Routes - API endpoints for partner management
import express from 'express';
import { PartnerService } from '../services/partner.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { partnerSchemas } from '../validation/partner.validation';

const router = express.Router();

// Partner Routes
router.post(
  '/',
  authenticate,
  authorize(['ADMIN']),
  validate(partnerSchemas.createPartner),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.create(req.body);
      res.status(201).json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.getById(req.params.id);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/email/:email',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.getByEmail(req.params.email);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/referral-code/:referralCode',
  authenticate,
  async (req, res, next) => {
    try {
      const partner = await PartnerService.getByReferralCode(req.params.referralCode);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  authorize(['ADMIN']),
  validate(partnerSchemas.getPartners),
  async (req, res, next) => {
    try {
      const partners = await PartnerService.getAll(req.query);
      res.json(partners);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  validate(partnerSchemas.updatePartner),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.update(req.params.id, req.body);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.delete(req.params.id);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

// Partner Statistics
router.get(
  '/statistics',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const statistics = await PartnerService.getStatistics();
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/top',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topPartners = await PartnerService.getTopPartners(limit);
      res.json(topPartners);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/performance',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const performance = await PartnerService.getPerformanceSummary(req.params.id);
      res.json(performance);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/statistics',
  authenticate,
  authorize(['ADMIN']),
  validate(partnerSchemas.updateStatistics),
  async (req, res, next) => {
    try {
      const partner = await PartnerService.updateStatistics(req.params.id, req.body);
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/validate-referral-code/:referralCode',
  async (req, res, next) => {
    try {
      const isValid = await PartnerService.validateReferralCode(req.params.referralCode);
      res.json({ valid: isValid });
    } catch (error) {
      next(error);
    }
  }
);

export default router;