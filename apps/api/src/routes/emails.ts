import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateQuery, emailFilterSchema } from '../utils/validation.js';
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

    const filters = validateQuery(emailFilterSchema, req.query);

    let emails = Array.from(store.emails.values()).filter((e) => e.leadId === leadId);

    if (filters.senderId) {
      emails = emails.filter((e) => e.senderId === filters.senderId);
    }

    if (filters.threadId) {
      emails = emails.filter((e) => e.threadId === filters.threadId);
    }

    if (filters.status) {
      emails = emails.filter((e) => e.status.toUpperCase() === filters.status);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      emails = emails.filter((e) => e.createdAt >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      emails = emails.filter((e) => e.createdAt <= dateTo);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      emails = emails.filter((e) => {
        const blob = `${e.subject} ${e.body}`.toLowerCase();
        return blob.includes(s);
      });
    }

    emails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = paginate(emails, filters.page, filters.limit);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching emails', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/templates', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = Array.from(store.emailTemplates.values()).filter((t) => t.isActive);
    res.json({ data: templates });
  } catch (error) {
    logger.error('Error fetching email templates', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:emailId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, emailId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const email = store.emails.get(emailId);
    if (!email || email.leadId !== leadId) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json(email);
  } catch (error) {
    logger.error('Error fetching email', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
