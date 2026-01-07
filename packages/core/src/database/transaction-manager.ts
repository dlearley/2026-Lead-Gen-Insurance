import { PoolClient } from 'pg';
import { logger } from '../logger.js';

export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  readOnly?: boolean;
  deferrable?: boolean;
  transactionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionContext {
  transactionId: string;
  startTime: number;
  isolationLevel: IsolationLevel;
  modifiedTables: Set<string>;
  modifiedRows: number;
  userId?: string;
  metadata: Record<string, any>;
}

export interface TransactionResult<T> {
  data: T;
  transactionId: string;
  duration: number;
  modifiedTables: string[];
  modifiedRows: number;
  isolationLevel: IsolationLevel;
}

export interface LockOptions {
  timeout?: number;
  skipLocked?: boolean;
  nowait?: boolean;
}

export class TransactionManager {
  private activeTransactions = new Map<string, TransactionContext>();
  private longRunningThreshold = 30000;

  async runTransaction<T>(
    client: PoolClient,
    callback: (client: PoolClient, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = options.transactionId || this.generateTransactionId();
    const startTime = Date.now();
    const isolationLevel = options.isolationLevel || IsolationLevel.READ_COMMITTED;

    const context: TransactionContext = {
      transactionId,
      startTime,
      isolationLevel,
      modifiedTables: new Set(),
      modifiedRows: 0,
      userId: options.userId,
      metadata: options.metadata || {},
    };

    this.activeTransactions.set(transactionId, context);

    try {
      await this.beginTransaction(client, options);
      const result = await callback(client, context);
      await this.commitTransaction(client);

      const duration = Date.now() - startTime;

      if (duration > this.longRunningThreshold) {
        logger.warn(`Long-running transaction detected`, {
          transactionId,
          duration,
          isolationLevel,
          modifiedTables: Array.from(context.modifiedTables),
          modifiedRows: context.modifiedRows,
        });
      }

      return {
        data: result,
        transactionId,
        duration,
        modifiedTables: Array.from(context.modifiedTables),
        modifiedRows: context.modifiedRows,
        isolationLevel,
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      logger.error(`Transaction rolled back`, {
        transactionId,
        error,
        isolationLevel,
        modifiedTables: Array.from(context.modifiedTables),
        modifiedRows: context.modifiedRows,
      });
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  async runTransactionWithRetry<T>(
    client: PoolClient,
    callback: (client: PoolClient, context: TransactionContext) => Promise<T>,
    options: TransactionOptions & { maxRetries?: number } = {}
  ): Promise<TransactionResult<T>> {
    const maxRetries = options.maxRetries || 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.runTransaction(client, callback, options);
      } catch (error) {
        lastError = error;

        if (!this.isDeadlockError(error) || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 100;
        logger.warn(`Deadlock detected, retrying transaction`, {
          attempt,
          maxRetries,
          delay,
          error: error.message,
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private async beginTransaction(
    client: PoolClient,
    options: TransactionOptions
  ): Promise<void> {
    const parts: string[] = ['BEGIN'];

    if (options.isolationLevel) {
      parts.push(`ISOLATION LEVEL ${options.isolationLevel}`);
    }

    if (options.readOnly) {
      parts.push('READ ONLY');
    }

    if (options.deferrable !== undefined) {
      parts.push(options.deferrable ? 'DEFERRABLE' : 'NOT DEFERRABLE');
    }

    await client.query(parts.join(' '));

    if (options.timeout) {
      await client.query(`SET LOCAL statement_timeout = ${options.timeout}`);
    }
  }

  private async commitTransaction(client: PoolClient): Promise<void> {
    await client.query('COMMIT');
  }

  private async rollbackTransaction(client: PoolClient): Promise<void> {
    await client.query('ROLLBACK');
  }

  async acquireRowLock(
    client: PoolClient,
    table: string,
    id: string | number,
    options: LockOptions = {}
  ): Promise<void> {
    const lockParts: string[] = ['SELECT 1 FROM', table, 'WHERE id = $1'];

    if (options.skipLocked) {
      lockParts.push('FOR UPDATE SKIP LOCKED');
    } else if (options.nowait) {
      lockParts.push('FOR UPDATE NOWAIT');
    } else {
      lockParts.push('FOR UPDATE');
    }

    const query = lockParts.join(' ');

    try {
      if (options.timeout) {
        await Promise.race([
          client.query(query, [id]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Lock timeout')), options.timeout)
          ),
        ]);
      } else {
        await client.query(query, [id]);
      }
    } catch (error) {
      if (this.isLockError(error)) {
        throw new Error(`Could not acquire lock on ${table}.${id}: ${error.message}`);
      }
      throw error;
    }
  }

  async acquireAdvisoryLock(
    client: PoolClient,
    key: bigint,
    options: LockOptions = {}
  ): Promise<boolean> {
    const query = options.skipLocked
      ? 'SELECT pg_try_advisory_xact_lock($1) as acquired'
      : 'SELECT pg_advisory_xact_lock($1)';

    try {
      if (options.skipLocked) {
        const result = await client.query(query, [key]);
        return result.rows[0].acquired;
      } else {
        await client.query(query, [key]);
        return true;
      }
    } catch (error) {
      logger.error('Failed to acquire advisory lock', { key, error });
      throw error;
    }
  }

  async acquireTableLock(
    client: PoolClient,
    table: string,
    mode: 'ACCESS EXCLUSIVE' | 'ROW EXCLUSIVE' | 'SHARE' | 'SHARE ROW EXCLUSIVE' | 'EXCLUSIVE'
  ): Promise<void> {
    await client.query(`LOCK TABLE ${table} IN ${mode} MODE`);
  }

  async savepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`SAVEPOINT ${name}`);
  }

  async rollbackToSavepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  async releaseSavepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }

  trackTableModification(context: TransactionContext, table: string, rowCount = 1): void {
    context.modifiedTables.add(table);
    context.modifiedRows += rowCount;
  }

  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  getLongRunningTransactions(thresholdMs?: number): TransactionContext[] {
    const threshold = thresholdMs || this.longRunningThreshold;
    const now = Date.now();

    return this.getActiveTransactions().filter(
      ctx => now - ctx.startTime > threshold
    );
  }

  getTransactionContext(transactionId: string): TransactionContext | undefined {
    return this.activeTransactions.get(transactionId);
  }

  private isDeadlockError(error: any): boolean {
    const deadlockCodes = ['40P01'];
    const message = error?.message?.toLowerCase() || '';
    return (
      deadlockCodes.includes(error?.code) ||
      message.includes('deadlock') ||
      message.includes('could not serialize access')
    );
  }

  private isLockError(error: any): boolean {
    const lockCodes = ['55P03'];
    const message = error?.message?.toLowerCase() || '';
    return (
      lockCodes.includes(error?.code) ||
      message.includes('could not obtain lock') ||
      message.includes('lock not available')
    );
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class OptimisticLock {
  static async updateWithVersion<T>(
    client: PoolClient,
    table: string,
    id: string | number,
    data: Partial<T>,
    currentVersion: number
  ): Promise<{ success: boolean; newVersion?: number; conflict?: boolean }> {
    const updates = Object.keys(data)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(data), currentVersion];
    const query = `
      UPDATE ${table}
      SET ${updates}, version = version + 1
      WHERE id = $1 AND version = $${values.length}
      RETURNING version
    `;

    try {
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return { success: false, conflict: true };
      }

      return { success: true, newVersion: result.rows[0].version };
    } catch (error) {
      logger.error('Optimistic lock update failed', { table, id, error });
      throw error;
    }
  }
}

export class PessimisticLock {
  static async lockAndQuery<T>(
    client: PoolClient,
    table: string,
    id: string | number,
    callback: (client: PoolClient) => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const query = `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`;

    try {
      await client.query(query, [id]);
      return await callback(client);
    } catch (error) {
      if (error?.message?.includes('could not obtain lock')) {
        throw new Error(`Resource is locked by another transaction`);
      }
      throw error;
    }
  }
}
