import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { BreachNotificationService } from '../breach-notification.service.js';

describe('BreachNotificationService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      dataBreachNotification: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'b_1',
          ...data,
          regulators: data.regulators ?? [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn(async () => ({ id: 'b_1' })),
        findUnique: jest.fn(async () => ({
          id: 'b_1',
          breachId: 'BR-1',
          breachDate: new Date(),
          discoveryDate: new Date(),
          affectedRecords: 10,
          affectedIndividuals: 10,
          breachType: 'UnauthorizedAccess',
          description: 'test',
          affectedDataTypes: ['PII'],
          systemsAffected: ['db'],
          severity: 'High',
          potentialHarm: 'harm',
          remediation: 'mitigate',
          preventionMeasures: null,
          notificationSent: false,
          notificationDate: null,
          notificationMethod: null,
          templateUsed: null,
          individualsNotified: 0,
          regulatorNotified: false,
          regulatorNotificationDate: null,
          regulators: [],
          regulatoryRef: null,
          filingRequired: true,
          investigationStart: null,
          investigationComplete: null,
          rootCause: null,
          investigationNotes: null,
          resolutionDate: null,
          status: 'Detected',
          complianceRequirements: ['CCPA'],
          legalCounsel: null,
          insuranceClaim: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findUniqueOrThrow: jest.fn(async () => ({ id: 'b_1' })),
      },
      breachNotificationRecipient: {
        createMany: jest.fn(async () => ({ count: 2 })),
        findMany: jest.fn(async () => [{ leadId: 'l1', notificationSent: false, acknowledged: false }]),
        updateMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(async () => ({ id: 'r1' })),
        upsert: jest.fn(async () => ({ id: 'r1' })),
      },
      event: {
        create: jest.fn(async () => ({ id: 'evt_1' })),
      },
    } as unknown as PrismaClient;
  });

  it('reports a breach and creates recipients', async () => {
    const svc = new BreachNotificationService(prisma);

    const breach = await svc.reportBreach({
      breachDate: new Date('2026-01-01T00:00:00.000Z'),
      discoveryDate: new Date('2026-01-02T00:00:00.000Z'),
      breachType: 'UnauthorizedAccess',
      description: 'desc',
      affectedDataTypes: ['PII'],
      affectedRecords: 10,
      affectedIndividuals: 10,
      systemsAffected: ['db'],
      severity: 'High',
      potentialHarm: 'harm',
      remediation: 'mitigate',
      complianceRequirements: ['CCPA'],
      leadIds: ['lead_1', 'lead_2'],
    });

    expect(breach.id).toBe('b_1');
    expect((prisma.dataBreachNotification.create as any) as jest.Mock).toHaveBeenCalled();
    expect((prisma.breachNotificationRecipient.createMany as any) as jest.Mock).toHaveBeenCalled();
  });

  it('marks recipients as notified', async () => {
    const svc = new BreachNotificationService(prisma);

    const result = await svc.notifyAffectedIndividuals('BR-1');

    expect(result.success).toBe(true);
    expect((prisma.breachNotificationRecipient.updateMany as any) as jest.Mock).toHaveBeenCalled();
    expect((prisma.dataBreachNotification.update as any) as jest.Mock).toHaveBeenCalled();
  });
});
