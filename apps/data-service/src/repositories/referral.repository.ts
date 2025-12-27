// Referral Repository - Data access layer for referral management
import { PrismaClient, ReferralStatus, ReferralSource } from '@prisma/client';
import { CreateReferralDto, UpdateReferralDto, ReferralFilterParams } from '@platform/types';

const prisma = new PrismaClient();

export class ReferralRepository {
  
  /**
   * Create a new referral
   */
  static async create(createReferralDto: CreateReferralDto): Promise<any> {
    return prisma.referral.create({
      data: {
        partnerId: createReferralDto.partnerId,
        referralCode: createReferralDto.referralCode,
        source: createReferralDto.source.toUpperCase() as ReferralSource,
        leadId: createReferralDto.leadId,
        notes: createReferralDto.notes,
        status: 'PENDING'
      },
      include: {
        partner: true,
        lead: true
      }
    });
  }

  /**
   * Find referral by ID
   */
  static async findById(id: string): Promise<any> {
    return prisma.referral.findUnique({
      where: { id },
      include: {
        partner: true,
        lead: true,
        reward: true
      }
    });
  }

  /**
   * Find referrals by partner ID
   */
  static async findByPartnerId(partnerId: string): Promise<any[]> {
    return prisma.referral.findMany({
      where: { partnerId },
      include: {
        partner: true,
        lead: true,
        reward: true
      },
      orderBy: { referredAt: 'desc' }
    });
  }

  /**
   * Find referrals by lead ID
   */
  static async findByLeadId(leadId: string): Promise<any> {
    return prisma.referral.findUnique({
      where: { leadId },
      include: {
        partner: true,
        lead: true,
        reward: true
      }
    });
  }

  /**
   * Find referrals by referral code
   */
  static async findByReferralCode(referralCode: string): Promise<any[]> {
    return prisma.referral.findMany({
      where: { referralCode },
      include: {
        partner: true,
        lead: true,
        reward: true
      },
      orderBy: { referredAt: 'desc' }
    });
  }

  /**
   * Find all referrals with filtering and pagination
   */
  static async findAll(params: ReferralFilterParams): Promise<{ data: any[], total: number }> {
    const { 
      page = 1, 
      limit = 10, 
      partnerId, 
      leadId, 
      status, 
      source, 
      dateFrom, 
      dateTo,
      search 
    } = params;
    
    const where: any = {};
    
    if (partnerId) where.partnerId = partnerId;
    if (leadId) where.leadId = leadId;
    if (status) where.status = status.toUpperCase() as ReferralStatus;
    if (source) where.source = source.toUpperCase() as ReferralSource;
    
    if (search) {
      where.OR = [
        { referralCode: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      where.referredAt = {};
      if (dateFrom) where.referredAt.gte = new Date(dateFrom);
      if (dateTo) where.referredAt.lte = new Date(dateTo);
    }
    
    const [data, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { referredAt: 'desc' },
        include: {
          partner: true,
          lead: true,
          reward: true
        }
      }),
      prisma.referral.count({ where })
    ]);
    
    return { data, total };
  }

  /**
   * Update referral
   */
  static async update(id: string, updateReferralDto: UpdateReferralDto): Promise<any> {
    const updateData: any = {
      status: updateReferralDto.status?.toUpperCase(),
      notes: updateReferralDto.notes,
      conversionValue: updateReferralDto.conversionValue
    };
    
    // Set appropriate timestamps based on status
    if (updateReferralDto.status) {
      const status = updateReferralDto.status.toUpperCase() as ReferralStatus;
      
      if (status === 'ACCEPTED') {
        updateData.acceptedAt = new Date();
      } else if (status === 'REJECTED') {
        updateData.rejectedAt = new Date();
      } else if (status === 'CONVERTED') {
        updateData.convertedAt = new Date();
      }
    }
    
    if (updateReferralDto.leadId) {
      updateData.leadId = updateReferralDto.leadId;
    }
    
    return prisma.referral.update({
      where: { id },
      data: updateData,
      include: {
        partner: true,
        lead: true,
        reward: true
      }
    });
  }

  /**
   * Update referral status
   */
  static async updateStatus(id: string, status: ReferralStatus): Promise<any> {
    const updateData: any = { status };
    
    // Set appropriate timestamps based on status
    if (status === 'ACCEPTED') {
      updateData.acceptedAt = new Date();
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
    } else if (status === 'CONVERTED') {
      updateData.convertedAt = new Date();
    } else if (status === 'EXPIRED') {
      updateData.rejectedAt = new Date();
    }
    
    return prisma.referral.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Link referral to lead
   */
  static async linkToLead(id: string, leadId: string): Promise<any> {
    return prisma.referral.update({
      where: { id },
      data: { leadId }
    });
  }

  /**
   * Delete referral
   */
  static async delete(id: string): Promise<any> {
    return prisma.referral.delete({
      where: { id }
    });
  }

  /**
   * Get referral statistics
   */
  static async getStatistics(): Promise<any> {
    const [totalReferrals, pendingReferrals, acceptedReferrals, convertedReferrals, rejectedReferrals] = 
      await Promise.all([
        prisma.referral.count(),
        prisma.referral.count({ where: { status: 'PENDING' } }),
        prisma.referral.count({ where: { status: 'ACCEPTED' } }),
        prisma.referral.count({ where: { status: 'CONVERTED' } }),
        prisma.referral.count({ where: { status: 'REJECTED' } })
      ]);
    
    const conversionRate = totalReferrals > 0 ? convertedReferrals / totalReferrals : 0;
    
    return {
      totalReferrals,
      pendingReferrals,
      acceptedReferrals,
      convertedReferrals,
      rejectedReferrals,
      conversionRate,
      acceptanceRate: totalReferrals > 0 ? (acceptedReferrals + convertedReferrals) / totalReferrals : 0
    };
  }

  /**
   * Get referral statistics by partner
   */
  static async getStatisticsByPartner(partnerId: string): Promise<any> {
    const [totalReferrals, convertedReferrals, totalEarnings] = await Promise.all([
      prisma.referral.count({ where: { partnerId } }),
      prisma.referral.count({ 
        where: { 
          partnerId, 
          status: 'CONVERTED' 
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
      totalReferrals,
      convertedReferrals,
      conversionRate: totalReferrals > 0 ? convertedReferrals / totalReferrals : 0,
      totalEarnings: totalEarnings._sum.amount || 0
    };
  }

  /**
   * Get referral source distribution
   */
  static async getSourceDistribution(): Promise<Record<string, number>> {
    const sources = await prisma.referral.groupBy({
      by: ['source'],
      _count: { _all: true }
    });
    
    const distribution: Record<string, number> = {};
    sources.forEach(s => {
      distribution[s.source] = s._count._all;
    });
    
    return distribution;
  }
}