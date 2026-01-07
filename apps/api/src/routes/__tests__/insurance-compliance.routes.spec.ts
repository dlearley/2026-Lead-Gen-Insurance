import request from 'supertest';
import { createApp } from '../../app.js';
import { jest } from '@jest/globals';

// Mock all services
jest.mock('../../services/insurance-license.service.js');
jest.mock('../../services/carrier-appointment.service.js');
jest.mock('../../services/product-compliance.service.js');
jest.mock('../../services/fair-lending.service.js');
jest.mock('../../services/disclosure.service.js');
jest.mock('../../services/underwriting-compliance.service.js');
jest.mock('../../services/agent-compliance-dashboard.service.js');

describe('Insurance Compliance API Routes', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/compliance/licenses', () => {
    it('should return 200 and list of licenses', async () => {
      const response = await request(app).get('/api/v1/compliance/licenses?agentId=agent1');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/compliance/quotes/validate', () => {
    it('should return 200 and validation result', async () => {
      const quoteData = { productType: 'Auto', state: 'CA', premium: 150 };
      const response = await request(app)
        .post('/api/v1/compliance/quotes/validate')
        .send(quoteData);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/compliance/fair-lending/check', () => {
    it('should return 200 and fair lending result', async () => {
      const appData = { id: 'app1', decisionFactors: ['creditScore'] };
      const response = await request(app)
        .post('/api/v1/compliance/fair-lending/check')
        .send(appData);
      expect(response.status).toBe(200);
    });
  });
});
