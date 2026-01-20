import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance_lead_gen_test';

// Set default test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  global.testDb = new PrismaClient();
  await global.testDb.$connect();
});

// Global test teardown
afterAll(async () => {
  if (global.testDb) {
    await global.testDb.$disconnect();
  }
  // Clean up any remaining test data
  await cleanupTestData();
});

// Test database utilities
export async function createTestUser(overrides = {}) {
  const prisma = global.testDb;
  return prisma.user.create({
    data: {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'agent',
      isActive: true,
      ...overrides,
    },
  });
}

export async function createTestLead(overrides = {}) {
  const prisma = global.testDb;
  const user = await createTestUser();
  
  return prisma.lead.create({
    data: {
      id: `test-lead-${Date.now()}`,
      firstName: 'John',
      lastName: 'Doe',
      email: `john-${Date.now()}@example.com`,
      phone: '+1234567890',
      insuranceType: 'auto',
      status: 'new',
      source: 'website',
      priority: 'medium',
      estimatedValue: 5000,
      notes: 'Test lead notes',
      assignedTo: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    },
  });
}

export async function createTestPolicy(overrides = {}) {
  const prisma = global.testDb;
  const lead = await createTestLead();
  
  return prisma.policy.create({
    data: {
      id: `test-policy-${Date.now()}`,
      policyNumber: `POL-${Date.now()}`,
      type: 'auto',
      status: 'active',
      premiumAmount: 1200,
      coverage: 25000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      terms: 'Standard policy terms',
      leadId: lead.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  });
}

export async function createTestClaim(overrides = {}) {
  const prisma = global.testDb;
  const policy = await createTestPolicy();
  
  return prisma.claim.create({
    data: {
      id: `test-claim-${Date.now()}`,
      claimNumber: `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      policyId: policy.id,
      leadId: policy.leadId,
      insuranceType: 'auto',
      claimType: 'auto_accident',
      status: 'submitted',
      priority: 'medium',
      severity: 'moderate',
      incidentDate: new Date(),
      submittedAt: new Date(),
      incidentDescription: 'Test incident description',
      incidentLocation: 'Test Location',
      claimedAmount: 5000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  });
}

// Clean up test data
async function cleanupTestData() {
  const prisma = global.testDb;
  
  if (!prisma) return;
  
  try {
    // Clean up in reverse dependency order
    await prisma.claimActivity.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.claimNote.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.claimDocument.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.claim.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.policy.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.lead.deleteMany({ where: { id: { startsWith: 'test-' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'test-' } } });
  } catch (error) {
    console.warn('Warning: Could not clean up test data:', error);
  }
}

// Global test helpers
(global as any).createTestUser = createTestUser;
(global as any).createTestLead = createTestLead;
(global as any).createTestPolicy = createTestPolicy;
(global as any).createTestClaim = createTestClaim;

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidClaimNumber(received: string) {
    const claimNumberRegex = /^CLM-\d{4}-\d{6}$/;
    const pass = claimNumberRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid claim number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid claim number (format: CLM-YYYY-XXXXXX)`,
        pass: false,
      };
    }
  },
  
  toHaveValidPolicyNumber(received: string) {
    const policyNumberRegex = /^POL-\d{10}$/;
    const pass = policyNumberRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid policy number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid policy number (format: POL-YYYYMMDDHH)`,
        pass: false,
      };
    }
  },
});