import { Router } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';

const router = Router({ mergeParams: true });

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional().default('TEAM'),
  type: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional().default('general'),
  mentions: z.array(z.string().uuid()).optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  type: z.enum(['general', 'call', 'email', 'meeting', 'follow_up', 'system']).optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

// ========================================
// ROUTES
// ========================================

/**
 * POST /api/v1/leads/:leadId/notes
 * Create a new note for a lead
 */
router.post('/', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const body = validateBody(createNoteSchema, req.body);
    const user = req.user;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        authorId: body.authorId || user?.id || '00000000-0000-0000-0000-000000000001',
        content: body.content,
        visibility: body.visibility,
        type: 'general',
        mentions: body.mentions,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: note.authorId,
        activityType: 'NOTE_CREATED',
        action: 'Created note',
        description: `Created ${note.type} note`,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility,
        type: note.type,
        mentions: note.mentions,
        attachments: note.attachments,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error creating note', { error });
    next(error);
  }
});

/**
 * GET /api/v1/leads/:leadId/notes
 * Get all notes for a lead
 */
router.get('/', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const query = validateQuery(noteFilterSchema, req.query);

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        authorId: body.authorId || user?.id || '00000000-0000-0000-0000-000000000001',
        content: body.content,
        visibility: body.visibility,
        type: body.type,
        mentions: body.mentions,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: note.authorId,
        activityType: 'NOTE_CREATED',
        action: 'Created note',
        description: `Created ${note.type} note`,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility,
        type: note.type,
        mentions: note.mentions,
        attachments: note.attachments,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error creating note', { error });
    next(error);
  }
});

/**
 * GET /api/v1/leads/:leadId/notes
 * Get all notes for a lead
 */
router.get('/', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const query = validateQuery(noteFilterSchema, req.query);
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          attachments: true,
        },
      }),
      prisma.note.count({ where: { leadId } }),
    ]);

    res.json({
      success: true,
      data: notes.map((note) => ({
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility,
        type: note.type,
        mentions: note.mentions,
        attachments: note.attachments,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching notes', { error });
    next(error);
  }
});

/**
 * GET /api/v1/leads/:leadId/notes/:noteId
 * Get a single note
 */
router.get('/:noteId', async (req, res, next) => {
  try {
    const { leadId, noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        leadId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      data: {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility,
        type: note.type,
        mentions: note.mentions,
        attachments: note.attachments,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching note', { error });
    next(error);
  }
});

/**
 * PUT /api/v1/leads/:leadId/notes/:noteId
 * Update a note
 */
router.put('/:noteId', async (req, res, next) => {
  try {
    const { leadId, noteId } = req.params;
    const body = validateBody(updateNoteSchema, req.body);

    // Verify note exists and belongs to lead
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        leadId,
      },
      select: { id: true, leadId: true, authorId: true, type: true },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(body.content && { content: body.content }),
        ...(body.visibility && { visibility: body.visibility }),
        ...(body.type && { type: body.type }),
        ...(body.mentions && { mentions: body.mentions }),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: note.authorId,
        activityType: 'NOTE_UPDATED',
        action: 'Updated note',
        description: `Updated ${note.type} note`,
      },
    });

    res.json({
      success: true,
      data: {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility,
        type: note.type,
        mentions: note.mentions,
        attachments: note.attachments,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating note', { error });
    next(error);
  }
});

/**
 * DELETE /api/v1/leads/:leadId/notes/:noteId
 * Delete a note
 */
router.delete('/:noteId', async (req, res, next) => {
  try {
    const { leadId, noteId } = req.params;

    // Verify note exists and belongs to lead
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        leadId,
      },
      select: { id: true, leadId: true, authorId: true },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        leadId,
        userId: note.authorId,
        activityType: 'NOTE_DELETED',
        action: 'Deleted note',
        description: 'Deleted a note',
      },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting note', { error });
    next(error);
  }
});

export default router;
