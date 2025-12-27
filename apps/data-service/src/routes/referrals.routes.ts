// Referral Routes - API endpoints for referral management
import express from 'express';
import { ReferralService } from '../services/referral.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { referralSchemas } from '../validation/referral.validation';

const router = express.Router();

// Referral Routes
router.post(
  '/',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  validate(referralSchemas.createReferral),
  async (req, res, next) => {
    try {
      const referral = await ReferralService.create(req.body);
      res.status(201).json(referral);
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
      const referral = await ReferralService.getById(req.params.id);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/partner/:partnerId',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const referrals = await ReferralService.getByPartnerId(req.params.partnerId);
      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/lead/:leadId',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const referral = await ReferralService.getByLeadId(req.params.leadId);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/referral-code/:referralCode',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const referrals = await ReferralService.getByReferralCode(req.params.referralCode);
      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  authorize(['ADMIN']),
  validate(referralSchemas.getReferrals),
  async (req, res, next) => {
    try {
      const referrals = await ReferralService.getAll(req.query);
      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  validate(referralSchemas.updateReferral),
  async (req, res, next) => {
    try {
      const referral = await ReferralService.update(req.params.id, req.body);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/link-to-lead',
  authenticate,
  authorize(['ADMIN']),
  validate(referralSchemas.linkToLead),
  async (req, res, next) => {
    try {
      const referral = await ReferralService.linkToLead(req.params.id, req.body.leadId);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/process-conversion',
  authenticate,
  authorize(['ADMIN']),
  validate(referralSchemas.processConversion),
  async (req, res, next) => {
    try {
      const result = await ReferralService.processConversion(req.params.id, req.body.conversionValue);
      res.json(result);
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
      const referral = await ReferralService.delete(req.params.id);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

// Referral Statistics
router.get(
  '/statistics',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const statistics = await ReferralService.getStatistics();
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/statistics/partner/:partnerId',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const statistics = await ReferralService.getStatisticsByPartner(req.params.partnerId);
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/source-distribution',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const distribution = await ReferralService.getSourceDistribution();
      res.json(distribution);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/conversion-analytics',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const analytics = await ReferralService.getConversionAnalytics();
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/check-expired',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const expiryDays = parseInt(req.body.expiryDays as string) || 30;
      const count = await ReferralService.checkExpiredReferrals(expiryDays);
      res.json({ expiredReferrals: count });
    } catch (error) {
      next(error);
    }
  }
);

export default router;