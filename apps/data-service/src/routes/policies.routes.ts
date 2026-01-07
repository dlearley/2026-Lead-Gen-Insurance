import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { PolicyRepository } from '../services/policy-repository.js';
import type {
  CreatePolicyDto,
  UpdatePolicyDto,
  CreateEndorsementDto,
  UpdateEndorsementDto,
  AddPolicyDocumentDto,
  UpdatePolicyDocumentDto,
  CreatePolicyPaymentDto,
  UpdatePolicyPaymentDto,
  RenewPolicyDto,
  UpdatePolicyRenewalDto,
  PolicyFilterParams,
  EndorsementFilterParams,
  PolicyDocumentFilterParams,
  PolicyPaymentFilterParams,
  PolicyRenewalFilterParams,
} from '@insurance-lead-gen/types';

/**
 * Create Policy routes for data service
 * Phase 26.3: Policy Management & Lifecycle
 */
export function createPoliciesRoutes(policyRepository: PolicyRepository): Router {
  const router = Router();

  // ========================================
  // CORE POLICY OPERATIONS
  // ========================================

  // Query policies with filters
  router.get('/', async (req: Request, res: Response) => {
    try {
      const filters: PolicyFilterParams = {
        leadId: req.query.leadId as string,
        agentId: req.query.agentId as string,
        carrier: req.query.carrier as string,
        insuranceType: req.query.insuranceType as string,
        status: req.query.status as any,
        policyNumber: req.query.policyNumber as string,
        effectiveDateFrom: req.query.effectiveDateFrom as string,
        effectiveDateTo: req.query.effectiveDateTo as string,
        expirationDateFrom: req.query.expirationDateFrom as string,
        expirationDateTo: req.query.expirationDateTo as string,
        minPremium: req.query.minPremium ? Number(req.query.minPremium) : undefined,
        maxPremium: req.query.maxPremium ? Number(req.query.maxPremium) : undefined,
        renewalOfPolicyId: req.query.renewalOfPolicyId as string,
        renewedToPolicyId: req.query.renewedToPolicyId as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await policyRepository.queryPolicies(filters);

      res.json({
        policies: result.policies,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying policies', { error });
      res.status(500).json({ error: 'Failed to query policies' });
    }
  });

  // Get policy statistics
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const filters: Partial<PolicyFilterParams> = {
        leadId: req.query.leadId as string,
        agentId: req.query.agentId as string,
        insuranceType: req.query.insuranceType as string,
        status: req.query.status as any,
      };

      const statistics = await policyRepository.getStatistics(filters);
      res.json(statistics);
    } catch (error) {
      logger.error('Error getting policy statistics', { error });
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  });

  // Get policy by policy number
  router.get('/number/:policyNumber', async (req: Request, res: Response) => {
    try {
      const { policyNumber } = req.params;
      const policy = await policyRepository.getPolicyByNumber(policyNumber);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      logger.error('Error fetching policy by number', { error, policyNumber: req.params.policyNumber });
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  });

  // Get expiring policies
  router.get('/expiring', async (req: Request, res: Response) => {
    try {
      const daysAhead = req.query.daysAhead ? Number(req.query.daysAhead) : 30;
      const summary = await policyRepository.getExpiringPolicies(daysAhead);
      res.json(summary);
    } catch (error) {
      logger.error('Error getting expiring policies', { error });
      res.status(500).json({ error: 'Failed to get expiring policies' });
    }
  });

  // Create new policy
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const data: CreatePolicyDto = req.body;

      if (!data.leadId || !data.insuranceType || !data.effectiveDate || !data.expirationDate || data.premiumAmount === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const policy = await policyRepository.createPolicy(userId, data);
      res.status(201).json(policy);
    } catch (error) {
      logger.error('Error creating policy', { error });
      res.status(500).json({ error: 'Failed to create policy' });
    }
  });

  // Get policy by ID
  router.get('/:policyId', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const policy = await policyRepository.getPolicyById(policyId);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      logger.error('Error fetching policy', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  });

  // Update policy
  router.patch('/:policyId', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;
      const data: UpdatePolicyDto = req.body;

      const policy = await policyRepository.updatePolicy(userId, policyId, data);
      res.json(policy);
    } catch (error) {
      logger.error('Error updating policy', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to update policy' });
    }
  });

  // Delete policy
  router.delete('/:policyId', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;

      await policyRepository.deletePolicy(userId, policyId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting policy', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to delete policy' });
    }
  });

  // ========================================
  // ENDORSEMENTS
  // ========================================

  // Get policy endorsements
  router.get('/:policyId/endorsements', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;

      const filters: EndorsementFilterParams = {
        policyId,
        type: req.query.type as any,
        status: req.query.status as any,
        effectiveDateFrom: req.query.effectiveDateFrom as string,
        effectiveDateTo: req.query.effectiveDateTo as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await policyRepository.queryEndorsements(filters);

      res.json({
        endorsements: result.endorsements,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying endorsements', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to query endorsements' });
    }
  });

  // Create endorsement
  router.post('/:policyId/endorsements', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;
      const data: CreateEndorsementDto = req.body;

      if (!data.type || !data.effectiveDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const endorsement = await policyRepository.createEndorsement(userId, policyId, data);
      res.status(201).json(endorsement);
    } catch (error) {
      logger.error('Error creating endorsement', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to create endorsement' });
    }
  });

  // Get endorsement by ID
  router.get('/endorsements/:endorsementId', async (req: Request, res: Response) => {
    try {
      const { endorsementId } = req.params;
      const filters: EndorsementFilterParams = {
        policyId: undefined, // We need to query all endorsements to find this one
        page: 1,
        limit: 1000,
      };

      const result = await policyRepository.queryEndorsements(filters);
      const endorsement = result.endorsements.find((e) => e.id === endorsementId);

      if (!endorsement) {
        return res.status(404).json({ error: 'Endorsement not found' });
      }

      res.json(endorsement);
    } catch (error) {
      logger.error('Error fetching endorsement', { error, endorsementId: req.params.endorsementId });
      res.status(500).json({ error: 'Failed to fetch endorsement' });
    }
  });

  // Update endorsement
  router.patch('/endorsements/:endorsementId', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { endorsementId } = req.params;
      const data: UpdateEndorsementDto = req.body;

      const endorsement = await policyRepository.updateEndorsement(userId, endorsementId, data);
      res.json(endorsement);
    } catch (error) {
      logger.error('Error updating endorsement', { error, endorsementId: req.params.endorsementId });
      res.status(500).json({ error: 'Failed to update endorsement' });
    }
  });

  // Delete endorsement
  router.delete('/endorsements/:endorsementId', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { endorsementId } = req.params;

      await policyRepository.deleteEndorsement(userId, endorsementId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting endorsement', { error, endorsementId: req.params.endorsementId });
      res.status(500).json({ error: 'Failed to delete endorsement' });
    }
  });

  // ========================================
  // DOCUMENTS
  // ========================================

  // Get policy documents
  router.get('/:policyId/documents', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;

      const filters: PolicyDocumentFilterParams = {
        policyId,
        documentType: req.query.documentType as any,
        uploadedBy: req.query.uploadedBy as string,
        isVerified: req.query.isVerified ? req.query.isVerified === 'true' : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await policyRepository.queryDocuments(filters);

      res.json({
        documents: result.documents,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying documents', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to query documents' });
    }
  });

  // Add document
  router.post('/:policyId/documents', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;
      const data: AddPolicyDocumentDto = req.body;

      if (!data.documentType || !data.fileName || !data.fileUrl || data.fileSize === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const document = await policyRepository.addDocument(userId, policyId, data);
      res.status(201).json(document);
    } catch (error) {
      logger.error('Error adding document', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to add document' });
    }
  });

  // Get document by ID
  router.get('/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const filters: PolicyDocumentFilterParams = {
        policyId: undefined,
        page: 1,
        limit: 1000,
      };

      const result = await policyRepository.queryDocuments(filters);
      const document = result.documents.find((d) => d.id === documentId);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json(document);
    } catch (error) {
      logger.error('Error fetching document', { error, documentId: req.params.documentId });
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // Update document
  router.patch('/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const data: UpdatePolicyDocumentDto = req.body;

      const document = await policyRepository.updateDocument(documentId, data);
      res.json(document);
    } catch (error) {
      logger.error('Error updating document', { error, documentId: req.params.documentId });
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  // Delete document
  router.delete('/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { documentId } = req.params;

      await policyRepository.deleteDocument(userId, documentId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting document', { error, documentId: req.params.documentId });
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // ========================================
  // PAYMENTS
  // ========================================

  // Get policy payments
  router.get('/:policyId/payments', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;

      const filters: PolicyPaymentFilterParams = {
        policyId,
        dueDateFrom: req.query.dueDateFrom as string,
        dueDateTo: req.query.dueDateTo as string,
        paymentMethod: req.query.paymentMethod as any,
        status: req.query.status as any,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await policyRepository.queryPayments(filters);

      res.json({
        payments: result.payments,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying payments', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to query payments' });
    }
  });

  // Get payment summary
  router.get('/:policyId/payments/summary', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const summary = await policyRepository.getPaymentSummary(policyId);
      res.json(summary);
    } catch (error) {
      logger.error('Error getting payment summary', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to get payment summary' });
    }
  });

  // Record payment
  router.post('/:policyId/payments', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;
      const data: CreatePolicyPaymentDto = req.body;

      if (data.amount === undefined || !data.dueDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const payment = await policyRepository.recordPayment(userId, policyId, data);
      res.status(201).json(payment);
    } catch (error) {
      logger.error('Error recording payment', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });

  // Get payment by ID
  router.get('/payments/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const filters: PolicyPaymentFilterParams = {
        policyId: undefined,
        page: 1,
        limit: 1000,
      };

      const result = await policyRepository.queryPayments(filters);
      const payment = result.payments.find((p) => p.id === paymentId);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(payment);
    } catch (error) {
      logger.error('Error fetching payment', { error, paymentId: req.params.paymentId });
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  });

  // Update payment
  router.patch('/payments/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const data: UpdatePolicyPaymentDto = req.body;

      const payment = await policyRepository.updatePayment(paymentId, data);
      res.json(payment);
    } catch (error) {
      logger.error('Error updating payment', { error, paymentId: req.params.paymentId });
      res.status(500).json({ error: 'Failed to update payment' });
    }
  });

  // ========================================
  // RENEWALS
  // ========================================

  // Get policy renewals
  router.get('/:policyId/renewals', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;

      const filters: PolicyRenewalFilterParams = {
        policyId,
        renewalPolicyId: req.query.renewalPolicyId as string,
        status: req.query.status as any,
        offeredDateFrom: req.query.offeredDateFrom as string,
        offeredDateTo: req.query.offeredDateTo as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await policyRepository.queryRenewals(filters);

      res.json({
        renewals: result.renewals,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    } catch (error) {
      logger.error('Error querying renewals', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to query renewals' });
    }
  });

  // Renew policy
  router.post('/:policyId/renewals/renew', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'system';
      const { policyId } = req.params;
      const data: RenewPolicyDto = req.body;

      if (!data.renewalPremium || !data.effectiveDate || !data.expirationDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await policyRepository.renewPolicy(userId, policyId, data);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error renewing policy', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to renew policy' });
    }
  });

  // Get renewal by ID
  router.get('/renewals/:renewalId', async (req: Request, res: Response) => {
    try {
      const { renewalId } = req.params;
      const filters: PolicyRenewalFilterParams = {
        policyId: undefined,
        page: 1,
        limit: 1000,
      };

      const result = await policyRepository.queryRenewals(filters);
      const renewal = result.renewals.find((r) => r.id === renewalId);

      if (!renewal) {
        return res.status(404).json({ error: 'Renewal not found' });
      }

      res.json(renewal);
    } catch (error) {
      logger.error('Error fetching renewal', { error, renewalId: req.params.renewalId });
      res.status(500).json({ error: 'Failed to fetch renewal' });
    }
  });

  // Update renewal
  router.patch('/renewals/:renewalId', async (req: Request, res: Response) => {
    try {
      const { renewalId } = req.params;
      const data: UpdatePolicyRenewalDto = req.body;

      const renewal = await policyRepository.updateRenewal(renewalId, data);
      res.json(renewal);
    } catch (error) {
      logger.error('Error updating renewal', { error, renewalId: req.params.renewalId });
      res.status(500).json({ error: 'Failed to update renewal' });
    }
  });

  // ========================================
  // ACTIVITY LOGGING
  // ========================================

  // Get policy activities
  router.get('/:policyId/activities', async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const activities = await policyRepository.getActivities(policyId);
      res.json({ activities });
    } catch (error) {
      logger.error('Error getting activities', { error, policyId: req.params.policyId });
      res.status(500).json({ error: 'Failed to get activities' });
    }
  });

  return router;
}
