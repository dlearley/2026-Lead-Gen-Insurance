// Phase 12.6: Marketplace Analytics Service
import { PrismaClient } from '@prisma/client';
import {
  MarketplaceAnalytics,
  MarketplaceOverview,
  SalesTrendData,
  ConversionFunnelData,
  MarketplaceItem,
  MarketplaceVendor,
} from '@platform/types';

const prisma = new PrismaClient();

export class MarketplaceAnalyticsService {
  // Get comprehensive marketplace analytics
  async getMarketplaceAnalytics(startDate?: Date, endDate?: Date): Promise<MarketplaceAnalytics> {
    const [overview, topItems, topVendors, revenueByCategory, salesTrend, conversionFunnel] = await Promise.all([
      this.getOverview(),
      this.getTopItems(10),
      this.getTopVendors(10),
      this.getRevenueByCategory(startDate, endDate),
      this.getSalesTrend(startDate, endDate),
      this.getConversionFunnel(startDate, endDate),
    ]);

    return {
      overview,
      topItems,
      topVendors,
      revenueByCategory,
      salesTrend,
      conversionFunnel,
    };
  }

  // Get marketplace overview
  async getOverview(): Promise<MarketplaceOverview> {
    const [itemStats, vendorStats, transactionStats] = await Promise.all([
      prisma.marketplaceItem.aggregate({
        _count: { id: true },
        _avg: { price: true, rating: true },
      }),
      prisma.marketplaceVendor.aggregate({
        _count: { id: true },
      }),
      prisma.marketplaceTransaction.aggregate({
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const activeItems = await prisma.marketplaceItem.count({
      where: { status: 'ACTIVE' },
    });

    const activeVendors = await prisma.marketplaceVendor.count({
      where: { status: 'ACTIVE' },
    });

    return {
      totalItems: itemStats._count.id,
      activeItems,
      totalVendors: vendorStats._count.id,
      activeVendors,
      totalTransactions: transactionStats._count.id,
      totalRevenue: transactionStats._sum.totalAmount || 0,
      averageItemPrice: itemStats._avg.price || 0,
      averageRating: itemStats._avg.rating || 0,
    };
  }

  // Get top performing items
  async getTopItems(limit = 10): Promise<MarketplaceItem[]> {
    const items = await prisma.marketplaceItem.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { purchases: 'desc' },
        { rating: 'desc' },
      ],
      take: limit,
    });

    return items.map((item) => this.mapToItem(item));
  }

  // Get top performing vendors
  async getTopVendors(limit = 10): Promise<MarketplaceVendor[]> {
    const vendors = await prisma.marketplaceVendor.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { totalRevenue: 'desc' },
        { rating: 'desc' },
      ],
      take: limit,
    });

    return vendors.map((vendor) => this.mapToVendor(vendor));
  }

  // Get revenue by category
  async getRevenueByCategory(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const where: any = { status: 'COMPLETED' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const transactions = await prisma.marketplaceTransaction.findMany({
      where,
      include: { item: true },
    });

    const revenueByCategory: Record<string, number> = {};

    transactions.forEach((transaction) => {
      const category = transaction.item.category;
      if (!revenueByCategory[category]) {
        revenueByCategory[category] = 0;
      }
      revenueByCategory[category] += transaction.totalAmount;
    });

    return revenueByCategory;
  }

  // Get sales trend data
  async getSalesTrend(startDate?: Date, endDate?: Date): Promise<SalesTrendData[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate || new Date();

    const transactions = await prisma.marketplaceTransaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const trendMap: Record<string, { sales: number; revenue: number; transactions: number }> = {};

    transactions.forEach((transaction) => {
      const date = transaction.createdAt.toISOString().split('T')[0];
      
      if (!trendMap[date]) {
        trendMap[date] = { sales: 0, revenue: 0, transactions: 0 };
      }

      trendMap[date].sales += transaction.quantity;
      trendMap[date].revenue += transaction.totalAmount;
      trendMap[date].transactions += 1;
    });

    return Object.entries(trendMap).map(([date, data]) => ({
      date,
      sales: data.sales,
      revenue: data.revenue,
      transactions: data.transactions,
    }));
  }

  // Get conversion funnel data
  async getConversionFunnel(startDate?: Date, endDate?: Date): Promise<ConversionFunnelData> {
    // Get total views
    const items = await prisma.marketplaceItem.findMany({
      select: { views: true },
    });

    const totalViews = items.reduce((sum, item) => sum + item.views, 0);

    // Get transaction data
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const allTransactions = await prisma.marketplaceTransaction.count({ where });
    const completedTransactions = await prisma.marketplaceTransaction.count({
      where: { ...where, status: 'COMPLETED' },
    });

    // For now, simulate clicks and addToCart data
    // In production, these would be tracked separately
    const clicks = Math.floor(totalViews * 0.3); // Assume 30% click-through
    const addedToCart = Math.floor(clicks * 0.5); // Assume 50% add to cart
    const initiated = allTransactions;
    const completed = completedTransactions;

    const conversionRate = totalViews > 0 ? (completed / totalViews) * 100 : 0;

    return {
      views: totalViews,
      clicks,
      addedToCart,
      initiated,
      completed,
      conversionRate,
    };
  }

  // Get category performance
  async getCategoryPerformance(category: string, startDate?: Date, endDate?: Date): Promise<{
    totalItems: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    const items = await prisma.marketplaceItem.findMany({
      where: { category },
    });

    const itemIds = items.map((item) => item.id);

    const where: any = {
      itemId: { in: itemIds },
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const transactions = await prisma.marketplaceTransaction.findMany({
      where,
    });

    const totalSales = transactions.reduce((sum, t) => sum + t.quantity, 0);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const averageRating = items.length > 0
      ? items.reduce((sum, item) => sum + item.rating, 0) / items.length
      : 0;

    return {
      totalItems: items.length,
      totalSales,
      totalRevenue,
      averageRating,
    };
  }

  // Helper mappers
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

  private mapToVendor(vendor: any): MarketplaceVendor {
    return {
      id: vendor.id,
      userId: vendor.userId,
      businessName: vendor.businessName,
      description: vendor.description,
      logo: vendor.logo,
      website: vendor.website,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      zipCode: vendor.zipCode,
      country: vendor.country,
      status: vendor.status,
      tier: vendor.tier,
      rating: vendor.rating,
      reviewCount: vendor.reviewCount,
      totalSales: vendor.totalSales,
      totalRevenue: vendor.totalRevenue,
      commissionRate: vendor.commissionRate,
      verifiedAt: vendor.verifiedAt,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
