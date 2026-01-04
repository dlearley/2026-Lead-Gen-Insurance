import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { logger } from '../logger.js';

const execAsync = promisify(exec);

export interface BackupConfig {
  databaseUrl: string;
  backupDir: string;
  s3Bucket?: string;
  s3Prefix?: string;
  encryptionKey?: string;
  retentionDays?: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  size: number;
  duration: number;
  type: 'FULL' | 'INCREMENTAL' | 'TRANSACTION_LOG';
  path?: string;
  s3Path?: string;
  error?: string;
}

export interface RecoveryResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  duration: number;
  tablesRestored: string[];
  rowsRestored: number;
  error?: string;
}

export class BackupManager {
  private pool: Pool;
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
    this.pool = new Pool({ connectionString: config.databaseUrl });

    if (!existsSync(config.backupDir)) {
      mkdirSync(config.backupDir, { recursive: true });
    }
  }

  async createFullBackup(options?: { includeSchema?: boolean }): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupId = `full_${timestamp.getTime()}`;
    const filename = `${backupId}.sql`;
    const path = join(this.config.backupDir, filename);

    try {
      logger.info('Starting full database backup', { backupId, path });

      const command = this.buildBackupCommand(path, options?.includeSchema !== false);
      await execAsync(command);

      const stats = await this.getFileStats(path);
      const duration = Date.now() - startTime;

      logger.info('Full backup completed', {
        backupId,
        size: stats.size,
        duration,
      });

      const result: BackupResult = {
        success: true,
        backupId,
        timestamp,
        size: stats.size,
        duration,
        type: 'FULL',
        path,
      };

      if (this.config.s3Bucket) {
        const s3Path = await this.uploadToS3(path, filename, backupId);
        result.s3Path = s3Path;
      }

      if (this.config.encryptionKey) {
        await this.encryptBackup(path, backupId);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Full backup failed', { backupId, error });

      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration,
        type: 'FULL',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createIncrementalBackup(baseBackupId: string): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupId = `incremental_${timestamp.getTime()}`;
    const filename = `${backupId}.sql`;
    const path = join(this.config.backupDir, filename);

    try {
      logger.info('Starting incremental backup', { backupId, baseBackupId });

      const command = `pg_dump ${this.config.databaseUrl} --data-only --format=plain --file=${path}`;
      await execAsync(command);

      const stats = await this.getFileStats(path);
      const duration = Date.now() - startTime;

      logger.info('Incremental backup completed', {
        backupId,
        size: stats.size,
        duration,
      });

      const result: BackupResult = {
        success: true,
        backupId,
        timestamp,
        size: stats.size,
        duration,
        type: 'INCREMENTAL',
        path,
      };

      if (this.config.s3Bucket) {
        const s3Path = await this.uploadToS3(path, filename, backupId);
        result.s3Path = s3Path;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Incremental backup failed', { backupId, error });

      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration,
        type: 'INCREMENTAL',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createTransactionLogBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupId = `wal_${timestamp.getTime()}`;
    const filename = `${backupId}.wal`;
    const path = join(this.config.backupDir, filename);

    try {
      logger.info('Starting WAL backup', { backupId });

      const command = `pg_waldump ${this.config.databaseUrl} --file=${path}`;
      await execAsync(command);

      const stats = await this.getFileStats(path);
      const duration = Date.now() - startTime;

      logger.info('WAL backup completed', {
        backupId,
        size: stats.size,
        duration,
      });

      const result: BackupResult = {
        success: true,
        backupId,
        timestamp,
        size: stats.size,
        duration,
        type: 'TRANSACTION_LOG',
        path,
      };

      if (this.config.s3Bucket) {
        const s3Path = await this.uploadToS3(path, filename, backupId);
        result.s3Path = s3Path;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('WAL backup failed', { backupId, error });

      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration,
        type: 'TRANSACTION_LOG',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async restoreFromBackup(
    backupId: string,
    options?: { database?: string; dropDatabase?: boolean }
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupPath = join(this.config.backupDir, `${backupId}.sql`);

    try {
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      if (options?.dropDatabase) {
        logger.info('Dropping existing database', { database: options.database });
        await this.pool.query(`DROP DATABASE IF EXISTS ${options.database}`);
      }

      logger.info('Starting database restore', { backupId, path: backupPath });

      const command = `psql ${this.config.databaseUrl} -f ${backupPath}`;
      await execAsync(command);

      const tables = await this.listTables();
      const rows = await this.countTotalRows();
      const duration = Date.now() - startTime;

      logger.info('Database restore completed', {
        backupId,
        tablesRestored: tables.length,
        rowsRestored: rows,
        duration,
      });

      return {
        success: true,
        backupId,
        timestamp,
        duration,
        tablesRestored: tables,
        rowsRestored: rows,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database restore failed', { backupId, error });

      return {
        success: false,
        backupId,
        timestamp,
        duration,
        tablesRestored: [],
        rowsRestored: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async restoreToPointInTime(targetTime: Date): Promise<RecoveryResult> {
    const startTime = Date.now();
    const backupId = `pitr_${targetTime.getTime()}`;
    const timestamp = new Date();

    try {
      logger.info('Starting point-in-time recovery', { targetTime });

      const command = `pg_rewind ${this.config.databaseUrl} --target-time=${targetTime.toISOString()}`;
      await execAsync(command);

      const tables = await this.listTables();
      const rows = await this.countTotalRows();
      const duration = Date.now() - startTime;

      logger.info('Point-in-time recovery completed', {
        backupId,
        tablesRestored: tables.length,
        rowsRestored: rows,
        duration,
      });

      return {
        success: true,
        backupId,
        timestamp,
        duration,
        tablesRestored: tables,
        rowsRestored: rows,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Point-in-time recovery failed', { targetTime, error });

      return {
        success: false,
        backupId,
        timestamp,
        duration,
        tablesRestored: [],
        rowsRestored: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listBackups(): Promise<BackupResult[]> {
    const backups: BackupResult[] = [];

    try {
      const files = await execAsync(`ls -la ${this.config.backupDir}/*.sql`);
      const lines = files.stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.split(/\s+/);
        const filename = parts[parts.length - 1];
        const match = filename.match(/(full|incremental|wal)_(\d+)\.sql/);

        if (match) {
          const type = match[1].toUpperCase() as 'FULL' | 'INCREMENTAL' | 'TRANSACTION_LOG';
          const timestamp = new Date(parseInt(match[2]));
          const stats = await this.getFileStats(filename);

          backups.push({
            success: true,
            backupId: match[0],
            timestamp,
            size: stats.size,
            duration: 0,
            type,
            path: filename,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to list backups', { error });
    }

    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async deleteOldBackups(retentionDays?: number): Promise<number> {
    const retention = retentionDays || this.config.retentionDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention);

    const backups = await this.listBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        try {
          await execAsync(`rm ${backup.path}`);
          deletedCount++;
          logger.info('Deleted old backup', { backupId: backup.backupId, timestamp: backup.timestamp });
        } catch (error) {
          logger.error('Failed to delete backup', { backupId: backup.backupId, error });
        }
      }
    }

    return deletedCount;
  }

  async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = join(this.config.backupDir, `${backupId}.sql`);

      if (!existsSync(backupPath)) {
        logger.error('Backup file not found for verification', { backupId });
        return false;
      }

      logger.info('Verifying backup', { backupId });

      const command = `pg_restore --list ${backupPath}`;
      await execAsync(command);

      logger.info('Backup verification successful', { backupId });
      return true;
    } catch (error) {
      logger.error('Backup verification failed', { backupId, error });
      return false;
    }
  }

  async getBackupMetrics() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((acc, b) => acc + b.size, 0);
    const successfulBackups = backups.filter(b => b.success).length;

    return {
      totalBackups: backups.length,
      successfulBackups,
      failedBackups: backups.length - successfulBackups,
      totalSize,
      averageSize: backups.length > 0 ? totalSize / backups.length : 0,
      oldestBackup: backups[backups.length - 1]?.timestamp,
      newestBackup: backups[0]?.timestamp,
    };
  }

  private buildBackupCommand(path: string, includeSchema: boolean): string {
    const schemaFlag = includeSchema ? '--schema-only' : '';
    return `pg_dump ${this.config.databaseUrl} ${schemaFlag} --format=plain --file=${path}`;
  }

  private async uploadToS3(localPath: string, filename: string, backupId: string): Promise<string> {
    const s3Key = this.config.s3Prefix
      ? `${this.config.s3Prefix}/${filename}`
      : filename;

    try {
      const command = `aws s3 cp ${localPath} s3://${this.config.s3Bucket}/${s3Key} --storage-class STANDARD_IA`;
      await execAsync(command);

      logger.info('Backup uploaded to S3', { backupId, s3Key, bucket: this.config.s3Bucket });
      return `s3://${this.config.s3Bucket}/${s3Key}`;
    } catch (error) {
      logger.error('Failed to upload backup to S3', { backupId, error });
      throw error;
    }
  }

  private async encryptBackup(path: string, backupId: string): Promise<void> {
    try {
      const encryptedPath = `${path}.enc`;
      const command = `openssl enc -aes-256-cbc -salt -in ${path} -out ${encryptedPath} -k ${this.config.encryptionKey}`;
      await execAsync(command);

      await execAsync(`rm ${path}`);
      await execAsync(`mv ${encryptedPath} ${path}`);

      logger.info('Backup encrypted', { backupId });
    } catch (error) {
      logger.error('Failed to encrypt backup', { backupId, error });
      throw error;
    }
  }

  private async getFileStats(path: string): Promise<{ size: number }> {
    const stats = await execAsync(`stat -c%s ${path}`);
    return { size: parseInt(stats.stdout.trim()) };
  }

  private async listTables(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    return result.rows.map((row: any) => row.tablename);
  }

  private async countTotalRows(): Promise<number> {
    const result = await this.pool.query(`
      SELECT sum(n_live_tup) as total_rows
      FROM pg_stat_user_tables
    `);

    return parseInt(result.rows[0]?.total_rows || '0');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
