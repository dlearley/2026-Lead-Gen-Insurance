import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';

import { authMiddleware } from '../middleware/auth.js';
import { store, generateId } from '../storage/in-memory.js';

const router = Router({ mergeParams: true });

const createActivitySchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  userId: z.string().optional(),
});

const toInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function assertLeadExists(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  return Boolean(lead);
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const skip = Math.max(0, toInt(req.query.skip, 0));
    const take = Math.min(200, Math.max(1, toInt(req.query.take, 50)));
    const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim().toUpperCase() : undefined;

    const items = Array.from(store.activities.values())
      .filter((a) => a.leadId === leadId)
      .filter((a) => {
        if (!typeFilter) return true;
        return (a.activityType as string).toUpperCase() === typeFilter;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const page = items.slice(skip, skip + take);

    const responseItems = page.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.activityType,
      description: a.description ?? a.action,
      userId: a.userId,
      createdAt: a.createdAt,
    }));

    res.json({
      success: true,
      data: responseItems,
      pagination: { skip, take, total },
    });
  } catch (error) {
    logger.error('Error fetching activity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const validated = createActivitySchema.parse(req.body);
    const now = new Date();

    const activity = {
      id: generateId(),
      leadId,
      userId: validated.userId,
      activityType: validated.type as any,
      action: validated.type,
      description: validated.description,
      createdAt: now,
    };

    store.activities.set(activity.id, activity as any);

    res.status(201).json({
      success: true,
      data: {
        id: activity.id,
        leadId,
        type: validated.type,
        description: validated.description,
        userId: validated.userId,
        createdAt: now,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating activity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
