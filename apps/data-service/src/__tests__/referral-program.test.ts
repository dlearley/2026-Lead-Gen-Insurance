// Referral Program Integration Tests
import request from 'supertest';
import express from 'express';
import { PartnerService } from '../services/partner.service';
import { ReferralService } from '../services/referral.service';
import { RewardService } from '../services/reward.service';
import partnerRoutes from '../routes/partners.routes';
import referralRoutes from '../routes/referrals.routes';
import rewardRoutes from '../routes/rewards.routes';

describe('Referral Program Integration Tests', () => {
  let app: express.Express;
  let testPartnerId: string;
  let testReferralId: string;
  
  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware for testing
    app.use((req, res, next) => {
      req.user = {
        userId: 'test-user',
        role: 'ADMIN',
        email: 'test@example.com'
      };
      next();
    });
    
    // Register routes
    app.use('/api/v1/partners', partnerRoutes);
    app.use('/api/v1/referrals', referralRoutes);
    app.use('/api/v1/rewards', rewardRoutes);
  });
  
  describe('Partner Management', () => {
    it('should create a new partner', async () => {
      const response = await request(app)
        .post('/api/v1/partners')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '1234567890',
          companyName: 'Test Company',
          commissionRate: 0.15
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('referralCode');
      expect(response.body.email).toBe('john.doe@example.com');
      expect(response.body.commissionRate).toBe(0.15);
      
      testPartnerId = response.body.id;
    });
    
    it('should get partner by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/partners/${testPartnerId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testPartnerId);
    });
    
    it('should get partner by email', async () => {
      const response = await request(app)
        .get('/api/v1/partners/email/john.doe@example.com');
      
      expect(response.status).toBe(200);
      expect(response.body.email).toBe('john.doe@example.com');
    });
    
    it('should validate referral code', async () => {
      // First get the partner to get the referral code
      const partnerResponse = await request(app)
        .get(`/api/v1/partners/${testPartnerId}`);
      
      const referralCode = partnerResponse.body.referralCode;
      
      const validationResponse = await request(app)
        .get(`/api/v1/partners/validate-referral-code/${referralCode}`);
      
      expect(validationResponse.status).toBe(200);
      expect(validationResponse.body.valid).toBe(true);
    });
  });
  
  describe('Referral Management', () => {
    it('should create a new referral', async () => {
      // Get partner referral code first
      const partnerResponse = await request(app)
        .get(`/api/v1/partners/${testPartnerId}`);
      
      const referralCode = partnerResponse.body.referralCode;
      
      const response = await request(app)
        .post('/api/v1/referrals')
        .send({
          partnerId: testPartnerId,
          referralCode: referralCode,
          source: 'website',
          notes: 'Test referral from integration test'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.partnerId).toBe(testPartnerId);
      expect(response.body.status).toBe('PENDING');
      
      testReferralId = response.body.id;
    });
    
    it('should get referral by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/referrals/${testReferralId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testReferralId);
    });
    
    it('should get referrals by partner ID', async () => {
      const response = await request(app)
        .get(`/api/v1/referrals/partner/${testPartnerId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
    
    it('should update referral status', async () => {
      const response = await request(app)
        .put(`/api/v1/referrals/${testReferralId}`)
        .send({
          status: 'ACCEPTED'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ACCEPTED');
    });
  });
  
  describe('Reward Management', () => {
    it('should calculate reward for converted referral', async () => {
      // First update referral to CONVERTED status
      await request(app)
        .put(`/api/v1/referrals/${testReferralId}`)
        .send({
          status: 'CONVERTED',
          conversionValue: 1000
        });
      
      // Now calculate the reward
      const response = await request(app)
        .post(`/api/v1/rewards/${testReferralId}/calculate`)
        .send({
          conversionValue: 1000
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.referralId).toBe(testReferralId);
      expect(response.body.amount).toBe(150); // 15% of 1000
      expect(response.body.status).toBe('CALCULATED');
    });
    
    it('should process reward payment', async () => {
      // First get the reward ID from the referral
      const referralResponse = await request(app)
        .get(`/api/v1/referrals/${testReferralId}`);
      
      const rewardId = referralResponse.body.reward.id;
      
      const response = await request(app)
        .post(`/api/v1/rewards/${rewardId}/process-payment`)
        .send({
          paymentMethod: 'BANK_TRANSFER',
          transactionId: 'TXN-12345'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PAID');
      expect(response.body.paymentMethod).toBe('BANK_TRANSFER');
      expect(response.body.transactionId).toBe('TXN-12345');
    });
  });
  
  describe('Statistics and Analytics', () => {
    it('should get partner statistics', async () => {
      const response = await request(app)
        .get('/api/v1/partners/statistics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalPartners');
      expect(response.body).toHaveProperty('activePartners');
    });
    
    it('should get referral statistics', async () => {
      const response = await request(app)
        .get('/api/v1/referrals/statistics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalReferrals');
      expect(response.body).toHaveProperty('convertedReferrals');
    });
    
    it('should get reward statistics', async () => {
      const response = await request(app)
        .get('/api/v1/rewards/statistics');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalRewards');
      expect(response.body).toHaveProperty('paidRewards');
    });
  });
});