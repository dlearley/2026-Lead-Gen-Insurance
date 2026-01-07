/**
 * Phase 30: Partner Ecosystem & Integrations
 * Marketplace Service - Handles integration marketplace and discovery
 */

import { PrismaClient } from '@prisma/client';
import type {
  MarketplaceListing,
  MarketplaceReview,
  MarketplaceSearchFilters,
  ListingStatus,
} from '@insurance-platform/types';

export class MarketplaceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create marketplace listing
   */
  async createListing(
    appId: string,
    data: {
      listingTitle: string;
      listingDescription: string;
      shortDescription?: string;
      categories: string[];
      features?: string[];
      documentationUrl?: string;
      supportUrl?: string;
      pricingInfo?: string;
    }
  ): Promise<MarketplaceListing> {
    // Verify application is approved
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id: appId },
    });

    if (!application || application.status !== 'APPROVED') {
      throw new Error('Application must be approved to create listing');
    }

    const listing = await this.prisma.marketplaceListing.create({
      data: {
        appId,
        listingTitle: data.listingTitle,
        listingDescription: data.listingDescription,
        shortDescription: data.shortDescription,
        categories: data.categories,
        features: data.features || [],
        documentationUrl: data.documentationUrl,
        supportUrl: data.supportUrl,
        pricingInfo: data.pricingInfo,
        status: 'DRAFT',
      },
    });

    return listing as MarketplaceListing;
  }

  /**
   * Update marketplace listing
   */
  async updateListing(
    listingId: string,
    updates: Partial<MarketplaceListing>
  ): Promise<MarketplaceListing> {
    const listing = await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: updates,
    });

    return listing as MarketplaceListing;
  }

  /**
   * Publish listing
   */
  async publishListing(listingId: string): Promise<MarketplaceListing> {
    const listing = await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'PUBLISHED' },
    });

    return listing as MarketplaceListing;
  }

  /**
   * Remove listing
   */
  async removeListing(listingId: string): Promise<MarketplaceListing> {
    const listing = await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'REMOVED' },
    });

    return listing as MarketplaceListing;
  }

  /**
   * Search marketplace
   */
  async searchListings(
    filters: MarketplaceSearchFilters
  ): Promise<{ listings: MarketplaceListing[]; total: number }> {
    const where: any = {
      status: 'PUBLISHED',
    };

    if (filters.query) {
      where.OR = [
        { listingTitle: { contains: filters.query, mode: 'insensitive' } },
        { listingDescription: { contains: filters.query, mode: 'insensitive' } },
        { shortDescription: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.categories && filters.categories.length > 0) {
      where.categories = {
        hasSome: filters.categories,
      };
    }

    if (filters.minRating) {
      where.averageRating = {
        gte: filters.minRating,
      };
    }

    // Build order by
    let orderBy: any = { createdAt: 'desc' };
    if (filters.sortBy === 'rating') {
      orderBy = { averageRating: 'desc' };
    } else if (filters.sortBy === 'downloads') {
      orderBy = { downloads: 'desc' };
    } else if (filters.sortBy === 'recent') {
      orderBy = { createdAt: 'desc' };
    } else if (filters.sortBy === 'alphabetical') {
      orderBy = { listingTitle: 'asc' };
    }

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        include: {
          application: {
            include: {
              partner: true,
            },
          },
        },
        orderBy,
        take: 50,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    return {
      listings: listings as MarketplaceListing[],
      total,
    };
  }

  /**
   * Get listing by ID
   */
  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            partner: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return listing as MarketplaceListing | null;
  }

  /**
   * Install integration from marketplace
   */
  async installIntegration(
    listingId: string,
    organizationId: string
  ): Promise<{ integrationId: string }> {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        application: true,
      },
    });

    if (!listing || listing.status !== 'PUBLISHED') {
      throw new Error('Listing not available');
    }

    // Create integration
    const integration = await this.prisma.integration.create({
      data: {
        partnerId: listing.application.partnerId,
        appId: listing.appId,
        organizationId,
        integrationName: listing.listingTitle,
        integrationType: 'marketplace',
        status: 'INACTIVE',
      },
    });

    // Increment download count
    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    return {
      integrationId: integration.id,
    };
  }

  /**
   * Add review to listing
   */
  async addReview(
    listingId: string,
    reviewerId: string,
    rating: number,
    reviewText?: string
  ): Promise<MarketplaceReview> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user already reviewed
    const existingReview = await this.prisma.marketplaceReview.findFirst({
      where: {
        listingId,
        reviewerId,
      },
    });

    if (existingReview) {
      throw new Error('You have already reviewed this integration');
    }

    const review = await this.prisma.marketplaceReview.create({
      data: {
        listingId,
        reviewerId,
        rating,
        reviewText,
      },
    });

    // Update listing average rating
    await this.updateListingRating(listingId);

    return review as MarketplaceReview;
  }

  /**
   * Update review
   */
  async updateReview(
    reviewId: string,
    rating?: number,
    reviewText?: string
  ): Promise<MarketplaceReview> {
    const review = await this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(reviewText !== undefined && { reviewText }),
      },
    });

    // Update listing average rating
    await this.updateListingRating(review.listingId);

    return review as MarketplaceReview;
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string): Promise<void> {
    const review = await this.prisma.marketplaceReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    await this.prisma.marketplaceReview.delete({
      where: { id: reviewId },
    });

    // Update listing average rating
    await this.updateListingRating(review.listingId);
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId: string): Promise<MarketplaceReview> {
    const review = await this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    return review as MarketplaceReview;
  }

  /**
   * Get reviews for listing
   */
  async getReviews(
    listingId: string,
    filters?: {
      minRating?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ reviews: MarketplaceReview[]; total: number }> {
    const where: any = { listingId };

    if (filters?.minRating) {
      where.rating = { gte: filters.minRating };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where,
        orderBy: [
          { helpfulCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      this.prisma.marketplaceReview.count({ where }),
    ]);

    return {
      reviews: reviews as MarketplaceReview[],
      total,
    };
  }

  /**
   * Get trending integrations
   */
  async getTrendingIntegrations(limit: number = 10): Promise<MarketplaceListing[]> {
    // Trending based on recent downloads and ratings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        status: 'PUBLISHED',
        updatedAt: { gte: thirtyDaysAgo },
      },
      orderBy: [
        { downloads: 'desc' },
        { averageRating: 'desc' },
      ],
      take: limit,
    });

    return listings as MarketplaceListing[];
  }

  /**
   * Get featured integrations
   */
  async getFeaturedIntegrations(): Promise<MarketplaceListing[]> {
    // Featured integrations with high ratings and downloads
    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        status: 'PUBLISHED',
        averageRating: { gte: 4.0 },
        downloads: { gte: 10 },
      },
      orderBy: [
        { averageRating: 'desc' },
        { downloads: 'desc' },
      ],
      take: 6,
    });

    return listings as MarketplaceListing[];
  }

  /**
   * Get recommended integrations for organization
   */
  async getRecommendedIntegrations(
    organizationId: string
  ): Promise<MarketplaceListing[]> {
    // TODO: Implement ML-based recommendations
    // For now, return popular integrations in relevant categories

    // Get organization's current integrations
    const currentIntegrations = await this.prisma.integration.findMany({
      where: { organizationId },
      include: {
        application: {
          include: {
            listings: true,
          },
        },
      },
    });

    // Extract categories from current integrations
    const categories = new Set<string>();
    currentIntegrations.forEach((integration) => {
      integration.application.listings.forEach((listing: any) => {
        (listing.categories as string[]).forEach((cat: string) => categories.add(cat));
      });
    });

    // Find similar integrations
    const recommendations = await this.prisma.marketplaceListing.findMany({
      where: {
        status: 'PUBLISHED',
        categories: {
          hasSome: Array.from(categories),
        },
        appId: {
          notIn: currentIntegrations.map((i) => i.appId),
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { downloads: 'desc' },
      ],
      take: 10,
    });

    return recommendations as MarketplaceListing[];
  }

  /**
   * Update listing average rating
   */
  private async updateListingRating(listingId: string): Promise<void> {
    const result = await this.prisma.marketplaceReview.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        averageRating: result._avg.rating || 0,
        reviewCount: result._count,
      },
    });
  }
}
