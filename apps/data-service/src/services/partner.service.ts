// Partner Service - Business logic for partner management
import { PartnerRepository } from '../repositories/partner.repository';
import { CreatePartnerDto, UpdatePartnerDto, PartnerFilterParams } from '@platform/types';
import { EventService } from './event.service';

export class PartnerService {
  
  /**
   * Create a new partner
   */
  static async create(createPartnerDto: CreatePartnerDto): Promise<any> {
    try {
      // Check if partner with this email already exists
      const existingPartner = await PartnerRepository.findByEmail(createPartnerDto.email);
      if (existingPartner) {
        throw new Error('Partner with this email already exists');
      }
      
      // Create the partner
      const partner = await PartnerRepository.create(createPartnerDto);
      
      // Log event
      await EventService.logEvent({
        type: 'partner_created',
        source: 'partner_service',
        entityType: 'PARTNER',
        entityId: partner.id,
        data: {
          partnerId: partner.id,
          email: partner.email,
          referralCode: partner.referralCode
        }
      });
      
      return partner;
    } catch (error) {
      throw new Error(`Failed to create partner: ${error.message}`);
    }
  }

  /**
   * Get partner by ID
   */
  static async getById(id: string): Promise<any> {
    try {
      const partner = await PartnerRepository.findById(id);
      if (!partner) {
        throw new Error('Partner not found');
      }
      return partner;
    } catch (error) {
      throw new Error(`Failed to get partner: ${error.message}`);
    }
  }

  /**
   * Get partner by email
   */
  static async getByEmail(email: string): Promise<any> {
    try {
      const partner = await PartnerRepository.findByEmail(email);
      if (!partner) {
        throw new Error('Partner not found');
      }
      return partner;
    } catch (error) {
      throw new Error(`Failed to get partner: ${error.message}`);
    }
  }

  /**
   * Get partner by referral code
   */
  static async getByReferralCode(referralCode: string): Promise<any> {
    try {
      const partner = await PartnerRepository.findByReferralCode(referralCode);
      if (!partner) {
        throw new Error('Partner not found');
      }
      return partner;
    } catch (error) {
      throw new Error(`Failed to get partner: ${error.message}`);
    }
  }

  /**
   * Get all partners with filtering and pagination
   */
  static async getAll(params: PartnerFilterParams): Promise<{ data: any[], total: number }> {
    try {
      return await PartnerRepository.findAll(params);
    } catch (error) {
      throw new Error(`Failed to get partners: ${error.message}`);
    }
  }

  /**
   * Update partner
   */
  static async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<any> {
    try {
      // Check if partner exists
      const existingPartner = await PartnerRepository.findById(id);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }
      
      // Update the partner
      const updatedPartner = await PartnerRepository.update(id, updatePartnerDto);
      
      // Log event
      await EventService.logEvent({
        type: 'partner_updated',
        source: 'partner_service',
        entityType: 'PARTNER',
        entityId: updatedPartner.id,
        data: {
          partnerId: updatedPartner.id,
          changes: Object.keys(updatePartnerDto)
        }
      });
      
      return updatedPartner;
    } catch (error) {
      throw new Error(`Failed to update partner: ${error.message}`);
    }
  }

  /**
   * Update partner statistics
   */
  static async updateStatistics(partnerId: string, updates: {
    totalReferrals?: number;
    successfulReferrals?: number;
    totalEarnings?: number;
  }): Promise<any> {
    try {
      return await PartnerRepository.updateStatistics(partnerId, updates);
    } catch (error) {
      throw new Error(`Failed to update partner statistics: ${error.message}`);
    }
  }

  /**
   * Delete partner (soft delete)
   */
  static async delete(id: string): Promise<any> {
    try {
      // Check if partner exists
      const existingPartner = await PartnerRepository.findById(id);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }
      
      // Delete the partner
      const deletedPartner = await PartnerRepository.delete(id);
      
      // Log event
      await EventService.logEvent({
        type: 'partner_deleted',
        source: 'partner_service',
        entityType: 'PARTNER',
        entityId: deletedPartner.id,
        data: {
          partnerId: deletedPartner.id,
          email: deletedPartner.email
        }
      });
      
      return deletedPartner;
    } catch (error) {
      throw new Error(`Failed to delete partner: ${error.message}`);
    }
  }

  /**
   * Get partner statistics
   */
  static async getStatistics(): Promise<any> {
    try {
      return await PartnerRepository.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get partner statistics: ${error.message}`);
    }
  }

  /**
   * Get top performing partners
   */
  static async getTopPartners(limit: number = 10): Promise<any[]> {
    try {
      const partners = await PartnerRepository.findAll({
        page: 1,
        limit,
        status: 'active'
      });
      
      // Sort by successful referrals (descending)
      return partners.data.sort((a, b) => 
        b.successfulReferrals - a.successfulReferrals
      ).slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get top partners: ${error.message}`);
    }
  }

  /**
   * Validate referral code
   */
  static async validateReferralCode(referralCode: string): Promise<boolean> {
    try {
      const partner = await PartnerRepository.findByReferralCode(referralCode);
      return !!partner && partner.status === 'ACTIVE';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get partner performance summary
   */
  static async getPerformanceSummary(partnerId: string): Promise<any> {
    try {
      const partner = await PartnerRepository.findById(partnerId);
      if (!partner) {
        throw new Error('Partner not found');
      }
      
      const conversionRate = partner.totalReferrals > 0 
        ? partner.successfulReferrals / partner.totalReferrals 
        : 0;
      
      return {
        partnerId: partner.id,
        partnerName: `${partner.firstName} ${partner.lastName}`,
        totalReferrals: partner.totalReferrals,
        successfulReferrals: partner.successfulReferrals,
        conversionRate,
        totalEarnings: partner.totalEarnings,
        averageEarningsPerReferral: partner.successfulReferrals > 0 
          ? partner.totalEarnings / partner.successfulReferrals 
          : 0,
        status: partner.status
      };
    } catch (error) {
      throw new Error(`Failed to get partner performance: ${error.message}`);
    }
  }
}