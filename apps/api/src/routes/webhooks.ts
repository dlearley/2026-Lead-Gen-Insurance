/**
 * Phase 30: Partner Ecosystem & Integrations
 * Webhook management routes
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WebhookService, EventService } from '@insurance-platform/core';
import type { CreateWebhookRequest, TestWebhookRequest } from '@insurance-platform/types';

const router = Router();
const prisma = new PrismaClient();
const webhookService = new WebhookService(prisma);
const eventService = new EventService(prisma, webhookService);

/**
 * POST /api/webhooks
 * Register webhook endpoint
 */
router.post('/', async (req, res, next) => {
  try {
    const webhookRequest: CreateWebhookRequest = req.body;

    const webhook = await webhookService.registerWebhook(webhookRequest);

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks
 * List webhook endpoints
 */
router.get('/', async (req, res, next) => {
  try {
    const { integrationId } = req.query;

    if (!integrationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'integrationId is required' },
      });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { integrationId: integrationId as string },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/:id
 * Get webhook endpoint details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const webhook = await prisma.webhookEndpoint.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
    }

    res.json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/webhooks/:id
 * Update webhook endpoint
 */
router.put('/:id', async (req, res, next) => {
  try {
    const webhook = await webhookService.updateWebhook(req.params.id, req.body);

    res.json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook endpoint
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await webhookService.deleteWebhook(req.params.id);

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const testRequest: TestWebhookRequest = req.body;

    const result = await webhookService.testWebhook(req.params.id, testRequest);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;

    const deliveries = await webhookService.getDeliveries(req.params.id, {
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/:id/deliveries/:deliveryId/retry
 * Retry failed delivery
 */
router.post('/:id/deliveries/:deliveryId/retry', async (req, res, next) => {
  try {
    await webhookService.retryDelivery(req.params.deliveryId);

    res.json({ success: true, message: 'Delivery retry initiated' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/:id/deliveries/failed
 * Get failed deliveries
 */
router.get('/:id/deliveries/failed', async (req, res, next) => {
  try {
    const deliveries = await webhookService.getFailedDeliveries(req.params.id);

    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Events
// ============================================================================

/**
 * GET /api/events
 * List events with filters
 */
router.get('/events', async (req, res, next) => {
  try {
    const { eventType, entityType, entityId, organizationId, startDate, endDate, limit, offset } =
      req.query;

    const result = await eventService.listEvents({
      eventType: eventType as string,
      entityType: entityType as string,
      entityId: entityId as string,
      organizationId: organizationId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events/:id
 * Get event details
 */
router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/event-types
 * List available event types
 */
router.get('/event-types', async (req, res, next) => {
  try {
    const { category } = req.query;

    const eventTypes = await eventService.listEventTypes(category as string);

    res.json({ success: true, data: eventTypes });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/events/:id/replay
 * Replay event to webhooks
 */
router.post('/events/:id/replay', async (req, res, next) => {
  try {
    await eventService.replayEvent(req.params.id);

    res.json({ success: true, message: 'Event replay initiated' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events/statistics
 * Get event statistics
 */
router.get('/events/statistics', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'startDate and endDate are required' },
      });
    }

    const statistics = await eventService.getEventStatistics(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({ success: true, data: statistics });
  } catch (error) {
    next(error);
  }
});

export default router;
