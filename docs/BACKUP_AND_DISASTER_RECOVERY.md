# ============================================
# Production Database Backup & Recovery Procedures
# Insurance Lead Generation Platform - Phase 19.2
# ============================================

# Database Backup Strategy for Production
# Insurance Lead Generation Platform - Phase 19.2

## Overview
This document outlines the comprehensive backup and disaster recovery strategy for the Insurance Lead Generation Platform production environment.

### Recovery Time Objective (RTO): 4 hours
### Recovery Point Objective (RPO): 1 hour

---

## Backup Architecture

### PostgreSQL Database (RDS)

#### Automated Backups
- **Frequency**: Daily automated backups
- **Retention**: 35 days
- **Backup Window**: 02:00-04:00 UTC
- **Point-in-Time Recovery**: 5 minutes
- **Multi-AZ**: Enabled for high availability
- **Encryption**: AES-256 at rest

#### Backup Script
```bash
#!/bin/bash
# File: scripts/backup-postgres.sh

set -euo pipefail

# Configuration
DB_INSTANCE="insurance-lead-gen-production-db"
BACKUP_BUCKET="insurance-lead-gen-backups"
RETENTION_DAYS=35
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting PostgreSQL backup at $(date)"

# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_INSTANCE" \
  --db-snapshot-identifier "backup-${DATE}" \
  --tags Key=Environment,Value=production \
         Key=BackupType,Value=automated \
         Key=CreatedBy,Value=automated-backup-script

echo "RDS snapshot created: backup-${DATE}"

# Wait for snapshot to be available
echo "Waiting for snapshot to complete..."
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier "backup-${DATE}"

echo "PostgreSQL backup completed at $(date)"

# Cleanup old snapshots
echo "Cleaning up old snapshots..."
aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type automated \
  --query 'DBSnapshots[?SnapshotCreateTime<=`'"$(date -d "$RETENTION_DAYS days ago" -u +%Y-%m-%dT%H:%M:%SZ)"'`].DBSnapshotIdentifier' \
  --output text | xargs -r -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}

echo "Backup process completed"
```

#### Manual Backup Script
```bash
#!/bin/bash
# File: scripts/manual-backup-postgres.sh

set -euo pipefail

# Configuration
DB_INSTANCE="insurance-lead-gen-production-db"
BACKUP_BUCKET="insurance-lead-gen-backups"
DATE=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="manual-backup-${DATE}"

echo "Starting manual PostgreSQL backup at $(date)"

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_INSTANCE" \
  --db-snapshot-identifier "$SNAPSHOT_NAME" \
  --tags Key=Environment,Value=production \
         Key=BackupType,Value=manual \
         Key=CreatedBy,Value=manual-backup-script

echo "Manual snapshot created: $SNAPSHOT_NAME"

# Wait for completion
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier "$SNAPSHOT_NAME"

echo "Manual backup completed at $(date)"
```

---

### Redis Cache (ElastiCache)

#### Backup Configuration
- **Frequency**: Daily at 03:00 UTC
- **Retention**: 7 days
- **Backup Format**: RDB snapshots
- **Encryption**: At rest and in transit

#### Redis Backup Script
```bash
#!/bin/bash
# File: scripts/backup-redis.sh

set -euo pipefail

# Configuration
REDIS_CLUSTER="insurance-lead-gen-production-redis"
BACKUP_BUCKET="insurance-lead-gen-backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting Redis backup at $(date)"

# Create ElastiCache snapshot
aws elasticache create-snapshot \
  --cache-cluster-id "$REDIS_CLUSTER" \
  --snapshot-name "backup-${DATE}" \
  --replication-group-id "$REDIS_CLUSTER"

echo "Redis snapshot created: backup-${DATE}"

# Wait for snapshot to complete
echo "Waiting for Redis snapshot to complete..."
aws elasticache wait snapshot-available \
  --cache-cluster-id "$REDIS_CLUSTER" \
  --snapshot-name "backup-${DATE}"

echo "Redis backup completed at $(date)"

# Cleanup old snapshots
echo "Cleaning up old Redis snapshots..."
aws elasticache describe-snapshots \
  --cache-cluster-id "$REDIS_CLUSTER" \
  --query 'Snapshots[?SnapshotCreateTime<=`'"$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)"'`].SnapshotName' \
  --output text | xargs -r -I {} aws elasticache delete-snapshot --snapshot-name {}
```

---

### Application Data Backup

#### File System Backup Script
```bash
#!/bin/bash
# File: scripts/backup-application.sh

set -euo pipefail

# Configuration
BACKUP_BUCKET="insurance-lead-gen-backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOCAL_BACKUP_DIR="/tmp/backup-${DATE}"

echo "Starting application data backup at $(date)"

# Create local backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

# Backup application logs
echo "Backing up application logs..."
aws s3 sync /var/log/insurance-lead-gen/ "s3://${BACKUP_BUCKET}/logs/${DATE}/" \
  --exclude "*" \
  --include "*.log" \
  --storage-class STANDARD_IA

# Backup configuration files
echo "Backing up configuration..."
tar -czf "$LOCAL_BACKUP_DIR/config.tar.gz" \
  /etc/insurance-lead-gen/ \
  /opt/insurance-lead-gen/config/

# Upload to S3
aws s3 cp "$LOCAL_BACKUP_DIR/config.tar.gz" \
  "s3://${BACKUP_BUCKET}/config/config-${DATE}.tar.gz"

# Cleanup
rm -rf "$LOCAL_BACKUP_DIR"

echo "Application backup completed at $(date)"
```

---

## Recovery Procedures

### PostgreSQL Recovery

#### Point-in-Time Recovery
```bash
#!/bin/bash
# File: scripts/recover-postgres-pitr.sh

set -euo pipefail

# Configuration
NEW_INSTANCE_NAME="insurance-lead-gen-recovery"
SOURCE_INSTANCE="insurance-lead-gen-production-db"
RECOVERY_TIME="${1:-}"  # Format: 2024-01-15T14:30:00Z

if [[ -z "$RECOVERY_TIME" ]]; then
  echo "Usage: $0 <recovery-time-iso8601>"
  echo "Example: $0 2024-01-15T14:30:00Z"
  exit 1
fi

echo "Starting point-in-time recovery to $RECOVERY_TIME"

# Restore from automated backup to new instance
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier "$SOURCE_INSTANCE" \
  --target-db-instance-identifier "$NEW_INSTANCE_NAME" \
  --restore-time "$RECOVERY_TIME" \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name insurance-lead-gen-production-subnet-group \
  --backup-retention-period 35 \
  --allocated-storage 500 \
  --db-instance-class db.r5.xlarge

echo "Recovery instance creation initiated: $NEW_INSTANCE_NAME"
echo "This may take 15-30 minutes to complete"

# Wait for instance to be available
aws rds wait db-instance-available --db-instance-identifier "$NEW_INSTANCE_NAME"

echo "Point-in-time recovery completed"

# Get connection details
aws rds describe-db-instances --db-instance-identifier "$NEW_INSTANCE_NAME" \
  --query 'DBInstances[0].[Endpoint.Address,Endpoint.Port,MasterUsername]'
```

#### Full Instance Recovery
```bash
#!/bin/bash
# File: scripts/recover-postgres-full.sh

set -euo pipefail

# Configuration
SNAPSHOT_ID="${1:-}"
NEW_INSTANCE_NAME="insurance-lead-gen-recovery"

if [[ -z "$SNAPSHOT_ID" ]]; then
  echo "Usage: $0 <snapshot-identifier>"
  echo "Available snapshots:"
  aws rds describe-db-snapshots --db-instance-identifier insurance-lead-gen-production-db \
    --query 'DBSnapshots[?Status==`available`].[DBSnapshotIdentifier,SnapshotCreateTime]' \
    --output table
  exit 1
fi

echo "Starting full recovery from snapshot: $SNAPSHOT_ID"

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$NEW_INSTANCE_NAME" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name insurance-lead-gen-production-subnet-group \
  --allocated-storage 500 \
  --db-instance-class db.r5.xlarge

echo "Recovery instance creation initiated: $NEW_INSTANCE_NAME"

# Wait for completion
aws rds wait db-instance-available --db-instance-identifier "$NEW_INSTANCE_NAME"

echo "Full recovery completed"
```

---

### Redis Recovery

#### Redis Recovery Script
```bash
#!/bin/bash
# File: scripts/recover-redis.sh

set -euo pipefail

# Configuration
SOURCE_SNAPSHOT="${1:-}"
NEW_CLUSTER_NAME="insurance-lead-gen-recovery-redis"

if [[ -z "$SOURCE_SNAPSHOT" ]]; then
  echo "Usage: $0 <snapshot-name>"
  echo "Available snapshots:"
  aws elasticache describe-snapshots \
    --query 'Snapshots[?Status==`available`].[SnapshotName,SnapshotCreateTime]' \
    --output table
  exit 1
fi

echo "Starting Redis recovery from snapshot: $SOURCE_SNAPSHOT"

# Get source cluster details
SOURCE_CLUSTER=$(aws elasticache describe-replication-groups \
  --replication-group-id insurance-lead-gen-production-redis \
  --query 'ReplicationGroups[0]')

# Create new cluster from snapshot
aws elasticache create-replication-group \
  --replication-group-id "$NEW_CLUSTER_NAME" \
  --replication-group-description "Recovery cluster from $SOURCE_SNAPSHOT" \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --engine-version 7.1 \
  --cache-subnet-group-name insurance-lead-gen-production-subnet-group \
  --security-group-ids sg-xxxxxxxxx \
  --snapshot-arns arn:aws:elasticache:us-east-1:123456789012:snapshot:$SOURCE_SNAPSHOT \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled

echo "Redis recovery cluster creation initiated: $NEW_CLUSTER_NAME"
echo "This may take 20-40 minutes to complete"

# Wait for cluster to be available
aws elasticache wait replication-group-available --replication-group-id "$NEW_CLUSTER_NAME"

echo "Redis recovery completed"
```

---

## Disaster Recovery Runbook

### Scenario 1: Database Complete Failure

#### Immediate Response (0-15 minutes)
1. **Assess the situation**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --region us-east-1
   aws rds describe-db-snapshots --db-instance-identifier insurance-lead-gen-production-db
   ```

2. **Notify stakeholders**
   - Update status page
   - Notify on-call team
   - Send initial incident report

#### Recovery Actions (15-60 minutes)
1. **Restore from latest snapshot**
   ```bash
   ./scripts/recover-postgres-full.sh backup-20240115_020000
   ```

2. **Update application configuration**
   ```bash
   # Update connection strings
   kubectl create secret generic db-connection \
     --from-literal=url="postgresql://user:pass@new-host:5432/db" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

3. **Restart services**
   ```bash
   kubectl rollout restart deployment/data-service
   kubectl rollout restart deployment/api-service
   ```

#### Validation (60-90 minutes)
1. **Test database connectivity**
2. **Verify application functionality**
3. **Check data integrity**
4. **Monitor performance metrics**

---

### Scenario 2: Regional Outage

#### Immediate Response (0-5 minutes)
1. **Failover to secondary region**
2. **Update DNS records**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://dns-failover.json
   ```

3. **Scale services in secondary region**

#### Recovery Actions (5-120 minutes)
1. **Restore databases in secondary region**
2. **Synchronize data**
3. **Verify service health**

---

### Scenario 3: Data Corruption

#### Immediate Response (0-10 minutes)
1. **Stop affected services**
   ```bash
   kubectl scale deployment data-service --replicas=0
   ```

2. **Preserve evidence**
   ```bash
   # Capture corrupted data state
   kubectl exec -it deployment/data-service -- pg_dump > corrupted-data.sql
   ```

#### Recovery Actions (10-120 minutes)
1. **Identify corruption scope**
2. **Restore to last known good state**
3. **Apply incremental recovery**
4. **Verify data integrity**

---

## Backup Monitoring and Validation

### Backup Health Check Script
```bash
#!/bin/bash
# File: scripts/backup-health-check.sh

set -euo pipefail

echo "=== Backup Health Check - $(date) ==="

# Check PostgreSQL backups
echo "Checking PostgreSQL backups..."
LATEST_PG_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-production-db \
  --snapshot-type automated \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].SnapshotCreateTime' \
  --output text)

PG_SNAPSHOT_AGE=$(( ($(date +%s) - $(date -d "$LATEST_PG_SNAPSHOT" +%s)) / 3600 ))

if [[ $PG_SNAPSHOT_AGE -gt 25 ]]; then
  echo "WARNING: PostgreSQL backup is ${PG_SNAPSHOT_AGE} hours old"
else
  echo "OK: PostgreSQL backup is ${PG_SNAPSHOT_AGE} hours old"
fi

# Check Redis backups
echo "Checking Redis backups..."
LATEST_REDIS_SNAPSHOT=$(aws elasticache describe-snapshots \
  --cache-cluster-id insurance-lead-gen-production-redis \
  --query 'Snapshots | sort_by(@, &SnapshotCreateTime) | [-1].SnapshotCreateTime' \
  --output text)

REDIS_SNAPSHOT_AGE=$(( ($(date +%s) - $(date -d "$LATEST_REDIS_SNAPSHOT" +%s)) / 3600 ))

if [[ $REDIS_SNAPSHOT_AGE -gt 25 ]]; then
  echo "WARNING: Redis backup is ${REDIS_SNAPSHOT_AGE} hours old"
else
  echo "OK: Redis backup is ${REDIS_SNAPSHOT_AGE} hours old"
fi

# Check S3 backup integrity
echo "Checking S3 backup integrity..."
BACKUP_COUNT=$(aws s3 ls s3://insurance-lead-gen-backups/config/ --recursive | wc -l)

if [[ $BACKUP_COUNT -lt 1 ]]; then
  echo "WARNING: No recent configuration backups found"
else
  echo "OK: Found $BACKUP_COUNT configuration backup objects"
fi

echo "=== Backup Health Check Completed ==="
```

### Automated Backup Monitoring
```bash
# Add to crontab for daily execution
0 6 * * * /opt/insurance-lead-gen/scripts/backup-health-check.sh >> /var/log/backup-health.log 2>&1

# Weekly backup verification
0 2 * * 0 /opt/insurance-lead-gen/scripts/verify-backup-integrity.sh
```

---

## Backup Retention Policy

### Retention Schedule
- **Daily automated backups**: 35 days
- **Weekly backups**: 12 weeks
- **Monthly backups**: 12 months
- **Quarterly backups**: 4 years
- **Yearly backups**: 7 years

### Cleanup Scripts
```bash
#!/bin/bash
# File: scripts/cleanup-old-backups.sh

set -euo pipefail

# Configuration
BACKUP_BUCKET="insurance-lead-gen-backups"

echo "Starting backup cleanup process..."

# Cleanup old RDS snapshots
echo "Cleaning up old RDS snapshots..."
aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-production-db \
  --snapshot-type automated \
  --query 'DBSnapshots[?SnapshotCreateTime<`'"$(date -d '35 days ago' -u +%Y-%m-%dT%H:%M:%SZ)"'`].DBSnapshotIdentifier' \
  --output text | xargs -r -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}

# Cleanup old Redis snapshots
echo "Cleaning up old Redis snapshots..."
aws elasticache describe-snapshots \
  --cache-cluster-id insurance-lead-gen-production-redis \
  --query 'Snapshots[?SnapshotCreateTime<`'"$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)"'`].SnapshotName' \
  --output text | xargs -r -I {} aws elasticache delete-snapshot --snapshot-name {}

# Cleanup old S3 backups
echo "Cleaning up old S3 backups..."
aws s3api list-objects-v2 \
  --bucket "$BACKUP_BUCKET" \
  --query 'Contents[?LastModified<`'"$(date -d '35 days ago' -u +%Y-%m-%dT%H:%M:%SZ)"'`].[Key]' \
  --output text | xargs -r -I {} aws s3 rm "s3://${BACKUP_BUCKET}/{}"

echo "Backup cleanup completed"
```

---

## Testing and Validation

### Monthly Backup Test Procedure
```bash
#!/bin/bash
# File: scripts/monthly-backup-test.sh

set -euo pipefail

echo "Starting monthly backup test procedure..."

# Create test database instance
TEST_INSTANCE="backup-test-$(date +%Y%m%d-%H%M%S)"
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-production-db \
  --snapshot-type automated \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBSnapshotIdentifier' \
  --output text)

echo "Restoring from snapshot: $LATEST_SNAPSHOT"

# Restore to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$TEST_INSTANCE" \
  --db-snapshot-identifier "$LATEST_SNAPSHOT" \
  --db-instance-class db.t3.micro \
  --allocated-storage 20

# Wait for completion
aws rds wait db-instance-available --db-instance-identifier "$TEST_INSTANCE"

echo "Test instance created: $TEST_INSTANCE"

# Run basic connectivity and integrity checks
# ... (add specific checks for your application)

# Cleanup test instance
echo "Cleaning up test instance..."
aws rds delete-db-instance \
  --db-instance-identifier "$TEST_INSTANCE" \
  --skip-final-snapshot

aws rds wait db-instance-deleted --db-instance-identifier "$TEST_INSTANCE"

echo "Monthly backup test completed successfully"
```

---

## Contact Information

### Emergency Contacts
- **Database Administrator**: dba@your-company.com
- **DevOps Team**: devops@your-company.com
- **On-call Engineer**: +1-xxx-xxx-xxxx

### AWS Support
- **Support Level**: Enterprise
- **Case Priority**: Critical
- **Contact Method**: AWS Console, Phone

### Escalation Path
1. **L1**: On-call engineer (0-15 minutes)
2. **L2**: Senior DBA (15-30 minutes)  
3. **L3**: Engineering manager (30-60 minutes)
4. **L4**: CTO (60+ minutes)

---

*This backup and recovery documentation should be reviewed and tested monthly. Last updated: $(date +%Y-%m-%d)*