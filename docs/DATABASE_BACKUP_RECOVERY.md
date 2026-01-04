# Database Backup and Recovery Guide

## Overview

This guide covers backup strategies, recovery procedures, and disaster recovery for all databases in the Insurance Lead Generation AI Platform.

## Table of Contents

- [Backup Strategy](#backup-strategy)
- [Automated Backups](#automated-backups)
- [Manual Backups](#manual-backups)
- [Recovery Procedures](#recovery-procedures)
- [Point-in-Time Recovery](#point-in-time-recovery)
- [Disaster Recovery](#disaster-recovery)
- [Backup Verification](#backup-verification)
- [Testing Backup Integrity](#testing-backup-integrity)

## Backup Strategy

### Backup Types

| Database | Automated Snapshots | WAL/RDB Archives | Manual Backups | PITR Support |
|----------|-------------------|------------------|----------------|--------------|
| PostgreSQL | ✅ Daily | ✅ Continuous | ✅ On-demand | ✅ Yes |
| Redis | ✅ Daily | ✅ RDB + AOF | ✅ On-demand | ⚠️ Limited |
| Neo4j | ✅ Daily | ✅ Continuous | ✅ On-demand | ✅ Yes |
| Qdrant | ✅ Snapshots | ✅ WAL | ✅ On-demand | ⚠️ Limited |

### Retention Policy

| Environment | Snapshots | WAL Archives | Manual Backups |
|-------------|-----------|--------------|----------------|
| Production | 30 days | 7 days | Custom |
| Staging | 7 days | 3 days | Custom |
| Development | 1 day | 1 day | Custom |

### Backup Locations

- **S3**: Primary backup storage (encrypted)
- **Local**: Temporary storage before upload
- **Cross-region**: DR replica backups

## Automated Backups

### PostgreSQL

**RDS Automated Backups:**

```bash
# View backup information
aws rds describe-db-instances \
  --db-instance-identifier insurance-lead-gen-postgres-primary \
  --query 'DBInstances[0].BackupRetentionPeriod'

# List manual snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-postgres-primary
```

**PostgreSQL Operator Backups:**

```bash
# View backup status
kubectl get scheduledbackups -n postgresql-operator

# Manual backup
kubectl create backup postgres-backup-manual \
  --cluster postgres-cluster \
  -n postgresql-operator
```

**Script-based Backups:**

```bash
# Run backup script
./scripts/db/backup.sh

# View logs
tail -f logs/backup-*.log
```

### Redis

**ElastiCache Automated Backups:**

```bash
# View backup information
aws elasticache describe-replication-groups \
  --replication-group-id insurance-lead-gen-redis

# List snapshots
aws elasticache describe-snapshots \
  --replication-group-id insurance-lead-gen-redis
```

**Script-based Backups:**

```bash
# Trigger BGSAVE
redis-cli -h redis-host -p 6379 BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Neo4j

**Script-based Backups:**

```bash
# Online backup (no downtime)
neo4j-admin backup \
  --from=neo4j.example.com:7687 \
  --backup-dir=/backups \
  --name=insurance-lead-gen \
  --fallback-to-full=true

# Check backup status
neo4j-admin check-consistency \
  --backup-dir=/backups/insurance-lead-gen \
  --report=/tmp/consistency-report.txt
```

### Qdrant

**Snapshot Creation:**

```bash
# Create snapshot
curl -X POST "http://qdrant:6333/collections/insurance-leads/snapshots"

# List snapshots
curl "http://qdrant:6333/collections/insurance-leads/snapshots"

# Download snapshot
curl -X GET "http://qdrant:6333/collections/insurance-leads/snapshots/{snapshot_name}" \
  --output snapshot.tar
```

## Manual Backups

### PostgreSQL

```bash
# Full database dump
pg_dump \
  -h postgres-host \
  -p 5432 \
  -U postgres \
  -d insurance_lead_gen \
  -F c \
  -f postgres-backup.dump \
  -v

# Compress backup
gzip postgres-backup.dump

# Upload to S3
aws s3 cp postgres-backup.dump.gz \
  s3://insurance-lead-gen-postgres-backups/manual/ \
  --storage-class STANDARD_IA
```

### Redis

```bash
# Trigger BGSAVE
redis-cli -h redis-host -p 6379 BGSAVE

# Wait for completion
redis-cli -h redis-host -p 6379 LASTSAVE

# Copy RDB file
aws s3 cp /var/lib/redis/dump.rdb \
  s3://insurance-lead-gen-redis-backups/manual/ \
  --storage-class STANDARD_IA
```

### Neo4j

```bash
# Online backup
neo4j-admin backup \
  --from=neo4j-host:7687 \
  --backup-dir=/backups \
  --name=insurance-lead-gen-manual-$(date +%Y%m%d) \
  --fallback-to-full=true

# Compress backup
tar -czf /backups/neo4j-manual-$(date +%Y%m%d).tar.gz \
  /backups/insurance-lead-gen-manual-$(date +%Y%m%d)

# Upload to S3
aws s3 cp /backups/neo4j-manual-$(date +%Y%m%d).tar.gz \
  s3://insurance-lead-gen-neo4j-backups/manual/ \
  --storage-class STANDARD_IA
```

### Qdrant

```bash
# Create snapshot
curl -X POST "http://qdrant:6333/collections/insurance-leads/snapshots"

# List snapshots and find latest
SNAPSHOT_NAME=$(curl -s "http://qdrant:6333/collections/insurance-leads/snapshots" | \
  jq -r '.result[-1].name')

# Download snapshot
aws s3 cp s3://insurance-lead-gen-qdrant-backups/manual/${SNAPSHOT_NAME} \
  /backups/
```

## Recovery Procedures

### PostgreSQL Full Restore

```bash
# Use restore script
./scripts/db/restore.sh

# Select PostgreSQL
# Enter backup file path: postgres-backup-20240115.dump.gz

# Or restore manually
gunzip -c postgres-backup.dump.gz | pg_restore \
  -h postgres-host \
  -p 5432 \
  -U postgres \
  -d insurance_lead_gen \
  -v

# Verify data
psql -h postgres-host -U postgres -d insurance_lead_gen \
  -c "SELECT COUNT(*) FROM leads;"
```

### PostgreSQL Point-in-Time Recovery

```bash
# Use restore script with PITR
./scripts/db/restore.sh

# Select PostgreSQL Point-in-Time Recovery
# Enter target timestamp: 2024-01-15 14:30:00

# Recovery process:
# 1. Download base backup
# 2. Replay WAL logs to target time
# 3. Verify data integrity
# 4. Start database
```

### Redis Restore

```bash
# Use restore script
./scripts/db/restore.sh

# Select Redis
# Enter backup file path: redis-backup-20240115.rdb

# Or restore manually
# Stop Redis
sudo systemctl stop redis

# Backup current data
cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.bak

# Copy restore file
cp redis-backup-20240115.rdb /var/lib/redis/dump.rdb

# Start Redis
sudo systemctl start redis

# Verify
redis-cli -h redis-host PING
```

### Neo4j Restore

```bash
# Use restore script
./scripts/db/restore.sh

# Select Neo4j
# Enter backup file path: neo4j-backup-20240115.tar.gz

# Or restore manually
# Stop Neo4j
sudo systemctl stop neo4j

# Backup current data
mv /var/lib/neo4j/data /var/lib/neo4j/data.bak

# Extract and restore
tar -xzf neo4j-backup-20240115.tar.gz
neo4j-admin load \
  --from=/backups/neo4j-backup-20240115 \
  --force

# Start Neo4j
sudo systemctl start neo4j

# Verify cluster status
neo4j-admin status
```

### Qdrant Restore

```bash
# Use restore script
./scripts/db/restore.sh

# Select Qdrant
# Enter snapshot name: snapshot-20240115-143000

# Or restore manually
# Delete existing collection
curl -X DELETE "http://qdrant:6333/collections/insurance-leads"

# Restore from snapshot
curl -X PUT "http://qdrant:6333/collections/insurance-leads/snapshots/recover" \
  -H "Content-Type: application/json" \
  -d '{"location": "snapshot-20240115-143000"}'

# Verify collection
curl "http://qdrant:6333/collections/insurance-leads"
```

## Point-in-Time Recovery

### PostgreSQL PITR

**RDS Point-in-Time Recovery:**

```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier insurance-lead-gen-postgres-primary \
  --target-db-instance-identifier insurance-lead-gen-postgres-restored \
  --restore-time 2024-01-15T14:30:00.000Z \
  --use-latest-restorable-time

# Wait for restoration
aws rds describe-db-instances \
  --db-instance-identifier insurance-lead-gen-postgres-restored

# Verify data
psql -h restored-endpoint -U postgres -d insurance_lead_gen
```

**PostgreSQL Operator PITR:**

```bash
# List backups
kubectl get backups -n postgresql-operator

# Restore to specific time
kubectl create backup postgres-pitr-restore \
  --cluster postgres-cluster \
  --barman-object-store-backup-id <backup-id> \
  -n postgresql-operator
```

### Neo4j PITR

```bash
# List available backups
neo4j-admin list-backups --backup-dir=/backups

# Restore incremental backup
neo4j-admin load \
  --from=/backups/insurance-lead-gen \
  --force \
  --restore-dependencies

# Restore to specific transaction (if available)
neo4j-admin load \
  --from=/backups/insurance-lead-gen \
  --force \
  --transaction-id <tx-id>
```

## Disaster Recovery

### DR Scenarios

| Scenario | RTO | RPO | Recovery Steps |
|----------|-----|-----|----------------|
| Single Node Failure | < 1 min | 0 | Automatic failover to replica |
| AZ Failure | < 5 min | 0 | Cross-AZ failover |
| Region Failure | < 30 min | < 5 min | Cross-region failover |
| Data Corruption | < 2 hours | < 1 hour | Restore from backup |
| Ransomware Attack | < 4 hours | < 1 hour | Restore from clean backup |

### PostgreSQL DR Failover

```bash
# 1. Check primary status
aws rds describe-db-instances \
  --db-instance-identifier insurance-lead-gen-postgres-primary

# 2. Promote read replica (if primary is down)
aws rds promote-read-replica \
  --db-instance-identifier insurance-lead-gen-postgres-replica-local

# 3. Update DNS/Connection strings
# Update DATABASE_URL environment variables

# 4. Verify application connectivity
# Test application endpoints
```

### Redis DR Failover

```bash
# 1. Check cluster status
aws elasticache describe-replication-groups \
  --replication-group-id insurance-lead-gen-redis

# 2. Sentinel failover (if using Kubernetes)
redis-cli -h sentinel-host -p 26379 SENTINEL failover mymaster

# 3. Verify new primary
redis-cli -h new-primary-host -p 6379 ROLE

# 4. Update connection strings
```

### Neo4j DR Failover

```bash
# 1. Check cluster status
cypher-shell -a bolt://neo4j:7687 "CALL dbms.cluster.overview();"

# 2. If primary is down, wait for automatic leader election

# 3. Verify new leader
cypher-shell -a bolt://neo4j:7687 "CALL dbms.cluster.role();"

# 4. Update application connection strings
```

## Backup Verification

### Automated Verification

```bash
# Run verification script
./scripts/db/verify-backups.sh
```

**Verification Checks:**

1. ✅ Backup file exists
2. ✅ Backup file is not corrupted
3. ✅ Backup can be restored
4. ✅ Data integrity after restore
5. ✅ Backup uploaded to S3
6. ✅ Backup retention policy

### Manual Verification

**PostgreSQL:**

```bash
# Restore backup to test database
pg_restore -h test-postgres -U postgres -d test_db -v backup.dump

# Verify row counts
psql -h test-postgres -U postgres -d test_db \
  -c "SELECT COUNT(*) FROM leads;"

# Verify foreign key constraints
psql -h test-postgres -U postgres -d test_db \
  -c "SELECT conname FROM pg_constraint WHERE contype = 'f';"
```

**Redis:**

```bash
# Verify RDB file
redis-check-rdb dump.rdb

# Check key count
redis-cli -h test-redis DBSIZE
```

**Neo4j:**

```bash
# Verify backup consistency
neo4j-admin check-consistency \
  --backup-dir=/backups/insurance-lead-gen \
  --report=/tmp/consistency-report.txt

# Verify node/relationship counts
cypher-shell "MATCH (n) RETURN count(n) as node_count;"
cypher-shell "MATCH ()-[r]->() RETURN count(r) as rel_count;"
```

## Testing Backup Integrity

### Quarterly DR Drills

**Schedule:** First Sunday of each quarter

**Procedure:**

1. **Preparation (Friday):**
   ```bash
   # Announce DR drill to team
   # Schedule maintenance window
   # Notify stakeholders
   ```

2. **Execution (Saturday):**
   ```bash
   # 1. Create DR environment
   # 2. Restore all databases
   # 3. Verify data integrity
   # 4. Test application functionality
   ```

3. **Verification (Saturday):**
   ```bash
   # Run automated tests
   # Manual verification
   # Performance testing
   # Documentation update
   ```

4. **Cleanup (Sunday):**
   ```bash
   # Document findings
   # Update procedures if needed
   # Clean up DR environment
   ```

**Success Criteria:**

- ✅ All databases restored successfully
- ✅ Data integrity verified (100% match)
- ✅ RTO < 30 minutes
- ✅ RPO < 5 minutes
- ✅ Application functional
- ✅ Performance within SLA

### Monthly Backup Restoration Test

```bash
# Select random backup from last month
BACKUP_FILE=$(aws s3 ls s3://insurance-lead-gen-postgres-backups/ \
  | grep "2024-$(date -d 'last month' +%Y-%m)" \
  | sort -R | head -1 | awk '{print $4}')

# Restore to test environment
./scripts/db/restore.sh postgres ${BACKUP_FILE}

# Verify data
./scripts/db/verify-data-integrity.sh

# Generate report
./scripts/db/generate-test-report.sh
```

## Alerting

### Backup Failure Alerts

```bash
# CloudWatch alarm configuration
aws cloudwatch put-metric-alarm \
  --alarm-name postgres-backup-failed \
  --alarm-description "PostgreSQL backup failed" \
  --metric-name BackupStatus \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=insurance-lead-gen-postgres-primary \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:database-alerts
```

## Next Steps

- [Set Up Monitoring](DATABASE_MONITORING.md)
- [Review Security Settings](DATABASE_SECURITY.md)
- [Schedule Maintenance Tasks](DATABASE_MAINTENANCE.md)
- [Complete Database Migration](DATABASE_MIGRATION.md)
