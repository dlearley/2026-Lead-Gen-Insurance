# PostgreSQL Infrastructure

Production-grade PostgreSQL 16 deployment with high availability, replication, automated backups, and comprehensive monitoring.

## Overview

This module provides:
- **Primary Instance**: Multi-AZ RDS PostgreSQL 16 (db.r6i.xlarge, 500GB io1, 20K IOPS)
- **Read Replicas**: Local (same region) and DR (cross-region) replicas
- **Automatic Failover**: < 60 seconds downtime
- **Connection Pooling**: PgBouncer for connection management
- **Automated Backups**: Daily snapshots with continuous WAL archiving
- **Point-in-Time Recovery**: 5-minute RPO, 30-minute RTO
- **Performance Tuning**: Optimized for 32GB RAM instance
- **Monitoring**: Prometheus metrics with comprehensive alerting

## Architecture

```
Applications → PgBouncer → PostgreSQL Primary (AZ1)
                                    ↓ Streaming Replication
                        ┌───────────┴───────────┐
                        ↓                       ↓
        Read Replica (AZ2)    DR Replica (Region B)
                        ↓                       ↓
                     RDS                     RDS
```

## Files

### Terraform Configuration
- `primary-instance.tf` - Primary RDS instance configuration
- `read-replica.tf` - Read replicas (local and DR)
- `security-group.tf` - Security groups and S3 integration
- `subnet-group.tf` - Multi-AZ subnet groups

### Kubernetes Configuration
- `../../k8s/operators/postgres-operator.yaml` - CloudNativePG operator
- `../../k8s/base/postgres/backup-cronjob.yaml` - Automated backup CronJob

### Monitoring
- `../../monitoring/prometheus/postgres-rules.yaml` - Alert rules

## Quick Start

### Local Development
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d insurance_lead_gen
```

### Production Deployment
```bash
# Navigate to Terraform directory
cd deploy/terraform/aws

# Initialize
terraform init

# Review plan
terraform plan -var-file=environments/production.tfvars

# Deploy
terraform apply -var-file=environments/production.tfvars
```

### Kubernetes Deployment
```bash
# Install operator
kubectl apply -f ../../k8s/operators/postgres-operator.yaml

# Verify cluster
kubectl get clusters -n postgresql-operator

# Check pods
kubectl get pods -n postgresql-operator
```

## Configuration

### Memory Settings (32GB RAM)
```sql
shared_buffers: 8GB         -- 25% of RAM
effective_cache_size: 24GB  -- 75% of RAM
work_mem: 64MB              -- Per query operation
maintenance_work_mem: 2GB   -- VACUUM, CREATE INDEX
```

### Performance Settings
```sql
random_page_cost: 1.0        -- SSD-optimized
checkpoint_completion_target: 0.9
max_wal_size: 4GB
min_wal_size: 1GB
```

### Connection Settings
```sql
max_connections: 500
statement_timeout: 300000  -- 5 minutes
```

## Backups

### Automated Backups
- **Daily Snapshots**: 2 AM UTC
- **WAL Archiving**: Continuous to S3
- **Retention**: 30 days (production), 7 days (staging)
- **Location**: Encrypted S3 bucket

### Manual Backup
```bash
# Run backup script
./scripts/db/backup.sh

# Or use pg_dump
pg_dump -h $PGHOST -p 5432 -U postgres -d insurance_lead_gen \
  -F c -f backup.dump -v
```

### Restore
```bash
# Use restore script
./scripts/db/restore.sh postgres

# Or use pg_restore
pg_restore -h $PGHOST -p 5432 -U postgres \
  -d insurance_lead_gen -v backup.dump
```

### Point-in-Time Recovery
```bash
# Use restore script with PITR
./scripts/db/restore.sh postgres-pitr

# Enter target timestamp when prompted
```

## Monitoring

### Key Metrics
- Replication lag: < 100MB
- Active connections: < 400
- Cache hit ratio: > 99%
- Query time: < 5s (p95)
- CPU usage: < 80%
- Disk usage: < 80%

### Alerting
See `../../monitoring/prometheus/postgres-rules.yaml` for all alert rules.

Critical alerts:
- PostgreSQL down
- High replication lag
- High disk usage
- Connection pool exhaustion

## Connection Strings

### Production (RDS)
```
postgresql://${PGUSER}:${PGPASSWORD}@${PRIMARY_ENDPOINT}:5432/${PGDATABASE}
```

### Production (Kubernetes)
```
postgresql://${PGUSER}:${PGPASSWORD}@postgres-cluster-rw.postgresql-operator.svc.cluster.local:5432/${PGDATABASE}
```

### Development
```
postgresql://postgres:postgres@localhost:5432/insurance_lead_gen
```

## Security

### Authentication
- **app_role**: CRUD operations (100 connections)
- **readonly_role**: SELECT only (50 connections)
- **migration_role**: Superuser (5 connections, migrations only)
- **admin_role**: Superuser (10 connections, admin only)

### Encryption
- **At Rest**: AES-256 (AWS KMS)
- **In Transit**: TLS 1.3
- **Backups**: Encrypted with AES-256

### Access Control
- Private subnets only
- Security groups limit access
- RBAC enforced
- Audit logging enabled

## Maintenance

### Daily
- Backup verification
- Health checks
- Resource monitoring

### Weekly
- Slow query analysis
- VACUUM ANALYZE
- Statistics update

### Monthly
- Index maintenance
- Full VACUUM
- Performance review

### Quarterly
- Full maintenance
- Capacity planning
- Security audit

## Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Test connection
psql -h $PGHOST -p 5432 -U postgres -d insurance_lead_gen
```

### High CPU Usage
```bash
# Find long-running queries
psql -c "SELECT pid, state, query_start, query \
  FROM pg_stat_activity WHERE state != 'idle' \
  ORDER BY query_start;"

# Kill query if needed
psql -c "SELECT pg_terminate_backend(<pid>);"
```

### Replication Lag
```bash
# Check lag
psql -c "SELECT now(), pg_last_xact_replay_timestamp(), \
  now() - pg_last_xact_replay_timestamp();"
```

## Documentation

- [Database Setup Guide](../../../docs/DATABASE_SETUP.md)
- [Backup and Recovery Guide](../../../docs/DATABASE_BACKUP_RECOVERY.md)
- [Monitoring Guide](../../../docs/DATABASE_MONITORING.md)
- [Maintenance Guide](../../../docs/DATABASE_MAINTENANCE.md)
- [Security Guide](../../../docs/DATABASE_SECURITY.md)

## Support

- PostgreSQL Documentation: https://www.postgresql.org/docs/16/
- AWS RDS Documentation: https://docs.aws.amazon.com/rds/
- CloudNativePG Documentation: https://cloudnative-pg.io/
- PgBouncer Documentation: https://www.pgbouncer.org/
