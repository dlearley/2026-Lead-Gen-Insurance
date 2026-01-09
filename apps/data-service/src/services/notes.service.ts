import { prisma } from '@insurance-lead-gen/data-service';
import { logger } from '@insurance-lead-gen/core';
import type {
  Note,
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilterDto,
} from '@insurance-lead-gen/types';
import { Prisma } from '@prisma/client';

export class NotesService {
  /**
   * Create a new note
   */
  async createNote(dto: CreateNoteDto, authorId: string): Promise<Note> {
    try {
      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: dto.leadId },
        select: { id: true },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const note = await prisma.note.create({
        data: {
          leadId: dto.leadId,
          authorId,
          content: dto.content,
          visibility: dto.visibility || 'TEAM',
          type: dto.type || 'general',
          mentions: dto.mentions || [],
          attachments: dto.attachments
            ? {
                create: dto.attachments.map((attachment) => ({
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  fileSize: attachment.fileSize,
                  mimeType: attachment.mimeType,
                })),
              }
            : undefined,
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

      // Create activity log entry
      await prisma.activityLog.create({
        data: {
          leadId: dto.leadId,
          userId: authorId,
          activityType: 'NOTE_CREATED',
          action: 'Created note',
          description: `Created ${dto.type || 'general'} note`,
        },
      });

      return {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility as any,
        type: note.type as any,
        mentions: note.mentions || undefined,
        attachments: note.attachments.map((a) => ({
          id: a.id,
          noteId: a.noteId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    } catch (error) {
      logger.error('Error creating note', { dto, authorId, error });
      throw error;
    }
  }

  /**
   * Get a single note by ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    try {
      const note = await prisma.note.findUnique({
        where: { id },
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
        return null;
      }

      return {
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility as any,
        type: note.type as any,
        mentions: note.mentions || undefined,
        attachments: note.attachments.map((a) => ({
          id: a.id,
          noteId: a.noteId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    } catch (error) {
      logger.error('Error fetching note', { id, error });
      throw error;
    }
  }

  /**
   * Get notes with filtering and pagination
   */
  async getNotes(filter: NoteFilterDto): Promise<{ notes: Note[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const page = filter.page || 1;
      const limit = Math.min(filter.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: Prisma.NoteWhereInput = {};
      if (filter.leadId) where.leadId = filter.leadId;
      if (filter.authorId) where.authorId = filter.authorId;
      if (filter.visibility) where.visibility = filter.visibility;
      if (filter.type) where.type = filter.type;

      // Date range filter
      if (filter.dateFrom || filter.dateTo) {
        where.createdAt = {};
        if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
        if (filter.dateTo) where.createdAt.lte = filter.dateTo;
      }

      // Search filter
      if (filter.search) {
        where.OR = [
          { content: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const [notes, total] = await Promise.all([
        prisma.note.findMany({
          where,
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
        prisma.note.count({ where }),
      ]);

      const mappedNotes = notes.map((note) => ({
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        visibility: note.visibility as any,
        type: note.type as any,
        mentions: note.mentions || undefined,
        attachments: note.attachments.map((a) => ({
          id: a.id,
          noteId: a.noteId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));

      return {
        notes: mappedNotes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching notes', { filter, error });
      throw error;
    }
  }

  /**
   * Update a note
   */
  async updateNote(id: string, dto: UpdateNoteDto): Promise<Note> {
    try {
      const note = await prisma.note.findUnique({
        where: { id },
        select: { leadId: true },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      const updatedNote = await prisma.note.update({
        where: { id },
        data: {
          ...(dto.content && { content: dto.content }),
          ...(dto.visibility && { visibility: dto.visibility }),
          ...(dto.type && { type: dto.type }),
          ...(dto.mentions && { mentions: dto.mentions }),
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

      // Create activity log entry
      await prisma.activityLog.create({
        data: {
          leadId: note.leadId,
          userId: updatedNote.authorId,
          activityType: 'NOTE_UPDATED',
          action: 'Updated note',
          description: `Updated ${updatedNote.type} note`,
        },
      });

      return {
        id: updatedNote.id,
        leadId: updatedNote.leadId,
        authorId: updatedNote.authorId,
        content: updatedNote.content,
        visibility: updatedNote.visibility as any,
        type: updatedNote.type as any,
        mentions: updatedNote.mentions || undefined,
        attachments: updatedNote.attachments.map((a) => ({
          id: a.id,
          noteId: a.noteId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating note', { id, dto, error });
      throw error;
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    try {
      const note = await prisma.note.findUnique({
        where: { id },
        select: { leadId: true, authorId: true },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      await prisma.note.delete({
        where: { id },
      });

      // Create activity log entry
      await prisma.activityLog.create({
        data: {
          leadId: note.leadId,
          userId: note.authorId,
          activityType: 'NOTE_DELETED',
          action: 'Deleted note',
          description: 'Deleted a note',
        },
      });
    } catch (error) {
      logger.error('Error deleting note', { id, error });
      throw error;
    }
  }

  /**
   * Get note statistics for a lead
   */
  async getNoteStats(leadId: string) {
    try {
      const [totalNotes, byType, byVisibility, byAuthor] = await Promise.all([
        prisma.note.count({ where: { leadId } }),
        prisma.note.groupBy({
          by: ['type'],
          where: { leadId },
          _count: true,
        }),
        prisma.note.groupBy({
          by: ['visibility'],
          where: { leadId },
          _count: true,
        }),
        prisma.note.groupBy({
          by: ['authorId'],
          where: { leadId },
          _count: true,
          orderBy: { _count: { authorId: 'desc' } },
          take: 5,
        }),
      ]);

      return {
        totalNotes,
        byType: byType.map((item) => ({
          type: item.type,
          count: item._count,
        })),
        byVisibility: byVisibility.map((item) => ({
          visibility: item.visibility,
          count: item._count,
        })),
        topAuthors: byAuthor.map((item) => ({
          authorId: item.authorId,
          count: item._count,
        })),
      };
    } catch (error) {
      logger.error('Error fetching note stats', { leadId, error });
      throw error;
    }
  }
}

export const notesService = new NotesService();
