// Collaboration Schemas

import { z } from 'zod'

export const documentSchemas = {
  uploadDocument: z.object({
    title: z.string(),
    mimeType: z.string(),
    fileSize: z.number(),
    storageUrl: z.string(),
    tags: z.array(z.string()).optional(),
    customMetadata: z.record(z.any()).optional(),
    isPublished: z.boolean().optional(),
  }),

  updateDocument: z.object({
    title: z.string().optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    customMetadata: z.record(z.any()).optional(),
  }),

  shareDocument: z.object({
    userId: z.string(),
    permission: z.enum(['view', 'comment', 'edit', 'owner']),
    expiresAt: z.string().datetime().optional(),
  }),

  addDocumentComment: z.object({
    content: z.string(),
    pageNumber: z.number().optional(),
    highlights: z.record(z.any()).optional(),
  }),
}

export const caseSchemas = {
  createCase: z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['new', 'in_progress', 'on_hold', 'completed', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignedToId: z.string().optional(),
    leadId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
    dueDate: z.string().datetime().optional(),
  }),

  updateCase: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['new', 'in_progress', 'on_hold', 'completed', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignedToId: z.string().optional(),
    leadId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
    dueDate: z.string().datetime().optional(),
  }),

  addCaseNote: z.object({
    content: z.string(),
    isInternal: z.boolean().optional(),
  }),

  addCaseActivity: z.object({
    activityType: z.string(),
    activityId: z.string().optional(),
    description: z.string(),
  }),
}