// Case Service - Case management functionality

import { PrismaClient } from '@prisma/client'
import { Case, CaseNote, CaseActivity, CaseDocument, CaseRelationship, CreateCaseInput, AddCaseNoteInput, AddCaseActivityInput } from './types.js'

export class CaseService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createCase(input: CreateCaseInput): Promise<Case> {
    const {
      organizationId,
      title,
      description,
      status = 'new',
      priority = 'medium',
      assignedToId,
      createdById,
      leadId,
      tags = [],
      customFields = {},
      dueDate,
    } = input

    // Generate case number
    const caseNumber = await this.generateCaseNumber(organizationId)

    return this.prisma.case.create({
      data: {
        organizationId,
        caseNumber,
        title,
        description,
        status,
        priority,
        assignedToId,
        createdById,
        leadId,
        tags,
        customFields,
        dueDate,
      },
    })
  }

  async getCase(caseId: string): Promise<Case | null> {
    return this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        activities: true,
        notes: true,
        documents: true,
        relationships: true,
      },
    })
  }

  async listCases(organizationId: string): Promise<Case[]> {
    return this.prisma.case.findMany({
      where: { organizationId },
      include: {
        activities: true,
        notes: true,
        documents: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async updateCase(
    caseId: string,
    data: Partial<Omit<Case, 'id' | 'organizationId' | 'caseNumber' | 'createdAt' | 'updatedAt'>>
  ): Promise<Case> {
    return this.prisma.case.update({
      where: { id: caseId },
      data,
    })
  }

  async closeCase(caseId: string): Promise<Case> {
    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    })
  }

  async reopenCase(caseId: string): Promise<Case> {
    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'in_progress',
        closedAt: null,
      },
    })
  }

  async assignCase(caseId: string, assignedToId: string): Promise<Case> {
    return this.prisma.case.update({
      where: { id: caseId },
      data: { assignedToId },
    })
  }

  async addCaseNote(input: AddCaseNoteInput): Promise<CaseNote> {
    const { caseId, authorId, content, isInternal = true } = input

    return this.prisma.caseNote.create({
      data: {
        caseId,
        authorId,
        content,
        isInternal,
      },
    })
  }

  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    return this.prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async updateCaseNote(caseNoteId: string, content: string): Promise<CaseNote> {
    return this.prisma.caseNote.update({
      where: { id: caseNoteId },
      data: {
        content,
        editedAt: new Date(),
      },
    })
  }

  async deleteCaseNote(caseNoteId: string): Promise<CaseNote> {
    return this.prisma.caseNote.delete({
      where: { id: caseNoteId },
    })
  }

  async addCaseActivity(input: AddCaseActivityInput): Promise<CaseActivity> {
    const { caseId, activityType, activityId, description, userId } = input

    return this.prisma.caseActivity.create({
      data: {
        caseId,
        activityType,
        activityId,
        description,
        userId,
      },
    })
  }

  async getCaseActivities(caseId: string): Promise<CaseActivity[]> {
    return this.prisma.caseActivity.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addCaseDocument(caseId: string, documentId: string, documentType: string): Promise<CaseDocument> {
    return this.prisma.caseDocument.create({
      data: {
        caseId,
        documentId,
        documentType,
      },
    })
  }

  async getCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    return this.prisma.caseDocument.findMany({
      where: { caseId },
      include: {
        // This would include the actual document in a real implementation
      },
    })
  }

  async removeCaseDocument(caseId: string, documentId: string): Promise<CaseDocument> {
    return this.prisma.caseDocument.delete({
      where: {
        caseId_documentId: {
          caseId,
          documentId,
        },
      },
    })
  }

  async addCaseRelationship(
    caseId: string,
    relatedCaseId: string,
    relationshipType: CaseRelationshipType
  ): Promise<CaseRelationship> {
    return this.prisma.caseRelationship.create({
      data: {
        caseId,
        relatedCaseId,
        relationshipType,
      },
    })
  }

  async getCaseRelationships(caseId: string): Promise<CaseRelationship[]> {
    return this.prisma.caseRelationship.findMany({
      where: { caseId },
    })
  }

  async removeCaseRelationship(caseId: string, relatedCaseId: string): Promise<CaseRelationship> {
    return this.prisma.caseRelationship.delete({
      where: {
        caseId_relatedCaseId: {
          caseId,
          relatedCaseId,
        },
      },
    })
  }

  async searchCases(
    organizationId: string,
    query: string,
    status?: CaseStatus,
    priority?: CasePriority,
    limit: number = 20
  ): Promise<Case[]> {
    return this.prisma.case.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { caseNumber: { contains: query, mode: 'insensitive' } },
        ],
        status,
        priority,
      },
      include: {
        activities: true,
        notes: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  }

  async getUserCases(userId: string): Promise<Case[]> {
    return this.prisma.case.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { createdById: userId },
        ],
      },
      include: {
        activities: true,
        notes: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getCaseStats(organizationId: string): Promise<{
    totalCases: number
    openCases: number
    closedCases: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }> {
    const cases = await this.prisma.case.findMany({
      where: { organizationId },
    })

    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}

    cases.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1
    })

    return {
      totalCases: cases.length,
      openCases: cases.filter((c) => c.status !== 'closed').length,
      closedCases: cases.filter((c) => c.status === 'closed').length,
      byStatus,
      byPriority,
    }
  }

  private async generateCaseNumber(organizationId: string): Promise<string> {
    // Generate a unique case number for the organization
    const count = await this.prisma.case.count({
      where: { organizationId },
    })

    // Format: ORG-YYYYMMDD-XXXX
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sequence = (count + 1).toString().padStart(4, '0')

    return `${organizationId.slice(0, 6)}-${datePart}-${sequence}`
  }
}