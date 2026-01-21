// ========================================
// TIMELINE & NOTES SYSTEM TYPES
// ========================================

// Note Types
export type NoteVisibility = 'PRIVATE' | 'TEAM' | 'PUBLIC';
export type TimelineNoteType = 'general' | 'call' | 'email' | 'meeting' | 'follow_up' | 'system';

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  visibility: NoteVisibility;
  type: TimelineNoteType;
  mentions?: string[];
  attachments?: NoteAttachment[];
  createdAt: Date;
  updatedAt: Date;
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

// Activity Log Types
export type TimelineActivityType =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_UPDATED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'EMAIL_SENT'
  | 'EMAIL_RECEIVED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'SYSTEM_ACTION'
  | 'WORKFLOW_TRIGGERED'
  | 'CALL_LOGGED'
  | 'MEETING_SCHEDULED'
  | 'DOCUMENT_UPLOADED'
  | 'POLICY_CREATED'
  | 'CLAIM_CREATED'
  | 'CONVERSION';

export interface ActivityLog {
  id: string;
  leadId: string;
  userId?: string;
  activityType: TimelineActivityType;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Timeline Event Types
export interface TimelineEvent {
  id: string;
  leadId: string;
  eventType: 'note' | 'activity' | 'email' | 'task' | 'call';
  timestamp: Date;
  type: string;
  title: string;
  description?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
}

// Unified Timeline Types
export type TimelineFilterType =
  | 'all'
  | 'notes'
  | 'activities'
  | 'emails'
  | 'tasks'
  | 'calls'
  | 'meetings'
  | 'documents';

export interface TimelineFilter {
  type?: TimelineFilterType;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  activityType?: TimelineActivityType;
  noteType?: TimelineNoteType;
  search?: string;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations: {
    notesCount: number;
    activitiesCount: number;
    emailsCount: number;
    tasksCount: number;
    callsCount: number;
    meetingsCount: number;
  };
}

// Note DTOs
export interface CreateTimelineNoteDto {
  leadId: string;
  content: string;
  visibility?: NoteVisibility;
  type?: TimelineNoteType;
  mentions?: string[];
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface UpdateTimelineNoteDto {
  content?: string;
  visibility?: NoteVisibility;
  type?: TimelineNoteType;
  mentions?: string[];
}

export interface NoteFilterDto {
  leadId?: string;
  authorId?: string;
  visibility?: NoteVisibility;
  type?: TimelineNoteType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Activity DTOs
export interface CreateActivityDto {
  leadId: string;
  userId?: string;
  activityType: TimelineActivityType;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilterDto {
  leadId?: string;
  userId?: string;
  activityType?: TimelineActivityType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Timeline Statistics
export interface TimelineStatistics {
  leadId: string;
  totalEvents: number;
  notesCount: number;
  activitiesCount: number;
  emailsCount: number;
  tasksCount: number;
  callsCount: number;
  lastActivity?: Date;
  firstActivity?: Date;
  averageActivitiesPerDay: number;
  mostActiveUser?: {
    userId: string;
    userName?: string;
    activityCount: number;
  };
}

// Event Summary
export interface EventSummary {
  date: Date;
  count: number;
  types: Record<string, number>;
}
