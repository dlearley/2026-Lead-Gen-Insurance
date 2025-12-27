// Referral Service - Business logic for referral management
import { ReferralRepository } from '../repositories/referral.repository';
import { PartnerRepository } from '../repositories/partner.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { CreateReferralDto, UpdateReferralDto, ReferralFilterParams } from '@platform/types';
import { EventService } from './event.service';

export class ReferralService {
  
  /**
   * Create a new referral
   */
  static async create(createReferralDto: CreateReferralDto): Promise<any> {
    try {
      // Validate partner exists and is active
      const partner = await PartnerRepository.findById(createReferralDto.partnerId);
      if (!partner || partner.status !== 'ACTIVE') {
        throw new Error('Invalid or inactive partner');
      }
      
      // Validate referral code matches partner
      if (partner.referralCode !== createReferralDto.referralCode) {
        throw new Error('Invalid referral code for this partner');
      }
      
      // Create the referral
      const referral = await ReferralRepository.create(createReferralDto);
      
      // Update partner statistics
      await PartnerRepository.updateStatistics(partner.id, {
        totalReferrals: partner.totalReferrals + 1
      });
      
      // Log event
      await EventService.logEvent({
        type: 'referral_created',
        source: 'referral_service',
        entityType: 'REFERRAL',
        entityId: referral.id,
        data: {
          referralId: referral.id,
          partnerId: referral.partnerId,
          referralCode: referral.referralCode,
          source: referral.source
        }
      });
      
      return referral;
    } catch (error) {
      throw new Error(`Failed to create referral: ${error.message}`);
    }
  }

  /**
   * Get referral by ID
   */
  static async getById(id: string): Promise<any> {
    try {
      const referral = await ReferralRepository.findById(id);
      if (!referral) {
        throw new Error('Referral not found');
      }
      return referral;
    } catch (error) {
      throw new Error(`Failed to get referral: ${error.message}`);
    }
  }

  /**
   * Get referrals by partner ID
   */
  static async getByPartnerId(partnerId: string): Promise<any[]> {
    try {
      return await ReferralRepository.findByPartnerId(partnerId);
    } catch (error) {
      throw new Error(`Failed to get referrals: ${error.message}`);
    }
  }

  /**
   * Get referral by lead ID
   */
  static async getByLeadId(leadId: string): Promise<any> {
    try {
      return await ReferralRepository.findByLeadId(leadId);
    } catch (error) {
      throw new Error(`Failed to get referral: ${error.message}`);
    }
  }

  /**
   * Get referrals by referral code
   */
  static async getByReferralCode(referralCode: string): Promise<any[]> {
    try {
      return await ReferralRepository.findByReferralCode(referralCode);
    } catch (error) {
      throw new Error(`Failed to get referrals: ${error.message}`);
    }
  }

  /**
   * Get all referrals with filtering and pagination
   */
  static async getAll(params: ReferralFilterParams): Promise<{ data: any[], total: number }> {
    try {
      return await ReferralRepository.findAll(params);
    } catch (error) {
      throw new Error(`Failed to get referrals: ${error.message}`);
    }
  }

  /**
   * Update referral
   */
  static async update(id: string, updateReferralDto: UpdateReferralDto): Promise<any> {
    try {
      // Get current referral
      const currentReferral = await ReferralRepository.findById(id);
      if (!currentReferral) {
        throw new Error('Referral not found');
      }
      
      // Update the referral
      const updatedReferral = await ReferralRepository.update(id, updateReferralDto);
      
      // Handle status changes
      if (updateReferralDto.status && updateReferralDto.status !== currentReferral.status) {
        await this.handleStatusChange(currentReferral, updateReferralDto.status);
      }
      
      // Log event
      await EventService.logEvent({
        type: 'referral_updated',
        source: 'referral_service',
        entityType: 'REFERRAL',
        entityId: updatedReferral.id,
        data: {
          referralId: updatedReferral.id,
          oldStatus: currentReferral.status,
          newStatus: updatedReferral.status,
          changes: Object.keys(updateReferralDto)
        }
      });
      
      return updatedReferral;
    } catch (error) {
      throw new Error(`Failed to update referral: ${error.message}`);
    }
  }

  /**
   * Handle referral status change
   */
  private static async handleStatusChange(referral: any, newStatus: string): Promise<void> {
    const partner = await PartnerRepository.findById(referral.partnerId);
    
    if (newStatus === 'CONVERTED' && referral.conversionValue) {
      // Calculate and create reward
      const reward = await RewardRepository.calculateReward(
        referral.id, 
        referral.conversionValue
      );
      
      // Update partner statistics
      await PartnerRepository.updateStatistics(partner.id, {
        successfulReferrals: partner.successfulReferrals + 1,
        totalEarnings: partner.totalEarnings + reward.amount
      });
      
      // Log reward creation event
      await EventService.logEvent({
        type: 'reward_created',
        source: 'referral_service',
        entityType: 'REWARD',
        entityId: reward.id,
        data: {
          rewardId: reward.id,
          referralId: referral.id,
          partnerId: partner.id,
          amount: reward.amount
        }
      });
    }
  }

  /**
   * Link referral to lead
   */
  static async linkToLead(referralId: string, leadId: string): Promise<any> {
    try {
      // Get referral and lead
      const referral = await ReferralRepository.findById(referralId);
      if (!referral) {
        throw new Error('Referral not found');
      }
      
      // Link referral to lead
      const updatedReferral = await ReferralRepository.linkToLead(referralId, leadId);
      
      // Update status to ACCEPTED if it was PENDING
      if (referral.status === 'PENDING') {
        await ReferralRepository.updateStatus(referralId, 'ACCEPTED');
      }
      
      // Log event
      await EventService.logEvent({
        type: 'referral_linked_to_lead',
        source: 'referral_service',
        entityType: 'REFERRAL',
        entityId: referral.id,
        data: {
          referralId: referral.id,
          leadId
        }
      });
      
      return updatedReferral;
    } catch (error) {
      throw new Error(`Failed to link referral to lead: ${error.message}`);
    }
  }

  /**
   * Delete referral
   */
  static async delete(id: string): Promise<any> {
    try {
      // Get current referral
      const referral = await ReferralRepository.findById(id);
      if (!referral) {
        throw new Error('Referral not found');
      }
      
      // Delete the referral
      const deletedReferral = await ReferralRepository.delete(id);
      
      // Log event
      await EventService.logEvent({
        type: 'referral_deleted',
        source: 'referral_service',
        entityType: 'REFERRAL',
        entityId: deletedReferral.id,
        data: {
          referralId: deletedReferral.id,
          partnerId: deletedReferral.partnerId
        }
      });
      
      return deletedReferral;
    } catch (error) {
      throw new Error(`Failed to delete referral: ${error.message}`);
    }
  }

  /**
   * Get referral statistics
   */
  static async getStatistics(): Promise<any> {
    try {
      return await ReferralRepository.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get referral statistics: ${error.message}`);
    }
  }

  /**
   * Get referral statistics by partner
   */
  static async getStatisticsByPartner(partnerId: string): Promise<any> {
    try {
      return await ReferralRepository.getStatisticsByPartner(partnerId);
    } catch (error) {
      throw new Error(`Failed to get partner referral statistics: ${error.message}`);
    }
  }

  /**
   * Get referral source distribution
   */
  static async getSourceDistribution(): Promise<any> {
    try {
      return await ReferralRepository.getSourceDistribution();
    } catch (error) {
      throw new Error(`Failed to get referral source distribution: ${error.message}`);
    }
  }

  /**
   * Process referral conversion
   */
  static async processConversion(referralId: string, conversionValue: number): Promise<any> {
    try {
      // Get referral
      const referral = await ReferralRepository.findById(referralId);
      if (!referral) {
        throw new Error('Referral not found');
      }
      
      // Update referral status and conversion value
      const updatedReferral = await ReferralRepository.update(referralId, {
        status: 'CONVERTED',
        conversionValue
      });
      
      // Calculate reward
      const reward = await RewardRepository.calculateReward(referralId, conversionValue);
      
      // Update partner statistics
      const partner = await PartnerRepository.findById(referral.partnerId);
      await PartnerRepository.updateStatistics(partner.id, {
        successfulReferrals: partner.successfulReferrals + 1,
        totalEarnings: partner.totalEarnings + reward.amount
      });
      
      return {
        referral: updatedReferral,
        reward
      };
    } catch (error) {
      throw new Error(`Failed to process referral conversion: ${error.message}`);
    }
  }

  /**
   * Check for expired referrals and update their status
   */
  static async checkExpiredReferrals(expiryDays: number = 30): Promise<number> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - expiryDays);
      
      // Find referrals that are still pending and older than expiry date
      const expiredReferrals = await prisma.referral.findMany({
        where: {
          status: 'PENDING',
          referredAt: { lt: expiryDate }
        }
      });
      
      // Update status to EXPIRED
      const updatePromises = expiredReferrals.map(referral => 
        ReferralRepository.updateStatus(referral.id, 'EXPIRED')
      );
      
      await Promise.all(updatePromises);
      
      return expiredReferrals.length;
    } catch (error) {
      throw new Error(`Failed to check expired referrals: ${error.message}`);
    }
  }

  /**
   * Get referral conversion analytics
   */
  static async getConversionAnalytics(): Promise<any> {
    try {
      const stats = await ReferralRepository.getStatistics();
      const sourceDistribution = await ReferralRepository.getSourceDistribution();
      
      return {
        ...stats,
        sourceDistribution,
        conversionTrends: await this.getConversionTrends()
      };
    } catch (error) {
      throw new Error(`Failed to get conversion analytics: ${error.message}`);
    }
  }

  /**
   * Get conversion trends over time
   */
  private static async getConversionTrends(): Promise<any> {
    // Implementation for conversion trends analysis
    // This would typically analyze conversion rates over time periods
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }
}