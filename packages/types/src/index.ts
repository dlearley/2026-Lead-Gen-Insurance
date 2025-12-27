// ========================================
// USER TYPES
// ========================================

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// LEAD TYPES
// ========================================

export type InsuranceType = 'auto' | 'home' | 'life' | 'health' | 'commercial';
export type LeadStatus = 'received' | 'processing' | 'qualified' | 'routed' | 'converted' | 'rejected';

export interface Lead {
  id: string;
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  insuranceType?: InsuranceType;
  qualityScore?: number;
  status: LeadStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// NOTE TYPES
// ========================================

export type NoteVisibility = 'private' | 'team' | 'public';
export type NoteType = 'general' | 'call' | 'email' | 'meeting' | 'system';

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  visibility: NoteVisibility;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
  attachments?: NoteAttachment[];
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface CreateNoteDto {
  leadId: string;
  content: string;
  visibility?: NoteVisibility;
  type?: NoteType;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface UpdateNoteDto {
  content?: string;
  visibility?: NoteVisibility;
  type?: NoteType;
}

export interface NoteFilterParams {
  leadId?: string;
  authorId?: string;
  visibility?: NoteVisibility;
  type?: NoteType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// ACTIVITY LOG TYPES
// ========================================

export type ActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'status_changed'
  | 'assignment_created'
  | 'assignment_updated'
  | 'note_created'
  | 'note_updated'
  | 'note_deleted'
  | 'email_sent'
  | 'email_received'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'system_action'
  | 'workflow_triggered';

export interface ActivityLog {
  id: string;
  leadId: string;
  userId?: string;
  activityType: ActivityType;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  user?: User;
}

export interface ActivityFilterParams {
  leadId?: string;
  userId?: string;
  activityType?: ActivityType | ActivityType[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// EMAIL TYPES
// ========================================

export type EmailStatus = 'pending' | 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced';

export interface Email {
  id: string;
  leadId: string;
  senderId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  templateId?: string;
  threadId?: string;
  status: EmailStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  scheduledFor?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  template?: EmailTemplate;
  attachments?: EmailAttachment[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAttachment {
  id: string;
  emailId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface SendEmailDto {
  leadId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  templateId?: string;
  scheduledFor?: Date;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface EmailFilterParams {
  leadId?: string;
  senderId?: string;
  threadId?: string;
  status?: EmailStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// TASK TYPES
// ========================================

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  leadId: string;
  creatorId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  assignee?: User;
}

export interface CreateTaskDto {
  leadId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  recurrence?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilterParams {
  leadId?: string;
  creatorId?: string;
  assigneeId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'note_mention'
  | 'email_received'
  | 'lead_assigned'
  | 'lead_updated'
  | 'system_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationFilterParams {
  userId?: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specializations: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  isActive: boolean;
  maxLeadCapacity: number;
  currentLeadCount: number;
  averageResponseTime: number;
  conversionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  agentId: string;
  assignedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'timeout';
  acceptedAt?: Date;
  notes?: string;
}

export interface Event {
  id: string;
  type: string;
  source: string;
  data: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ProcessingResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  processingTime: number;
}

export * from './events.js';
export * from './analytics.js';

// Report Types
export * from './reports.js';

// Validation Schemas
export * from './validation.js';

// Integration Types
export * from './integrations.js';
