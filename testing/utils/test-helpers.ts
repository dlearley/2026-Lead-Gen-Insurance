import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

// Test data factories for consistent test data generation
export class TestDataFactory {
  private static counter = 0;

  static createUser(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-user-${timestamp}`,
      email: `user-${timestamp}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'agent',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createLead(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-lead-${timestamp}`,
      firstName: 'John',
      lastName: 'Doe',
      email: `lead-${timestamp}@example.com`,
      phone: '+1234567890',
      insuranceType: 'auto',
      status: 'new',
      priority: 'medium',
      source: 'website',
      estimatedValue: 5000,
      notes: 'Test lead notes',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createPolicy(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-policy-${timestamp}`,
      policyNumber: `POL-${timestamp}`,
      type: 'auto',
      status: 'active',
      premiumAmount: 1200,
      coverage: 25000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      terms: 'Standard policy terms',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createClaim(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-claim-${timestamp}`,
      claimNumber: `CLM-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`,
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
    };
  }

  static createClaimDocument(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-doc-${timestamp}`,
      documentType: 'police_report',
      fileName: `document-${timestamp}.pdf`,
      fileSize: 1024000,
      mimeType: 'application/pdf',
      description: 'Test document',
      isVerified: false,
      uploadedAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createClaimNote(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-note-${timestamp}`,
      content: 'Test claim note',
      isInternal: true,
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createClaimActivity(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-activity-${timestamp}`,
      action: 'status_changed',
      description: 'Test activity',
      userId: 'test-user',
      timestamp: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createCarrier(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-carrier-${timestamp}`,
      name: `Test Carrier ${timestamp}`,
      code: `TC${timestamp}`,
      website: `https://carrier-${timestamp}.com`,
      isActive: true,
      partnershipStatus: 'ACTIVE',
      partnershipTier: 'STANDARD',
      performanceScore: 75,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createCarrierPerformanceMetric(overrides: Partial<any> = {}) {
    TestDataFactory.counter++;
    const timestamp = Date.now() + TestDataFactory.counter;
    
    return {
      id: `test-metric-${timestamp}`,
      carrierId: `test-carrier-${timestamp}`,
      month: 1,
      year: 2024,
      leadsReceived: 100,
      leadsConverted: 40,
      conversionRate: 40.0,
      averageResponseTime: 2.0,
      averageQuoteValue: 1000.0,
      customerSatisfaction: 90.0,
      onTimeDeliveryRate: 95.0,
      createdAt: new Date(),
      ...overrides,
    };
  }
}

// Database utilities for test setup and teardown
export class TestDatabase {
  static async setup(prisma: PrismaClient) {
    // Ensure we're in a transaction for test isolation
    await prisma.$transaction(async (tx) => {
      // Clean existing test data
      await this.cleanup(tx);
      
      // Create test data as needed
      // This will be called from individual tests
    });
  }

  static async cleanup(prisma: PrismaClient) {
    // Clean up in reverse dependency order
    await prisma.claimActivity.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.claimNote.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.claimDocument.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.claim.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.policy.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.lead.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.user.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.carrierPerformanceMetric.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
    
    await prisma.carrier.deleteMany({
      where: { id: { startsWith: 'test-' } }
    });
  }

  static async createCompleteWorkflow(prisma: PrismaClient) {
    // Create a complete lead -> policy -> claim workflow for testing
    const user = await prisma.user.create({
      data: TestDataFactory.createUser()
    });

    const lead = await prisma.lead.create({
      data: {
        ...TestDataFactory.createLead(),
        assignedTo: user.id
      }
    });

    const policy = await prisma.policy.create({
      data: {
        ...TestDataFactory.createPolicy(),
        leadId: lead.id
      }
    });

    const claim = await prisma.claim.create({
      data: {
        ...TestDataFactory.createClaim(),
        policyId: policy.id,
        leadId: lead.id
      }
    });

    const claimDocument = await prisma.claimDocument.create({
      data: {
        ...TestDataFactory.createClaimDocument(),
        claimId: claim.id
      }
    });

    const claimNote = await prisma.claimNote.create({
      data: {
        ...TestDataFactory.createClaimNote(),
        claimId: claim.id,
        author: user.id
      }
    });

    const claimActivity = await prisma.claimActivity.create({
      data: {
        ...TestDataFactory.createClaimActivity(),
        claimId: claim.id,
        userId: user.id
      }
    });

    return {
      user,
      lead,
      policy,
      claim,
      claimDocument,
      claimNote,
      claimActivity
    };
  }
}

// Mock external services
export class MockServices {
  static createEmailService() {
    return {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
      sendClaimUpdateEmail: jest.fn().mockResolvedValue({ success: true }),
      sendRejectionEmail: jest.fn().mockResolvedValue({ success: true }),
    };
  }

  static createFileStorageService() {
    return {
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://example.com/test-file.pdf',
        key: 'test-file-key'
      }),
      deleteFile: jest.fn().mockResolvedValue({ success: true }),
      getFileUrl: jest.fn().mockReturnValue('https://example.com/test-file.pdf'),
    };
  }

  static createPaymentService() {
    return {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'test-transaction-id',
        amount: 5000
      }),
      refundPayment: jest.fn().mockResolvedValue({
        success: true,
        refundId: 'test-refund-id'
      }),
    };
  }

  static createNotificationService() {
    return {
      sendSMS: jest.fn().mockResolvedValue({ success: true }),
      sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
      sendSlackNotification: jest.fn().mockResolvedValue({ success: true }),
    };
  }

  static createAnalyticsService() {
    return {
      trackEvent: jest.fn().mockResolvedValue({ success: true }),
      trackLeadConversion: jest.fn().mockResolvedValue({ success: true }),
      trackClaimSubmission: jest.fn().mockResolvedValue({ success: true }),
    };
  }
}

// Test environment helpers
export class TestEnvironment {
  static setupEnvironment() {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance_lead_gen_test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
  }

  static cleanupEnvironment() {
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.REDIS_URL;
  }
}

// Assertion helpers
export class TestAssertions {
  static expectValidClaimNumber(claimNumber: string) {
    const claimNumberRegex = /^CLM-\d{4}-\d{6}$/;
    expect(claimNumber).toMatch(claimNumberRegex);
  }

  static expectValidPolicyNumber(policyNumber: string) {
    const policyNumberRegex = /^POL-\d{10}$/;
    expect(policyNumber).toMatch(policyNumberRegex);
  }

  static expectValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(email).toMatch(emailRegex);
  }

  static expectValidPhoneNumber(phone: string) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    expect(phone).toMatch(phoneRegex);
  }

  static expectValidDate(dateString: string) {
    const date = new Date(dateString);
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
  }

  static expectClaimStatusTransition(fromStatus: string, toStatus: string) {
    const validTransitions: Record<string, string[]> = {
      'draft': ['submitted'],
      'submitted': ['review', 'cancelled'],
      'review': ['approved', 'denied', 'cancelled'],
      'approved': ['paid', 'cancelled'],
      'denied': ['cancelled'],
      'paid': ['closed'],
      'cancelled': [],
      'closed': []
    };

    expect(validTransitions[fromStatus] || []).toContain(toStatus);
  }

  static expectLeadStatusTransition(fromStatus: string, toStatus: string) {
    const validTransitions: Record<string, string[]> = {
      'new': ['contacted', 'cancelled'],
      'contacted': ['qualified', 'cancelled'],
      'qualified': ['converted', 'cancelled'],
      'converted': ['cancelled'],
      'cancelled': []
    };

    expect(validTransitions[fromStatus] || []).toContain(toStatus);
  }
}

// Performance test helpers
export class PerformanceTestHelpers {
  static async measureExecutionTime(fn: () => Promise<any>): Promise<{ duration: number; result: any }> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    return { duration, result };
  }

  static expectPerformanceToBeWithin(duration: number, maxMs: number) {
    expect(duration).toBeLessThan(maxMs);
  }

  static createLoadTestData(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `load-test-${i}-${Date.now()}`,
      data: `Load test data ${i}`,
      timestamp: new Date(),
      index: i
    }));
  }
}