// Collaboration Types

export type DocumentPermission = 'view' | 'comment' | 'edit' | 'owner'

export type CaseStatus = 'new' | 'in_progress' | 'on_hold' | 'completed' | 'closed'

export type CasePriority = 'low' | 'medium' | 'high' | 'critical'

export type CaseRelationshipType = 'parent' | 'child' | 'related' | 'duplicate'

export interface Document {
  id: string
  organizationId: string
  title: string
  mimeType: string
  ownerId: string
  isPublished: boolean
  isArchived: boolean
  fileSize: number
  pageCount?: number
  storageUrl: string
  tags: string[]
  customMetadata: any
  createdAt: Date
  updatedAt: Date
}

export interface DocumentVersion {
  id: string
  documentId: string
  versionNumber: number
  fileUrl: string
  fileSize: number
  createdBy: string
  createdAt: Date
  changeSummary?: string
}

export interface DocumentPermission {
  id: string
  documentId: string
  userId: string
  permission: DocumentPermission
  grantedAt: Date
  grantedBy: string
  expiresAt?: Date
}

export interface DocumentComment {
  id: string
  documentId: string
  authorId: string
  content: string
  pageNumber?: number
  highlights?: any
  resolvedAt?: Date
  resolvedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface Case {
  id: string
  organizationId: string
  caseNumber: string
  title: string
  description?: string
  status: CaseStatus
  priority: CasePriority
  assignedToId?: string
  createdById: string
  leadId?: string
  tags: string[]
  customFields: any
  dueDate?: Date
  closedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CaseActivity {
  id: string
  caseId: string
  activityType: string
  activityId?: string
  description: string
  userId: string
  createdAt: Date
}

export interface CaseNote {
  id: string
  caseId: string
  authorId: string
  content: string
  editedAt?: Date
  isInternal: boolean
  createdAt: Date
}

export interface CaseDocument {
  id: string
  caseId: string
  documentId: string
  documentType: string
  addedAt: Date
}

export interface CaseRelationship {
  id: string
  caseId: string
  relatedCaseId: string
  relationshipType: CaseRelationshipType
  createdAt: Date
}

export interface UploadDocumentInput {
  organizationId: string
  ownerId: string
  title: string
  mimeType: string
  fileSize: number
  storageUrl: string
  tags?: string[]
  customMetadata?: any
  isPublished?: boolean
}

export interface ShareDocumentInput {
  documentId: string
  userId: string
  permission: DocumentPermission
  grantedBy: string
  expiresAt?: Date
}

export interface AddDocumentCommentInput {
  documentId: string
  authorId: string
  content: string
  pageNumber?: number
  highlights?: any
}

export interface CreateCaseInput {
  organizationId: string
  title: string
  description?: string
  status?: CaseStatus
  priority?: CasePriority
  assignedToId?: string
  createdById: string
  leadId?: string
  tags?: string[]
  customFields?: any
  dueDate?: Date
}

export interface AddCaseNoteInput {
  caseId: string
  authorId: string
  content: string
  isInternal?: boolean
}

export interface AddCaseActivityInput {
  caseId: string
  activityType: string
  activityId?: string
  description: string
  userId: string
}