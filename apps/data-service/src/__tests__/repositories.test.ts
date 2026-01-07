import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryLeadRepository, InMemoryAgentRepository } from '../repositories';
import { Prisma } from '@prisma/client';
import { testDb } from './setup';

describe('InMemoryLeadRepository', () => {
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
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
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

    it('should generate unique IDs', async () => {
      const lead1 = await repository.create({ source: 'api' });
      const lead2 = await repository.create({ source: 'api' });

      expect(lead1.id).not.toBe(lead2.id);
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
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it('should update qualityScore', async () => {
      const created = await repository.create({ source: 'test' });
      const updated = await repository.update(created.id, { qualityScore: 85 });

      expect(updated.qualityScore).toBe(85);
    });

    it('should preserve other fields when updating', async () => {
      const created = await repository.create({
        source: 'test',
        email: 'original@example.com',
      });
      const updated = await repository.update(created.id, { status: 'QUALIFIED' as any });

      expect(updated.source).toBe('test');
      expect(updated.email).toBe('original@example.com');
      expect(updated.status).toBe('QUALIFIED');
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

describe('InMemoryAgentRepository', () => {
  let repository: InMemoryAgentRepository;

  beforeEach(() => {
    repository = new InMemoryAgentRepository();
  });

  describe('create', () => {
    it('should create an agent with required fields', async () => {
      const agentData: Prisma.AgentCreateInput = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      };

      const agent = await repository.create(agentData);

      expect(agent.id).toBeDefined();
      expect(agent.firstName).toBe('Jane');
      expect(agent.lastName).toBe('Doe');
      expect(agent.email).toBe('jane@example.com');
      expect(agent.isActive).toBe(true);
      expect(agent.currentLeadCount).toBe(0);
    });

    it('should create agent with specializations', async () => {
      const agent = await repository.create({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        specializations: ['AUTO', 'HOME'],
      });

      expect(agent.specializations).toEqual(['AUTO', 'HOME']);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent agent', async () => {
      const agent = await repository.findById('non-existent');
      expect(agent).toBeNull();
    });

    it('should return agent when found', async () => {
      const created = await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', specializations: ['AUTO'], isActive: true, rating: 4.8 });
      await repository.create({ firstName: 'John', lastName: 'Smith', email: 'john@example.com', specializations: ['HOME'], isActive: true, rating: 4.5 });
      await repository.create({ firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', specializations: ['AUTO'], isActive: false, rating: 4.2 });
    });

    it('should return all agents without filters', async () => {
      const agents = await repository.findMany({});
      expect(agents.length).toBe(3);
    });

    it('should filter by active status', async () => {
      const agents = await repository.findMany({
        where: { isActive: true },
      });
      expect(agents.length).toBe(2);
      agents.forEach((agent) => {
        expect(agent.isActive).toBe(true);
      });
    });

    it('should filter by specialization', async () => {
      const agents = await repository.findMany({
        where: { specializations: { has: 'AUTO' } },
      });
      expect(agents.length).toBe(2);
    });

    it('should sort by rating descending', async () => {
      const agents = await repository.findMany({
        orderBy: { rating: 'desc' },
      });
      expect(agents[0].rating).toBe(4.8);
      expect(agents[1].rating).toBe(4.5);
      expect(agents[2].rating).toBe(4.2);
    });

    it('should filter by minimum rating', async () => {
      const agents = await repository.findMany({
        where: { rating: { gte: 4.5 } },
      });
      expect(agents.length).toBe(2);
      agents.forEach((agent) => {
        expect(agent.rating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('update', () => {
    it('should update agent fields', async () => {
      const created = await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });
      const updated = await repository.update(created.id, {
        firstName: 'Janet',
        rating: 4.9,
      });

      expect(updated.firstName).toBe('Janet');
      expect(updated.rating).toBe(4.9);
      expect(updated.email).toBe('jane@example.com');
    });

    it('should update currentLeadCount', async () => {
      const created = await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });
      const updated = await repository.update(created.id, { currentLeadCount: 5 });

      expect(updated.currentLeadCount).toBe(5);
    });

    it('should toggle isActive status', async () => {
      const created = await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });
      const updated = await repository.update(created.id, { isActive: false });

      expect(updated.isActive).toBe(false);
    });
  });

  describe('findMatchingAgents', () => {
    beforeEach(async () => {
      await repository.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', specializations: ['AUTO', 'HOME'], rating: 4.8, currentLeadCount: 5, isActive: true });
      await repository.create({ firstName: 'John', lastName: 'Smith', email: 'john@example.com', specializations: ['AUTO'], rating: 4.5, currentLeadCount: 15, isActive: true });
      await repository.create({ firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', specializations: ['HOME'], rating: 4.2, currentLeadCount: 0, isActive: true });
    });

    it('should find agents matching insurance type', async () => {
      const matches = await repository.findMatchingAgents('AUTO');
      expect(matches.length).toBe(2);
      matches.forEach((agent) => {
        expect(agent.specializations).toContain('AUTO');
      });
    });

    it('should return empty array when no agents match', async () => {
      const matches = await repository.findMatchingAgents('LIFE');
      expect(matches.length).toBe(0);
    });

    it('should sort by score descending', async () => {
      const matches = await repository.findMatchingAgents('AUTO');
      // Higher rating and lower lead count should score higher
      expect(matches[0].firstName).toBe('Jane');
    });
  });
});
