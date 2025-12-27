// Reward Routes - API endpoints for reward management
import express from 'express';
import { RewardService } from '../services/reward.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { rewardSchemas } from '../validation/reward.validation';

const router = express.Router();

// Reward Routes
router.post(
  '/',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.createReward),
  async (req, res, next) => {
    try {
      const reward = await RewardService.create(req.body);
      res.status(201).json(reward);
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
      const reward = await RewardService.getById(req.params.id);
      res.json(reward);
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
      const rewards = await RewardService.getByPartnerId(req.params.partnerId);
      res.json(rewards);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/referral/:referralId',
  authenticate,
  authorize(['ADMIN', 'PARTNER']),
  async (req, res, next) => {
    try {
      const reward = await RewardService.getByReferralId(req.params.referralId);
      res.json(reward);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.getRewards),
  async (req, res, next) => {
    try {
      const rewards = await RewardService.getAll(req.query);
      res.json(rewards);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.updateReward),
  async (req, res, next) => {
    try {
      const reward = await RewardService.update(req.params.id, req.body);
      res.json(reward);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/calculate',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.calculateReward),
  async (req, res, next) => {
    try {
      const reward = await RewardService.calculateReward(req.params.id, req.body.conversionValue);
      res.json(reward);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/process-payment',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.processPayment),
  async (req, res, next) => {
    try {
      const reward = await RewardService.processPayment(req.params.id, req.body);
      res.json(reward);
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
      const reward = await RewardService.delete(req.params.id);
      res.json(reward);
    } catch (error) {
      next(error);
    }
  }
);

// Reward Statistics
router.get(
  '/statistics',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const statistics = await RewardService.getStatistics();
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
      const statistics = await RewardService.getStatisticsByPartner(req.params.partnerId);
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/status-distribution',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const distribution = await RewardService.getStatusDistribution();
      res.json(distribution);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/pending',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const rewards = await RewardService.getPendingRewards();
      res.json(rewards);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/payment-summary',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const summary = await RewardService.getPaymentSummary();
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/bulk-approve',
  authenticate,
  authorize(['ADMIN']),
  validate(rewardSchemas.bulkApprove),
  async (req, res, next) => {
    try {
      const count = await RewardService.bulkApprove(req.body.rewardIds);
      res.json({ approvedCount: count });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/payout-history',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const partnerId = req.query.partnerId as string;
      const history = await RewardService.getPayoutHistory(partnerId, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

export default router;