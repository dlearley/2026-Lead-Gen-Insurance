import { PrismaClient, Claim, ClaimDocument, ClaimNote, ClaimActivity } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  CreateClaimDto,
  UpdateClaimDto,
  AddClaimDocumentDto,
  AddClaimNoteDto,
  UpdateClaimNoteDto,
  ClaimFilterParams,
  ClaimStatistics,
} from '@insurance-lead-gen/types';

/**
 * Repository for Claims data access
 * Phase 10.1: Claims Management
 */
export class ClaimRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique claim number
   */
  private async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.claim.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `CLM-${year}-${number}`;
  }

  /**
   * Convert enum values from snake_case to UPPER_SNAKE_CASE for Prisma
   */
  private normalizeClaimType(claimType: string): string {
    return claimType.toUpperCase().replace(/-/g, '_');
  }

  private normalizeStatus(status: string): string {
    return status.toUpperCase().replace(/-/g, '_');
  }

  private normalizePriority(priority: string): string {
    return priority.toUpperCase();
  }

  private normalizeSeverity(severity: string): string {
    return severity.toUpperCase();
  }

  private normalizeDocumentType(docType: string): string {
    return docType.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Create a new claim
   */
  async createClaim(userId: string, data: CreateClaimDto): Promise<Claim> {
    const claimNumber = await this.generateClaimNumber();

    const claim = await this.prisma.claim.create({
      data: {
        claimNumber,
        leadId: data.leadId,
        policyNumber: data.policyNumber,
        insuranceType: data.insuranceType,
        claimType: this.normalizeClaimType(data.claimType) as any,
        priority: data.priority ? this.normalizePriority(data.priority) as any : 'MEDIUM',
        severity: data.severity ? this.normalizeSeverity(data.severity) as any : 'MODERATE',
        incidentDate: new Date(data.incidentDate),
        incidentLocation: data.incidentLocation,
        incidentDescription: data.incidentDescription,
        claimedAmount: data.claimedAmount,
        deductible: data.deductible,
        metadata: data.metadata as any,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: true,
        notes: true,
        activities: true,
      },
    });

    // Log activity
    await this.logActivity(claim.id, userId, 'claim_created', 'Claim created', 'New claim submitted');

    logger.info('Claim created', { claimId: claim.id, claimNumber: claim.claimNumber, userId });

    return claim;
  }

  /**
   * Get claim by ID
   */
  async getClaimById(claimId: string): Promise<Claim | null> {
    return this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Get claim by claim number
   */
  async getClaimByNumber(claimNumber: string): Promise<Claim | null> {
    return this.prisma.claim.findUnique({
      where: { claimNumber },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: true,
        notes: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Update claim
   */
  async updateClaim(claimId: string, userId: string, data: UpdateClaimDto): Promise<Claim> {
    const existingClaim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!existingClaim) {
      throw new Error('Claim not found');
    }

    const updateData: any = {};

    if (data.agentId !== undefined) updateData.agentId = data.agentId;
    if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber;
    if (data.claimType !== undefined) updateData.claimType = this.normalizeClaimType(data.claimType);
    if (data.status !== undefined) updateData.status = this.normalizeStatus(data.status);
    if (data.priority !== undefined) updateData.priority = this.normalizePriority(data.priority);
    if (data.severity !== undefined) updateData.severity = this.normalizeSeverity(data.severity);
    if (data.incidentDate !== undefined) updateData.incidentDate = new Date(data.incidentDate);
    if (data.incidentLocation !== undefined) updateData.incidentLocation = data.incidentLocation;
    if (data.incidentDescription !== undefined) updateData.incidentDescription = data.incidentDescription;
    if (data.claimedAmount !== undefined) updateData.claimedAmount = data.claimedAmount;
    if (data.approvedAmount !== undefined) updateData.approvedAmount = data.approvedAmount;
    if (data.deductible !== undefined) updateData.deductible = data.deductible;
    if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount;
    if (data.denialReason !== undefined) updateData.denialReason = data.denialReason;
    if (data.adjusterNotes !== undefined) updateData.adjusterNotes = data.adjusterNotes;
    if (data.fraudScore !== undefined) updateData.fraudScore = data.fraudScore;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as any;

    // Update timestamps based on status changes
    if (data.status) {
      const status = this.normalizeStatus(data.status);
      if (status === 'SUBMITTED' && !existingClaim.submittedAt) {
        updateData.submittedAt = new Date();
      } else if (status === 'UNDER_REVIEW' && !existingClaim.reviewedAt) {
        updateData.reviewedAt = new Date();
      } else if (status === 'APPROVED' && !existingClaim.approvedAt) {
        updateData.approvedAt = new Date();
      } else if (status === 'DENIED' && !existingClaim.deniedAt) {
        updateData.deniedAt = new Date();
      } else if (status === 'PAID' && !existingClaim.paidAt) {
        updateData.paidAt = new Date();
      } else if (status === 'CLOSED' && !existingClaim.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    const claim = await this.prisma.claim.update({
      where: { id: claimId },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: true,
        notes: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    // Log significant changes
    if (data.status && data.status !== existingClaim.status) {
      await this.logActivity(
        claimId,
        userId,
        'status_changed',
        'Status changed',
        `Status changed from ${existingClaim.status} to ${data.status}`,
        existingClaim.status,
        data.status
      );
    }

    if (data.agentId && data.agentId !== existingClaim.agentId) {
      await this.logActivity(claimId, userId, 'agent_assigned', 'Agent assigned', 'Claim assigned to agent');
    }

    logger.info('Claim updated', { claimId, userId });

    return claim;
  }

  /**
   * Delete claim
   */
  async deleteClaim(claimId: string, userId: string): Promise<void> {
    await this.prisma.claim.delete({
      where: { id: claimId },
    });

    logger.info('Claim deleted', { claimId, userId });
  }

  /**
   * Query claims with filters
   */
  async queryClaims(filters: ClaimFilterParams): Promise<{ claims: Claim[]; total: number }> {
    const where: any = {};

    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.policyNumber) where.policyNumber = filters.policyNumber;
    if (filters.insuranceType) where.insuranceType = filters.insuranceType;

    if (filters.claimType) {
      if (Array.isArray(filters.claimType)) {
        where.claimType = { in: filters.claimType.map(t => this.normalizeClaimType(t)) };
      } else {
        where.claimType = this.normalizeClaimType(filters.claimType);
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status.map(s => this.normalizeStatus(s)) };
      } else {
        where.status = this.normalizeStatus(filters.status);
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        where.priority = { in: filters.priority.map(p => this.normalizePriority(p)) };
      } else {
        where.priority = this.normalizePriority(filters.priority);
      }
    }

    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        where.severity = { in: filters.severity.map(s => this.normalizeSeverity(s)) };
      } else {
        where.severity = this.normalizeSeverity(filters.severity);
      }
    }

    if (filters.incidentDateFrom || filters.incidentDateTo) {
      where.incidentDate = {};
      if (filters.incidentDateFrom) where.incidentDate.gte = new Date(filters.incidentDateFrom);
      if (filters.incidentDateTo) where.incidentDate.lte = new Date(filters.incidentDateTo);
    }

    if (filters.submittedDateFrom || filters.submittedDateTo) {
      where.submittedAt = {};
      if (filters.submittedDateFrom) where.submittedAt.gte = new Date(filters.submittedDateFrom);
      if (filters.submittedDateTo) where.submittedAt.lte = new Date(filters.submittedDateTo);
    }

    if (filters.minAmount || filters.maxAmount) {
      where.claimedAmount = {};
      if (filters.minAmount) where.claimedAmount.gte = filters.minAmount;
      if (filters.maxAmount) where.claimedAmount.lte = filters.maxAmount;
    }

    if (filters.search) {
      where.OR = [
        { claimNumber: { contains: filters.search, mode: 'insensitive' } },
        { incidentDescription: { contains: filters.search, mode: 'insensitive' } },
        { incidentLocation: { contains: filters.search, mode: 'insensitive' } },
        { policyNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [claims, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          documents: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              documents: true,
              notes: true,
              activities: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { claims, total };
  }

  /**
   * Add document to claim
   */
  async addDocument(
    claimId: string,
    userId: string,
    data: AddClaimDocumentDto
  ): Promise<ClaimDocument> {
    const document = await this.prisma.claimDocument.create({
      data: {
        claimId,
        documentType: this.normalizeDocumentType(data.documentType) as any,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: userId,
        description: data.description,
      },
    });

    await this.logActivity(claimId, userId, 'document_added', 'Document added', `Document ${data.fileName} uploaded`);

    logger.info('Claim document added', { claimId, documentId: document.id, userId });

    return document;
  }

  /**
   * Get claim documents
   */
  async getDocuments(claimId: string): Promise<ClaimDocument[]> {
    return this.prisma.claimDocument.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.prisma.claimDocument.findUnique({
      where: { id: documentId },
    });

    if (document) {
      await this.prisma.claimDocument.delete({
        where: { id: documentId },
      });

      await this.logActivity(
        document.claimId,
        userId,
        'document_deleted',
        'Document deleted',
        `Document ${document.fileName} deleted`
      );

      logger.info('Claim document deleted', { documentId, userId });
    }
  }

  /**
   * Verify document
   */
  async verifyDocument(documentId: string, userId: string, isVerified: boolean): Promise<ClaimDocument> {
    const document = await this.prisma.claimDocument.update({
      where: { id: documentId },
      data: {
        isVerified,
        verifiedBy: isVerified ? userId : null,
        verifiedAt: isVerified ? new Date() : null,
      },
    });

    await this.logActivity(
      document.claimId,
      userId,
      'document_verified',
      'Document verified',
      `Document ${document.fileName} verification status: ${isVerified}`
    );

    logger.info('Claim document verified', { documentId, isVerified, userId });

    return document;
  }

  /**
   * Add note to claim
   */
  async addNote(claimId: string, userId: string, data: AddClaimNoteDto): Promise<ClaimNote> {
    const note = await this.prisma.claimNote.create({
      data: {
        claimId,
        authorId: userId,
        content: data.content,
        isInternal: data.isInternal || false,
      },
    });

    await this.logActivity(claimId, userId, 'note_added', 'Note added', 'New note added to claim');

    logger.info('Claim note added', { claimId, noteId: note.id, userId });

    return note;
  }

  /**
   * Get claim notes
   */
  async getNotes(claimId: string, includeInternal = true): Promise<ClaimNote[]> {
    const where: any = { claimId };
    if (!includeInternal) {
      where.isInternal = false;
    }

    return this.prisma.claimNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update note
   */
  async updateNote(noteId: string, userId: string, data: UpdateClaimNoteDto): Promise<ClaimNote> {
    const note = await this.prisma.claimNote.update({
      where: { id: noteId },
      data: {
        content: data.content,
        isInternal: data.isInternal,
      },
    });

    await this.logActivity(note.claimId, userId, 'note_updated', 'Note updated', 'Claim note modified');

    logger.info('Claim note updated', { noteId, userId });

    return note;
  }

  /**
   * Delete note
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await this.prisma.claimNote.findUnique({
      where: { id: noteId },
    });

    if (note) {
      await this.prisma.claimNote.delete({
        where: { id: noteId },
      });

      await this.logActivity(note.claimId, userId, 'note_deleted', 'Note deleted', 'Claim note removed');

      logger.info('Claim note deleted', { noteId, userId });
    }
  }

  /**
   * Get claim activities
   */
  async getActivities(claimId: string, limit = 50): Promise<ClaimActivity[]> {
    return this.prisma.claimActivity.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Log activity
   */
  async logActivity(
    claimId: string,
    userId: string | null,
    activityType: string,
    action: string,
    description: string,
    oldValue?: string,
    newValue?: string,
    metadata?: Record<string, unknown>
  ): Promise<ClaimActivity> {
    return this.prisma.claimActivity.create({
      data: {
        claimId,
        userId,
        activityType,
        action,
        description,
        oldValue,
        newValue,
        metadata: metadata as any,
      },
    });
  }

  /**
   * Get claim statistics
   */
  async getStatistics(filters?: Partial<ClaimFilterParams>): Promise<ClaimStatistics> {
    const where: any = {};

    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.agentId) where.agentId = filters.agentId;
    if (filters?.insuranceType) where.insuranceType = filters.insuranceType;

    const [
      totalClaims,
      statusCounts,
      typeCounts,
      priorityCounts,
      amountAgg,
      avgProcessingTime,
    ] = await Promise.all([
      this.prisma.claim.count({ where }),
      this.prisma.claim.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.claim.groupBy({
        by: ['claimType'],
        where,
        _count: true,
      }),
      this.prisma.claim.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.claim.aggregate({
        where,
        _sum: {
          claimedAmount: true,
          approvedAmount: true,
          paidAmount: true,
        },
        _avg: {
          claimedAmount: true,
          fraudScore: true,
        },
      }),
      this.calculateAverageProcessingTime(where),
    ]);

    const claimsByStatus: any = {};
    statusCounts.forEach(({ status, _count }) => {
      claimsByStatus[status.toLowerCase()] = _count;
    });

    const claimsByType: any = {};
    typeCounts.forEach(({ claimType, _count }) => {
      claimsByType[claimType.toLowerCase()] = _count;
    });

    const claimsByPriority: any = {};
    priorityCounts.forEach(({ priority, _count }) => {
      claimsByPriority[priority.toLowerCase()] = _count;
    });

    const approvedCount = claimsByStatus.approved || 0;
    const deniedCount = claimsByStatus.denied || 0;
    const totalDecided = approvedCount + deniedCount;

    return {
      totalClaims,
      claimsByStatus,
      claimsByType,
      claimsByPriority,
      totalClaimedAmount: amountAgg._sum.claimedAmount || 0,
      totalApprovedAmount: amountAgg._sum.approvedAmount || 0,
      totalPaidAmount: amountAgg._sum.paidAmount || 0,
      averageClaimAmount: amountAgg._avg.claimedAmount || 0,
      averageProcessingTime: avgProcessingTime || 0,
      approvalRate: totalDecided > 0 ? (approvedCount / totalDecided) * 100 : 0,
      denialRate: totalDecided > 0 ? (deniedCount / totalDecided) * 100 : 0,
      averageFraudScore: amountAgg._avg.fraudScore || 0,
    };
  }

  /**
   * Calculate average processing time in days
   */
  private async calculateAverageProcessingTime(where: any): Promise<number> {
    const closedClaims = await this.prisma.claim.findMany({
      where: {
        ...where,
        status: 'CLOSED',
        submittedAt: { not: null },
        closedAt: { not: null },
      },
      select: {
        submittedAt: true,
        closedAt: true,
      },
    });

    if (closedClaims.length === 0) return 0;

    const totalDays = closedClaims.reduce((sum, claim) => {
      if (claim.submittedAt && claim.closedAt) {
        const days = Math.floor(
          (claim.closedAt.getTime() - claim.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }
      return sum;
    }, 0);

    return totalDays / closedClaims.length;
  }
}
