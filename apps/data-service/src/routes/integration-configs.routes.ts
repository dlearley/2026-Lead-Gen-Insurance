import { Router, Request, Response } from 'express';
import { IntegrationConfigService } from '../services/integration-config.service.js';
import { CreateIntegrationConfigDto, UpdateIntegrationConfigDto, IntegrationConfigFilterParams } from '@insurance/types';
import logger from '../logger.js';

const router = Router();
const configService = new IntegrationConfigService();

/**
 * GET /api/v1/integration-configs
 * Get all integration configurations with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: IntegrationConfigFilterParams = {
      carrierId: req.query.carrierId as string,
      brokerId: req.query.brokerId as string,
      configType: req.query.configType as any,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      isEnabled: req.query.isEnabled === 'true' ? true : req.query.isEnabled === 'false' ? false : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await configService.getConfigs(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error getting integration configs', { error });
    res.status(500).json({ error: 'Failed to get integration configs' });
  }
});

/**
 * GET /api/v1/integration-configs/:id
 * Get a specific integration configuration by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await configService.getConfigById(id);

    if (!config) {
      return res.status(404).json({ error: 'Integration config not found' });
    }

    res.json(config);
  } catch (error) {
    logger.error('Error getting integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get integration config' });
  }
});

/**
 * GET /api/v1/integration-configs/type/:configType
 * Get configurations by type
 */
router.get('/type/:configType', async (req: Request, res: Response) => {
  try {
    const { configType } = req.params;
    const configs = await configService.getConfigsByType(configType as any);
    res.json({ data: configs });
  } catch (error) {
    logger.error('Error getting integration configs by type', { configType: req.params.configType, error });
    res.status(500).json({ error: 'Failed to get integration configs' });
  }
});

/**
 * POST /api/v1/integration-configs
 * Create a new integration configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateIntegrationConfigDto = req.body;

    // Validate config structure
    const validation = configService.validateConfigStructure(data.configType, data.config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration structure',
        details: validation.errors,
      });
    }

    const config = await configService.createConfig(data);
    res.status(201).json(config);
  } catch (error) {
    logger.error('Error creating integration config', { error });
    res.status(500).json({ error: 'Failed to create integration config' });
  }
});

/**
 * PUT /api/v1/integration-configs/:id
 * Update an existing integration configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateIntegrationConfigDto = req.body;

    // Validate config structure if provided
    if (data.config && data.configType) {
      const validation = configService.validateConfigStructure(data.configType, data.config);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid configuration structure',
          details: validation.errors,
        });
      }
    }

    const config = await configService.updateConfig(id, data);
    res.json(config);
  } catch (error) {
    logger.error('Error updating integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update integration config' });
  }
});

/**
 * PATCH /api/v1/integration-configs/:id
 * Partially update an integration configuration
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateIntegrationConfigDto = req.body;
    const config = await configService.updateConfig(id, data);
    res.json(config);
  } catch (error) {
    logger.error('Error patching integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to update integration config' });
  }
});

/**
 * DELETE /api/v1/integration-configs/:id
 * Delete an integration configuration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await configService.deleteConfig(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to delete integration config' });
  }
});

/**
 * POST /api/v1/integration-configs/:id/enable
 * Enable an integration configuration
 */
router.post('/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await configService.toggleConfigEnabled(id, true);
    res.json(config);
  } catch (error) {
    logger.error('Error enabling integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to enable integration config' });
  }
});

/**
 * POST /api/v1/integration-configs/:id/disable
 * Disable an integration configuration
 */
router.post('/:id/disable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await configService.toggleConfigEnabled(id, false);
    res.json(config);
  } catch (error) {
    logger.error('Error disabling integration config', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to disable integration config' });
  }
});

/**
 * GET /api/v1/integration-configs/template/:configType
 * Get configuration template for a type
 */
router.get('/template/:configType', async (req: Request, res: Response) => {
  try {
    const { configType } = req.params;
    const template = configService.getConfigTemplate(configType as any);
    res.json({ configType, template });
  } catch (error) {
    logger.error('Error getting config template', { configType: req.params.configType, error });
    res.status(500).json({ error: 'Failed to get config template' });
  }
});

export default router;
