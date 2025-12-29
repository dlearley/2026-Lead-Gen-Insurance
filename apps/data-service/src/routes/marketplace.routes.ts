import { Router } from 'express';
import { MarketplaceService } from '../services/marketplace.service.js';
import { RevenueType, RevenueStatus } from '@insurance-lead-gen/types';

export function createMarketplaceRoutes(marketplaceService: MarketplaceService): Router {
  const router = Router();

  /**
   * Get all revenue entries
   */
  router.get('/revenue', async (req, res) => {
    try {
      const { type, status, brokerId, carrierId, startDate, endDate, limit, offset } = req.query;
      
      const result = await marketplaceService.getAllRevenue({
        type: type as RevenueType,
        status: status as RevenueStatus,
        brokerId: brokerId as string,
        carrierId: carrierId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch revenue entries', message: error.message });
    }
  });

  /**
   * Get revenue by ID
   */
  router.get('/revenue/:id', async (req, res) => {
    try {
      const revenue = await marketplaceService.getRevenueById(req.params.id);
      if (!revenue) {
        return res.status(404).json({ error: 'Revenue entry not found' });
      }
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch revenue entry', message: error.message });
    }
  });

  /**
   * Record new revenue
   */
  router.post('/revenue', async (req, res) => {
    try {
      const revenue = await marketplaceService.recordRevenue(req.body);
      res.status(201).json(revenue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record revenue', message: error.message });
    }
  });

  /**
   * Update revenue status
   */
  router.patch('/revenue/:id/status', async (req, res) => {
    try {
      const { status, metadata } = req.body;
      const revenue = await marketplaceService.updateRevenueStatus(req.params.id, status, metadata);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update revenue status', message: error.message });
    }
  });

  /**
   * Get ecosystem metrics
   */
  router.get('/metrics', async (req, res) => {
    try {
      const { days } = req.query;
      const metrics = await marketplaceService.getEcosystemMetrics(days ? parseInt(days as string) : undefined);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ecosystem metrics', message: error.message });
    }
  });

  /**
   * Generate platform fee
   */
  router.post('/fees/generate', async (req, res) => {
    try {
      const { sourceId, sourceType, transactionAmount, brokerId, feePercentage } = req.body;
      const fee = await marketplaceService.generatePlatformFee(
        sourceId,
        sourceType,
        transactionAmount,
        brokerId,
        feePercentage
      );
      res.status(201).json(fee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate platform fee', message: error.message });
    }
  });

  return router;
}
