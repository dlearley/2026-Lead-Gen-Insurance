import { Router, Request, Response } from 'express';
import { CarrierIntegrationService } from '../services/carrier-integration.service.js';
import { CreateInsuranceCarrierDto, UpdateInsuranceCarrierDto, InsuranceCarrierFilterParams } from '@insurance/types';
import logger from '../logger.js';

const router = Router();
const carrierService = new CarrierIntegrationService();

/**
 * GET /api/v1/carriers
 * Get all insurance carriers with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: InsuranceCarrierFilterParams = {
      code: req.query.code as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      integrationType: req.query.integrationType as any,
      isPrimary: req.query.isPrimary === 'true' ? true : req.query.isPrimary === 'false' ? false : undefined,
      supportedProduct: req.query.supportedProduct as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await carrierService.getCarriers(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error getting carriers', { error });
    res.status(500).json({ error: 'Failed to get carriers' });
  }
});

/**
 * GET /api/v1/carriers/:id
 * Get a specific carrier by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const carrier = await carrierService.getCarrierById(id);

    if (!carrier) {
      return res.status(404).json({ error: 'Carrier not found' });
    }

    res.json(carrier);
  } catch (error) {
    logger.error('Error getting carrier', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get carrier' });
  }
});

/**
 * POST /api/v1/carriers
 * Create a new insurance carrier
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateInsuranceCarrierDto = req.body;
    const carrier = await carrierService.createCarrier(data);
    res.status(201).json(carrier);
  } catch (error) {
    logger.error('Error creating carrier', { error });
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ error: 'Carrier code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create carrier' });
    }
  }
});

/**
 * PUT /api/v1/carriers/:id
 * Update an existing carrier
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateInsuranceCarrierDto = req.body;
    const carrier = await carrierService.updateCarrier(id, data);
    res.json(carrier);
  } catch (error) {
    logger.error('Error updating carrier', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update carrier' });
  }
});

/**
 * PATCH /api/v1/carriers/:id
 * Partially update a carrier
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateInsuranceCarrierDto = req.body;
    const carrier = await carrierService.updateCarrier(id, data);
    res.json(carrier);
  } catch (error) {
    logger.error('Error patching carrier', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update carrier' });
  }
});

/**
 * DELETE /api/v1/carriers/:id
 * Delete a carrier
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await carrierService.deleteCarrier(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting carrier', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to delete carrier' });
  }
});

/**
 * POST /api/v1/carriers/:id/test
 * Test carrier integration
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await carrierService.testCarrierIntegration(id);
    res.json(result);
  } catch (error) {
    logger.error('Error testing carrier integration', { id: req.params.id, error });
    res.status(500).json({
      error: 'Failed to test carrier integration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/carriers/:id/health
 * Get carrier health status
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const health = await carrierService.getCarrierHealth(id);
    res.json(health);
  } catch (error) {
    logger.error('Error getting carrier health', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get carrier health' });
  }
});

/**
 * POST /api/v1/carriers/:id/leads
 * Submit a lead to a carrier
 */
router.post('/:id/leads', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissionRequest = {
      leadId: req.body.leadId,
      carrierId: id,
      brokerId: req.body.brokerId,
      submissionData: req.body.submissionData,
      priority: req.body.priority,
      scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
    };

    const result = await carrierService.submitLead(submissionRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error submitting lead to carrier', { id: req.params.id, error });
    res.status(500).json({
      error: 'Failed to submit lead to carrier',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
