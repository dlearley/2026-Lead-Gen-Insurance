import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';

import { authMiddleware } from '../middleware/auth.js';
import { store, generateId, sanitizeHtml } from '../storage/in-memory.js';
import type { Email, Task } from '@insurance-lead-gen/types';

const router = Router({ mergeParams: true });

const quickFollowUpSchema = z.object({
  templateId: z.string().uuid().optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  createTask: z.boolean().optional().default(true),
  dueInHours: z.number().int().positive().optional().default(24),
});

const renderTemplate = (template: string, variables: Record<string, string | undefined>): string => {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? '';
  });
};

async function getLeadOr404(leadId: string): Promise<Awaited<ReturnType<typeof prisma.lead.findUnique>>> {
  return prisma.lead.findUnique({ where: { id: leadId } });
}

router.get('/summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = await getLeadOr404(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const notes = Array.from(store.notes.values()).filter((n) => n.leadId === leadId);
    const tasks = Array.from(store.tasks.values()).filter((t) => t.leadId === leadId);
    const emails = Array.from(store.emails.values()).filter((e) => e.leadId === leadId);
    const activities = Array.from(store.activities.values()).filter((a) => a.leadId === leadId);

    const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

    const nextActions: string[] = [];
    if (openTasks.length === 0) nextActions.push('Create a follow-up task');
    if (emails.length === 0) nextActions.push('Send an initial follow-up email');

    res.json({
      success: true,
      data: {
        lead,
        counts: {
          notes: notes.length,
          tasks: tasks.length,
          openTasks: openTasks.length,
          emails: emails.length,
          activities: activities.length,
        },
        nextActions,
        emailTemplates: Array.from(store.emailTemplates.values()).filter((t) => t.isActive),
      },
    });
  } catch (error) {
    logger.error('Error generating broker summary', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/quick-follow-up', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const user = req.user;

    const lead = await getLeadOr404(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const input = quickFollowUpSchema.parse(req.body);

    const template = input.templateId ? store.emailTemplates.get(input.templateId) : undefined;

    const variables: Record<string, string | undefined> = {
      firstName: lead.firstName ?? undefined,
      lastName: lead.lastName ?? undefined,
      agentName: user?.email ?? 'Agent',
    };

    const subject = input.subject ?? template?.subject ?? 'Following up on your insurance inquiry';
    const body = input.body ?? template?.body ?? 'Hi {{firstName}},\n\nThanks for reaching out. When would be a good time to talk?\n\nBest,\n{{agentName}}';

    const renderedSubject = renderTemplate(subject, variables);
    const renderedBody = renderTemplate(body, variables);

    const now = new Date();

    const created: { email?: Email; task?: Task } = {};

    if (lead.email) {
      const email: Email = {
        id: generateId(),
        leadId,
        senderId: user?.id ?? 'system',
        to: [lead.email],
        cc: [],
        bcc: [],
        subject: renderedSubject,
        body: renderedBody,
        bodyHtml: sanitizeHtml(`<pre>${renderedBody}</pre>`),
        templateId: template?.id,
        status: 'sent',
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      };

      store.emails.set(email.id, email);
      created.email = email;
    }

    if (input.createTask) {
      const dueDate = new Date(now.getTime() + input.dueInHours * 60 * 60 * 1000);

      const task: Task = {
        id: generateId(),
        leadId,
        creatorId: user?.id ?? 'system',
        title: 'Follow up with lead',
        description: 'Call or email the lead and log outcome',
        status: 'open',
        priority: 'medium',
        dueDate,
        createdAt: now,
        updatedAt: now,
      };

      store.tasks.set(task.id, task);
      created.task = task;
    }

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }

    logger.error('Error creating quick follow up', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
