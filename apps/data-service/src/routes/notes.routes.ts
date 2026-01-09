import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { notesService } from '../services/notes.service.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createNoteSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional().default('TEAM'),
  type: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional().default('general'),
  mentions: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.object({
    fileName: z.string().min(1),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().int().positive(),
    mimeType: z.string().min(1),
  })).optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  type: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

const noteFilterSchema = z.object({
  leadId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  type: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// ROUTES
// ========================================

/**
 * POST /notes
 * Create a new note
 */
router.post('/', validate({ body: createNoteSchema }), async (req, res, next) => {
  try {
    const body = req.body;
    const authorId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const note = await notesService.createNote(body, authorId);

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /notes/:id
 * Get a single note by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await notesService.getNoteById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
      });
    }

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /notes
 * Get notes with filtering and pagination
 */
router.get('/', validate({ query: noteFilterSchema }), async (req, res, next) => {
  try {
    const query = req.query;

    const filter = {
      ...query,
      ...(query.dateFrom && { dateFrom: new Date(query.dateFrom as string) }),
      ...(query.dateTo && { dateTo: new Date(query.dateTo as string) }),
    };

    const result = await notesService.getNotes(filter);

    res.json({
      success: true,
      data: result.notes,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /notes/:id
 * Update a note
 */
router.put('/:id', validate({ body: updateNoteSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const note = await notesService.updateNote(id, body);

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /notes/:id
 * Delete a note
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await notesService.deleteNote(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /notes/stats/:leadId
 * Get note statistics for a lead
 */
router.get('/stats/:leadId', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const stats = await notesService.getNoteStats(leadId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
