# Database Migration Guide

## Overview

This guide covers database migration strategies, zero-downtime deployments, validation procedures, and rollback procedures for migrating to production databases.

## Table of Contents

- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Strategy](#migration-strategy)
- [Zero-Downtime Migration](#zero-downtime-migration)
- [Validation Procedures](#validation-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Post-Migration Verification](#post-migration-verification)
- [Common Issues](#common-issues)

## Pre-Migration Checklist

### Environment Preparation

- [ ] **Development Environment**
  - [ ] All migrations tested on development database
  - [ ] Schema validated against production schema
  - [ ] Performance tested with production-like data volume
  - [ ] Rollback procedures tested

- [ ] **Staging Environment**
  - [ ] Dry run migration completed successfully
  - [ ] Data validation completed
  - [ ] Application functionality verified
  - [ ] Performance benchmarks measured

- [ ] **Production Environment**
  - [ ] Backup completed and verified
  - [ ] Sufficient disk space available (2x current size)
  - [ ] Connection pool limits reviewed
  - [ ] Maintenance window scheduled (if needed)
  - [ ] Stakeholders notified
  - [ ] Rollback plan approved

### Data Preparation

- [ ] **Data Analysis**
  - [ ] Current data volume documented
  - [ ] Data growth rate calculated
  - [ ] Large tables identified
  - [ ] Potential bottlenecks identified

- [ ] **Schema Comparison**
  - [ ] Source and target schemas compared
  - [ ] Missing tables/columns identified
  - [ ] Data type conflicts resolved
  - [ ] Index differences documented

- [ ] **Migration Plan**
  - [ ] Migration order determined
  - [ ] Estimated time calculated
  - [ ] Risk assessment completed
  - [ ] Rollback criteria defined

### Application Preparation

- [ ] **Code Changes**
  - [ ] Application code updated for new schema
  - [ ] Database connection strings updated
  - [ ] Migration scripts reviewed
  - [ ] Backward compatibility verified (if using feature flags)

- [ ] **Testing**
  - [ ] Unit tests updated and passing
  - [ ] Integration tests updated and passing
  - [ ] End-to-end tests updated and passing
  - [ ] Performance tests completed

## Migration Strategy

### Strategy Options

| Strategy | Downtime | Complexity | Risk | Best For |
|----------|-----------|-----------|------|----------|
| **Stop-the-World** | Hours | Low | Medium | Small databases, maintenance windows |
| **Blue-Green** | Seconds | High | Low | Large databases, critical systems |
| **Dual-Write** | None | Very High | Medium | Continuous deployments, feature flags |
| **Online Migration** | Minutes | Medium | Medium | Medium databases, minimal downtime |

### Recommended: Online Migration with Blue-Green

1. **Preparation Phase:**
   ```bash
   # 1. Create backup
   ./scripts/db/backup.sh

   # 2. Verify backup integrity
   ./scripts/db/verify-backup.sh
   ```

2. **Schema Migration Phase:**
   ```bash
   # 1. Run schema migrations
   ./scripts/db/migrate.sh staging --skip-backup --skip-health-check

   # 2. Validate schema changes
   ./scripts/db/migrate.sh staging --validate
   ```

3. **Data Migration Phase:**
   ```bash
   # 1. Migrate data in batches
   ./scripts/db/migrate-data.sh --batch-size 10000

   # 2. Verify data integrity
   ./scripts/db/validate-migration.sh
   ```

4. **Cutover Phase:**
   ```bash
   # 1. Update connection strings
   # 2. Restart applications
   # 3. Verify functionality
   # 4. Monitor for issues
   ```

5. **Cleanup Phase:**
   ```bash
   # 1. Drop old tables (after validation)
   # 2. Remove feature flags
   # 3. Update documentation
   ```

## Zero-Downtime Migration

### PostgreSQL Online Migration

**Step 1: Create New Tables**

```sql
-- Create new version of table
CREATE TABLE leads_v2 (
  LIKE leads INCLUDING ALL
);

-- Add new columns
ALTER TABLE leads_v2 ADD COLUMN new_column VARCHAR(255);
```

**Step 2: Dual-Write Data**

```sql
-- Create triggers to write to both tables
CREATE OR REPLACE FUNCTION sync_leads()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leads_v2 VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_leads_trigger
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION sync_leads();
```

**Step 3: Backfill Data**

```bash
# Run backfill in batches
./scripts/db/backfill-data.sh \
  --source-table leads \
  --target-table leads_v2 \
  --batch-size 10000 \
  --batch-delay 1s
```

**Step 4: Verify Data**

```sql
-- Compare row counts
SELECT
  (SELECT COUNT(*) FROM leads) as old_count,
  (SELECT COUNT(*) FROM leads_v2) as new_count;

-- Compare data samples
SELECT * FROM leads WHERE id = 'test-id'
UNION ALL
SELECT * FROM leads_v2 WHERE id = 'test-id';
```

**Step 5: Switch Application**

```bash
# Update application configuration
# Change connection string to use leads_v2
# Restart application (zero downtime with multiple instances)
```

**Step 6: Clean Up**

```sql
-- Drop triggers
DROP TRIGGER sync_leads_trigger ON leads;

-- Rename tables
ALTER TABLE leads RENAME TO leads_old;
ALTER TABLE leads_v2 RENAME TO leads;

-- Drop old table after validation
DROP TABLE leads_old;
```

### Redis Migration

**Step 1: Dual-Write Configuration**

```bash
# Configure application to write to both Redis instances
# Old Redis: redis-old:6379
# New Redis: redis-new:6379

# Update application to write to both instances
# Read from old instance (during migration)
```

**Step 2: Migrate Keys**

```bash
# Migrate keys using redis-cli
redis-cli --cluster reshard \
  --cluster-from <old-node-id> \
  --cluster-to <new-node-id> \
  --cluster-slots 5000

# Or use migration script
./scripts/db/migrate-redis-keys.sh \
  --source redis-old:6379 \
  --target redis-new:6379 \
  --pattern '*'
```

**Step 3: Verify Data**

```bash
# Compare key counts
redis-cli -h redis-old DBSIZE
redis-cli -h redis-new DBSIZE

# Compare sample keys
redis-cli -h redis-old GET key:12345
redis-cli -h redis-new GET key:12345
```

**Step 4: Switch Application**

```bash
# Update application configuration
# Change connection string to use new Redis instance
# Restart application (zero downtime with multiple instances)
```

### Neo4j Migration

**Step 1: Create New Labels**

```cypher
-- Create new label with updated schema
CREATE CONSTRAINT lead_id_v2 IF NOT EXISTS
FOR (l:LeadV2) REQUIRE l.id IS UNIQUE;

-- Copy nodes with new schema
MATCH (l:Lead)
CREATE (l2:LeadV2)
SET l2 = properties(l)
SET l2.newProperty = 'default';
```

**Step 2: Copy Relationships**

```cypher
-- Copy relationships to new labels
MATCH (l:LeadV2)-[r:ASSIGNED_TO]->(a:Agent)
CREATE (l)-[r2:ASSIGNED_TO_V2]->(a)
SET r2 = properties(r);
```

**Step 3: Verify Data**

```cypher
-- Compare node counts
MATCH (l:Lead) RETURN count(l) as old_count;
MATCH (l:LeadV2) RETURN count(l) as new_count;

-- Compare relationship counts
MATCH ()-[r:ASSIGNED_TO]->() RETURN count(r) as old_rel_count;
MATCH ()-[r:ASSIGNED_TO_V2]->() RETURN count(r) as new_rel_count;
```

**Step 4: Switch Application**

```bash
# Update application to use new labels
# Restart application (zero downtime with multiple instances)
```

**Step 5: Clean Up**

```cypher
-- Drop old labels
MATCH (l:Lead) DETACH DELETE l;

-- Rename labels (optional)
CALL apoc.refactor.rename.label('LeadV2', 'Lead');
```

## Validation Procedures

### Data Integrity Checks

```sql
-- PostgreSQL row count validation
SELECT
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY row_count DESC;

-- Compare with expected counts
-- Expected counts should match pre-migration baseline
```

```bash
# Redis key count validation
redis-cli -h redis-host DBSIZE
# Compare with pre-migration baseline

# Sample key validation
redis-cli -h redis-host --scan --pattern 'lead:*' | wc -l
```

```cypher
-- Neo4j node/relationship validation
MATCH (n) RETURN count(n) as total_nodes;
MATCH ()-[r]->() RETURN count(r) as total_relationships;
-- Compare with pre-migration baseline
```

### Functional Validation

```bash
# Run application test suite
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Performance Validation

```sql
-- PostgreSQL query performance
EXPLAIN ANALYZE SELECT * FROM leads WHERE status = 'ACTIVE';

-- Compare with pre-migration baseline
-- Query time should be within 10% of baseline
```

```bash
# Redis performance
redis-cli --latency
redis-cli --latency-history
```

```cypher
-- Neo4j query performance
PROFILE MATCH (l:Lead) RETURN l LIMIT 100;
-- Compare with pre-migration baseline
```

## Rollback Procedures

### Automated Rollback

```bash
# Use restore script to rollback
./scripts/db/restore.sh postgres

# Select backup file from pre-migration backup
# Confirm rollback

# Verify rollback
./scripts/db/validate-rollback.sh
```

### Manual Rollback (PostgreSQL)

```bash
# Stop application
kubectl scale deployment/api --replicas=0

# Restore database
pg_restore -h postgres-host -U postgres -d insurance_lead_gen \
  -v /backups/pre-migration-20240115.dump

# Verify restore
psql -h postgres-host -U postgres -d insurance_lead_gen \
  -c "SELECT COUNT(*) FROM leads;"

# Restart application
kubectl scale deployment/api --replicas=3

# Verify application
curl http://api.example.com/health
```

### Manual Rollback (Redis)

```bash
# Stop application
kubectl scale deployment/api --replicas=0

# Restore RDB file
sudo systemctl stop redis
cp /backups/redis-pre-migrate.rdb /var/lib/redis/dump.rdb
sudo systemctl start redis

# Verify restore
redis-cli -h redis-host DBSIZE
redis-cli -h redis-host PING

# Restart application
kubectl scale deployment/api --replicas=3
```

## Post-Migration Verification

### Health Checks

```bash
# Run comprehensive health check
./scripts/db/health-check.sh all --detailed

# Expected output:
# ✅ PostgreSQL: Healthy
# ✅ Redis: Healthy
# ✅ Neo4j: Healthy
# ✅ Qdrant: Healthy
```

### Monitoring

```bash
# Monitor key metrics for 1 hour
# Watch for:
# - Increased error rates
# - Increased latency
# - Connection pool exhaustion
# - Memory pressure
# - Disk I/O spikes
```

### Performance Verification

```bash
# Run performance benchmarks
npm run benchmark

# Compare with pre-migration baseline
# Performance should be within 10% of baseline
```

### Stakeholder Sign-off

- [ ] Database team: Migration successful
- [ ] Application team: Functionality verified
- [ ] Operations team: Monitoring stable
- [ ] QA team: Tests passing
- [ ] Product owner: Feature working

## Common Issues

### Connection Pool Exhaustion

**Symptom:**
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**Solution:**
```bash
# Increase max_connections
ALTER SYSTEM SET max_connections = 500;

# Reload configuration
SELECT pg_reload_conf();

# Or increase connection pool size
# Update PgBouncer configuration
```

### Long-Running Queries

**Symptom:**
- Migration taking longer than expected
- Application timeouts

**Solution:**
```bash
# Identify long-running queries
psql -c "SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"

# Kill long-running queries if necessary
psql -c "SELECT pg_terminate_backend(<pid>);"
```

### Replication Lag

**Symptom:**
- Replicas behind primary
- Stale data

**Solution:**
```bash
# Check replication lag
psql -c "SELECT now(), pg_last_xact_replay_timestamp(), now() - pg_last_xact_replay_timestamp();"

# If lag is high, pause application writes temporarily
# Allow replicas to catch up
```

## Next Steps

- [Set Up Monitoring](DATABASE_MONITORING.md)
- [Review Security Settings](DATABASE_SECURITY.md)
- [Schedule Maintenance Tasks](DATABASE_MAINTENANCE.md)
- [Configure Backups](DATABASE_BACKUP_RECOVERY.md)
