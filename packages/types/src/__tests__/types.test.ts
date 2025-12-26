import type { Agent, Lead, LeadAssignment } from '../index.js';

describe('types', () => {
  it('should compile basic Lead shape', () => {
    const lead: Lead = {
      id: 'lead_1',
      source: 'test',
      status: 'received',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lead.id).toBe('lead_1');
  });

  it('should compile basic Agent shape', () => {
    const agent: Agent = {
      id: 'agent_1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.com',
      phone: '+10000000000',
      licenseNumber: 'LIC123',
      specializations: ['auto'],
      location: {
        city: 'X',
        state: 'Y',
        country: 'US',
      },
      rating: 4.5,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 0,
      averageResponseTime: 60,
      conversionRate: 0.2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(agent.specializations).toContain('auto');
  });

  it('should compile basic LeadAssignment shape', () => {
    const assignment: LeadAssignment = {
      id: 'assign_1',
      leadId: 'lead_1',
      agentId: 'agent_1',
      assignedAt: new Date(),
      status: 'pending',
    };

    expect(assignment.status).toBe('pending');
  });
});
