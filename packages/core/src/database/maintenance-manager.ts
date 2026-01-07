import { Pool, PoolClient } from 'pg';
import { logger } from '../logger.js';
import { PerformanceOptimizer } from './performance-optimizer.js';

export interface MaintenanceConfig {
  vacuumThreshold?: number;
  analyzeThreshold?: number;
  reindexThreshold?: number;
  cleanupAge?: number;
  archiveAge?: number;
  maintenanceWindow?: { start: string; end: string };
}

export interface MaintenanceResult {
  operation: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

export interface CleanupResult {
  table: string;
  recordsDeleted: number;
  spaceReclaimed: number;
  duration: number;
}

export class MaintenanceManager {
  private pool: Pool;
  private optimizer: PerformanceOptimizer;
  private config: Required<MaintenanceConfig>;

  constructor(pool: Pool, config?: MaintenanceConfig) {
    this.pool = pool;
    this.optimizer = new PerformanceOptimizer(pool);
    this.config = {
      vacuumThreshold: config?.vacuumThreshold || 10000,
      analyzeThreshold: config?.analyzeThreshold || 5000,
      reindexThreshold: config?.reindexThreshold || 50,
      cleanupAge: config?.cleanupAge || 90,
      archiveAge: config?.archiveAge || 365,
      maintenanceWindow: config?.maintenanceWindow || { start: '02:00', end: '04:00' },
    };
  }

  async isMaintenanceWindow(): Promise<boolean> {
    const now = new Date();
    const [startHour, startMinute] = this.config.maintenanceWindow.start.split(':').map(Number);
    const [endHour, endMinute] = this.config.maintenanceWindow.end.split(':').map(Number);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const windowStart = startHour * 60 + startMinute;
    const windowEnd = endHour * 60 + endMinute;

    if (windowStart < windowEnd) {
      return currentTime >= windowStart && currentTime < windowEnd;
    } else {
      return currentTime >= windowStart || currentTime < windowEnd;
    }
  }

  async runDailyMaintenance(force = false): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];

    if (!force && !(await this.isMaintenanceWindow())) {
      logger.info('Skipping maintenance - outside maintenance window');
      return results;
    }

    logger.info('Starting daily maintenance');

    results.push(await this.vacuumAllTables());
    results.push(await this.analyzeAllTables());
    results.push(await this.cleanupOldSoftDeletes());

    const failedCount = results.filter(r => !r.success).length;
    logger.info('Daily maintenance completed', {
      total: results.length,
      failed: failedCount,
    });

    return results;
  }

  async runWeeklyMaintenance(force = false): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];

    if (!force && !(await this.isMaintenanceWindow())) {
      logger.info('Skipping maintenance - outside maintenance window');
      return results;
    }

    logger.info('Starting weekly maintenance');

    results.push(await this.vacuumAllTables({ full: true }));
    results.push(await this.reindexFragmentedIndexes());
    results.push(await this.cleanupOldAuditLogs());

    const failedCount = results.filter(r => !r.success).length;
    logger.info('Weekly maintenance completed', {
      total: results.length,
      failed: failedCount,
    });

    return results;
  }

  async runMonthlyMaintenance(force = false): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];

    if (!force && !(await this.isMaintenanceWindow())) {
      logger.info('Skipping maintenance - outside maintenance window');
      return results;
    }

    logger.info('Starting monthly maintenance');

    results.push(await this.vacuumAllTables({ full: true, analyze: true }));
    results.push(await this.reindexAllTables());
    results.push(await this.archiveOldData());
    results.push(await this.removeUnusedIndexes());

    const failedCount = results.filter(r => !r.success).length;
    logger.info('Monthly maintenance completed', {
      total: results.length,
      failed: failedCount,
    });

    return results;
  }

  async vacuumAllTables(options?: { full?: boolean; analyze?: boolean }): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const tables = await this.getTablesWithDeadRows();

      logger.info('Vacuuming tables', { count: tables.length, options });

      let vacuumed = 0;
      for (const table of tables) {
        try {
          await this.optimizer.vacuumTable(table, options);
          vacuumed++;
        } catch (error) {
          logger.error('Failed to vacuum table', { table, error });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Vacuum completed', { vacuumed, duration });

      return {
        operation: 'VACUUM',
        success: true,
        duration,
        details: { tablesVacuumed: vacuumed, options },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Vacuum failed', { error });

      return {
        operation: 'VACUUM',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async analyzeAllTables(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const tables = await this.getAllTables();

      logger.info('Analyzing tables', { count: tables.length });

      let analyzed = 0;
      for (const table of tables) {
        try {
          await this.optimizer.analyzeTable(table);
          analyzed++;
        } catch (error) {
          logger.error('Failed to analyze table', { table, error });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Analysis completed', { analyzed, duration });

      return {
        operation: 'ANALYZE',
        success: true,
        duration,
        details: { tablesAnalyzed: analyzed },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Analysis failed', { error });

      return {
        operation: 'ANALYZE',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async reindexFragmentedIndexes(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const fragmentedIndexes = await this.getFragmentedIndexes();

      logger.info('Reindexing fragmented indexes', { count: fragmentedIndexes.length });

      let reindexed = 0;
      for (const index of fragmentedIndexes) {
        try {
          await this.optimizer.dropIndex(index.indexName, { concurrently: true });
          await this.optimizer.createIndex(index.tableName, index.columns, {
            indexType: index.indexType,
            concurrently: true,
          });
          reindexed++;
        } catch (error) {
          logger.error('Failed to reindex', { index: index.indexName, error });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Reindex completed', { reindexed, duration });

      return {
        operation: 'REINDEX',
        success: true,
        duration,
        details: { indexesReindexed: reindexed },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Reindex failed', { error });

      return {
        operation: 'REINDEX',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async reindexAllTables(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const tables = await this.getAllTables();

      logger.info('Reindexing all tables', { count: tables.length });

      let reindexed = 0;
      for (const table of tables) {
        try {
          await this.optimizer.reindexTable(table);
          reindexed++;
        } catch (error) {
          logger.error('Failed to reindex table', { table, error });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Table reindex completed', { reindexed, duration });

      return {
        operation: 'REINDEX_ALL',
        success: true,
        duration,
        details: { tablesReindexed: reindexed },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Table reindex failed', { error });

      return {
        operation: 'REINDEX_ALL',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async cleanupOldSoftDeletes(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const tables = await this.getTablesWithSoftDeletes();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAge);

      let totalDeleted = 0;
      const results: CleanupResult[] = [];

      for (const table of tables) {
        const result = await this.hardDeleteOldRecords(table, cutoffDate);
        results.push(result);
        totalDeleted += result.recordsDeleted;
      }

      const duration = Date.now() - startTime;
      logger.info('Soft delete cleanup completed', { totalDeleted, duration });

      return {
        operation: 'CLEANUP_SOFT_DELETES',
        success: true,
        duration,
        details: { recordsDeleted: totalDeleted, tablesCleaned: results.length },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Soft delete cleanup failed', { error });

      return {
        operation: 'CLEANUP_SOFT_DELETES',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async cleanupOldAuditLogs(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

      const result = await this.pool.query(
        `
        DELETE FROM audit_logs
        WHERE created_at < $1
        `,
        [cutoffDate]
      );

      const duration = Date.now() - startTime;
      logger.info('Audit log cleanup completed', { deleted: result.rowCount, duration });

      return {
        operation: 'CLEANUP_AUDIT_LOGS',
        success: true,
        duration,
        details: { recordsDeleted: result.rowCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Audit log cleanup failed', { error });

      return {
        operation: 'CLEANUP_AUDIT_LOGS',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async archiveOldData(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const archiveDate = new Date();
      archiveDate.setFullYear(archiveDate.getFullYear() - 1);

      const leadsToArchive = await this.pool.query(
        `
        INSERT INTO leads_archive
        SELECT * FROM leads
        WHERE created_at < $1
        RETURNING id
        `,
        [archiveDate]
      );

      await this.pool.query(
        `
        DELETE FROM leads
        WHERE created_at < $1
        `,
        [archiveDate]
      );

      const duration = Date.now() - startTime;
      logger.info('Data archival completed', { archived: leadsToArchive.rowCount, duration });

      return {
        operation: 'ARCHIVE_DATA',
        success: true,
        duration,
        details: { recordsArchived: leadsToArchive.rowCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Data archival failed', { error });

      return {
        operation: 'ARCHIVE_DATA',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async removeUnusedIndexes(): Promise<MaintenanceResult> {
    const startTime = Date.now();

    try {
      const unusedIndexes = await this.optimizer.getUnusedIndexes();

      logger.info('Removing unused indexes', { count: unusedIndexes.length });

      let removed = 0;
      for (const index of unusedIndexes) {
        try {
          await this.optimizer.dropIndex(index.indexName, { concurrently: true, ifExists: true });
          removed++;
        } catch (error) {
          logger.error('Failed to drop unused index', { index: index.indexName, error });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Unused index removal completed', { removed, duration });

      return {
        operation: 'REMOVE_UNUSED_INDEXES',
        success: true,
        duration,
        details: { indexesRemoved: removed },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Unused index removal failed', { error });

      return {
        operation: 'REMOVE_UNUSED_INDEXES',
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getAllTables(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    return result.rows.map((row: any) => row.tablename);
  }

  private async getTablesWithDeadRows(): Promise<string[]> {
    const result = await this.pool.query(
      `
      SELECT tablename
      FROM pg_stat_user_tables
      WHERE n_dead_tup > $1
      ORDER BY n_dead_tup DESC
      `,
      [this.config.vacuumThreshold]
    );

    return result.rows.map((row: any) => row.tablename);
  }

  private async getTablesWithSoftDeletes(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT tablename
      FROM information_schema.columns
      WHERE column_name = 'deleted_at'
      AND table_schema = 'public'
    `);

    return result.rows.map((row: any) => row.tablename);
  }

  private async getFragmentedIndexes() {
    const result = await this.pool.query(
      `
      SELECT
        pi.indexname as index_name,
        pt.tablename as table_name,
        am.amname as index_type,
        pi.indisunique as is_unique,
        array_agg(a.attname ORDER BY array_position(pi.indkey, a.attnum)) as columns
      FROM pg_index pi
      JOIN pg_class pc ON pc.oid = pi.indexrelid
      JOIN pg_class pt ON pt.oid = pi.indrelid
      JOIN pg_am am ON am.oid = pc.relam
      JOIN pg_attribute a ON a.attrelid = pt.oid AND a.attnum = ANY(pi.indkey)
      WHERE pi.indisvalid
      AND pg_relation_size(pi.indexrelid) > 0
      GROUP BY pi.indexrelid, pi.indexname, pt.tablename, am.amname, pi.indisunique
      `
    );

    return result.rows.map((row: any) => ({
      indexName: row.index_name,
      tableName: row.table_name,
      indexType: row.index_type,
      isUnique: row.is_unique,
      columns: row.columns,
    }));
  }

  private async hardDeleteOldRecords(table: string, cutoffDate: Date): Promise<CleanupResult> {
    const startTime = Date.now();

    const sizeBefore = await this.getTableSize(table);

    const result = await this.pool.query(
      `
      DELETE FROM ${table}
      WHERE deleted_at < $1
      RETURNING id
      `,
      [cutoffDate]
    );

    const sizeAfter = await this.getTableSize(table);

    return {
      table,
      recordsDeleted: result.rowCount || 0,
      spaceReclaimed: sizeBefore - sizeAfter,
      duration: Date.now() - startTime,
    };
  }

  private async getTableSize(table: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT pg_total_relation_size($1::regclass) as size',
      [table]
    );
    return result.rows[0].size || 0;
  }

  async getMaintenanceStatus() {
    const allTables = await this.getAllTables();
    const tablesWithDeadRows = await this.getTablesWithDeadRows();
    const tablesWithSoftDeletes = await this.getTablesWithSoftDeletes();
    const unusedIndexes = await this.optimizer.getUnusedIndexes();
    const tableStats = await this.optimizer.getAllTablesStatistics();

    const totalSize = tableStats.reduce((sum, stat) => sum + stat.totalSize, 0);
    const totalBloat = tableStats.reduce((sum, stat) => sum + stat.bloatPercentage * stat.totalSize, 0) / totalSize;

    return {
      isMaintenanceWindow: await this.isMaintenanceWindow(),
      tables: {
        total: allTables.length,
        needsVacuum: tablesWithDeadRows.length,
        needsCleanup: tablesWithSoftDeletes.length,
      },
      indexes: {
        unused: unusedIndexes.length,
        unusedSize: unusedIndexes.reduce((sum, idx) => sum + idx.size, 0),
      },
      storage: {
        totalSize,
        averageBloat: totalBloat,
      },
      config: this.config,
    };
  }
}
