import { PrismaClient } from '@prisma/client';
import {
  FinancialPartner,
  CommissionTracking,
  PartnerStatus,
  CommissionStatus,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * PartnerIntegrationService - Manages financial institution partnerships and commission tracking
 */
export class PartnerIntegrationService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Create a new financial partner
   */
  async createPartner(data: {
    partnerName: string;
    partnerType: string;
    agreementDate?: Date;
    terms?: Record<string, any>;
  }): Promise<FinancialPartner> {
    try {
      this.logger.info('Creating financial partner', { partnerName: data.partnerName });

      const partner = await this.prisma.financialPartner.create({
        data: {
          partnerName: data.partnerName,
          partnerType: data.partnerType,
          agreementDate: data.agreementDate,
          terms: data.terms || {},
          status: 'ACTIVE' as PartnerStatus,
        },
      });

      this.logger.info('Financial partner created successfully', { partnerId: partner.id });
      return partner;
    } catch (error) {
      this.logger.error('Failed to create partner', { error, data });
      throw new AppError('Failed to create financial partner', 500);
    }
  }

  /**
   * Get partner by ID
   */
  async getPartnerById(partnerId: string): Promise<FinancialPartner | null> {
    try {
      return await this.prisma.financialPartner.findUnique({
        where: { id: partnerId },
      });
    } catch (error) {
      this.logger.error('Failed to get partner', { error, partnerId });
      throw new AppError('Failed to retrieve partner', 500);
    }
  }

  /**
   * List all partners
   */
  async listPartners(filters?: {
    partnerType?: string;
    status?: PartnerStatus;
  }): Promise<FinancialPartner[]> {
    try {
      const whereClause: any = {};

      if (filters?.partnerType) {
        whereClause.partnerType = filters.partnerType;
      }
      if (filters?.status) {
        whereClause.status = filters.status;
      }

      return await this.prisma.financialPartner.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to list partners', { error, filters });
      throw new AppError('Failed to list partners', 500);
    }
  }

  /**
   * Update partner details
   */
  async updatePartner(
    partnerId: string,
    data: Partial<{
      partnerName: string;
      partnerType: string;
      status: PartnerStatus;
      terms: Record<string, any>;
    }>
  ): Promise<FinancialPartner> {
    try {
      this.logger.info('Updating partner', { partnerId });

      const partner = await this.prisma.financialPartner.update({
        where: { id: partnerId },
        data,
      });

      this.logger.info('Partner updated successfully', { partnerId });
      return partner;
    } catch (error) {
      this.logger.error('Failed to update partner', { error, partnerId });
      throw new AppError('Failed to update partner', 500);
    }
  }

  /**
   * Calculate commission for an application
   */
  async calculateCommission(
    applicationId: string,
    partnerId: string,
    productId: string
  ): Promise<{
    commissionAmount: number;
    commissionPercentage: number;
    calculationDetails: Record<string, any>;
  }> {
    try {
      this.logger.info('Calculating commission', { applicationId, partnerId });

      // Get application details
      const application = await this.prisma.productApplication.findUnique({
        where: { id: applicationId },
        include: {
          product: true,
        },
      });

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      // Get partner terms
      const partner = await this.getPartnerById(partnerId);
      if (!partner) {
        throw new AppError('Partner not found', 404);
      }

      // Calculate commission based on product and partner terms
      const productValue = this.calculateProductValue(application);
      const commissionPercentage = this.getCommissionRate(partner, application.productId);
      const commissionAmount = productValue * commissionPercentage;

      return {
        commissionAmount,
        commissionPercentage,
        calculationDetails: {
          productValue,
          commissionPercentage,
          productId: application.productId,
          applicationDate: application.applicationDate,
          tier: this.getPartnerTier(partner),
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate commission', { error, applicationId, partnerId });
      throw new AppError('Failed to calculate commission', 500);
    }
  }

  /**
   * Record commission tracking entry
   */
  async recordCommission(
    data: {
      partnerId: string;
      productId?: string;
      customerId?: string;
      applicationId?: string;
      commissionAmount: number;
      commissionPercentage: number;
    }
  ): Promise<CommissionTracking> {
    try {
      this.logger.info('Recording commission', { 
        partnerId: data.partnerId, 
        applicationId: data.applicationId 
      });

      const commission = await this.prisma.commissionTracking.create({
        data: {
          partnerId: data.partnerId,
          productId: data.productId,
          customerId: data.customerId,
          applicationId: data.applicationId,
          commissionAmount: data.commissionAmount,
          commissionPercentage: data.commissionPercentage,
          status: 'PENDING' as CommissionStatus,
        },
      });

      this.logger.info('Commission recorded successfully', { commissionId: commission.id });
      return commission;
    } catch (error) {
      this.logger.error('Failed to record commission', { error, data });
      throw new AppError('Failed to record commission', 500);
    }
  }

  /**
   * Process commission payment
   */
  async processCommissionPayment(
    commissionId: string,
    paymentDetails: {
      paymentDate: Date;
      paymentMethod: string;
      referenceNumber: string;
    }
  ): Promise<CommissionTracking> {
    try {
      this.logger.info('Processing commission payment', { commissionId });

      const commission = await this.prisma.commissionTracking.update({
        where: { id: commissionId },
        data: {
          status: 'PAID' as CommissionStatus,
          paymentDate: paymentDetails.paymentDate,
        },
      });

      // Log the payment event
      await this.logPartnerPayment(commissionId, paymentDetails);

      this.logger.info('Commission payment processed successfully', { commissionId });
      return commission;
    } catch (error) {
      this.logger.error('Failed to process commission payment', { error, commissionId });
      throw new AppError('Failed to process commission payment', 500);
    }
  }

  /**
   * Get commission tracking entries
   */
  async getCommissions(filters: {
    partnerId?: string;
    status?: CommissionStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    commissions: CommissionTracking[];
    total: number;
    totalAmount: number;
  }> {
    try {
      const whereClause: any = {};

      if (filters.partnerId) {
        whereClause.partnerId = filters.partnerId;
      }
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {
          whereClause.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = filters.endDate;
        }
      }

      const [commissions, total, totalAmountResult] = await Promise.all([
        this.prisma.commissionTracking.findMany({
          where: whereClause,
          include: {
            partner: true,
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.commissionTracking.count({ where: whereClause }),
        this.prisma.commissionTracking.aggregate({
          where: whereClause,
          _sum: { commissionAmount: true },
        }),
      ]);

      return {
        commissions,
        total,
        totalAmount: totalAmountResult._sum.commissionAmount || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get commissions', { error, filters });
      throw new AppError('Failed to retrieve commissions', 500);
    }
  }

  /**
   * Get partner analytics
   */
  async getPartnerAnalytics(
    partnerId: string,
    period: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<{
    totalApplications: number;
    approvedApplications: number;
    totalCommission: number;
    averageCommission: number;
    conversionRate: number;
  }> {
    try {
      const applications = await this.prisma.productApplication.findMany({
        where: {
          productId: {
            in: (await this.getPartnerProducts(partnerId)).map(p => p.id),
          },
          applicationDate: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      const approvedApplications = applications.filter(a => a.status === 'APPROVED');
      
      const commissions = await this.getCommissions({
        partnerId,
        startDate: period.startDate,
        endDate: period.endDate,
      });

      return {
        totalApplications: applications.length,
        approvedApplications: approvedApplications.length,
        totalCommission: commissions.totalAmount,
        averageCommission: applications.length > 0 ? commissions.totalAmount / applications.length : 0,
        conversionRate: applications.length > 0 ? (approvedApplications.length / applications.length) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get partner analytics', { error, partnerId });
      throw new AppError('Failed to retrieve partner analytics', 500);
    }
  }

  /**
   * Get products for a partner
   */
  async getPartnerProducts(partnerId: string): Promise<Array<{ id: string }>> {
    try {
      // In real implementation, would query partner_products table
      // For now, return all products associated with this partner
      const products = await this.prisma.financialProduct.findMany({
        where: { 
          providerId: partnerId,
          status: 'ACTIVE',
        },
      });

      return products;
    } catch (error) {
      this.logger.error('Failed to get partner products', { error, partnerId });
      throw new AppError('Failed to retrieve partner products', 500);
    }
  }

  /**
   * Log partner payment
   */
  private async logPartnerPayment(
    commissionId: string,
    paymentDetails: {
      paymentDate: Date;
      paymentMethod: string;
      referenceNumber: string;
    }
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actionType: 'UPDATE',
        entityType: 'COMMISSION',
        entityId: commissionId,
        changes: {
          field: 'status',
          oldValue: 'PENDING',
          newValue: 'PAID',
          paymentDetails,
        },
      },
    });
  }

  /**
   * Calculate product value for commission
   */
  private calculateProductValue(application: any): number {
    // In real implementation, would calculate based on product type and value
    // Simplified: use a standard value
    return 10000;
  }

  /**
   * Get commission rate based on partner tier
   */
  private getCommissionRate(partner: FinancialPartner, productId?: string): number {
    const tier = this.getPartnerTier(partner);
    const baseRate = 0.02; // 2% base rate

    // Tier multipliers
    const tierMultipliers: Record<string, number> = {
      'ELITE': 1.5,
      'PREMIUM': 1.3,
      'STANDARD': 1.1,
      'BASIC': 1.0,
    };

    return baseRate * (tierMultipliers[tier] || 1.0);
  }

  /**
   * Get partner tier from terms
   */
  private getPartnerTier(partner: FinancialPartner): string {
    return partner.terms?.tier || 'BASIC';
  }
}