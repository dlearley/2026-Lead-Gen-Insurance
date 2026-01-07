import { describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { PerformanceOptimizer } from '../performance-optimizer.js';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let pool: Pool;

  beforeEach(() => {
    pool = new Pool({
      connectionString: 'postgresql://test:test@localhost:5432/test',
    });
    optimizer = new PerformanceOptimizer(pool, 500);
  });

  describe('Initialization', () => {
    it('should create optimizer with default slow query threshold', () => {
      const defaultOptimizer = new PerformanceOptimizer(pool);

      expect(defaultOptimizer['slowQueryThreshold']).toBe(500);
    });

    it('should create optimizer with custom slow query threshold', () => {
      const customOptimizer = new PerformanceOptimizer(pool, 1000);

      expect(customOptimizer['slowQueryThreshold']).toBe(1000);
    });
  });

  describe('Query Execution', () => {
    it('should execute query and return results', async () => {
      const results = await optimizer.executeQuery('SELECT 1 as value');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should log query metrics', async () => {
      await optimizer.executeQuery('SELECT 1');

      expect(optimizer['queryHistory']).toBeDefined();
      expect(optimizer['queryHistory'].length).toBeGreaterThan(0);
    });

    it('should execute query with parameters', async () => {
      const results = await optimizer.executeQuery('SELECT $1::int as value', [42]);

      expect(results).toBeDefined();
      expect(results[0]?.value).toBe(42);
    });
  });

  describe('Slow Query Detection', () => {
    it('should detect slow queries', async () => {
      // Mock slow query
      await optimizer.executeQuery('SELECT pg_sleep(1)', [], { logMetrics: true });

      const metrics = await optimizer.getQueryPerformanceMetrics();

      expect(metrics.slowQueryRate).toBeGreaterThan(0);
    });
  });

  describe('Slow Queries Retrieval', () => {
    it('should retrieve slow queries', async () => {
      const slowQueries = await optimizer.getSlowQueries(10, 500);

      expect(slowQueries).toBeDefined();
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it('should limit slow query results', async () => {
      const slowQueries = await optimizer.getSlowQueries(5, 500);

      expect(slowQueries.length).toBeLessThanOrEqual(5);
    });

    it('should filter by threshold', async () => {
      const slowQueries = await optimizer.getSlowQueries(10, 1000);

      slowQueries.forEach(sq => {
        expect(sq.meanDuration).toBeGreaterThan(1000);
      });
    });
  });

  describe('Index Recommendations', () => {
    it('should provide index recommendations', async () => {
      const recommendations = await optimizer.getIndexRecommendations();

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should include recommendation details', async () => {
      const recommendations = await optimizer.getIndexRecommendations();

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('table');
        expect(rec).toHaveProperty('columns');
        expect(rec).toHaveProperty('indexType');
        expect(rec).toHaveProperty('reason');
        expect(rec).toHaveProperty('estimatedImpact');
      });
    });
  });

  describe('Index Management', () => {
    it('should create index', async () => {
      await expect(
        optimizer.createIndex('leads', ['email'], {
          unique: true,
        })
      ).resolves.not.toThrow();
    });

    it('should create composite index', async () => {
      await expect(
        optimizer.createIndex('leads', ['status', 'created_at'], {
          indexType: 'btree',
        })
      ).resolves.not.toThrow();
    });

    it('should create GIN index', async () => {
      await expect(
        optimizer.createIndex('leads', ['metadata'], {
          indexType: 'gin',
        })
      ).resolves.not.toThrow();
    });

    it('should drop index', async () => {
      await expect(
        optimizer.dropIndex('idx_leads_email', {
          concurrently: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Table Statistics', () => {
    it('should get table statistics', async () => {
      const stats = await optimizer.getTableStatistics('leads');

      expect(stats).toBeDefined();
      expect(stats.tableName).toBe('leads');
      expect(stats).toHaveProperty('totalRows');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('bloatPercentage');
    });

    it('should get all tables statistics', async () => {
      const allStats = await optimizer.getAllTablesStatistics();

      expect(allStats).toBeDefined();
      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThan(0);
    });
  });

  describe('Query Analysis', () => {
    it('should explain query', async () => {
      const plan = await optimizer.explainQuery('SELECT * FROM leads LIMIT 1');

      expect(plan).toBeDefined();
    });

    it('should analyze query with parameters', async () => {
      const plan = await optimizer.explainQuery('SELECT * FROM leads WHERE id = $1', [
        'test-id',
      ]);

      expect(plan).toBeDefined();
    });

    it('should analyze query with analyze option', async () => {
      const plan = await optimizer.explainQuery('SELECT * FROM leads LIMIT 1', [], {
        analyze: true,
      });

      expect(plan).toBeDefined();
    });
  });

  describe('Unused Indexes', () => {
    it('should find unused indexes', async () => {
      const unusedIndexes = await optimizer.getUnusedIndexes(1);

      expect(unusedIndexes).toBeDefined();
      expect(Array.isArray(unusedIndexes)).toBe(true);
    });

    it('should filter by minimum size', async () => {
      const unusedIndexes = await optimizer.getUnusedIndexes(5); // 5MB minimum

      unusedIndexes.forEach(idx => {
        expect(idx.size).toBeGreaterThanOrEqual(5 * 1024 * 1024);
      });
    });
  });

  describe('Table Operations', () => {
    it('should analyze table', async () => {
      await expect(optimizer.analyzeTable('leads')).resolves.not.toThrow();
    });

    it('should vacuum table', async () => {
      await expect(optimizer.vacuumTable('leads')).resolves.not.toThrow();
    });

    it('should vacuum table with full option', async () => {
      await expect(optimizer.vacuumTable('leads', { full: true })).resolves.not.toThrow();
    });

    it('should vacuum table with analyze option', async () => {
      await expect(optimizer.vacuumTable('leads', { analyze: true })).resolves.not.toThrow();
    });

    it('should reindex table', async () => {
      await expect(optimizer.reindexTable('leads')).resolves.not.toThrow();
    });
  });

  describe('Query Metrics', () => {
    it('should track query performance metrics', async () => {
      await optimizer.executeQuery('SELECT 1');
      await optimizer.executeQuery('SELECT 2');
      await optimizer.executeQuery('SELECT 3');

      const metrics = await optimizer.getQueryPerformanceMetrics();

      expect(metrics.totalQueries).toBe(3);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    it('should calculate percentiles', async () => {
      await optimizer.executeQuery('SELECT 1');

      const metrics = await optimizer.getQueryPerformanceMetrics();

      expect(metrics).toHaveProperty('p50Duration');
      expect(metrics).toHaveProperty('p95Duration');
      expect(metrics).toHaveProperty('p99Duration');
    });

    it('should calculate slow query rate', async () => {
      const metrics = await optimizer.getQueryPerformanceMetrics();

      expect(metrics).toHaveProperty('slowQueryRate');
      expect(typeof metrics.slowQueryRate).toBe('number');
    });
  });

  describe('Query History Management', () => {
    it('should limit query history size', async () => {
      const largeOptimizer = new PerformanceOptimizer(pool, 500);

      // Execute many queries
      for (let i = 0; i < 2000; i++) {
        await largeOptimizer.executeQuery(`SELECT ${i}`);
      }

      expect(largeOptimizer['queryHistory'].length).toBeLessThanOrEqual(1000);
    });

    it('should clear query history', () => {
      optimizer.clearQueryHistory();

      expect(optimizer['queryHistory']).toHaveLength(0);
    });
  });

  describe('Slow Query Threshold', () => {
    it('should update slow query threshold', () => {
      optimizer.setSlowQueryThreshold(1000);

      expect(optimizer['slowQueryThreshold']).toBe(1000);
    });
  });

  describe('Slow Query Analysis', () => {
    it('should detect full table scans', () => {
      const query = 'SELECT * FROM leads';
      const analysis = optimizer['detectFullScan'](query);

      expect(analysis.hasFullScan).toBe(true);
    });

    it('should not detect full table scan with where clause', () => {
      const query = 'SELECT * FROM leads WHERE status = $1';
      const analysis = optimizer['detectFullScan'](query);

      expect(analysis.hasFullScan).toBe(false);
    });

    it('should analyze query structure', () => {
      const query = 'SELECT a, b FROM leads WHERE status = $1 ORDER BY created_at DESC LIMIT 10';
      const analysis = optimizer['analyzeSlowQuery'](query);

      expect(analysis).toHaveProperty('hasIndexHint');
      expect(analysis).toHaveProperty('hasFullScan');
      expect(analysis).toHaveProperty('hasJoin');
      expect(analysis).toHaveProperty('hasOrderBy');
      expect(analysis).toHaveProperty('hasLimit');
    });
  });

  describe('Column Extraction', () => {
    it('should extract columns from where clause', () => {
      const query = 'SELECT * FROM leads WHERE email = $1 AND status = $2';
      const columns = optimizer['extractColumnsFromQuery'](query);

      expect(columns).toContain('email');
      expect(columns).toContain('status');
    });

    it('should extract table name from query', () => {
      const query = 'SELECT * FROM leads WHERE status = $1';
      const tableName = optimizer['extractTableFromQuery'](query);

      expect(tableName).toBe('leads');
    });
  });
});
