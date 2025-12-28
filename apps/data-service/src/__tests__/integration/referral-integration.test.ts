// Referral Program Service Integration Tests
import { PartnerService } from '../../services/partner.service';
import { ReferralService } from '../../services/referral.service';
import { RewardService } from '../../services/reward.service';

describe('Referral Program Service Integration', () => {
  let testPartnerId: string;
  let testReferralId: string;
  
  describe('Partner Service', () => {
    it('should create and retrieve a partner', async () => {
      // Create a partner
      const partner = await PartnerService.create({
        firstName: 'Test',
        lastName: 'Partner',
        email: 'test.partner@example.com',
        phone: '9876543210',
        companyName: 'Integration Test Co',
        commissionRate: 0.2
      });
      
      expect(partner).toHaveProperty('id');
      expect(partner).toHaveProperty('referralCode');
      expect(partner.email).toBe('test.partner@example.com');
      expect(partner.commissionRate).toBe(0.2);
      
      testPartnerId = partner.id;
      
      // Retrieve the partner
      const retrievedPartner = await PartnerService.getById(partner.id);
      expect(retrievedPartner.id).toBe(partner.id);
      expect(retrievedPartner.email).toBe('test.partner@example.com');
    });
    
    it('should validate referral code', async () => {
      const partner = await PartnerService.getById(testPartnerId);
      const isValid = await PartnerService.validateReferralCode(partner.referralCode);
      expect(isValid).toBe(true);
    });
  });
  
  describe('Referral Service', () => {
    it('should create and manage a referral', async () => {
      const partner = await PartnerService.getById(testPartnerId);
      
      // Create a referral
      const referral = await ReferralService.create({
        partnerId: partner.id,
        referralCode: partner.referralCode,
        source: 'website',
        notes: 'Integration test referral'
      });
      
      expect(referral).toHaveProperty('id');
      expect(referral.partnerId).toBe(partner.id);
      expect(referral.status).toBe('PENDING');
      
      testReferralId = referral.id;
      
      // Update referral status
      const updatedReferral = await ReferralService.update(referral.id, {
        status: 'ACCEPTED'
      });
      
      expect(updatedReferral.status).toBe('ACCEPTED');
    });
    
    it('should process referral conversion and create reward', async () => {
      // Process conversion
      const result = await ReferralService.processConversion(testReferralId, 2000);
      
      expect(result).toHaveProperty('referral');
      expect(result).toHaveProperty('reward');
      expect(result.referral.status).toBe('CONVERTED');
      expect(result.reward.amount).toBe(400); // 20% of 2000
      expect(result.reward.status).toBe('CALCULATED');
    });
  });
  
  describe('Reward Service', () => {
    it('should process reward payment', async () => {
      // Get the referral to find the reward
      const referral = await ReferralService.getById(testReferralId);
      const rewardId = referral.reward.id;
      
      // Process payment
      const paidReward = await RewardService.processPayment(rewardId, {
        paymentMethod: 'PAYPAL',
        transactionId: 'PAY-67890'
      });
      
      expect(paidReward.status).toBe('PAID');
      expect(paidReward.paymentMethod).toBe('PAYPAL');
      expect(paidReward.transactionId).toBe('PAY-67890');
    });
  });
  
  describe('Statistics', () => {
    it('should get partner statistics', async () => {
      const stats = await PartnerService.getStatistics();
      expect(stats).toHaveProperty('totalPartners');
      expect(stats).toHaveProperty('activePartners');
      expect(stats.totalPartners).toBeGreaterThan(0);
    });
    
    it('should get referral statistics', async () => {
      const stats = await ReferralService.getStatistics();
      expect(stats).toHaveProperty('totalReferrals');
      expect(stats).toHaveProperty('convertedReferrals');
      expect(stats.totalReferrals).toBeGreaterThan(0);
    });
    
    it('should get reward statistics', async () => {
      const stats = await RewardService.getStatistics();
      expect(stats).toHaveProperty('totalRewards');
      expect(stats).toHaveProperty('paidRewards');
      expect(stats.totalRewards).toBeGreaterThan(0);
    });
  });
});