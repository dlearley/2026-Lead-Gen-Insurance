# Database Hardening - Quick Start Guide

## Installation

The database hardening features are included in the `@insurance-lead-gen/core` package.

```bash
# Install dependencies
npm install pg prom-client
```

## Quick Setup

### 1. Connection Pool

```typescript
import { createAdvancedConnectionPool } from '@insurance-lead-gen/core';

const pool = createAdvancedConnectionPool({
  name: 'api-service',
  serviceType: 'api',
  databaseUrl: process.env.DATABASE_URL,
  enableSsl: true,
  enableCircuitBreaker: true,
  enableRetry: true,
});

// Execute query
const results = await pool.query('SELECT * FROM leads');
```

### 2. Transaction Management

```typescript
import { TransactionManager, IsolationLevel } from '@insurance-lead-gen/core';

const txManager = new TransactionManager();

await txManager.runTransaction(client, async (client, context) => {
  await client.query('INSERT INTO leads (...) VALUES (...)');
  return { success: true };
}, {
  isolationLevel: IsolationLevel.READ_COMMITTED,
  timeout: 30000,
});
```

### 3. Data Validation

```typescript
import { DataValidator, DataType, ConstraintType } from '@insurance-lead-gen/core';

const validator = new DataValidator();

validator.defineRules('leads', [
  {
    field: 'email',
    type: DataType.EMAIL,
    required: true,
    maxLength: 255,
    constraints: [ConstraintType.UNIQUE],
  },
]);

const result = validator.validate('leads', leadData);
if (!result.isValid) {
  throw new ValidationError(result.errors);
}
```

### 4. Backup Management

```typescript
import { BackupManager } from '@insurance-lead-gen/core';

const backup = new BackupManager({
  databaseUrl: process.env.DATABASE_URL,
  backupDir: '/var/backups/postgresql',
  s3Bucket: 'insurance-leads-backups',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  retentionDays: 30,
});

// Create full backup
const result = await backup.createFullBackup();

// Restore from backup
await backup.restoreFromBackup('full_20240115_020000');
```

### 5. Performance Optimization

```typescript
import { PerformanceOptimizer } from '@insurance-lead-gen/core';

const optimizer = new PerformanceOptimizer(pool, 500);

// Execute with monitoring
const results = await optimizer.executeQuery('SELECT * FROM leads');

// Get slow queries
const slowQueries = await optimizer.getSlowQueries();

// Get index recommendations
const recommendations = await optimizer.getIndexRecommendations();
```

### 6. Database Monitoring

```typescript
import { DatabaseMonitoring } from '@insurance-lead-gen/core';

const monitoring = new DatabaseMonitoring(pool, 'insurance_leads');

// Get health metrics
const health = await monitoring.getHealthMetrics();

// Get alerts
const alerts = await monitoring.getAlerts();
```

### 7. Maintenance

```typescript
import { MaintenanceManager } from '@insurance-lead-gen/core';

const maintenance = new MaintenanceManager(pool, {
  maintenanceWindow: { start: '02:00', end: '04:00' },
});

// Run daily maintenance
await maintenance.runDailyMaintenance();
```

## Scripts

### Backup Database

```bash
# Full backup
./scripts/backup-database.sh full

# Incremental backup
./scripts/backup-database.sh incremental

# WAL backup
./scripts/backup-database.sh wal

# Restore
./scripts/backup-database.sh restore full_20240115_020000

# List backups
./scripts/backup-database.sh list
```

### Database Maintenance

```bash
# Daily maintenance
./scripts/maintenance-database.sh daily

# Weekly maintenance
./scripts/maintenance-database.sh weekly

# Monthly maintenance
./scripts/maintenance-database.sh monthly

# Health report
./scripts/maintenance-database.sh report

# Status
./scripts/maintenance-database.sh status
```

## Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_PRIMARY_URL=postgresql://user:pass@primary:5432/db
DATABASE_REPLICA_1_URL=postgresql://user:pass@replica1:5432/db

# Encryption
ENCRYPTION_KEY=<32-byte-key>
ENCRYPTION_SALT=<salt>
BACKUP_ENCRYPTION_KEY=<key>

# Backup storage
S3_BUCKET=insurance-leads-backups
S3_PREFIX=backups

# Backup retention
BACKUP_DIR=/var/backups/postgresql
RETENTION_DAYS=30
```

## Monitoring

### Prometheus Metrics

The following metrics are exposed:

- `database_connections_active`
- `database_connections_idle`
- `database_connections_waiting`
- `database_query_duration_seconds`
- `database_query_errors_total`
- `database_transaction_duration_seconds`
- `database_slow_queries_total`
- `database_deadlocks_total`

### Alerts

Alerts are configured in `monitoring/prometheus/database-alerts.yml`:

- High connection pool utilization
- High query latency
- High slow query rate
- Low cache hit ratio
- High replication lag
- Low disk space
- Backup failures

## Testing

Run tests for each module:

```bash
# Connection pool tests
npm test -- connection-pool.test.ts

# Transaction manager tests
npm test -- transaction-manager.test.ts

# Data validator tests
npm test -- data-validator.test.ts

# Performance optimizer tests
npm test -- performance-optimizer.test.ts
```

## Documentation

- [Full Database Hardening Guide](./PHASE_3_DATABASE_HARDENING.md) - Comprehensive guide
- [Implementation Summary](./PHASE_3_IMPLEMENTATION_SUMMARY.md) - Implementation details

## Support

For issues or questions:
1. Check the full documentation in `docs/PHASE_3_DATABASE_HARDENING.md`
2. Review the runbooks and troubleshooting guides
3. Check the test files for usage examples
4. Review the implementation in `packages/core/src/database/`
