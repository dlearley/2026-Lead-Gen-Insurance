import { describe, it, expect, beforeEach } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { InMemoryLeadRepository } from '../src/repositories.js';

describe('Lead Repository', () => {
  let repository: InMemoryLeadRepository;

  beforeEach(() => {
    repository = new InMemoryLeadRepository();
  });

  describe('create', () => {
    it('should create a lead with required fields', async () => {
      const leadData: Prisma.LeadCreateInput = {
        source: 'web_form',
      };

      const lead = await repository.create(leadData);

      expect(lead.id).toBeDefined();
      expect(lead.source).toBe('web_form');
      expect(lead.status).toBe('RECEIVED');
      expect(lead.qualityScore).toBeNull();
      expect(lead.createdAt).toBeInstanceOf(Date);
      expect(lead.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a lead with all fields', async () => {
      const leadData: Prisma.LeadCreateInput = {
        source: 'api',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        insuranceType: 'AUTO',
        metadata: { utm_source: 'google' },
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const lead = await repository.create(leadData);

      expect(lead.email).toBe('test@example.com');
      expect(lead.phone).toBe('+1-555-123-4567');
      expect(lead.firstName).toBe('John');
      expect(lead.lastName).toBe('Doe');
      expect(lead.insuranceType).toBe('AUTO');
      expect(lead.street).toBe('123 Main St');
      expect(lead.city).toBe('New York');
    });
  });

  describe('findById', () => {
    it('should return null for non-existent lead', async () => {
      const lead = await repository.findById('non-existent');
      expect(lead).toBeNull();
    });

    it('should return lead when found', async () => {
      const created = await repository.create({ source: 'test' });
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.source).toBe('test');
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create test leads
      await repository.create({ source: 'web_form', insuranceType: 'AUTO' });
      await repository.create({ source: 'web_form', insuranceType: 'HOME' });
      await repository.create({ source: 'api', insuranceType: 'AUTO' });
      await repository.create({ source: 'phone', insuranceType: 'LIFE', status: 'QUALIFIED' });
    });

    it('should return all leads without filters', async () => {
      const leads = await repository.findMany({});
      expect(leads.length).toBe(4);
    });

    it('should filter by status', async () => {
      const leads = await repository.findMany({
        where: { status: 'RECEIVED' },
      });
      expect(leads.length).toBe(3);
      leads.forEach((lead) => {
        expect(lead.status).toBe('RECEIVED');
      });
    });

    it('should filter by source', async () => {
      const leads = await repository.findMany({
        where: { source: 'web_form' },
      });
      expect(leads.length).toBe(2);
      leads.forEach((lead) => {
        expect(lead.source).toBe('web_form');
      });
    });

    it('should filter by insurance type', async () => {
      const leads = await repository.findMany({
        where: { insuranceType: 'AUTO' },
      });
      expect(leads.length).toBe(2);
      leads.forEach((lead) => {
        expect(lead.insuranceType).toBe('AUTO');
      });
    });

    it('should filter by quality score range', async () => {
      // First, manually update some leads with scores
      const allLeads = await repository.findMany({});
      await repository.update(allLeads[0].id, { qualityScore: 75 });
      await repository.update(allLeads[1].id, { qualityScore: 50 });

      const leads = await repository.findMany({
        where: { qualityScore: { gte: 60, lte: 100 } },
      });
      expect(leads.length).toBe(1);
      expect(leads[0].qualityScore).toBe(75);
    });

    it('should paginate results', async () => {
      const leads = await repository.findMany({
        skip: 0,
        take: 2,
      });
      expect(leads.length).toBe(2);
    });

    it('should sort by createdAt descending by default', async () => {
      const leads = await repository.findMany({});
      for (let i = 0; i < leads.length - 1; i++) {
        expect(leads[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          leads[i + 1].createdAt.getTime()
        );
      }
    });
  });

  describe('update', () => {
    it('should throw error for non-existent lead', async () => {
      await expect(repository.update('non-existent', { source: 'updated' })).rejects.toThrow(
        'Lead with id non-existent not found'
      );
    });

    it('should update lead fields', async () => {
      const created = await repository.create({ source: 'test' });
      const updated = await repository.update(created.id, {
        source: 'updated_source',
        firstName: 'Jane',
        status: 'QUALIFIED' as any,
      });

      expect(updated.source).toBe('updated_source');
      expect(updated.firstName).toBe('Jane');
      expect(updated.status).toBe('QUALIFIED');
      expect(updated.id).toBe(created.id); // ID should not change
      expect(updated.createdAt).toEqual(created.createdAt); // createdAt should not change
    });
  });

  describe('delete', () => {
    it('should throw error for non-existent lead', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(
        'Lead with id non-existent not found'
      );
    });

    it('should delete lead', async () => {
      const created = await repository.create({ source: 'test' });
      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should remove lead from findMany results', async () => {
      const created = await repository.create({ source: 'to_delete' });
      const beforeDelete = await repository.findMany({
        where: { source: 'to_delete' },
      });
      expect(beforeDelete.length).toBe(1);

      await repository.delete(created.id);

      const afterDelete = await repository.findMany({
        where: { source: 'to_delete' },
      });
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ source: 'web_form', status: 'RECEIVED' });
      await repository.create({ source: 'web_form', status: 'RECEIVED' });
      await repository.create({ source: 'api', status: 'QUALIFIED' });
    });

    it('should return total count without filter', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should return filtered count', async () => {
      const count = await repository.count({ status: 'RECEIVED' });
      expect(count).toBe(2);
    });

    it('should return count with multiple filters', async () => {
      const count = await repository.count({ source: 'web_form' });
      expect(count).toBe(2);
    });
  });
});
