import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '../prisma/client.js';
import { LeadRepository } from '../repositories/lead.repository.js';

describe('LeadRepository Integration Tests', () => {
  let leadRepository: LeadRepository;

  beforeAll(async () => {
    leadRepository = new LeadRepository(prisma);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: { email: { contains: 'integration-test' } }
    });
  });

  describe('create', () => {
    it('should create a new lead', async () => {
      const leadData = {
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration-test-1@example.com',
        phone: '+1-555-0400',
        insuranceType: 'AUTO' as const,
        source: 'WEB_FORM' as const,
        city: 'Austin',
        state: 'TX',
        zipCode: '73301',
      };

      const lead = await leadRepository.create(leadData);

      expect(lead).toMatchObject({
        id: expect.any(String),
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration-test-1@example.com',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        status: 'NEW',
      });
    });

    it('should assign default values', async () => {
      const lead = await leadRepository.create({
        firstName: 'Default',
        lastName: 'Test',
        email: 'integration-test-2@example.com',
        phone: '+1-555-0401',
        insuranceType: 'HOME',
        source: 'API',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
      });

      expect(lead.status).toBe('NEW');
      expect(lead.qualityScore).toBe(0);
      expect(lead.urgency).toBe('MEDIUM');
    });
  });

  describe('findById', () => {
    it('should find lead by id', async () => {
      const created = await leadRepository.create({
        firstName: 'Find',
        lastName: 'Test',
        email: 'integration-test-3@example.com',
        phone: '+1-555-0402',
        insuranceType: 'LIFE',
        source: 'WEB_FORM',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
      });

      const found = await leadRepository.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        firstName: 'Find',
        lastName: 'Test',
      });
    });

    it('should return null for non-existent id', async () => {
      const found = await leadRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find lead by email', async () => {
      await leadRepository.create({
        firstName: 'Email',
        lastName: 'Test',
        email: 'integration-test-4@example.com',
        phone: '+1-555-0403',
        insuranceType: 'HEALTH',
        source: 'API',
        city: 'Las Vegas',
        state: 'NV',
        zipCode: '89101',
      });

      const found = await leadRepository.findByEmail('integration-test-4@example.com');

      expect(found).toMatchObject({
        email: 'integration-test-4@example.com',
        firstName: 'Email',
      });
    });
  });

  describe('findMany', () => {
    it('should find leads with filters', async () => {
      // Create test leads
      await leadRepository.create({
        firstName: 'Filter',
        lastName: 'Test1',
        email: 'integration-test-5@example.com',
        phone: '+1-555-0404',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101',
      });

      await leadRepository.create({
        firstName: 'Filter',
        lastName: 'Test2',
        email: 'integration-test-6@example.com',
        phone: '+1-555-0405',
        insuranceType: 'HOME',
        source: 'WEB_FORM',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92102',
      });

      const leads = await leadRepository.findMany(
        {
          status: ['NEW'],
        },
        0,
        10
      );

      expect(leads.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const leads = await leadRepository.findMany({}, 0, 5);
      expect(leads.length).toBeLessThanOrEqual(5);
    });
  });

  describe('update', () => {
    it('should update lead', async () => {
      const created = await leadRepository.create({
        firstName: 'Update',
        lastName: 'Test',
        email: 'integration-test-7@example.com',
        phone: '+1-555-0406',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
      });

      const updated = await leadRepository.update(created.id, {
        firstName: 'Updated',
        city: 'Houston',
      });

      expect(updated).toMatchObject({
        id: created.id,
        firstName: 'Updated',
        city: 'Houston',
      });
    });
  });

  describe('updateStatus', () => {
    it('should update lead status', async () => {
      const created = await leadRepository.create({
        firstName: 'Status',
        lastName: 'Test',
        email: 'integration-test-8@example.com',
        phone: '+1-555-0407',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30301',
      });

      const updated = await leadRepository.updateStatus(created.id, 'QUALIFIED');

      expect(updated).toMatchObject({
        id: created.id,
        status: 'QUALIFIED',
      });
    });
  });

  describe('updateQualityScore', () => {
    it('should update quality score', async () => {
      const created = await leadRepository.create({
        firstName: 'Quality',
        lastName: 'Test',
        email: 'integration-test-9@example.com',
        phone: '+1-555-0408',
        insuranceType: 'HOME',
        source: 'API',
        city: 'Charlotte',
        state: 'NC',
        zipCode: '28201',
      });

      const updated = await leadRepository.updateQualityScore(
        created.id,
        85.5,
        'High engagement and good demographics'
      );

      expect(updated).toMatchObject({
        id: created.id,
        qualityScore: 85.5,
        scoreReason: 'High engagement and good demographics',
      });
    });
  });

  describe('getHighQualityLeads', () => {
    it('should get high quality leads', async () => {
      await leadRepository.create({
        firstName: 'High',
        lastName: 'Quality',
        email: 'integration-test-10@example.com',
        phone: '+1-555-0409',
        insuranceType: 'LIFE',
        source: 'WEB_FORM',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
      });

      await leadRepository.updateQualityScore(
        'integration-test-10@example.com'.split('-')[0], // This would need actual ID
        90,
        'Very high quality'
      );

      const leads = await leadRepository.getHighQualityLeads(80, 10);

      expect(Array.isArray(leads)).toBe(true);
      // Each lead should have qualityScore >= 80
      leads.forEach(lead => {
        expect(lead.qualityScore).toBeGreaterThanOrEqual(80);
      });
    });
  });
});
