/**
 * Competitive Intelligence API Routes
 * RESTful endpoints for competitive intelligence operations
 */

import { Router, Request, Response } from 'express';
import { CompetitiveIntelligenceService } from '../services/competitive-intelligence.service.js';
import {
  CompetitorCreateInput,
  CompetitorUpdateInput,
  CompetitorActivityCreateInput,
  WinLossCreateInput,
  PricingDataCreateInput,
  MarketShareCreateInput,
  CompetitiveAlertCreateInput,
  CompetitiveAlertUpdateInput,
  CompetitiveInsightCreateInput,
  BattleCardCreateInput,
  CompetitorTier,
  AlertSeverity,
  AlertType,
  InsightType,
  Priority,
  WinLossReason,
} from '@insurance-lead-gen/types';

export function createCompetitiveIntelligenceRoutes(
  ciService: CompetitiveIntelligenceService
): Router {
  const router = Router();

  // ========================================
  // Competitor Routes
  // ========================================

  // Create competitor
  router.post('/competitors', async (req: Request, res: Response) => {
    try {
      const input: CompetitorCreateInput = req.body;
      const competitor = await ciService.createCompetitor(input);
      res.status(201).json(competitor);
    } catch (error) {
      console.error('Error creating competitor:', error);
      res.status(500).json({ error: 'Failed to create competitor' });
    }
  });

  // Get competitor by ID
  router.get('/competitors/:id', async (req: Request, res: Response) => {
    try {
      const competitor = await ciService.getCompetitor(req.params.id);
      if (!competitor) {
        return res.status(404).json({ error: 'Competitor not found' });
      }
      res.json(competitor);
    } catch (error) {
      console.error('Error fetching competitor:', error);
      res.status(500).json({ error: 'Failed to fetch competitor' });
    }
  });

  // List competitors
  router.get('/competitors', async (req: Request, res: Response) => {
    try {
      const { tier, isActive, search, limit, offset } = req.query;

      const filters: any = {};
      if (tier) filters.tier = tier as CompetitorTier;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await ciService.listCompetitors(filters);
      res.json(result);
    } catch (error) {
      console.error('Error listing competitors:', error);
      res.status(500).json({ error: 'Failed to list competitors' });
    }
  });

  // Update competitor
  router.put('/competitors/:id', async (req: Request, res: Response) => {
    try {
      const input: CompetitorUpdateInput = req.body;
      const competitor = await ciService.updateCompetitor(req.params.id, input);
      res.json(competitor);
    } catch (error) {
      console.error('Error updating competitor:', error);
      res.status(500).json({ error: 'Failed to update competitor' });
    }
  });

  // Delete competitor
  router.delete('/competitors/:id', async (req: Request, res: Response) => {
    try {
      await ciService.deleteCompetitor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting competitor:', error);
      res.status(500).json({ error: 'Failed to delete competitor' });
    }
  });

  // Calculate threat score
  router.post('/competitors/:id/threat-score', async (req: Request, res: Response) => {
    try {
      const { recentActivity, marketMovement, winLossTrend, fundingResources } = req.body;
      const score = await ciService.calculateThreatScore(req.params.id, {
        recentActivity,
        marketMovement,
        winLossTrend,
        fundingResources,
      });
      res.json({ score });
    } catch (error) {
      console.error('Error calculating threat score:', error);
      res.status(500).json({ error: 'Failed to calculate threat score' });
    }
  });

  // Calculate opportunity score
  router.post('/competitors/:id/opportunity-score', async (req: Request, res: Response) => {
    try {
      const { competitorWeakness, marketGap, customerSentiment } = req.body;
      const score = await ciService.calculateOpportunityScore(req.params.id, {
        competitorWeakness,
        marketGap,
        customerSentiment,
      });
      res.json({ score });
    } catch (error) {
      console.error('Error calculating opportunity score:', error);
      res.status(500).json({ error: 'Failed to calculate opportunity score' });
    }
  });

  // ========================================
  // Competitor Activity Routes
  // ========================================

  // Create activity
  router.post('/activities', async (req: Request, res: Response) => {
    try {
      const input: CompetitorActivityCreateInput = req.body;
      const activity = await ciService.createActivity(input);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({ error: 'Failed to create activity' });
    }
  });

  // List activities
  router.get('/activities', async (req: Request, res: Response) => {
    try {
      const { competitorId, activityType, severity, startDate, endDate, limit, offset } =
        req.query;

      const filters: any = {};
      if (competitorId) filters.competitorId = competitorId as string;
      if (activityType) filters.activityType = activityType as string;
      if (severity) filters.severity = severity as AlertSeverity;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await ciService.listActivities(filters);
      res.json(result);
    } catch (error) {
      console.error('Error listing activities:', error);
      res.status(500).json({ error: 'Failed to list activities' });
    }
  });

  // ========================================
  // Win/Loss Routes
  // ========================================

  // Create win/loss record
  router.post('/win-loss', async (req: Request, res: Response) => {
    try {
      const input: WinLossCreateInput = req.body;
      const winLoss = await ciService.createWinLoss(input);
      res.status(201).json(winLoss);
    } catch (error) {
      console.error('Error creating win/loss record:', error);
      res.status(500).json({ error: 'Failed to create win/loss record' });
    }
  });

  // Get win/loss analysis
  router.get('/win-loss/analysis', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analysis = await ciService.getWinLossAnalysis(start, end);
      res.json(analysis);
    } catch (error) {
      console.error('Error getting win/loss analysis:', error);
      res.status(500).json({ error: 'Failed to get win/loss analysis' });
    }
  });

  // ========================================
  // Pricing Intelligence Routes
  // ========================================

  // Create pricing data
  router.post('/pricing', async (req: Request, res: Response) => {
    try {
      const input: PricingDataCreateInput = req.body;
      const pricingData = await ciService.createPricingData(input);
      res.status(201).json(pricingData);
    } catch (error) {
      console.error('Error creating pricing data:', error);
      res.status(500).json({ error: 'Failed to create pricing data' });
    }
  });

  // Get pricing history
  router.get('/pricing/:competitorId', async (req: Request, res: Response) => {
    try {
      const { months } = req.query;
      const pricingHistory = await ciService.getPricingHistory(
        req.params.competitorId,
        months ? parseInt(months as string) : 12
      );
      res.json(pricingHistory);
    } catch (error) {
      console.error('Error fetching pricing history:', error);
      res.status(500).json({ error: 'Failed to fetch pricing history' });
    }
  });

  // Compare pricing
  router.post('/pricing/compare', async (req: Request, res: Response) => {
    try {
      const { competitorIds } = req.body;
      const comparison = await ciService.comparePricing(competitorIds);
      res.json(comparison);
    } catch (error) {
      console.error('Error comparing pricing:', error);
      res.status(500).json({ error: 'Failed to compare pricing' });
    }
  });

  // ========================================
  // Market Share Routes
  // ========================================

  // Create market share data
  router.post('/market-share', async (req: Request, res: Response) => {
    try {
      const input: MarketShareCreateInput = req.body;
      const marketShare = await ciService.createMarketShare(input);
      res.status(201).json(marketShare);
    } catch (error) {
      console.error('Error creating market share data:', error);
      res.status(500).json({ error: 'Failed to create market share data' });
    }
  });

  // Get market share trends
  router.get('/market-share/trends', async (req: Request, res: Response) => {
    try {
      const { market, vertical, months } = req.query;

      const trends = await ciService.getMarketShareTrends(
        market as string,
        vertical as string,
        months ? parseInt(months as string) : 12
      );
      res.json(trends);
    } catch (error) {
      console.error('Error fetching market share trends:', error);
      res.status(500).json({ error: 'Failed to fetch market share trends' });
    }
  });

  // ========================================
  // Alert Routes
  // ========================================

  // Create alert
  router.post('/alerts', async (req: Request, res: Response) => {
    try {
      const input: CompetitiveAlertCreateInput = req.body;
      const alert = await ciService.createAlert(input);
      res.status(201).json(alert);
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  });

  // List alerts
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const {
        competitorId,
        alertType,
        severity,
        status,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      const filters: any = {};
      if (competitorId) filters.competitorId = competitorId as string;
      if (alertType) filters.alertType = alertType as AlertType;
      if (severity) filters.severity = severity as AlertSeverity;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await ciService.listAlerts(filters);
      res.json(result);
    } catch (error) {
      console.error('Error listing alerts:', error);
      res.status(500).json({ error: 'Failed to list alerts' });
    }
  });

  // Update alert
  router.put('/alerts/:id', async (req: Request, res: Response) => {
    try {
      const input: CompetitiveAlertUpdateInput = req.body;
      const alert = await ciService.updateAlert(req.params.id, input);
      res.json(alert);
    } catch (error) {
      console.error('Error updating alert:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  });

  // Acknowledge alert
  router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
    try {
      const { userId, actionTaken } = req.body;
      const alert = await ciService.acknowledgeAlert(req.params.id, userId, actionTaken);
      res.json(alert);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });

  // ========================================
  // Insight Routes
  // ========================================

  // Create insight
  router.post('/insights', async (req: Request, res: Response) => {
    try {
      const input: CompetitiveInsightCreateInput = req.body;
      const insight = await ciService.createInsight(input);
      res.status(201).json(insight);
    } catch (error) {
      console.error('Error creating insight:', error);
      res.status(500).json({ error: 'Failed to create insight' });
    }
  });

  // List insights
  router.get('/insights', async (req: Request, res: Response) => {
    try {
      const { competitorId, insightType, priority, impact, limit, offset } = req.query;

      const filters: any = {};
      if (competitorId) filters.competitorId = competitorId as string;
      if (insightType) filters.insightType = insightType as InsightType;
      if (priority) filters.priority = priority as Priority;
      if (impact) filters.impact = impact as any;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await ciService.listInsights(filters);
      res.json(result);
    } catch (error) {
      console.error('Error listing insights:', error);
      res.status(500).json({ error: 'Failed to list insights' });
    }
  });

  // ========================================
  // Battle Card Routes
  // ========================================

  // Create battle card
  router.post('/battle-cards', async (req: Request, res: Response) => {
    try {
      const input: BattleCardCreateInput = req.body;
      const battleCard = await ciService.createBattleCard(input);
      res.status(201).json(battleCard);
    } catch (error) {
      console.error('Error creating battle card:', error);
      res.status(500).json({ error: 'Failed to create battle card' });
    }
  });

  // Get battle card for competitor
  router.get('/battle-cards/:competitorId', async (req: Request, res: Response) => {
    try {
      const battleCard = await ciService.getBattleCard(req.params.competitorId);
      if (!battleCard) {
        return res.status(404).json({ error: 'Battle card not found' });
      }
      res.json(battleCard);
    } catch (error) {
      console.error('Error fetching battle card:', error);
      res.status(500).json({ error: 'Failed to fetch battle card' });
    }
  });

  // Update battle card
  router.put('/battle-cards/:id', async (req: Request, res: Response) => {
    try {
      const updates: Partial<BattleCardCreateInput> = req.body;
      const battleCard = await ciService.updateBattleCard(req.params.id, updates);
      res.json(battleCard);
    } catch (error) {
      console.error('Error updating battle card:', error);
      res.status(500).json({ error: 'Failed to update battle card' });
    }
  });

  // ========================================
  // Analysis Routes
  // ========================================

  // Generate SWOT analysis
  router.post('/analysis/swot/:competitorId', async (req: Request, res: Response) => {
    try {
      const swot = await ciService.generateSWOTAnalysis(req.params.competitorId);
      res.json(swot);
    } catch (error) {
      console.error('Error generating SWOT analysis:', error);
      res.status(500).json({ error: 'Failed to generate SWOT analysis' });
    }
  });

  // Get market positioning
  router.get('/analysis/positioning/:competitorId', async (req: Request, res: Response) => {
    try {
      const positioning = await ciService.getMarketPositioning(req.params.competitorId);
      res.json(positioning);
    } catch (error) {
      console.error('Error getting market positioning:', error);
      res.status(500).json({ error: 'Failed to get market positioning' });
    }
  });

  // ========================================
  // Dashboard Routes
  // ========================================

  // Executive dashboard
  router.get('/dashboard/executive', async (req: Request, res: Response) => {
    try {
      const { period } = req.query;
      const dashboard = await ciService.getExecutiveDashboard(period as string);
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching executive dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch executive dashboard' });
    }
  });

  // Sales dashboard
  router.get('/dashboard/sales', async (req: Request, res: Response) => {
    try {
      const dashboard = await ciService.getSalesDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching sales dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch sales dashboard' });
    }
  });

  return router;
}
