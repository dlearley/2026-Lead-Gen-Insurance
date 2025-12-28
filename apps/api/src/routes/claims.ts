import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { authMiddleware } from '../middleware/auth.js';
import type {
  CreateClaimDto,
  UpdateClaimDto,
  AddClaimDocumentDto,
  AddClaimNoteDto,
  UpdateClaimNoteDto,
} from '@insurance-lead-gen/types';

const router = Router();

// For now, we'll use in-memory storage
// In production, this would proxy to the data-service
const claimsStore = new Map();

/**
 * Claims routes for API service
 * Phase 10.1: Claims Management
 */

// Get all claims with filters
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let claims = Array.from(claimsStore.values());

    // Apply filters
    if (req.query.leadId) {
      claims = claims.filter((c: any) => c.leadId === req.query.leadId);
    }
    if (req.query.agentId) {
      claims = claims.filter((c: any) => c.agentId === req.query.agentId);
    }
    if (req.query.status) {
      claims = claims.filter((c: any) => c.status === req.query.status);
    }
    if (req.query.insuranceType) {
      claims = claims.filter((c: any) => c.insuranceType === req.query.insuranceType);
    }
    if (req.query.search) {
      const search = (req.query.search as string).toLowerCase();
      claims = claims.filter((c: any) =>
        c.claimNumber?.toLowerCase().includes(search) ||
        c.incidentDescription?.toLowerCase().includes(search) ||
        c.incidentLocation?.toLowerCase().includes(search)
      );
    }

    // Sort by creation date (newest first)
    claims.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const total = claims.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedClaims = claims.slice(start, end);

    res.json({
      claims: paginatedClaims,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error getting claims', { error });
    res.status(500).json({ error: 'Failed to get claims' });
  }
});

// Get claim statistics
router.get('/statistics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const claims = Array.from(claimsStore.values());

    const stats = {
      totalClaims: claims.length,
      claimsByStatus: {} as Record<string, number>,
      claimsByType: {} as Record<string, number>,
      claimsByPriority: {} as Record<string, number>,
      totalClaimedAmount: 0,
      totalApprovedAmount: 0,
      totalPaidAmount: 0,
      averageClaimAmount: 0,
      averageProcessingTime: 0,
      approvalRate: 0,
      denialRate: 0,
      averageFraudScore: 0,
    };

    claims.forEach((claim: any) => {
      stats.claimsByStatus[claim.status] = (stats.claimsByStatus[claim.status] || 0) + 1;
      stats.claimsByType[claim.claimType] = (stats.claimsByType[claim.claimType] || 0) + 1;
      stats.claimsByPriority[claim.priority] = (stats.claimsByPriority[claim.priority] || 0) + 1;
      stats.totalClaimedAmount += claim.claimedAmount || 0;
      stats.totalApprovedAmount += claim.approvedAmount || 0;
      stats.totalPaidAmount += claim.paidAmount || 0;
    });

    if (claims.length > 0) {
      stats.averageClaimAmount = stats.totalClaimedAmount / claims.length;
    }

    const approved = stats.claimsByStatus['approved'] || 0;
    const denied = stats.claimsByStatus['denied'] || 0;
    const total = approved + denied;
    if (total > 0) {
      stats.approvalRate = (approved / total) * 100;
      stats.denialRate = (denied / total) * 100;
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error getting claim statistics', { error });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Create new claim
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const data: CreateClaimDto = req.body;

    // Validate required fields
    if (!data.leadId || !data.insuranceType || !data.claimType || !data.incidentDate || !data.incidentDescription || data.claimedAmount === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const now = new Date();

    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimNumber,
      leadId: data.leadId,
      policyNumber: data.policyNumber,
      insuranceType: data.insuranceType,
      claimType: data.claimType,
      status: 'draft',
      priority: data.priority || 'medium',
      severity: data.severity || 'moderate',
      incidentDate: new Date(data.incidentDate),
      incidentLocation: data.incidentLocation,
      incidentDescription: data.incidentDescription,
      claimedAmount: data.claimedAmount,
      deductible: data.deductible,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      documents: [],
      notes: [],
      activities: [{
        id: `activity-${Date.now()}`,
        claimId: `claim-${Date.now()}`,
        userId: user.id,
        activityType: 'claim_created',
        action: 'Claim created',
        description: 'New claim submitted',
        createdAt: now,
      }],
    };

    claimsStore.set(claim.id, claim);

    logger.info('Claim created', { claimId: claim.id, claimNumber, userId: user.id });
    res.status(201).json(claim);
  } catch (error) {
    logger.error('Error creating claim', { error });
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

// Get claim by ID
router.get('/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claim = claimsStore.get(claimId);

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    res.json(claim);
  } catch (error) {
    logger.error('Error getting claim', { error });
    res.status(500).json({ error: 'Failed to get claim' });
  }
});

// Update claim
router.patch('/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const user = req.user!;
    const data: UpdateClaimDto = req.body;

    const claim = claimsStore.get(claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    // Track status change for activity log
    const oldStatus = claim.status;

    // Update claim fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateClaimDto] !== undefined) {
        (claim as any)[key] = data[key as keyof UpdateClaimDto];
      }
    });

    claim.updatedAt = new Date();

    // Update status timestamps
    if (data.status) {
      if (data.status === 'submitted' && !claim.submittedAt) {
        claim.submittedAt = new Date();
      } else if (data.status === 'under_review' && !claim.reviewedAt) {
        claim.reviewedAt = new Date();
      } else if (data.status === 'approved' && !claim.approvedAt) {
        claim.approvedAt = new Date();
      } else if (data.status === 'denied' && !claim.deniedAt) {
        claim.deniedAt = new Date();
      } else if (data.status === 'paid' && !claim.paidAt) {
        claim.paidAt = new Date();
      } else if (data.status === 'closed' && !claim.closedAt) {
        claim.closedAt = new Date();
      }

      // Log status change
      if (oldStatus !== data.status) {
        claim.activities.push({
          id: `activity-${Date.now()}`,
          claimId: claim.id,
          userId: user.id,
          activityType: 'status_changed',
          action: 'Status changed',
          description: `Status changed from ${oldStatus} to ${data.status}`,
          oldValue: oldStatus,
          newValue: data.status,
          createdAt: new Date(),
        });
      }
    }

    claimsStore.set(claimId, claim);

    logger.info('Claim updated', { claimId, userId: user.id });
    res.json(claim);
  } catch (error) {
    logger.error('Error updating claim', { error });
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

// Delete claim
router.delete('/:claimId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const user = req.user!;

    if (!claimsStore.has(claimId)) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    claimsStore.delete(claimId);

    logger.info('Claim deleted', { claimId, userId: user.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting claim', { error });
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});

// ========================================
// CLAIM DOCUMENTS
// ========================================

// Get claim documents
router.get('/:claimId/documents', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claim = claimsStore.get(claimId);

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    res.json(claim.documents || []);
  } catch (error) {
    logger.error('Error getting claim documents', { error });
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Add document to claim
router.post('/:claimId/documents', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const user = req.user!;
    const data: AddClaimDocumentDto = req.body;

    const claim = claimsStore.get(claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    if (!data.fileName || !data.fileUrl || !data.documentType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId,
      documentType: data.documentType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize || 0,
      mimeType: data.mimeType || 'application/octet-stream',
      uploadedBy: user.id,
      description: data.description,
      isVerified: false,
      createdAt: new Date(),
    };

    if (!claim.documents) claim.documents = [];
    claim.documents.push(document);

    claim.activities.push({
      id: `activity-${Date.now()}`,
      claimId,
      userId: user.id,
      activityType: 'document_added',
      action: 'Document added',
      description: `Document ${data.fileName} uploaded`,
      createdAt: new Date(),
    });

    claimsStore.set(claimId, claim);

    logger.info('Claim document added', { claimId, documentId: document.id, userId: user.id });
    res.status(201).json(document);
  } catch (error) {
    logger.error('Error adding claim document', { error });
    res.status(500).json({ error: 'Failed to add document' });
  }
});

// Delete document
router.delete('/:claimId/documents/:documentId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId, documentId } = req.params;
    const user = req.user!;

    const claim = claimsStore.get(claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    const documentIndex = claim.documents?.findIndex((d: any) => d.id === documentId);
    if (documentIndex === -1 || documentIndex === undefined) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const document = claim.documents[documentIndex];
    claim.documents.splice(documentIndex, 1);

    claim.activities.push({
      id: `activity-${Date.now()}`,
      claimId,
      userId: user.id,
      activityType: 'document_deleted',
      action: 'Document deleted',
      description: `Document ${document.fileName} deleted`,
      createdAt: new Date(),
    });

    claimsStore.set(claimId, claim);

    logger.info('Claim document deleted', { claimId, documentId, userId: user.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting claim document', { error });
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ========================================
// CLAIM NOTES
// ========================================

// Get claim notes
router.get('/:claimId/notes', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claim = claimsStore.get(claimId);

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    const includeInternal = req.query.includeInternal === 'true';
    let notes = claim.notes || [];

    if (!includeInternal) {
      notes = notes.filter((n: any) => !n.isInternal);
    }

    res.json(notes);
  } catch (error) {
    logger.error('Error getting claim notes', { error });
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// Add note to claim
router.post('/:claimId/notes', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const user = req.user!;
    const data: AddClaimNoteDto = req.body;

    const claim = claimsStore.get(claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    if (!data.content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimId,
      authorId: user.id,
      content: data.content,
      isInternal: data.isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!claim.notes) claim.notes = [];
    claim.notes.push(note);

    claim.activities.push({
      id: `activity-${Date.now()}`,
      claimId,
      userId: user.id,
      activityType: 'note_added',
      action: 'Note added',
      description: 'New note added to claim',
      createdAt: new Date(),
    });

    claimsStore.set(claimId, claim);

    logger.info('Claim note added', { claimId, noteId: note.id, userId: user.id });
    res.status(201).json(note);
  } catch (error) {
    logger.error('Error adding claim note', { error });
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Delete note
router.delete('/:claimId/notes/:noteId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId, noteId } = req.params;
    const user = req.user!;

    const claim = claimsStore.get(claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    const noteIndex = claim.notes?.findIndex((n: any) => n.id === noteId);
    if (noteIndex === -1 || noteIndex === undefined) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    claim.notes.splice(noteIndex, 1);

    claim.activities.push({
      id: `activity-${Date.now()}`,
      claimId,
      userId: user.id,
      activityType: 'note_deleted',
      action: 'Note deleted',
      description: 'Claim note removed',
      createdAt: new Date(),
    });

    claimsStore.set(claimId, claim);

    logger.info('Claim note deleted', { claimId, noteId, userId: user.id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting claim note', { error });
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ========================================
// CLAIM ACTIVITIES
// ========================================

// Get claim activities
router.get('/:claimId/activities', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimId } = req.params;
    const claim = claimsStore.get(claimId);

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const activities = (claim.activities || []).slice(0, limit);

    res.json(activities);
  } catch (error) {
    logger.error('Error getting claim activities', { error });
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

export default router;
