// Reward Repository - Data access layer for reward management
import { PrismaClient, RewardStatus } from '@prisma/client';
import { CreateRewardDto, UpdateRewardDto, RewardFilterParams } from '@platform/types';

const prisma = new PrismaClient();

export class RewardRepository {
  
  /**
   * Create a new reward
   */
  static async create(createRewardDto: CreateRewardDto): Promise<any> {
    return prisma.reward.create({
      data: {
        partnerId: createRewardDto.partnerId,
        referralId: createRewardDto.referralId,
        amount: createRewardDto.amount,
        currency: createRewardDto.currency || 'USD',
        notes: createRewardDto.notes,
        status: 'PENDING'
      },
      include: {
        partner: true,
        referral: true
      }
    });
  }

  /**
   * Find reward by ID
   */
  static async findById(id: string): Promise<any> {
    return prisma.reward.findUnique({
      where: { id },
      include: {
        partner: true,
        referral: true
      }
    });
  }

  /**
   * Find rewards by partner ID
   */
  static async findByPartnerId(partnerId: string): Promise<any[]> {
    return prisma.reward.findMany({
      where: { partnerId },
      include: {
        partner: true,
        referral: true
      },
      orderBy: { calculatedAt: 'desc' }
    });
  }

  /**
   * Find rewards by referral ID
   */
  static async findByReferralId(referralId: string): Promise<any> {
    return prisma.reward.findUnique({
      where: { referralId },
      include: {
        partner: true,
        referral: true
      }
    });
  }

  /**
   * Find all rewards with filtering and pagination
   */
  static async findAll(params: RewardFilterParams): Promise<{ data: any[], total: number }> {
    const { 
      page = 1, 
      limit = 10, 
      partnerId, 
      referralId, 
      status, 
      dateFrom, 
      dateTo,
      search 
    } = params;
    
    const where: any = {};
    
    if (partnerId) where.partnerId = partnerId;
    if (referralId) where.referralId = referralId;
    if (status) where.status = status.toUpperCase() as RewardStatus;
    
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { paymentMethod: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      where.calculatedAt = {};
      if (dateFrom) where.calculatedAt.gte = new Date(dateFrom);
      if (dateTo) where.calculatedAt.lte = new Date(dateTo);
    }
    
    const [data, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { calculatedAt: 'desc' },
        include: {
          partner: true,
          referral: true
        }
      }),
      prisma.reward.count({ where })
    ]);
    
    return { data, total };
  }

  /**
   * Update reward
   */
  static async update(id: string, updateRewardDto: UpdateRewardDto): Promise<any> {
    const updateData: any = {
      status: updateRewardDto.status?.toUpperCase(),
      amount: updateRewardDto.amount,
      paymentMethod: updateRewardDto.paymentMethod,
      transactionId: updateRewardDto.transactionId,
      notes: updateRewardDto.notes
    };
    
    // Set paid timestamp if status is PAID
    if (updateRewardDto.status?.toUpperCase() === 'PAID') {
      updateData.paidAt = new Date();
    }
    
    return prisma.reward.update({
      where: { id },
      data: updateData,
      include: {
        partner: true,
        referral: true
      }
    });
  }

  /**
   * Update reward status
   */
  static async updateStatus(id: string, status: RewardStatus): Promise<any> {
    const updateData: any = { status };
    
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }
    
    return prisma.reward.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Delete reward
   */
  static async delete(id: string): Promise<any> {
    return prisma.reward.delete({
      where: { id }
    });
  }

  /**
   * Calculate reward for a referral
   */
  static async calculateReward(referralId: string, conversionValue: number): Promise<any> {
    // Get the referral with partner information
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: { partner: true }
    });
    
    if (!referral || !referral.partner) {
      throw new Error('Referral or partner not found');
    }
    
    // Calculate reward amount based on partner's commission rate
    const amount = conversionValue * referral.partner.commissionRate;
    
    return prisma.reward.create({
      data: {
        partnerId: referral.partnerId,
        referralId: referral.id,
        amount,
        currency: 'USD',
        status: 'CALCULATED',
        notes: `Automatically calculated reward for referral ${referral.id}`
      }
    });
  }

  /**
   * Get reward statistics
   */
  static async getStatistics(): Promise<any> {
    const [totalRewards, pendingRewards, paidRewards, totalAmount] = 
      await Promise.all([
        prisma.reward.count(),
        prisma.reward.count({ where: { status: 'PENDING' } }),
        prisma.reward.count({ where: { status: 'PAID' } }),
        prisma.reward.aggregate({ 
          where: { status: 'PAID' },
          _sum: { amount: true }
        })
      ]);
    
    return {
      totalRewards,
      pendingRewards,
      paidRewards,
      totalAmount: totalAmount._sum.amount || 0,
      averageReward: totalRewards > 0 ? (totalAmount._sum.amount || 0) / totalRewards : 0
    };
  }

  /**
   * Get reward statistics by partner
   */
  static async getStatisticsByPartner(partnerId: string): Promise<any> {
    const [totalRewards, paidRewards, totalAmount] = await Promise.all([
      prisma.reward.count({ where: { partnerId } }),
      prisma.reward.count({ 
        where: { 
          partnerId,
          status: 'PAID'
        } 
      }),
      prisma.reward.aggregate({ 
        where: { 
          partnerId,
          status: 'PAID'
        },
        _sum: { amount: true }
      })
    ]);
    
    return {
      partnerId,
      totalRewards,
      paidRewards,
      totalAmount: totalAmount._sum.amount || 0,
      averageReward: totalRewards > 0 ? (totalAmount._sum.amount || 0) / totalRewards : 0
    };
  }

  /**
   * Get reward status distribution
   */
  static async getStatusDistribution(): Promise<Record<string, number>> {
    const statuses = await prisma.reward.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    
    const distribution: Record<string, number> = {};
    statuses.forEach(s => {
      distribution[s.status] = s._count._all;
    });
    
    return distribution;
  }
}