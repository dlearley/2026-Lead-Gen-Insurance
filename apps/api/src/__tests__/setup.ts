/**
 * API Test Setup
 * Global test configuration and utilities
 */

import { logger } from '@insurance-lead-gen/core';
import type { User } from '@insurance-lead-gen/types';

// Extend Jest global interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
      toHaveBeenCalledWithMatchingObject(obj: unknown): R;
    }
    interface Expect {
      toBeWithinRange(a: number, b: number): any;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toHaveBeenCalledWithMatchingObject(mockFn: jest.Mock, obj: unknown) {
    const calls = mockFn.mock.calls;
    const found = calls.some(call =>
      call.some(arg => {
        if (typeof arg !== 'object' || arg === null) return false;
        const keys = Object.keys(obj as object);
        return keys.every(key => (arg as Record<string, unknown>)[key] === (obj as Record<string, unknown>)[key]);
      })
    );
    return {
      message: () =>
        `expected mock to have been called with matching object ${JSON.stringify(obj)}`,
      pass: found,
    };
  },
});

// Test user session
export const testUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock auth middleware
export const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = testUser;
  next();
};

// Mock logger
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// In-memory test store
export class TestStore {
  leads: Map<string, any> = new Map();
  users: Map<string, any> = new Map();
  agents: Map<string, any> = new Map();
  policies: Map<string, any> = new Map();
  referrals: Map<string, any> = new Map();
  rewards: Map<string, any> = new Map();
  activities: Map<string, any> = new Map();
  assignments: Map<string, any> = new Map();
  notes: Map<string, any> = new Map();
  tasks: Map<string, any> = new Map();
  emails: Map<string, any> = new Map();

  constructor() {
    // Initialize with test data
    this.users.set(testUser.id, testUser);
  }

  clear() {
    this.leads.clear();
    this.users.clear();
    this.agents.clear();
    this.policies.clear();
    this.referrals.clear();
    this.rewards.clear();
    this.activities.clear();
    this.assignments.clear();
    this.notes.clear();
    this.tasks.clear();
    this.emails.clear();
    // Re-add test user
    this.users.set(testUser.id, testUser);
  }

  seed() {
    // Add test agents
    const agent1 = {
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
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
    };
    const agent2 = {
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
      location: { city: 'Los Angeles', state: 'CA', country: 'US' },
    };
    this.agents.set(agent1.id, agent1);
    this.agents.set(agent2.id, agent2);
  }
}

export const testStore = new TestStore();

// Setup before all tests
beforeAll(() => {
  testStore.seed();
});

// Clear store before each test
beforeEach(() => {
  testStore.clear();
  jest.clearAllMocks();
  
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Restore mocks after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Helper to generate unique IDs
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to wait for a specified time
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to create async test with timeout
export async function asyncTest(
  name: string,
  testFn: () => Promise<void>,
  timeout: number = 5000
): Promise<void> {
  return testFn().timeout(timeout);
}
