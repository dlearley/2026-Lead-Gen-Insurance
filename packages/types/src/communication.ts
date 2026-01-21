// Communication Types - Phase 24

export type ConversationType = 'direct' | 'group' | 'case';
export type MessageContentType = 'text' | 'system' | 'file';
export type UserPresenceStatus = 'online' | 'away' | 'offline' | 'dnd';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed';
export type CallType = 'one_on_one' | 'group';
export type MediaType = 'audio' | 'video';
export type CaseStatus = 'new' | 'in_progress' | 'on_hold' | 'completed' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type CaseRelationshipType = 'parent' | 'child' | 'related' | 'duplicate';
export type DocumentPermissionType = 'view' | 'comment' | 'edit' | 'owner';
export type NotificationType = 'message' | 'call' | 'case' | 'document';
export type MessageNotificationPreference = 'all' | 'mentions' | 'none';

// Messaging types
export interface Conversation {
  id: string;
  organizationId: string;
  name?: string;
  type: ConversationType;
  isArchived: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  leftAt?: Date;
  lastReadAt?: Date;
  isMuted: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  contentType: MessageContentType;
  editedAt?: Date;
  deletedAt?: Date;
  isPinned: boolean;
  threadId?: string;
  createdAt: Date;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  mentions: string[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface UserPresence {
  id: string;
  userId: string;
  organizationId: string;
  status: UserPresenceStatus;
  lastSeen: Date;
  updatedAt: Date;
}

// WebRTC types
export interface Call {
  id: string;
  organizationId: string;
  initiatorId: string;
  status: CallStatus;
  callType: CallType;
  mediaType: MediaType;
  roomId?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  recordingId?: string;
  transcription?: string;
  createdAt: Date;
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  mediaEnabled: { audio: boolean; video: boolean };
}

export interface CallRecording {
  id: string;
  callId: string;
  fileUrl: string;
  fileSize: number;
  duration: number;
  storageProvider: string;
  createdAt: Date;
}

export interface MeetingRoom {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  roomUrl: string;
  password?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingSchedule {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  organizers: string[];
  participants: string[];
  createdAt: Date;
}

// Case management types
export interface Case {
  id: string;
  organizationId: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedToId?: string;
  createdById: string;
  leadId?: string;
  tags: string[];
  customFields: any;
  dueDate?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  activityType: string;
  activityId?: string;
  description: string;
  userId: string;
  createdAt: Date;
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorId: string;
  content: string;
  editedAt?: Date;
  isInternal: boolean;
  createdAt: Date;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  documentId: string;
  documentType: string;
  addedAt: Date;
}

export interface CaseRelationship {
  id: string;
  caseId: string;
  relatedCaseId: string;
  relationshipType: CaseRelationshipType;
  createdAt: Date;
}

// Document collaboration types
export interface Document {
  id: string;
  organizationId: string;
  title: string;
  mimeType: string;
  ownerId: string;
  isPublished: boolean;
  isArchived: boolean;
  fileSize: number;
  pageCount?: number;
  storageUrl: string;
  tags: string[];
  customMetadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  fileSize: number;
  createdBy: string;
  createdAt: Date;
  changeSummary?: string;
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  userId: string;
  permission: DocumentPermissionType;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  pageNumber?: number;
  highlights?: any;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  organizationId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  messageNotifications: MessageNotificationPreference;
  callNotifications: boolean;
  caseNotifications: boolean;
  documentNotifications: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursEnabled: boolean;
  updatedAt: Date;
}

export interface PushToken {
  id: string;
  userId: string;
  organizationId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface CreateConversationInput {
  organizationId: string;
  name?: string;
  type: ConversationType;
  participantIds: string[];
}

export interface SendMessageInput {
  conversationId: string;
  authorId: string;
  content: string;
  contentType?: MessageContentType;
  threadId?: string;
  mentions?: string[];
  attachments?: { fileName: string; fileUrl: string; fileSize: number; mimeType: string }[];
}

export interface UpdateMessageInput {
  messageId: string;
  content: string;
}

export interface AddReactionInput {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface UpdatePresenceInput {
  userId: string;
  organizationId: string;
  status: UserPresenceStatus;
}

export interface InitiateCallInput {
  organizationId: string;
  initiatorId: string;
  participantIds: string[];
  callType: CallType;
  mediaType: MediaType;
  roomId?: string;
}

export interface AnswerCallInput {
  callId: string;
  userId: string;
  mediaEnabled: { audio: boolean; video: boolean };
}

export interface EndCallInput {
  callId: string;
  userId: string;
}

export interface StartRecordingInput {
  callId: string;
  storageProvider: string;
}

export interface CreateMeetingRoomInput {
  organizationId: string;
  name: string;
  description?: string;
  password?: string;
  capacity?: number;
}

export interface ScheduleMeetingInput {
  roomId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  organizers: string[];
  participants: string[];
}

export interface UploadDocumentInput {
  organizationId: string;
  ownerId: string;
  title: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  tags?: string[];
  customMetadata?: any;
  isPublished?: boolean;
}

export interface ShareDocumentInput {
  documentId: string;
  userId: string;
  permission: DocumentPermissionType;
  grantedBy: string;
  expiresAt?: Date;
}

export interface AddDocumentCommentInput {
  documentId: string;
  authorId: string;
  content: string;
  pageNumber?: number;
  highlights?: any;
}

export interface CreateCaseInput {
  organizationId: string;
  title: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  assignedToId?: string;
  createdById: string;
  leadId?: string;
  tags?: string[];
  customFields?: any;
  dueDate?: Date;
}

export interface AddCaseNoteInput {
  caseId: string;
  authorId: string;
  content: string;
  isInternal?: boolean;
}

export interface AddCaseActivityInput {
  caseId: string;
  activityType: string;
  activityId?: string;
  description: string;
  userId: string;
}

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface UpdateNotificationPreferencesInput {
  userId: string;
  organizationId: string;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  messageNotifications?: MessageNotificationPreference;
  callNotifications?: boolean;
  caseNotifications?: boolean;
  documentNotifications?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursEnabled?: boolean;
}

export interface RegisterPushTokenInput {
  userId: string;
  organizationId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}

export interface SendPushNotificationInput {
  userId: string;
  title: string;
  body: string;
  data?: any;
}