/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { CampaignService } from '../services/campaign-service.js';
import { prisma } from '../prisma/client.js';
import { logger } from '@insurance-lead-gen/core';
import type {
  CreateRetentionCampaignDto,
  CampaignStatus,
  TouchpointStatus,
} from '@insurance-lead-gen/types';

export function createCampaignsRoutes(): Router {
  const router = Router();
  const campaignService = new CampaignService(prisma);

  // ========================================
  // CAMPAIGN ENDPOINTS
  // ========================================

  // Create campaign
  router.post('/campaigns', async (req, res) => {
    try {
      const dto: CreateRetentionCampaignDto = req.body;
      const createdBy = (req.headers['x-user-id'] as string) || 'system';

      const campaign = await campaignService.createCampaign(dto, createdBy);

      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      logger.error('Error creating campaign', { error });
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
    }
  });

  // Get campaign by ID
  router.get('/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const campaign = await campaignService.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      logger.error('Error fetching campaign', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
    }
  });

  // List campaigns
  router.get('/campaigns', async (req, res) => {
    try {
      const { status, type, createdBy } = req.query;

      const campaigns = await campaignService.listCampaigns({
        status: status as CampaignStatus,
        type: type as string,
        createdBy: createdBy as string,
      });

      res.json({ success: true, data: campaigns });
    } catch (error) {
      logger.error('Error listing campaigns', { error });
      res.status(500).json({ success: false, error: 'Failed to list campaigns' });
    }
  });

  // Update campaign status
  router.patch('/campaigns/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const campaign = await campaignService.updateCampaignStatus(id, status);

      res.json({ success: true, data: campaign });
    } catch (error) {
      logger.error('Error updating campaign status', { error });
      res.status(500).json({ success: false, error: 'Failed to update campaign status' });
    }
  });

  // Activate campaign (create touchpoints)
  router.post('/campaigns/:id/activate', async (req, res) => {
    try {
      const { id } = req.params;

      // Update status to active
      const campaign = await campaignService.updateCampaignStatus(id, 'active');

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign activated successfully',
      });
    } catch (error) {
      logger.error('Error activating campaign', { error });
      res.status(500).json({ success: false, error: 'Failed to activate campaign' });
    }
  });

  // Pause campaign
  router.post('/campaigns/:id/pause', async (req, res) => {
    try {
      const { id } = req.params;

      const campaign = await campaignService.updateCampaignStatus(id, 'paused');

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign paused successfully',
      });
    } catch (error) {
      logger.error('Error pausing campaign', { error });
      res.status(500).json({ success: false, error: 'Failed to pause campaign' });
    }
  });

  // Get campaign performance
  router.get('/campaigns/:id/performance', async (req, res) => {
    try {
      const { id } = req.params;

      const campaign = await campaignService.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      // Get detailed touchpoint stats
      const touchpoints = await prisma.campaignTouchpoint.findMany({
        where: { campaignId: id },
      });

      const stats = {
        total: touchpoints.length,
        byStatus: {
          pending: touchpoints.filter((t) => t.status === 'PENDING').length,
          sent: touchpoints.filter((t) => t.status === 'SENT').length,
          delivered: touchpoints.filter((t) => t.status === 'DELIVERED').length,
          opened: touchpoints.filter((t) => t.status === 'OPENED').length,
          clicked: touchpoints.filter((t) => t.status === 'CLICKED').length,
          responded: touchpoints.filter((t) => t.status === 'RESPONDED').length,
          failed: touchpoints.filter((t) => t.status === 'FAILED').length,
        },
        rates: {
          deliveryRate:
            touchpoints.length > 0
              ? (touchpoints.filter((t) =>
                  ['DELIVERED', 'OPENED', 'CLICKED', 'RESPONDED'].includes(t.status)
                ).length /
                  touchpoints.length) *
                100
              : 0,
          openRate:
            touchpoints.filter((t) => ['SENT', 'DELIVERED'].includes(t.status)).length > 0
              ? (touchpoints.filter((t) => ['OPENED', 'CLICKED', 'RESPONDED'].includes(t.status))
                  .length /
                  touchpoints.filter((t) =>
                    ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'RESPONDED'].includes(t.status)
                  ).length) *
                100
              : 0,
          clickRate:
            touchpoints.filter((t) => t.status === 'OPENED').length > 0
              ? (touchpoints.filter((t) => ['CLICKED', 'RESPONDED'].includes(t.status)).length /
                  touchpoints.filter((t) => ['OPENED', 'CLICKED', 'RESPONDED'].includes(t.status))
                    .length) *
                100
              : 0,
          responseRate:
            touchpoints.length > 0
              ? (touchpoints.filter((t) => t.status === 'RESPONDED').length / touchpoints.length) *
                100
              : 0,
        },
      };

      res.json({
        success: true,
        data: {
          campaign: campaign.performance,
          touchpoints: stats,
        },
      });
    } catch (error) {
      logger.error('Error fetching campaign performance', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch performance' });
    }
  });

  // ========================================
  // TOUCHPOINT ENDPOINTS
  // ========================================

  // Get campaign touchpoints
  router.get('/campaigns/:id/touchpoints', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, limit = '100' } = req.query;

      const whereClause: any = { campaignId: id };
      if (status) {
        whereClause.status = (status as string).toUpperCase();
      }

      const touchpoints = await prisma.campaignTouchpoint.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledFor: 'asc' },
        take: Number(limit),
      });

      res.json({ success: true, data: touchpoints });
    } catch (error) {
      logger.error('Error fetching campaign touchpoints', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch touchpoints' });
    }
  });

  // Get pending touchpoints (for processing)
  router.get('/touchpoints/pending', async (req, res) => {
    try {
      const { limit = '100' } = req.query;

      const touchpoints = await campaignService.getPendingTouchpoints(Number(limit));

      res.json({ success: true, data: touchpoints });
    } catch (error) {
      logger.error('Error fetching pending touchpoints', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch pending touchpoints' });
    }
  });

  // Update touchpoint status
  router.patch('/touchpoints/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, metadata } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const touchpoint = await campaignService.updateTouchpointStatus(
        id,
        status as TouchpointStatus,
        metadata
      );

      res.json({ success: true, data: touchpoint });
    } catch (error) {
      logger.error('Error updating touchpoint status', { error });
      res.status(500).json({ success: false, error: 'Failed to update touchpoint status' });
    }
  });

  // Record touchpoint response
  router.post('/touchpoints/:id/response', async (req, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;

      const touchpoint = await prisma.campaignTouchpoint.update({
        where: { id },
        data: {
          status: 'RESPONDED',
          respondedAt: new Date(),
          response,
        },
      });

      // Update campaign metrics
      await campaignService.updateCampaignMetrics(touchpoint.campaignId);

      res.json({ success: true, data: touchpoint });
    } catch (error) {
      logger.error('Error recording touchpoint response', { error });
      res.status(500).json({ success: false, error: 'Failed to record response' });
    }
  });

  // Get customer touchpoints
  router.get('/customers/:customerId/touchpoints', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { limit = '50' } = req.query;

      const touchpoints = await prisma.campaignTouchpoint.findMany({
        where: { customerId },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      res.json({ success: true, data: touchpoints });
    } catch (error) {
      logger.error('Error fetching customer touchpoints', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch touchpoints' });
    }
  });

  // ========================================
  // RETENTION EVENTS
  // ========================================

  // Get customer retention events
  router.get('/customers/:customerId/events', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { limit = '50', eventType } = req.query;

      const whereClause: any = { customerId };
      if (eventType) {
        whereClause.eventType = eventType;
      }

      const events = await prisma.retentionEvent.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: Number(limit),
      });

      res.json({ success: true, data: events });
    } catch (error) {
      logger.error('Error fetching retention events', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
  });

  // Create retention event
  router.post('/events', async (req, res) => {
    try {
      const { customerId, policyId, eventType, severity, data, triggeredActions } = req.body;

      const event = await prisma.retentionEvent.create({
        data: {
          customerId,
          policyId,
          eventType,
          severity: severity || 'info',
          data: data || {},
          triggeredActions: triggeredActions || [],
        },
      });

      res.status(201).json({ success: true, data: event });
    } catch (error) {
      logger.error('Error creating retention event', { error });
      res.status(500).json({ success: false, error: 'Failed to create event' });
    }
  });

  return router;
}
