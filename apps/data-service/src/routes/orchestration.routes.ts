import { Router } from 'express';
import prisma from '../db/prisma.js';
import {
  CampaignOrchestrationService,
  MultiChannelMessagingService,
  LeadStateService,
  AttributionService,
} from '@insurance-lead-gen/core';

const router = Router();
const messagingService = new MultiChannelMessagingService(prisma);
const leadStateService = new LeadStateService(prisma);
const campaignOrchestrationService = new CampaignOrchestrationService(prisma, messagingService, leadStateService);
const attributionService = new AttributionService(prisma);

router.post('/campaigns', async (req, res) => {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        status: 'ACTIVE',
        steps: {
          create: req.body.steps,
        },
      },
      include: { steps: true },
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/campaigns/:id/enroll-lead', async (req, res) => {
  try {
    await campaignOrchestrationService.enrollLead(req.body.leadId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leads/:id/state', async (req, res) => {
  try {
    const state = await leadStateService.getLeadState(req.params.id);
    res.json({ success: true, data: state });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leads/:id/journey', async (req, res) => {
  try {
    const events = await prisma.orchestrationEvent.findMany({
      where: { leadId: req.params.id },
      orderBy: { timestamp: 'asc' },
    });
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/attribution/results', async (req, res) => {
  try {
    const leadId = req.query.leadId as string;
    const results = await attributionService.calculateAttribution(leadId);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const totalCampaigns = await prisma.campaign.count();
    const totalEnrollments = await prisma.campaignLead.count();
    const activeEnrollments = await prisma.campaignLead.count({ where: { status: 'ACTIVE' } });
    
    const eventsByType = await prisma.orchestrationEvent.groupBy({
      by: ['type'],
      _count: {
        type: true
      },
    });

    res.json({
      success: true,
      data: {
        totalCampaigns,
        totalEnrollments,
        activeEnrollments,
        eventsByType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as orchestrationRouter };
