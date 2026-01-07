/**
 * Phase 25.1E: Immutable Audit Trail Service Tests
 *
 * These tests use a mocked Prisma client (no database required).
 */

import { ImmutableAuditTrailService } from '../immutable-audit-trail.service.js';
import type { AuditEventData } from '@insurance-lead-gen/types';

function createMockPrisma() {
  const logs: any[] = [];
  const integrityChecks: any[] = [];

  const prisma: any = {
    immutableAuditLog: {
      findFirst: jest.fn(async (args: any) => {
        if (logs.length === 0) return null;

        const orderBy = args?.orderBy;
        const select = args?.select;

        const last = orderBy?.sequenceNumber === 'desc' ? logs[logs.length - 1] : logs[0];

        if (select) {
          const selected: any = {};
          for (const key of Object.keys(select)) {
            if (select[key]) selected[key] = last[key];
          }
          return selected;
        }

        return last;
      }),

      create: jest.fn(async ({ data }: any) => {
        const sequenceNumber = BigInt(logs.length + 1);
        const now = new Date();
        const record = {
          id: `audit-${sequenceNumber.toString()}`,
          sequenceNumber,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        logs.push(record);
        return record;
      }),

      findUnique: jest.fn(async ({ where }: any) => {
        if (where?.id) return logs.find((l) => l.id === where.id) ?? null;
        if (where?.sequenceNumber !== undefined)
          return logs.find((l) => l.sequenceNumber === where.sequenceNumber) ?? null;
        return null;
      }),

      findMany: jest.fn(async (args: any) => {
        const where = args?.where ?? {};
        const orderBy = args?.orderBy;
        const select = args?.select;
        const take = args?.take;
        const skip = args?.skip ?? 0;

        let results = [...logs];

        if (where.actorId) results = results.filter((l) => l.actorId === where.actorId);
        if (where.resourceId) results = results.filter((l) => l.resourceId === where.resourceId);
        if (where.resourceType) results = results.filter((l) => l.resourceType === where.resourceType);
        if (where.eventType) results = results.filter((l) => l.eventType === where.eventType);
        if (where.eventCategory) results = results.filter((l) => l.eventCategory === where.eventCategory);
        if (where.severity) results = results.filter((l) => l.severity === where.severity);
        if (where.complianceStatus)
          results = results.filter((l) => l.complianceStatus === where.complianceStatus);
        if (where.riskLevel) results = results.filter((l) => l.riskLevel === where.riskLevel);

        if (where.timestamp?.gte || where.timestamp?.lte) {
          results = results.filter((l) => {
            const t = new Date(l.timestamp).getTime();
            const gte = where.timestamp?.gte ? new Date(where.timestamp.gte).getTime() : -Infinity;
            const lte = where.timestamp?.lte ? new Date(where.timestamp.lte).getTime() : Infinity;
            return t >= gte && t <= lte;
          });
        }

        if (where.sequenceNumber?.gte !== undefined || where.sequenceNumber?.lte !== undefined) {
          const gte = where.sequenceNumber?.gte ?? BigInt(0);
          const lte = where.sequenceNumber?.lte ?? BigInt(Number.MAX_SAFE_INTEGER);
          results = results.filter((l) => l.sequenceNumber >= gte && l.sequenceNumber <= lte);
        }

        if (orderBy?.timestamp) {
          results.sort((a, b) =>
            orderBy.timestamp === 'desc'
              ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        } else if (orderBy?.sequenceNumber) {
          results.sort((a, b) =>
            orderBy.sequenceNumber === 'desc'
              ? Number(b.sequenceNumber - a.sequenceNumber)
              : Number(a.sequenceNumber - b.sequenceNumber)
          );
        }

        results = results.slice(skip, take ? skip + take : undefined);

        if (select) {
          return results.map((r) => {
            const selected: any = {};
            for (const key of Object.keys(select)) {
              if (select[key]) selected[key] = r[key];
            }
            return selected;
          });
        }

        return results;
      }),

      count: jest.fn(async (args: any) => {
        const where = args?.where ?? {};
        const matches = await prisma.immutableAuditLog.findMany({ where });
        return matches.length;
      }),
    },

    auditLogIntegrityCheck: {
      create: jest.fn(async ({ data }: any) => {
        const record = { id: `check-${integrityChecks.length + 1}`, ...data };
        integrityChecks.push(record);
        return record;
      }),
      findMany: jest.fn(async () => []),
    },
  };

  return { prisma, logs, integrityChecks };
}

describe('ImmutableAuditTrailService', () => {
  let service: ImmutableAuditTrailService;
  let mock: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock = createMockPrisma();
    service = new ImmutableAuditTrailService(mock.prisma);
  });

  describe('logEvent', () => {
    it('logs an audit event with checksum and sequence', async () => {
      const eventData: AuditEventData = {
        eventType: 'LeadCreated',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-123',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-456',
        action: 'Create',
        success: true,
        newValues: { firstName: 'John', lastName: 'Doe' },
      };

      const log = await service.logEvent(eventData);

      expect(log.id).toBeDefined();
      expect(log.sequenceNumber).toBe(BigInt(1));
      expect(log.checksum).toEqual(expect.any(String));
      expect(log.chainHash).toBeNull();
    });

    it('creates chain hash for subsequent entries', async () => {
      const base: Omit<AuditEventData, 'eventType' | 'action'> = {
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-1',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-1',
        success: true,
      };

      const log1 = await service.logEvent({ ...base, eventType: 'Test1', action: 'Create' });
      const log2 = await service.logEvent({ ...base, eventType: 'Test2', action: 'Update' });

      expect(log1.chainHash).toBeNull();
      expect(log2.chainHash).toEqual(expect.any(String));
      expect(log2.chainHash).not.toBe(log1.chainHash);
    });
  });

  describe('queryAuditLogs', () => {
    it('filters by actorId', async () => {
      await service.logEvent({
        eventType: 'A',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-123',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-1',
        action: 'Create',
        success: true,
      });
      await service.logEvent({
        eventType: 'B',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-999',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-2',
        action: 'Create',
        success: true,
      });

      const logs = await service.queryAuditLogs({ actorId: 'user-123' });
      expect(logs).toHaveLength(1);
      expect(logs[0].actorId).toBe('user-123');
    });
  });

  describe('verifyChecksum', () => {
    it('returns true for a valid record', async () => {
      const log = await service.logEvent({
        eventType: 'LeadCreated',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-123',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-456',
        action: 'Create',
        success: true,
      });

      const isValid = await service.verifyChecksum(log.id);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyAuditIntegrity', () => {
    it('returns a result and stores an integrity check', async () => {
      await service.logEvent({
        eventType: 'X',
        eventCategory: 'LeadManagement',
        severity: 'Info',
        actorId: 'user-1',
        actorType: 'User',
        resourceType: 'Lead',
        resourceId: 'lead-1',
        action: 'Create',
        success: true,
      });

      const result = await service.verifyAuditIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalRecordsChecked).toBe(1);
      expect(mock.prisma.auditLogIntegrityCheck.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('detectTamperingAttempts', () => {
    it('returns an empty list when no invalid integrity checks exist', async () => {
      const alerts = await service.detectTamperingAttempts();
      expect(alerts).toEqual([]);
    });
  });
});
