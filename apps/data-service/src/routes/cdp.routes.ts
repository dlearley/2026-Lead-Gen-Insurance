import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CDPIdentityService } from '../services/cdp-identity.service.js';
import { CDPEventsService } from '../services/cdp-events.service.js';
import { CDPTraitsService } from '../services/cdp-traits.service.js';
import { CDPConsentService } from '../services/cdp-consent.service.js';
import { CDPCustomer360Service } from '../services/cdp-customer360.service.js';

const prisma = new PrismaClient();

const identityService = new CDPIdentityService(prisma);
const eventsService = new CDPEventsService(prisma);
const traitsService = new CDPTraitsService(prisma);
const consentService = new CDPConsentService(prisma);
const customer360Service = new CDPCustomer360Service(prisma);

const router = Router();

// ========================================
// IDENTITY ROUTES
// ========================================

router.post('/identities/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const identity = await identityService.createIdentity(customerId, req.body);
    res.status(201).json(identity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/identities/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const identities = await identityService.getIdentities(customerId);
    res.json(identities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/identity/resolve', async (req: Request, res: Response) => {
  try {
    const { identityType, identityValue } = req.query;
    const customerId = await identityService.resolveCustomer(
      identityType as any,
      identityValue as string
    );
    res.json({ customerId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/identities/merge', async (req: Request, res: Response) => {
  try {
    await identityService.mergeIdentities(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/identities/:customerId/verify', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { identityType, identityValue } = req.body;
    const identity = await identityService.verifyIdentity(customerId, identityType, identityValue);
    res.json(identity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/identities/:customerId/set-primary', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { identityType, identityValue } = req.body;
    await identityService.setPrimaryIdentity(customerId, identityType, identityValue);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// EVENTS ROUTES
// ========================================

router.post('/events/track', async (req: Request, res: Response) => {
  try {
    const event = await eventsService.trackEvent(req.body);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/events', async (req: Request, res: Response) => {
  try {
    const filters = {
      customerId: req.query.customerId as string | undefined,
      anonymousId: req.query.anonymousId as string | undefined,
      sessionId: req.query.sessionId as string | undefined,
      eventType: req.query.eventType as any,
      eventName: req.query.eventName as string | undefined,
      eventCategory: req.query.eventCategory as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await eventsService.listEvents(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/events/:customerId/recent', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const events = await eventsService.getRecentEvents(customerId, limit);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// TRAITS ROUTES
// ========================================

router.post('/traits/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const trait = await traitsService.setTrait(customerId, req.body);
    res.status(201).json(trait);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/traits/:customerId/batch', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const traits = await traitsService.setTraits(customerId, req.body);
    res.json(traits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/traits/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const traits = await traitsService.getTraits(customerId);
    res.json(traits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/traits/:customerId/:traitKey', async (req: Request, res: Response) => {
  try {
    const { customerId, traitKey } = req.params;
    const trait = await traitsService.getTrait(customerId, traitKey);
    
    if (!trait) {
      return res.status(404).json({ error: 'Trait not found' });
    }
    
    res.json(trait);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/traits/:customerId/:traitKey', async (req: Request, res: Response) => {
  try {
    const { customerId, traitKey } = req.params;
    await traitsService.deleteTrait(customerId, traitKey);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/traits/:customerId/compute-engagement', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    await traitsService.computeEngagementTraits(customerId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CONSENT ROUTES
// ========================================

router.post('/consents/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const consent = await consentService.setConsent(customerId, req.body);
    res.status(201).json(consent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consents/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const consents = await consentService.getConsents(customerId);
    res.json(consents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consents/:customerId/:consentType', async (req: Request, res: Response) => {
  try {
    const { customerId, consentType } = req.params;
    const consent = await consentService.getConsent(customerId, consentType);
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent not found' });
    }
    
    res.json(consent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CUSTOMER 360 VIEW ROUTES
// ========================================

router.get('/customer360/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const view = await customer360Service.getCustomer360View(customerId);
    
    if (!view) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(view);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customer360/:customerId/compute-engagement', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    await customer360Service.computeEngagementScore(customerId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customer360/:customerId/compute-ltv', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    await customer360Service.computeLifetimeValue(customerId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
