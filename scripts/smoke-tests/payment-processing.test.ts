/**
 * Payment Processing Smoke Tests
 *
 * Verifies payment processing workflows
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string;
let testLeadId: string;
let testPaymentId: string;

beforeAll(async () => {
  // Authenticate as test user
  const authResponse = await apiClient.post('/auth/login', {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password',
  });
  authToken = authResponse.data.token;
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

  // Create test lead
  const leadData = {
    firstName: 'Payment',
    lastName: 'Test',
    email: `payment.test.${Date.now()}@example.com`,
    phone: '555-0123',
    insuranceType: 'auto',
  };
  const leadResponse = await apiClient.post('/leads', leadData);
  testLeadId = leadResponse.data.id;
});

describe('Payment Processing Smoke Tests', () => {
  describe('Payment Quote Generation', () => {
    it('should generate payment quote for lead', async () => {
      const quoteData = {
        leadId: testLeadId,
        coverageAmount: 50000,
        duration: 12,
        paymentFrequency: 'monthly',
      };

      const response = await apiClient.post('/payments/quote', quoteData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('quoteId');
      expect(response.data).toHaveProperty('monthlyPremium');
      expect(response.data).toHaveProperty('totalPremium');
      expect(typeof response.data.monthlyPremium).toBe('number');
    });
  });

  describe('Payment Initialization', () => {
    it('should initialize payment with valid card', async () => {
      const paymentData = {
        leadId: testLeadId,
        amount: 100.00,
        currency: 'USD',
        paymentMethod: {
          type: 'card',
          cardNumber: '4242424242424242', // Test card
          expiryMonth: 12,
          expiryYear: new Date().getFullYear() + 2,
          cvv: '123',
        },
      };

      const response = await apiClient.post('/payments/initialize', paymentData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('paymentIntentId');
      expect(response.data).toHaveProperty('clientSecret');
      testPaymentId = response.data.paymentIntentId;
    });

    it('should validate payment amount', async () => {
      const invalidPaymentData = {
        leadId: testLeadId,
        amount: -50.00, // Negative amount
        paymentMethod: {
          type: 'card',
          cardNumber: '4242424242424242',
          expiryMonth: 12,
          expiryYear: new Date().getFullYear() + 2,
          cvv: '123',
        },
      };

      try {
        await apiClient.post('/payments/initialize', invalidPaymentData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm payment successfully', async () => {
      const response = await apiClient.post(`/payments/${testPaymentId}/confirm`, {
        paymentMethodId: 'pm_card_visa',
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'succeeded');
    });
  });

  describe('Payment Retrieval', () => {
    it('should retrieve payment by ID', async () => {
      const response = await apiClient.get(`/payments/${testPaymentId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testPaymentId);
      expect(response.data).toHaveProperty('amount');
      expect(response.data).toHaveProperty('status');
    });

    it('should retrieve payment history for lead', async () => {
      const response = await apiClient.get(`/leads/${testLeadId}/payments`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Payment Refund', () => {
    it('should initiate refund for payment', async () => {
      const response = await apiClient.post(`/payments/${testPaymentId}/refund`, {
        amount: 50.00,
        reason: 'customer_request',
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('refundId');
      expect(response.data).toHaveProperty('status');
    });
  });

  describe('Payment Webhooks', () => {
    it('should handle payment succeeded webhook', async () => {
      const webhookPayload = {
        id: `evt_${Date.now()}`,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            amount: 10000,
            status: 'succeeded',
          },
        },
      };

      const response = await apiClient.post('/webhooks/payments', webhookPayload, {
        headers: {
          'Stripe-Signature': 'test-signature',
        },
      });
      expect(response.status).toBe(200);
    });

    it('should handle payment failed webhook', async () => {
      const webhookPayload = {
        id: `evt_${Date.now()}`,
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            amount: 10000,
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
            },
          },
        },
      };

      const response = await apiClient.post('/webhooks/payments', webhookPayload, {
        headers: {
          'Stripe-Signature': 'test-signature',
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Payment Validation', () => {
    it('should validate card details', async () => {
      const cardData = {
        cardNumber: '4242424242424242',
        expiryMonth: 12,
        expiryYear: new Date().getFullYear() + 2,
        cvv: '123',
      };

      const response = await apiClient.post('/payments/validate-card', cardData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('valid', true);
      expect(response.data).toHaveProperty('cardType', 'visa');
    });

    it('should reject invalid card', async () => {
      const invalidCardData = {
        cardNumber: '1234', // Too short
        expiryMonth: 12,
        expiryYear: new Date().getFullYear() + 2,
        cvv: '123',
      };

      try {
        await apiClient.post('/payments/validate-card', invalidCardData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    it('should reject expired card', async () => {
      const expiredCardData = {
        cardNumber: '4242424242424242',
        expiryMonth: 12,
        expiryYear: new Date().getFullYear() - 1,
        cvv: '123',
      };

      const response = await apiClient.post('/payments/validate-card', expiredCardData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('valid', false);
    });
  });

  describe('Recurring Payments', () => {
    it('should create subscription', async () => {
      const subscriptionData = {
        leadId: testLeadId,
        planId: 'plan_monthly_premium',
        paymentMethodId: 'pm_card_visa',
      };

      const response = await apiClient.post('/payments/subscription', subscriptionData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('subscriptionId');
      expect(response.data).toHaveProperty('status', 'active');
    });

    it('should retrieve subscription details', async () => {
      const response = await apiClient.get(`/payments/subscription/sub_test`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('currentPeriodEnd');
    });
  });

  describe('Payment Analytics', () => {
    it('should retrieve payment metrics', async () => {
      const response = await apiClient.get('/payments/metrics');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalRevenue');
      expect(response.data).toHaveProperty('successfulPayments');
      expect(response.data).toHaveProperty('failedPayments');
      expect(response.data).toHaveProperty('averagePaymentAmount');
    });

    it('should retrieve payment trends', async () => {
      const response = await apiClient.get('/payments/trends?period=30d');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('trends');
      expect(Array.isArray(response.data.trends)).toBe(true);
    });
  });

  describe('Compliance and Security', () => {
    it('should not return full card details in API responses', async () => {
      const response = await apiClient.get(`/payments/${testPaymentId}`);
      expect(response.status).toBe(200);
      // Card details should be masked
      if (response.data.paymentMethod?.cardNumber) {
        expect(response.data.paymentMethod.cardNumber).toMatch(/^\*+/);
      }
    });

    it('should enforce payment amount limits', async () => {
      const largePaymentData = {
        leadId: testLeadId,
        amount: 999999999.99, // Excessive amount
        paymentMethod: {
          type: 'card',
          cardNumber: '4242424242424242',
          expiryMonth: 12,
          expiryYear: new Date().getFullYear() + 2,
          cvv: '123',
        },
      };

      try {
        await apiClient.post('/payments/initialize', largePaymentData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });
});
