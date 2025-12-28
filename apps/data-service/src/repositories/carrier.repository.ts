import type { PrismaClient, Carrier, CarrierPerformanceMetric, Prisma } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

export interface CreateCarrierInput {
  name: string;
  description?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'STRATEGIC';
  partnershipStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_NEEDED';
  contractStartDate: Date;
  contractEndDate?: Date;
  commissionRate?: number;
  isActive?: boolean;
  integrationEnabled?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface UpdateCarrierInput {
  name?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'STRATEGIC';
  partnershipStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_NEEDED';
  contractStartDate?: Date;
  contractEndDate?: Date;
  commissionRate?: number;
  isActive?: boolean;
  integrationEnabled?: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface CarrierFilters {
  name?: string;
  partnershipStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_NEEDED';
  partnershipTier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'STRATEGIC';
  isActive?: boolean;
  integrationEnabled?: boolean;
  search?: string;
}

export interface CreateCarrierPerformanceMetricInput {
  carrierId: string;
  month: number;
  year: number;
  leadsReceived: number;
  leadsConverted: number;
  conversionRate: number;
  averageResponseTime: number;
  averageQuoteValue: number;
  customerSatisfaction: number;
  onTimeDeliveryRate: number;
}

export interface UpdateCarrierPerformanceMetricInput {
  leadsReceived?: number;
  leadsConverted?: number;
  conversionRate?: number;
  averageResponseTime?: number;
  averageQuoteValue?: number;
  customerSatisfaction?: number;
  onTimeDeliveryRate?: number;
}

export class CarrierRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateCarrierInput): Promise<Carrier> {
    try {
      const carrier = await this.prisma.carrier.create({
        data: {
          name: input.name,
          description: input.description,
          website: input.website,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          country: input.country,
          partnershipTier: input.partnershipTier ?? 'BASIC',
          partnershipStatus: input.partnershipStatus ?? 'ACTIVE',
          contractStartDate: input.contractStartDate,
          contractEndDate: input.contractEndDate,
          commissionRate: input.commissionRate ?? 0,
          isActive: input.isActive ?? true,
          integrationEnabled: input.integrationEnabled ?? false,
          apiEndpoint: input.apiEndpoint,
          apiKey: input.apiKey,
        },
      });

      logger.info('Carrier created', { carrierId: carrier.id });
      return carrier;
    } catch (error) {
      logger.error('Failed to create carrier', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Carrier | null> {
    return this.prisma.carrier.findUnique({ where: { id } });
  }

  async findMany(
    filters?: CarrierFilters,
    skip: number = 0,
    take: number = 20
  ): Promise<Carrier[]> {
    const where: Prisma.CarrierWhereInput = {};

    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters?.partnershipStatus) {
      where.partnershipStatus = filters.partnershipStatus;
    }

    if (filters?.partnershipTier) {
      where.partnershipTier = filters.partnershipTier;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.integrationEnabled !== undefined) {
      where.integrationEnabled = filters.integrationEnabled;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.carrier.findMany({
      where,
      skip,
      take,
      orderBy: [{ partnershipTier: 'desc' }, { performanceScore: 'desc' }],
    });
  }

  async update(id: string, input: UpdateCarrierInput): Promise<Carrier> {
    try {
      const carrier = await this.prisma.carrier.update({
        where: { id },
        data: {
          ...input,
          partnershipTier: input.partnershipTier,
          partnershipStatus: input.partnershipStatus,
        },
      });

      logger.info('Carrier updated', { carrierId: carrier.id });
      return carrier;
    } catch (error) {
      logger.error('Failed to update carrier', { error, id, input });
      throw error;
    }
  }

  async delete(id: string): Promise<Carrier> {
    return this.prisma.carrier.delete({ where: { id } });
  }

  async createPerformanceMetric(
    input: CreateCarrierPerformanceMetricInput
  ): Promise<CarrierPerformanceMetric> {
    try {
      const metric = await this.prisma.carrierPerformanceMetric.create({
        data: {
          carrierId: input.carrierId,
          month: input.month,
          year: input.year,
          leadsReceived: input.leadsReceived,
          leadsConverted: input.leadsConverted,
          conversionRate: input.conversionRate,
          averageResponseTime: input.averageResponseTime,
          averageQuoteValue: input.averageQuoteValue,
          customerSatisfaction: input.customerSatisfaction,
          onTimeDeliveryRate: input.onTimeDeliveryRate,
        },
      });

      logger.info('Carrier performance metric created', { metricId: metric.id });
      return metric;
    } catch (error) {
      logger.error('Failed to create carrier performance metric', { error, input });
      throw error;
    }
  }

  async getPerformanceMetrics(
    carrierId: string,
    year?: number,
    month?: number
  ): Promise<CarrierPerformanceMetric[]> {
    const where: Prisma.CarrierPerformanceMetricWhereInput = {
      carrierId,
    };

    if (year !== undefined) {
      where.year = year;
    }

    if (month !== undefined) {
      where.month = month;
    }

    return this.prisma.carrierPerformanceMetric.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async updatePerformanceMetric(
    id: string,
    input: UpdateCarrierPerformanceMetricInput
  ): Promise<CarrierPerformanceMetric> {
    try {
      const metric = await this.prisma.carrierPerformanceMetric.update({
        where: { id },
        data: input,
      });

      logger.info('Carrier performance metric updated', { metricId: metric.id });
      return metric;
    } catch (error) {
      logger.error('Failed to update carrier performance metric', { error, id, input });
      throw error;
    }
  }

  async getCarrierWithPerformance(carrierId: string): Promise<Carrier | null> {
    return this.prisma.carrier.findUnique({
      where: { id: carrierId },
      include: {
        performanceMetrics: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12, // Last 12 months
        },
      },
    });
  }

  async updatePerformanceScore(carrierId: string, score: number): Promise<Carrier> {
    return this.prisma.carrier.update({
      where: { id: carrierId },
      data: { performanceScore: score },
    });
  }

  async updateConversionMetrics(
    carrierId: string,
    leadsReceived: number,
    leadsConverted: number
  ): Promise<Carrier> {
    return this.prisma.carrier.update({
      where: { id: carrierId },
      data: {
        totalLeadsReceived: { increment: leadsReceived },
        totalLeadsConverted: { increment: leadsConverted },
        conversionRate: {
          set: leadsReceived > 0 ? leadsConverted / leadsReceived : 0,
        },
      },
    });
  }
}