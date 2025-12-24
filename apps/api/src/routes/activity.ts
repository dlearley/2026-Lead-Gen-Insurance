import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateQuery, activityFilterSchema } from '../utils/validation.js';
import { store } from '../storage/in-memory.js';
import { paginate } from '../utils/pagination.js';
import { logger } from '@insurance-lead-gen/core';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const filters = validateQuery(activityFilterSchema, req.query);

    let activities = Array.from(store.activities.values()).filter((a) => a.leadId === leadId);

    if (filters.userId) {
      activities = activities.filter((a) => a.userId === filters.userId);
    }

    if (filters.activityType) {
      activities = activities.filter((a) => a.activityType.toUpperCase() === filters.activityType);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      activities = activities.filter((a) => a.createdAt >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      activities = activities.filter((a) => a.createdAt <= dateTo);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      activities = activities.filter((a) => {
        const blob = `${a.action} ${a.description ?? ''} ${JSON.stringify(a.metadata ?? {})}`.toLowerCase();
        return blob.includes(s);
      });
    }

    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = paginate(activities, filters.page, filters.limit);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching activity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const activities = Array.from(store.activities.values())
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const header = ['id', 'createdAt', 'activityType', 'action', 'description', 'userId'].join(',');
    const rows = activities.map((a) => {
      const desc = (a.description ?? '').replaceAll('"', '""');
      return [a.id, a.createdAt.toISOString(), a.activityType, a.action.replaceAll('"', '""'), `"${desc}"`, a.userId ?? ''].join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lead_${leadId}_activity.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (error) {
    logger.error('Error exporting activity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:activityId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, activityId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const activity = store.activities.get(activityId);
    if (!activity || activity.leadId !== leadId) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json(activity);
  } catch (error) {
    logger.error('Error fetching activity detail', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
