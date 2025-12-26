import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '../prisma/client.js';
import { AgentRepository } from '../repositories/agent.repository.js';

describe('AgentRepository Integration Tests', () => {
  let agentRepository: AgentRepository;

  beforeAll(async () => {
    agentRepository = new AgentRepository(prisma);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.agent.deleteMany({
      where: { email: { contains: 'integration-test' } }
    });
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const agentData = {
        firstName: 'Agent',
        lastName: 'Test',
        email: 'agent-integration-1@example.com',
        phone: '+1-555-0500',
        licenseNumber: 'LIC-TEST-001',
        specializations: ['AUTO', 'HOME'] as string[],
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        maxLeadCapacity: 20,
      };

      const agent = await agentRepository.create(agentData);

      expect(agent).toMatchObject({
        id: expect.any(String),
        firstName: 'Agent',
        lastName: 'Test',
        email: 'agent-integration-1@example.com',
        licenseNumber: 'LIC-TEST-001',
        status: 'ACTIVE',
        maxLeadCapacity: 20,
        currentLeadCount: 0,
      });
    });

    it('should store specializations as array', async () => {
      const agent = await agentRepository.create({
        firstName: 'Specialized',
        lastName: 'Agent',
        email: 'agent-integration-2@example.com',
        phone: '+1-555-0501',
        licenseNumber: 'LIC-TEST-002',
        specializations: ['AUTO', 'HOME', 'LIFE'],
        location: {
          city: 'Los Angeles',
          state: 'CA',
          country: 'US',
        },
        maxLeadCapacity: 15,
      });

      expect(agent.specializations).toEqual(['AUTO', 'HOME', 'LIFE']);
    });
  });

  describe('findById', () => {
    it('should find agent by id', async () => {
      const created = await agentRepository.create({
        firstName: 'Find',
        lastName: 'Agent',
        email: 'agent-integration-3@example.com',
        phone: '+1-555-0502',
        licenseNumber: 'LIC-TEST-003',
        specializations: ['HEALTH'],
        location: { city: 'Seattle', state: 'WA', country: 'US' },
        maxLeadCapacity: 25,
      });

      const found = await agentRepository.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        firstName: 'Find',
        email: 'agent-integration-3@example.com',
      });
    });

    it('should return null for non-existent id', async () => {
      const found = await agentRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find agent by email', async () => {
      await agentRepository.create({
        firstName: 'Email',
        lastName: 'Agent',
        email: 'agent-integration-4@example.com',
        phone: '+1-555-0503',
        licenseNumber: 'LIC-TEST-004',
        specializations: ['AUTO'],
        location: { city: 'Portland', state: 'OR', country: 'US' },
        maxLeadCapacity: 20,
      });

      const found = await agentRepository.findByEmail('agent-integration-4@example.com');

      expect(found).toMatchObject({
        email: 'agent-integration-4@example.com',
        firstName: 'Email',
      });
    });
  });

  describe('getAvailableAgentsByInsuranceType', () => {
    it('should get available agents by insurance type', async () => {
      await agentRepository.create({
        firstName: 'Available',
        lastName: 'Agent',
        email: 'agent-integration-5@example.com',
        phone: '+1-555-0504',
        licenseNumber: 'LIC-TEST-005',
        specializations: ['AUTO', 'HOME'],
        location: { city: 'Denver', state: 'CO', country: 'US' },
        maxLeadCapacity: 10,
      });

      const agents = await agentRepository.getAvailableAgentsByInsuranceType('AUTO', 10);

      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      // All agents should have AUTO in specializations
      agents.forEach(agent => {
        expect(agent.specializations).toContain('AUTO');
      });
    });

    it('should only return agents with available capacity', async () => {
      const agent = await agentRepository.create({
        firstName: 'Full',
        lastName: 'Capacity',
        email: 'agent-integration-6@example.com',
        phone: '+1-555-0505',
        licenseNumber: 'LIC-TEST-006',
        specializations: ['AUTO'],
        location: { city: 'Austin', state: 'TX', country: 'US' },
        maxLeadCapacity: 5,
        currentLeadCount: 5, // Full capacity
      });

      const agents = await agentRepository.getAvailableAgentsByInsuranceType('AUTO', 10);

      // The full capacity agent should not be in results
      const fullAgent = agents.find(a => a.id === agent.id);
      expect(fullAgent).toBeUndefined();
    });
  });

  describe('incrementCapacity and decrementCapacity', () => {
    it('should increment agent lead count', async () => {
      const agent = await agentRepository.create({
        firstName: 'Increment',
        lastName: 'Agent',
        email: 'agent-integration-7@example.com',
        phone: '+1-555-0506',
        licenseNumber: 'LIC-TEST-007',
        specializations: ['AUTO'],
        location: { city: 'Phoenix', state: 'AZ', country: 'US' },
        maxLeadCapacity: 20,
      });

      const initialCount = agent.currentLeadCount;
      await agentRepository.incrementCapacity(agent.id);

      const updated = await agentRepository.findById(agent.id);
      expect(updated?.currentLeadCount).toBe(initialCount + 1);
    });

    it('should decrement agent lead count', async () => {
      const agent = await agentRepository.create({
        firstName: 'Decrement',
        lastName: 'Agent',
        email: 'agent-integration-8@example.com',
        phone: '+1-555-0507',
        licenseNumber: 'LIC-TEST-008',
        specializations: ['HOME'],
        location: { city: 'Las Vegas', state: 'NV', country: 'US' },
        maxLeadCapacity: 20,
        currentLeadCount: 5,
      });

      const initialCount = agent.currentLeadCount;
      await agentRepository.decrementCapacity(agent.id);

      const updated = await agentRepository.findById(agent.id);
      expect(updated?.currentLeadCount).toBe(initialCount - 1);
    });
  });

  describe('getTopPerformingAgents', () => {
    it('should get top performing agents by conversion rate', async () => {
      // Create agents with different performance
      await agentRepository.create({
        firstName: 'Top',
        lastName: 'Performer',
        email: 'agent-integration-9@example.com',
        phone: '+1-555-0508',
        licenseNumber: 'LIC-TEST-009',
        specializations: ['AUTO'],
        location: { city: 'San Jose', state: 'CA', country: 'US' },
        maxLeadCapacity: 20,
        rating: 4.9,
        conversionRate: 0.35,
        averageResponseTime: 1800,
      });

      await agentRepository.create({
        firstName: 'Average',
        lastName: 'Performer',
        email: 'agent-integration-10@example.com',
        phone: '+1-555-0509',
        licenseNumber: 'LIC-TEST-010',
        specializations: ['AUTO'],
        location: { city: 'Sacramento', state: 'CA', country: 'US' },
        maxLeadCapacity: 20,
        rating: 4.0,
        conversionRate: 0.20,
        averageResponseTime: 3600,
      });

      const topAgents = await agentRepository.getTopPerformingAgents(5);

      expect(Array.isArray(topAgents)).toBe(true);
      expect(topAgents.length).toBeGreaterThan(0);
      // Should be sorted by performance (descending)
      if (topAgents.length > 1) {
        const first = topAgents[0];
        const second = topAgents[1];
        expect((first.conversionRate || 0) + (first.rating / 5))
          .toBeGreaterThanOrEqual((second.conversionRate || 0) + (second.rating / 5));
      }
    });
  });
});
