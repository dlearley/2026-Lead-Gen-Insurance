/**
 * Test Utilities and Factories
 * Provides common fixtures, mocks, and factory functions for testing
 */

import type { Lead, Agent, User, Policy, Referral, Partner, Reward } from '@insurance-lead-gen/types';
import { faker } from '@faker-js/faker';

// Type definitions for test fixtures
export interface TestLeadInput {
  source?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  insuranceType?: string;
  status?: Lead['status'];
  qualityScore?: number;
  address?: Partial<Lead['address']>;
  metadata?: Record<string, unknown>;
}

export interface TestAgentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  specializations?: string[];
  rating?: number;
  conversionRate?: number;
  currentLeadCount?: number;
  maxLeadCapacity?: number;
  isActive?: boolean;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface TestUserInput {
  email?: string;
  role?: User['role'];
  firstName?: string;
  lastName?: string;
}

export interface TestPartnerInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  commissionRate?: number;
}

// Faker-based factory functions
export function createLeadFactory(input: TestLeadInput = {}): Lead {
  const now = new Date();
  const insuranceTypes = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'BUSINESS'] as const;
  
  return {
    id: `lead_${faker.string.nanoid(16)}`,
    source: input.source ?? faker.helpers.arrayElement(['web_form', 'api', 'phone', 'referral', 'social']),
    email: input.email ?? faker.internet.email(),
    phone: input.phone ?? faker.phone.number('+1-###-###-####'),
    firstName: input.firstName ?? faker.person.firstName(),
    lastName: input.lastName ?? faker.person.lastName(),
    insuranceType: input.insuranceType ?? faker.helpers.arrayElement(insuranceTypes),
    status: input.status ?? 'received',
    qualityScore: input.qualityScore ?? faker.number.int({ min: 0, max: 100 }),
    address: {
      street: input.address?.street ?? faker.location.streetAddress(),
      city: input.address?.city ?? faker.location.city(),
      state: input.address?.state ?? faker.location.state(),
      zipCode: input.address?.zipCode ?? faker.location.zipCode(),
      country: input.address?.country ?? 'US',
    },
    metadata: input.metadata ?? {
      utm_source: faker.helpers.maybe(() => faker.internet.domainWord(), { probability: 0.5 }),
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createAgentFactory(input: TestAgentInput = {}): Agent {
  const states = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL'];
  const cities = ['San Francisco', 'New York', 'Los Angeles', 'Miami', 'Seattle', 'Chicago'];
  
  return {
    id: `agent_${faker.string.nanoid(12)}`,
    firstName: input.firstName ?? faker.person.firstName(),
    lastName: input.lastName ?? faker.person.lastName(),
    email: input.email ?? faker.internet.email(),
    specializations: input.specializations ?? faker.helpers.arrayElements(
      ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'BUSINESS'],
      { min: 1, max: 3 }
    ) as Agent['specializations'],
    rating: input.rating ?? faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
    conversionRate: input.conversionRate ?? faker.number.float({ min: 0.1, max: 0.5 }),
    currentLeadCount: input.currentLeadCount ?? faker.number.int({ min: 0, max: 15 }),
    maxLeadCapacity: input.maxLeadCapacity ?? 20,
    averageResponseTime: faker.number.int({ min: 600, max: 3600 }),
    isActive: input.isActive ?? true,
    licenseNumber: `LIC-${faker.string.alphanumeric(6).toUpperCase()}`,
    location: {
      city: input.location?.city ?? faker.helpers.arrayElement(cities),
      state: input.location?.state ?? faker.helpers.arrayElement(states),
      country: 'US',
    },
  };
}

export function createUserFactory(input: TestUserInput = {}): User {
  const roles = ['ADMIN', 'AGENT', 'BROKER', 'VIEWER'] as const;
  
  return {
    id: `user_${faker.string.nanoid(12)}`,
    email: input.email ?? faker.internet.email(),
    firstName: input.firstName ?? faker.person.firstName(),
    lastName: input.lastName ?? faker.person.lastName(),
    role: input.role ?? faker.helpers.arrayElement(roles),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createPartnerFactory(input: TestPartnerInput = {}): Partner {
  return {
    id: `partner_${faker.string.nanoid(12)}`,
    firstName: input.firstName ?? faker.person.firstName(),
    lastName: input.lastName ?? faker.person.lastName(),
    email: input.email ?? faker.internet.email(),
    phone: faker.phone.number('+1-###-###-####'),
    companyName: input.companyName ?? `${faker.company.name()} Insurance`,
    commissionRate: input.commissionRate ?? faker.number.float({ min: 0.05, max: 0.2 }),
    referralCode: generateReferralCode(),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createReferralFactory(partnerId: string): Referral {
  return {
    id: `referral_${faker.string.nanoid(12)}`,
    partnerId,
    referralCode: generateReferralCode(),
    source: faker.helpers.arrayElement(['website', 'social', 'email', 'in_person']),
    status: 'PENDING',
    notes: faker.lorem.sentence(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createRewardFactory(referralId: string, amount: number): Reward {
  return {
    id: `reward_${faker.string.nanoid(12)}`,
    referralId,
    amount,
    status: 'CALCULATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createPolicyFactory(leadId: string): Policy {
  const types = ['AUTO', 'HOME', 'LIFE', 'HEALTH'] as const;
  const statuses = ['PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED'] as const;
  
  return {
    id: `policy_${faker.string.nanoid(12)}`,
    leadId,
    policyNumber: `POL-${faker.string.alphanumeric(8).toUpperCase()}`,
    policyType: faker.helpers.arrayElement(types),
    status: faker.helpers.arrayElement(statuses),
    premium: faker.number.float({ min: 500, max: 5000, precision: 0.01 }),
    deductible: faker.number.int({ min: 250, max: 2000 }),
    coverage: faker.number.int({ min: 50000, max: 500000 }),
    effectiveDate: faker.date.future(),
    expirationDate: faker.date.future({ years: 1 }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to generate unique referral codes
function generateReferralCode(): string {
  return `REF-${faker.string.alphanumeric(6).toUpperCase()}`;
}

// Batch creation helpers
export function createLeadBatch(count: number, baseInput: TestLeadInput = {}): Lead[] {
  return Array.from({ length: count }, () => createLeadFactory(baseInput));
}

export function createAgentBatch(count: number, baseInput: TestAgentInput = {}): Agent[] {
  return Array.from({ length: count }, () => createAgentFactory(baseInput));
}

export function createUserBatch(count: number, baseInput: TestUserInput = {}): User[] {
  return Array.from({ length: count }, () => createUserFactory(baseInput));
}

// Mock data helpers
export function createMockAuthHeader(user: User): Record<string, string> {
  return {
    'Authorization': `Bearer mock_jwt_token_${user.id}`,
    'Content-Type': 'application/json',
  };
}

export function createMockSession(user: User): { userId: string; role: string; email: string } {
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
  };
}

// Date helpers for testing time-based logic
export function getRelativeDate(daysOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

export function createDateRange(startDaysAgo: number, endDaysFromNow: number): { start: Date; end: Date } {
  return {
    start: getRelativeDate(-startDaysAgo),
    end: getRelativeDate(endDaysFromNow),
  };
}

// Validation test data
export const VALID_LEAD_DATA = {
  minimum: {
    source: 'web_form',
    email: 'test@example.com',
  },
  full: {
    source: 'api',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    firstName: 'John',
    lastName: 'Doe',
    insuranceType: 'AUTO',
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US',
  },
};

export const INVALID_LEAD_DATA = {
  missingSource: {
    email: 'test@example.com',
  },
  invalidEmail: {
    source: 'web_form',
    email: 'not-an-email',
  },
  emptySource: {
    source: '',
    email: 'test@example.com',
  },
  invalidInsuranceType: {
    source: 'web_form',
    email: 'test@example.com',
    insuranceType: 'INVALID_TYPE',
  },
};

// API response helpers
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Error response helpers
export function createErrorResponse(message: string, statusCode: number = 400) {
  return {
    error: message,
    statusCode,
  };
}
