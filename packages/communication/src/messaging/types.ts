// Messaging Types

export type ConversationType = 'direct' | 'group' | 'case'

export type MessageContentType = 'text' | 'system' | 'file'

export type UserPresenceStatus = 'online' | 'away' | 'offline' | 'dnd'

export interface Conversation {
  id: string
  organizationId: string
  name?: string
  type: ConversationType
  isArchived: boolean
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ConversationParticipant {
  id: string
  conversationId: string
  userId: string
  role: 'member' | 'moderator' | 'admin'
  joinedAt: Date
  leftAt?: Date
  lastReadAt?: Date
  isMuted: boolean
}

export interface Message {
  id: string
  conversationId: string
  authorId: string
  content: string
  contentType: MessageContentType
  editedAt?: Date
  deletedAt?: Date
  isPinned: boolean
  threadId?: string
  createdAt: Date
  reactions: MessageReaction[]
  attachments: MessageAttachment[]
  mentions: string[]
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: Date
}

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: Date
}

export interface UserPresence {
  id: string
  userId: string
  organizationId: string
  status: UserPresenceStatus
  lastSeen: Date
  updatedAt: Date
}

export interface CreateConversationInput {
  organizationId: string
  name?: string
  type: ConversationType
  participantIds: string[]
}

export interface SendMessageInput {
  conversationId: string
  authorId: string
  content: string
  contentType?: MessageContentType
  threadId?: string
  mentions?: string[]
  attachments?: { fileName: string; fileUrl: string; fileSize: number; mimeType: string }[]
}

export interface UpdateMessageInput {
  messageId: string
  content: string
}

export interface AddReactionInput {
  messageId: string
  userId: string
  emoji: string
}

export interface UpdatePresenceInput {
  userId: string
  organizationId: string
  status: UserPresenceStatus
}