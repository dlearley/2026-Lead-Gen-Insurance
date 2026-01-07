/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';
import { logger } from '../logger.js';
import { maskCommonPIIFields } from './masking.js';

export type AuditStatus = 'success' | 'failure';

export interface AuditLogRecord {
  auditId: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  status: AuditStatus;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  authContext?: Record<string, any>;
}

export type AuditLogRecordInput = Omit<AuditLogRecord, 'auditId' | 'timestamp'> & {
  auditId?: string;
  timestamp?: Date;
};

export interface AuditWriter {
  write(record: AuditLogRecord): Promise<void>;
  writeBatch?(records: AuditLogRecord[]): Promise<void>;
}

export interface AuditLogServiceConfig {
  batchDelayMs?: number;
  batchSize?: number;
  maxQueueSize?: number;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  maskSnapshots?: boolean;
}

interface QueuedItem {
  record: AuditLogRecord;
  resolve: () => void;
  reject: (err: Error) => void;
}

export class AuditLogService {
  private readonly writer: AuditWriter;
  private readonly config: Required<AuditLogServiceConfig>;

  private queue: QueuedItem[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(writer: AuditWriter, config: AuditLogServiceConfig = {}) {
    this.writer = writer;
    this.config = {
      batchDelayMs: config.batchDelayMs ?? 100,
      batchSize: config.batchSize ?? 100,
      maxQueueSize: config.maxQueueSize ?? 10_000,
      retryAttempts: config.retryAttempts ?? 3,
      retryBaseDelayMs: config.retryBaseDelayMs ?? 50,
      maskSnapshots: config.maskSnapshots ?? true,
    };
  }

  async logCritical(input: AuditLogRecordInput): Promise<void> {
    const record = this.normalize(input);
    await this.writeWithRetry([record]);
  }

  log(input: AuditLogRecordInput): Promise<void> {
    const record = this.normalize(input);

    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn('Audit queue at capacity; falling back to synchronous writes', {
        queued: this.queue.length,
      });
      return this.writeWithRetry([record]);
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ record, resolve, reject });

      if (this.queue.length >= this.config.batchSize) {
        void this.flush();
        return;
      }

      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          void this.flush();
        }, this.config.batchDelayMs);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.queue.length === 0) return;

    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.config.batchSize);
        const records = batch.map((i) => i.record);

        try {
          await this.writeWithRetry(records);
          for (const item of batch) item.resolve();
        } catch (err) {
          const e = err instanceof Error ? err : new Error('audit_write_failed');
          logger.error('Audit write failed', { error: e.message });
          for (const item of batch) item.reject(e);
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private normalize(input: AuditLogRecordInput): AuditLogRecord {
    const auditId = input.auditId ?? randomUUID();
    const timestamp = input.timestamp ?? new Date();

    const oldValues = this.config.maskSnapshots ? maskCommonPIIFields(input.oldValues) : input.oldValues;
    const newValues = this.config.maskSnapshots ? maskCommonPIIFields(input.newValues) : input.newValues;

    return {
      auditId,
      timestamp,
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      oldValues,
      newValues,
      status: input.status,
      errorMessage: input.errorMessage,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      sessionId: input.sessionId,
      authContext: input.authContext,
    };
  }

  private async writeWithRetry(records: AuditLogRecord[]): Promise<void> {
    let attempt = 0;
    let lastErr: unknown;

    while (attempt < this.config.retryAttempts) {
      try {
        if (records.length === 1 || !this.writer.writeBatch) {
          for (const r of records) {
            await this.writer.write(r);
          }
        } else {
          await this.writer.writeBatch(records);
        }
        return;
      } catch (err) {
        lastErr = err;
        attempt++;
        const delay = this.config.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw (lastErr instanceof Error ? lastErr : new Error('audit_write_failed'));
  }
}

export class ConsoleAuditWriter implements AuditWriter {
  async write(record: AuditLogRecord): Promise<void> {
    logger.info('audit_log', {
      audit: true,
      audit_id: record.auditId,
      timestamp: record.timestamp.toISOString(),
      user_id: record.userId,
      user_email: record.userEmail,
      action: record.action,
      resource_type: record.resourceType,
      resource_id: record.resourceId,
      old_values: record.oldValues,
      new_values: record.newValues,
      status: record.status,
      error_message: record.errorMessage,
      ip_address: record.ipAddress,
      user_agent: record.userAgent,
      request_id: record.requestId,
      session_id: record.sessionId,
      auth_context: record.authContext,
    });
  }
}

export class InMemoryAuditWriter implements AuditWriter {
  public readonly records: AuditLogRecord[] = [];

  async write(record: AuditLogRecord): Promise<void> {
    this.records.push(record);
  }

  async writeBatch(records: AuditLogRecord[]): Promise<void> {
    this.records.push(...records);
  }
}
