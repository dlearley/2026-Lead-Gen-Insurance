// ========================================
// Personalization Routes
// Endpoints for lead enrichment, offers, coaching, and analytics
// ========================================

import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import {
  EnrichLeadRequest,
  GetEnrichedProfileRequest,
  GetPersonalizedOffersRequest,
  GetCoachingSuggestionsRequest,
  CreateRiskValidationDto,
  PersonalizationAnalyticsRequest,
  AcknowledgeSuggestionDto,
  EnrichLeadResponse,
  GetEnrichedProfileResponse,
  GetPersonalizedOffersResponse,
  GetCoachingSuggestionsResponse,
  RiskValidationResponse,
  PersonalizationAnalyticsResponse,
} from '@insurance-lead-gen/types';

const router = Router();

// ========================================
// LEAD ENRICHMENT ENDPOINTS
// ========================================

/**
 * POST /api/leads/:leadId/enrich
 * Trigger enrichment for a lead
 */
router.post('/leads/:leadId/enrich', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const body = req.body as Partial<EnrichLeadRequest>;

    const request: EnrichLeadRequest = {
      leadId,
      forceRefresh: body.forceRefresh || false,
      includeProviders: body.includeProviders,
      excludeProviders: body.excludeProviders,
      enrichmentPriority: body.enrichmentPriority || 'normal',
    };

    // Import and use LeadEnrichmentService
    const { LeadEnrichmentService } = await import(
      '../../data-service/dist/services/lead-enrichment-service.js'
    );
    const enrichmentService = new LeadEnrichmentService();

    const result = await enrichmentService.enrichLead(leadId, {
      forceRefresh: request.forceRefresh,
      includeProviders: request.includeProviders,
      excludeProviders: request.excludeProviders,
      priority: request.enrichmentPriority,
    });

    const response: EnrichLeadResponse = {
      success: result.success,
      result,
      error: result.success ? undefined : result.errors?.[0],
    };

    if (result.success) {
      res.json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('Error enriching lead:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/leads/:leadId/enriched-profile
 * Fetch full enriched profile for a lead
 */
router.get('/leads/:leadId/enriched-profile', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { includeExpired, minimalData } = req.query;

    const request: GetEnrichedProfileRequest = {
      leadId,
      includeExpired: includeExpired === 'true',
      minimalData: minimalData === 'true',
    };

    // Import and use LeadEnrichmentService
    const { LeadEnrichmentService } = await import(
      '../../data-service/dist/services/lead-enrichment-service.js'
    );
    const enrichmentService = new LeadEnrichmentService();

    const profile = await enrichmentService.getEnrichedProfile(leadId, {
      includeExpired: request.includeExpired,
      minimalData: request.minimalData,
    });

    const response: GetEnrichedProfileResponse = {
      success: !!profile,
      profile: profile || undefined,
      error: profile ? undefined : 'Enriched profile not found',
    };

    if (profile) {
      res.json(response);
    } else {
      res.status(404).json(response);
    }
  } catch (error) {
    console.error('Error fetching enriched profile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// PERSONALIZED OFFERS ENDPOINTS
// ========================================

/**
 * GET /api/leads/:leadId/personalized-offers
 * Get personalized offer recommendations
 */
router.get('/leads/:leadId/personalized-offers', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { callId, maxOffers, includeTiers, abTestGroup } = req.query;

    const request: GetPersonalizedOffersRequest = {
      leadId,
      callId: callId as string,
      maxOffers: maxOffers ? parseInt(maxOffers as string) : undefined,
      includeTiers: includeTiers ? (includeTiers as string).split(',') as any[] : undefined,
      abTestGroup: abTestGroup as string,
    };

    // Get enrichment profile
    const { LeadEnrichmentService } = await import(
      '../../data-service/dist/services/lead-enrichment-service.js'
    );
    const enrichmentService = new LeadEnrichmentService();

    const profile = await enrichmentService.getEnrichedProfile(leadId);

    if (!profile) {
      // Auto-enrich if profile doesn't exist
      await enrichmentService.enrichLead(leadId);
    }

    const enrichedProfile = profile || (await enrichmentService.getEnrichedProfile(leadId));

    // Generate offers
    const { OfferRecommendationEngine } = await import(
      '../../data-service/dist/services/offer-recommendation-engine.js'
    );
    const offerEngine = new OfferRecommendationEngine();

    const offers = await offerEngine.generateOffers(leadId, enrichedProfile!, request);

    const response: GetPersonalizedOffersResponse = {
      success: true,
      offers,
      total: offers.length,
      recommendationSummary: generateRecommendationSummary(offers),
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating personalized offers:', error);
    res.status(500).json({
      success: false,
      offers: [],
      total: 0,
      recommendationSummary: 'Failed to generate offers',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/offers/:offerId/present
 * Mark an offer as presented
 */
router.post('/offers/:offerId/present', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const { callId } = req.body;

    // Update offer status
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.personalizedOffer.update({
      where: { id: offerId },
      data: {
        status: 'presented',
        presentedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Offer marked as presented' });
  } catch (error) {
    console.error('Error presenting offer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/offers/:offerId/accept
 * Accept a personalized offer
 */
router.post('/offers/:offerId/accept', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const { agentId, callId, agentFeedback } = req.body;

    // Track offer outcome
    const { PersonalizationAnalyticsService } = await import(
      '../../data-service/dist/services/personalization-analytics-service.js'
    );
    const analyticsService = new PersonalizationAnalyticsService();

    await analyticsService.trackOfferOutcome(offerId, 'accepted', agentFeedback);

    res.json({ success: true, message: 'Offer accepted' });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/offers/:offerId/reject
 * Reject a personalized offer
 */
router.post('/offers/:offerId/reject', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const { agentId, callId, reason, agentFeedback } = req.body;

    // Track offer outcome
    const { PersonalizationAnalyticsService } = await import(
      '../../data-service/dist/services/personalization-analytics-service.js'
    );
    const analyticsService = new PersonalizationAnalyticsService();

    await analyticsService.trackOfferOutcome(offerId, 'rejected', reason || agentFeedback);

    res.json({ success: true, message: 'Offer rejected' });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// COACHING SUGGESTIONS ENDPOINTS
// ========================================

/**
 * GET /api/leads/:leadId/coaching-suggestions
 * Get coaching suggestions for a lead
 */
router.get('/leads/:leadId/coaching-suggestions', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { callId, maxSuggestions, suggestionTypes, minConfidence } = req.query;

    const request: GetCoachingSuggestionsRequest = {
      leadId,
      callId: callId as string,
      maxSuggestions: maxSuggestions ? parseInt(maxSuggestions as string) : undefined,
      suggestionTypes: suggestionTypes ? (suggestionTypes as string).split(',') as any[] : undefined,
      minConfidence: minConfidence as any,
    };

    // Get enrichment profile
    const { LeadEnrichmentService } = await import(
      '../../data-service/dist/services/lead-enrichment-service.js'
    );
    const enrichmentService = new LeadEnrichmentService();

    const profile = await enrichmentService.getEnrichedProfile(leadId);

    if (!profile) {
      const response: GetCoachingSuggestionsResponse = {
        success: false,
        suggestions: [],
        total: 0,
        summary: {
          priorityCounts: {},
          typeCounts: {},
          confidenceCounts: { high: 0, medium: 0, low: 0 },
        },
        error: 'Enriched profile not found. Please enrich the lead first.',
      };

      return res.status(404).json(response);
    }

    // Generate suggestions
    const { CoachingSuggestionService } = await import(
      '../../data-service/dist/services/coaching-suggestion-service.js'
    );
    const suggestionService = new CoachingSuggestionService();

    const suggestions = await suggestionService.generateSuggestions(leadId, profile, request);

    // Calculate summary
    const summary = {
      priorityCounts: suggestions.reduce((acc, s) => {
        acc[s.priority] = (acc[s.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      typeCounts: suggestions.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      confidenceCounts: suggestions.reduce(
        (acc, s) => {
          acc[s.confidence] = (acc[s.confidence] || 0) + 1;
          return acc;
        },
        { high: 0, medium: 0, low: 0 } as Record<string, number>
      ),
    };

    const response: GetCoachingSuggestionsResponse = {
      success: true,
      suggestions,
      total: suggestions.length,
      summary,
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating coaching suggestions:', error);
    res.status(500).json({
      success: false,
      suggestions: [],
      total: 0,
      summary: {
        priorityCounts: {},
        typeCounts: {},
        confidenceCounts: { high: 0, medium: 0, low: 0 },
      },
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/calls/:callId/coaching-suggestions
 * Get suggestions for an active call
 */
router.get('/calls/:callId/coaching-suggestions', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    // Get call suggestions
    const { CoachingSuggestionService } = await import(
      '../../data-service/dist/services/coaching-suggestion-service.js'
    );
    const suggestionService = new CoachingSuggestionService();

    const suggestions = await suggestionService.getCallSuggestions(callId);

    res.json({
      success: true,
      suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    console.error('Error getting call suggestions:', error);
    res.status(500).json({
      success: false,
      suggestions: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/suggestions/:suggestionId/feedback
 * Submit feedback on a suggestion
 */
router.post('/suggestions/:suggestionId/feedback', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const body = req.body as AcknowledgeSuggestionDto;

    // Acknowledge suggestion
    const { CoachingSuggestionService } = await import(
      '../../data-service/dist/services/coaching-suggestion-service.js'
    );
    const suggestionService = new CoachingSuggestionService();

    await suggestionService.acknowledgeSuggestion(suggestionId, {
      used: body.used || false,
      usedScript: body.usedScript,
      effectivenessRating: body.effectivenessRating,
      notes: body.notes,
    });

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('Error recording suggestion feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// RISK VALIDATION ENDPOINTS
// ========================================

/**
 * POST /api/leads/:leadId/validate
 * Validate lead for fraud and compliance
 */
router.post('/leads/:leadId/validate', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const body = req.body as Partial<CreateRiskValidationDto>;

    const request: CreateRiskValidationDto = {
      leadId,
      validationType: body.validationType || 'fraud',
    };

    // Get enrichment profile
    const { LeadEnrichmentService } = await import(
      '../../data-service/dist/services/lead-enrichment-service.js'
    );
    const enrichmentService = new LeadEnrichmentService();

    const profile = await enrichmentService.getEnrichedProfile(leadId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Enriched profile not found. Please enrich the lead first.',
      });
    }

    // Validate lead
    const { RiskValidationService } = await import(
      '../../data-service/dist/services/risk-validation-service.js'
    );
    const riskValidationService = new RiskValidationService();

    const result = await riskValidationService.validateLead(leadId, profile, request);

    const response: RiskValidationResponse = {
      success: true,
      result,
    };

    res.json(response);
  } catch (error) {
    console.error('Error validating lead:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/leads/:leadId/risk-validation
 * Get existing risk validation result
 */
router.get('/leads/:leadId/risk-validation', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const { RiskValidationService } = await import(
      '../../data-service/dist/services/risk-validation-service.js'
    );
    const riskValidationService = new RiskValidationService();

    const result = await riskValidationService.getValidationResult(leadId);

    if (result) {
      res.json({ success: true, result });
    } else {
      res.status(404).json({
        success: false,
        error: 'Risk validation result not found',
      });
    }
  } catch (error) {
    console.error('Error getting risk validation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/personalization/analytics
 * Get personalization analytics
 */
router.get('/personalization/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy, includeComparison } = req.query;

    const request: PersonalizationAnalyticsRequest = {
      startDate: startDate ? new Date(startDate as string) : getDefaultStartDate(),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      groupBy: groupBy as any,
      includeComparison: includeComparison === 'true',
    };

    const { PersonalizationAnalyticsService } = await import(
      '../../data-service/dist/services/personalization-analytics-service.js'
    );
    const analyticsService = new PersonalizationAnalyticsService();

    const metrics = await analyticsService.calculateMetrics(request);

    const response: PersonalizationAnalyticsResponse = {
      success: true,
      metrics,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting personalization analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/personalization/dashboard
 * Get dashboard metrics
 */
router.get('/personalization/dashboard', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;

    const { PersonalizationAnalyticsService } = await import(
      '../../data-service/dist/services/personalization-analytics-service.js'
    );
    const analyticsService = new PersonalizationAnalyticsService();

    const dashboardMetrics = await analyticsService.getDashboardMetrics(
      days ? parseInt(days as string) : 30
    );

    res.json({ success: true, data: dashboardMetrics });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/personalization/trend
 * Get daily metrics trend
 */
router.get('/personalization/trend', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;

    const { PersonalizationAnalyticsService } = await import(
      '../../data-service/dist/services/personalization-analytics-service.js'
    );
    const analyticsService = new PersonalizationAnalyticsService();

    const trend = await analyticsService.getDailyMetricsTrend(
      days ? parseInt(days as string) : 30
    );

    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('Error getting metrics trend:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// DATA PROVIDER ENDPOINTS
// ========================================

/**
 * GET /api/data-providers
 * Get list of data providers
 */
router.get('/data-providers', async (req: Request, res: Response) => {
  try {
    const { type, status, isEnabled } = req.query;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const providers = await prisma.dataProvider.findMany({
      where: {
        ...(type && { type: type as string }),
        ...(status && { status: status as string }),
        ...(isEnabled !== undefined && { isEnabled: isEnabled === 'true' }),
      },
      orderBy: { priority: 'asc' },
    });

    res.json({ success: true, data: providers, total: providers.length });
  } catch (error) {
    console.error('Error getting data providers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/data-providers
 * Create a new data provider
 */
router.post('/data-providers', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const provider = await prisma.dataProvider.create({
      data: req.body,
    });

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error creating data provider:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * PUT /api/data-providers/:providerId
 * Update a data provider
 */
router.put('/data-providers/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const provider = await prisma.dataProvider.update({
      where: { id: providerId },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error updating data provider:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function getDefaultStartDate(): Date {
  const now = new Date();
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
}

function generateRecommendationSummary(offers: any[]): string {
  if (offers.length === 0) return 'No offers available';

  const primary = offers.filter((o) => o.tier === 'primary');
  const topOffer = offers[0];

  return `${offers.length} offer(s) available, including ${primary.length} primary recommendation(s). Best fit: ${topOffer.offerType} with ${Math.round(topOffer.fitScore)}% fit score.`;
}

export default router;
