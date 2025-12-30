import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { oAuthService, csvImportService, validationService, deduplicationService } from '@insurance-lead-gen/core';
import {
  CreateCrmIntegrationDto,
  UpdateCrmIntegrationDto,
  CrmProvider,
} from '@insurance-lead-gen/types';
import { CrmIntegrationService } from '../services/crm-integration.service.js';
import { prisma } from '../prisma/client.js';

const router = Router();
const crmService = new CrmIntegrationService(prisma);

const createIntegrationSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE', 'ZOHO', 'MICROSOFT_DYNAMICS']),
  isActive: z.boolean().optional(),
  syncDirection: z.enum(['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL']).optional(),
  syncFrequency: z.number().int().positive().optional(),
  autoSync: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateIntegrationSchema = createIntegrationSchema.partial().omit({ provider: true });

// CRUD Endpoints
router.post('/integrations', async (req: Request, res: Response) => {
  try {
    const data = createIntegrationSchema.parse(req.body) as CreateCrmIntegrationDto;
    const integration = await crmService.createIntegration(data);
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('Error creating CRM integration', { error });
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/integrations', async (req: Request, res: Response) => {
  try {
    const integrations = await crmService.getIntegrations({
      provider: req.query.provider as CrmProvider,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      isConnected: req.query.isConnected ? req.query.isConnected === 'true' : undefined,
      syncStatus: req.query.syncStatus as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, ...integrations });
  } catch (error) {
    logger.error('Error listing CRM integrations', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const integration = await crmService.getIntegrationById(req.params.id);
    if (!integration) {
      return res.status(404).json({ success: false, error: 'Integration not found' });
    }
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('Error getting CRM integration', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const data = updateIntegrationSchema.parse(req.body) as UpdateCrmIntegrationDto;
    const integration = await crmService.updateIntegration(req.params.id, data);
    res.json({ success: true, data: integration });
  } catch (error) {
    logger.error('Error updating CRM integration', { error });
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.delete('/integrations/:id', async (req: Request, res: Response) => {
  try {
    await crmService.deleteIntegration(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting CRM integration', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// OAuth Endpoints
router.get('/oauth/:provider/authorize', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider.toUpperCase() as CrmProvider;
    const integrationId = req.query.integrationId as string | undefined;
    const returnUrl = req.query.returnUrl as string | undefined;

    const authUrl = oAuthService.getAuthorizationUrl(provider, {
      integrationId,
      returnUrl,
    });

    res.json({ success: true, data: { url: authUrl } });
  } catch (error) {
    logger.error('Error generating OAuth URL', { error });
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider.toUpperCase() as CrmProvider;
    const code = req.query.code as string;
    const state = req.query.state as string | undefined;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }

    const stateData = state ? oAuthService.parseState(state) : null;
    const token = await oAuthService.exchangeCodeForToken(provider, code);

    if (stateData?.integrationId) {
      await crmService.updateIntegration(stateData.integrationId, {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000),
        instanceUrl: token.instanceUrl,
      });

      await crmService.updateConnectionStatus(stateData.integrationId, true);
    }

    res.json({
      success: true,
      data: {
        provider,
        connected: true,
        returnUrl: stateData?.returnUrl,
      },
    });
  } catch (error) {
    logger.error('OAuth callback error', { error });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Import Preview Endpoint (CSV content in body for simplicity)
router.post('/imports/preview', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'CSV content is required' });
    }

    const preview = await csvImportService.parsePreview(content);
    res.json({ success: true, data: preview });
  } catch (error) {
    logger.error('Error generating import preview', { error });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Validation Endpoint
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { record, rules } = req.body;
    const validation = validationService.validateRecord(record, rules || validationService.getStandardLeadRules());
    res.json({ success: true, data: validation });
  } catch (error) {
    logger.error('Error validating record', { error });
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Deduplication Endpoint
router.post('/deduplicate', async (req: Request, res: Response) => {
  try {
    const { record, existingRecords, options } = req.body;
    const result = deduplicationService.checkDuplicate(record, existingRecords || [], options || {});
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error checking duplicates', { error });
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
