// Reward Service - Business logic for reward management
import { RewardRepository } from '../repositories/reward.repository';
import { PartnerRepository } from '../repositories/partner.repository';
import { ReferralRepository } from '../repositories/referral.repository';
import { CreateRewardDto, UpdateRewardDto, RewardFilterParams } from '@platform/types';
import { EventService } from './event.service';

export class RewardService {
  
  /**
   * Create a new reward
   */
  static async create(createRewardDto: CreateRewardDto): Promise<any> {
    try {
      // Validate partner and referral exist
      const [partner, referral] = await Promise.all([
        PartnerRepository.findById(createRewardDto.partnerId),
        ReferralRepository.findById(createRewardDto.referralId)
      ]);
      
      if (!partner || !referral) {
        throw new Error('Invalid partner or referral');
      }
      
      // Validate that referral belongs to partner
      if (referral.partnerId !== partner.id) {
        throw new Error('Referral does not belong to this partner');
      }
      
      // Create the reward
      const reward = await RewardRepository.create(createRewardDto);
      
      // Log event
      await EventService.logEvent({
        type: 'reward_created',
        source: 'reward_service',
        entityType: 'REWARD',
        entityId: reward.id,
        data: {
          rewardId: reward.id,
          partnerId: reward.partnerId,
          referralId: reward.referralId,
          amount: reward.amount
        }
      });
      
      return reward;
    } catch (error) {
      throw new Error(`Failed to create reward: ${error.message}`);
    }
  }

  /**
   * Get reward by ID
   */
  static async getById(id: string): Promise<any> {
    try {
      const reward = await RewardRepository.findById(id);
      if (!reward) {
        throw new Error('Reward not found');
      }
      return reward;
    } catch (error) {
      throw new Error(`Failed to get reward: ${error.message}`);
    }
  }

  /**
   * Get rewards by partner ID
   */
  static async getByPartnerId(partnerId: string): Promise<any[]> {
    try {
      return await RewardRepository.findByPartnerId(partnerId);
    } catch (error) {
      throw new Error(`Failed to get rewards: ${error.message}`);
    }
  }

  /**
   * Get reward by referral ID
   */
  static async getByReferralId(referralId: string): Promise<any> {
    try {
      return await RewardRepository.findByReferralId(referralId);
    } catch (error) {
      throw new Error(`Failed to get reward: ${error.message}`);
    }
  }

  /**
   * Get all rewards with filtering and pagination
   */
  static async getAll(params: RewardFilterParams): Promise<{ data: any[], total: number }> {
    try {
      return await RewardRepository.findAll(params);
    } catch (error) {
      throw new Error(`Failed to get rewards: ${error.message}`);
    }
  }

  /**
   * Update reward
   */
  static async update(id: string, updateRewardDto: UpdateRewardDto): Promise<any> {
    try {
      // Get current reward
      const currentReward = await RewardRepository.findById(id);
      if (!currentReward) {
        throw new Error('Reward not found');
      }
      
      // Update the reward
      const updatedReward = await RewardRepository.update(id, updateRewardDto);
      
      // Handle status changes
      if (updateRewardDto.status && updateRewardDto.status !== currentReward.status) {
        await this.handleStatusChange(currentReward, updateRewardDto.status);
      }
      
      // Log event
      await EventService.logEvent({
        type: 'reward_updated',
        source: 'reward_service',
        entityType: 'REWARD',
        entityId: updatedReward.id,
        data: {
          rewardId: updatedReward.id,
          oldStatus: currentReward.status,
          newStatus: updatedReward.status,
          changes: Object.keys(updateRewardDto)
        }
      });
      
      return updatedReward;
    } catch (error) {
      throw new Error(`Failed to update reward: ${error.message}`);
    }
  }

  /**
   * Handle reward status change
   */
  private static async handleStatusChange(reward: any, newStatus: string): Promise<void> {
    if (newStatus === 'PAID') {
      // Update partner earnings
      const partner = await PartnerRepository.findById(reward.partnerId);
      await PartnerRepository.updateStatistics(partner.id, {
        totalEarnings: partner.totalEarnings + reward.amount
      });
    }
  }

  /**
   * Delete reward
   */
  static async delete(id: string): Promise<any> {
    try {
      // Get current reward
      const reward = await RewardRepository.findById(id);
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      // Delete the reward
      const deletedReward = await RewardRepository.delete(id);
      
      // Log event
      await EventService.logEvent({
        type: 'reward_deleted',
        source: 'reward_service',
        entityType: 'REWARD',
        entityId: deletedReward.id,
        data: {
          rewardId: deletedReward.id,
          partnerId: deletedReward.partnerId
        }
      });
      
      return deletedReward;
    } catch (error) {
      throw new Error(`Failed to delete reward: ${error.message}`);
    }
  }

  /**
   * Calculate reward for a referral
   */
  static async calculateReward(referralId: string, conversionValue: number): Promise<any> {
    try {
      return await RewardRepository.calculateReward(referralId, conversionValue);
    } catch (error) {
      throw new Error(`Failed to calculate reward: ${error.message}`);
    }
  }

  /**
   * Process reward payment
   */
  static async processPayment(rewardId: string, paymentDetails: {
    paymentMethod: string;
    transactionId: string;
  }): Promise<any> {
    try {
      // Update reward status to PAID
      const updatedReward = await RewardRepository.update(rewardId, {
        status: 'PAID',
        paymentMethod: paymentDetails.paymentMethod,
        transactionId: paymentDetails.transactionId,
        paidAt: new Date()
      });
      
      // Update partner statistics
      const partner = await PartnerRepository.findById(updatedReward.partnerId);
      await PartnerRepository.updateStatistics(partner.id, {
        totalEarnings: partner.totalEarnings + updatedReward.amount
      });
      
      // Log event
      await EventService.logEvent({
        type: 'reward_paid',
        source: 'reward_service',
        entityType: 'REWARD',
        entityId: updatedReward.id,
        data: {
          rewardId: updatedReward.id,
          partnerId: updatedReward.partnerId,
          amount: updatedReward.amount,
          paymentMethod: paymentDetails.paymentMethod,
          transactionId: paymentDetails.transactionId
        }
      });
      
      return updatedReward;
    } catch (error) {
      throw new Error(`Failed to process reward payment: ${error.message}`);
    }
  }

  /**
   * Get reward statistics
   */
  static async getStatistics(): Promise<any> {
    try {
      return await RewardRepository.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get reward statistics: ${error.message}`);
    }
  }

  /**
   * Get reward statistics by partner
   */
  static async getStatisticsByPartner(partnerId: string): Promise<any> {
    try {
      return await RewardRepository.getStatisticsByPartner(partnerId);
    } catch (error) {
      throw new Error(`Failed to get partner reward statistics: ${error.message}`);
    }
  }

  /**
   * Get reward status distribution
   */
  static async getStatusDistribution(): Promise<any> {
    try {
      return await RewardRepository.getStatusDistribution();
    } catch (error) {
      throw new Error(`Failed to get reward status distribution: ${error.message}`);
    }
  }

  /**
   * Get pending rewards that need processing
   */
  static async getPendingRewards(): Promise<any[]> {
    try {
      return await RewardRepository.findAll({
        status: 'pending',
        limit: 100
      }).then(result => result.data);
    } catch (error) {
      throw new Error(`Failed to get pending rewards: ${error.message}`);
    }
  }

  /**
   * Get reward payment summary
   */
  static async getPaymentSummary(): Promise<any> {
    try {
      const stats = await RewardRepository.getStatistics();
      const distribution = await RewardRepository.getStatusDistribution();
      
      return {
        ...stats,
        statusDistribution: distribution,
        pendingPaymentAmount: await this.getPendingPaymentAmount()
      };
    } catch (error) {
      throw new Error(`Failed to get payment summary: ${error.message}`);
    }
  }

  /**
   * Get total pending payment amount
   */
  private static async getPendingPaymentAmount(): Promise<number> {
    const pendingRewards = await RewardRepository.findAll({
      status: 'approved',
      limit: 1000
    });
    
    return pendingRewards.data.reduce((sum, reward) => sum + reward.amount, 0);
  }

  /**
   * Approve multiple rewards for payment
   */
  static async bulkApprove(rewardIds: string[]): Promise<number> {
    try {
      const updatePromises = rewardIds.map(rewardId =>
        RewardRepository.updateStatus(rewardId, 'APPROVED')
      );
      
      await Promise.all(updatePromises);
      return rewardIds.length;
    } catch (error) {
      throw new Error(`Failed to bulk approve rewards: ${error.message}`);
    }
  }

  /**
   * Get reward payout history
   */
  static async getPayoutHistory(partnerId?: string, limit: number = 50): Promise<any[]> {
    try {
      const params: RewardFilterParams = {
        status: 'paid',
        limit,
        page: 1
      };
      
      if (partnerId) {
        params.partnerId = partnerId;
      }
      
      const result = await RewardRepository.findAll(params);
      return result.data;
    } catch (error) {
      throw new Error(`Failed to get payout history: ${error.message}`);
    }
  }
}