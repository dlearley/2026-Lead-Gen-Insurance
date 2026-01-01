import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { IntentDetectionService, SignalProcessorService } from '@insurance-lead-gen/ai-services';
import { PrismaClient } from '@prisma/client';

// Singleton instances for the router
const prisma = new PrismaClient();
const intentService = new IntentDetectionService(prisma);
const signalProcessor = new SignalProcessorService(prisma, intentService);

export const initializeIntentRoutes = (
  intentSvc: IntentDetectionService,
  signalProc: SignalProcessorService
): Router => {
  const router = Router();
  
  // Use provided services if available, otherwise use singletons
  const svc = intentSvc || intentService;
  const proc = signalProc || signalProcessor;

  /**
   * GET /api/v1/intent/:leadId
   * Get current intent score and signals for a lead
   */
  router.get('/:leadId', async (req: Request, res: Response) => {
    try {
      const { leadId } = req.params;
      const result = await svc.calculateIntentScore(leadId);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get intent score', { error, leadId: req.params.leadId });
      res.status(500).json({ success: false, error: 'Failed to get intent score' });
    }
  });

  /**
   * POST /api/v1/intent/events
   * Manually ingest a behavioral event for testing or from external sources
   */
  router.post('/events', async (req: Request, res: Response) => {
    try {
      const event = req.body;
      if (!event.leadId || !event.type) {
        return res.status(400).json({ success: false, error: 'leadId and type are required' });
      }
      
      logger.info('Received manual intent event via API', { leadId: event.leadId, type: event.type });
      await proc.processEvent(event);
      
      res.json({ success: true, message: 'Event processed and intent score updated' });
    } catch (error) {
      logger.error('Failed to process intent event', { error });
      res.status(500).json({ success: false, error: 'Failed to process event' });
    }
  });

  /**
   * GET /api/v1/intent/history/:leadId
   * Get historical intent score trend for a lead
   */
  router.get('/history/:leadId', async (req: Request, res: Response) => {
    try {
      const { leadId } = req.params;
      // For now returning current as base of history
      const current = await svc.calculateIntentScore(leadId);
      res.json({ 
        success: true, 
        data: {
          leadId,
          history: [
            { score: current.score, timestamp: current.lastUpdated }
          ]
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get intent history' });
    }
  });

  return router;
};

// Default export
export default initializeIntentRoutes(intentService, signalProcessor);
