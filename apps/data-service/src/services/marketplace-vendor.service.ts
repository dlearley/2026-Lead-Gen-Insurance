// Phase 12.6: Marketplace Vendor Service
import { PrismaClient } from '@prisma/client';
import {
  MarketplaceVendor,
  CreateVendorDto,
  UpdateVendorDto,
  VendorPerformanceMetrics,
  VendorStatus,
} from '@platform/types';

const prisma = new PrismaClient();

export class MarketplaceVendorService {
  // Create a new vendor
  async createVendor(dto: CreateVendorDto): Promise<MarketplaceVendor> {
    const vendor = await prisma.marketplaceVendor.create({
      data: {
        userId: dto.userId,
        businessName: dto.businessName,
        description: dto.description,
        logo: dto.logo,
        website: dto.website,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
      },
    });

    return this.mapToVendor(vendor);
  }

  // Get vendor by ID
  async getVendorById(id: string): Promise<MarketplaceVendor | null> {
    const vendor = await prisma.marketplaceVendor.findUnique({
      where: { id },
    });

    return vendor ? this.mapToVendor(vendor) : null;
  }

  // Get vendor by user ID
  async getVendorByUserId(userId: string): Promise<MarketplaceVendor | null> {
    const vendor = await prisma.marketplaceVendor.findFirst({
      where: { userId },
    });

    return vendor ? this.mapToVendor(vendor) : null;
  }

  // Update vendor
  async updateVendor(id: string, dto: UpdateVendorDto): Promise<MarketplaceVendor> {
    const vendor = await prisma.marketplaceVendor.update({
      where: { id },
      data: dto,
    });

    return this.mapToVendor(vendor);
  }

  // List vendors with filters
  async listVendors(filters: {
    status?: VendorStatus;
    tier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ vendors: MarketplaceVendor[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.tier) where.tier = filters.tier;

    const [vendors, total] = await Promise.all([
      prisma.marketplaceVendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.marketplaceVendor.count({ where }),
    ]);

    return {
      vendors: vendors.map((v) => this.mapToVendor(v)),
      total,
    };
  }

  // Approve vendor
  async approveVendor(id: string): Promise<MarketplaceVendor> {
    const vendor = await prisma.marketplaceVendor.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        verifiedAt: new Date(),
      },
    });

    return this.mapToVendor(vendor);
  }

  // Suspend vendor
  async suspendVendor(id: string): Promise<MarketplaceVendor> {
    const vendor = await prisma.marketplaceVendor.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    return this.mapToVendor(vendor);
  }

  // Get vendor performance metrics
  async getVendorPerformance(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VendorPerformanceMetrics> {
    const transactions = await prisma.marketplaceTransaction.findMany({
      where: {
        vendorId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
    });

    const totalSales = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate conversion rate (requires view/click data)
    const vendor = await prisma.marketplaceVendor.findUnique({
      where: { id: vendorId },
      include: { items: true },
    });

    const totalViews = vendor?.items.reduce((sum, item) => sum + item.views, 0) || 0;
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    // Calculate customer satisfaction (based on reviews)
    const reviews = await prisma.marketplaceReview.findMany({
      where: { vendorId },
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const customerSatisfaction = (averageRating / 5) * 100;

    const period = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;

    return {
      vendorId,
      period,
      totalSales,
      totalRevenue,
      averageOrderValue,
      conversionRate,
      returnRate: 0, // TODO: Calculate based on refunds
      customerSatisfaction,
      responseTime: 0, // TODO: Calculate based on vendor response times
      fulfillmentRate: 100, // TODO: Calculate based on order fulfillment
    };
  }

  // Update vendor tier
  async updateVendorTier(id: string, tier: string): Promise<MarketplaceVendor> {
    const vendor = await prisma.marketplaceVendor.update({
      where: { id },
      data: { tier: tier as any },
    });

    return this.mapToVendor(vendor);
  }

  // Delete vendor
  async deleteVendor(id: string): Promise<void> {
    await prisma.marketplaceVendor.delete({
      where: { id },
    });
  }

  // Helper to map Prisma model to type
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
