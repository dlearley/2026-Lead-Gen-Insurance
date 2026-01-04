# Database Maintenance Guide

## Overview

This guide covers maintenance tasks, performance tuning, index maintenance, and capacity planning for all databases in the Insurance Lead Generation AI Platform.

## Table of Contents

- [Maintenance Schedule](#maintenance-schedule)
- [Daily Tasks](#daily-tasks)
- [Weekly Tasks](#weekly-tasks)
- [Monthly Tasks](#monthly-tasks)
- [Quarterly Tasks](#quarterly-tasks)
- [Performance Tuning](#performance-tuning)
- [Index Maintenance](#index-maintenance)
- [Capacity Planning](#capacity-planning)
- [Automated Scripts](#automated-scripts)

## Maintenance Schedule

| Frequency | PostgreSQL | Redis | Neo4j | Qdrant |
|-----------|-----------|-------|--------|--------|
| Daily | Backup verification, health check | Memory check, backup | Health check | Snapshot verification |
| Weekly | Slow query analysis, VACUUM | Memory optimization | Query analysis | Index optimization |
| Monthly | Index maintenance, statistics update | AOF rewrite | Index rebuild | Collection compact |
| Quarterly | Full maintenance, capacity review | Cluster rebalance | Full backup test | Storage optimization |

## Daily Tasks

### PostgreSQL

**Health Check:**

```bash
# Run health check script
./scripts/db/health-check.sh postgres

# Check database status
psql -c "SELECT version();"
psql -c "SELECT COUNT(*) FROM pg_stat_activity;"
psql -c "SELECT pg_is_in_recovery();"
```

**Backup Verification:**

```bash
# Verify latest backup
aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-postgres-primary \
  --query 'DBSnapshots[-1]'

# Check backup integrity
./scripts/db/verify-backup.sh postgres
```

**Resource Monitoring:**

```bash
# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
psql -c "SELECT pid, state, query_start, state_change FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > interval '5 minutes';"

# Check replication lag
psql -c "SELECT now(), pg_last_xact_replay_timestamp(), now() - pg_last_xact_replay_timestamp();"
```

### Redis

**Memory Check:**

```bash
# Check memory usage
redis-cli INFO memory

# Check evictions
redis-cli INFO stats | grep evicted_keys

# Check memory fragmentation
redis-cli INFO memory | grep mem_fragmentation_ratio
```

**Backup Verification:**

```bash
# Check last save time
redis-cli LASTSAVE

# Check AOF status
redis-cli INFO persistence
```

### Neo4j

**Health Check:**

```bash
# Check cluster status
cypher-shell "CALL dbms.cluster.overview();"

# Check database size
cypher-shell "CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Store file sizes') YIELD attributes RETURN attributes;"
```

### Qdrant

**Snapshot Verification:**

```bash
# List snapshots
curl "http://qdrant:6333/collections/insurance-leads/snapshots"

# Check collection status
curl "http://qdrant:6333/collections/insurance-leads"
```

## Weekly Tasks

### PostgreSQL

**Slow Query Analysis:**

```sql
-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Analyze query plans
EXPLAIN ANALYZE <slow_query>;
```

**VACUUM Analysis:**

```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_dead_tup,
  n_live_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

**Statistics Update:**

```sql
-- Update statistics for all tables
ANALYZE;

-- Update statistics for specific table
ANALYZE leads;
```

### Redis

**Memory Optimization:**

```bash
# Find large keys
redis-cli --bigkeys

# Analyze key patterns
redis-cli --memkeys

# Optimize hash values
redis-cli --hotkeys
```

**AOF Rewrite:**

```bash
# Trigger AOF rewrite if needed
redis-cli BGREWRITEAOF

# Monitor progress
redis-cli INFO persistence | grep aof_rewrite_in_progress
```

### Neo4j

**Query Analysis:**

```cypher
-- List slow queries
CALL dbms.listQueries() YIELD queryId, query, planner, runtime
RETURN queryId, query, planner, runtime.totalTime AS time
ORDER BY time DESC
LIMIT 20;

-- Analyze query plan
EXPLAIN MATCH (n:Lead) RETURN n LIMIT 100;
```

### Qdrant

**Index Optimization:**

```bash
# Optimize collection
curl -X POST "http://qdrant:6333/collections/insurance-leads/indexes/optimize" \
  -H "Content-Type: application/json" \
  -d '{"wait": true}'
```

## Monthly Tasks

### PostgreSQL

**Index Maintenance:**

```sql
-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY schemaname, tablename, indexname;

-- Reindex bloated indexes
REINDEX INDEX CONCURRENTLY leads_email_idx;

-- Reindex entire table (causes lock)
REINDEX TABLE CONCURRENTLY leads;
```

**Table Maintenance:**

```sql
-- Vacuum analyze bloated tables
VACUUM (ANALYZE, VERBOSE) leads;

-- Full vacuum for heavy fragmentation (causes lock)
VACUUM (FULL, ANALYZE, VERBOSE) leads;
```

**Partition Maintenance:**

```sql
-- Create new partition if using partitioning
CREATE TABLE leads_2024_02 PARTITION OF leads
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Drop old partitions (if applicable)
DROP TABLE IF EXISTS leads_2023_01;
```

### Redis

**Cluster Rebalancing:**

```bash
# Check cluster distribution
redis-cli --cluster nodes

# Rebalance if needed
redis-cli --cluster rebalance \
  --cluster-threshold 0.5 \
  --cluster-use-empty-masters
```

**Key Expiration:**

```bash
-- Check for keys without TTL
redis-cli --scan --pattern '*' | \
  while read key; do
    ttl=$(redis-cli TTL "$key")
    if [ "$ttl" == "-1" ]; then
      echo "No TTL: $key"
    fi
  done
```

### Neo4j

**Index Maintenance:**

```cypher
-- List indexes
SHOW INDEXES;

-- Rebuild index
DROP INDEX leads_email;
CREATE INDEX FOR (l:Lead) ON (l.email);

-- Update node count statistics
CALL db.stats.retrieve('GRAPH COUNTS');
```

**Cache Optimization:**

```cypher
-- Clear query cache
CALL dbms.clearQueryCaches();

-- Check cache statistics
CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Page cache') YIELD attributes
RETURN attributes;
```

### Qdrant

**Collection Compaction:**

```bash
# Compact collection
curl -X POST "http://qdrant:6333/collections/insurance-leads/compact" \
  -H "Content-Type: application/json" \
  -d '{"wait": true}'
```

**Snapshot Cleanup:**

```bash
# Delete old snapshots
curl -X DELETE "http://qdrant:6333/collections/insurance-leads/snapshots/{snapshot_name}"
```

## Quarterly Tasks

### PostgreSQL

**Full Maintenance:**

```bash
# Run full maintenance script
./scripts/db/postgres-full-maintenance.sh

# Check database size
psql -c "SELECT pg_database_size('insurance_lead_gen');"

# Check table sizes
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;"
```

**Capacity Planning:**

```bash
# Generate capacity report
./scripts/db/generate-capacity-report.sh
```

**Security Audit:**

```bash
# Review database roles
psql -c "SELECT rolname, rolcreaterole, rolcreatedb, rolcanlogin FROM pg_roles;"

-- Review permissions
psql -c "\dp"
```

### Redis

**Cluster Rebalancing:**

```bash
# Check key distribution
redis-cli --cluster info

# Rebalance across all nodes
redis-cli --cluster rebalance \
  --cluster-threshold 0.2 \
  --cluster-use-empty-masters
```

**Performance Review:**

```bash
# Generate performance report
./scripts/db/redis-performance-report.sh
```

### Neo4j

**Full Backup Test:**

```bash
# Perform full backup
neo4j-admin backup \
  --from=neo4j:7687 \
  --backup-dir=/backups \
  --name=quarterly-backup-$(date +%Y%m%d)

# Verify backup integrity
neo4j-admin check-consistency \
  --backup-dir=/backups/quarterly-backup-$(date +%Y%m%d)

# Test restore on test environment
```

**Performance Review:**

```cypher
-- Review query performance
CALL dbms.listQueries() YIELD query, runtime
RETURN query, runtime.totalTime AS time
ORDER BY time DESC
LIMIT 50;

-- Review index usage
SHOW INDEXES YIELD name, type, entityCount, properties;
```

### Qdrant

**Full Maintenance:**

```bash
# Compact all collections
curl -X POST "http://qdrant:6333/collections/insurance-leads/compact"

# Update index configuration
curl -X PATCH "http://qdrant:6333/collections/insurance-leads" \
  -H "Content-Type: application/json" \
  -d '{
    "optimizers_config": {
      "indexing_threshold": 25000,
      "max_optimization_threads": 8
    }
  }'
```

## Performance Tuning

### PostgreSQL

**Query Optimization:**

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Reload configuration
SELECT pg_reload_conf();

-- Review slow query log
-- View via CloudWatch or PostgreSQL logs
```

**Connection Pooling:**

```yaml
# PgBouncer tuning
pool_mode = session
max_client_conn = 10000
default_pool_size = 100
min_pool_size = 25
reserve_pool_size = 50
query_timeout = 30
idle_timeout = 900
```

**Memory Tuning:**

```sql
-- Calculate optimal shared_buffers
-- For 32GB RAM: 8GB (25%)
ALTER SYSTEM SET shared_buffers = '8GB';

-- Calculate effective cache size
-- For 32GB RAM: 24GB (75%)
ALTER SYSTEM SET effective_cache_size = '24GB';

-- Calculate work_mem per connection
-- For 500 connections: 64MB
ALTER SYSTEM SET work_mem = '64MB';
```

### Redis

**Memory Optimization:**

```conf
# Max memory policy
maxmemory-policy allkeys-lru

# Key expiration
-- Analyze key usage patterns
redis-cli --bigkeys
redis-cli --memkeys

-- Set TTL on keys without expiration
-- Example: Set 7-day TTL on session keys
redis-cli --scan --pattern 'session:*' | \
  xargs -I {} redis-cli EXPIRE {} 604800
```

**Persistence Tuning:**

```conf
# AOF configuration
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Neo4j

**Memory Tuning:**

```conf
# Heap size (16GB for r6i.2xlarge)
dbms.memory.heap.initial_size=16G
dbms.memory.heap.max_size=16G

# Page cache (24GB for r6i.2xlarge)
dbms.memory.pagecache.size=24G

# Transaction timeout
dbms.transaction.timeout=60s
```

**Query Optimization:**

```cypher
-- Use parameters instead of literals
MATCH (l:Lead {email: $email}) RETURN l;

-- Use indexes effectively
CREATE INDEX FOR (l:Lead) ON (l.email);
CREATE INDEX FOR (l:Lead) ON (l.createdAt);

-- Use PROFILE to analyze queries
PROFILE MATCH (l:Lead) RETURN l LIMIT 100;
```

### Qdrant

**Index Tuning:**

```json
{
  "optimizers_config": {
    "indexing_threshold": 20000,
    "max_optimization_threads": 8,
    "max_segment_size_kb": 2048
  }
}
```

**Memory Tuning:**

```json
{
  "params": {
    "cache_vector_ram_threshold_gb": 16,
    "optimizers_ram_threshold_gb": 8
  }
}
```

## Index Maintenance

### PostgreSQL

**Create Missing Indexes:**

```sql
-- Identify missing indexes from slow queries
-- Example: Create index on frequently filtered column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status
ON leads(status);

-- Create composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_createdat
ON leads(status, createdAt DESC);

-- Create partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_active
ON leads(status)
WHERE status = 'ACTIVE';
```

**Drop Unused Indexes:**

```sql
-- Find indexes never used
SELECT
  indexrelname,
  relname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY idx_scan;

-- Drop unused index
DROP INDEX CONCURRENTLY IF EXISTS idx_unused;
```

**Reindex Bloated Indexes:**

```sql
-- Rebuild index without locking
REINDEX INDEX CONCURRENTLY idx_leads_email;

-- Rebuild all indexes on table
REINDEX TABLE CONCURRENTLY leads;
```

### Redis

**Key Distribution:**

```bash
-- Analyze key patterns
redis-cli --pattern "lead:*" --bigkeys

-- Use hash for related fields
HSET lead:12345 email "test@example.com"
HSET lead:12345 phone "555-1234"
HGET lead:12345 email
```

### Neo4j

**Create Indexes:**

```cypher
-- Create node property index
CREATE INDEX FOR (l:Lead) ON (l.email);
CREATE INDEX FOR (l:Lead) ON (l.createdAt);

-- Create full-text index
CREATE FULLTEXT INDEX FOR (l:Lead) ON EACH [l.firstName, l.lastName];

-- Create vector index (if applicable)
CREATE VECTOR INDEX FOR (e:Embedding) ON e.embedding
OPTIONS { indexConfig: {
  `vector.similarity_function`: 'cosine'
}};
```

**Drop Unused Indexes:**

```cypher
-- List indexes with usage
SHOW INDEXES YIELD name, type, entityCount, usage;

-- Drop unused index
DROP INDEX idx_unused;
```

### Qdrant

**Index Configuration:**

```bash
-- Check index status
curl "http://qdrant:6333/collections/insurance-leads"

-- Update index configuration
curl -X PATCH "http://qdrant:6333/collections/insurance-leads/indexes" \
  -H "Content-Type: application/json" \
  -d '{
    "index_config": {
      "hnsw_config": {
        "m": 16,
        "ef_construct": 100
      }
    }
  }'
```

## Capacity Planning

### PostgreSQL

**Monitor Growth:**

```sql
-- Table growth over time
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) / 1024 / 1024 AS size_mb
FROM pg_tables
ORDER BY size_mb DESC;
```

**Planning Guidelines:**

| Metric | Current | 6 Months | 12 Months | Action |
|--------|---------|----------|-----------|--------|
| Storage | 500GB | 650GB | 800GB | Scale at 70% |
| Connections | 500 | 750 | 1,000 | Add read replica at 80% |
| IOPS | 20K | 25K | 30K | Scale at 80% |

### Redis

**Monitor Growth:**

```bash
-- Check memory usage
redis-cli INFO memory | grep used_memory_human

-- Check key count
redis-cli DBSIZE
```

**Planning Guidelines:**

| Metric | Current | 6 Months | 12 Months | Action |
|--------|---------|----------|-----------|--------|
| Memory | 32GB | 40GB | 50GB | Scale at 85% |
| Keys | 1M | 1.5M | 2M | Scale cluster at 1.5M |

## Automated Scripts

### PostgreSQL Maintenance Script

```bash
#!/bin/bash
# PostgreSQL Weekly Maintenance

./scripts/db/postgres-maintenance.sh \
  --vacuum \
  --analyze \
  --reindex \
  --optimize
```

### Redis Maintenance Script

```bash
#!/bin/bash
# Redis Weekly Maintenance

./scripts/db/redis-maintenance.sh \
  --optimize-memory \
  --rewrite-aof \
  --rebalance
```

### Database Health Check

```bash
#!/bin/bash
# Daily Health Check

./scripts/db/health-check.sh all \
  --email alerts@example.com \
  --slack
```

## Next Steps

- [Set Up Monitoring](DATABASE_MONITORING.md)
- [Review Security Settings](DATABASE_SECURITY.md)
- [Complete Database Migration](DATABASE_MIGRATION.md)
- [Configure Backups](DATABASE_BACKUP_RECOVERY.md)
