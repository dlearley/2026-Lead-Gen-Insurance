/**
 * Talk Track Generator API Routes
 * Routes for AI-powered sales conversation script generation
 */

import { Router, Request, Response } from 'express';
import { TalkTrackGeneratorService } from '../services/talk-track-generator.service';

export function createTalkTrackRoutes(talkTrackService: TalkTrackGeneratorService): Router {
  const router = Router();

  // ========================================
  // Talk Track Generation
  // ========================================

  /**
   * POST /api/v1/talk-tracks/generate
   * Generate a new AI-powered talk track
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const result = await talkTrackService.generateTalkTrack(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error generating talk track:', error);
      res.status(500).json({
        error: 'Failed to generate talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/talk-tracks/generate/batch
   * Generate multiple talk tracks in batch
   */
  router.post('/generate/batch', async (req: Request, res: Response) => {
    try {
      const result = await talkTrackService.batchGenerateTalkTracks(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in batch generation:', error);
      res.status(500).json({
        error: 'Failed to generate talk tracks in batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Talk Track CRUD
  // ========================================

  /**
   * GET /api/v1/talk-tracks/:id
   * Get a specific talk track
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const talkTrack = await talkTrackService.getTalkTrack(req.params.id);
      if (!talkTrack) {
        return res.status(404).json({ error: 'Talk track not found' });
      }
      res.json(talkTrack);
    } catch (error) {
      console.error('Error fetching talk track:', error);
      res.status(500).json({
        error: 'Failed to fetch talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/talk-tracks
   * List talk tracks with filters and search
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const params = {
        organizationId: req.query.organizationId as string,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
        searchTerm: req.query.searchTerm as string,
        sortBy: req.query.sortBy as 'createdAt' | 'updatedAt' | 'name' | 'usageCount' | 'rating',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };
      const result = await talkTrackService.listTalkTracks(params);
      res.json(result);
    } catch (error) {
      console.error('Error listing talk tracks:', error);
      res.status(500).json({
        error: 'Failed to list talk tracks',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/v1/talk-tracks/:id
   * Update a talk track
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const talkTrack = await talkTrackService.updateTalkTrack(req.params.id, req.body);
      res.json(talkTrack);
    } catch (error) {
      console.error('Error updating talk track:', error);
      res.status(500).json({
        error: 'Failed to update talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/v1/talk-tracks/:id
   * Delete a talk track
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await talkTrackService.deleteTalkTrack(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting talk track:', error);
      res.status(500).json({
        error: 'Failed to delete talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/talk-tracks/:id/approve
   * Approve a talk track
   */
  router.post('/:id/approve', async (req: Request, res: Response) => {
    try {
      const talkTrack = await talkTrackService.approveTalkTrack(req.params.id);
      res.json(talkTrack);
    } catch (error) {
      console.error('Error approving talk track:', error);
      res.status(500).json({
        error: 'Failed to approve talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/talk-tracks/:id/archive
   * Archive a talk track
   */
  router.post('/:id/archive', async (req: Request, res: Response) => {
    try {
      const talkTrack = await talkTrackService.archiveTalkTrack(req.params.id);
      res.json(talkTrack);
    } catch (error) {
      console.error('Error archiving talk track:', error);
      res.status(500).json({
        error: 'Failed to archive talk track',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Templates
  // ========================================

  /**
   * POST /api/v1/talk-tracks/templates
   * Create a talk track template
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const { organizationId, ...template } = req.body;
      const talkTrack = await talkTrackService.createTemplate(template, organizationId);
      res.status(201).json(talkTrack);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/talk-tracks/templates
   * Get all templates for an organization
   */
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
      const templates = await talkTrackService.getTemplates(organizationId as string);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Objection Handlers
  // ========================================

  /**
   * POST /api/v1/talk-tracks/objections/generate
   * Generate objection handlers
   */
  router.post('/objections/generate', async (req: Request, res: Response) => {
    try {
      const handlers = await talkTrackService.generateObjectionHandlers(req.body);
      res.status(201).json(handlers);
    } catch (error) {
      console.error('Error generating objection handlers:', error);
      res.status(500).json({
        error: 'Failed to generate objection handlers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Usage Tracking
  // ========================================

  /**
   * POST /api/v1/talk-tracks/:id/usage
   * Track talk track usage
   */
  router.post('/:id/usage', async (req: Request, res: Response) => {
    try {
      const { agentId, context, feedback } = req.body;
      const usage = await talkTrackService.trackUsage(
        req.params.id,
        agentId,
        context,
        feedback
      );
      res.status(201).json(usage);
    } catch (error) {
      console.error('Error tracking usage:', error);
      res.status(500).json({
        error: 'Failed to track usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/talk-tracks/:id/analytics
   * Get usage analytics for a talk track
   */
  router.get('/:id/analytics', async (req: Request, res: Response) => {
    try {
      const analytics = await talkTrackService.getUsageAnalytics(req.params.id);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Favorites
  // ========================================

  /**
   * POST /api/v1/talk-tracks/:id/favorites
   * Add talk track to favorites
   */
  router.post('/:id/favorites', async (req: Request, res: Response) => {
    try {
      const { agentId, notes } = req.body;
      const favorite = await talkTrackService.addToFavorites(
        req.params.id,
        agentId,
        notes
      );
      res.status(201).json(favorite);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        error: 'Failed to add to favorites',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/talk-tracks/favorites
   * Get agent's favorite talk tracks
   */
  router.get('/favorites', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.query;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      const favorites = await talkTrackService.getFavorites(agentId as string);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({
        error: 'Failed to fetch favorites',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/v1/talk-tracks/:id/favorites
   * Remove talk track from favorites
   */
  router.delete('/:id/favorites', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.query;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      await talkTrackService.removeFromFavorites(req.params.id, agentId as string);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        error: 'Failed to remove from favorites',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================
  // Customizations
  // ========================================

  /**
   * POST /api/v1/talk-tracks/:id/customizations
   * Create agent customizations for a talk track
   */
  router.post('/:id/customizations', async (req: Request, res: Response) => {
    try {
      const { agentId, customizations } = req.body;
      const customization = await talkTrackService.createCustomization(
        req.params.id,
        agentId,
        customizations
      );
      res.status(201).json(customization);
    } catch (error) {
      console.error('Error creating customization:', error);
      res.status(500).json({
        error: 'Failed to create customization',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/talk-tracks/customizations
   * Get agent's customizations
   */
  router.get('/customizations', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.query;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      const customizations = await talkTrackService.getAgentCustomizations(agentId as string);
      res.json(customizations);
    } catch (error) {
      console.error('Error fetching customizations:', error);
      res.status(500).json({
        error: 'Failed to fetch customizations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
