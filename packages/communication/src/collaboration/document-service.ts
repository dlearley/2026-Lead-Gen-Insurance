// Document Service - Manage documents and permissions

import { PrismaClient } from '@prisma/client'
import { Document, DocumentVersion, DocumentPermission, DocumentComment, UploadDocumentInput, ShareDocumentInput, AddDocumentCommentInput } from './types.js'

export class DocumentService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async uploadDocument(input: UploadDocumentInput): Promise<Document> {
    const { organizationId, ownerId, title, mimeType, fileSize, storageUrl, tags = [], customMetadata = {}, isPublished = false } = input

    return this.prisma.document.create({
      data: {
        organizationId,
        title,
        mimeType,
        ownerId,
        isPublished,
        fileSize,
        storageUrl,
        tags,
        customMetadata,
        // Set pageCount based on mimeType if available
        pageCount: mimeType === 'application/pdf' ? 1 : undefined,
      },
    })
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: true,
        permissions: true,
        comments: true,
      },
    })
  }

  async listDocuments(organizationId: string, userId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: {
        organizationId,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
      },
      include: {
        versions: true,
        permissions: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async updateDocument(
    documentId: string,
    data: Partial<Omit<Document, 'id' | 'organizationId' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Document> {
    return this.prisma.document.update({
      where: { id: documentId },
      data,
    })
  }

  async deleteDocument(documentId: string): Promise<Document> {
    return this.prisma.document.delete({
      where: { id: documentId },
    })
  }

  async shareDocument(input: ShareDocumentInput): Promise<DocumentPermission> {
    const { documentId, userId, permission, grantedBy, expiresAt } = input

    return this.prisma.documentPermission.create({
      data: {
        documentId,
        userId,
        permission,
        grantedBy,
        expiresAt,
      },
    })
  }

  async updateDocumentPermission(
    documentId: string,
    userId: string,
    permission: DocumentPermission
  ): Promise<DocumentPermission> {
    return this.prisma.documentPermission.update({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
      data: { permission },
    })
  }

  async revokeDocumentAccess(documentId: string, userId: string): Promise<DocumentPermission> {
    return this.prisma.documentPermission.delete({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    })
  }

  async getDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    return this.prisma.documentPermission.findMany({
      where: { documentId },
    })
  }

  async addDocumentComment(input: AddDocumentCommentInput): Promise<DocumentComment> {
    const { documentId, authorId, content, pageNumber, highlights } = input

    return this.prisma.documentComment.create({
      data: {
        documentId,
        authorId,
        content,
        pageNumber,
        highlights,
      },
    })
  }

  async getDocumentComments(documentId: string): Promise<DocumentComment[]> {
    return this.prisma.documentComment.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async resolveComment(commentId: string, resolvedBy: string): Promise<DocumentComment> {
    return this.prisma.documentComment.update({
      where: { id: commentId },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
      },
    })
  }

  async deleteComment(commentId: string): Promise<DocumentComment> {
    return this.prisma.documentComment.delete({
      where: { id: commentId },
    })
  }

  async searchDocuments(
    organizationId: string,
    query: string,
    userId: string,
    limit: number = 20
  ): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: {
        organizationId,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        versions: true,
        permissions: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  }

  async getUserDocumentAccess(documentId: string, userId: string): Promise<DocumentPermission | null> {
    return this.prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    })
  }

  async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) return false

    if (document.ownerId === userId) return true

    const permission = await this.prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    })

    return !!permission
  }
}