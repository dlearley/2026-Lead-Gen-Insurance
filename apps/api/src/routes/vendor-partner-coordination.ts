/**
 * Vendor & Partner Integration Coordination Routes
 *
 * API endpoints for managing vendor-partner relationships,
 * integration workflows, dependencies, shared resources, and cross-integration events.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { VendorPartnerCoordinationService } from '@insurance-lead-gen/core';
import type {
  CreateVendorPartnerRelationshipRequest,
  UpdateVendorPartnerRelationshipRequest,
  GetVendorPartnerRelationshipsFilter,
  CreateWorkflowRequest,
  ExecuteWorkflowStepRequest,
  GetWorkflowsFilter,
  CreateIntegrationDependencyRequest,
  CreateSharedResourceRequest,
  GrantResourceAccessRequest,
  GetSharedResourcesFilter,
  PublishCrossIntegrationEventRequest,
} from '@insurance-lead-gen/types';

const router = Router();
const prisma = new PrismaClient();
const coordinationService = new VendorPartnerCoordinationService(prisma);

// ============================================================================
// Vendor-Partner Relationship Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/relationships
 * Get vendor-partner relationships with filters
 */
router.get('/relationships', async (req, res, next) => {
  try {
    const filters: GetVendorPartnerRelationshipsFilter = {
      vendorId: req.query.vendorId as string,
      partnerId: req.query.partnerId as string,
      relationshipType: req.query.relationshipType as any,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await coordinationService.getRelationships(filters);

    res.json({
      success: true,
      data: result.relationships,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/vendor-partner-coordination/relationships/:id
 * Get relationship by ID
 */
router.get('/relationships/:id', async (req, res, next) => {
  try {
    const relationship = await coordinationService.getRelationshipById(req.params.id);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Relationship not found' },
      });
    }

    res.json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/relationships
 * Create new vendor-partner relationship
 */
router.post('/relationships', async (req, res, next) => {
  try {
    const data: CreateVendorPartnerRelationshipRequest = req.body;
    const relationship = await coordinationService.createRelationship(data);

    res.status(201).json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/vendor-partner-coordination/relationships/:id
 * Update relationship
 */
router.put('/relationships/:id', async (req, res, next) => {
  try {
    const data: UpdateVendorPartnerRelationshipRequest = req.body;
    const relationship = await coordinationService.updateRelationship(
      req.params.id,
      data
    );

    res.json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/relationships/:id/activate
 * Activate relationship
 */
router.post('/relationships/:id/activate', async (req, res, next) => {
  try {
    const relationship = await coordinationService.activateRelationship(req.params.id);

    res.json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/relationships/:id/suspend
 * Suspend relationship
 */
router.post('/relationships/:id/suspend', async (req, res, next) => {
  try {
    const relationship = await coordinationService.suspendRelationship(req.params.id);

    res.json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/relationships/:id/terminate
 * Terminate relationship
 */
router.post('/relationships/:id/terminate', async (req, res, next) => {
  try {
    const relationship = await coordinationService.terminateRelationship(
      req.params.id
    );

    res.json({ success: true, data: relationship });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Workflow Management Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/workflows
 * Get workflows with filters
 */
router.get('/workflows', async (req, res, next) => {
  try {
    const filters: GetWorkflowsFilter = {
      workflowType: req.query.workflowType as any,
      vendorId: req.query.vendorId as string,
      partnerId: req.query.partnerId as string,
      integrationId: req.query.integrationId as string,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await coordinationService.getWorkflows(filters);

    res.json({
      success: true,
      data: result.workflows,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/vendor-partner-coordination/workflows/:id
 * Get workflow by ID
 */
router.get('/workflows/:id', async (req, res, next) => {
  try {
    const workflow = await coordinationService.getWorkflowById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workflow not found' },
      });
    }

    res.json({ success: true, data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/workflows
 * Create new workflow
 */
router.post('/workflows', async (req, res, next) => {
  try {
    const data: CreateWorkflowRequest = req.body;
    const workflow = await coordinationService.createWorkflow(data);

    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/workflows/:id/start
 * Start workflow execution
 */
router.post('/workflows/:id/start', async (req, res, next) => {
  try {
    const workflow = await coordinationService.startWorkflow(req.params.id);

    res.json({ success: true, data: workflow });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/workflows/:workflowId/steps/:stepId/execute
 * Execute workflow step
 */
router.post(
  '/workflows/:workflowId/steps/:stepId/execute',
  async (req, res, next) => {
    try {
      const data: ExecuteWorkflowStepRequest = req.body;
      const step = await coordinationService.executeWorkflowStep(
        req.params.workflowId,
        req.params.stepId,
        data
      );

      res.json({ success: true, data: step });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/vendor-partner-coordination/workflows/:workflowId/steps/:stepId/complete
 * Complete workflow step
 */
router.post(
  '/workflows/:workflowId/steps/:stepId/complete',
  async (req, res, next) => {
    try {
      const { success, errorMessage } = req.body;
      const step = await coordinationService.completeWorkflowStep(
        req.params.workflowId,
        req.params.stepId,
        success,
        errorMessage
      );

      res.json({ success: true, data: step });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/vendor-partner-coordination/workflows/:workflowId/steps/:stepId/retry
 * Retry failed workflow step
 */
router.post(
  '/workflows/:workflowId/steps/:stepId/retry',
  async (req, res, next) => {
    try {
      const step = await coordinationService.retryWorkflowStep(
        req.params.workflowId,
        req.params.stepId
      );

      res.json({ success: true, data: step });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Integration Dependency Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/integrations/:integrationId/dependencies
 * Get dependencies for an integration
 */
router.get(
  '/integrations/:integrationId/dependencies',
  async (req, res, next) => {
    try {
      const dependencies =
        await coordinationService.getIntegrationDependencies(req.params.integrationId);

      res.json({ success: true, data: dependencies });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/vendor-partner-coordination/integrations/:integrationId/dependents
 * Get integrations that depend on this integration
 */
router.get(
  '/integrations/:integrationId/dependents',
  async (req, res, next) => {
    try {
      const dependents =
        await coordinationService.getDependentIntegrations(req.params.integrationId);

      res.json({ success: true, data: dependents });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/vendor-partner-coordination/integrations/:integrationId/analyze
 * Analyze integration dependencies
 */
router.get(
  '/integrations/:integrationId/analyze',
  async (req, res, next) => {
    try {
      const analysis = await coordinationService.analyzeDependencies(
        req.params.integrationId
      );

      res.json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/vendor-partner-coordination/dependencies
 * Create integration dependency
 */
router.post('/dependencies', async (req, res, next) => {
  try {
    const data: CreateIntegrationDependencyRequest = req.body;
    const dependency = await coordinationService.createDependency(data);

    res.status(201).json({ success: true, data: dependency });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/vendor-partner-coordination/dependencies/:id
 * Delete dependency
 */
router.delete('/dependencies/:id', async (req, res, next) => {
  try {
    await coordinationService.deleteDependency(req.params.id);

    res.json({
      success: true,
      message: 'Dependency deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Shared Resource Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/resources
 * Get shared resources with filters
 */
router.get('/resources', async (req, res, next) => {
  try {
    const filters: GetSharedResourcesFilter = {
      resourceType: req.query.resourceType as any,
      ownerId: req.query.ownerId as string,
      ownerType: req.query.ownerType as any,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await coordinationService.getSharedResources(filters);

    res.json({
      success: true,
      data: result.resources,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/vendor-partner-coordination/resources/:id
 * Get resource by ID
 */
router.get('/resources/:id', async (req, res, next) => {
  try {
    const resource = await coordinationService.getSharedResourceById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/resources
 * Create shared resource
 */
router.post('/resources', async (req, res, next) => {
  try {
    const { ownerId, ownerType, ...resourceData }: CreateSharedResourceRequest &
      { ownerId: string; ownerType: 'vendor' | 'partner' } = req.body;

    const resource = await coordinationService.createSharedResource(
      ownerId,
      ownerType,
      resourceData
    );

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/resources/:resourceId/grants
 * Grant resource access
 */
router.post('/resources/:resourceId/grants', async (req, res, next) => {
  try {
    const { resourceOwnerId, ...grantData }: GrantResourceAccessRequest & {
      resourceOwnerId: string;
    } = req.body;

    const grant = await coordinationService.grantResourceAccess(
      resourceOwnerId,
      grantData
    );

    res.status(201).json({ success: true, data: grant });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/vendor-partner-coordination/grants/:grantId
 * Revoke resource access
 */
router.delete('/grants/:grantId', async (req, res, next) => {
  try {
    const grant = await coordinationService.revokeResourceAccess(req.params.grantId);

    res.json({ success: true, data: grant });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/resources/:resourceId/deactivate
 * Deactivate shared resource
 */
router.post('/resources/:resourceId/deactivate', async (req, res, next) => {
  try {
    const resource = await coordinationService.deactivateSharedResource(
      req.params.resourceId
    );

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Cross-Integration Event Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/events
 * Get cross-integration events with filters
 */
router.get('/events', async (req, res, next) => {
  try {
    const filters = {
      sourceIntegrationId: req.query.sourceIntegrationId as string,
      targetIntegrationId: req.query.targetIntegrationId as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await coordinationService.getCrossIntegrationEvents(filters);

    res.json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/vendor-partner-coordination/events/:id
 * Get event by ID
 */
router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await coordinationService.getCrossIntegrationEventById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/events
 * Publish cross-integration event
 */
router.post('/events', async (req, res, next) => {
  try {
    const data: PublishCrossIntegrationEventRequest = req.body;
    const event = await coordinationService.publishCrossIntegrationEvent(data);

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/vendor-partner-coordination/events/:id/republish
 * Republish failed event
 */
router.post('/events/:id/republish', async (req, res, next) => {
  try {
    const event = await coordinationService.republishEvent(req.params.id);

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Health & Metrics Endpoints
// ============================================================================

/**
 * GET /api/v1/vendor-partner-coordination/health
 * Get coordination health status
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = await coordinationService.getCoordinationHealthStatus();

    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/vendor-partner-coordination/metrics
 * Get coordination metrics
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const metrics = await coordinationService.getCoordinationMetrics(
      startDate,
      endDate
    );

    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

export default router;
