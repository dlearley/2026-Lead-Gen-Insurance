/**
 * Phase 30: Partner Ecosystem & Integrations
 * Marketplace API routes
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MarketplaceService } from '@insurance-platform/core';
import type { MarketplaceSearchFilters } from '@insurance-platform/types';

const router = Router();
const prisma = new PrismaClient();
const marketplaceService = new MarketplaceService(prisma);

/**
 * GET /api/marketplace
 * List/search marketplace integrations
 */
router.get('/', async (req, res, next) => {
  try {
    const { query, categories, minRating, sortBy } = req.query;

    const filters: MarketplaceSearchFilters = {
      query: query as string,
      categories: categories ? (categories as string).split(',') : undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      sortBy: sortBy as any,
    };

    const result = await marketplaceService.searchListings(filters);

    res.json({
      success: true,
      data: result.listings,
      pagination: {
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/search
 * Search marketplace (alias)
 */
router.get('/search', async (req, res, next) => {
  try {
    const { query, categories, minRating, sortBy } = req.query;

    const filters: MarketplaceSearchFilters = {
      query: query as string,
      categories: categories ? (categories as string).split(',') : undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      sortBy: sortBy as any,
    };

    const result = await marketplaceService.searchListings(filters);

    res.json({
      success: true,
      data: result.listings,
      pagination: {
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/trending
 * Get trending integrations
 */
router.get('/trending', async (req, res, next) => {
  try {
    const { limit } = req.query;

    const listings = await marketplaceService.getTrendingIntegrations(
      limit ? parseInt(limit as string) : 10
    );

    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/featured
 * Get featured integrations
 */
router.get('/featured', async (req, res, next) => {
  try {
    const listings = await marketplaceService.getFeaturedIntegrations();

    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/recommended
 * Get recommended integrations for organization
 */
router.get('/recommended', async (req, res, next) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'organizationId is required' },
      });
    }

    const listings = await marketplaceService.getRecommendedIntegrations(
      organizationId as string
    );

    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/:id
 * Get marketplace listing details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await marketplaceService.getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/marketplace/:id/install
 * Install integration from marketplace
 */
router.post('/:id/install', async (req, res, next) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'organizationId is required' },
      });
    }

    const result = await marketplaceService.installIntegration(req.params.id, organizationId);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/marketplace/:id/reviews
 * Add review to listing
 */
router.post('/:id/reviews', async (req, res, next) => {
  try {
    const { reviewerId, rating, reviewText } = req.body;

    const review = await marketplaceService.addReview(
      req.params.id,
      reviewerId,
      rating,
      reviewText
    );

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    if (error.message.includes('already reviewed')) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REVIEWED', message: error.message },
      });
    }
    next(error);
  }
});

/**
 * GET /api/marketplace/:id/reviews
 * Get reviews for listing
 */
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { minRating, limit, offset } = req.query;

    const result = await marketplaceService.getReviews(req.params.id, {
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.reviews,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/marketplace/reviews/:reviewId
 * Update review
 */
router.put('/reviews/:reviewId', async (req, res, next) => {
  try {
    const { rating, reviewText } = req.body;

    const review = await marketplaceService.updateReview(req.params.reviewId, rating, reviewText);

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/marketplace/reviews/:reviewId
 * Delete review
 */
router.delete('/reviews/:reviewId', async (req, res, next) => {
  try {
    await marketplaceService.deleteReview(req.params.reviewId);

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/marketplace/reviews/:reviewId/helpful
 * Mark review as helpful
 */
router.post('/reviews/:reviewId/helpful', async (req, res, next) => {
  try {
    const review = await marketplaceService.markReviewHelpful(req.params.reviewId);

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Marketplace Listing Management (for partners)
// ============================================================================

/**
 * POST /api/marketplace/listings
 * Create marketplace listing
 */
router.post('/listings', async (req, res, next) => {
  try {
    const { appId, ...listingData } = req.body;

    const listing = await marketplaceService.createListing(appId, listingData);

    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/marketplace/listings/:id
 * Update marketplace listing
 */
router.put('/listings/:id', async (req, res, next) => {
  try {
    const listing = await marketplaceService.updateListing(req.params.id, req.body);

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/marketplace/listings/:id/publish
 * Publish listing
 */
router.post('/listings/:id/publish', async (req, res, next) => {
  try {
    const listing = await marketplaceService.publishListing(req.params.id);

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/marketplace/listings/:id/remove
 * Remove listing
 */
router.post('/listings/:id/remove', async (req, res, next) => {
  try {
    const listing = await marketplaceService.removeListing(req.params.id);

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

export default router;
