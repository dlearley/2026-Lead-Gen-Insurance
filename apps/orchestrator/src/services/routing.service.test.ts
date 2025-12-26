import { RoutingService, RoutingStrategy } from './routing.service';
import { Agent } from '@insurance-lead-gen/types';

describe('RoutingService', () => {
  let routingService: RoutingService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
    };
    routingService = new RoutingService();
  });

  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      licenseNumber: 'LIC-1',
      specializations: ['auto'],
      location: { city: 'LA', state: 'CA', country: 'USA' },
      rating: 4.5,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 5,
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
      specializations: ['auto'],
      location: { city: 'SF', state: 'CA', country: 'USA' },
      rating: 4.8,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 2,
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
      location: { city: 'NY', state: 'NY', country: 'USA' },
      rating: 3.5,
      isActive: true,
      maxLeadCapacity: 10,
      currentLeadCount: 8,
      averageResponseTime: 20,
      conversionRate: 0.1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('selectAgent', () => {
    it('should return null if no agents provided', async () => {
      expect(await routingService.selectAgent([])).toBeNull();
    });

    it('should return null if no active agents provided', async () => {
      const inactiveAgents = mockAgents.map(a => ({ ...a, isActive: false }));
      expect(await routingService.selectAgent(inactiveAgents)).toBeNull();
    });

    it('should use round-robin by default (in-memory)', async () => {
      const first = await routingService.selectAgent(mockAgents);
      const second = await routingService.selectAgent(mockAgents);
      const third = await routingService.selectAgent(mockAgents);
      const fourth = await routingService.selectAgent(mockAgents);

      expect(first!.id).toBe('agent-1');
      expect(second!.id).toBe('agent-2');
      expect(third!.id).toBe('agent-3');
      expect(fourth!.id).toBe('agent-1');
    });

    it('should use round-robin with Redis if provided', async () => {
      const redisRoutingService = new RoutingService(mockRedis);
      
      mockRedis.get.mockResolvedValueOnce('0'); // last index was 0
      
      const selected = await redisRoutingService.selectAgent(mockAgents, RoutingStrategy.ROUND_ROBIN);
      
      expect(selected!.id).toBe('agent-2'); // next index is 1
      expect(mockRedis.set).toHaveBeenCalledWith('routing:round_robin:default', '1');
    });

    it('should use load balancing strategy', async () => {
      const selected = await routingService.selectAgent(mockAgents, RoutingStrategy.LOAD_BALANCING);
      expect(selected!.id).toBe('agent-2'); // Lowest currentLeadCount (2)
    });

    it('should use highest score strategy (picks first from list)', async () => {
      const selected = await routingService.selectAgent(mockAgents, RoutingStrategy.HIGHEST_SCORE);
      expect(selected!.id).toBe('agent-1');
    });

    it('should maintain separate round-robin states for different insurance types', async () => {
      const contextAuto = { lead: { insuranceType: 'auto' } as any };
      const contextHome = { lead: { insuranceType: 'home' } as any };

      const firstAuto = await routingService.selectAgent(mockAgents, RoutingStrategy.ROUND_ROBIN, contextAuto);
      const firstHome = await routingService.selectAgent(mockAgents, RoutingStrategy.ROUND_ROBIN, contextHome);
      const secondAuto = await routingService.selectAgent(mockAgents, RoutingStrategy.ROUND_ROBIN, contextAuto);

      expect(firstAuto!.id).toBe('agent-1');
      expect(firstHome!.id).toBe('agent-1');
      expect(secondAuto!.id).toBe('agent-2');
    });
  });
});
