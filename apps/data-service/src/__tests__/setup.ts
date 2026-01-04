/**
 * Data Service Test Setup
 */
import { jest } from '@jest/globals';

// Extend Jest global
declare global {
  namespace jest {
    interface Matchers<T> {
      toBeWithinRange(a: number, b: number): T;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
});

// Mock config
export const mockConfig = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
      REDIS_URL: 'redis://localhost:6379',
      NATS_URL: 'nats://localhost:4222',
      NODE_ENV: 'test',
    };
    return config[key];
  }),
};

// Mock logger
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Test user
export const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
};

// In-memory test database simulation
export class InMemoryTestDatabase {
  leads: Map<string, any> = new Map();
  agents: Map<string, any> = new Map();
  users: Map<string, any> = new Map();
  partners: Map<string, any> = new Map();
  referrals: Map<string, any> = new Map();
  rewards: Map<string, any> = new Map();

  constructor() {
    this.users.set(testUser.id, testUser);
  }

  clear() {
    this.leads.clear();
    this.agents.clear();
    this.partners.clear();
    this.referrals.clear();
    this.rewards.clear();
  }

  async seed() {
    // Add test agents
    this.agents.set('agent-1', {
      id: 'agent-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      specializations: ['AUTO', 'HOME'],
      rating: 4.8,
      conversionRate: 0.35,
      currentLeadCount: 5,
      maxLeadCapacity: 20,
      isActive: true,
    });
    this.agents.set('agent-2', {
      id: 'agent-2',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      specializations: ['AUTO'],
      rating: 4.5,
      conversionRate: 0.30,
      currentLeadCount: 8,
      maxLeadCapacity: 20,
      isActive: true,
    });
  }
}

export const testDb = new InMemoryTestDatabase();

// Mock Prisma Client
export const mockPrismaClient = {
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  agent: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  partner: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  referral: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Setup before all tests
beforeAll(() => {
  testDb.seed();
});

// Clear database before each test
beforeEach(() => {
  testDb.clear();
  jest.clearAllMocks();
  
  // Spy on console for cleaner test output
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Helper function
export function generateId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
