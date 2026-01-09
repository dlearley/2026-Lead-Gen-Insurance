import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createLeadSchema, leadListSchema, updateLeadSchema, validateBody, validateQuery } from '../utils/validation.js';
import { createEndpointRateLimiter } from '../middleware/user-rate-limit.js';
import { store, generateId } from '../storage/in-memory.js';
import { sendSuccess, sendError } from '../utils/response.js';
import type { Lead } from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

const createLeadLimiter = createEndpointRateLimiter(50, 60 * 60 * 1000);

router.post('/', authMiddleware, requirePermission('write:leads'), createLeadLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const validated = validateBody(createLeadSchema, req.body);
    const now = new Date();

    const lead: Lead = {
      id: generateId(),
      source: validated.source,
      email: validated.email,
      phone: validated.phone,
      firstName: validated.firstName,
      lastName: validated.lastName,
      address: {
        street: validated.street,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        country: validated.country,
      },
      insuranceType: validated.insuranceType ? validated.insuranceType.toLowerCase() : undefined,
      status: 'received',
      metadata: validated.metadata,
      createdAt: now,
      updatedAt: now,
    };

    store.leads.set(lead.id, lead);

    const activity = {
      id: generateId(),
      leadId: lead.id,
      userId: user.id,
      activityType: 'lead_created' as const,
      action: 'Created lead',
      description: `Lead created from source ${lead.source}`,
      metadata: { leadId: lead.id, source: lead.source },
      createdAt: now,
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    return sendSuccess(res, lead, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.errors);
    }
    logger.error('Error creating lead', { error });
    return sendError(res, 'Internal server error', 500);
  }
});

router.get('/', authMiddleware, requirePermission('read:leads'), async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = validateQuery(leadListSchema, req.query);

    let leads = Array.from(store.leads.values());

    if (filters.status) {
      leads = leads.filter((l) => l.status.toUpperCase() === filters.status);
    }

    if (filters.insuranceType) {
      leads = leads.filter((l) => l.insuranceType?.toUpperCase() === filters.insuranceType);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      leads = leads.filter((l) => {
        const blob = `${l.firstName ?? ''} ${l.lastName ?? ''} ${l.email ?? ''} ${l.phone ?? ''}`.toLowerCase();
        return blob.includes(s);
      });
    }

    leads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = leads.length;
    const data = leads.slice(filters.skip, filters.skip + filters.take);

    return sendSuccess(res, {
      data,
      pagination: {
        skip: filters.skip,
        take: filters.take,
        total,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.errors);
    }
    logger.error('Error listing leads', { error });
    return sendError(res, 'Internal server error', 500);
  }
});

router.get('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(lead);
  } catch (error) {
    logger.error('Error fetching lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const validated = validateBody(updateLeadSchema, req.body);

    if (validated.source !== undefined) lead.source = validated.source;
    if (validated.email !== undefined) lead.email = validated.email;
    if (validated.phone !== undefined) lead.phone = validated.phone;
    if (validated.firstName !== undefined) lead.firstName = validated.firstName;
    if (validated.lastName !== undefined) lead.lastName = validated.lastName;

    lead.address = {
      street: validated.street ?? lead.address?.street,
      city: validated.city ?? lead.address?.city,
      state: validated.state ?? lead.address?.state,
      zipCode: validated.zipCode ?? lead.address?.zipCode,
      country: validated.country ?? lead.address?.country,
    };

    if (validated.insuranceType !== undefined) {
      lead.insuranceType = validated.insuranceType.toLowerCase();
    }

    if (validated.status !== undefined) {
      lead.status = validated.status.toLowerCase() as Lead['status'];
    }

    if (validated.qualityScore !== undefined) {
      lead.qualityScore = validated.qualityScore;
    }

    if (validated.metadata !== undefined) {
      lead.metadata = validated.metadata;
    }

    lead.updatedAt = new Date();
    store.leads.set(leadId, lead);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'lead_updated' as const,
      action: 'Updated lead',
      description: `Lead updated by ${user.email}`,
      metadata: { leadId },
      createdAt: new Date(),
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    res.json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/:leadId/route
 * Route a lead to the best matching agent
 */
router.post('/:leadId/route', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { agentId } = req.body;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    let agent;
    if (agentId) {
      // Specific agent requested
      agent = store.agents.get(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
    } else {
      // Find best matching agent
      const matchingAgents = findMatchingAgents(lead);
      if (matchingAgents.length === 0) {
        res.status(404).json({ error: 'No matching agents found' });
        return;
      }
      agent = matchingAgents[0];
    }

    // Create assignment
    const assignmentId = generateId();
    const assignment = {
      id: assignmentId,
      leadId,
      agentId: agent.id,
      assignedAt: new Date(),
      status: 'pending' as const,
    };

    store.assignments.set(assignmentId, assignment);

    // Update lead status
    lead.status = 'routed';
    lead.updatedAt = new Date();
    store.leads.set(leadId, lead);

    // Update agent lead count
    agent.currentLeadCount += 1;
    store.agents.set(agent.id, agent);

    logger.info('Lead routed', { leadId, agentId: agent.id, assignmentId });

    res.json({
      success: true,
      lead,
      assignment,
      agent,
    });
  } catch (error) {
    logger.error('Error routing lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/leads/:leadId/matching-agents
 * Get agents that match this lead
 */
router.get('/:leadId/matching-agents', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { limit } = req.query;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const matchingAgents = findMatchingAgents(lead);
    const take = limit ? parseInt(limit as string, 10) : undefined;
    const agents = take ? matchingAgents.slice(0, take) : matchingAgents;

    res.json({
      leadId,
      agents: agents.map(a => ({
        ...a,
        routingFactors: a.routingFactors,
        confidence: a.confidence,
      })),
      total: agents.length,
    });
  } catch (error) {
    logger.error('Error fetching matching agents', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/:leadId/assign/:agentId
 * Assign a lead to a specific agent
 */
router.post('/:leadId/assign/:agentId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, agentId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const agent = store.agents.get(agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (!agent.isActive) {
      res.status(400).json({ error: 'Agent is not active' });
      return;
    }

    if (agent.currentLeadCount >= agent.maxLeadCapacity) {
      res.status(400).json({ error: 'Agent has reached maximum lead capacity' });
      return;
    }

    // Create assignment
    const assignmentId = generateId();
    const assignment = {
      id: assignmentId,
      leadId,
      agentId,
      assignedAt: new Date(),
      status: 'pending' as const,
    };

    store.assignments.set(assignmentId, assignment);

    // Update lead status
    lead.status = 'routed';
    lead.updatedAt = new Date();
    store.leads.set(leadId, lead);

    // Update agent lead count
    agent.currentLeadCount += 1;
    store.agents.set(agentId, agent);

    logger.info('Lead assigned to agent', { leadId, agentId, assignmentId });

    res.json({
      success: true,
      lead,
      assignment,
      agent,
    });
  } catch (error) {
    logger.error('Error assigning lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const assignmentsToDelete: string[] = [];
    for (const [id, a] of store.assignments.entries()) {
      if (a.leadId === leadId) {
        assignmentsToDelete.push(id);
      }
    }

    for (const assignmentId of assignmentsToDelete) {
      const assignment = store.assignments.get(assignmentId);
      if (assignment) {
        const agent = store.agents.get(assignment.agentId);
        if (agent && agent.currentLeadCount > 0) {
          agent.currentLeadCount -= 1;
          store.agents.set(agent.id, agent);
        }
      }
      store.assignments.delete(assignmentId);
    }

    for (const [id, note] of store.notes.entries()) {
      if (note.leadId === leadId) store.notes.delete(id);
    }

    for (const [id, task] of store.tasks.entries()) {
      if (task.leadId === leadId) store.tasks.delete(id);
    }

    for (const [id, email] of store.emails.entries()) {
      if (email.leadId === leadId) store.emails.delete(id);
    }

    for (const [id, activity] of store.activities.entries()) {
      if (activity.leadId === leadId) store.activities.delete(id);
    }

    for (const [id, policy] of store.policies.entries()) {
      if (policy.leadId === leadId) store.policies.delete(id);
    }

    store.leads.delete(leadId);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/bulk/update
 * Bulk update multiple leads
 */
router.post('/bulk/update', authMiddleware, requirePermission('write:leads'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { lead_ids, updates } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      res.status(400).json({ error: 'lead_ids must be a non-empty array' });
      return;
    }

    const success: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];
    const now = new Date();

    for (const leadId of lead_ids) {
      try {
        const lead = store.leads.get(leadId.toString());
        if (!lead) {
          failed.push({ id: leadId, error: 'Lead not found' });
          continue;
        }

        // Apply updates
        if (updates.source !== undefined) lead.source = updates.source;
        if (updates.email !== undefined) lead.email = updates.email;
        if (updates.phone !== undefined) lead.phone = updates.phone;
        if (updates.firstName !== undefined) lead.firstName = updates.firstName;
        if (updates.lastName !== undefined) lead.lastName = updates.lastName;

        if (updates.address) {
          lead.address = {
            street: updates.address.street ?? lead.address?.street,
            city: updates.address.city ?? lead.address?.city,
            state: updates.address.state ?? lead.address?.state,
            zipCode: updates.address.zipCode ?? lead.address?.zipCode,
            country: updates.address.country ?? lead.address?.country,
          };
        }

        if (updates.insuranceType !== undefined) {
          lead.insuranceType = updates.insuranceType.toLowerCase();
        }

        if (updates.status !== undefined) {
          lead.status = updates.status.toLowerCase() as Lead['status'];
        }

        if (updates.qualityScore !== undefined) {
          lead.qualityScore = updates.qualityScore;
        }

        if (updates.metadata !== undefined) {
          lead.metadata = updates.metadata;
        }

        lead.updatedAt = now;
        store.leads.set(leadId.toString(), lead);
        success.push(leadId);
      } catch (error) {
        failed.push({ id: leadId, error: 'Update failed' });
      }
    }

    // Log bulk update activity
    if (success.length > 0) {
      const activity = {
        id: generateId(),
        leadId: lead_ids[0],
        userId: user.id,
        activityType: 'bulk_updated' as const,
        action: 'Bulk updated leads',
        description: `Bulk updated ${success.length} lead(s)`,
        metadata: { lead_ids: lead_ids, updates, success_count: success.length },
        createdAt: now,
        user: store.users.get(user.id),
      };
      store.activities.set(activity.id, activity);
    }

    res.json({
      success,
      failed,
      message: `Updated ${success.length} lead(s), ${failed.length} failed`,
    });
  } catch (error) {
    logger.error('Error in bulk update', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/bulk/assign
 * Bulk assign leads to an agent
 */
router.post('/bulk/assign', authMiddleware, requirePermission('write:leads'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { lead_ids, assignee_id, reason } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      res.status(400).json({ error: 'lead_ids must be a non-empty array' });
      return;
    }

    if (!assignee_id) {
      res.status(400).json({ error: 'assignee_id is required' });
      return;
    }

    const agent = store.agents.get(assignee_id.toString());
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (!agent.isActive) {
      res.status(400).json({ error: 'Agent is not active' });
      return;
    }

    const success: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];
    const now = new Date();

    for (const leadId of lead_ids) {
      try {
        const lead = store.leads.get(leadId.toString());
        if (!lead) {
          failed.push({ id: leadId, error: 'Lead not found' });
          continue;
        }

        // Check agent capacity
        if (agent.currentLeadCount >= agent.maxLeadCapacity) {
          failed.push({ id: leadId, error: 'Agent has reached maximum lead capacity' });
          continue;
        }

        // Create assignment
        const assignmentId = generateId();
        const assignment = {
          id: assignmentId,
          leadId: leadId.toString(),
          agentId: assignee_id.toString(),
          assignedAt: now,
          status: 'pending' as const,
        };
        store.assignments.set(assignmentId, assignment);

        // Update lead status
        lead.status = 'routed';
        lead.updatedAt = now;
        store.leads.set(leadId.toString(), lead);

        // Update agent lead count
        agent.currentLeadCount += 1;
        success.push(leadId);
      } catch (error) {
        failed.push({ id: leadId, error: 'Assignment failed' });
      }
    }

    store.agents.set(agent.id, agent);

    // Log bulk assignment activity
    if (success.length > 0) {
      const activity = {
        id: generateId(),
        leadId: lead_ids[0],
        userId: user.id,
        activityType: 'reassigned' as const,
        action: 'Bulk assigned leads',
        description: `Bulk assigned ${success.length} lead(s) to agent ${agent.email}`,
        metadata: { lead_ids: lead_ids, assignee_id, reason, success_count: success.length },
        createdAt: now,
        user: store.users.get(user.id),
      };
      store.activities.set(activity.id, activity);
    }

    res.json({
      success,
      failed,
      message: `Assigned ${success.length} lead(s), ${failed.length} failed`,
    });
  } catch (error) {
    logger.error('Error in bulk assign', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/bulk/status
 * Bulk update lead status
 */
router.post('/bulk/status', authMiddleware, requirePermission('write:leads'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { lead_ids, status, reason } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      res.status(400).json({ error: 'lead_ids must be a non-empty array' });
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const success: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];
    const now = new Date();

    for (const leadId of lead_ids) {
      try {
        const lead = store.leads.get(leadId.toString());
        if (!lead) {
          failed.push({ id: leadId, error: 'Lead not found' });
          continue;
        }

        const oldStatus = lead.status;
        lead.status = status.toLowerCase() as Lead['status'];
        lead.updatedAt = now;
        store.leads.set(leadId.toString(), lead);

        // Create status history entry
        const historyEntry = {
          id: generateId(),
          leadId: leadId.toString(),
          old_status: oldStatus,
          new_status: status.toLowerCase(),
          changed_by_id: user.id,
          reason: reason,
          created_at: now,
          changed_by_name: user.email,
        };
        store.leadStatusHistory.set(historyEntry.id, historyEntry);

        success.push(leadId);
      } catch (error) {
        failed.push({ id: leadId, error: 'Status update failed' });
      }
    }

    // Log bulk status update activity
    if (success.length > 0) {
      const activity = {
        id: generateId(),
        leadId: lead_ids[0],
        userId: user.id,
        activityType: 'status_changed' as const,
        action: 'Bulk updated lead status',
        description: `Bulk updated ${success.length} lead(s) to status: ${status}`,
        metadata: { lead_ids: lead_ids, status, reason, success_count: success.length },
        createdAt: now,
        user: store.users.get(user.id),
      };
      store.activities.set(activity.id, activity);
    }

    res.json({
      success,
      failed,
      message: `Updated status for ${success.length} lead(s), ${failed.length} failed`,
    });
  } catch (error) {
    logger.error('Error in bulk status update', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/leads/bulk/delete
 * Bulk delete leads
 */
router.post('/bulk/delete', authMiddleware, requirePermission('delete:leads'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { lead_ids } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      res.status(400).json({ error: 'lead_ids must be a non-empty array' });
      return;
    }

    const success: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];
    const now = new Date();

    for (const leadId of lead_ids) {
      try {
        const lead = store.leads.get(leadId.toString());
        if (!lead) {
          failed.push({ id: leadId, error: 'Lead not found' });
          continue;
        }

        // Clean up related data
        const assignmentsToDelete: string[] = [];
        for (const [id, a] of store.assignments.entries()) {
          if (a.leadId === leadId.toString()) {
            assignmentsToDelete.push(id);
          }
        }

        for (const assignmentId of assignmentsToDelete) {
          const assignment = store.assignments.get(assignmentId);
          if (assignment) {
            const agent = store.agents.get(assignment.agentId);
            if (agent && agent.currentLeadCount > 0) {
              agent.currentLeadCount -= 1;
              store.agents.set(agent.id, agent);
            }
          }
          store.assignments.delete(assignmentId);
        }

        for (const [id, note] of store.notes.entries()) {
          if (note.leadId === leadId.toString()) store.notes.delete(id);
        }

        for (const [id, task] of store.tasks.entries()) {
          if (task.leadId === leadId.toString()) store.tasks.delete(id);
        }

        for (const [id, email] of store.emails.entries()) {
          if (email.leadId === leadId.toString()) store.emails.delete(id);
        }

        for (const [id, activity] of store.activities.entries()) {
          if (activity.leadId === leadId.toString()) store.activities.delete(id);
        }

        for (const [id, policy] of store.policies.entries()) {
          if (policy.leadId === leadId.toString()) store.policies.delete(id);
        }

        store.leads.delete(leadId.toString());
        success.push(leadId);
      } catch (error) {
        failed.push({ id: leadId, error: 'Delete failed' });
      }
    }

    // Log bulk delete activity
    if (success.length > 0) {
      const activity = {
        id: generateId(),
        leadId: lead_ids[0],
        userId: user.id,
        activityType: 'deleted' as const,
        action: 'Bulk deleted leads',
        description: `Bulk deleted ${success.length} lead(s)`,
        metadata: { lead_ids: lead_ids, success_count: success.length },
        createdAt: now,
        user: store.users.get(user.id),
      };
      store.activities.set(activity.id, activity);
    }

    res.json({
      success,
      failed,
      message: `Deleted ${success.length} lead(s), ${failed.length} failed`,
    });
  } catch (error) {
    logger.error('Error in bulk delete', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to find matching agents for a lead
 */
function findMatchingAgents(lead: Lead): Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specializations: string[];
  location: { city: string; state: string; country: string };
  rating: number;
  currentLeadCount: number;
  maxLeadCapacity: number;
  conversionRate: number;
  routingFactors: {
    specializationMatch: number;
    locationProximity: number;
    performanceScore: number;
    currentWorkload: number;
    qualityTierAlignment: number;
  };
  confidence: number;
}> {
  const agents = Array.from(store.agents.values())
    .filter(agent => agent.isActive);

  const scoredAgents = agents.map(agent => {
    // Calculate specialization match
    const specializationMatch = lead.insuranceType && 
      agent.specializations.some(s => s.toLowerCase() === lead.insuranceType!.toLowerCase())
      ? 1.0 
      : lead.insuranceType ? 0.3 : 0.5;

    // Calculate location proximity
    let locationProximity = 0.5;
    if (lead.address?.state && agent.location.state) {
      if (lead.address.state.toLowerCase() === agent.location.state.toLowerCase()) {
        locationProximity = lead.address.city && agent.location.city &&
          lead.address.city.toLowerCase() === agent.location.city.toLowerCase()
          ? 1.0 
          : 0.8;
      } else {
        locationProximity = 0.3;
      }
    }

    // Calculate performance score
    const ratingScore = agent.rating / 5;
    const performanceScore = ratingScore * 0.4 + agent.conversionRate * 0.6;

    // Calculate workload score
    const workloadScore = Math.max(0, 1 - (agent.currentLeadCount / agent.maxLeadCapacity));

    // Calculate quality tier alignment
    let qualityTierAlignment = 0.75;
    if (lead.qualityScore) {
      if (lead.qualityScore >= 80) {
        qualityTierAlignment = agent.rating >= 4.5 ? 1.0 : 0.6;
      } else if (lead.qualityScore >= 50) {
        qualityTierAlignment = 0.8;
      }
    }

    // Calculate overall confidence
    const confidence = (
      specializationMatch * 0.3 +
      locationProximity * 0.25 +
      performanceScore * 0.2 +
      workloadScore * 0.2 +
      qualityTierAlignment * 0.05
    );

    return {
      ...agent,
      routingFactors: {
        specializationMatch,
        locationProximity,
        performanceScore,
        currentWorkload: workloadScore,
        qualityTierAlignment,
      },
      confidence,
    };
  });

  // Sort by confidence
  return scoredAgents.sort((a, b) => b.confidence - a.confidence);
}

export default router;
