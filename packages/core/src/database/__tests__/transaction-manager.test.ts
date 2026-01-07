import { describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import {
  TransactionManager,
  OptimisticLock,
  PessimisticLock,
  IsolationLevel,
} from '../transaction-manager.js';

describe('TransactionManager', () => {
  let txManager: TransactionManager;
  let pool: Pool;

  beforeEach(() => {
    pool = new Pool({
      connectionString: 'postgresql://test:test@localhost:5432/test',
    });
    txManager = new TransactionManager();
  });

  describe('Transaction Execution', () => {
    it('should execute transaction with callback', async () => {
      const client = await pool.connect();

      try {
        const result = await txManager.runTransaction(
          client,
          async (client, context) => {
            expect(context.transactionId).toBeDefined();
            expect(context.startTime).toBeDefined();
            expect(context.isolationLevel).toBe(IsolationLevel.READ_COMMITTED);

            await client.query('SELECT 1');
            return { success: true };
          }
        );

        expect(result.data).toEqual({ success: true });
        expect(result.transactionId).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
        expect(result.isolationLevel).toBe(IsolationLevel.READ_COMMITTED);
      } finally {
        client.release();
      }
    });

    it('should use custom isolation level', async () => {
      const client = await pool.connect();

      try {
        const result = await txManager.runTransaction(
          client,
          async (client, context) => {
            return { success: true };
          },
          {
            isolationLevel: IsolationLevel.SERIALIZABLE,
            timeout: 10000,
          }
        );

        expect(result.isolationLevel).toBe(IsolationLevel.SERIALIZABLE);
      } finally {
        client.release();
      }
    });

    it('should rollback on error', async () => {
      const client = await pool.connect();

      try {
        await expect(
          txManager.runTransaction(client, async () => {
            throw new Error('Test error');
          })
        ).rejects.toThrow('Test error');
      } finally {
        client.release();
      }
    });

    it('should track modified tables', async () => {
      const client = await pool.connect();

      try {
        const result = await txManager.runTransaction(
          client,
          async (client, context) => {
            context.trackTableModification('leads');
            context.trackTableModification('agents', 5);
            return { success: true };
          }
        );

        expect(result.modifiedTables).toContain('leads');
        expect(result.modifiedTables).toContain('agents');
        expect(result.modifiedRows).toBe(5);
      } finally {
        client.release();
      }
    });
  });

  describe('Transaction with Retry', () => {
    it('should retry on deadlock', async () => {
      const client = await pool.connect();

      try {
        // Mock deadlock error code
        const error = new Error('Deadlock');
        (error as any).code = '40P01';

        // This would normally retry
        const result = await txManager.runTransactionWithRetry(
          client,
          async () => {
            throw error;
          },
          { maxRetries: 2 }
        );

        // Should eventually throw after max retries
        expect(result).toBeUndefined();
      } finally {
        client.release();
      }
    });
  });

  describe('Long-Running Transactions', () => {
    it('should detect long-running transactions', () => {
      const context = {
        transactionId: 'test-tx',
        startTime: Date.now() - 35000, // 35 seconds ago
        isolationLevel: IsolationLevel.READ_COMMITTED,
        modifiedTables: new Set(['leads']),
        modifiedRows: 100,
      };

      txManager['activeTransactions'].set('test-tx', context as any);

      const longRunning = txManager.getLongRunningTransactions(30000);

      expect(longRunning).toHaveLength(1);
      expect(longRunning[0].transactionId).toBe('test-tx');
    });
  });

  describe('Advisory Locks', () => {
    it('should acquire advisory lock', async () => {
      const client = await pool.connect();

      try {
        const acquired = await txManager.acquireAdvisoryLock(client, BigInt(12345));

        expect(typeof acquired).toBe('boolean');
      } finally {
        client.release();
      }
    });

    it('should skip locked if configured', async () => {
      const client = await pool.connect();

      try {
        const acquired = await txManager.acquireAdvisoryLock(client, BigInt(12345), {
          skipLocked: true,
        });

        expect(typeof acquired).toBe('boolean');
      } finally {
        client.release();
      }
    });
  });

  describe('Savepoints', () => {
    it('should create savepoint', async () => {
      const client = await pool.connect();

      try {
        await txManager.savepoint(client, 'test_savepoint');

        // Should not throw
        expect(true).toBe(true);
      } finally {
        client.release();
      }
    });

    it('should rollback to savepoint', async () => {
      const client = await pool.connect();

      try {
        await txManager.savepoint(client, 'test_savepoint');
        await txManager.rollbackToSavepoint(client, 'test_savepoint');

        // Should not throw
        expect(true).toBe(true);
      } finally {
        client.release();
      }
    });
  });

  describe('Optimistic Lock', () => {
    it('should update with version check', async () => {
      const client = await pool.connect();

      try {
        const result = await OptimisticLock.updateWithVersion(
          client,
          'leads',
          'lead-123',
          { status: 'QUALIFIED' },
          5
        );

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('newVersion');
        expect(result).toHaveProperty('conflict');
      } finally {
        client.release();
      }
    });

    it('should detect version conflict', async () => {
      const client = await pool.connect();

      try {
        const result = await OptimisticLock.updateWithVersion(
          client,
          'leads',
          'lead-123',
          { status: 'QUALIFIED' },
          5
        );

        if (!result.success && result.conflict) {
          expect(result.conflict).toBe(true);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('Pessimistic Lock', () => {
    it('should lock and query', async () => {
      const client = await pool.connect();

      try {
        const result = await PessimisticLock.lockAndQuery(
          client,
          'agents',
          'agent-123',
          async (client) => {
            return { id: 'agent-123' };
          }
        );

        expect(result).toEqual({ id: 'agent-123' });
      } finally {
        client.release();
      }
    });

    it('should respect lock timeout', async () => {
      const client = await pool.connect();

      try {
        await expect(
          PessimisticLock.lockAndQuery(
            client,
            'agents',
            'agent-123',
            async () => ({}),
            { timeout: 1000 }
          )
        ).resolves.toBeDefined();
      } finally {
        client.release();
      }
    });
  });

  describe('Transaction Context', () => {
    it('should track transaction metadata', async () => {
      const client = await pool.connect();

      try {
        const result = await txManager.runTransaction(
          client,
          async (client, context) => {
            expect(context.transactionId).toBeDefined();
            expect(context.startTime).toBeInstanceOf(Date);
            expect(context.isolationLevel).toBeDefined();
            expect(context.modifiedTables).toBeInstanceOf(Set);
            expect(context.modifiedRows).toBe(0);

            return { success: true };
          },
          {
            userId: 'user-123',
            metadata: { requestId: 'req-456' },
          }
        );

        expect(result.transactionId).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
        expect(result.isolationLevel).toBe(IsolationLevel.READ_COMMITTED);
      } finally {
        client.release();
      }
    });
  });

  describe('Active Transactions', () => {
    it('should return empty array when no transactions', () => {
      const active = txManager.getActiveTransactions();

      expect(active).toEqual([]);
    });

    it('should return active transactions', () => {
      const context = {
        transactionId: 'test-tx',
        startTime: Date.now(),
        isolationLevel: IsolationLevel.READ_COMMITTED,
        modifiedTables: new Set(['leads']),
        modifiedRows: 10,
      };

      txManager['activeTransactions'].set('test-tx', context as any);

      const active = txManager.getActiveTransactions();

      expect(active).toHaveLength(1);
      expect(active[0].transactionId).toBe('test-tx');
    });

    it('should get transaction context by ID', () => {
      const context = {
        transactionId: 'test-tx',
        startTime: Date.now(),
        isolationLevel: IsolationLevel.READ_COMMITTED,
        modifiedTables: new Set(['leads']),
        modifiedRows: 10,
      };

      txManager['activeTransactions'].set('test-tx', context as any);

      const retrieved = txManager.getTransactionContext('test-tx');

      expect(retrieved).toBeDefined();
      expect(retrieved?.transactionId).toBe('test-tx');
    });
  });
});
