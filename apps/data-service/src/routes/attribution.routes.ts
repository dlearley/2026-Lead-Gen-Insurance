// Attribution Routes - Marketing ROI Tracking API

import express from 'express';
import { AttributionService } from '../services/attribution.service';
import { 
  CreateMarketingSourceDto, 
  UpdateMarketingSourceDto, 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  CreateAttributionDto, 
  UpdateAttributionDto 
} from '@insurance-lead-gen/types';
import { z } from 'zod';
import { validateRequest } from '../validation';

const router = express.Router();
const attributionService = new AttributionService();

// ========================================
// MARKETING SOURCE ROUTES
// ========================================

/**
 * @route POST /api/v1/attribution/sources
 * @description Create a new marketing source
 * @access Private
 */
router.post('/sources', validateRequest(CreateMarketingSourceDto), async (req, res) => {
  try {
    const source = await attributionService.createMarketingSource(req.body);
    res.status(201).json({ success: true, data: source });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/sources/:id
 * @description Get a marketing source by ID
 * @access Private
 */
router.get('/sources/:id', async (req, res) => {
  try {
    const source = await attributionService.getMarketingSource(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }
    res.json({ success: true, data: source });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/v1/attribution/sources/:id
 * @description Update a marketing source
 * @access Private
 */
router.put('/sources/:id', validateRequest(UpdateMarketingSourceDto), async (req, res) => {
  try {
    const source = await attributionService.updateMarketingSource(req.params.id, req.body);
    res.json({ success: true, data: source });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/sources
 * @description List all marketing sources
 * @access Private
 */
router.get('/sources', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const search = req.query.search as string;
    
    const result = await attributionService.listMarketingSources(page, limit, {
      type,
      isActive,
      search,
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/v1/attribution/sources/:id
 * @description Delete a marketing source
 * @access Private
 */
router.delete('/sources/:id', async (req, res) => {
  try {
    await attributionService.deleteMarketingSource(req.params.id);
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========================================
// CAMPAIGN ROUTES
// ========================================

/**
 * @route POST /api/v1/attribution/campaigns
 * @description Create a new campaign
 * @access Private
 */
router.post('/campaigns', validateRequest(CreateCampaignDto), async (req, res) => {
  try {
    const campaign = await attributionService.createCampaign(req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/campaigns/:id
 * @description Get a campaign by ID
 * @access Private
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await attributionService.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/v1/attribution/campaigns/:id
 * @description Update a campaign
 * @access Private
 */
router.put('/campaigns/:id', validateRequest(UpdateCampaignDto), async (req, res) => {
  try {
    const campaign = await attributionService.updateCampaign(req.params.id, req.body);
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/campaigns
 * @description List all campaigns
 * @access Private
 */
router.get('/campaigns', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const sourceId = req.query.sourceId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const result = await attributionService.listCampaigns(page, limit, {
      sourceId,
      status,
      search,
      startDate,
      endDate,
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/v1/attribution/campaigns/:id
 * @description Delete a campaign
 * @access Private
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    await attributionService.deleteCampaign(req.params.id);
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/campaigns/:id/metrics
 * @description Get campaign metrics
 * @access Private
 */
router.get('/campaigns/:id/metrics', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const metrics = await attributionService.getCampaignMetrics(req.params.id, {
      startDate,
      endDate,
    });
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/campaigns/:id/roi
 * @description Calculate ROI for a campaign
 * @access Private
 */
router.get('/campaigns/:id/roi', async (req, res) => {
  try {
    const roiData = await attributionService.calculateRoi(req.params.id);
    res.json({ success: true, data: roiData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========================================
// ATTRIBUTION ROUTES
// ========================================

/**
 * @route POST /api/v1/attribution/attributions
 * @description Create a new attribution record
 * @access Private
 */
router.post('/attributions', validateRequest(CreateAttributionDto), async (req, res) => {
  try {
    const attribution = await attributionService.createAttribution(req.body);
    res.status(201).json({ success: true, data: attribution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/attributions/:id
 * @description Get an attribution record by ID
 * @access Private
 */
router.get('/attributions/:id', async (req, res) => {
  try {
    const attribution = await attributionService.getAttribution(req.params.id);
    if (!attribution) {
      return res.status(404).json({ success: false, error: 'Attribution not found' });
    }
    res.json({ success: true, data: attribution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/v1/attribution/attributions/:id
 * @description Update an attribution record
 * @access Private
 */
router.put('/attributions/:id', validateRequest(UpdateAttributionDto), async (req, res) => {
  try {
    const attribution = await attributionService.updateAttribution(req.params.id, req.body);
    res.json({ success: true, data: attribution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/attributions
 * @description List all attribution records
 * @access Private
 */
router.get('/attributions', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const leadId = req.query.leadId as string;
    const sourceId = req.query.sourceId as string;
    const campaignId = req.query.campaignId as string;
    const attributionType = req.query.attributionType as string;
    const search = req.query.search as string;
    
    const result = await attributionService.listAttributions(page, limit, {
      leadId,
      sourceId,
      campaignId,
      attributionType,
      search,
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/v1/attribution/attributions/:id
 * @description Delete an attribution record
 * @access Private
 */
router.delete('/attributions/:id', async (req, res) => {
  try {
    await attributionService.deleteAttribution(req.params.id);
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========================================
// ANALYTICS & REPORTING ROUTES
// ========================================

/**
 * @route GET /api/v1/attribution/analytics
 * @description Get attribution analytics
 * @access Private
 */
router.get('/analytics', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const analytics = await attributionService.getAttributionAnalytics({
      startDate,
      endDate,
    });
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/v1/attribution/reports
 * @description Generate an attribution report
 * @access Private
 */
router.post('/reports', async (req, res) => {
  try {
    const { reportName, startDate, endDate } = req.body;
    
    if (!reportName || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'reportName, startDate, and endDate are required' 
      });
    }
    
    const report = await attributionService.generateAttributionReport(reportName, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attribution/sources/:id/metrics
 * @description Get source metrics
 * @access Private
 */
router.get('/sources/:id/metrics', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const metrics = await attributionService.getSourceMetrics(req.params.id, {
      startDate,
      endDate,
    });
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;