import { 
  EcosystemRevenue, 
  CreateEcosystemRevenueDto, 
  UpdateEcosystemRevenueDto, 
  RevenueFilterParams,
  EcosystemRevenueMetrics,
  RevenueType,
  RevenueStatus
} from '@insurance-lead-gen/types';
import { EcosystemRevenueRepository } from '../repositories/ecosystem-revenue.repository.js';
import { logger } from '@insurance-lead-gen/core';

export class MarketplaceService {
  /**
   * Record new ecosystem revenue
   */
  async recordRevenue(data: CreateEcosystemRevenueDto): Promise<EcosystemRevenue> {
    try {
      logger.info('Recording marketplace revenue', { type: data.type, amount: data.amount });
      const revenue = await EcosystemRevenueRepository.create(data);
      
      // If it's a platform fee, we might want to mark it as completed immediately
      // depending on how it's collected. For now, we'll leave it as PENDING.
      
      return revenue;
    } catch (error) {
      logger.error('Failed to record revenue', { error, data });
      throw error;
    }
  }

  /**
   * Update revenue status
   */
  async updateRevenueStatus(id: string, status: RevenueStatus, metadata?: any): Promise<EcosystemRevenue> {
    try {
      const updateData: UpdateEcosystemRevenueDto = { status };
      if (status === RevenueStatus.COMPLETED) {
        updateData.processedAt = new Date();
      }
      if (metadata) {
        updateData.metadata = metadata;
      }

      return await EcosystemRevenueRepository.update(id, updateData);
    } catch (error) {
      logger.error('Failed to update revenue status', { error, id, status });
      throw error;
    }
  }

  /**
   * Get revenue by ID
   */
  async getRevenueById(id: string): Promise<EcosystemRevenue | null> {
    return await EcosystemRevenueRepository.findById(id);
  }

  /**
   * Get all revenue entries with filtering
   */
  async getAllRevenue(params: RevenueFilterParams): Promise<{ data: EcosystemRevenue[], total: number }> {
    return await EcosystemRevenueRepository.findAll(params);
  }

  /**
   * Get ecosystem revenue metrics
   */
  async getEcosystemMetrics(days: number = 30): Promise<EcosystemRevenueMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await EcosystemRevenueRepository.getMetrics(startDate, endDate);
    
    // Calculate growth rate (comparing current period to previous period)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevMetrics = await EcosystemRevenueRepository.getMetrics(prevStartDate, startDate);

    const growthRate = prevMetrics.totalRevenue === 0 
      ? 100 
      : ((metrics.totalRevenue - prevMetrics.totalRevenue) / prevMetrics.totalRevenue) * 100;

    // Get revenue over time (simplified)
    const revenueOverTime = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayRevenue = await EcosystemRevenueRepository.getMetrics(date, dayEnd);
      revenueOverTime.push({
        date: date.toISOString().split('T')[0],
        amount: dayRevenue.totalRevenue
      });
    }

    return {
      totalRevenue: metrics.totalRevenue,
      revenueByType: metrics.revenueByType,
      revenueByStatus: metrics.revenueByStatus,
      topBrokersByRevenue: [], // Would require more complex joining
      revenueOverTime,
      growthRate
    };
  }

  /**
   * Auto-generate platform fee for a transaction
   */
  async generatePlatformFee(
    sourceId: string, 
    sourceType: string, 
    transactionAmount: number, 
    brokerId?: string,
    feePercentage: number = 0.05
  ): Promise<EcosystemRevenue> {
    const feeAmount = transactionAmount * feePercentage;
    
    return await this.recordRevenue({
      type: RevenueType.PLATFORM_FEE,
      amount: feeAmount,
      currency: 'USD',
      sourceId,
      sourceType,
      brokerId,
      metadata: {
        transactionAmount,
        feePercentage
      }
    });
  }
}
