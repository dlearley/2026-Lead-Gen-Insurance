import { z } from 'zod';

// ========================================
// NOTE VALIDATION SCHEMAS
// ========================================

export const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional().default('TEAM'),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
});

export const noteFilterSchema = z.object({
  authorId: z.string().uuid().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// EMAIL VALIDATION SCHEMAS
// ========================================

export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  bodyHtml: z.string().optional(),
  templateId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const emailFilterSchema = z.object({
  senderId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// TASK VALIDATION SCHEMAS
// ========================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  recurrence: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  recurrence: z.string().optional(),
});

export const taskFilterSchema = z.object({
  creatorId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// ACTIVITY LOG VALIDATION SCHEMAS
// ========================================

export const activityFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  activityType: z.enum([
    'LEAD_CREATED',
    'LEAD_UPDATED',
    'STATUS_CHANGED',
    'ASSIGNMENT_CREATED',
    'ASSIGNMENT_UPDATED',
    'NOTE_CREATED',
    'NOTE_UPDATED',
    'NOTE_DELETED',
    'EMAIL_SENT',
    'EMAIL_RECEIVED',
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_COMPLETED',
    'SYSTEM_ACTION',
    'WORKFLOW_TRIGGERED',
  ]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// NOTIFICATION VALIDATION SCHEMAS
// ========================================

export const notificationFilterSchema = z.object({
  type: z.enum([
    'TASK_ASSIGNED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'NOTE_MENTION',
    'EMAIL_RECEIVED',
    'LEAD_ASSIGNED',
    'LEAD_UPDATED',
    'SYSTEM_ALERT',
  ]).optional(),
  isRead: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ========================================
// LEAD VALIDATION SCHEMAS
// ========================================

export const createLeadSchema = z.object({
  source: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  insuranceType: z.enum(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  source: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  insuranceType: z.enum(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']).optional(),
  status: z.enum(['RECEIVED', 'PROCESSING', 'QUALIFIED', 'ROUTED', 'CONVERTED', 'REJECTED']).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Helper function to validate request body
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Helper function to validate query params
export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
