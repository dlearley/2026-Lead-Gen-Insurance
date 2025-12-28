import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { apiEcosystemService } from '../services/api-ecosystem.service.js';
import logger from '../logger.js';

const router = express.Router();

// ========================================
// Authentication Middleware
// ========================================

/**
 * Verify API key from request headers
 */
async function verifyApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      });
    }

    const keyId = authHeader.substring(7);
    const parts = keyId.split('_');

    if (parts.length < 3) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key format',
      });
    }

    const keyPrefix = parts.slice(0, 2).join('_');
    const secretKey = keyId;

    const result = await apiEcosystemService.verifyApiKey(keyPrefix, secretKey);

    if (!result) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired API key',
      });
    }

    // Attach client info to request
    (req as any).apiClientId = result.clientId;
    (req as any).apiKeyId = result.apiKeyId;

    next();
  } catch (error) {
    logger.error('Error verifying API key', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify API key',
    });
  }
}

/**
 * Rate limiting middleware
 */
async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = (req as any).apiClientId;
    const apiKeyId = (req as any).apiKeyId;
    const method = req.method;

    const result = await apiEcosystemService.checkRateLimit(clientId, { id: apiKeyId } as any, method);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
    });

    next();
  } catch (error) {
    logger.error('Error checking rate limit', { error: (error as Error).message });
    next(); // Continue on error to not break requests
  }
}

// ========================================
// API Client Routes
// ========================================

const createApiClientSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()).min(1),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  contactEmail: z.string().email(),
  rateLimitTier: z.enum(['basic', 'standard', 'premium', 'enterprise']).optional(),
  webhookUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateApiClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()).min(1).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'suspended', 'revoked', 'pending_verification']).optional(),
  rateLimitTier: z.enum(['basic', 'standard', 'premium', 'enterprise']).optional(),
  webhookUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/api-clients
 * Create a new API client
 */
router.post('/api-clients', async (req: Request, res: Response) => {
  try {
    const data = createApiClientSchema.parse(req.body);
    const client = await apiEcosystemService.createApiClient(data);

    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    logger.error('Error creating API client', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create API client',
    });
  }
});

/**
 * GET /api/v1/api-clients
 * List API clients
 */
router.get('/api-clients', async (req: Request, res: Response) => {
  try {
    const params = {
      status: req.query.status as string,
      rateLimitTier: req.query.rateLimitTier as string,
      contactEmail: req.query.contactEmail as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const result = await apiEcosystemService.listApiClients(params);

    res.json({
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    logger.error('Error listing API clients', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to list API clients',
    });
  }
});

/**
 * GET /api/v1/api-clients/:id
 * Get API client by ID
 */
router.get('/api-clients/:id', async (req: Request, res: Response) => {
  try {
    const client = await apiEcosystemService.getApiClient(req.params.id);

    if (!client) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API client not found',
      });
    }

    res.json(client);
  } catch (error) {
    logger.error('Error getting API client', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get API client',
    });
  }
});

/**
 * PUT /api/v1/api-clients/:id
 * Update API client
 */
router.put('/api-clients/:id', async (req: Request, res: Response) => {
  try {
    const data = updateApiClientSchema.parse(req.body);
    const client = await apiEcosystemService.updateApiClient(req.params.id, data);

    res.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    logger.error('Error updating API client', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update API client',
    });
  }
});

/**
 * DELETE /api/v1/api-clients/:id
 * Delete API client
 */
router.delete('/api-clients/:id', async (req: Request, res: Response) => {
  try {
    await apiEcosystemService.deleteApiClient(req.params.id);
    res.status(204).send();
  } catch (error) {
    if ((error as Error).message === 'API client not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API client not found',
      });
    }

    logger.error('Error deleting API client', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete API client',
    });
  }
});

/**
 * GET /api/v1/api-clients/:id/dashboard
 * Get API client dashboard
 */
router.get('/api-clients/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await apiEcosystemService.getApiClientDashboard(req.params.id);
    res.json(dashboard);
  } catch (error) {
    if ((error as Error).message === 'API client not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API client not found',
      });
    }

    logger.error('Error getting API client dashboard', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get dashboard data',
    });
  }
});

// ========================================
// API Key Routes
// ========================================

const createApiKeySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).optional(),
  rateLimitOverride: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const data = createApiKeySchema.parse(req.body);

    // Parse expiresAt if provided
    const keyData = {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };

    const apiKey = await apiEcosystemService.createApiKey(keyData);

    res.status(201).json(apiKey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    logger.error('Error creating API key', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create API key',
    });
  }
});

/**
 * GET /api/v1/api-clients/:clientId/api-keys
 * Get API keys for a client
 */
router.get('/api-clients/:clientId/api-keys', async (req: Request, res: Response) => {
  try {
    const apiKeys = await apiEcosystemService.getApiKeys(req.params.clientId);

    res.json({
      data: apiKeys.map(key => ({
        id: key.id,
        keyId: key.keyId,
        keyPrefix: key.keyPrefix,
        name: key.name,
        status: key.status,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        scopes: key.scopes,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Error getting API keys', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get API keys',
    });
  }
});

/**
 * DELETE /api/v1/api-clients/:clientId/api-keys/:apiKeyId
 * Revoke an API key
 */
router.delete('/api-clients/:clientId/api-keys/:apiKeyId', async (req: Request, res: Response) => {
  try {
    await apiEcosystemService.revokeApiKey(req.params.apiKeyId, req.params.clientId);
    res.status(204).send();
  } catch (error) {
    if ((error as Error).message === 'API key not found' || (error as Error).message === 'API key does not belong to this client') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
      });
    }

    logger.error('Error revoking API key', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to revoke API key',
    });
  }
});

// ========================================
// Webhook Routes
// ========================================

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  retryConfig: z
    .object({
      maxRetries: z.number().int().min(0).max(10),
      retryDelay: z.number().int().positive(),
      backoffMultiplier: z.number().positive(),
      timeout: z.number().int().positive(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  retryConfig: z
    .object({
      maxRetries: z.number().int().min(0).max(10),
      retryDelay: z.number().int().positive(),
      backoffMultiplier: z.number().positive(),
      timeout: z.number().int().positive(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/api-clients/:clientId/webhooks
 * Create a webhook subscription
 */
router.post('/api-clients/:clientId/webhooks', async (req: Request, res: Response) => {
  try {
    const data = createWebhookSchema.parse(req.body);
    const webhook = await apiEcosystemService.createWebhookSubscription(req.params.clientId, data);

    res.status(201).json(webhook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    logger.error('Error creating webhook subscription', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create webhook subscription',
    });
  }
});

/**
 * GET /api/v1/api-clients/:clientId/webhooks
 * Get webhook subscriptions for a client
 */
router.get('/api-clients/:clientId/webhooks', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const webhooks = await apiEcosystemService.getWebhookSubscriptions(req.params.clientId, status);

    res.json({
      data: webhooks.map(webhook => ({
        ...webhook,
        secret: undefined, // Don't expose the secret
      })),
    });
  } catch (error) {
    logger.error('Error getting webhook subscriptions', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get webhook subscriptions',
    });
  }
});

/**
 * PUT /api/v1/api-clients/:clientId/webhooks/:webhookId
 * Update webhook subscription
 */
router.put('/api-clients/:clientId/webhooks/:webhookId', async (req: Request, res: Response) => {
  try {
    const data = updateWebhookSchema.parse(req.body);
    const webhook = await apiEcosystemService.updateWebhookSubscription(
      req.params.webhookId,
      req.params.clientId,
      data
    );

    res.json(webhook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    if ((error as Error).message === 'Webhook subscription not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook subscription not found',
      });
    }

    logger.error('Error updating webhook subscription', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update webhook subscription',
    });
  }
});

/**
 * DELETE /api/v1/api-clients/:clientId/webhooks/:webhookId
 * Delete webhook subscription
 */
router.delete('/api-clients/:clientId/webhooks/:webhookId', async (req: Request, res: Response) => {
  try {
    await apiEcosystemService.deleteWebhookSubscription(req.params.webhookId, req.params.clientId);
    res.status(204).send();
  } catch (error) {
    if ((error as Error).message === 'Webhook subscription not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook subscription not found',
      });
    }

    logger.error('Error deleting webhook subscription', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete webhook subscription',
    });
  }
});

/**
 * GET /api/v1/api-clients/:clientId/webhooks/:webhookId/deliveries
 * Get webhook delivery history
 */
router.get('/api-clients/:clientId/webhooks/:webhookId/deliveries', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const deliveries = await apiEcosystemService.getWebhookDeliveries(req.params.webhookId, req.params.clientId, limit);

    res.json({
      data: deliveries,
    });
  } catch (error) {
    if ((error as Error).message === 'Webhook subscription not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook subscription not found',
      });
    }

    logger.error('Error getting webhook deliveries', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get webhook deliveries',
    });
  }
});

// ========================================
// API Usage Routes
// ========================================

/**
 * GET /api/v1/api-clients/:clientId/usage
 * Get API usage statistics
 */
router.get('/api-clients/:clientId/usage', async (req: Request, res: Response) => {
  try {
    const params = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      groupBy: (req.query.groupBy as 'hour' | 'day') || 'day',
    };

    const stats = await apiEcosystemService.getApiUsageStats(req.params.clientId, params);

    res.json(stats);
  } catch (error) {
    logger.error('Error getting API usage stats', { error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get API usage statistics',
    });
  }
});

// ========================================
// Rate Limit Info
// ========================================

/**
 * GET /api/v1/rate-limits
 * Get rate limit tier configurations
 */
router.get('/rate-limits', (req: Request, res: Response) => {
  const tiers = ['basic', 'standard', 'premium', 'enterprise'] as const;
  const configs = tiers.reduce((acc, tier) => {
    acc[tier] = apiEcosystemService.getRateLimitConfig(tier);
    return acc;
  }, {} as Record<string, any>);

  res.json({
    data: configs,
  });
});

/**
 * GET /api/v1/webhook-events
 * Get available webhook event types
 */
router.get('/webhook-events', (req: Request, res: Response) => {
  const events = [
    'lead.created',
    'lead.updated',
    'lead.qualified',
    'lead.converted',
    'lead.rejected',
    'assignment.created',
    'assignment.accepted',
    'assignment.rejected',
    'policy.created',
    'policy.updated',
    'policy.activated',
    'policy.cancelled',
    'quote.created',
    'quote.sent',
    'quote.accepted',
    'quote.rejected',
    'proposal.created',
    'proposal.sent',
    'proposal.accepted',
    'proposal.rejected',
  ];

  res.json({
    data: events,
  });
});

export default router;
