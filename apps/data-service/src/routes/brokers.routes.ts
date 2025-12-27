import { Router, Request, Response } from 'express';
import { BrokerIntegrationService } from '../services/broker-integration.service.js';
import { CreateBrokerDto, UpdateBrokerDto, BrokerFilterParams } from '@insurance/types';
import logger from '../logger.js';

const router = Router();
const brokerService = new BrokerIntegrationService();

/**
 * GET /api/v1/brokers
 * Get all brokers with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: BrokerFilterParams = {
      code: req.query.code as string,
      carrierId: req.query.carrierId as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      integrationType: req.query.integrationType as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await brokerService.getBrokers(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error getting brokers', { error });
    res.status(500).json({ error: 'Failed to get brokers' });
  }
});

/**
 * GET /api/v1/brokers/:id
 * Get a specific broker by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const broker = await brokerService.getBrokerById(id);

    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    res.json(broker);
  } catch (error) {
    logger.error('Error getting broker', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get broker' });
  }
});

/**
 * POST /api/v1/brokers
 * Create a new broker
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateBrokerDto = req.body;
    const broker = await brokerService.createBroker(data);
    res.status(201).json(broker);
  } catch (error) {
    logger.error('Error creating broker', { error });
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ error: 'Broker code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create broker' });
    }
  }
});

/**
 * PUT /api/v1/brokers/:id
 * Update an existing broker
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateBrokerDto = req.body;
    const broker = await brokerService.updateBroker(id, data);
    res.json(broker);
  } catch (error) {
    logger.error('Error updating broker', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update broker' });
  }
});

/**
 * PATCH /api/v1/brokers/:id
 * Partially update a broker
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateBrokerDto = req.body;
    const broker = await brokerService.updateBroker(id, data);
    res.json(broker);
  } catch (error) {
    logger.error('Error patching broker', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update broker' });
  }
});

/**
 * DELETE /api/v1/brokers/:id
 * Delete a broker
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await brokerService.deleteBroker(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting broker', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to delete broker' });
  }
});

/**
 * POST /api/v1/brokers/:id/test
 * Test broker integration
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await brokerService.testBrokerIntegration(id);
    res.json(result);
  } catch (error) {
    logger.error('Error testing broker integration', { id: req.params.id, error });
    res.status(500).json({
      error: 'Failed to test broker integration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/brokers/:id/health
 * Get broker health status
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const health = await brokerService.getBrokerHealth(id);
    res.json(health);
  } catch (error) {
    logger.error('Error getting broker health', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get broker health' });
  }
});

/**
 * POST /api/v1/brokers/:id/leads
 * Submit a lead to a broker
 */
router.post('/:id/leads', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissionRequest = {
      leadId: req.body.leadId,
      carrierId: req.body.carrierId,
      brokerId: id,
      submissionData: req.body.submissionData,
      priority: req.body.priority,
      scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
    };

    const result = await brokerService.submitLead(submissionRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error submitting lead to broker', { id: req.params.id, error });
    res.status(500).json({
      error: 'Failed to submit lead to broker',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
