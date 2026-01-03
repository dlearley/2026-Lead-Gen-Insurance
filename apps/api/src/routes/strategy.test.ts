import request from 'supertest';
import { createApp } from '../app.js';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Strategy API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('Market Analysis Endpoints', () => {
    it('GET /api/v1/strategy/market/consolidation-opportunities should return opportunities', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/market/consolidation-opportunities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const opportunity = response.body.data[0];
      expect(opportunity).toHaveProperty('market');
      expect(opportunity).toHaveProperty('targets');
      expect(opportunity).toHaveProperty('potentialGains');
      expect(opportunity).toHaveProperty('investmentRequired');
      expect(opportunity).toHaveProperty('expectedROI');
    });

    it('GET /api/v1/strategy/market/acquisition-timeline/target-healthtech-leads should return timeline', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/market/acquisition-timeline/target-healthtech-leads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('phase1');
      expect(response.body.data).toHaveProperty('phase2');
      expect(response.body.data).toHaveProperty('phase3');
    });
  });

  describe('Ecosystem Partnership Endpoints', () => {
    it('GET /api/v1/strategy/ecosystem/metrics should return ecosystem metrics', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/ecosystem/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      const metrics = response.body.data;
      expect(metrics).toHaveProperty('totalPartners');
      expect(metrics).toHaveProperty('activePartners');
      expect(metrics).toHaveProperty('revenueContributed');
      expect(metrics).toHaveProperty('leadsGenerated');
      expect(metrics).toHaveProperty('ecosystemHealth');
    });

    it('GET /api/v1/strategy/ecosystem/partners/tier/platinum should return platinum partners', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/ecosystem/partners/tier/platinum')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const partner = response.body.data[0];
        expect(partner).toHaveProperty('tier', 'platinum');
        expect(partner).toHaveProperty('activationMetrics');
        expect(partner).toHaveProperty('revenueSharePercentage');
      }
    });

    it('GET /api/v1/strategy/ecosystem/partnership-opportunities should return opportunities', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/ecosystem/partnership-opportunities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const opportunity = response.body.data[0];
        expect(opportunity).toHaveProperty('partnerId');
        expect(opportunity).toHaveProperty('potentialRevenue');
        expect(opportunity).toHaveProperty('implementationComplexity');
      }
    });

    it('POST /api/v1/strategy/ecosystem/revenue-share should calculate revenue share', async () => {
      const requestBody = {
        partnerId: 'partner-salesforce',
        leadsGenerated: 1000
      };

      const response = await request(app)
        .post('/api/v1/strategy/ecosystem/revenue-share')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('partnerId', 'partner-salesforce');
      expect(response.body.data).toHaveProperty('leadsGenerated', 1000);
      expect(response.body.data).toHaveProperty('revenueShare');
      expect(response.body.data.revenueShare).toBeGreaterThan(0);
    });
  });

  describe('Agency Network Endpoints', () => {
    it('GET /api/v1/strategy/agency/metrics should return agency metrics', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/agency/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      const metrics = response.body.data;
      expect(metrics).toHaveProperty('totalAgencies');
      expect(metrics).toHaveProperty('activeAgencies');
      expect(metrics).toHaveProperty('totalAgents');
      expect(metrics).toHaveProperty('totalPremium');
      expect(metrics).toHaveProperty('networkGrowthRate');
      expect(metrics).toHaveProperty('retentionRate');
    });

    it('GET /api/v1/strategy/agency/region/Northeast should return Northeast agencies', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/agency/region/Northeast')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const agency = response.body.data[0];
        expect(agency.location.region).toBe('Northeast');
        expect(agency).toHaveProperty('performance');
        expect(agency).toHaveProperty('tier');
      }
    });

    it('GET /api/v1/strategy/agency/specialization/Health%20Insurance should return health agencies', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/agency/specialization/Health%20Insurance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const agency = response.body.data[0];
        expect(agency.specialization).toContain('Health Insurance');
      }
    });

    it('GET /api/v1/strategy/agency/growth-forecast should return growth forecast', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/agency/growth-forecast')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('threeMonths');
      expect(response.body.data).toHaveProperty('sixMonths');
      expect(response.body.data).toHaveProperty('twelveMonths');
    });
  });

  describe('Network Effects Endpoints', () => {
    it('GET /api/v1/strategy/network/effects should return network effects analysis', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/network/effects')
        .expect(200);

      expect(response.body.success).toBe(true);
      const effects = response.body.data;
      expect(effects).toHaveProperty('networkSize');
      expect(effects).toHaveProperty('totalConnections');
      expect(effects).toHaveProperty('theoreticalValue');
      expect(effects).toHaveProperty('networkEfficiency');
    });

    it('GET /api/v1/strategy/network/switching-costs/participant-marshall should return switching costs', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/network/switching-costs/participant-marshall')
        .expect(200);

      expect(response.body.success).toBe(true);
      const costs = response.body.data;
      expect(costs).toHaveProperty('totalCost');
      expect(costs).toHaveProperty('switchingBarrier');
      expect(costs.totalCost).toBeGreaterThan(0);
    });

    it('POST /api/v1/strategy/network/distribute-lead should distribute lead', async () => {
      const lead = {
        id: 'lead-test-001',
        type: 'Health Insurance',
        location: { state: 'MA' },
        specialization: ['Health Insurance'],
        estimatedValue: 300
      };

      const response = await request(app)
        .post('/api/v1/strategy/network/distribute-lead')
        .send(lead)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('leadId', 'lead-test-001');
      expect(response.body.data).toHaveProperty('assignedAgencyId');
    });

    it('GET /api/v1/strategy/comprehensive-report should return comprehensive report', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/comprehensive-report')
        .expect(200);

      expect(response.body.success).toBe(true);
      const report = response.body.data;
      expect(report).toHaveProperty('marketConsolidation');
      expect(report).toHaveProperty('ecosystemExpansion');
      expect(report).toHaveProperty('agencyNetwork');
      expect(report).toHaveProperty('networkEffects');
      expect(report).toHaveProperty('competitivePosition');
      expect(report.competitivePosition).toHaveProperty('moatStrength');
    });
  });

  describe('Error Handling', () => {
    it('GET /api/v1/strategy/market/acquisition-timeline/invalid-target should return 404', async () => {
      const response = await request(app)
        .get('/api/v1/strategy/market/acquisition-timeline/invalid-target')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('POST /api/v1/strategy/ecosystem/revenue-share with missing data should return 400', async () => {
      const response = await request(app)
        .post('/api/v1/strategy/ecosystem/revenue-share')
        .send({ partnerId: 'partner-salesforce' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });
});