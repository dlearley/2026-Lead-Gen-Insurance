import type { PrismaClient, Carrier, CarrierPerformanceMetric } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import { CarrierRepository } from '../repositories/carrier.repository.js';

export class CarrierService {
  constructor(private carrierRepository: CarrierRepository) {}

  async createCarrier(input: {
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
  }): Promise<Carrier> {
    return this.carrierRepository.create(input);
  }

  async getCarrierById(id: string): Promise<Carrier | null> {
    return this.carrierRepository.findById(id);
  }

  async getAllCarriers(filters?: {
    name?: string;
    partnershipStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_NEEDED';
    partnershipTier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'STRATEGIC';
    isActive?: boolean;
    integrationEnabled?: boolean;
    search?: string;
  }): Promise<Carrier[]> {
    return this.carrierRepository.findMany(filters);
  }

  async updateCarrier(
    id: string,
    input: {
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
  ): Promise<Carrier> {
    return this.carrierRepository.update(id, input);
  }

  async deleteCarrier(id: string): Promise<Carrier> {
    return this.carrierRepository.delete(id);
  }

  async createPerformanceMetric(
    input: {
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
  ): Promise<CarrierPerformanceMetric> {
    return this.carrierRepository.createPerformanceMetric(input);
  }

  async getPerformanceMetrics(
    carrierId: string,
    year?: number,
    month?: number
  ): Promise<CarrierPerformanceMetric[]> {
    return this.carrierRepository.getPerformanceMetrics(carrierId, year, month);
  }

  async updatePerformanceMetric(
    id: string,
    input: {
      leadsReceived?: number;
      leadsConverted?: number;
      conversionRate?: number;
      averageResponseTime?: number;
      averageQuoteValue?: number;
      customerSatisfaction?: number;
      onTimeDeliveryRate?: number;
    }
  ): Promise<CarrierPerformanceMetric> {
    return this.carrierRepository.updatePerformanceMetric(id, input);
  }

  async getCarrierWithPerformance(carrierId: string): Promise<Carrier | null> {
    return this.carrierRepository.getCarrierWithPerformance(carrierId);
  }

  async updatePerformanceScore(carrierId: string, score: number): Promise<Carrier> {
    return this.carrierRepository.updatePerformanceScore(carrierId, score);
  }

  async updateConversionMetrics(
    carrierId: string,
    leadsReceived: number,
    leadsConverted: number
  ): Promise<Carrier> {
    return this.carrierRepository.updateConversionMetrics(
      carrierId,
      leadsReceived,
      leadsConverted
    );
  }

  async calculatePerformanceScore(carrierId: string): Promise<number> {
    const carrier = await this.getCarrierWithPerformance(carrierId);
    if (!carrier) {
      throw new Error('Carrier not found');
    }

    const metrics = carrier.performanceMetrics;
    if (metrics.length === 0) {
      return 0;
    }

    // Calculate weighted performance score based on multiple factors
    const latestMetric = metrics[0];
    
    // Weight factors
    const conversionWeight = 0.4;
    const responseTimeWeight = 0.2;
    const satisfactionWeight = 0.2;
    const deliveryWeight = 0.2;

    // Normalize values (assuming max values for normalization)
    const normalizedConversion = Math.min(latestMetric.conversionRate / 100, 1);
    const normalizedResponseTime = Math.max(1 - latestMetric.averageResponseTime / 24, 0); // Assuming 24 hours max
    const normalizedSatisfaction = latestMetric.customerSatisfaction / 100;
    const normalizedDelivery = latestMetric.onTimeDeliveryRate / 100;

    // Calculate weighted score
    const score = (
      normalizedConversion * conversionWeight +
      normalizedResponseTime * responseTimeWeight +
      normalizedSatisfaction * satisfactionWeight +
      normalizedDelivery * deliveryWeight
    ) * 100;

    // Update the carrier's performance score
    await this.updatePerformanceScore(carrierId, score);

    return score;
  }

  async getTopPerformingCarriers(limit: number = 5): Promise<Carrier[]> {
    const carriers = await this.carrierRepository.findMany({
      isActive: true,
      partnershipStatus: 'ACTIVE',
    });

    // Sort by performance score (descending)
    return carriers
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  async getCarriersNeedingAttention(): Promise<Carrier[]> {
    const carriers = await this.carrierRepository.findMany({
      isActive: true,
    });

    // Filter carriers that need attention
    return carriers.filter(carrier => {
      // Check contract renewal needed
      if (carrier.contractEndDate) {
        const daysUntilExpiry = Math.ceil(
          (carrier.contractEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30) {
          return true;
        }
      }

      // Check low performance
      if (carrier.performanceScore < 50) {
        return true;
      }

      // Check low conversion rate
      if (carrier.conversionRate < 0.1) {
        return true;
      }

      return false;
    });
  }

  async updateCarrierPartnershipTier(
    carrierId: string,
    newTier: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'STRATEGIC'
  ): Promise<Carrier> {
    return this.carrierRepository.update(carrierId, { partnershipTier: newTier });
  }

  async updateCarrierPartnershipStatus(
    carrierId: string,
    newStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_NEEDED'
  ): Promise<Carrier> {
    return this.carrierRepository.update(carrierId, { partnershipStatus: newStatus });
  }

  async getCarrierPerformanceTrends(
    carrierId: string,
    months: number = 6
  ): Promise<CarrierPerformanceMetric[]> {
    const metrics = await this.getPerformanceMetrics(carrierId);
    
    // Get the latest 'months' of data
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return metrics
      .filter(metric => {
        const metricDate = new Date(metric.year, metric.month - 1);
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - months);
        return metricDate >= monthsAgo;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }

  async getCarrierComparisonReport(
    carrierIds: string[]
  ): Promise<Carrier[]> {
    const carriers = await Promise.all(
      carrierIds.map(id => this.getCarrierWithPerformance(id))
    );
    
    return carriers.filter((carrier): carrier is Carrier => carrier !== null);
  }
}