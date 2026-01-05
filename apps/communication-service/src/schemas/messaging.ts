// Messaging Schemas

import { z } from 'zod'

export const conversationSchemas = {
  createConversation: z.object({
    name: z.string().optional(),
    type: z.enum(['direct', 'group', 'case']),
    participantIds: z.array(z.string()),
  }),

  updateConversation: z.object({
    name: z.string().optional(),
    isArchived: z.boolean().optional(),
  }),

  addParticipant: z.object({
    userId: z.string(),
    role: z.enum(['member', 'moderator', 'admin']).default('member'),
  }),
}

export const messageSchemas = {
  sendMessage: z.object({
    content: z.string(),
    contentType: z.enum(['text', 'system', 'file']).default('text'),
    threadId: z.string().optional(),
    mentions: z.array(z.string()).optional(),
    attachments: z.array(z.object({
      fileName: z.string(),
      fileUrl: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
    })).optional(),
  }),

  updateMessage: z.object({
    content: z.string(),
  }),

  addReaction: z.object({
    emoji: z.string(),
  }),
}

export const presenceSchemas = {
  updatePresence: z.object({
    status: z.enum(['online', 'away', 'offline', 'dnd']),
  }),
}