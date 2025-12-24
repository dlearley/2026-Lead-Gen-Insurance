import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, createNoteSchema, updateNoteSchema, noteFilterSchema } from '../utils/validation.js';
import { store, generateId } from '../storage/in-memory.js';
import type { Note } from '@insurance-lead-gen/types';
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

    const validated = validateBody(createNoteSchema, req.body);
    const now = new Date();

    const note: Note = {
      id: generateId(),
      leadId,
      authorId: user.id,
      content: validated.content,
      visibility: validated.visibility.toLowerCase() as 'private' | 'team' | 'public',
      type: 'general',
      createdAt: now,
      updatedAt: now,
      author: store.users.get(user.id),
      attachments: [],
    };

    store.notes.set(note.id, note);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'note_created' as const,
      action: 'Created note',
      description: `Note created by ${user.email}`,
      metadata: { noteId: note.id },
      createdAt: now,
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    logger.info('Note created', { noteId: note.id, leadId, userId: user.id });
    res.status(201).json(note);
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
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const filters = validateQuery(noteFilterSchema, req.query);

    let notes = Array.from(store.notes.values()).filter((n) => n.leadId === leadId);

    if (filters.authorId) {
      notes = notes.filter((n) => n.authorId === filters.authorId);
    }

    if (filters.visibility) {
      notes = notes.filter((n) => n.visibility.toUpperCase() === filters.visibility);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      notes = notes.filter((n) => n.createdAt >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      notes = notes.filter((n) => n.createdAt <= dateTo);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      notes = notes.filter((n) => n.content.toLowerCase().includes(searchLower));
    }

    notes = notes.filter((n) => {
      if (n.visibility === 'private' && n.authorId !== user.id) {
        return false;
      }
      return true;
    });

    notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = notes.length;
    const totalPages = Math.ceil(total / filters.limit);
    const start = (filters.page - 1) * filters.limit;
    const end = start + filters.limit;
    const paginatedNotes = notes.slice(start, end);

    res.json({
      data: paginatedNotes,
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching notes', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, noteId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (note.visibility === 'private' && note.authorId !== user.id) {
      res.status(403).json({ error: 'Forbidden - Cannot access private note' });
      return;
    }

    res.json(note);
  } catch (error) {
    logger.error('Error fetching note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, noteId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (note.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden - Can only edit your own notes' });
      return;
    }

    const validated = validateBody(updateNoteSchema, req.body);

    if (validated.content !== undefined) {
      note.content = validated.content;
    }
    if (validated.visibility !== undefined) {
      note.visibility = validated.visibility.toLowerCase() as 'private' | 'team' | 'public';
    }
    note.updatedAt = new Date();

    store.notes.set(noteId, note);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'note_updated' as const,
      action: 'Updated note',
      description: `Note updated by ${user.email}`,
      metadata: { noteId: note.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    logger.info('Note updated', { noteId, leadId, userId: user.id });
    res.json(note);
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
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const note = store.notes.get(noteId);
    if (!note || note.leadId !== leadId) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (note.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden - Can only delete your own notes' });
      return;
    }

    store.notes.delete(noteId);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'note_deleted' as const,
      action: 'Deleted note',
      description: `Note deleted by ${user.email}`,
      metadata: { noteId: note.id, content: note.content.substring(0, 100) },
      createdAt: new Date(),
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    logger.info('Note deleted', { noteId, leadId, userId: user.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting note', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
