import { Pool, PoolClient } from 'pg';
import { logger } from '../logger.js';

export interface QueryMetrics {
  query: string;
  duration: number;
  rows: number;
  timestamp: Date;
  parameters?: any[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  reason: string;
  estimatedImpact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SlowQuery {
  query: string;
  duration: number;
  calls: number;
  meanDuration: number;
  maxDuration: number;
}

export interface TableStatistics {
  tableName: string;
  totalRows: number;
  totalSize: number;
  indexSize: number;
  toastSize: number;
  sequenceScans: number;
  indexScans: number;
  bloatPercentage: number;
}

export class PerformanceOptimizer {
  private pool: Pool;
  private queryHistory: QueryMetrics[] = [];
  private maxHistorySize = 1000;
  private slowQueryThreshold = 500;

  constructor(pool: Pool, slowQueryThreshold?: number) {
    this.pool = pool;
    if (slowQueryThreshold) {
      this.slowQueryThreshold = slowQueryThreshold;
    }
  }

  async executeQuery<T = any>(
    query: string,
    params?: any[],
    options?: { logMetrics?: boolean }
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.pool.query(query, params);
      const duration = Date.now() - startTime;

      const metrics: QueryMetrics = {
        query,
        duration,
        rows: result.rowCount || 0,
        timestamp: new Date(),
        parameters: params,
      };

      if (options?.logMetrics !== false) {
        this.recordQuery(metrics);
      }

      if (duration > this.slowQueryThreshold) {
        this.handleSlowQuery(metrics);
      }

      return result.rows as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution failed', {
        query: query.substring(0, 200),
        duration,
        error,
      });
      throw error;
    }
  }

  private recordQuery(metrics: QueryMetrics): void {
    this.queryHistory.push(metrics);

    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }
  }

  private handleSlowQuery(metrics: QueryMetrics): void {
    logger.warn('Slow query detected', {
      query: metrics.query.substring(0, 200),
      duration: metrics.duration,
      rows: metrics.rows,
      parameters: metrics.parameters,
    });

    if (metrics.duration > 5000) {
      const analysis = this.analyzeSlowQuery(metrics.query);
      logger.info('Slow query analysis', analysis);
    }
  }

  private analyzeSlowQuery(query: string): {
    hasIndexHint: boolean;
    hasFullScan: boolean;
    hasJoin: boolean;
    hasSubquery: boolean;
    hasOrderBy: boolean;
    hasGroupBy: boolean;
  } {
    const normalizedQuery = query.toLowerCase();

    return {
      hasIndexHint: normalizedQuery.includes('use index') || normalizedQuery.includes('force index'),
      hasFullScan: this.detectFullScan(query),
      hasJoin: normalizedQuery.includes(' join '),
      hasSubquery: normalizedQuery.includes('select') && normalizedQuery.split('select').length > 2,
      hasOrderBy: normalizedQuery.includes('order by'),
      hasGroupBy: normalizedQuery.includes('group by'),
    };
  }

  private detectFullScan(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return (
      normalizedQuery.includes('select *') &&
      !normalizedQuery.includes('where') &&
      !normalizedQuery.includes('limit')
    );
  }

  async getSlowQueries(thresholdMs?: number, limit = 20): Promise<SlowQuery[]> {
    const threshold = thresholdMs || this.slowQueryThreshold;

    const result = await this.pool.query(
      `
      SELECT
        query,
        calls,
        total_exec_time / calls as mean_duration,
        max_exec_time as max_duration,
        total_exec_time as total_duration
      FROM pg_stat_statements
      WHERE mean_exec_time > $1
      ORDER BY mean_duration DESC
      LIMIT $2
      `,
      [threshold, limit]
    );

    return result.rows.map((row: any) => ({
      query: row.query,
      duration: row.max_duration,
      calls: row.calls,
      meanDuration: row.mean_duration,
      maxDuration: row.max_duration,
    }));
  }

  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    const foreignKeysWithoutIndex = await this.pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes pi
        WHERE pi.tablename = tc.table_name
        AND pi.indexdef LIKE '%' || kcu.column_name || '%'
      )
    `);

    for (const row of foreignKeysWithoutIndex.rows) {
      recommendations.push({
        table: row.table_name,
        columns: [row.column_name],
        indexType: 'btree',
        reason: 'Foreign key without index',
        estimatedImpact: 'HIGH',
      });
    }

    const frequentQueries = await this.pool.query(`
      SELECT
        query,
        calls
      FROM pg_stat_statements
      ORDER BY calls DESC
      LIMIT 10
    `);

    for (const row of frequentQueries.rows) {
      const columns = this.extractColumnsFromQuery(row.query);
      if (columns.length > 0) {
        recommendations.push({
          table: this.extractTableFromQuery(row.query),
          columns,
          indexType: 'btree',
          reason: `Frequently executed query (${row.calls} calls)`,
          estimatedImpact: 'MEDIUM',
        });
      }
    }

    return recommendations;
  }

  private extractColumnsFromQuery(query: string): string[] {
    const whereMatch = query.match(/where\s+([\s\S]+?)(?:\s+group\s+by|\s+order\s+by|\s+limit|;|$)/i);
    if (!whereMatch) return [];

    const columns: string[] = [];
    const whereClause = whereMatch[1];

    const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
    if (columnMatches) {
      for (const match of columnMatches) {
        const column = match.replace(/\s*[=<>!].*/, '').trim();
        if (
          !column.toLowerCase().startsWith('and') &&
          !column.toLowerCase().startsWith('or') &&
          !column.toLowerCase().includes('(')
        ) {
          columns.push(column);
        }
      }
    }

    return [...new Set(columns)].slice(0, 3);
  }

  private extractTableFromQuery(query: string): string {
    const fromMatch = query.match(/from\s+(\w+)/i);
    return fromMatch ? fromMatch[1] : '';
  }

  async createIndex(
    table: string,
    columns: string[],
    options?: {
      indexType?: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
      unique?: boolean;
      ifNotExists?: boolean;
      concurrently?: boolean;
      name?: string;
    }
  ): Promise<void> {
    const indexType = options?.indexType || 'btree';
    const indexName = options?.name || `idx_${table}_${columns.join('_')}`;
    const unique = options?.unique ? 'UNIQUE ' : '';
    const concurrently = options?.concurrently ? 'CONCURRENTLY ' : '';
    const ifNotExists = options?.ifNotExists ? 'IF NOT EXISTS ' : '';

    const query = `
      CREATE ${unique} INDEX ${concurrently}${ifNotExists}${indexName}
      ON ${table} USING ${indexType} (${columns.join(', ')})
    `;

    try {
      await this.pool.query(query);
      logger.info('Index created', { table, columns, indexName });
    } catch (error) {
      logger.error('Failed to create index', { table, columns, error });
      throw error;
    }
  }

  async dropIndex(indexName: string, options?: { concurrently?: boolean; ifExists?: boolean }): Promise<void> {
    const concurrently = options?.concurrently ? 'CONCURRENTLY ' : '';
    const ifExists = options?.ifExists ? 'IF EXISTS ' : '';

    const query = `DROP INDEX ${concurrently}${ifExists}${indexName}`;

    try {
      await this.pool.query(query);
      logger.info('Index dropped', { indexName });
    } catch (error) {
      logger.error('Failed to drop index', { indexName, error });
      throw error;
    }
  }

  async analyzeTable(tableName: string): Promise<void> {
    try {
      await this.pool.query(`ANALYZE ${tableName}`);
      logger.info('Table analyzed', { tableName });
    } catch (error) {
      logger.error('Failed to analyze table', { tableName, error });
      throw error;
    }
  }

  async vacuumTable(tableName: string, options?: { full?: boolean; analyze?: boolean }): Promise<void> {
    const full = options?.full ? 'FULL ' : '';
    const analyze = options?.analyze ? 'ANALYZE' : '';

    try {
      await this.pool.query(`VACUUM ${full}${analyze} ${tableName}`);
      logger.info('Table vacuumed', { tableName, full: !!options?.full, analyze: !!options?.analyze });
    } catch (error) {
      logger.error('Failed to vacuum table', { tableName, error });
      throw error;
    }
  }

  async reindexTable(tableName: string): Promise<void> {
    try {
      await this.pool.query(`REINDEX TABLE ${tableName}`);
      logger.info('Table reindexed', { tableName });
    } catch (error) {
      logger.error('Failed to reindex table', { tableName, error });
      throw error;
    }
  }

  async getTableStatistics(tableName: string): Promise<TableStatistics> {
    const result = await this.pool.query(
      `
      SELECT
        schemaname as schema_name,
        tablename as table_name,
        n_live_tup as total_rows,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_tup_hot_upd as hot_updates,
        seq_scan as sequence_scans,
        idx_scan as index_scans,
        seq_tup_read as seq_rows_read,
        idx_tup_fetch as idx_rows_fetched
      FROM pg_stat_user_tables
      WHERE tablename = $1
      `,
      [tableName]
    );

    const stats = await this.pool.query(
      `
      SELECT
        pg_total_relation_size($1::regclass) as total_size,
        pg_relation_size($1::regclass) as table_size,
        pg_indexes_size($1::regclass) as index_size,
        pg_total_relation_size($1::regclass) - pg_relation_size($1::regclass) as toast_size
      `,
      [tableName]
    );

    const bloatResult = await this.pool.query(
      `
      SELECT
        CASE
          WHEN pg_total_relation_size($1::regclass) = 0 THEN 0
          ELSE (pg_total_relation_size($1::regclass) - pg_relation_size($1::regclass) - pg_indexes_size($1::regclass))::float / pg_total_relation_size($1::regclass) * 100
        END as bloat_percentage
      `,
      [tableName]
    );

    return {
      tableName,
      totalRows: result.rows[0]?.total_rows || 0,
      totalSize: stats.rows[0]?.total_size || 0,
      indexSize: stats.rows[0]?.index_size || 0,
      toastSize: stats.rows[0]?.toast_size || 0,
      sequenceScans: result.rows[0]?.sequence_scans || 0,
      indexScans: result.rows[0]?.index_scans || 0,
      bloatPercentage: bloatResult.rows[0]?.bloat_percentage || 0,
    };
  }

  async getAllTablesStatistics(): Promise<TableStatistics[]> {
    const result = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const statistics: TableStatistics[] = [];

    for (const row of result.rows) {
      try {
        const stats = await this.getTableStatistics(row.tablename);
        statistics.push(stats);
      } catch (error) {
        logger.error('Failed to get table statistics', { tableName: row.tablename, error });
      }
    }

    return statistics;
  }

  async getUnusedIndexes(minSizeMb = 1): Promise<Array<{ indexName: string; tableName: string; size: number }>> {
    const result = await this.pool.query(
      `
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_relation_size(indexrelid) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      AND pg_relation_size(indexrelid) > $1 * 1024 * 1024
      ORDER BY size DESC
      `,
      [minSizeMb]
    );

    return result.rows.map((row: any) => ({
      indexName: row.indexname,
      tableName: row.tablename,
      size: row.size,
    }));
  }

  async getQueryPerformanceMetrics() {
    const queries = await this.queryHistory;
    const totalQueries = queries.length;
    const slowQueries = queries.filter(q => q.duration > this.slowQueryThreshold);

    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowQueryRate: 0,
      };
    }

    const durations = queries.map(q => q.duration).sort((a, b) => a - b);
    const totalDuration = queries.reduce((acc, q) => acc + q.duration, 0);

    return {
      totalQueries,
      averageDuration: totalDuration / totalQueries,
      p50Duration: durations[Math.floor(totalQueries * 0.5)],
      p95Duration: durations[Math.floor(totalQueries * 0.95)],
      p99Duration: durations[Math.floor(totalQueries * 0.99)],
      slowQueryRate: (slowQueries.length / totalQueries) * 100,
    };
  }

  async explainQuery(query: string, params?: any[], options?: { analyze?: boolean }): Promise<any> {
    const explainPrefix = options?.analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)' : 'EXPLAIN (FORMAT JSON)';
    const fullQuery = `${explainPrefix} ${query}`;

    try {
      const result = await this.pool.query(fullQuery, params);
      return result.rows[0]['QUERY PLAN'];
    } catch (error) {
      logger.error('Failed to explain query', { query: query.substring(0, 200), error });
      throw error;
    }
  }

  clearQueryHistory(): void {
    this.queryHistory = [];
  }

  setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs;
  }
}
