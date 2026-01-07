import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Policy,
  PolicyEndorsement,
  PolicyDocument,
  PolicyPayment,
  PolicyRenewal,
  PolicyActivity,
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
  PolicyStatistics,
  PolicyPaymentSummary,
  ExpiringPoliciesSummary,
} from '@insurance-lead-gen/types';

/**
 * Policy Repository - Handles all policy-related database operations
 * Phase 26.3: Policy Management & Lifecycle
 */
export class PolicyRepository {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // POLICY CRUD OPERATIONS
  // ========================================

  /**
   * Create a new policy
   */
  async createPolicy(userId: string, data: CreatePolicyDto): Promise<Policy> {
    try {
      const policyNumber = this.generatePolicyNumber();

      const policy = await this.prisma.policy.create({
        data: {
          policyNumber,
          leadId: data.leadId,
          agentId: data.agentId,
          carrier: data.carrier,
          productName: data.productName,
          insuranceType: data.insuranceType,
          status: 'DRAFT',
          effectiveDate: new Date(data.effectiveDate),
          expirationDate: new Date(data.expirationDate),
          premiumAmount: data.premiumAmount,
          billingFrequency: data.billingFrequency as any,
          commissionRate: data.commissionRate ?? 0.0,
          coverage: data.coverage || {},
          deductible: data.deductible,
          policyholderInfo: data.policyholderInfo,
          metadata: data.metadata || {},
        },
        include: this.getPolicyIncludes(),
      });

      await this.logActivity(policy.id, userId, 'POLICY_CREATED', 'Created policy', `Policy ${policyNumber} created`);

      return this.mapPolicyToInterface(policy);
    } catch (error) {
      logger.error('Error creating policy', { error, data });
      throw new Error('Failed to create policy');
    }
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(policyId: string): Promise<Policy | null> {
    try {
      const policy = await this.prisma.policy.findUnique({
        where: { id: policyId },
        include: this.getPolicyIncludes(),
      });

      return policy ? this.mapPolicyToInterface(policy) : null;
    } catch (error) {
      logger.error('Error fetching policy', { error, policyId });
      throw new Error('Failed to fetch policy');
    }
  }

  /**
   * Get policy by policy number
   */
  async getPolicyByNumber(policyNumber: string): Promise<Policy | null> {
    try {
      const policy = await this.prisma.policy.findUnique({
        where: { policyNumber },
        include: this.getPolicyIncludes(),
      });

      return policy ? this.mapPolicyToInterface(policy) : null;
    } catch (error) {
      logger.error('Error fetching policy by number', { error, policyNumber });
      throw new Error('Failed to fetch policy');
    }
  }

  /**
   * Query policies with filters
   */
  async queryPolicies(filters: PolicyFilterParams): Promise<{ policies: Policy[]; total: number }> {
    try {
      const where = this.buildPolicyWhereClause(filters);

      const [policies, total] = await Promise.all([
        this.prisma.policy.findMany({
          where,
          include: this.getPolicyIncludes(),
          orderBy: this.buildSortOrder(filters.sortBy, filters.sortOrder),
          skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
          take: filters.limit || 20,
        }),
        this.prisma.policy.count({ where }),
      ]);

      return {
        policies: policies.map((p) => this.mapPolicyToInterface(p)),
        total,
      };
    } catch (error) {
      logger.error('Error querying policies', { error, filters });
      throw new Error('Failed to query policies');
    }
  }

  /**
   * Update policy
   */
  async updatePolicy(userId: string, policyId: string, data: UpdatePolicyDto): Promise<Policy> {
    try {
      const existingPolicy = await this.prisma.policy.findUnique({
        where: { id: policyId },
      });

      if (!existingPolicy) {
        throw new Error('Policy not found');
      }

      // Track old status for activity log
      const oldStatus = existingPolicy.status;

      const policy = await this.prisma.policy.update({
        where: { id: policyId },
        data: {
          agentId: data.agentId,
          carrier: data.carrier,
          productName: data.productName,
          status: data.status as any,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
          premiumAmount: data.premiumAmount,
          billingFrequency: data.billingFrequency as any,
          commissionRate: data.commissionRate,
          coverage: data.coverage,
          deductible: data.deductible,
          policyholderInfo: data.policyholderInfo,
          cancellationReason: data.cancellationReason,
          cancelledAt: data.status === 'CANCELLED' ? new Date() : undefined,
          metadata: data.metadata,
        },
        include: this.getPolicyIncludes(),
      });

      // Log status change
      if (data.status && data.status !== oldStatus) {
        await this.logActivity(
          policyId,
          userId,
          'STATUS_CHANGED',
          'Policy status changed',
          `Status changed from ${oldStatus} to ${data.status}`,
          { oldStatus, newStatus: data.status }
        );
      } else {
        await this.logActivity(policyId, userId, 'POLICY_UPDATED', 'Updated policy', `Policy ${policy.policyNumber} updated`);
      }

      return this.mapPolicyToInterface(policy);
    } catch (error) {
      logger.error('Error updating policy', { error, policyId, data });
      throw new Error('Failed to update policy');
    }
  }

  /**
   * Delete policy
   */
  async deletePolicy(userId: string, policyId: string): Promise<void> {
    try {
      await this.prisma.policy.delete({
        where: { id: policyId },
      });

      await this.logActivity(policyId, userId, 'POLICY_DELETED', 'Deleted policy', 'Policy deleted');
    } catch (error) {
      logger.error('Error deleting policy', { error, policyId });
      throw new Error('Failed to delete policy');
    }
  }

  // ========================================
  // ENDORSEMENTS
  // ========================================

  /**
   * Create endorsement
   */
  async createEndorsement(userId: string, policyId: string, data: CreateEndorsementDto): Promise<PolicyEndorsement> {
    try {
      const endorsement = await this.prisma.policyEndorsement.create({
        data: {
          policyId,
          type: data.type as any,
          effectiveDate: new Date(data.effectiveDate),
          description: data.description,
          changes: data.changes || {},
          premiumDelta: data.premiumDelta,
          newPremium: data.newPremium,
          status: 'PENDING',
          createdBy: userId,
        },
      });

      await this.logActivity(
        policyId,
        userId,
        'ENDORSEMENT_CREATED',
        'Created endorsement',
        `Endorsement of type ${data.type} created`,
        { endorsementId: endorsement.id }
      );

      return this.mapEndorsementToInterface(endorsement);
    } catch (error) {
      logger.error('Error creating endorsement', { error, policyId, data });
      throw new Error('Failed to create endorsement');
    }
  }

  /**
   * Update endorsement
   */
  async updateEndorsement(
    userId: string,
    endorsementId: string,
    data: UpdateEndorsementDto
  ): Promise<PolicyEndorsement> {
    try {
      const endorsement = await this.prisma.policyEndorsement.update({
        where: { id: endorsementId },
        data: {
          type: data.type as any,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
          description: data.description,
          changes: data.changes,
          premiumDelta: data.premiumDelta,
          newPremium: data.newPremium,
          status: data.status as any,
          issuedAt: data.status === 'ISSUED' ? new Date() : undefined,
        },
      });

      await this.logActivity(
        endorsement.policyId,
        userId,
        'ENDORSEMENT_UPDATED',
        'Updated endorsement',
        `Endorsement ${endorsementId} updated`
      );

      return this.mapEndorsementToInterface(endorsement);
    } catch (error) {
      logger.error('Error updating endorsement', { error, endorsementId, data });
      throw new Error('Failed to update endorsement');
    }
  }

  /**
   * Delete endorsement
   */
  async deleteEndorsement(userId: string, endorsementId: string): Promise<void> {
    try {
      await this.prisma.policyEndorsement.delete({
        where: { id: endorsementId },
      });

      // Note: We can't log activity after delete since we lose the policyId
    } catch (error) {
      logger.error('Error deleting endorsement', { error, endorsementId });
      throw new Error('Failed to delete endorsement');
    }
  }

  /**
   * Query endorsements
   */
  async queryEndorsements(filters: EndorsementFilterParams): Promise<{ endorsements: PolicyEndorsement[]; total: number }> {
    try {
      const where = this.buildEndorsementWhereClause(filters);

      const [endorsements, total] = await Promise.all([
        this.prisma.policyEndorsement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
          take: filters.limit || 20,
        }),
        this.prisma.policyEndorsement.count({ where }),
      ]);

      return {
        endorsements: endorsements.map((e) => this.mapEndorsementToInterface(e)),
        total,
      };
    } catch (error) {
      logger.error('Error querying endorsements', { error, filters });
      throw new Error('Failed to query endorsements');
    }
  }

  // ========================================
  // DOCUMENTS
  // ========================================

  /**
   * Add document to policy
   */
  async addDocument(userId: string, policyId: string, data: AddPolicyDocumentDto): Promise<PolicyDocument> {
    try {
      const document = await this.prisma.policyDocument.create({
        data: {
          policyId,
          documentType: data.documentType as any,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          uploadedBy: userId,
          description: data.description,
        },
      });

      await this.logActivity(
        policyId,
        userId,
        'DOCUMENT_ADDED',
        'Added document',
        `Document ${data.fileName} added to policy`,
        { documentId: document.id }
      );

      return this.mapDocumentToInterface(document);
    } catch (error) {
      logger.error('Error adding document', { error, policyId, data });
      throw new Error('Failed to add document');
    }
  }

  /**
   * Update document
   */
  async updateDocument(documentId: string, data: UpdatePolicyDocumentDto): Promise<PolicyDocument> {
    try {
      const document = await this.prisma.policyDocument.update({
        where: { id: documentId },
        data: {
          documentType: data.documentType as any,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          description: data.description,
          isVerified: data.isVerified,
          verifiedBy: data.isVerified ? 'system' : undefined,
          verifiedAt: data.isVerified ? new Date() : undefined,
        },
      });

      return this.mapDocumentToInterface(document);
    } catch (error) {
      logger.error('Error updating document', { error, documentId, data });
      throw new Error('Failed to update document');
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      const document = await this.prisma.policyDocument.findUnique({
        where: { id: documentId },
      });

      if (document) {
        await this.prisma.policyDocument.delete({
          where: { id: documentId },
        });

        await this.logActivity(
          document.policyId,
          userId,
          'DOCUMENT_DELETED',
          'Deleted document',
          `Document ${document.fileName} deleted from policy`
        );
      }
    } catch (error) {
      logger.error('Error deleting document', { error, documentId });
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Query documents
   */
  async queryDocuments(filters: PolicyDocumentFilterParams): Promise<{ documents: PolicyDocument[]; total: number }> {
    try {
      const where = this.buildDocumentWhereClause(filters);

      const [documents, total] = await Promise.all([
        this.prisma.policyDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
          take: filters.limit || 20,
        }),
        this.prisma.policyDocument.count({ where }),
      ]);

      return {
        documents: documents.map((d) => this.mapDocumentToInterface(d)),
        total,
      };
    } catch (error) {
      logger.error('Error querying documents', { error, filters });
      throw new Error('Failed to query documents');
    }
  }

  // ========================================
  // PAYMENTS
  // ========================================

  /**
   * Record payment
   */
  async recordPayment(userId: string, policyId: string, data: CreatePolicyPaymentDto): Promise<PolicyPayment> {
    try {
      const policy = await this.prisma.policy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      const payment = await this.prisma.policyPayment.create({
        data: {
          policyId,
          paymentNumber: this.generatePaymentNumber(policy.policyNumber),
          amount: data.amount,
          dueDate: new Date(data.dueDate),
          paymentMethod: data.paymentMethod as any,
          status: 'PENDING',
          notes: data.notes,
        },
      });

      await this.logActivity(
        policyId,
        userId,
        'PAYMENT_RECORDED',
        'Recorded payment',
        `Payment ${payment.paymentNumber} recorded for ${data.amount}`,
        { paymentId: payment.id }
      );

      return this.mapPaymentToInterface(payment);
    } catch (error) {
      logger.error('Error recording payment', { error, policyId, data });
      throw new Error('Failed to record payment');
    }
  }

  /**
   * Update payment
   */
  async updatePayment(paymentId: string, data: UpdatePolicyPaymentDto): Promise<PolicyPayment> {
    try {
      const payment = await this.prisma.policyPayment.update({
        where: { id: paymentId },
        data: {
          amount: data.amount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          paymentMethod: data.paymentMethod as any,
          status: data.status as any,
          paidAt: data.status === 'PAID' ? new Date() : undefined,
          failureReason: data.failureReason,
          refundAmount: data.refundAmount,
          refundReason: data.refundReason,
          refundedAt: data.status === 'REFUNDED' ? new Date() : undefined,
          notes: data.notes,
        },
      });

      // Update total premium collected on policy
      if (data.status === 'PAID') {
        await this.prisma.policy.update({
          where: { id: payment.policyId },
          data: {
            totalPremiumCollected: {
              increment: payment.amount,
            },
          },
        });
      }

      return this.mapPaymentToInterface(payment);
    } catch (error) {
      logger.error('Error updating payment', { error, paymentId, data });
      throw new Error('Failed to update payment');
    }
  }

  /**
   * Query payments
   */
  async queryPayments(filters: PolicyPaymentFilterParams): Promise<{ payments: PolicyPayment[]; total: number }> {
    try {
      const where = this.buildPaymentWhereClause(filters);

      const [payments, total] = await Promise.all([
        this.prisma.policyPayment.findMany({
          where,
          orderBy: { dueDate: 'asc' },
          skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
          take: filters.limit || 20,
        }),
        this.prisma.policyPayment.count({ where }),
      ]);

      return {
        payments: payments.map((p) => this.mapPaymentToInterface(p)),
        total,
      };
    } catch (error) {
      logger.error('Error querying payments', { error, filters });
      throw new Error('Failed to query payments');
    }
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary(policyId: string): Promise<PolicyPaymentSummary> {
    try {
      const payments = await this.prisma.policyPayment.findMany({
        where: { policyId },
      });

      const totalPaid = payments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPending = payments
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalFailed = payments
        .filter((p) => p.status === 'FAILED')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalRefunded = payments
        .filter((p) => p.status === 'REFUNDED')
        .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

      return {
        totalPayments: payments.length,
        totalPaid,
        totalPending,
        totalFailed,
        totalRefunded,
        averagePaymentAmount: payments.length > 0 ? totalPaid / payments.length : 0,
        paymentRate: payments.length > 0 ? (payments.filter((p) => p.status === 'PAID').length / payments.length) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting payment summary', { error, policyId });
      throw new Error('Failed to get payment summary');
    }
  }

  // ========================================
  // RENEWALS
  // ========================================

  /**
   * Renew policy
   */
  async renewPolicy(userId: string, policyId: string, data: RenewPolicyDto): Promise<{ policy: Policy; renewal: Policy }> {
    try {
      const oldPolicy = await this.prisma.policy.findUnique({
        where: { id: policyId },
      });

      if (!oldPolicy) {
        throw new Error('Policy not found');
      }

      const newPolicyNumber = this.generatePolicyNumber();

      // Create new policy (renewal)
      const newPolicy = await this.prisma.policy.create({
        data: {
          policyNumber: newPolicyNumber,
          leadId: oldPolicy.leadId,
          agentId: oldPolicy.agentId,
          carrier: oldPolicy.carrier,
          productName: oldPolicy.productName,
          insuranceType: oldPolicy.insuranceType,
          status: 'DRAFT',
          effectiveDate: new Date(data.effectiveDate),
          expirationDate: new Date(data.expirationDate),
          premiumAmount: data.renewalPremium,
          billingFrequency: oldPolicy.billingFrequency,
          commissionRate: oldPolicy.commissionRate,
          coverage: oldPolicy.coverage,
          deductible: oldPolicy.deductible,
          policyholderInfo: oldPolicy.policyholderInfo,
          renewalOfPolicyId: policyId,
          totalPremiumCollected: 0,
          metadata: oldPolicy.metadata,
        },
        include: this.getPolicyIncludes(),
      });

      // Update old policy to link to new one
      const updatedOldPolicy = await this.prisma.policy.update({
        where: { id: policyId },
        data: {
          renewedToPolicyId: newPolicy.id,
        },
        include: this.getPolicyIncludes(),
      });

      // Create renewal record
      await this.prisma.policyRenewal.create({
        data: {
          policyId,
          renewalPolicyId: newPolicy.id,
          renewalQuoteAmount: data.renewalPremium,
          renewalPremium: data.renewalPremium,
          offeredDate: new Date(),
          acceptedDate: new Date(),
          status: 'COMPLETED',
        },
      });

      await this.logActivity(
        policyId,
        userId,
        'POLICY_RENEWED',
        'Renewed policy',
        `Policy ${oldPolicy.policyNumber} renewed to ${newPolicyNumber}`,
        { oldPolicyId: policyId, newPolicyId: newPolicy.id }
      );

      return {
        policy: this.mapPolicyToInterface(updatedOldPolicy),
        renewal: this.mapPolicyToInterface(newPolicy),
      };
    } catch (error) {
      logger.error('Error renewing policy', { error, policyId, data });
      throw new Error('Failed to renew policy');
    }
  }

  /**
   * Update renewal
   */
  async updateRenewal(renewalId: string, data: UpdatePolicyRenewalDto): Promise<PolicyRenewal> {
    try {
      const renewal = await this.prisma.policyRenewal.update({
        where: { id: renewalId },
        data: {
          renewalPolicyId: data.renewalPolicyId,
          renewalQuoteAmount: data.renewalQuoteAmount,
          renewalPremium: data.renewalPremium,
          status: data.status as any,
          offeredDate: data.status === 'OFFERED' ? new Date() : undefined,
          acceptedDate: data.status === 'ACCEPTED' ? new Date() : undefined,
          rejectedDate: data.status === 'REJECTED' ? new Date() : undefined,
          rejectionReason: data.rejectionReason,
        },
      });

      return this.mapRenewalToInterface(renewal);
    } catch (error) {
      logger.error('Error updating renewal', { error, renewalId, data });
      throw new Error('Failed to update renewal');
    }
  }

  /**
   * Query renewals
   */
  async queryRenewals(filters: PolicyRenewalFilterParams): Promise<{ renewals: PolicyRenewal[]; total: number }> {
    try {
      const where = this.buildRenewalWhereClause(filters);

      const [renewals, total] = await Promise.all([
        this.prisma.policyRenewal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
          take: filters.limit || 20,
        }),
        this.prisma.policyRenewal.count({ where }),
      ]);

      return {
        renewals: renewals.map((r) => this.mapRenewalToInterface(r)),
        total,
      };
    } catch (error) {
      logger.error('Error querying renewals', { error, filters });
      throw new Error('Failed to query renewals');
    }
  }

  /**
   * Get expiring policies
   */
  async getExpiringPolicies(daysAhead: number = 30): Promise<ExpiringPoliciesSummary> {
    try {
      const now = new Date();
      const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const future60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const future90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const [expiring30, expiring60, expiring90, expiring90All] = await Promise.all([
        this.prisma.policy.findMany({
          where: {
            status: 'ACTIVE',
            expirationDate: { lte: future30Days },
          },
        }),
        this.prisma.policy.findMany({
          where: {
            status: 'ACTIVE',
            expirationDate: { lte: future60Days },
          },
        }),
        this.prisma.policy.findMany({
          where: {
            status: 'ACTIVE',
            expirationDate: { lte: future90Days },
          },
        }),
        this.prisma.policy.findMany({
          where: {
            status: 'ACTIVE',
            expirationDate: { lte: future90Days },
          },
        }),
      ]);

      const totalPremiumAtRisk = expiring90All.reduce((sum, p) => sum + p.premiumAmount, 0);

      return {
        policiesExpiringIn30Days: expiring30.length,
        policiesExpiringIn60Days: expiring60.length,
        policiesExpiringIn90Days: expiring90.length,
        totalPremiumAtRisk,
        renewalEligibleCount: expiring90All.length,
        nonRenewalPredictedCount: Math.round(expiring90All.length * 0.15), // Assume 15% non-renewal
      };
    } catch (error) {
      logger.error('Error getting expiring policies', { error });
      throw new Error('Failed to get expiring policies');
    }
  }

  // ========================================
  // STATISTICS & ANALYTICS
  // ========================================

  /**
   * Get policy statistics
   */
  async getStatistics(filters?: Partial<PolicyFilterParams>): Promise<PolicyStatistics> {
    try {
      const where = filters ? this.buildPolicyWhereClause(filters) : {};

      const [policies, byStatus, byType] = await Promise.all([
        this.prisma.policy.findMany({ where }),
        this.prisma.policy.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        this.prisma.policy.groupBy({
          by: ['insuranceType'],
          where,
          _count: true,
        }),
      ]);

      const totalPolicies = policies.length;
      const totalWrittenPremium = policies.reduce((sum, p) => sum + p.premiumAmount, 0);
      const totalPremiumCollected = policies.reduce((sum, p) => sum + p.totalPremiumCollected, 0);
      const totalCommissions = policies.reduce((sum, p) => sum + p.premiumAmount * p.commissionRate, 0);

      const statusCounts: Partial<Record<string, number>> = {};
      byStatus.forEach((s) => {
        statusCounts[s.status.toLowerCase()] = s._count;
      });

      const typeCounts: Partial<Record<string, number>> = {};
      byType.forEach((t) => {
        typeCounts[t.insuranceType] = t._count;
      });

      const activePolicies = policies.filter((p) => p.status === 'ACTIVE');
      const renewedPolicies = policies.filter((p) => p.renewalOfPolicyId !== null);
      const cancelledPolicies = policies.filter((p) => p.status === 'CANCELLED');
      const expiredPolicies = policies.filter((p) => p.status === 'EXPIRED');

      const averagePolicyAge = activePolicies.length > 0
        ? activePolicies.reduce((sum, p) => sum + (new Date().getTime() - p.effectiveDate.getTime()), 0) /
          activePolicies.length /
          (1000 * 60 * 60 * 24)
        : 0;

      return {
        totalPolicies,
        policiesByStatus: statusCounts,
        policiesByInsuranceType: typeCounts,
        policiesByCarrier: {}, // TODO: Implement if needed
        totalWrittenPremium,
        totalPremiumCollected,
        averagePremiumPerPolicy: totalPolicies > 0 ? totalWrittenPremium / totalPolicies : 0,
        totalCommissions,
        renewalRate: totalPolicies > 0 ? (renewedPolicies.length / totalPolicies) * 100 : 0,
        retentionRate: totalPolicies > 0 ? ((totalPolicies - cancelledPolicies.length) / totalPolicies) * 100 : 0,
        nonRenewalRate: totalPolicies > 0 ? 0 : 0, // TODO: Calculate from renewal records
        averagePolicyAge,
        cancellationRate: totalPolicies > 0 ? (cancelledPolicies.length / totalPolicies) * 100 : 0,
        lapseRate: totalPolicies > 0 ? (policies.filter((p) => p.status === 'LAPSED').length / totalPolicies) * 100 : 0,
        expirationRate: totalPolicies > 0 ? (expiredPolicies.length / totalPolicies) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting statistics', { error, filters });
      throw new Error('Failed to get statistics');
    }
  }

  // ========================================
  // ACTIVITY LOGGING
  // ========================================

  /**
   * Log policy activity
   */
  async logActivity(
    policyId: string,
    userId: string | null,
    activityType: string,
    action: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.prisma.policyActivity.create({
        data: {
          policyId,
          userId,
          activityType,
          action,
          description,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      logger.error('Error logging activity', { error, policyId, activityType });
    }
  }

  /**
   * Get policy activities
   */
  async getActivities(policyId: string): Promise<PolicyActivity[]> {
    try {
      const activities = await this.prisma.policyActivity.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
      });

      return activities.map((a) => this.mapActivityToInterface(a));
    } catch (error) {
      logger.error('Error getting activities', { error, policyId });
      throw new Error('Failed to get activities');
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private generatePolicyNumber(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    return `POL-${year}-${seq}`;
  }

  private generatePaymentNumber(policyNumber: string): string {
    const timestamp = Date.now();
    return `PAY-${policyNumber}-${timestamp}`;
  }

  private getPolicyIncludes() {
    return {
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
      endorsements: true,
      documents: true,
      payments: true,
      renewals: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    } as const;
  }

  private buildPolicyWhereClause(filters: PolicyFilterParams): Prisma.PolicyWhereInput {
    const where: Prisma.PolicyWhereInput = {};

    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.carrier) where.carrier = { contains: filters.carrier, mode: 'insensitive' };
    if (filters.insuranceType) where.insuranceType = filters.insuranceType;
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status as any[] } : (filters.status as any);
    }
    if (filters.policyNumber) where.policyNumber = { contains: filters.policyNumber, mode: 'insensitive' };
    if (filters.effectiveDateFrom || filters.effectiveDateTo) {
      where.effectiveDate = {};
      if (filters.effectiveDateFrom) where.effectiveDate.gte = new Date(filters.effectiveDateFrom);
      if (filters.effectiveDateTo) where.effectiveDate.lte = new Date(filters.effectiveDateTo);
    }
    if (filters.expirationDateFrom || filters.expirationDateTo) {
      where.expirationDate = {};
      if (filters.expirationDateFrom) where.expirationDate.gte = new Date(filters.expirationDateFrom);
      if (filters.expirationDateTo) where.expirationDate.lte = new Date(filters.expirationDateTo);
    }
    if (filters.minPremium || filters.maxPremium) {
      where.premiumAmount = {};
      if (filters.minPremium) where.premiumAmount.gte = filters.minPremium;
      if (filters.maxPremium) where.premiumAmount.lte = filters.maxPremium;
    }
    if (filters.renewalOfPolicyId) where.renewalOfPolicyId = filters.renewalOfPolicyId;
    if (filters.renewedToPolicyId) where.renewedToPolicyId = filters.renewedToPolicyId;
    if (filters.search) {
      where.OR = [
        { policyNumber: { contains: filters.search, mode: 'insensitive' } },
        { lead: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildEndorsementWhereClause(filters: EndorsementFilterParams): Prisma.PolicyEndorsementWhereInput {
    const where: Prisma.PolicyEndorsementWhereInput = {};

    if (filters.policyId) where.policyId = filters.policyId;
    if (filters.type) {
      where.type = Array.isArray(filters.type) ? { in: filters.type as any[] } : (filters.type as any);
    }
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status as any[] } : (filters.status as any);
    }
    if (filters.effectiveDateFrom || filters.effectiveDateTo) {
      where.effectiveDate = {};
      if (filters.effectiveDateFrom) where.effectiveDate.gte = new Date(filters.effectiveDateFrom);
      if (filters.effectiveDateTo) where.effectiveDate.lte = new Date(filters.effectiveDateTo);
    }

    return where;
  }

  private buildDocumentWhereClause(filters: PolicyDocumentFilterParams): Prisma.PolicyDocumentWhereInput {
    const where: Prisma.PolicyDocumentWhereInput = {};

    if (filters.policyId) where.policyId = filters.policyId;
    if (filters.documentType) {
      where.documentType = Array.isArray(filters.documentType)
        ? { in: filters.documentType as any[] }
        : (filters.documentType as any);
    }
    if (filters.uploadedBy) where.uploadedBy = filters.uploadedBy;
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;

    return where;
  }

  private buildPaymentWhereClause(filters: PolicyPaymentFilterParams): Prisma.PolicyPaymentWhereInput {
    const where: Prisma.PolicyPaymentWhereInput = {};

    if (filters.policyId) where.policyId = filters.policyId;
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) where.dueDate.lte = new Date(filters.dueDateTo);
    }
    if (filters.paymentMethod) {
      where.paymentMethod = Array.isArray(filters.paymentMethod)
        ? { in: filters.paymentMethod as any[] }
        : (filters.paymentMethod as any);
    }
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status as any[] } : (filters.status as any);
    }

    return where;
  }

  private buildRenewalWhereClause(filters: PolicyRenewalFilterParams): Prisma.PolicyRenewalWhereInput {
    const where: Prisma.PolicyRenewalWhereInput = {};

    if (filters.policyId) where.policyId = filters.policyId;
    if (filters.renewalPolicyId) where.renewalPolicyId = filters.renewalPolicyId;
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status as any[] } : (filters.status as any);
    }
    if (filters.offeredDateFrom || filters.offeredDateTo) {
      where.offeredDate = {};
      if (filters.offeredDateFrom) where.offeredDate.gte = new Date(filters.offeredDateFrom);
      if (filters.offeredDateTo) where.offeredDate.lte = new Date(filters.offeredDateTo);
    }

    return where;
  }

  private buildSortOrder(sortBy?: string, sortOrder?: 'asc' | 'desc'): Prisma.PolicyOrderByWithRelationInput {
    if (!sortBy) return { createdAt: 'desc' };

    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    return { [sortBy]: direction };
  }

  private mapPolicyToInterface(policy: any): Policy {
    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      leadId: policy.leadId,
      agentId: policy.agentId,
      carrier: policy.carrier,
      productName: policy.productName,
      insuranceType: policy.insuranceType.toLowerCase(),
      status: policy.status.toLowerCase(),
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
      cancelledAt: policy.cancelledAt,
      cancellationReason: policy.cancellationReason,
      premiumAmount: policy.premiumAmount,
      billingFrequency: policy.billingFrequency.toLowerCase(),
      commissionRate: policy.commissionRate,
      totalPremiumCollected: policy.totalPremiumCollected,
      coverage: policy.coverage,
      deductible: policy.deductible,
      policyholderInfo: policy.policyholderInfo,
      renewalOfPolicyId: policy.renewalOfPolicyId,
      renewedToPolicyId: policy.renewedToPolicyId,
      metadata: policy.metadata,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      lead: policy.lead,
      agent: policy.agent,
      endorsements: policy.endorsements?.map((e: any) => this.mapEndorsementToInterface(e)) || [],
      documents: policy.documents?.map((d: any) => this.mapDocumentToInterface(d)) || [],
      payments: policy.payments?.map((p: any) => this.mapPaymentToInterface(p)) || [],
      renewals: policy.renewals?.map((r: any) => this.mapRenewalToInterface(r)) || [],
      activities: policy.activities?.map((a: any) => this.mapActivityToInterface(a)) || [],
    };
  }

  private mapEndorsementToInterface(endorsement: any): PolicyEndorsement {
    return {
      id: endorsement.id,
      policyId: endorsement.policyId,
      type: endorsement.type.toLowerCase(),
      effectiveDate: endorsement.effectiveDate,
      description: endorsement.description,
      changes: endorsement.changes,
      premiumDelta: endorsement.premiumDelta,
      newPremium: endorsement.newPremium,
      status: endorsement.status.toLowerCase(),
      issuedAt: endorsement.issuedAt,
      createdAt: endorsement.createdAt,
      createdBy: endorsement.createdBy,
    };
  }

  private mapDocumentToInterface(document: any): PolicyDocument {
    return {
      id: document.id,
      policyId: document.policyId,
      documentType: document.documentType.toLowerCase(),
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedBy: document.uploadedBy,
      description: document.description,
      isVerified: document.isVerified,
      verifiedBy: document.verifiedBy,
      verifiedAt: document.verifiedAt,
      version: document.version,
      createdAt: document.createdAt,
    };
  }

  private mapPaymentToInterface(payment: any): PolicyPayment {
    return {
      id: payment.id,
      policyId: payment.policyId,
      paymentNumber: payment.paymentNumber,
      amount: payment.amount,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod?.toLowerCase(),
      status: payment.status.toLowerCase(),
      failureReason: payment.failureReason,
      refundedAt: payment.refundedAt,
      refundAmount: payment.refundAmount,
      refundReason: payment.refundReason,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private mapRenewalToInterface(renewal: any): PolicyRenewal {
    return {
      id: renewal.id,
      policyId: renewal.policyId,
      renewalPolicyId: renewal.renewalPolicyId,
      renewalQuoteAmount: renewal.renewalQuoteAmount,
      renewalPremium: renewal.renewalPremium,
      offeredDate: renewal.offeredDate,
      acceptedDate: renewal.acceptedDate,
      rejectedDate: renewal.rejectedDate,
      rejectionReason: renewal.rejectionReason,
      status: renewal.status.toLowerCase(),
      createdAt: renewal.createdAt,
    };
  }

  private mapActivityToInterface(activity: any): PolicyActivity {
    return {
      id: activity.id,
      policyId: activity.policyId,
      userId: activity.userId,
      activityType: activity.activityType,
      action: activity.action,
      description: activity.description,
      oldValue: activity.oldValue,
      newValue: activity.newValue,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
    };
  }
}
