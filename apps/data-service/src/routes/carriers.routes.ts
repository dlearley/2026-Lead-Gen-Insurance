import express from 'express';
import { CarrierService } from '../services/carrier-service.js';
import { logger } from '@insurance-lead-gen/core';

export function createCarrierRoutes(carrierService: CarrierService): express.Router {
  const router = express.Router();

  // Create a new carrier
  router.post('/', async (req, res) => {
    try {
      const carrier = await carrierService.createCarrier(req.body);
      logger.info('Carrier created via API', { carrierId: carrier.id });
      res.status(201).json(carrier);
    } catch (error) {
      logger.error('Failed to create carrier via API', { error });
      res.status(500).json({ error: 'Failed to create carrier' });
    }
  });

  // Get all carriers
  router.get('/', async (req, res) => {
    try {
      const filters = {
        name: req.query.name as string | undefined,
        partnershipStatus: req.query.partnershipStatus as any,
        partnershipTier: req.query.partnershipTier as any,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        integrationEnabled: req.query.integrationEnabled === 'true' ? true : req.query.integrationEnabled === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const carriers = await carrierService.getAllCarriers(filters);
      res.json(carriers);
    } catch (error) {
      logger.error('Failed to get carriers via API', { error });
      res.status(500).json({ error: 'Failed to get carriers' });
    }
  });

  // Get carrier by ID
  router.get('/:id', async (req, res) => {
    try {
      const carrier = await carrierService.getCarrierById(req.params.id);
      if (!carrier) {
        return res.status(404).json({ error: 'Carrier not found' });
      }
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to get carrier via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to get carrier' });
    }
  });

  // Get carrier with performance metrics
  router.get('/:id/performance', async (req, res) => {
    try {
      const carrier = await carrierService.getCarrierWithPerformance(req.params.id);
      if (!carrier) {
        return res.status(404).json({ error: 'Carrier not found' });
      }
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to get carrier performance via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to get carrier performance' });
    }
  });

  // Update carrier
  router.put('/:id', async (req, res) => {
    try {
      const carrier = await carrierService.updateCarrier(req.params.id, req.body);
      logger.info('Carrier updated via API', { carrierId: carrier.id });
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to update carrier via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to update carrier' });
    }
  });

  // Delete carrier
  router.delete('/:id', async (req, res) => {
    try {
      const carrier = await carrierService.deleteCarrier(req.params.id);
      logger.info('Carrier deleted via API', { carrierId: carrier.id });
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to delete carrier via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to delete carrier' });
    }
  });

  // Create performance metric
  router.post('/:id/performance', async (req, res) => {
    try {
      const metric = await carrierService.createPerformanceMetric({
        carrierId: req.params.id,
        ...req.body,
      });
      logger.info('Carrier performance metric created via API', { metricId: metric.id });
      res.status(201).json(metric);
    } catch (error) {
      logger.error('Failed to create carrier performance metric via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to create performance metric' });
    }
  });

  // Get performance metrics
  router.get('/:id/performance/metrics', async (req, res) => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;

      const metrics = await carrierService.getPerformanceMetrics(req.params.id, year, month);
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get carrier performance metrics via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });

  // Update performance metric
  router.put('/:id/performance/metrics/:metricId', async (req, res) => {
    try {
      const metric = await carrierService.updatePerformanceMetric(req.params.metricId, req.body);
      logger.info('Carrier performance metric updated via API', { metricId: metric.id });
      res.json(metric);
    } catch (error) {
      logger.error('Failed to update carrier performance metric via API', { error, metricId: req.params.metricId });
      res.status(500).json({ error: 'Failed to update performance metric' });
    }
  });

  // Calculate performance score
  router.post('/:id/performance/calculate', async (req, res) => {
    try {
      const score = await carrierService.calculatePerformanceScore(req.params.id);
      res.json({ carrierId: req.params.id, performanceScore: score });
    } catch (error) {
      logger.error('Failed to calculate performance score via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to calculate performance score' });
    }
  });

  // Get top performing carriers
  router.get('/top-performing', async (req, res) => {
    try {
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 20) : 5;
      const carriers = await carrierService.getTopPerformingCarriers(limit);
      res.json(carriers);
    } catch (error) {
      logger.error('Failed to get top performing carriers via API', { error });
      res.status(500).json({ error: 'Failed to get top performing carriers' });
    }
  });

  // Get carriers needing attention
  router.get('/needing-attention', async (req, res) => {
    try {
      const carriers = await carrierService.getCarriersNeedingAttention();
      res.json(carriers);
    } catch (error) {
      logger.error('Failed to get carriers needing attention via API', { error });
      res.status(500).json({ error: 'Failed to get carriers needing attention' });
    }
  });

  // Update partnership tier
  router.put('/:id/partnership-tier', async (req, res) => {
    try {
      const { tier } = req.body;
      const carrier = await carrierService.updateCarrierPartnershipTier(req.params.id, tier);
      logger.info('Carrier partnership tier updated via API', { carrierId: carrier.id, newTier: tier });
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to update carrier partnership tier via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to update partnership tier' });
    }
  });

  // Update partnership status
  router.put('/:id/partnership-status', async (req, res) => {
    try {
      const { status } = req.body;
      const carrier = await carrierService.updateCarrierPartnershipStatus(req.params.id, status);
      logger.info('Carrier partnership status updated via API', { carrierId: carrier.id, newStatus: status });
      res.json(carrier);
    } catch (error) {
      logger.error('Failed to update carrier partnership status via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to update partnership status' });
    }
  });

  // Get performance trends
  router.get('/:id/performance/trends', async (req, res) => {
    try {
      const months = req.query.months ? Math.min(Number(req.query.months), 24) : 6;
      const trends = await carrierService.getCarrierPerformanceTrends(req.params.id, months);
      res.json(trends);
    } catch (error) {
      logger.error('Failed to get carrier performance trends via API', { error, carrierId: req.params.id });
      res.status(500).json({ error: 'Failed to get performance trends' });
    }
  });

  // Get carrier comparison report
  router.post('/compare', async (req, res) => {
    try {
      const { carrierIds } = req.body;
      if (!Array.isArray(carrierIds) || carrierIds.length === 0) {
        return res.status(400).json({ error: 'carrierIds must be a non-empty array' });
      }

      const comparison = await carrierService.getCarrierComparisonReport(carrierIds);
      res.json(comparison);
    } catch (error) {
      logger.error('Failed to get carrier comparison report via API', { error });
      res.status(500).json({ error: 'Failed to get carrier comparison report' });
    }
  });

  return router;
}