import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RoutingService, type RoutingConfig } from '../routing-service.js';

// Mock axios
import axios from 'axios';
import { Mock } from 'vitest';

// Mock the axios module
vi.mock('axios');
const mockedAxios = axios as Mock;

describe('RoutingService Integration Tests', () => {
  let routingService: RoutingService;

  beforeEach(() => {
    routingService = new RoutingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = routingService.getConfig();

      expect(config).toMatchObject({
        minConfidenceThreshold: 0.7,
        maxAgentsPerLead: 3,
        enableRoundRobin: true,
        enableLoadBalancing: true,
        enableGraphBasedRouting: true,
        notificationTimeoutMs: 300000,
        escalationTimeoutMs: 900000,
      });
    });
  });

  describe('getConfig', () => {
    it('should return current routing configuration', () => {
      const config = routingService.getConfig();

      expect(config).toHaveProperty('minConfidenceThreshold');
      expect(config).toHaveProperty('maxAgentsPerLead');
      expect(config).toHaveProperty('enableRoundRobin');
    });

    it('should return a copy of the config', () => {
      const config1 = routingService.getConfig();
      const config2 = routingService.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('updateConfig', () => {
    it('should update routing configuration', () => {
      const newConfig: Partial<RoutingConfig> = {
        minConfidenceThreshold: 0.8,
        maxAgentsPerLead: 5,
      };

      routingService.updateConfig(newConfig);

      const config = routingService.getConfig();
      expect(config.minConfidenceThreshold).toBe(0.8);
      expect(config.maxAgentsPerLead).toBe(5);
    });

    it('should not affect other config values when updating partial config', () => {
      const originalNotificationTimeout = routingService.getConfig().notificationTimeoutMs;

      routingService.updateConfig({
        minConfidenceThreshold: 0.9,
      });

      const config = routingService.getConfig();
      expect(config.minConfidenceThreshold).toBe(0.9);
      expect(config.notificationTimeoutMs).toBe(originalNotificationTimeout);
    });
  });

  describe('routeLead', () => {
    it('should route lead to best agent', async () => {
      const mockMatches = [
        {
          agent: {
            id: 'agent-1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            specializations: ['AUTO', 'HOME'],
            rating: 4.8,
            conversionRate: 0.35,
            currentLeadCount: 5,
            maxLeadCapacity: 20,
            averageResponseTime: 1800,
            location: { city: 'San Francisco', state: 'CA', country: 'US' },
            licenseNumber: 'LIC-001',
            status: 'ACTIVE',
          },
          score: 95,
        },
        {
          agent: {
            id: 'agent-2',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john@example.com',
            specializations: ['AUTO'],
            rating: 4.5,
            conversionRate: 0.30,
            currentLeadCount: 8,
            maxLeadCapacity: 20,
            averageResponseTime: 2400,
            location: { city: 'Los Angeles', state: 'CA', country: 'US' },
            licenseNumber: 'LIC-002',
            status: 'ACTIVE',
          },
          score: 88,
        },
      ];

      // Mock the axios GET request for matching agents
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: {
            data: mockMatches,
          },
        }),
        post: vi.fn().mockResolvedValue({
          data: { success: true },
        }),
      } as any);

      const result = await routingService.routeLead('lead-123');

      expect(result).toMatchObject({
        leadId: expect.any(String),
        agentId: expect.any(String),
        score: expect.any(Number),
        confidence: expect.any(Number),
        routingFactors: {
          specializationMatch: expect.any(Number),
          locationProximity: expect.any(Number),
          performanceScore: expect.any(Number),
          currentWorkload: expect.any(Number),
          qualityTierAlignment: expect.any(Number),
        },
      });
    });

    it('should throw error when no agents found', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: {
            data: [],
          },
        }),
      } as any);

      await expect(routingService.routeLead('lead-123')).rejects.toThrow(
        'No agents found for lead routing'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('API Error')),
      } as any);

      await expect(routingService.routeLead('lead-123')).rejects.toThrow('API Error');
    });
  });

  describe('getAgentRoutingHistory', () => {
    it('should return empty array for agent with no history', async () => {
      const history = await routingService.getAgentRoutingHistory('new-agent');
      expect(history).toEqual([]);
    });

    it('should track routing history for agent', async () => {
      const mockMatches = [
        {
          agent: {
            id: 'agent-history',
            firstName: 'History',
            lastName: 'Test',
            email: 'history@example.com',
            specializations: ['AUTO'],
            rating: 4.8,
            conversionRate: 0.35,
            currentLeadCount: 5,
            maxLeadCapacity: 20,
            averageResponseTime: 1800,
            location: { city: 'San Francisco', state: 'CA', country: 'US' },
            licenseNumber: 'LIC-HIST',
            status: 'ACTIVE',
          },
          score: 95,
        },
      ];

      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: {
            data: mockMatches,
          },
        }),
        post: vi.fn().mockResolvedValue({
          data: { success: true },
        }),
      } as any);

      await routingService.routeLead('lead-1');
      await routingService.routeLead('lead-2');
      await routingService.routeLead('lead-3');

      const history = await routingService.getAgentRoutingHistory('agent-history');
      expect(history.length).toBe(3);
      expect(history[0]).toBeInstanceOf(Date);
      expect(history[1]).toBeInstanceOf(Date);
      expect(history[2]).toBeInstanceOf(Date);
    });
  });

  describe('reassignStaleLeads', () => {
    it('should complete without errors', async () => {
      await expect(routingService.reassignStaleLeads()).resolves.not.toThrow();
    });
  });
});
