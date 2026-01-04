# Database Monitoring Guide

## Overview

This guide covers monitoring setup, key metrics, alert configuration, and troubleshooting for all databases in the Insurance Lead Generation AI Platform.

## Table of Contents

- [Monitoring Architecture](#monitoring-architecture)
- [Prometheus Exporters](#prometheus-exporters)
- [Grafana Dashboards](#grafana-dashboards)
- [Key Metrics](#key-metrics)
- [Alert Configuration](#alert-configuration)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

## Monitoring Architecture

```
Applications
    │
    ├─► PostgreSQL ──► postgres_exporter ──► Prometheus ──► Grafana
    │
    ├─► Redis ───────► redis_exporter ─────► Prometheus ──► Grafana
    │
    ├─► Neo4j ───────► Neo4j Metrics ─────► Prometheus ──► Grafana
    │
    └─► Qdrant ──────► Qdrant Metrics ────► Prometheus ──► Grafana
                                │
                                ▼
                        AlertManager
                                │
                                ├─► Slack
                                ├─► Email
                                └─► PagerDuty
```

## Prometheus Exporters

### PostgreSQL Exporter

**Deployment:**

```bash
# Deploy exporter
kubectl apply -f k8s/base/postgres/servicemonitor.yaml

# Verify
kubectl get servicemonitor postgres -n postgresql-operator
```

**Configuration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-exporter
  namespace: postgresql-operator
data:
  config.yaml: |
    datasource:
      host: postgres-cluster-rw.postgresql-operator.svc.cluster.local
      port: 5432
      user: postgres
      password: ${POSTGRES_PASSWORD}
      database: insurance_lead_gen

    collectors:
      pg_stat_activity:
        enabled: true
      pg_stat_database:
        enabled: true
      pg_stat_user_tables:
        enabled: true
      pg_stat_replication:
        enabled: true
```

### Redis Exporter

**Deployment:**

```bash
# Deploy exporter
kubectl apply -f k8s/base/redis/servicemonitor.yaml

# Verify
kubectl get servicemonitor redis -n redis-operator
```

**Configuration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-exporter
  namespace: redis-operator
data:
  config.yaml: |
    redis:
      addr: redis-cluster-master.redis-operator.svc.cluster.local:6379
      password: ${REDIS_PASSWORD}
```

### Neo4j Exporter

**Built-in metrics:**

```bash
# Enable metrics
cypher-shell "CALL dbms.setConfigValue('metrics.enabled', 'true');"

# Access metrics
curl http://neo4j:7474/metrics
```

### Qdrant Exporter

**Built-in metrics:**

```bash
# Access metrics
curl http://qdrant:6333/metrics
```

## Grafana Dashboards

### Importing Dashboards

```bash
# Using Grafana CLI
grafana-cli admin import-dashboard \
  /path/to/dashboard.json

# Via UI
# 1. Go to Dashboards → Import
# 2. Upload JSON file
# 3. Select Prometheus data source
# 4. Import
```

### Available Dashboards

**PostgreSQL Dashboard** (`postgres-dashboard.json`):
- Replication lag
- Connections
- Queries per second
- Cache hit ratio
- Disk I/O
- Transaction rate
- Slow queries
- Index usage
- Table sizes
- Lock waits

**Redis Dashboard** (`redis-dashboard.json`):
- Memory usage
- Evictions
- Hit rate
- Connection count
- Throughput
- Latency
- Replication lag
- Persistence status
- Key distribution
- Slow log

**Neo4j Dashboard** (`neo4j-dashboard.json`):
- Cluster health
- Node status
- Transaction rate
- Query latency
- Memory usage
- Storage size
- Page cache hits
- Cypher execution time
- Connection count

**Qdrant Dashboard** (`qdrant-dashboard.json`):
- Collection metrics
- Query latency
- Replication status
- Disk usage
- Memory usage
- Vector count
- Index optimization
- Request rate

## Key Metrics

### PostgreSQL

**Performance Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `pg_up` | Database is up | 1 | < 1 for > 1m |
| `pg_stat_activity_count` | Active connections | < 400 | > 400 |
| `pg_replication_lag_bytes` | Replication lag | < 100MB | > 100MB |
| `pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)` | Cache hit ratio | > 99% | < 99% |
| `pg_stat_statements_mean_exec_time_ms` | Mean query time | < 100ms | > 5000ms |
| `pg_stat_database_xact_commit` | Transaction rate | Baseline | Significant drop |
| `pg_stat_user_tables_seq_scan` | Sequential scans | Baseline | Significant increase |

**Resource Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `node_cpu_seconds_total` | CPU usage | < 80% | > 80% for 5m |
| `node_memory_MemAvailable_bytes` | Available memory | > 20% | < 20% |
| `node_filesystem_avail_bytes` | Disk space | > 30% | < 30% |
| `node_disk_io_time_seconds_total` | Disk I/O | Baseline | Significant increase |

### Redis

**Performance Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `redis_up` | Redis is up | 1 | < 1 for > 1m |
| `redis_memory_used_bytes / redis_memory_max_bytes` | Memory usage | < 90% | > 90% |
| `redis_evicted_keys_total` | Evictions | 0 | > 0 |
| `redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses)` | Hit rate | > 95% | < 95% |
| `redis_connected_clients` | Connections | < 500 | > 500 |
| `redis_instantaneous_ops_per_sec` | Operations per second | Baseline | Significant drop |
| `redis_replication_lag_seconds` | Replication lag | < 1s | > 1s |

**Persistence Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `redis_rdb_last_save_time_elapsed_seconds` | Time since last save | < 1h | > 1h |
| `redis_aof_last_rewrite_time_sec` | Last AOF rewrite | Baseline | Significant increase |
| `redis_aof_rewrite_in_progress` | AOF rewrite in progress | 0 | 1 for > 10m |

### Neo4j

**Performance Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `neo4j_database_info_database` | Database is up | 1 | < 1 for > 1m |
| `neo4j_page_cache_hits_ratio` | Page cache hit ratio | > 95% | < 95% |
| `neo4j_transaction_seconds` | Transaction time | < 100ms | > 500ms |
| `neo4j_vm_heap_used` | Heap memory usage | < 80% | > 80% |
| `neo4j_vm_page_cache_used` | Page cache usage | < 80% | > 80% |
| `neo4j_bolt_messages_received` | Bolt messages | Baseline | Significant drop |

**Cluster Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `neo4j_causal_clustering_core_is_leader` | Is leader | 1 | 0 (no leader) |
| `neo4j_causal_clustering_core_last_leader_message` | Leader message | < 5s | > 5s |
| `neo4j_database_info_tx_last_closed` | Last transaction | Recent | Stale |

### Qdrant

**Performance Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `qdrant_collections_total` | Collections | Baseline | Significant change |
| `qdrant_points_total` | Total vectors | Baseline | Significant drop |
| `qdrant_grpc_requests_seconds` | Query latency | < 100ms | > 500ms |
| `qdrant_read_disk_bytes` | Disk reads | Baseline | Significant increase |
| `qdrant_write_disk_bytes` | Disk writes | Baseline | Significant increase |

**Replication Metrics:**

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `qdrant_cluster_status` | Cluster status | green | yellow/red |
| `qdrant_replication_nodes` | Replication nodes | 3 | < 3 |
| `qdrant_shard_transfers` | Shard transfers | 0 | > 0 for > 10m |

## Alert Configuration

### Prometheus Alert Rules

**PostgreSQL Alerts:**

```yaml
groups:
  - name: postgres_alerts
    rules:
      # Database down
      - alert: PostgresDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL database has been down for more than 1 minute."

      # High connections
      - alert: PostgresHighConnections
        expr: sum(pg_stat_activity_count) > 400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of database connections"
          description: "PostgreSQL has {{ $value }} active connections."

      # Replication lag
      - alert: PostgresReplicationLag
        expr: pg_replication_lag_bytes > 104857600
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag"
          description: "PostgreSQL replication lag is {{ $value | humanize }}."

      # Low cache hit ratio
      - alert: PostgresLowCacheHitRatio
        expr: (pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)) < 0.99
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit ratio"
          description: "PostgreSQL cache hit ratio is {{ $value | humanizePercentage }}."

      # Slow queries
      - alert: PostgresSlowQueries
        expr: rate(pg_stat_statements_mean_exec_time_ms[5m]) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries detected"
          description: "PostgreSQL mean query time is {{ $value }}ms."
```

**Redis Alerts:**

```yaml
groups:
  - name: redis_alerts
    rules:
      # Redis down
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis cache has been down for more than 1 minute."

      # High memory usage
      - alert: RedisHighMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis memory usage"
          description: "Redis memory usage is {{ $value | humanizePercentage }}."

      # Evictions detected
      - alert: RedisEvictions
        expr: rate(redis_evicted_keys_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Redis evictions detected"
          description: "Redis is evicting {{ $value }} keys/sec due to memory pressure."

      # Low hit rate
      - alert: RedisLowHitRate
        expr: (redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses)) < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low Redis hit rate"
          description: "Redis hit rate is {{ $value | humanizePercentage }}."
```

**Neo4j Alerts:**

```yaml
groups:
  - name: neo4j_alerts
    rules:
      # Neo4j down
      - alert: Neo4jDown
        expr: neo4j_database_info_database != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Neo4j is down"
          description: "Neo4j database has been down for more than 1 minute."

      # Low cache hit ratio
      - alert: Neo4jLowCacheHitRatio
        expr: neo4j_page_cache_hits_ratio < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low Neo4j page cache hit ratio"
          description: "Neo4j page cache hit ratio is {{ $value | humanizePercentage }}."

      # Slow transactions
      - alert: Neo4jSlowTransactions
        expr: rate(neo4j_transaction_seconds[5m]) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow Neo4j transactions"
          description: "Neo4j transaction time is {{ $value }}s."
```

**Qdrant Alerts:**

```yaml
groups:
  - name: qdrant_alerts
    rules:
      # Qdrant down
      - alert: QdrantDown
        expr: up{job="qdrant"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Qdrant is down"
          description: "Qdrant has been down for more than 1 minute."

      # Slow queries
      - alert: QdrantSlowQueries
        expr: histogram_quantile(0.99, rate(qdrant_grpc_requests_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow Qdrant queries"
          description: "99th percentile query time is {{ $value }}s."
```

## Performance Tuning

### PostgreSQL

**Identify Slow Queries:**

```sql
-- Find top 10 slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Find queries with high I/O
SELECT
  query,
  calls,
  blk_read_time,
  blk_write_time
FROM pg_stat_statements
ORDER BY (blk_read_time + blk_write_time) DESC
LIMIT 10;
```

**Index Optimization:**

```sql
-- Find missing indexes
SELECT schemaname, tablename, seq_scan
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_scan DESC
LIMIT 10;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### Redis

**Memory Optimization:**

```bash
# Analyze key distribution
redis-cli --bigkeys

# Analyze memory usage
redis-cli --memkeys

# Optimize hash values
redis-cli --hotkeys
```

### Neo4j

**Query Optimization:**

```cypher
# Find slow queries
CALL dbms.listQueries() YIELD queryId, query, planner, runtime
RETURN queryId, query, planner, runtime
ORDER BY runtime.totalTime DESC
LIMIT 10;

# Analyze query plans
EXPLAIN MATCH (n:Lead) RETURN n LIMIT 100;

# Profile query execution
PROFILE MATCH (n:Lead) RETURN n LIMIT 100;
```

## Troubleshooting

### Common Issues

**PostgreSQL High CPU:**

```bash
# Check CPU usage
kubectl top pod -n postgresql-operator

# Find long-running queries
psql -c "SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"

# Kill long-running query
psql -c "SELECT pg_terminate_backend(<pid>);"
```

**Redis Memory Pressure:**

```bash
# Check memory usage
redis-cli INFO memory

# Find large keys
redis-cli --bigkeys

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy

# Flush if necessary (be careful!)
redis-cli FLUSHALL
```

**Neo4j Slow Queries:**

```cypher
# List active queries
CALL dbms.listQueries() YIELD queryId, query, runtime
RETURN queryId, query, runtime.totalTime AS time;

# Kill slow query
CALL dbms.killQuery('<queryId>') YIELD queryId, query;
```

## Next Steps

- [Set Up Alerts](#alert-configuration)
- [Review Security Settings](DATABASE_SECURITY.md)
- [Schedule Maintenance Tasks](DATABASE_MAINTENANCE.md)
- [Complete Database Migration](DATABASE_MIGRATION.md)
