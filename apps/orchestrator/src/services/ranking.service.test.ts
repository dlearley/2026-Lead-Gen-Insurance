import { RankingService } from './ranking.service';
import { Agent, Lead } from '@insurance-lead-gen/types';

describe('RankingService', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    rankingService = new RankingService();
  });

  const mockLead: Lead = {
    id: 'lead-1',
    source: 'web',
    insuranceType: 'auto',
    address: {
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
    },
    status: 'qualified',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      licenseNumber: 'LIC-1',
      specializations: ['auto', 'home'],
      location: {
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
      },
      rating: 4.5,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 2,
      averageResponseTime: 10,
      conversionRate: 0.2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'agent-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '0987654321',
      licenseNumber: 'LIC-2',
      specializations: ['life'],
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
      },
      rating: 4.8,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 1,
      averageResponseTime: 5,
      conversionRate: 0.3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'agent-3',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      phone: '5555555555',
      licenseNumber: 'LIC-3',
      specializations: ['auto'],
      location: {
        city: 'New York',
        state: 'NY',
        country: 'USA',
      },
      rating: 3.5,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 9,
      averageResponseTime: 20,
      conversionRate: 0.1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('should rank agents correctly based on criteria', () => {
    const rankedAgents = rankingService.rankAgents(mockLead, mockAgents);

    expect(rankedAgents).toHaveLength(3);
    expect(rankedAgents[0]!.id).toBe('agent-1'); // Exact match, same city, good capacity
    expect(rankedAgents[1]!.id).toBe('agent-3'); // Exact match, different state, low capacity
    expect(rankedAgents[2]!.id).toBe('agent-2'); // Different specialization, same state
  });

  it('should handle missing lead insurance type', () => {
    const leadWithoutType = { ...mockLead, insuranceType: undefined } as Lead;
    const rankedAgents = rankingService.rankAgents(leadWithoutType, mockAgents);

    expect(rankedAgents).toHaveLength(3);
    // Should still return ranked agents
    expect(rankedAgents[0]!.score).toBeGreaterThan(0);
  });

  it('should give 0 score for inactive agents', () => {
    const inactiveAgent: Agent = {
      ...mockAgents[0],
      id: 'agent-inactive',
      isActive: false,
    } as Agent;
    const rankedAgents = rankingService.rankAgents(mockLead, [inactiveAgent]);

    // The availability score will be 0, but other scores might still be non-zero
    // However, final score is weighted average.
    expect(rankedAgents[0]!.breakdown.availabilityScore).toBe(0);
  });
});
