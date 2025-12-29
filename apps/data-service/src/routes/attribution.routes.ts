import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AttributionService } from '../services/attribution.service.js';
import {
  CreateTouchpointDto,
  UpdateTouchpointDto,
  CreateConversionDto,
  UpdateConversionDto,
  CalculateAttributionDto,
  AttributionReportParams,
  BatchAttributionDto,
  CreateAttributionDisputeDto,
  ResolveAttributionDisputeDto,
  TouchpointFilterParams,
  AttributionFilterParams,
  ConversionFilterParams,
} from '@insurance/shared-types';

export function createAttributionRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const attributionService = new AttributionService(prisma);

  // ========================================
  // TOUCHPOINT ROUTES
  // ========================================

  router.post('/touchpoints', async (req: Request, res: Response) => {
    try {
      const dto: CreateTouchpointDto = req.body;
      const touchpoint = await attributionService.createTouchpoint(dto);
      res.status(201).json({ success: true, data: touchpoint });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create touchpoint';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINT_CREATE_FAILED', message } });
    }
  });

  router.get('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      const touchpoint = await attributionService.getTouchpointById(req.params.id);
      if (!touchpoint) {
        return res.status(404).json({ success: false, error: { code: 'TOUCHPOINT_NOT_FOUND', message: 'Touchpoint not found' } });
      }
      res.json({ success: true, data: touchpoint });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get touchpoint';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINT_GET_FAILED', message } });
    }
  });

  router.get('/touchpoints', async (req: Request, res: Response) => {
    try {
      const filter: TouchpointFilterParams = {
        leadId: req.query.leadId as string,
        sessionId: req.query.sessionId as string,
        channel: req.query.channel as any,
        source: req.query.source as string,
        campaign: req.query.campaign as string,
        partnerId: req.query.partnerId as string,
        brokerId: req.query.brokerId as string,
        converted: req.query.converted === 'true' ? true : req.query.converted === 'false' ? false : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await attributionService.getTouchpoints(filter);
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get touchpoints';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINTS_GET_FAILED', message } });
    }
  });

  router.put('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateTouchpointDto = req.body;
      const touchpoint = await attributionService.updateTouchpoint(req.params.id, dto);
      if (!touchpoint) {
        return res.status(404).json({ success: false, error: { code: 'TOUCHPOINT_NOT_FOUND', message: 'Touchpoint not found' } });
      }
      res.json({ success: true, data: touchpoint });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update touchpoint';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINT_UPDATE_FAILED', message } });
    }
  });

  router.delete('/touchpoints/:id', async (req: Request, res: Response) => {
    try {
      const success = await attributionService.deleteTouchpoint(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: { code: 'TOUCHPOINT_NOT_FOUND', message: 'Touchpoint not found' } });
      }
      res.json({ success: true, message: 'Touchpoint deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete touchpoint';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINT_DELETE_FAILED', message } });
    }
  });

  router.get('/leads/:leadId/touchpoints', async (req: Request, res: Response) => {
    try {
      const touchpoints = await attributionService.getTouchpointsByLead(req.params.leadId);
      res.json({ success: true, data: touchpoints });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get lead touchpoints';
      res.status(400).json({ success: false, error: { code: 'TOUCHPOINTS_GET_FAILED', message } });
    }
  });

  // ========================================
  // CONVERSION ROUTES
  // ========================================

  router.post('/conversions', async (req: Request, res: Response) => {
    try {
      const dto: CreateConversionDto = req.body;
      const conversion = await attributionService.createConversion(dto);
      res.status(201).json({ success: true, data: conversion });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create conversion';
      res.status(400).json({ success: false, error: { code: 'CONVERSION_CREATE_FAILED', message } });
    }
  });

  router.get('/conversions/:id', async (req: Request, res: Response) => {
    try {
      const conversion = await attributionService.getConversionById(req.params.id);
      if (!conversion) {
        return res.status(404).json({ success: false, error: { code: 'CONVERSION_NOT_FOUND', message: 'Conversion not found' } });
      }
      res.json({ success: true, data: conversion });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversion';
      res.status(400).json({ success: false, error: { code: 'CONVERSION_GET_FAILED', message } });
    }
  });

  router.get('/conversions', async (req: Request, res: Response) => {
    try {
      const filter: ConversionFilterParams = {
        leadId: req.query.leadId as string,
        type: req.query.type as any,
        policyId: req.query.policyId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await attributionService.getConversions(filter);
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversions';
      res.status(400).json({ success: false, error: { code: 'CONVERSIONS_GET_FAILED', message } });
    }
  });

  router.put('/conversions/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateConversionDto = req.body;
      const conversion = await attributionService.updateConversion(req.params.id, dto);
      if (!conversion) {
        return res.status(404).json({ success: false, error: { code: 'CONVERSION_NOT_FOUND', message: 'Conversion not found' } });
      }
      res.json({ success: true, data: conversion });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update conversion';
      res.status(400).json({ success: false, error: { code: 'CONVERSION_UPDATE_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION CALCULATION ROUTES
  // ========================================

  router.post('/attribution/calculate', async (req: Request, res: Response) => {
    try {
      const dto: CalculateAttributionDto = req.body;
      const calculation = await attributionService.calculateAttribution(dto);
      res.json({ success: true, data: calculation });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate attribution';
      res.status(400).json({ success: false, error: { code: 'ATTRIBUTION_CALCULATION_FAILED', message } });
    }
  });

  router.post('/attribution/calculate-and-save', async (req: Request, res: Response) => {
    try {
      const dto: CalculateAttributionDto = req.body;
      const records = await attributionService.calculateAndSaveAttribution(dto);
      res.status(201).json({ success: true, data: records });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate and save attribution';
      res.status(400).json({ success: false, error: { code: 'ATTRIBUTION_SAVE_FAILED', message } });
    }
  });

  router.post('/attribution/batch', async (req: Request, res: Response) => {
    try {
      const dto: BatchAttributionDto = req.body;
      const result = await attributionService.processBatchAttribution(dto);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process batch attribution';
      res.status(400).json({ success: false, error: { code: 'BATCH_ATTRIBUTION_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION RECORD ROUTES
  // ========================================

  router.get('/attributions/:id', async (req: Request, res: Response) => {
    try {
      const attribution = await attributionService.getAttributionById(req.params.id);
      if (!attribution) {
        return res.status(404).json({ success: false, error: { code: 'ATTRIBUTION_NOT_FOUND', message: 'Attribution not found' } });
      }
      res.json({ success: true, data: attribution });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attribution';
      res.status(400).json({ success: false, error: { code: 'ATTRIBUTION_GET_FAILED', message } });
    }
  });

  router.get('/attributions', async (req: Request, res: Response) => {
    try {
      const filter: AttributionFilterParams = {
        leadId: req.query.leadId as string,
        conversionId: req.query.conversionId as string,
        channel: req.query.channel as any,
        model: req.query.model as any,
        partnerId: req.query.partnerId as string,
        brokerId: req.query.brokerId as string,
        campaignId: req.query.campaignId as string,
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await attributionService.getAttributions(filter);
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attributions';
      res.status(400).json({ success: false, error: { code: 'ATTRIBUTIONS_GET_FAILED', message } });
    }
  });

  router.put('/attributions/:id', async (req: Request, res: Response) => {
    try {
      const { revenueAttributed, commissionAmount, status, metadata } = req.body;
      const attribution = await attributionService.updateAttribution(req.params.id, {
        revenueAttributed,
        commissionAmount,
        status,
        metadata,
      });
      if (!attribution) {
        return res.status(404).json({ success: false, error: { code: 'ATTRIBUTION_NOT_FOUND', message: 'Attribution not found' } });
      }
      res.json({ success: true, data: attribution });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update attribution';
      res.status(400).json({ success: false, error: { code: 'ATTRIBUTION_UPDATE_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION REPORTING ROUTES
  // ========================================

  router.get('/reports/attribution', async (req: Request, res: Response) => {
    try {
      const params: AttributionReportParams = {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        model: req.query.model as any,
        channel: req.query.channel as any,
        partnerId: req.query.partnerId as string,
        brokerId: req.query.brokerId as string,
        campaignId: req.query.campaignId as string,
      };

      const report = await attributionService.generateAttributionReport(params);
      res.json({ success: true, data: report });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate attribution report';
      res.status(400).json({ success: false, error: { code: 'REPORT_GENERATION_FAILED', message } });
    }
  });

  router.get('/analytics/attribution', async (req: Request, res: Response) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const analytics = await attributionService.getAttributionAnalytics(startDate, endDate);
      res.json({ success: true, data: analytics });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get attribution analytics';
      res.status(400).json({ success: false, error: { code: 'ANALYTICS_GET_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION MODEL CONFIG ROUTES
  // ========================================

  router.get('/attribution/models/:model/config', async (req: Request, res: Response) => {
    try {
      const config = await attributionService.getAttributionModelConfig(req.params.model as any);
      res.json({ success: true, data: config });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get model config';
      res.status(400).json({ success: false, error: { code: 'MODEL_CONFIG_GET_FAILED', message } });
    }
  });

  router.post('/attribution/models/config', async (req: Request, res: Response) => {
    try {
      const { model, positionBasedWeights, timeDecayConfig, customWeights, isDefault } = req.body;
      const config = await attributionService.setAttributionModelConfig({
        model,
        positionBasedWeights,
        timeDecayConfig,
        customWeights,
        isDefault,
      });
      res.status(201).json({ success: true, data: config });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set model config';
      res.status(400).json({ success: false, error: { code: 'MODEL_CONFIG_SET_FAILED', message } });
    }
  });

  // ========================================
  // ATTRIBUTION DISPUTE ROUTES
  // ========================================

  router.post('/disputes', async (req: Request, res: Response) => {
    try {
      const dto: CreateAttributionDisputeDto = req.body;
      const dispute = await attributionService.createDispute(dto);
      res.status(201).json({ success: true, data: dispute });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create dispute';
      res.status(400).json({ success: false, error: { code: 'DISPUTE_CREATE_FAILED', message } });
    }
  });

  router.get('/disputes', async (req: Request, res: Response) => {
    try {
      const result = await attributionService.getDisputes({
        attributionId: req.query.attributionId as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get disputes';
      res.status(400).json({ success: false, error: { code: 'DISPUTES_GET_FAILED', message } });
    }
  });

  router.put('/disputes/:id/resolve', async (req: Request, res: Response) => {
    try {
      const dto: ResolveAttributionDisputeDto = req.body;
      const dispute = await attributionService.resolveDispute(req.params.id, dto);
      if (!dispute) {
        return res.status(404).json({ success: false, error: { code: 'DISPUTE_NOT_FOUND', message: 'Dispute not found' } });
      }
      res.json({ success: true, data: dispute });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve dispute';
      res.status(400).json({ success: false, error: { code: 'DISPUTE_RESOLVE_FAILED', message } });
    }
  });

  return router;
}

export default createAttributionRoutes;
