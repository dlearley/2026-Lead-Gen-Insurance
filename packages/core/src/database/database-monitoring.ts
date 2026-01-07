import { Pool } from 'pg';
import { logger } from '../logger.js';
import { Counter, Histogram, Gauge } from 'prom-client';

export interface DatabaseHealthMetrics {
  databaseName: string;
  isHealthy: boolean;
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  locks: {
    total: number;
    waiting: number;
  };
  transactions: {
    committed: number;
    rolledBack: number;
  };
  cache: {
    hitRatio: number;
    bytesRead: number;
  };
  replication: {
    isReplica: boolean;
    lag: number;
  };
  size: {
    total: number;
    indexes: number;
    tables: number;
  };
}

export interface SlowQueryInfo {
  queryId: string;
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
  rows: number;
}

export interface TableStatistics {
  tableName: string;
  sequentialScans: number;
  sequentialRowsRead: number;
  indexScans: number;
  indexRowsFetched: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsDeleted: number;
  liveRows: number;
  deadRows: number;
  size: number;
  indexSize: number;
}

export class DatabaseMonitoring {
  private pool: Pool;
  private metricsInitialized = false;

  private readonly connectionsActive: Gauge<string>;
  private readonly connectionsIdle: Gauge<string>;
  private readonly connectionsWaiting: Gauge<string>;
  private readonly queryDuration: Histogram<string>;
  private readonly queryErrors: Counter<string>;
  private readonly transactionDuration: Histogram<string>;
  private readonly slowQueries: Counter<string>;
  private readonly deadlocks: Counter<string>;

  constructor(pool: Pool, prefix = 'database') {
    this.pool = pool;

    this.connectionsActive = new Gauge({
      name: `${prefix}_connections_active`,
      help: 'Number of active database connections',
    });

    this.connectionsIdle = new Gauge({
      name: `${prefix}_connections_idle`,
      help: 'Number of idle database connections',
    });

    this.connectionsWaiting = new Gauge({
      name: `${prefix}_connections_waiting`,
      help: 'Number of waiting database connections',
    });

    this.queryDuration = new Histogram({
      name: `${prefix}_query_duration_seconds`,
      help: 'Database query duration in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      labelNames: ['query_type', 'table'],
    });

    this.queryErrors = new Counter({
      name: `${prefix}_query_errors_total`,
      help: 'Total number of query errors',
      labelNames: ['query_type', 'table', 'error_type'],
    });

    this.transactionDuration = new Histogram({
      name: `${prefix}_transaction_duration_seconds`,
      help: 'Database transaction duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.slowQueries = new Counter({
      name: `${prefix}_slow_queries_total`,
      help: 'Total number of slow queries',
      labelNames: ['table'],
    });

    this.deadlocks = new Counter({
      name: `${prefix}_deadlocks_total`,
      help: 'Total number of deadlocks',
    });
  }

  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    const connections = await this.getConnectionMetrics();
    const locks = await this.getLockMetrics();
    const transactions = await this.getTransactionMetrics();
    const cache = await this.getCacheMetrics();
    const replication = await this.getReplicationMetrics();
    const size = await this.getSizeMetrics();

    return {
      databaseName: await this.getDatabaseName(),
      isHealthy: await this.isHealthy(),
      connections,
      locks,
      transactions,
      cache,
      replication,
      size,
    };
  }

  private async getDatabaseName(): Promise<string> {
    const result = await this.pool.query('SELECT current_database()');
    return result.rows[0].current_database;
  }

  private async getConnectionMetrics() {
    const result = await this.pool.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
      FROM pg_stat_activity
    `);

    const row = result.rows[0];

    this.connectionsActive.set(row.active);
    this.connectionsIdle.set(row.idle);
    this.connectionsWaiting.set(row.waiting);

    return {
      total: row.total,
      active: row.active,
      idle: row.idle,
      waiting: row.waiting,
    };
  }

  private async getLockMetrics() {
    const result = await this.pool.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE wait_start IS NOT NULL) as waiting
      FROM pg_locks
      WHERE NOT granted
    `);

    const row = result.rows[0];
    return {
      total: row.total,
      waiting: row.waiting,
    };
  }

  private async getTransactionMetrics() {
    const result = await this.pool.query(`
      SELECT
        xact_commit as committed,
        xact_rollback as rolled_back
      FROM pg_stat_database
      WHERE datname = (SELECT current_database())
    `);

    const row = result.rows[0];
    return {
      committed: row.committed,
      rolledBack: row.rolled_back,
    };
  }

  private async getCacheMetrics() {
    const result = await this.pool.query(`
      SELECT
        blks_hit as cache_hits,
        blks_read as cache_misses
      FROM pg_stat_database
      WHERE datname = (SELECT current_database())
    `);

    const row = result.rows[0];
    const hitRatio = row.cache_hits + row.cache_misses > 0
      ? (row.cache_hits / (row.cache_hits + row.cache_misses)) * 100
      : 0;

    return {
      hitRatio,
      bytesRead: row.cache_misses,
    };
  }

  private async getReplicationMetrics() {
    const result = await this.pool.query(`
      SELECT
        pg_is_in_recovery() as is_replica,
        COALESCE(pg_last_xact_replay_timestamp()::timestamp, NOW()) - NOW() as lag
    `);

    const row = result.rows[0];
    return {
      isReplica: row.is_replica,
      lag: row.lag ? Math.abs(row.lag.seconds) : 0,
    };
  }

  private async getSizeMetrics() {
    const result = await this.pool.query(`
      SELECT
        pg_database_size((SELECT current_database())) as total,
        pg_indexes_size((SELECT current_database()::regclass)) as indexes,
        pg_total_relation_size((SELECT current_database()::regclass)) - pg_indexes_size((SELECT current_database()::regclass)) as tables
    `);

    const row = result.rows[0];
    return {
      total: row.total,
      indexes: row.indexes,
      tables: row.tables,
    };
  }

  private async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  async getSlowQueries(limit = 20, minDuration = 500): Promise<SlowQueryInfo[]> {
    const result = await this.pool.query(
      `
      SELECT
        queryid::text as query_id,
        query,
        calls,
        total_exec_time as total_time,
        mean_exec_time as mean_time,
        max_exec_time as max_time,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > $1
      ORDER BY mean_exec_time DESC
      LIMIT $2
      `,
      [minDuration, limit]
    );

    return result.rows.map((row: any) => ({
      queryId: row.query_id,
      query: row.query,
      calls: row.calls,
      totalTime: row.total_time,
      meanTime: row.mean_time,
      maxTime: row.max_time,
      rows: row.rows,
    }));
  }

  async getTableStatistics(): Promise<TableStatistics[]> {
    const result = await this.pool.query(`
      SELECT
        schemaname as schema,
        tablename as table_name,
        seq_scan as sequential_scans,
        seq_tup_read as sequential_rows_read,
        idx_scan as index_scans,
        idx_tup_fetch as index_rows_fetched,
        n_tup_ins as rows_inserted,
        n_tup_upd as rows_updated,
        n_tup_del as rows_deleted,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        pg_relation_size(schemaname || '.' || tablename) as size,
        pg_indexes_size(schemaname || '.' || tablename) as index_size
      FROM pg_stat_user_tables
      ORDER BY table_name
    `);

    return result.rows.map((row: any) => ({
      tableName: row.table_name,
      sequentialScans: row.sequential_scans,
      sequentialRowsRead: row.sequential_rows_read,
      indexScans: row.index_scans,
      indexRowsFetched: row.index_rows_fetched,
      rowsInserted: row.rows_inserted,
      rowsUpdated: row.rows_updated,
      rowsDeleted: row.rows_deleted,
      liveRows: row.live_rows,
      deadRows: row.dead_rows,
      size: row.size,
      indexSize: row.index_size,
    }));
  }

  async getIndexUsageStatistics() {
    const result = await this.pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_relation_size(indexrelid) as size
      FROM pg_stat_user_indexes
      ORDER BY scans DESC
    `);

    return result.rows.map((row: any) => ({
      schema: row.schemaname,
      tableName: row.tablename,
      indexName: row.indexname,
      scans: row.scans,
      tuplesRead: row.tuples_read,
      tuplesFetched: row.tuples_fetched,
      size: row.size,
    }));
  }

  async getLockStatistics() {
    const result = await this.pool.query(`
      SELECT
        locktype,
        mode,
        count(*) as count,
        count(*) FILTER (WHERE granted) as granted,
        count(*) FILTER (WHERE NOT granted) as waiting
      FROM pg_locks
      GROUP BY locktype, mode
      ORDER BY count DESC
    `);

    return result.rows.map((row: any) => ({
      lockType: row.locktype,
      mode: row.mode,
      count: row.count,
      granted: row.granted,
      waiting: row.waiting,
    }));
  }

  async getBlockingQueries() {
    const result = await this.pool.query(`
      SELECT
        blocked_locks.pid AS blocked_pid,
        blocked_activity.usename AS blocked_user,
        blocking_locks.pid AS blocking_pid,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query AS blocked_statement,
        blocking_activity.query AS current_statement_in_blocking_process,
        blocked_activity.application_name AS blocked_application,
        blocking_activity.application_name AS blocking_application
      FROM pg_catalog.pg_locks blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks blocking_locks
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.GRANTED
    `);

    return result.rows.map((row: any) => ({
      blockedPid: row.blocked_pid,
      blockedUser: row.blocked_user,
      blockingPid: row.blocking_pid,
      blockingUser: row.blocking_user,
      blockedStatement: row.blocked_statement,
      blockingStatement: row.current_statement_in_blocking_process,
      blockedApplication: row.blocked_application,
      blockingApplication: row.blocking_application,
    }));
  }

  async getReplicationLag(): Promise<number> {
    const result = await this.pool.query(`
      SELECT
        CASE
          WHEN pg_is_in_recovery() THEN
            EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))
          ELSE 0
        END as lag_seconds
    `);

    return result.rows[0].lag_seconds || 0;
  }

  async getDatabaseSize(): Promise<{ name: string; size: number }[]> {
    const result = await this.pool.query(`
      SELECT
        datname as name,
        pg_database_size(datname) as size
      FROM pg_database
      ORDER BY size DESC
    `);

    return result.rows.map((row: any) => ({
      name: row.name,
      size: row.size,
    }));
  }

  recordQueryDuration(duration: number, queryType: string, table?: string): void {
    const durationInSeconds = duration / 1000;
    this.queryDuration.observe({ query_type: queryType, table: table || 'unknown' }, durationInSeconds);

    if (duration > 500) {
      this.slowQueries.inc({ table: table || 'unknown' });
    }
  }

  recordQueryError(queryType: string, table: string, errorType: string): void {
    this.queryErrors.inc({ query_type: queryType, table, error_type: errorType });
  }

  recordTransactionDuration(duration: number): void {
    this.transactionDuration.observe(duration / 1000);
  }

  recordDeadlock(): void {
    this.deadlocks.inc();
  }

  async getAlerts(): Promise<string[]> {
    const alerts: string[] = [];
    const health = await this.getHealthMetrics();

    if (health.connections.active / health.connections.total > 0.9) {
      alerts.push('Connection pool utilization above 90%');
    }

    if (health.locks.waiting > 10) {
      alerts.push(`High number of waiting locks: ${health.locks.waiting}`);
    }

    if (health.transactions.rolledBack / (health.transactions.committed + health.transactions.rolledBack) > 0.1) {
      alerts.push('High transaction rollback rate (> 10%)');
    }

    if (health.cache.hitRatio < 80) {
      alerts.push(`Low cache hit ratio: ${health.cache.hitRatio.toFixed(2)}%`);
    }

    if (health.replication.lag > 5) {
      alerts.push(`High replication lag: ${health.replication.lag.toFixed(2)}s`);
    }

    const slowQueries = await this.getSlowQueries(5, 1000);
    if (slowQueries.length > 0) {
      alerts.push(`${slowQueries.length} queries with duration > 1s detected`);
    }

    const blockingQueries = await this.getBlockingQueries();
    if (blockingQueries.length > 5) {
      alerts.push(`${blockingQueries.length} blocked queries detected`);
    }

    return alerts;
  }

  async getPerformanceSummary() {
    const health = await this.getHealthMetrics();
    const slowQueries = await this.getSlowQueries(10, 500);
    const tableStats = await this.getTableStatistics();
    const replicationLag = await this.getReplicationLag();

    const totalSequentialScans = tableStats.reduce((sum, stat) => sum + stat.sequentialScans, 0);
    const totalIndexScans = tableStats.reduce((sum, stat) => sum + stat.indexScans, 0);

    return {
      database: health.databaseName,
      health: health.isHealthy ? 'healthy' : 'unhealthy',
      connections: health.connections,
      cacheHitRatio: health.cache.hitRatio,
      replicationLag,
      slowQueries: slowQueries.length,
      tablesWithFullScans: tableStats.filter(s => s.sequentialScans > s.indexScans && s.liveRows > 1000).length,
      sequentialVsIndexScans: {
        sequential: totalSequentialScans,
        index: totalIndexScans,
      },
    };
  }
}
