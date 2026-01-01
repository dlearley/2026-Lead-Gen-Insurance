import { Router } from 'express';
import prisma from '../db/prisma.js';
import {
  ExperimentService,
  VariantAssignmentService,
  StatisticalTestingService,
  ExperimentAnalyticsService,
} from '@insurance-lead-gen/core';

const router = Router();
const experimentService = new ExperimentService(prisma);
const variantAssignmentService = new VariantAssignmentService(prisma);
const statisticalTestingService = new StatisticalTestingService(prisma);
const experimentAnalyticsService = new ExperimentAnalyticsService(prisma);

router.post('/', async (req, res) => {
  try {
    const experiment = await experimentService.createExperiment(req.body);
    res.status(201).json({ success: true, data: experiment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/results', async (req, res) => {
  try {
    const results = await experimentAnalyticsService.getExperimentResults(req.params.id);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/finalize', async (req, res) => {
  try {
    await experimentService.finalizeExperiment(req.params.id, req.body.winningVariantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    const variantId = await variantAssignmentService.assignVariant(req.body.leadId, req.params.id);
    res.json({ success: true, data: { variantId } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const results = await statisticalTestingService.runAnalysis(req.params.id);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as experimentsRouter };
