import { Pool, PoolClient } from 'pg';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger.js';

export interface Migration {
  id: string;
  version: string;
  name: string;
  filename: string;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
  checksum: string;
  appliedAt?: Date;
}

export interface MigrationResult {
  migrationId: string;
  version: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface SchemaVersion {
  version: string;
  description: string;
  appliedAt: Date;
  checksum: string;
}

export class MigrationManager {
  private pool: Pool;
  private migrations: Map<string, Migration> = new Map();
  private appliedMigrations: Set<string> = new Set();
  private isInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.createMigrationTable();
    await this.loadAppliedMigrations();
    this.isInitialized = true;

    logger.info('Migration manager initialized');
  }

  private async createMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          description TEXT,
          rollback_script TEXT
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_lock (
          id SERIAL PRIMARY KEY,
          locked BOOLEAN DEFAULT FALSE,
          locked_by VARCHAR(255),
          locked_at TIMESTAMP WITH TIME ZONE
        )
      `);
    } finally {
      client.release();
    }
  }

  private async loadAppliedMigrations(): Promise<void> {
    const result = await this.pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    this.appliedMigrations = new Set(result.rows.map((row: any) => row.version));
    logger.info(`Loaded ${this.appliedMigrations.size} applied migrations`);
  }

  loadMigrationsFromDirectory(directory: string): void {
    if (!existsSync(directory)) {
      logger.warn('Migrations directory does not exist', { directory });
      return;
    }

    const files = readdirSync(directory)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    for (const file of files) {
      try {
        const filepath = join(directory, file);
        const match = file.match(/^(\d{14})_(.+)\.(ts|js)$/);

        if (!match) {
          logger.warn('Skipping invalid migration filename', { file });
          continue;
        }

        const [, version, name] = match;
        const checksum = this.calculateChecksum(filepath);

        this.migrations.set(version, {
          id: `${version}_${name}`,
          version,
          name,
          filename: file,
          up: async () => {},
          down: async () => {},
          checksum,
        });

        logger.info('Loaded migration', { version, name, file });
      } catch (error) {
        logger.error('Failed to load migration', { file, error });
      }
    }
  }

  registerMigration(migration: Omit<Migration, 'filename'>): void {
    this.migrations.set(migration.version, {
      ...migration,
      filename: `${migration.version}_${migration.name}.ts`,
    });
  }

  async migrate(options?: { targetVersion?: string; dryRun?: boolean }): Promise<MigrationResult[]> {
    await this.initialize();

    const results: MigrationResult[] = [];
    const targetVersion = options?.targetVersion;
    const dryRun = options?.dryRun || false;

    const pendingMigrations = this.getPendingMigrations(targetVersion);

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations to apply');
      return results;
    }

    logger.info('Starting migration', {
      count: pendingMigrations.length,
      targetVersion,
      dryRun,
    });

    const lock = await this.acquireLock();
    if (!lock) {
      throw new Error('Could not acquire migration lock. Another migration may be in progress.');
    }

    try {
      for (const migration of pendingMigrations) {
        const result = await this.applyMigration(migration, dryRun);
        results.push(result);

        if (!result.success) {
          logger.error('Migration failed, stopping', { migrationId: migration.id });
          break;
        }
      }
    } finally {
      await this.releaseLock();
    }

    logger.info('Migration completed', {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  async rollback(options?: { targetVersion?: string; steps?: number; dryRun?: boolean }): Promise<MigrationResult[]> {
    await this.initialize();

    const results: MigrationResult[] = [];
    const targetVersion = options?.targetVersion;
    const steps = options?.steps || 1;
    const dryRun = options?.dryRun || false;

    const migrationsToRollback = this.getMigrationsToRollback(targetVersion, steps);

    if (migrationsToRollback.length === 0) {
      logger.info('No migrations to rollback');
      return results;
    }

    logger.info('Starting rollback', {
      count: migrationsToRollback.length,
      targetVersion,
      steps,
      dryRun,
    });

    const lock = await this.acquireLock();
    if (!lock) {
      throw new Error('Could not acquire migration lock. Another migration may be in progress.');
    }

    try {
      for (const migration of migrationsToRollback) {
        const result = await this.applyRollback(migration, dryRun);
        results.push(result);

        if (!result.success) {
          logger.error('Rollback failed, stopping', { migrationId: migration.id });
          break;
        }
      }
    } finally {
      await this.releaseLock();
    }

    logger.info('Rollback completed', {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  private getPendingMigrations(targetVersion?: string): Migration[] {
    const versions = Array.from(this.migrations.keys()).sort();
    const pending: Migration[] = [];

    for (const version of versions) {
      if (this.appliedMigrations.has(version)) {
        continue;
      }

      const migration = this.migrations.get(version)!;
      pending.push(migration);

      if (version === targetVersion) {
        break;
      }
    }

    return pending;
  }

  private getMigrationsToRollback(targetVersion?: string, steps?: number): Migration[] {
    const appliedVersions = Array.from(this.appliedMigrations).sort().reverse();
    const toRollback: Migration[] = [];

    for (const version of appliedVersions) {
      const migration = this.migrations.get(version);
      if (!migration) continue;

      toRollback.push(migration);

      if (version === targetVersion) {
        break;
      }

      if (steps && toRollback.length >= steps) {
        break;
      }
    }

    return toRollback;
  }

  private async applyMigration(migration: Migration, dryRun: boolean): Promise<MigrationResult> {
    const startTime = Date.now();

    logger.info('Applying migration', { migrationId: migration.id, dryRun });

    if (dryRun) {
      return {
        migrationId: migration.id,
        version: migration.version,
        success: true,
        duration: 0,
      };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      try {
        await migration.up(client);

        await client.query(
          `
          INSERT INTO schema_migrations (version, name, checksum, description)
          VALUES ($1, $2, $3, $4)
          `,
          [migration.version, migration.name, migration.checksum, migration.name]
        );

        await client.query('COMMIT');

        this.appliedMigrations.add(migration.version);
        const duration = Date.now() - startTime;

        logger.info('Migration applied successfully', {
          migrationId: migration.id,
          duration,
        });

        return {
          migrationId: migration.id,
          version: migration.version,
          success: true,
          duration,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  }

  private async applyRollback(migration: Migration, dryRun: boolean): Promise<MigrationResult> {
    const startTime = Date.now();

    logger.info('Rolling back migration', { migrationId: migration.id, dryRun });

    if (dryRun) {
      return {
        migrationId: migration.id,
        version: migration.version,
        success: true,
        duration: 0,
      };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      try {
        await migration.down(client);

        await client.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);

        await client.query('COMMIT');

        this.appliedMigrations.delete(migration.version);
        const duration = Date.now() - startTime;

        logger.info('Migration rolled back successfully', {
          migrationId: migration.id,
          duration,
        });

        return {
          migrationId: migration.id,
          version: migration.version,
          success: true,
          duration,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  }

  async getCurrentVersion(): Promise<string> {
    await this.initialize();

    if (this.appliedMigrations.size === 0) {
      return '0.0.0';
    }

    const versions = Array.from(this.appliedMigrations).sort();
    return versions[versions.length - 1];
  }

  async getSchemaVersions(): Promise<SchemaVersion[]> {
    const result = await this.pool.query(
      `
      SELECT version, name, checksum, applied_at, description
      FROM schema_migrations
      ORDER BY version ASC
      `
    );

    return result.rows.map((row: any) => ({
      version: row.version,
      description: row.name,
      checksum: row.checksum,
      appliedAt: new Date(row.applied_at),
    }));
  }

  async validateMigrations(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const schemaVersions = await this.getSchemaVersions();

    for (const schemaVersion of schemaVersions) {
      const migration = this.migrations.get(schemaVersion.version);

      if (!migration) {
        warnings.push(
          `Migration file not found for applied version: ${schemaVersion.version}`
        );
        continue;
      }

      if (migration.checksum !== schemaVersion.checksum) {
        errors.push(
          `Checksum mismatch for version ${schemaVersion.version}: ` +
            `expected ${migration.checksum}, got ${schemaVersion.checksum}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async generateMigration(name: string): Promise<string> {
    const timestamp = new Date();
    const version = [
      timestamp.getFullYear(),
      String(timestamp.getMonth() + 1).padStart(2, '0'),
      String(timestamp.getDate()).padStart(2, '0'),
      String(timestamp.getHours()).padStart(2, '0'),
      String(timestamp.getMinutes()).padStart(2, '0'),
      String(timestamp.getSeconds()).padStart(2, '0'),
    ].join('');

    const migrationId = `${version}_${name}`;

    logger.info('Generated migration', { migrationId });

    return migrationId;
  }

  private calculateChecksum(filepath: string): string {
    const content = readFileSync(filepath, 'utf-8');
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async acquireLock(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'SELECT locked FROM migration_lock WHERE id = 1 FOR UPDATE'
      );

      if (result.rows[0].locked) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        'UPDATE migration_lock SET locked = TRUE, locked_by = $1, locked_at = NOW() WHERE id = 1',
        [process.pid.toString()]
      );
      await client.query('COMMIT');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to acquire migration lock', { error });
      return false;
    } finally {
      client.release();
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE migration_lock SET locked = FALSE, locked_by = NULL, locked_at = NULL WHERE id = 1'
      );
    } catch (error) {
      logger.error('Failed to release migration lock', { error });
    }
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    try {
      await client.query('TRUNCATE schema_migrations CASCADE');
      this.appliedMigrations.clear();
      logger.info('Migration manager reset');
    } finally {
      client.release();
    }
  }
}
