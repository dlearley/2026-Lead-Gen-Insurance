import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { createLeadSchema, leadListSchema, updateLeadSchema, validateBody, validateQuery } from '../utils/validation.js';
import { store, generateId } from '../storage/in-memory.js';
import type { Lead } from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    res.status(201).json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    res.json({
      data,
      pagination: {
        skip: filters.skip,
        take: filters.take,
        total,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error listing leads', { error });
    res.status(500).json({ error: 'Internal server error' });
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
