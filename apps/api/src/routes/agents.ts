import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { generateId, store } from '../storage/in-memory.js';
import { onboardingTracker } from '../telemetry/onboarding-tracker.js';
import type { Agent } from '@insurance-lead-gen/types';

const router = Router();

// Validation schemas
const createAgentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  licenseNumber: z.string().min(1),
  specializations: z.array(z.string()).default([]),
  location: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string().default('US'),
  }),
  rating: z.number().min(0).max(5).default(0),
  maxLeadCapacity: z.number().positive().default(10),
});

const updateAgentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  specializations: z.array(z.string()).optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  rating: z.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
  maxLeadCapacity: z.number().positive().optional(),
});

/**
 * POST /api/v1/agents
 * Create a new agent profile
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createAgentSchema.parse(req.body);
    const now = new Date();

    const agent: Agent = {
      id: generateId(),
      ...validated,
      currentLeadCount: 0,
      averageResponseTime: 0,
      conversionRate: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.agents.set(agent.id, agent);
    onboardingTracker.recordAgentSignup(agent);

    logger.info('Agent created', { agentId: agent.id, email: agent.email });

    res.status(201).json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents
 * List all agents
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { active, specialization, limit } = req.query;

    let agents = Array.from(store.agents.values());

    // Filter by active status
    if (active !== undefined) {
      const isActive = active === 'true';
      agents = agents.filter(agent => agent.isActive === isActive);
    }

    // Filter by specialization
    if (specialization) {
      const spec = specialization as string;
      agents = agents.filter(agent => 
        agent.specializations.some(s => s.toLowerCase() === spec.toLowerCase())
      );
    }

    // Apply limit
    const take = limit ? parseInt(limit as string, 10) : undefined;
    if (take && take > 0) {
      agents = agents.slice(0, take);
    }

    // Sort by rating (highest first)
    agents.sort((a, b) => b.rating - a.rating);

    res.json({ 
      agents,
      total: agents.length,
    });
  } catch (error) {
    logger.error('Error listing agents', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:id
 * Get agent details
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = store.agents.get(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (error) {
    logger.error('Error fetching agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:id
 * Update agent profile
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = store.agents.get(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const validated = updateAgentSchema.parse(req.body);

    // Update agent fields
    if (validated.firstName !== undefined) agent.firstName = validated.firstName;
    if (validated.lastName !== undefined) agent.lastName = validated.lastName;
    if (validated.email !== undefined) agent.email = validated.email;
    if (validated.phone !== undefined) agent.phone = validated.phone;
    if (validated.licenseNumber !== undefined) agent.licenseNumber = validated.licenseNumber;
    if (validated.specializations !== undefined) agent.specializations = validated.specializations;
    if (validated.location !== undefined) agent.location = validated.location;
    if (validated.rating !== undefined) agent.rating = validated.rating;
    if (validated.isActive !== undefined) agent.isActive = validated.isActive;
    if (validated.maxLeadCapacity !== undefined) agent.maxLeadCapacity = validated.maxLeadCapacity;

    agent.updatedAt = new Date();
    store.agents.set(id, agent);

    logger.info('Agent updated', { agentId: id });

    res.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/agents/:id
 * Deactivate an agent (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = store.agents.get(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Soft delete - just mark as inactive
    agent.isActive = false;
    agent.updatedAt = new Date();
    store.agents.set(id, agent);

    logger.info('Agent deactivated', { agentId: id });

    res.json({ message: 'Agent deactivated successfully', agentId: id });
  } catch (error) {
    logger.error('Error deactivating agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:id/specializations
 * Get agent specializations
 */
router.get('/:id/specializations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = store.agents.get(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({
      agentId: id,
      specializations: agent.specializations,
    });
  } catch (error) {
    logger.error('Error fetching agent specializations', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:id/metrics
 * Get agent performance metrics
 */
router.get('/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = store.agents.get(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Calculate metrics
    const metrics = {
      agentId: id,
      rating: agent.rating,
      conversionRate: agent.conversionRate,
      averageResponseTime: agent.averageResponseTime,
      currentLeadCount: agent.currentLeadCount,
      maxLeadCapacity: agent.maxLeadCapacity,
      availableCapacity: agent.maxLeadCapacity - agent.currentLeadCount,
      utilizationPercentage: (agent.currentLeadCount / agent.maxLeadCapacity) * 100,
      isActive: agent.isActive,
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching agent metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
