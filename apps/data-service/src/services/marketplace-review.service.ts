// Phase 12.6: Marketplace Review Service
import { PrismaClient } from '@prisma/client';
import {
  MarketplaceReview,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewSummary,
} from '@platform/types';

const prisma = new PrismaClient();

export class MarketplaceReviewService {
  // Create a new review
  async createReview(userId: string, dto: CreateReviewDto): Promise<MarketplaceReview> {
    // Validate rating
    if (dto.rating < 1 || dto.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if transaction exists and is completed
    let verified = false;
    if (dto.transactionId) {
      const transaction = await prisma.marketplaceTransaction.findUnique({
        where: { id: dto.transactionId },
      });

      if (transaction && transaction.status === 'COMPLETED' && transaction.buyerId === userId) {
        verified = true;
      }
    }

    const review = await prisma.marketplaceReview.create({
      data: {
        userId,
        itemId: dto.itemId,
        vendorId: dto.vendorId,
        transactionId: dto.transactionId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        pros: dto.pros || [],
        cons: dto.cons || [],
        verified,
      },
    });

    // Update item or vendor rating
    if (dto.itemId) {
      await this.updateItemRating(dto.itemId);
    }
    
    if (dto.vendorId) {
      await this.updateVendorRating(dto.vendorId);
    }

    return this.mapToReview(review);
  }

  // Get review by ID
  async getReviewById(id: string): Promise<MarketplaceReview | null> {
    const review = await prisma.marketplaceReview.findUnique({
      where: { id },
    });

    return review ? this.mapToReview(review) : null;
  }

  // Update review
  async updateReview(id: string, userId: string, dto: UpdateReviewDto): Promise<MarketplaceReview> {
    // Verify ownership
    const existingReview = await prisma.marketplaceReview.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.userId !== userId) {
      throw new Error('Unauthorized to update this review');
    }

    const review = await prisma.marketplaceReview.update({
      where: { id },
      data: dto,
    });

    // Update ratings if rating changed
    if (dto.rating && existingReview.itemId) {
      await this.updateItemRating(existingReview.itemId);
    }
    
    if (dto.rating && existingReview.vendorId) {
      await this.updateVendorRating(existingReview.vendorId);
    }

    return this.mapToReview(review);
  }

  // Get reviews for an item
  async getReviewsForItem(itemId: string, page = 1, limit = 20): Promise<{
    reviews: MarketplaceReview[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.marketplaceReview.findMany({
        where: { itemId },
        skip,
        take: limit,
        orderBy: [
          { verified: 'desc' },
          { helpful: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.marketplaceReview.count({ where: { itemId } }),
    ]);

    return {
      reviews: reviews.map((r) => this.mapToReview(r)),
      total,
    };
  }

  // Get reviews for a vendor
  async getReviewsForVendor(vendorId: string, page = 1, limit = 20): Promise<{
    reviews: MarketplaceReview[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.marketplaceReview.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: [
          { verified: 'desc' },
          { helpful: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.marketplaceReview.count({ where: { vendorId } }),
    ]);

    return {
      reviews: reviews.map((r) => this.mapToReview(r)),
      total,
    };
  }

  // Get review summary for item
  async getItemReviewSummary(itemId: string): Promise<ReviewSummary> {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { itemId },
    });

    return this.calculateReviewSummary(reviews);
  }

  // Get review summary for vendor
  async getVendorReviewSummary(vendorId: string): Promise<ReviewSummary> {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { vendorId },
    });

    return this.calculateReviewSummary(reviews);
  }

  // Mark review as helpful
  async markHelpful(id: string): Promise<MarketplaceReview> {
    const review = await prisma.marketplaceReview.update({
      where: { id },
      data: {
        helpful: { increment: 1 },
      },
    });

    return this.mapToReview(review);
  }

  // Report review
  async reportReview(id: string): Promise<MarketplaceReview> {
    const review = await prisma.marketplaceReview.update({
      where: { id },
      data: {
        reported: { increment: 1 },
      },
    });

    return this.mapToReview(review);
  }

  // Delete review
  async deleteReview(id: string, userId: string): Promise<void> {
    // Verify ownership
    const review = await prisma.marketplaceReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('Unauthorized to delete this review');
    }

    await prisma.marketplaceReview.delete({
      where: { id },
    });

    // Update ratings
    if (review.itemId) {
      await this.updateItemRating(review.itemId);
    }
    
    if (review.vendorId) {
      await this.updateVendorRating(review.vendorId);
    }
  }

  // Update item rating based on reviews
  private async updateItemRating(itemId: string): Promise<void> {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { itemId },
    });

    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          rating: averageRating,
          reviewCount: reviews.length,
        },
      });
    } else {
      await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          rating: 0,
          reviewCount: 0,
        },
      });
    }
  }

  // Update vendor rating based on reviews
  private async updateVendorRating(vendorId: string): Promise<void> {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { vendorId },
    });

    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.marketplaceVendor.update({
        where: { id: vendorId },
        data: {
          rating: averageRating,
          reviewCount: reviews.length,
        },
      });
    } else {
      await prisma.marketplaceVendor.update({
        where: { id: vendorId },
        data: {
          rating: 0,
          reviewCount: 0,
        },
      });
    }
  }

  // Calculate review summary
  private calculateReviewSummary(reviews: any[]): ReviewSummary {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    const verifiedCount = reviews.filter((r) => r.verified).length;
    const verifiedPercentage = totalReviews > 0 ? (verifiedCount / totalReviews) * 100 : 0;

    return {
      averageRating,
      totalReviews,
      ratingDistribution,
      verifiedPercentage,
    };
  }

  // Helper to map Prisma model to type
  private mapToReview(review: any): MarketplaceReview {
    return {
      id: review.id,
      itemId: review.itemId,
      vendorId: review.vendorId,
      userId: review.userId,
      transactionId: review.transactionId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      pros: review.pros,
      cons: review.cons,
      verified: review.verified,
      helpful: review.helpful,
      reported: review.reported,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
