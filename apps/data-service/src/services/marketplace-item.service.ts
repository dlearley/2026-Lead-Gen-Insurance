// Phase 12.6: Marketplace Item Service
import { PrismaClient } from '@prisma/client';
import {
  MarketplaceItem,
  CreateMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  MarketplaceSearchFilters,
  MarketplaceSearchResult,
  MarketplaceItemStatus,
} from '@platform/types';

const prisma = new PrismaClient();

export class MarketplaceItemService {
  // Create a new item
  async createItem(dto: CreateMarketplaceItemDto): Promise<MarketplaceItem> {
    const item = await prisma.marketplaceItem.create({
      data: {
        vendorId: dto.vendorId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        currency: dto.currency,
        images: dto.images || [],
        tags: dto.tags || [],
        category: dto.category,
        subcategory: dto.subcategory,
        specifications: dto.specifications as any,
        inventory: dto.inventory,
      },
    });

    return this.mapToItem(item);
  }

  // Get item by ID
  async getItemById(id: string): Promise<MarketplaceItem | null> {
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (item) {
      // Increment view count
      await prisma.marketplaceItem.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return item ? this.mapToItem(item) : null;
  }

  // Update item
  async updateItem(id: string, dto: UpdateMarketplaceItemDto): Promise<MarketplaceItem> {
    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: dto as any,
    });

    return this.mapToItem(item);
  }

  // Search items with filters
  async searchItems(filters: MarketplaceSearchFilters, page = 1, limit = 20): Promise<MarketplaceSearchResult> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.subcategory) where.subcategory = filters.subcategory;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.featured !== undefined) where.featured = filters.featured;
    if (filters.status) where.status = filters.status;
    else where.status = 'ACTIVE'; // Default to active items

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.minRating !== undefined) {
      where.rating = { gte: filters.minRating };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const [items, total] = await Promise.all([
      prisma.marketplaceItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { rating: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.marketplaceItem.count({ where }),
    ]);

    return {
      items: items.map((i) => this.mapToItem(i)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get featured items
  async getFeaturedItems(limit = 10): Promise<MarketplaceItem[]> {
    const items = await prisma.marketplaceItem.findMany({
      where: {
        featured: true,
        status: 'ACTIVE',
      },
      take: limit,
      orderBy: { rating: 'desc' },
    });

    return items.map((i) => this.mapToItem(i));
  }

  // Get items by vendor
  async getItemsByVendor(vendorId: string): Promise<MarketplaceItem[]> {
    const items = await prisma.marketplaceItem.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((i) => this.mapToItem(i));
  }

  // Update item status
  async updateItemStatus(id: string, status: MarketplaceItemStatus): Promise<MarketplaceItem> {
    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: { status },
    });

    return this.mapToItem(item);
  }

  // Toggle featured status
  async toggleFeatured(id: string): Promise<MarketplaceItem> {
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    const updated = await prisma.marketplaceItem.update({
      where: { id },
      data: { featured: !item.featured },
    });

    return this.mapToItem(updated);
  }

  // Increment purchase count
  async incrementPurchases(id: string): Promise<void> {
    await prisma.marketplaceItem.update({
      where: { id },
      data: {
        purchases: { increment: 1 },
      },
    });

    // Update vendor total sales
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (item) {
      await prisma.marketplaceVendor.update({
        where: { id: item.vendorId },
        data: {
          totalSales: { increment: 1 },
        },
      });
    }
  }

  // Update item rating
  async updateItemRating(id: string): Promise<void> {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { itemId: id },
    });

    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      await prisma.marketplaceItem.update({
        where: { id },
        data: {
          rating: averageRating,
          reviewCount: reviews.length,
        },
      });
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<void> {
    await prisma.marketplaceItem.delete({
      where: { id },
    });
  }

  // Helper to map Prisma model to type
  private mapToItem(item: any): MarketplaceItem {
    return {
      id: item.id,
      vendorId: item.vendorId,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      price: item.price,
      currency: item.currency,
      images: item.images,
      tags: item.tags,
      category: item.category,
      subcategory: item.subcategory,
      specifications: item.specifications,
      inventory: item.inventory,
      featured: item.featured,
      views: item.views,
      purchases: item.purchases,
      rating: item.rating,
      reviewCount: item.reviewCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
