import { Router } from 'express';
import { MLModelService, logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const modelService = new MLModelService();

// List all models
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await modelService.getActiveModels();
    res.json(result);
  } catch (error) {
    logger.error('Error listing models', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get model details
router.get('/:modelId', authMiddleware, async (req, res) => {
  try {
    // This is a placeholder, you might want to add getModelById to the service
    res.json({ id: req.params.modelId, name: 'Sample Model' });
  } catch (error) {
    logger.error('Error fetching model details', { error, modelId: req.params.modelId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate model
router.post('/:modelId/activate', authMiddleware, async (req, res) => {
  try {
    await modelService.activateModel(req.params.modelId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error activating model', { error, modelId: req.params.modelId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate model
router.post('/:modelId/deactivate', authMiddleware, async (req, res) => {
  try {
    await modelService.deactivateModel(req.params.modelId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deactivating model', { error, modelId: req.params.modelId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get model metrics
router.get('/:modelId/metrics', authMiddleware, async (req, res) => {
  try {
    const result = await modelService.evaluateModel(req.params.modelId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching model metrics', { error, modelId: req.params.modelId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feature importance
router.get('/:modelId/features', authMiddleware, async (req, res) => {
  try {
    const result = await modelService.getFeatureImportance(req.params.modelId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching feature importance', { error, modelId: req.params.modelId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start training job
router.post('/training', authMiddleware, async (req, res) => {
  try {
    const { modelType, config } = req.body;
    const result = await modelService.startTrainingJob(modelType, config);
    res.json(result);
  } catch (error) {
    logger.error('Error starting training job', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get training status
router.get('/training/:jobId', authMiddleware, async (req, res) => {
  try {
    const result = await modelService.getTrainingStatus(req.params.jobId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching training status', { error, jobId: req.params.jobId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel training job
router.post('/training/:jobId/cancel', authMiddleware, async (req, res) => {
  try {
    await modelService.cancelTrainingJob(req.params.jobId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling training job', { error, jobId: req.params.jobId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
