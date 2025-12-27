import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  activatePolicySchema,
  cancelPolicySchema,
  createEndorsementSchema,
  createInvoiceSchema,
  createPolicySchema,
  payInvoiceSchema,
  policyFilterSchema,
  renewPolicySchema,
  updatePolicySchema,
  validateBody,
  validateQuery,
} from '../utils/validation.js';
import { store, generateId } from '../storage/in-memory.js';
import type { Policy, PolicyEndorsement, PolicyInvoice } from '@insurance-lead-gen/types';
import { paginate } from '../utils/pagination.js';
import { logger } from '@insurance-lead-gen/core';

const router = Router({ mergeParams: true });

function generatePolicyNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `POL-${year}-${seq}`;
}

function generateInvoiceNumber(policyNumber: string, index: number): string {
  return `INV-${policyNumber}-${String(index).padStart(3, '0')}`;
}

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const validated = validateBody(createPolicySchema, req.body);

    const insuranceType = (validated.insuranceType
      ? validated.insuranceType.toLowerCase()
      : lead.insuranceType ?? 'auto') as Policy['insuranceType'];

    const now = new Date();
    const effectiveDate = validated.effectiveDate ? new Date(validated.effectiveDate) : now;
    const expirationDate = validated.expirationDate
      ? new Date(validated.expirationDate)
      : new Date(new Date(effectiveDate).setFullYear(effectiveDate.getFullYear() + 1));

    const policy: Policy = {
      id: generateId(),
      leadId,
      agentId: validated.agentId,
      insuranceType,
      policyNumber: generatePolicyNumber(),
      carrier: validated.carrier,
      productName: validated.productName,
      status: 'draft',
      effectiveDate,
      expirationDate,
      premium: {
        amount: validated.premium.amount,
        currency: validated.premium.currency,
      },
      billingFrequency: validated.billingFrequency.toLowerCase() as Policy['billingFrequency'],
      coverage: validated.coverage,
      endorsements: [],
      invoices: [],
      createdAt: now,
      updatedAt: now,
    };

    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Created policy',
      description: `Policy ${policy.policyNumber} created by ${user.email}`,
      metadata: { policyId: policy.id, policyNumber: policy.policyNumber },
      createdAt: now,
      user: store.users.get(user.id),
    });

    res.status(201).json(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const filters = validateQuery(policyFilterSchema, req.query);

    let policies = Array.from(store.policies.values()).filter((p) => p.leadId === leadId);

    if (filters.status) {
      policies = policies.filter((p) => p.status.toUpperCase() === filters.status);
    }

    policies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = paginate(policies, filters.page, filters.limit);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching policies', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:policyId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    res.json(policy);
  } catch (error) {
    logger.error('Error fetching policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:policyId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(updatePolicySchema, req.body);

    if (validated.agentId !== undefined) policy.agentId = validated.agentId;
    if (validated.carrier !== undefined) policy.carrier = validated.carrier;
    if (validated.productName !== undefined) policy.productName = validated.productName;
    if (validated.effectiveDate !== undefined) policy.effectiveDate = new Date(validated.effectiveDate);
    if (validated.expirationDate !== undefined) policy.expirationDate = new Date(validated.expirationDate);
    if (validated.premium !== undefined) policy.premium = validated.premium;
    if (validated.billingFrequency !== undefined) {
      policy.billingFrequency = validated.billingFrequency.toLowerCase() as Policy['billingFrequency'];
    }
    if (validated.coverage !== undefined) policy.coverage = validated.coverage;

    if (validated.status !== undefined) {
      policy.status = validated.status.toLowerCase() as Policy['status'];
    }

    policy.updatedAt = new Date();
    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Updated policy',
      description: `Policy ${policy.policyNumber} updated by ${user.email}`,
      metadata: { policyId: policy.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.json(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/activate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(activatePolicySchema, req.body);

    if (validated.effectiveDate) {
      policy.effectiveDate = new Date(validated.effectiveDate);
    }

    policy.status = 'active';
    policy.updatedAt = new Date();
    store.policies.set(policy.id, policy);

    if (lead.status !== 'converted') {
      lead.status = 'converted';
      lead.updatedAt = new Date();
      store.leads.set(leadId, lead);

      const leadActivityId = generateId();
      store.activities.set(leadActivityId, {
        id: leadActivityId,
        leadId,
        userId: user.id,
        activityType: 'status_changed',
        action: 'Lead converted',
        description: `Lead converted due to policy activation (${policy.policyNumber})`,
        metadata: { policyId: policy.id, policyNumber: policy.policyNumber },
        createdAt: new Date(),
        user: store.users.get(user.id),
      });
    }

    const policyActivityId = generateId();
    store.activities.set(policyActivityId, {
      id: policyActivityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Activated policy',
      description: `Policy ${policy.policyNumber} activated by ${user.email}`,
      metadata: { policyId: policy.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.json(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error activating policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/cancel', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(cancelPolicySchema, req.body);

    policy.status = 'cancelled';
    policy.cancelledAt = validated.cancelledAt ? new Date(validated.cancelledAt) : new Date();
    policy.cancellationReason = validated.reason;
    policy.updatedAt = new Date();

    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Cancelled policy',
      description: `Policy ${policy.policyNumber} cancelled by ${user.email}`,
      metadata: { policyId: policy.id, reason: validated.reason },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.json(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error cancelling policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:policyId/endorsements', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    res.json({ data: policy.endorsements });
  } catch (error) {
    logger.error('Error fetching endorsements', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/endorsements', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(createEndorsementSchema, req.body);

    const endorsement: PolicyEndorsement = {
      id: generateId(),
      policyId: policy.id,
      type: validated.type,
      effectiveDate: validated.effectiveDate ? new Date(validated.effectiveDate) : new Date(),
      description: validated.description,
      changes: validated.changes,
      premiumDelta: validated.premiumDelta,
      createdAt: new Date(),
      createdBy: user.id,
    };

    policy.endorsements.push(endorsement);

    if (endorsement.premiumDelta !== undefined) {
      policy.premium.amount = Math.max(0, policy.premium.amount + endorsement.premiumDelta);
    }

    policy.updatedAt = new Date();
    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Created endorsement',
      description: `Endorsement created for policy ${policy.policyNumber}`,
      metadata: { policyId: policy.id, endorsementId: endorsement.id, type: endorsement.type },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.status(201).json(endorsement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating endorsement', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/renew', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(renewPolicySchema, req.body);

    const now = new Date();
    const renewal: Policy = {
      ...policy,
      id: generateId(),
      policyNumber: generatePolicyNumber(),
      status: 'draft',
      effectiveDate: new Date(validated.effectiveDate),
      expirationDate: new Date(validated.expirationDate),
      cancelledAt: undefined,
      cancellationReason: undefined,
      renewalOfPolicyId: policy.id,
      renewedToPolicyId: undefined,
      endorsements: [],
      invoices: [],
      premium: validated.premium ?? policy.premium,
      createdAt: now,
      updatedAt: now,
    };

    policy.renewedToPolicyId = renewal.id;
    policy.updatedAt = now;

    store.policies.set(policy.id, policy);
    store.policies.set(renewal.id, renewal);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Renewed policy',
      description: `Policy ${policy.policyNumber} renewed to ${renewal.policyNumber}`,
      metadata: { policyId: policy.id, renewalPolicyId: renewal.id },
      createdAt: now,
      user: store.users.get(user.id),
    });

    res.status(201).json({ policy, renewal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error renewing policy', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:policyId/invoices', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    res.json({ data: policy.invoices });
  } catch (error) {
    logger.error('Error fetching invoices', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/invoices', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(createInvoiceSchema, req.body);

    const invoiceIndex = policy.invoices.length + 1;
    const invoice: PolicyInvoice = {
      id: generateId(),
      policyId: policy.id,
      invoiceNumber: validated.invoiceNumber ?? generateInvoiceNumber(policy.policyNumber, invoiceIndex),
      amount: validated.amount,
      dueDate: new Date(validated.dueDate),
      status: 'open',
      createdAt: new Date(),
    };

    policy.invoices.push(invoice);
    policy.updatedAt = new Date();

    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Created invoice',
      description: `Invoice ${invoice.invoiceNumber} created for policy ${policy.policyNumber}`,
      metadata: { policyId: policy.id, invoiceId: invoice.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating invoice', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:policyId/invoices/:invoiceId/pay', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, policyId, invoiceId } = req.params;
    const user = req.user!;

    const policy = store.policies.get(policyId);
    if (!policy || policy.leadId !== leadId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const validated = validateBody(payInvoiceSchema, req.body);

    const invoice = policy.invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({ error: 'Invoice already paid' });
      return;
    }

    if (invoice.status === 'void') {
      res.status(400).json({ error: 'Invoice is void' });
      return;
    }

    invoice.status = 'paid';
    invoice.paidAt = validated.paidAt ? new Date(validated.paidAt) : new Date();

    policy.updatedAt = new Date();
    store.policies.set(policy.id, policy);

    const activityId = generateId();
    store.activities.set(activityId, {
      id: activityId,
      leadId,
      userId: user.id,
      activityType: 'system_action',
      action: 'Recorded payment',
      description: `Payment recorded for invoice ${invoice.invoiceNumber}`,
      metadata: { policyId: policy.id, invoiceId: invoice.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    });

    res.json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error paying invoice', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
