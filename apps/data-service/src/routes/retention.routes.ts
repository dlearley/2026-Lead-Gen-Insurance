/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises, @typescript-eslint/prefer-nullish-coalescing */
import { Router } from 'express';
import { RetentionService } from '../services/retention-service.js';
import { prisma } from '../prisma/client.js';
import { logger } from '@insurance-lead-gen/core';
import type {
  CreateCustomerDto,
  CreatePolicyDto,
  UpdateCustomerDto,
  UpdatePolicyDto,
  RetentionQueryParams,
  ChurnPredictionInput,
} from '@insurance-lead-gen/types';

export function createRetentionRoutes(): Router {
  const router = Router();
  const retentionService = new RetentionService(prisma);

  // ========================================
  // CUSTOMER ENDPOINTS
  // ========================================

  // Create customer
  router.post('/customers', async (req, res) => {
    try {
      const dto: CreateCustomerDto = req.body;

      const customer = await prisma.customer.create({
        data: {
          leadId: dto.leadId,
          agentId: dto.agentId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          street: dto.address?.street,
          city: dto.address?.city,
          state: dto.address?.state,
          zipCode: dto.address?.zipCode,
          country: dto.address?.country,
          preferredContactMethod: dto.preferredContactMethod,
          tags: dto.tags || [],
          metadata: dto.metadata,
        },
      });

      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      logger.error('Error creating customer', { error });
      res.status(500).json({ success: false, error: 'Failed to create customer' });
    }
  });

  // Get customer by ID
  router.get('/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          policies: true,
          healthScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
          ltvCalculations: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }

      res.json({ success: true, data: customer });
    } catch (error) {
      logger.error('Error fetching customer', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch customer' });
    }
  });

  // Update customer
  router.patch('/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const dto: UpdateCustomerDto = req.body;

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          street: dto.address?.street,
          city: dto.address?.city,
          state: dto.address?.state,
          zipCode: dto.address?.zipCode,
          country: dto.address?.country,
          satisfactionScore: dto.satisfactionScore,
          preferredContactMethod: dto.preferredContactMethod,
          tags: dto.tags,
          metadata: dto.metadata,
        },
      });

      res.json({ success: true, data: customer });
    } catch (error) {
      logger.error('Error updating customer', { error });
      res.status(500).json({ success: false, error: 'Failed to update customer' });
    }
  });

  // List customers with filters
  router.get('/customers', async (req, res) => {
    try {
      const {
        churnRisk,
        healthScoreMin,
        healthScoreMax,
        agentId,
        page = '1',
        limit = '50',
      } = req.query as RetentionQueryParams;

      const whereClause: any = {};

      if (churnRisk) whereClause.churnRisk = churnRisk.toUpperCase();
      if (agentId) whereClause.agentId = agentId;
      if (healthScoreMin || healthScoreMax) {
        whereClause.healthScore = {};
        if (healthScoreMin) whereClause.healthScore.gte = Number(healthScoreMin);
        if (healthScoreMax) whereClause.healthScore.lte = Number(healthScoreMax);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: whereClause,
          skip,
          take: Number(limit),
          include: {
            policies: {
              where: { status: 'ACTIVE' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Error listing customers', { error });
      res.status(500).json({ success: false, error: 'Failed to list customers' });
    }
  });

  // ========================================
  // POLICY ENDPOINTS
  // ========================================

  // Create policy
  router.post('/policies', async (req, res) => {
    try {
      const dto: CreatePolicyDto = req.body;

      const policy = await prisma.policy.create({
        data: {
          customerId: dto.customerId,
          agentId: dto.agentId,
          policyNumber: dto.policyNumber,
          policyType: dto.policyType.toUpperCase(),
          premiumAmount: dto.premium.amount,
          premiumFrequency: dto.premium.frequency,
          premiumCurrency: dto.premium.currency,
          coverageType: dto.coverage.type,
          coverageAmount: dto.coverage.amount,
          coverageDeductible: dto.coverage.deductible,
          coverageLimits: dto.coverage.limits,
          effectiveDate: dto.effectiveDate,
          expirationDate: dto.expirationDate,
          renewalDate: dto.expirationDate, // Initial renewal date = expiration
          underwriter: dto.underwriter,
          documents: [],
          metadata: dto.metadata,
        },
      });

      // Update customer policy counts
      await prisma.customer.update({
        where: { id: dto.customerId },
        data: {
          totalPolicies: { increment: 1 },
          activePolicies: { increment: 1 },
        },
      });

      res.status(201).json({ success: true, data: policy });
    } catch (error) {
      logger.error('Error creating policy', { error });
      res.status(500).json({ success: false, error: 'Failed to create policy' });
    }
  });

  // Get policy by ID
  router.get('/policies/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          customer: true,
        },
      });

      if (!policy) {
        return res.status(404).json({ success: false, error: 'Policy not found' });
      }

      res.json({ success: true, data: policy });
    } catch (error) {
      logger.error('Error fetching policy', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch policy' });
    }
  });

  // Update policy
  router.patch('/policies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const dto: UpdatePolicyDto = req.body;

      const updateData: any = {};

      if (dto.status) updateData.status = dto.status.toUpperCase();
      if (dto.premium) {
        updateData.premiumAmount = dto.premium.amount;
        updateData.premiumFrequency = dto.premium.frequency;
        updateData.premiumCurrency = dto.premium.currency;
      }
      if (dto.coverage) {
        updateData.coverageType = dto.coverage.type;
        updateData.coverageAmount = dto.coverage.amount;
        updateData.coverageDeductible = dto.coverage.deductible;
        updateData.coverageLimits = dto.coverage.limits;
      }
      if (dto.expirationDate) updateData.expirationDate = dto.expirationDate;
      if (dto.renewalDate) updateData.renewalDate = dto.renewalDate;
      if (dto.metadata) updateData.metadata = dto.metadata;

      const policy = await prisma.policy.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, data: policy });
    } catch (error) {
      logger.error('Error updating policy', { error });
      res.status(500).json({ success: false, error: 'Failed to update policy' });
    }
  });

  // Renew policy
  router.post('/policies/:id/renew', async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await prisma.policy.findUnique({
        where: { id },
      });

      if (!policy) {
        return res.status(404).json({ success: false, error: 'Policy not found' });
      }

      const newExpirationDate = new Date(policy.expirationDate);
      newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);

      const renewedPolicy = await prisma.policy.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          lastRenewalDate: new Date(),
          expirationDate: newExpirationDate,
          renewalDate: newExpirationDate,
          renewalCount: { increment: 1 },
        },
      });

      // Create retention event
      await prisma.retentionEvent.create({
        data: {
          customerId: policy.customerId,
          policyId: id,
          eventType: 'policy_renewed',
          severity: 'info',
          data: {
            policyNumber: policy.policyNumber,
            renewalCount: renewedPolicy.renewalCount,
          },
          triggeredActions: [],
        },
      });

      res.json({ success: true, data: renewedPolicy });
    } catch (error) {
      logger.error('Error renewing policy', { error });
      res.status(500).json({ success: false, error: 'Failed to renew policy' });
    }
  });

  // ========================================
  // HEALTH SCORE & LTV ENDPOINTS
  // ========================================

  // Calculate customer health score
  router.post('/customers/:id/health-score', async (req, res) => {
    try {
      const { id } = req.params;
      const healthScore = await retentionService.calculateCustomerHealthScore(id);
      res.json({ success: true, data: healthScore });
    } catch (error) {
      logger.error('Error calculating health score', { error });
      res.status(500).json({ success: false, error: 'Failed to calculate health score' });
    }
  });

  // Get customer health score history
  router.get('/customers/:id/health-score', async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = '10' } = req.query;

      const healthScores = await prisma.customerHealthScore.findMany({
        where: { customerId: id },
        orderBy: { calculatedAt: 'desc' },
        take: Number(limit),
      });

      res.json({ success: true, data: healthScores });
    } catch (error) {
      logger.error('Error fetching health score history', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch health scores' });
    }
  });

  // Calculate customer LTV
  router.post('/customers/:id/ltv', async (req, res) => {
    try {
      const { id } = req.params;
      const ltv = await retentionService.calculateCustomerLTV(id);
      res.json({ success: true, data: ltv });
    } catch (error) {
      logger.error('Error calculating LTV', { error });
      res.status(500).json({ success: false, error: 'Failed to calculate LTV' });
    }
  });

  // Get customer LTV history
  router.get('/customers/:id/ltv', async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = '10' } = req.query;

      const ltvHistory = await prisma.customerLTV.findMany({
        where: { customerId: id },
        orderBy: { calculatedAt: 'desc' },
        take: Number(limit),
      });

      res.json({ success: true, data: ltvHistory });
    } catch (error) {
      logger.error('Error fetching LTV history', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch LTV history' });
    }
  });

  // Predict churn for customer
  router.post('/customers/:id/churn-prediction', async (req, res) => {
    try {
      const { id } = req.params;
      const input: ChurnPredictionInput = {
        customerId: id,
        features: req.body.features,
      };

      const prediction = await retentionService.predictChurnForCustomer(input);
      res.json({ success: true, data: prediction });
    } catch (error) {
      logger.error('Error predicting churn', { error });
      res.status(500).json({ success: false, error: 'Failed to predict churn' });
    }
  });

  // ========================================
  // METRICS ENDPOINTS
  // ========================================

  // Get retention metrics
  router.get('/metrics', async (req, res) => {
    try {
      const { startDate, endDate, agentId } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const metrics = await retentionService.getRetentionMetrics(start, end, agentId as string);

      res.json({ success: true, data: metrics });
    } catch (error) {
      logger.error('Error fetching retention metrics', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
    }
  });

  // Get customers at risk
  router.get('/at-risk', async (req, res) => {
    try {
      const { limit = '50' } = req.query;

      const atRiskCustomers = await prisma.customer.findMany({
        where: {
          churnRisk: {
            in: ['HIGH', 'CRITICAL'],
          },
        },
        include: {
          policies: {
            where: { status: 'ACTIVE' },
          },
          healthScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { healthScore: 'asc' },
        take: Number(limit),
      });

      res.json({ success: true, data: atRiskCustomers });
    } catch (error) {
      logger.error('Error fetching at-risk customers', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch at-risk customers' });
    }
  });

  // Get upcoming renewals
  router.get('/renewals/upcoming', async (req, res) => {
    try {
      const { days = '30' } = req.query;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Number(days));

      const upcomingRenewals = await prisma.policy.findMany({
        where: {
          status: 'ACTIVE',
          renewalDate: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        include: {
          customer: true,
        },
        orderBy: { renewalDate: 'asc' },
      });

      res.json({ success: true, data: upcomingRenewals });
    } catch (error) {
      logger.error('Error fetching upcoming renewals', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch renewals' });
    }
  });

  return router;
}
