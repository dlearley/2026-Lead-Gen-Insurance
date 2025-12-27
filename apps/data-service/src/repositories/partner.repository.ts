// Partner Repository - Data access layer for partner management
import { PrismaClient, PartnerStatus } from '@prisma/client';
import { CreatePartnerDto, UpdatePartnerDto, PartnerFilterParams } from '@platform/types';

const prisma = new PrismaClient();

export class PartnerRepository {
  
  /**
   * Create a new partner
   */
  static async create(createPartnerDto: CreatePartnerDto): Promise<any> {
    const referralCode = this.generateReferralCode(
      createPartnerDto.firstName,
      createPartnerDto.lastName
    );

    return prisma.partner.create({
      data: {
        firstName: createPartnerDto.firstName,
        lastName: createPartnerDto.lastName,
        email: createPartnerDto.email,
        phone: createPartnerDto.phone,
        companyName: createPartnerDto.companyName,
        referralCode,
        commissionRate: createPartnerDto.commissionRate || 0.1,
        userId: createPartnerDto.userId,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Generate a unique referral code
   */
  private static generateReferralCode(firstName: string, lastName: string): string {
    // Create a base code from first 3 letters of first name and last name
    const baseCode = (
      (firstName.substring(0, 3) + lastName.substring(0, 3)).toUpperCase()
    );
    
    // Add random 4-digit number to ensure uniqueness
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    return `${baseCode}${randomSuffix}`;
  }

  /**
   * Find partner by ID
   */
  static async findById(id: string): Promise<any> {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        referrals: true,
        rewards: true
      }
    });
  }

  /**
   * Find partner by email
   */
  static async findByEmail(email: string): Promise<any> {
    return prisma.partner.findUnique({
      where: { email },
      include: {
        referrals: true,
        rewards: true
      }
    });
  }

  /**
   * Find partner by referral code
   */
  static async findByReferralCode(referralCode: string): Promise<any> {
    return prisma.partner.findUnique({
      where: { referralCode },
      include: {
        referrals: true,
        rewards: true
      }
    });
  }

  /**
   * Find all partners with filtering and pagination
   */
  static async findAll(params: PartnerFilterParams): Promise<{ data: any[], total: number }> {
    const { page = 1, limit = 10, status, search, dateFrom, dateTo } = params;
    
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase() as PartnerStatus;
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    
    const [data, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrals: true,
          rewards: true
        }
      }),
      prisma.partner.count({ where })
    ]);
    
    return { data, total };
  }

  /**
   * Update partner
   */
  static async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<any> {
    return prisma.partner.update({
      where: { id },
      data: {
        firstName: updatePartnerDto.firstName,
        lastName: updatePartnerDto.lastName,
        email: updatePartnerDto.email,
        phone: updatePartnerDto.phone,
        companyName: updatePartnerDto.companyName,
        commissionRate: updatePartnerDto.commissionRate,
        status: updatePartnerDto.status?.toUpperCase(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update partner statistics
   */
  static async updateStatistics(id: string, updates: {
    totalReferrals?: number;
    successfulReferrals?: number;
    totalEarnings?: number;
  }): Promise<any> {
    return prisma.partner.update({
      where: { id },
      data: {
        totalReferrals: updates.totalReferrals,
        successfulReferrals: updates.successfulReferrals,
        totalEarnings: updates.totalEarnings,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete partner (soft delete by marking as terminated)
   */
  static async delete(id: string): Promise<any> {
    return prisma.partner.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get partner statistics
   */
  static async getStatistics(): Promise<any> {
    const [totalPartners, activePartners, totalReferrals, successfulReferrals, totalEarnings] = 
      await Promise.all([
        prisma.partner.count(),
        prisma.partner.count({ where: { status: 'ACTIVE' } }),
        prisma.partner.aggregate({ _sum: { totalReferrals: true } }),
        prisma.partner.aggregate({ _sum: { successfulReferrals: true } }),
        prisma.partner.aggregate({ _sum: { totalEarnings: true } })
      ]);
    
    return {
      totalPartners,
      activePartners,
      totalReferrals: totalReferrals._sum.totalReferrals || 0,
      successfulReferrals: successfulReferrals._sum.successfulReferrals || 0,
      totalEarnings: totalEarnings._sum.totalEarnings || 0,
      averageReferralsPerPartner: totalPartners > 0 
        ? (totalReferrals._sum.totalReferrals || 0) / totalPartners 
        : 0,
      conversionRate: totalReferrals._sum.totalReferrals > 0 
        ? (successfulReferrals._sum.successfulReferrals || 0) / (totalReferrals._sum.totalReferrals || 1) 
        : 0
    };
  }
}