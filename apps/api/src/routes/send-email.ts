import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, sendEmailSchema } from '../utils/validation.js';
import { store, generateId, sanitizeHtml } from '../storage/in-memory.js';
import type { Email } from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const validated = validateBody(sendEmailSchema, req.body);
    const now = new Date();

    const email: Email = {
      id: generateId(),
      leadId,
      senderId: user.id,
      to: validated.to,
      cc: validated.cc ?? [],
      bcc: validated.bcc ?? [],
      subject: validated.subject,
      body: validated.body,
      bodyHtml: validated.bodyHtml ? sanitizeHtml(validated.bodyHtml) : undefined,
      templateId: validated.templateId,
      status: validated.scheduledFor ? 'scheduled' : 'pending',
      scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
      createdAt: now,
      updatedAt: now,
      sender: store.users.get(user.id),
      attachments: [],
    };

    store.emails.set(email.id, email);

    if (!validated.scheduledFor) {
      email.status = 'sent';
      email.sentAt = now;
    }

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'email_sent' as const,
      action: 'Sent email',
      description: `Email sent to ${validated.to.join(', ')}`,
      metadata: { emailId: email.id, subject: validated.subject },
      createdAt: now,
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    logger.info('Email sent', { emailId: email.id, leadId, userId: user.id });
    res.status(201).json(email);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error sending email', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
