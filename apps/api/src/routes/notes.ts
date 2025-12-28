import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';

import { authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../utils/validation.js';
import { createNoteSchema, updateNoteSchema } from '../utils/validation.js';
import { store, generateId } from '../storage/in-memory.js';
import type { Note } from '@insurance-lead-gen/types';

const router = Router({ mergeParams: true });

async function assertLeadExists(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  return Boolean(lead);
}

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const user = req.user;
    const validated = validateBody(createNoteSchema, req.body);
    const now = new Date();

    const note: Note = {
      id: generateId(),
      leadId,
      authorId: validated.authorId ?? user?.id ?? 'system',
      content: validated.content,
      visibility: validated.visibility.toLowerCase() as Note['visibility'],
      type: 'general',
      createdAt: now,
      updatedAt: now,
    };

    store.notes.set(note.id, note);

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const notes = Array.from(store.notes.values())
      .filter((n) => n.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, data: notes });
  } catch (error) {
    logger.error('Error fetching notes', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, noteId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json({ success: true, data: note });
  } catch (error) {
    logger.error('Error fetching note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, noteId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const validated = validateBody(updateNoteSchema, req.body);

    if (validated.content !== undefined) note.content = validated.content;
    if (validated.visibility !== undefined) note.visibility = validated.visibility.toLowerCase() as Note['visibility'];

    note.updatedAt = new Date();
    store.notes.set(noteId, note);

    res.json({ success: true, data: note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, noteId } = req.params;

    if (!(await assertLeadExists(leadId))) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    store.notes.delete(noteId);
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('Error deleting note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
