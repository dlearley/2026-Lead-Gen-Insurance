/**
 * Talk Track Generator API Routes
 * API proxy routes for talk track generator functionality
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';

const DATA_SERVICE_URL = config.services.dataService.url;

export const talkTrackRouter = Router();

// ========================================
// Talk Track Generation
// ========================================

/**
 * POST /api/talk-tracks/generate
 * Generate a new AI-powered talk track
 */
talkTrackRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/generate`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to generate talk track',
        message: error.message,
      });
    }
  }
});

/**
 * POST /api/talk-tracks/generate/batch
 * Generate multiple talk tracks in batch
 */
talkTrackRouter.post('/generate/batch', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/generate/batch`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to generate talk tracks in batch',
        message: error.message,
      });
    }
  }
});

// ========================================
// Talk Track CRUD
// ========================================

/**
 * GET /api/talk-tracks/:id
 * Get a specific talk track
 */
talkTrackRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}`
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to fetch talk track',
        message: error.message,
      });
    }
  }
});

/**
 * GET /api/talk-tracks
 * List talk tracks with filters and search
 */
talkTrackRouter.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks`,
      { params: req.query }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to list talk tracks',
        message: error.message,
      });
    }
  }
});

/**
 * PUT /api/talk-tracks/:id
 * Update a talk track
 */
talkTrackRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to update talk track',
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /api/talk-tracks/:id
 * Delete a talk track
 */
talkTrackRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const response = await axios.delete(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}`
    );
    res.status(response.status).send(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to delete talk track',
        message: error.message,
      });
    }
  }
});

/**
 * POST /api/talk-tracks/:id/approve
 * Approve a talk track
 */
talkTrackRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/approve`
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to approve talk track',
        message: error.message,
      });
    }
  }
});

/**
 * POST /api/talk-tracks/:id/archive
 * Archive a talk track
 */
talkTrackRouter.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/archive`
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to archive talk track',
        message: error.message,
      });
    }
  }
});

// ========================================
// Templates
// ========================================

/**
 * POST /api/talk-tracks/templates
 * Create a talk track template
 */
talkTrackRouter.post('/templates', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/templates`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to create template',
        message: error.message,
      });
    }
  }
});

/**
 * GET /api/talk-tracks/templates
 * Get all templates for an organization
 */
talkTrackRouter.get('/templates', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/templates`,
      { params: req.query }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to fetch templates',
        message: error.message,
      });
    }
  }
});

// ========================================
// Objection Handlers
// ========================================

/**
 * POST /api/talk-tracks/objections/generate
 * Generate objection handlers
 */
talkTrackRouter.post('/objections/generate', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/objections/generate`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to generate objection handlers',
        message: error.message,
      });
    }
  }
});

// ========================================
// Usage Tracking
// ========================================

/**
 * POST /api/talk-tracks/:id/usage
 * Track talk track usage
 */
talkTrackRouter.post('/:id/usage', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/usage`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to track usage',
        message: error.message,
      });
    }
  }
});

/**
 * GET /api/talk-tracks/:id/analytics
 * Get usage analytics for a talk track
 */
talkTrackRouter.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/analytics`
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error.message,
      });
    }
  }
});

// ========================================
// Favorites
// ========================================

/**
 * POST /api/talk-tracks/:id/favorites
 * Add talk track to favorites
 */
talkTrackRouter.post('/:id/favorites', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/favorites`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to add to favorites',
        message: error.message,
      });
    }
  }
});

/**
 * GET /api/talk-tracks/favorites
 * Get agent's favorite talk tracks
 */
talkTrackRouter.get('/favorites', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/favorites`,
      { params: req.query }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to fetch favorites',
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /api/talk-tracks/:id/favorites
 * Remove talk track from favorites
 */
talkTrackRouter.delete('/:id/favorites', async (req: Request, res: Response) => {
  try {
    const response = await axios.delete(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/favorites`,
      { params: req.query }
    );
    res.status(response.status).send(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to remove from favorites',
        message: error.message,
      });
    }
  }
});

// ========================================
// Customizations
// ========================================

/**
 * POST /api/talk-tracks/:id/customizations
 * Create agent customizations for a talk track
 */
talkTrackRouter.post('/:id/customizations', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/${req.params.id}/customizations`,
      req.body
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to create customization',
        message: error.message,
      });
    }
  }
});

/**
 * GET /api/talk-tracks/customizations
 * Get agent's customizations
 */
talkTrackRouter.get('/customizations', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `${DATA_SERVICE_URL}/api/v1/talk-tracks/customizations`,
      { params: req.query }
    );
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Failed to fetch customizations',
        message: error.message,
      });
    }
  }
});
