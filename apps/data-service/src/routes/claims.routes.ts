import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { ClaimRepository } from '../services/claim-repository.js';
import type {
  CreateClaimDto,
  UpdateClaimDto,
  AddClaimDocumentDto,
  AddClaimNoteDto,
  UpdateClaimNoteDto,
  ClaimFilterParams,
} from '@insurance-lead-gen/types';

/**
 * Create Claims routes for data service
 * Phase 10.1: Claims Management
 */
export function createClaimsRoutes(claimRepository: ClaimRepository): Router {
  const router = Router();

  // Get all claims with filters
  router.get('/', async (req: Request, res: Response) => {
    try {
      const filters: ClaimFilterParams = {
        leadId: req.query.leadId as string,
        agentId: req.query.agentId as string,
        policyNumber: req.query.policyNumber as string,
        insuranceType: req.query.insuranceType as string,
        claimType: req.query.claimType as any,
        status: req.query.status as any,
        priority: req.query.priority as any,
        severity: req.query.severity as any,
        incidentDateFrom: req.query.incidentDateFrom as string,
        incidentDateTo: req.query.incidentDateTo as string,
        submittedDateFrom: req.query.submittedDateFrom as string,
        submittedDateTo: req.query.submittedDateTo as string,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await claimRepository.queryClaims(filters);

      res.json({
        claims: result.claims,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying claims', { error });
      res.status(500).json({ error: 'Failed to query claims' });
    }
  });

  // Get claim statistics
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const filters: Partial<ClaimFilterParams> = {
        leadId: req.query.leadId as string,
        agentId: req.query.agentId as string,
        insuranceType: req.query.insuranceType as string,
      };

      const statistics = await claimRepository.getStatistics(filters);
      res.json(statistics);
    } catch (error) {
      logger.error('Error getting claim statistics', { error });
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  });

  // Create new claim
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: CreateClaimDto = req.body;

      if (!data.leadId || !data.insuranceType || !data.claimType || !data.incidentDate || !data.incidentDescription || data.claimedAmount === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const claim = await claimRepository.createClaim(userId, data);
      res.status(201).json(claim);
    } catch (error) {
      logger.error('Error creating claim', { error });
      res.status(500).json({ error: 'Failed to create claim' });
    }
  });

  // Get claim by claim number
  router.get('/number/:claimNumber', async (req: Request, res: Response) => {
    try {
      const { claimNumber } = req.params;
      const claim = await claimRepository.getClaimByNumber(claimNumber);

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      res.json(claim);
    } catch (error) {
      logger.error('Error getting claim by number', { error });
      res.status(500).json({ error: 'Failed to get claim' });
    }
  });

  // Get claim by ID
  router.get('/:claimId', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const claim = await claimRepository.getClaimById(claimId);

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      res.json(claim);
    } catch (error) {
      logger.error('Error getting claim', { error });
      res.status(500).json({ error: 'Failed to get claim' });
    }
  });

  // Update claim
  router.patch('/:claimId', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: UpdateClaimDto = req.body;

      const claim = await claimRepository.updateClaim(claimId, userId, data);
      res.json(claim);
    } catch (error) {
      logger.error('Error updating claim', { error });
      if ((error as Error).message === 'Claim not found') {
        res.status(404).json({ error: 'Claim not found' });
      } else {
        res.status(500).json({ error: 'Failed to update claim' });
      }
    }
  });

  // Delete claim
  router.delete('/:claimId', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';

      await claimRepository.deleteClaim(claimId, userId);
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
  router.get('/:claimId/documents', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const documents = await claimRepository.getDocuments(claimId);
      res.json(documents);
    } catch (error) {
      logger.error('Error getting claim documents', { error });
      res.status(500).json({ error: 'Failed to get documents' });
    }
  });

  // Add document to claim
  router.post('/:claimId/documents', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: AddClaimDocumentDto = req.body;

      if (!data.fileName || !data.fileUrl || !data.documentType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const document = await claimRepository.addDocument(claimId, userId, data);
      res.status(201).json(document);
    } catch (error) {
      logger.error('Error adding claim document', { error });
      res.status(500).json({ error: 'Failed to add document' });
    }
  });

  // Verify document
  router.patch('/documents/:documentId/verify', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';
      const { isVerified } = req.body;

      if (isVerified === undefined) {
        return res.status(400).json({ error: 'isVerified field is required' });
      }

      const document = await claimRepository.verifyDocument(documentId, userId, isVerified);
      res.json(document);
    } catch (error) {
      logger.error('Error verifying claim document', { error });
      res.status(500).json({ error: 'Failed to verify document' });
    }
  });

  // Delete document
  router.delete('/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';

      await claimRepository.deleteDocument(documentId, userId);
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
  router.get('/:claimId/notes', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const includeInternal = req.query.includeInternal === 'true';
      const notes = await claimRepository.getNotes(claimId, includeInternal);
      res.json(notes);
    } catch (error) {
      logger.error('Error getting claim notes', { error });
      res.status(500).json({ error: 'Failed to get notes' });
    }
  });

  // Add note to claim
  router.post('/:claimId/notes', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: AddClaimNoteDto = req.body;

      if (!data.content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const note = await claimRepository.addNote(claimId, userId, data);
      res.status(201).json(note);
    } catch (error) {
      logger.error('Error adding claim note', { error });
      res.status(500).json({ error: 'Failed to add note' });
    }
  });

  // Update note
  router.patch('/notes/:noteId', async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: UpdateClaimNoteDto = req.body;

      const note = await claimRepository.updateNote(noteId, userId, data);
      res.json(note);
    } catch (error) {
      logger.error('Error updating claim note', { error });
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  // Delete note
  router.delete('/notes/:noteId', async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const userId = req.headers['x-user-id'] as string || 'system';

      await claimRepository.deleteNote(noteId, userId);
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
  router.get('/:claimId/activities', async (req: Request, res: Response) => {
    try {
      const { claimId } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const activities = await claimRepository.getActivities(claimId, limit);
      res.json(activities);
    } catch (error) {
      logger.error('Error getting claim activities', { error });
      res.status(500).json({ error: 'Failed to get activities' });
    }
  });

  return router;
}
