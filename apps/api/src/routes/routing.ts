import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { generateId, store } from '../storage/in-memory.js';

// Configuration schema
const routingConfigSchema = z.object({
  minConfidenceThreshold: z.number().min(0).max(1).optional(),
  maxAgentsPerLead: z.number().positive().optional(),
  enableRoundRobin: z.boolean().optional(),
  enableLoadBalancing: z.boolean().optional(),
  enableGraphBasedRouting: z.boolean().optional(),
  notificationTimeoutMs: z.number().positive().optional(),
  escalationTimeoutMs: z.number().positive().optional(),
});

const router = Router();

// In-memory routing configuration
let routingConfig = {
  minConfidenceThreshold: 0.7,
  maxAgentsPerLead: 3,
  enableRoundRobin: true,
  enableLoadBalancing: true,
  enableGraphBasedRouting: true,
  notificationTimeoutMs: 300000,
  escalationTimeoutMs: 900000,
};

/**
 * GET /api/v1/routing/config
 * Get current routing configuration
 */
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  res.json(routingConfig);
});

/**
 * PUT /api/v1/routing/config
 * Update routing configuration
 */
router.put('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = routingConfigSchema.parse(req.body);
    routingConfig = { ...routingConfig, ...validated };

    logger.info('Routing configuration updated', { config: routingConfig });

    res.json(routingConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating routing config', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/process-lead
 * AI-powered lead processing and routing
 */
router.post('/process-lead', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      res.status(400).json({ error: 'Lead ID is required' });
      return;
    }

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Find matching agents
    const matchingAgents = findMatchingAgents(lead);

    if (matchingAgents.length === 0) {
      res.status(404).json({ 
        error: 'No matching agents found for lead',
        leadId,
      });
      return;
    }

    // Select best agent based on configuration
    const selectedAgent = matchingAgents[0];

    // Create assignment
    const assignmentId = generateId();
    const assignment = {
      id: assignmentId,
      leadId,
      agentId: selectedAgent.id,
      assignedAt: new Date(),
      status: 'pending' as const,
    };

    // Store assignment
    store.assignments.set(assignmentId, assignment);

    // Update lead status
    lead.status = 'routed';
    lead.updatedAt = new Date();
    store.leads.set(leadId, lead);

    // Update agent lead count
    selectedAgent.currentLeadCount += 1;
    store.agents.set(selectedAgent.id, selectedAgent);

    logger.info('Lead processed and routed', { 
      leadId, 
      agentId: selectedAgent.id,
      assignmentId,
    });

    res.json({
      success: true,
      leadId,
      assignment,
      agent: selectedAgent,
      routingFactors: selectedAgent.routingFactors,
      confidence: selectedAgent.confidence,
    });
  } catch (error) {
    logger.error('Error processing lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/route/:leadId
 * Route a specific lead to the best matching agent
 */
router.post('/route/:leadId', async (req: Request, res: Response): Promise<void> => {
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
      assignment,
      agent,
    });
  } catch (error) {
    logger.error('Error routing lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/batch
 * Batch process multiple leads for routing
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'Lead IDs array is required' });
      return;
    }

    const results = [];

    for (const leadId of leadIds) {
      const lead = store.leads.get(leadId);
      
      if (!lead) {
        results.push({
          leadId,
          success: false,
          error: 'Lead not found',
        });
        continue;
      }

      const matchingAgents = findMatchingAgents(lead);

      if (matchingAgents.length === 0) {
        results.push({
          leadId,
          success: false,
          error: 'No matching agents found',
        });
        continue;
      }

      const agent = matchingAgents[0];
      const assignmentId = generateId();
      const assignment = {
        id: assignmentId,
        leadId,
        agentId: agent.id,
        assignedAt: new Date(),
        status: 'pending' as const,
      };

      store.assignments.set(assignmentId, assignment);

      lead.status = 'routed';
      lead.updatedAt = new Date();
      store.leads.set(leadId, lead);

      agent.currentLeadCount += 1;
      store.agents.set(agent.id, agent);

      results.push({
        leadId,
        success: true,
        assignment,
        agentId: agent.id,
      });
    }

    logger.info('Batch routing completed', { 
      total: leadIds.length, 
      successful: results.filter(r => r.success).length,
    });

    res.json({
      results,
      summary: {
        total: leadIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  } catch (error) {
    logger.error('Error in batch routing', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/reassign-stale
 * Reassign leads that have been pending too long
 */
router.post('/reassign-stale', async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeoutMs = 900000 } = req.body; // Default 15 minutes

    const staleAssignments = Array.from(store.assignments.values())
      .filter(a => {
        if (a.status !== 'pending') return false;
        const timeSinceAssignment = Date.now() - a.assignedAt.getTime();
        return timeSinceAssignment > timeoutMs;
      });

    const results = [];

    for (const assignment of staleAssignments) {
      const lead = store.leads.get(assignment.leadId);
      if (!lead) continue;

      // Find a new agent
      const matchingAgents = findMatchingAgents(lead)
        .filter(a => a.id !== assignment.agentId); // Exclude previous agent

      if (matchingAgents.length === 0) {
        results.push({
          leadId: assignment.leadId,
          success: false,
          error: 'No alternative agents found',
        });
        continue;
      }

      const newAgent = matchingAgents[0];

      // Update assignment
      assignment.status = 'timeout';
      store.assignments.set(assignment.id, assignment);

      // Create new assignment
      const newAssignmentId = generateId();
      const newAssignment = {
        id: newAssignmentId,
        leadId: assignment.leadId,
        agentId: newAgent.id,
        assignedAt: new Date(),
        status: 'pending' as const,
      };

      store.assignments.set(newAssignmentId, newAssignment);

      // Update agent counts
      const oldAgent = store.agents.get(assignment.agentId);
      if (oldAgent) {
        oldAgent.currentLeadCount = Math.max(0, oldAgent.currentLeadCount - 1);
        store.agents.set(oldAgent.id, oldAgent);
      }

      newAgent.currentLeadCount += 1;
      store.agents.set(newAgent.id, newAgent);

      results.push({
        leadId: assignment.leadId,
        success: true,
        oldAgentId: assignment.agentId,
        newAgentId: newAgent.id,
      });
    }

    logger.info('Stale lead reassignments completed', {
      total: staleAssignments.length,
      reassigned: results.filter(r => r.success).length,
    });

    res.json({
      results,
      summary: {
        checked: staleAssignments.length,
        reassigned: results.filter(r => r.success).length,
      },
    });
  } catch (error) {
    logger.error('Error reassigning stale leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/routing/webhook
 * Webhook endpoint for routing system integration
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, data } = req.body;

    logger.info('Routing webhook received', { event, data });

    switch (event) {
      case 'lead.qualified':
        // Automatically route qualified leads
        const leadId = data.leadId || data.id;
        if (leadId) {
          const lead = store.leads.get(leadId);
          if (lead) {
            const matchingAgents = findMatchingAgents(lead);
            if (matchingAgents.length > 0) {
              const agent = matchingAgents[0];
              const assignmentId = generateId();
              store.assignments.set(assignmentId, {
                id: assignmentId,
                leadId,
                agentId: agent.id,
                assignedAt: new Date(),
                status: 'pending' as const,
              });

              lead.status = 'routed';
              store.leads.set(leadId, lead);

              agent.currentLeadCount += 1;
              store.agents.set(agent.id, agent);
            }
          }
        }
        break;

      case 'agent.accepted':
        // Agent accepted a lead assignment
        const { assignmentId } = data;
        const assignment = store.assignments.get(assignmentId);
        if (assignment) {
          assignment.status = 'accepted';
          assignment.acceptedAt = new Date();
          store.assignments.set(assignmentId, assignment);
        }
        break;

      case 'agent.rejected':
        // Agent rejected a lead assignment
        const rejectData = data;
        const rejectAssignment = store.assignments.get(rejectData.assignmentId);
        if (rejectAssignment) {
          rejectAssignment.status = 'rejected';
          rejectAssignment.notes = rejectData.reason;
          store.assignments.set(rejectData.assignmentId, rejectAssignment);

          // Try to reassign to next best agent
          const lead = store.leads.get(rejectAssignment.leadId);
          if (lead) {
            const matchingAgents = findMatchingAgents(lead)
              .filter(a => a.id !== rejectAssignment.agentId);
            
            if (matchingAgents.length > 0) {
              const newAgent = matchingAgents[0];
              const newAssignmentId = generateId();
              store.assignments.set(newAssignmentId, {
                id: newAssignmentId,
                leadId: rejectAssignment.leadId,
                agentId: newAgent.id,
                assignedAt: new Date(),
                status: 'pending' as const,
              });

              newAgent.currentLeadCount += 1;
              store.agents.set(newAgent.id, newAgent);
            }
          }
        }
        break;

      default:
        logger.warn('Unknown webhook event', { event });
    }

    res.json({ received: true, event });
  } catch (error) {
    logger.error('Error processing webhook', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to find matching agents for a lead
 */
function findMatchingAgents(lead: { 
  insuranceType?: string; 
  address?: { state?: string; city?: string };
  qualityScore?: number;
}): Array<{
  id: string;
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
  scoredAgents.sort((a, b) => b.confidence - a.confidence);

  // Apply configuration limits
  return scoredAgents.slice(0, routingConfig.maxAgentsPerLead);
}

export default router;
