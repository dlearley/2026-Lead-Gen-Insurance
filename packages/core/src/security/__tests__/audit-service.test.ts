import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { AuditLogService, InMemoryAuditWriter, type AuditWriter } from '../audit-service.js';

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flushes immediately when batch size is reached', async () => {
    const writer = new InMemoryAuditWriter();
    const svc = new AuditLogService(writer, { batchSize: 2, batchDelayMs: 10_000 });

    const p1 = svc.log({ action: 'a', status: 'success' });
    const p2 = svc.log({ action: 'b', status: 'success' });

    await Promise.all([p1, p2]);

    expect(writer.records).toHaveLength(2);
    expect(writer.records.map((r) => r.action)).toEqual(['a', 'b']);
  });

  it('flushes after the configured delay', async () => {
    jest.useFakeTimers();

    const writer = new InMemoryAuditWriter();
    const svc = new AuditLogService(writer, { batchSize: 100, batchDelayMs: 100 });

    const p = svc.log({ action: 'delayed', status: 'success' });

    expect(writer.records).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(100);
    await p;

    expect(writer.records).toHaveLength(1);
    expect(writer.records[0]?.action).toBe('delayed');
  });

  it('masks snapshots by default', async () => {
    const writer = new InMemoryAuditWriter();
    const svc = new AuditLogService(writer);

    await svc.logCritical({
      action: 'update',
      status: 'success',
      oldValues: { email: 'alice@example.com', phone: '555-123-4567' },
      newValues: { email: 'bob@example.com', phone: '555-111-2222' },
    });

    expect(writer.records).toHaveLength(1);
    expect(writer.records[0]?.oldValues).toEqual({ email: '***@example.com', phone: '***-***-4567' });
    expect(writer.records[0]?.newValues).toEqual({ email: '***@example.com', phone: '***-***-2222' });
  });

  it('retries writes on transient failures', async () => {
    let attempts = 0;

    const flakyWriter: AuditWriter = {
      write: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('transient');
        }
      },
    };

    const svc = new AuditLogService(flakyWriter, { retryAttempts: 3, retryBaseDelayMs: 1 });

    await svc.logCritical({ action: 'critical', status: 'success' });
    expect(attempts).toBe(3);
  });
});
