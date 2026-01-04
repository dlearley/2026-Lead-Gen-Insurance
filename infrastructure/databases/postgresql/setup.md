# PostgreSQL Production Setup

## Overview

This document outlines the production PostgreSQL 16 deployment architecture, high availability strategy, backup procedures, and performance tuning recommendations.

## Architecture

### Primary-Replica Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                     Production VPC                           │
│                                                               │
│  ┌─────────────┐         ┌──────────────────────────────┐   │
│  │ Application │────────▶│   PostgreSQL Primary (AZ1)    │   │
│  │   Servers   │         │   - db.r6i.xlarge            │   │
│  │   (EKS)     │         │   - 500GB io1 (20K IOPS)     │   │
│  └─────────────┘         │   - Streaming Replication    │   │
│                           │   - Auto-failover enabled     │   │
│                           └───────────┬──────────────────┘   │
│                                       │                       │
│                                       │ Replication           │
│                                       ▼                       │
│                          ┌──────────────────────────────┐    │
│                          │   Read Replica - Local (AZ2) │    │
│                          │   - db.r6i.xlarge            │    │
│                          │   - Read-only queries        │    │
│                          │   - Load distribution        │    │
│                          └───────────┬──────────────────┘    │
│                                      │                       │
│                                      │ Replication           │
│                                      ▼                       │
│                    ┌────────────────────────────────┐       │
│                    │  Disaster Recovery Replica     │       │
│                    │  (Different Region)            │       │
│                    │  - db.r6i.xlarge               │       │
│                    │  - Auto-promotion              │       │
│                    └────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Connection Pooling Layer

```
Applications → PgBouncer → PostgreSQL Primary/Replicas
```

- **PgBouncer Cluster**: 3 instances (HA)
- **Pool Mode**: Session pooling
- **Pool Size**: 100 connections per instance
- **Query Timeout**: 30 seconds
- **Idle Timeout**: 15 minutes

## High Availability Strategy

### Streaming Replication

1. **Primary Instance**
   - Handles all write operations
   - Streams WAL (Write-Ahead Logs) to replicas
   - Automatic failover if unhealthy

2. **Local Read Replica (Same Region, Different AZ)**
   - Read-only queries offloaded from primary
   - Automatic failover target if primary fails
   - Replication lag: < 100ms

3. **DR Replica (Different Region)**
   - Cross-region replication for disaster recovery
   - Manual or automatic promotion for DR
   - Replication lag: < 1 second

### Failover Process

1. **Automatic Failover (Local)**
   - Health checks fail for 3 consecutive checks
   - Read replica promoted to primary
   - DNS update (Route53) points to new primary
   - Applications reconnect automatically
   - Total downtime: < 60 seconds

2. **Disaster Recovery (Cross-Region)**
   - DR replica promoted to primary
   - New read replica created in original region
   - Application failover orchestrated via Kubernetes
   - Total downtime: < 5 minutes

### Point-in-Time Recovery (PITR)

- **WAL Archiving**: Continuous to S3
- **Retention**: 7 days
- **RPO (Recovery Point Objective)**: < 5 minutes
- **RTO (Recovery Time Objective)**: < 30 minutes

## Backup Strategy

### Backup Types

1. **Automated Daily Backups**
   - Time: 2:00 AM UTC
   - Type: Full snapshot
   - Retention: 30 days (production), 7 days (staging)
   - Location: Encrypted S3 bucket

2. **Continuous WAL Archiving**
   - Real-time WAL log streaming to S3
   - Enables point-in-time recovery
   - Retention: 7 days

3. **Manual On-Demand Backups**
   - Full database dump with pg_dump
   - Compressed with gzip
   - Immediate upload to S3

### Backup Schedule

| Backup Type | Frequency | Retention | RPO |
|-------------|-----------|-----------|-----|
| Automated Snapshot | Daily | 30 days | 24 hours |
| WAL Archives | Continuous | 7 days | 5 minutes |
| Manual | On-demand | Custom | N/A |

## Performance Tuning

### Memory Configuration (db.r6i.xlarge = 32GB RAM)

```sql
-- Shared buffers: 25% of RAM
shared_buffers = 8GB

-- Effective cache size: 75% of RAM
effective_cache_size = 24GB

-- Work memory: Per query operation
work_mem = 64MB

-- Maintenance work memory: VACUUM, CREATE INDEX
maintenance_work_mem = 2GB

-- Max connections (via PgBouncer)
max_connections = 100 (application connections)
```

### Disk I/O Configuration

```sql
-- Random page cost: SSD-aware
random_page_cost = 1.0

-- Checkpoint configuration (reduced I/O spikes)
checkpoint_completion_target = 0.9

-- WAL configuration
wal_buffers = 16MB

-- Background writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
```

### Query Performance

```sql
-- Enable query statistics
track_io_timing = on
track_functions = all

-- Log slow queries (threshold: 5 seconds)
log_min_duration_statement = 5000

-- Enable auto-explain for slow queries
shared_preload_libraries = 'auto_explain'
```

### Index Optimization

1. **B-Tree Indexes**: Default for equality and range queries
2. **Partial Indexes**: For frequently filtered subsets
3. **GIN Indexes**: For JSON/array fields
4. **BRIN Indexes**: For very large time-series data

## Connection Management

### PgBouncer Configuration

```
[databases]
insurance_lead_gen = host=primary-db.insurance-lead-gen.internal port=5432 dbname=insurance_lead_gen

[pgbouncer]
pool_mode = session
max_client_conn = 10000
default_pool_size = 100
min_pool_size = 25
reserve_pool_size = 50
reserve_pool_timeout = 3
query_timeout = 30
idle_timeout = 900
server_lifetime = 3600
```

### Connection Limits

| Role | Max Connections | Purpose |
|------|-----------------|---------|
| application | 500 | Application connections |
| readonly | 200 | Read-only access |
| admin | 50 | Administrative tasks |
| backup | 10 | Backup operations |

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Replication Lag**
   - Alert if > 100MB lag
   - Critical if > 500MB

2. **Connection Count**
   - Warning if > 80% of max connections
   - Critical if > 95%

3. **Cache Hit Ratio**
   - Target: > 99%
   - Alert if < 99%

4. **Slow Queries**
   - Alert if queries > 5 seconds
   - Log queries > 1 second

5. **Disk Space**
   - Warning if < 30% free
   - Critical if < 20% free

6. **Transaction Wraparound**
   - Warning if approaching autovacuum_freeze_max_age

### Monitoring Tools

- **postgres_exporter**: Prometheus metrics
- **Performance Insights**: AWS native monitoring
- **CloudWatch Metrics**: Infrastructure metrics
- **pgBadger**: Log analysis

## Maintenance Tasks

### Daily

- Automated backup at 2:00 AM UTC
- Check backup integrity
- Verify replication lag < 100ms

### Weekly

- Review slow query log
- Analyze index usage
- Check table bloat
- Update statistics: `ANALYZE`

### Monthly

- Review and tune parameter groups
- Index maintenance (REINDEX if needed)
- VACUUM FULL on bloated tables (if needed)
- Disaster recovery drill

### Quarterly

- Capacity planning review
- Performance baseline comparison
- Security audit
- Backup restoration test

## Security Hardening

### Network Security

- Private subnets only
- Security group restricts access to application servers
- VPC peering for cross-region replication
- TLS encryption for all connections

### Authentication & Authorization

- IAM database authentication (recommended)
- Role-based access control (RBAC)
- Separate roles for application, admin, readonly
- Password rotation every 90 days

### Encryption

- At-rest encryption: AWS KMS
- In-transit encryption: TLS 1.3
- Backup encryption: AES-256

### Compliance

- Audit logging enabled (pgAudit)
- Access logging for all operations
- Data retention policies for HIPAA
- Regular security scans

## Capacity Planning

### Sizing Guidelines

| Metric | Current | Next 6 Months | Next 12 Months |
|--------|---------|---------------|----------------|
| Storage | 500GB | 650GB | 800GB |
| IOPS | 20,000 | 25,000 | 30,000 |
| Connections | 500 | 750 | 1,000 |
| RAM | 32GB | 32GB | 64GB |

### Scaling Triggers

- **Storage**: Scale up at 70% utilization
- **IOPS**: Scale up at 80% utilization
- **Connections**: Add read replica at 80% utilization
- **CPU**: Scale up at 75% sustained utilization

## Disaster Recovery

### Recovery Procedures

1. **Database Restoration from Snapshot**
   ```bash
   # Restore from latest snapshot via AWS Console
   # Estimated time: 30-60 minutes
   ```

2. **Point-in-Time Recovery**
   ```bash
   # Recover to specific timestamp
   # Uses WAL archives from S3
   # Estimated time: 30-90 minutes
   ```

3. **Read Replica Promotion**
   ```bash
   # Promote read replica to primary
   # Update DNS via Route53
   # Estimated time: < 60 seconds
   ```

### DR Testing

- **Frequency**: Quarterly
- **Test Type**: Full DR drill
- **Scope**: Production replica promotion
- **Objective**: Verify RTO < 30 minutes, RPO < 5 minutes

## Troubleshooting

### Common Issues

1. **High Replication Lag**
   - Check network bandwidth
   - Review WAL volume
   - Check replica CPU/Disk I/O

2. **Connection Pool Exhaustion**
   - Check for connection leaks
   - Review PgBouncer pool settings
   - Identify long-running queries

3. **Slow Queries**
   - Enable query logging
   - Use EXPLAIN ANALYZE
   - Review index usage

4. **Disk Space Issues**
   - Identify largest tables
   - Check WAL retention
   - Review backup retention

## References

- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
