import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Policies API Integration Tests', () => {
  let leadId: string;

  beforeEach(async () => {
    resetStore();

    const leadResponse = await request(app)
      .post('/api/v1/leads')
      .set(AUTH_HEADER)
      .send({
        firstName: 'Policy',
        lastName: 'Lead',
        email: 'policy-lead@example.com',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
      })
      .expect(201);

    leadId = leadResponse.body.id;
  });

  it('should create, activate, endorse, invoice, pay, and renew a policy', async () => {
    const effectiveDate = new Date().toISOString();
    const expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    const createPolicyResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies`)
      .set(AUTH_HEADER)
      .send({
        insuranceType: 'AUTO',
        carrier: 'Acme Insurance',
        productName: 'Acme Auto',
        effectiveDate,
        expirationDate,
        premium: { amount: 1200, currency: 'USD' },
        billingFrequency: 'MONTHLY',
        coverage: { liability: 100000 },
      })
      .expect(201);

    const policyId = createPolicyResponse.body.id;

    expect(createPolicyResponse.body).toMatchObject({
      id: policyId,
      leadId,
      status: 'draft',
      insuranceType: 'auto',
      premium: { amount: 1200, currency: 'USD' },
    });

    const activateResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies/${policyId}/activate`)
      .set(AUTH_HEADER)
      .send({})
      .expect(200);

    expect(activateResponse.body.status).toBe('active');

    const leadAfterActivation = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set(AUTH_HEADER)
      .expect(200);

    expect(leadAfterActivation.body.status).toBe('converted');

    const endorsementResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies/${policyId}/endorsements`)
      .set(AUTH_HEADER)
      .send({
        type: 'ADD_DRIVER',
        premiumDelta: 50,
        description: 'Added an additional driver',
      })
      .expect(201);

    expect(endorsementResponse.body).toMatchObject({
      id: expect.any(String),
      policyId,
      type: 'ADD_DRIVER',
      premiumDelta: 50,
    });

    const invoiceResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies/${policyId}/invoices`)
      .set(AUTH_HEADER)
      .send({
        amount: { amount: 100, currency: 'USD' },
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const invoiceId = invoiceResponse.body.id;

    expect(invoiceResponse.body).toMatchObject({
      id: invoiceId,
      policyId,
      status: 'open',
    });

    const payResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies/${policyId}/invoices/${invoiceId}/pay`)
      .set(AUTH_HEADER)
      .send({})
      .expect(200);

    expect(payResponse.body).toMatchObject({
      id: invoiceId,
      status: 'paid',
      paidAt: expect.any(String),
    });

    const renewalResponse = await request(app)
      .post(`/api/v1/leads/${leadId}/policies/${policyId}/renew`)
      .set(AUTH_HEADER)
      .send({
        effectiveDate: new Date(new Date(expirationDate).getTime() + 1000).toISOString(),
        expirationDate: new Date(new Date(expirationDate).setFullYear(new Date(expirationDate).getFullYear() + 1)).toISOString(),
        premium: { amount: 1300, currency: 'USD' },
      })
      .expect(201);

    expect(renewalResponse.body).toMatchObject({
      policy: { id: policyId },
      renewal: {
        id: expect.any(String),
        leadId,
        renewalOfPolicyId: policyId,
        status: 'draft',
        premium: { amount: 1300, currency: 'USD' },
      },
    });
  });
});
