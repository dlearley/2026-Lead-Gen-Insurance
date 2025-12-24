import { Router } from 'express';
import { randomUUID } from 'crypto';

import { logger } from '@insurance-lead-gen/core';
import { EVENT_SUBJECTS, type LeadReceivedEvent } from '@insurance-lead-gen/types';

import type { EventBus } from '../infra/event-bus.js';
import { authenticateJwt } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate-body.js';
import { createLeadSchema, type CreateLeadInput } from '../schema/create-lead.schema.js';

export const createLeadsRouter = (params: {
  eventBus: EventBus;
  jwtSecret: string;
  rateLimit: {
    points: number;
    durationSeconds: number;
  };
}): Router => {
  const router = Router();

  router.use(createRateLimitMiddleware(params.rateLimit));
  router.use(authenticateJwt(params.jwtSecret));

  router.post(
    '/',
    validateBody(createLeadSchema),
    asyncHandler(async (req, res) => {
      const body = (req as unknown as { validatedBody: CreateLeadInput }).validatedBody;

      const leadId = randomUUID();

      const event: LeadReceivedEvent = {
        id: randomUUID(),
        type: EVENT_SUBJECTS.LeadReceived,
        source: 'api',
        data: {
          leadId,
          lead: body,
        },
        timestamp: new Date().toISOString(),
      };

      await params.eventBus.publish(EVENT_SUBJECTS.LeadReceived, event);

      logger.info('Published lead.received', { leadId });

      res.status(201).json({
        id: leadId,
        status: 'received',
        message: 'Lead ingested successfully',
      });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const response = await params.eventBus.request<{ lead: unknown | null }>(
        EVENT_SUBJECTS.LeadGet,
        { leadId: id },
        2000
      );

      if (!response.lead) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      res.json({ lead: response.lead });
    })
  );

  return router;
};
