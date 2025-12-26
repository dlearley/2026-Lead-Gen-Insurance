import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

describe('Leads API Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    createLead: 500, // ms
    getLead: 200, // ms
    listLeads: 300, // ms
    updateLead: 300, // ms
    deleteLead: 300, // ms
  };

  const BULK_OPERATIONS_COUNT = 10;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.lead.deleteMany({
      where: { email: { contains: 'performance-test' } }
    });
    await prisma.$disconnect();
  });

  describe('Single Operation Performance', () => {
    it('should create lead within threshold', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/v1/leads')
        .send({
          firstName: 'Performance',
          lastName: 'Test',
          email: 'performance-test-1@example.com',
          phone: '+1-555-0600',
          insuranceType: 'AUTO',
          source: 'WEB_FORM',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12345',
        })
        .expect(201);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createLead);
    });

    it('should get lead within threshold', async () => {
      // Create a lead first
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .send({
          firstName: 'Performance',
          lastName: 'Get',
          email: 'performance-test-2@example.com',
          phone: '+1-555-0601',
          insuranceType: 'HOME',
          source: 'API',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12346',
        });

      const leadId = createResponse.body.data.id;

      const startTime = Date.now();

      await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.getLead);
    });

    it('should list leads within threshold', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/leads?skip=0&take=10')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.listLeads);
    });

    it('should update lead within threshold', async () => {
      // Create a lead first
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .send({
          firstName: 'Performance',
          lastName: 'Update',
          email: 'performance-test-3@example.com',
          phone: '+1-555-0602',
          insuranceType: 'LIFE',
          source: 'WEB_FORM',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12347',
        });

      const leadId = createResponse.body.data.id;

      const startTime = Date.now();

      await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.updateLead);
    });

    it('should delete lead within threshold', async () => {
      // Create a lead first
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .send({
          firstName: 'Performance',
          lastName: 'Delete',
          email: 'performance-test-4@example.com',
          phone: '+1-555-0603',
          insuranceType: 'HEALTH',
          source: 'API',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12348',
        });

      const leadId = createResponse.body.data.id;

      const startTime = Date.now();

      await request(app)
        .delete(`/api/v1/leads/${leadId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.deleteLead);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should handle concurrent lead creation', async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: BULK_OPERATIONS_COUNT }, (_, i) =>
        request(app)
          .post('/api/v1/leads')
          .send({
            firstName: `Bulk${i}`,
            lastName: 'Test',
            email: `performance-bulk-${i}@example.com`,
            phone: `+1-555-060${i}`,
            insuranceType: 'AUTO',
            source: 'WEB_FORM',
            city: 'Performance City',
            state: 'PC',
            zipCode: `123${i}`,
          })
          .expect(201)
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgDurationPerOperation = duration / BULK_OPERATIONS_COUNT;

      // Average should be less than threshold
      expect(avgDurationPerOperation).toBeLessThan(PERFORMANCE_THRESHOLDS.createLead);

      console.log(
        `Bulk operation: ${BULK_OPERATIONS_COUNT} creates in ${duration}ms ` +
        `(avg ${avgDurationPerOperation.toFixed(2)}ms per operation)`
      );
    });

    it('should handle concurrent lead reads', async () => {
      // Create test leads first
      const createdLeads: string[] = [];
      for (let i = 0; i < BULK_OPERATIONS_COUNT; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .send({
            firstName: `Read${i}`,
            lastName: 'Test',
            email: `performance-read-${i}@example.com`,
            phone: `+1-555-061${i}`,
            insuranceType: 'AUTO',
            source: 'WEB_FORM',
            city: 'Performance City',
            state: 'PC',
            zipCode: `124${i}`,
          });
        createdLeads.push(response.body.data.id);
      }

      const startTime = Date.now();

      const promises = createdLeads.map(leadId =>
        request(app)
          .get(`/api/v1/leads/${leadId}`)
          .expect(200)
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgDurationPerOperation = duration / BULK_OPERATIONS_COUNT;

      expect(avgDurationPerOperation).toBeLessThan(PERFORMANCE_THRESHOLDS.getLead);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large page sizes efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/leads?skip=0&take=100')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body).toHaveProperty('success', true);
      expect(duration).toBeLessThan(1000); // 1 second for 100 items
    });

    it('should handle deep pagination efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/leads?skip=100&take=50')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // 500ms for deep pagination
    });
  });

  describe('Filter Performance', () => {
    it('should handle complex filters efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/leads?status=NEW&insuranceType=AUTO&minQualityScore=70')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.listLeads);
    });

    it('should handle multiple filter combinations', async () => {
      const filterCombinations = [
        'status=NEW',
        'status=QUALIFIED&insuranceType=HOME',
        'insuranceType=AUTO&minQualityScore=80',
        'source=WEB_FORM&status=NEW',
        'city=San%20Francisco&state=CA',
      ];

      const startTime = Date.now();

      const promises = filterCombinations.map(filter =>
        request(app)
          .get(`/api/v1/leads?${filter}`)
          .expect(200)
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.listLeads * filterCombinations.length);
    });
  });
});
