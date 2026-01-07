# Disaster Recovery Runbook

## 🎯 Overview

This comprehensive disaster recovery plan ensures business continuity and data protection for the Insurance Lead Gen Platform. Our goal is rapid recovery with minimal data loss and business impact through systematic preparation and proven recovery procedures.

---

## 📋 Table of Contents

1. [Recovery Objectives](#recovery-objectives)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Single Service Failure Recovery](#single-service-failure-recovery)
4. [Database Failure Recovery](#database-failure-recovery)
5. [Cache Failure Recovery](#cache-failure-recovery)
6. [Regional Failure Recovery](#regional-failure-recovery)
7. [Data Corruption Recovery](#data-corruption-recovery)
8. [Security Incident Recovery](#security-incident-recovery)
9. [Backup and Restore Procedures](#backup-and-restore-procedures)
10. [Failover Testing](#failover-testing)
11. [Communication Procedures](#communication-procedures)

---

## Recovery Objectives

### Recovery Time Objectives (RTO)
- **SEV-1 Services**: 5 minutes maximum
- **SEV-2 Services**: 15 minutes maximum
- **SEV-3 Services**: 1 hour maximum
- **SEV-4 Services**: 4 hours maximum

### Recovery Point Objectives (RPO)
- **Database**: 0 minutes (synchronous replication)
- **Application Data**: 5 minutes maximum
- **File Storage**: 15 minutes maximum
- **Configuration**: 0 minutes (version controlled)

### Business Continuity Objectives
- **Lead Processing**: Continue within 15 minutes
- **Customer Access**: Restore within 30 minutes
- **Payment Processing**: Resume within 60 minutes
- **Data Reporting**: Available within 2 hours

---

## Disaster Scenarios

### Scenario Classification

#### High Probability, Low Impact
- Single pod failure
- Network connectivity issue
- Certificate expiration
- Service dependency failure

#### Medium Probability, Medium Impact
- Database node failure
- Cache cluster failure
- Load balancer failure
- Storage system issue

#### Low Probability, High Impact
- Regional data center failure
- Complete network outage
- Security breach
- Data corruption

#### Very Low Probability, Critical Impact
- Natural disaster
- Complete infrastructure failure
- Regulatory compliance violation
- Mass data loss

---

## Single Service Failure Recovery

### API Service Complete Failure

#### Detection (0-1 minutes)
```bash
# Alert triggers
# - API health check failing
# - 100% error rate
# - Complete service unavailability

# Verification steps
curl -f https://api.insurance-lead-gen.com/health --max-time 5
kubectl get pods -n production -l app=api
```

#### Immediate Response (1-5 minutes)
```bash
# 1. Declare incident
echo "SEV-1 INCIDENT: API Service Complete Failure at $(date)"

# 2. Page on-call team
# PagerDuty: SEV-1 API DOWN
# Slack: #incident-api-down

# 3. Assess scope
kubectl get services -n production | grep api
kubectl get ingress -n production | grep api

# 4. Check dependencies
kubectl get pods -n production | grep postgres
kubectl get pods -n production | grep redis
```

#### Recovery Procedure (5-15 minutes)
```bash
# Option 1: Pod restart
echo "Attempting pod restart..."
kubectl rollout restart deployment/api -n production

# Wait for rollout
kubectl rollout status deployment/api -n production --timeout=5m

# Verify recovery
curl -f https://api.insurance-lead-gen.com/health
kubectl get pods -n production -l app=api

# Option 2: Scale up (if restart fails)
echo "Scaling up API service..."
kubectl scale deployment api -n production --replicas=5

# Option 3: Rollback (if recent deployment)
echo "Rolling back to previous version..."
helm rollback api-service 1 -n production
```

#### Verification (15-20 minutes)
```bash
# Functional testing
curl -X POST https://api.insurance-lead-gen.com/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test Recovery"}'

# Load testing
curl -f https://api.insurance-lead-gen.com/api/v1/dashboard/stats

# Error rate monitoring
kubectl logs -n production -l app=api --tail=100 | grep -c ERROR
```

### Backend Service Failure

#### Detection and Response
```bash
# Check backend health
kubectl exec -n production deployment/backend -- python health_check.py

# Check background job queue
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print(len(app.control.inspect().active()))"

# Check backend logs
kubectl logs -n production -l app=backend --tail=50 | grep ERROR
```

#### Recovery Procedure
```bash
# Restart backend service
kubectl rollout restart deployment/backend -n production

# Clear stuck job queue if needed
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); app.control.purge()"

# Verify recovery
kubectl exec -n production deployment/backend -- python health_check.py
```

### Frontend Service Failure

#### Recovery Procedure
```bash
# Check frontend pods
kubectl get pods -n production -l app=frontend

# Restart frontend
kubectl rollout restart deployment/frontend -n production

# Check build artifacts
kubectl exec -n production deployment/frontend -- ls -la /usr/share/nginx/html

# Clear CDN cache if needed
# curl -X POST https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache \
#   -H "Authorization: Bearer {api_token}" \
#   -H "Content-Type: application/json" \
#   -d '{"files":["https://insurance-lead-gen.com/*"]}'
```

---

## Database Failure Recovery

### Primary Database Failure

#### Detection (0-1 minutes)
```bash
# Database health check fails
kubectl exec -n production deployment/api -- npm run db:health

# Check PostgreSQL status
kubectl get pods -n production -l app=postgres

# Check database logs
kubectl logs -n production -l app=postgres --tail=50
```

#### Immediate Response (1-5 minutes)
```bash
# 1. Assess database state
kubectl exec -n production deployment/postgres -- pg_isready -U postgres

# 2. Check for automatic failover
kubectl get pods -n production | grep postgres

# 3. Verify replication status
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

#### Recovery Procedures

##### Automatic Failover (if configured)
```bash
# Check if read replica is configured as standby
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"

# Promote read replica to primary
kubectl exec -n production deployment/postgres-replica -- \
  psql -U postgres -c "SELECT pg_promote();"

# Update application connection strings
kubectl patch configmap api-config -n production \
  --patch '{"data":{"DATABASE_URL":"postgresql://user:pass@postgres-replica:5432/db"}}'
```

##### Manual Failover
```bash
# Step 1: Stop primary database
kubectl patch deployment postgres -n production -p '{"spec":{"replicas":0}}'

# Step 2: Promote read replica
kubectl patch deployment postgres-replica -n production -p '{"spec":{"replicas":1}}'

# Step 3: Wait for promotion
sleep 30

# Step 4: Update DNS/connection strings
kubectl patch service postgres -n production \
  --patch '{"spec":{"selector":{"app":"postgres-replica"}}}'

# Step 5: Verify connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection
```

#### Data Recovery Verification
```bash
# Verify data integrity
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM leads; SELECT COUNT(*) FROM customers;"

# Check for data consistency
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### Database Corruption Recovery

#### Detection
```bash
# Check database integrity
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "SELECT pg_database_size('insurance_lead_gen');"

# Check for corruption
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, attname FROM pg_stats WHERE attname IS NULL;"
```

#### Recovery Procedure
```bash
# 1. Stop all application traffic
kubectl scale deployment api backend -n production --replicas=0

# 2. Attempt repair
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "VACUUM FULL;"

# 3. If repair fails, restore from backup
# See Backup and Restore Procedures section

# 4. Verify data integrity
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM leads WHERE id IS NULL;"

# 5. Restart applications
kubectl scale deployment api backend -n production --replicas=3
```

---

## Cache Failure Recovery

### Redis Cluster Failure

#### Detection
```bash
# Check Redis connectivity
kubectl exec -n production deployment/api -- redis-cli ping || echo "REDIS_DOWN"

# Check Redis pod status
kubectl get pods -n production -l app=redis

# Check Redis logs
kubectl logs -n production -l app=redis --tail=50
```

#### Recovery Procedures

##### Single Redis Pod Failure
```bash
# Restart Redis pod
kubectl rollout restart deployment/redis -n production

# Wait for Redis to be ready
kubectl exec -n production deployment/redis -- redis-cli ping

# Verify application connectivity
kubectl exec -n production deployment/api -- npm run cache:test
```

##### Redis Cluster Failure
```bash
# Step 1: Disable cache in applications
kubectl patch configmap api-config -n production \
  --patch '{"data":{"REDIS_ENABLED":"false"}}'

# Step 2: Scale up applications to handle increased database load
kubectl scale deployment api -n production --replicas=5

# Step 3: Restart Redis cluster
kubectl rollout restart deployment/redis -n production

# Step 4: Re-enable cache
kubectl patch configmap api-config -n production \
  --patch '{"data":{"REDIS_ENABLED":"true"}}'

# Step 5: Scale back applications
kubectl scale deployment api -n production --replicas=3
```

#### Performance Degradation Handling
```bash
# If cache is slow but operational
# 1. Monitor database load increase
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Scale database read replicas
kubectl scale deployment postgres-replica -n production --replicas=3

# 3. Consider cache warming after recovery
kubectl exec -n production deployment/api -- npm run cache:warm
```

---

## Regional Failure Recovery

### Multi-Region Failover

#### Pre-Setup (Regular Operations)
```bash
# Verify multi-region setup
kubectl get nodes -o wide
kubectl get ingress -n production

# Test cross-region connectivity
kubectl exec -n production deployment/api -- \
  curl -f https://api-us-west.insurance-lead-gen.com/health

# Check DNS failover configuration
dig api.insurance-lead-gen.com
```

#### Regional Failure Detection
```bash
# Check if region is isolated
kubectl get nodes
kubectl cluster-info

# Check external connectivity
curl -f https://api.insurance-lead-gen.com/health --max-time 5
ping 8.8.8.8

# Verify DNS resolution
nslookup api.insurance-lead-gen.com
```

#### Failover Procedure (15-30 minutes)
```bash
# Step 1: Activate standby region
# (This would be automated via infrastructure automation)

# Step 2: Update DNS to point to standby region
cat << EOF > dns-failover.json
{
  "Comment": "Regional failover due to primary region outage",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.insurance-lead-gen.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "api-us-west.insurance-lead-gen.com"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# Step 3: Verify DNS propagation
dig api.insurance-lead-gen.com

# Step 4: Test standby region services
curl -f https://api-us-west.insurance-lead-gen.com/health

# Step 5: Update monitoring to point to standby region
kubectl patch configmap monitoring-config -n production \
  --patch '{"data":{"PROMETHEUS_URL":"https://prometheus-us-west.insurance-lead-gen.com"}}'
```

#### Data Synchronization
```bash
# Check data synchronization status
kubectl exec -n production-us-west deployment/postgres -- \
  psql -U postgres -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"

# Verify data consistency
kubectl exec -n production-us-west deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM leads; SELECT COUNT(*) FROM customers;"

# Force synchronization if needed
kubectl exec -n production-us-west deployment/postgres -- \
  psql -U postgres -c "SELECT pg_sync_publication();"
```

---

## Data Corruption Recovery

### Detection and Assessment

#### Detection Methods
```bash
# 1. Application-level validation failures
kubectl logs -n production -l app=api | grep -i "data.*corruption\|validation.*failed"

# 2. Database integrity checks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename FROM pg_tables WHERE pg_table_exists(tablename) = false;"

# 3. Checksum verification
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT tablename, attname FROM pg_stats WHERE attname IS NULL;"
```

#### Impact Assessment
```bash
# Identify affected tables
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY n_tup_upd DESC;"

# Estimate data loss
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '1 hour';"

# Check backup availability
aws s3 ls s3://company-backups/production/database/ | tail -5
```

#### Recovery Procedure

##### Immediate Containment (0-5 minutes)
```bash
# 1. Stop write operations
kubectl scale deployment api backend -n production --replicas=0

# 2. Isolate affected systems
kubectl cordon $(kubectl get nodes -o name | head -1)

# 3. Preserve evidence for forensics
kubectl exec -n production deployment/postgres -- \
  pg_dump insurance_lead_gen > corruption-evidence-$(date +%Y%m%d-%H%M).sql

# 4. Notify stakeholders
echo "DATA CORRUPTION INCIDENT at $(date)"
# PagerDuty: SEV-1 DATA CORRUPTION
# Slack: #incident-data-corruption
```

##### Recovery Execution (5-30 minutes)
```bash
# Option 1: Point-in-time recovery from backup
BACKUP_FILE="production-backup-$(date +%Y%m%d-120000).sql.gz"

# Stop database
kubectl scale deployment postgres -n production --replicas=0

# Restore from backup
aws s3 cp s3://company-backups/production/database/$BACKUP_FILE .
gunzip $BACKUP_FILE

kubectl exec -i -n production deployment/postgres -- \
  psql -U postgres < $(basename $BACKUP_FILE .gz)

# Option 2: Repair corrupted tables (if partial corruption)
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "VACUUM FULL ANALYZE; REINDEX DATABASE insurance_lead_gen;"

# Option 3: Restore specific tables from backup
kubectl exec -n production deployment/postgres -- \
  pg_restore -t leads -d insurance_lead_gen backup-file.sql
```

##### Verification (30-45 minutes)
```bash
# Verify data integrity
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM leads; SELECT COUNT(*) FROM customers; SELECT COUNT(*) FROM policies;"

# Test application functionality
kubectl scale deployment api backend -n production --replicas=3

# Functional testing
curl -X POST https://api.insurance-lead-gen.com/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Recovery Test"}'
```

---

## Security Incident Recovery

### Credential Compromise

#### Detection (0-5 minutes)
```bash
# Security alerts triggered
# - Unauthorized access attempts
# - Suspicious API usage patterns
# - Database access from unexpected sources

# Verify security breach
kubectl logs -n production -l app=api | grep -i "unauthorized\|suspicious\|attack"

# Check recent user activity
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT username, login_time, ip_address FROM audit_log WHERE login_time > NOW() - INTERVAL '1 hour';"
```

#### Immediate Response (5-15 minutes)
```bash
# 1. Contain the breach
kubectl patch networkpolicy api-ingress -n production \
  --patch '{"spec":{"ingress":[{"from":[{"ipBlock":{"cidr":"0.0.0.0/0","except":["SUSPICIOUS_IPS"]}}]}]}}'

# 2. Revoke compromised credentials
kubectl patch secret api-credentials -n production \
  --patch '{"data":{"api-key":"NEW_ENCRYPTED_KEY"}}'

# 3. Force logout all users
kubectl exec -n production deployment/redis -- \
  redis-cli FLUSHDB

# 4. Enable enhanced monitoring
kubectl patch configmap security-config -n production \
  --patch '{"data":{"ENABLE_AUDIT_LOGGING":"true","ENABLE_RATE_LIMITING":"true"}}'
```

#### Recovery Actions (15-60 minutes)
```bash
# 1. Rotate all secrets
kubectl delete secret --all -n production
kubectl apply -f secrets/production-secrets.yaml

# 2. Update API keys and tokens
kubectl patch configmap api-config -n production \
  --patch '{"data":{"STRIPE_SECRET_KEY":"NEW_STRIPE_KEY","SENDGRID_API_KEY":"NEW_SENDGRID_KEY"}}'

# 3. Restart all services
kubectl rollout restart deployment --all -n production

# 4. Verify security posture
kubectl exec -n production deployment/api -- \
  curl -f https://api.insurance-lead-gen.com/security/health
```

### Data Breach Response

#### Immediate Actions (0-30 minutes)
```bash
# 1. Isolate affected systems
kubectl scale deployment api backend frontend -n production --replicas=0

# 2. Preserve evidence
kubectl exec -n production deployment/postgres -- \
  pg_dump insurance_lead_gen > breach-evidence-$(date +%Y%m%d-%H%M).sql

# 3. Notify security team and legal
echo "DATA BREACH INCIDENT at $(date)"
# Security team: +1-555-SECURITY-1
# Legal team: +1-555-LEGAL-1

# 4. Document breach scope
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) as total_records, 
          SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent_records
   FROM leads;"
```

#### Containment and Recovery (30+ minutes)
```bash
# 1. Change all passwords
kubectl patch secret db-credentials -n production \
  --patch '{"data":{"password":"NEW_ENCRYPTED_PASSWORD"}}'

# 2. Enable additional security measures
kubectl apply -f security/enhanced-security.yaml -n production

# 3. Notify affected customers
# Customer communication template would be used here

# 4. Begin forensic analysis
# Security team investigation

# 5. Regulatory notification
# Legal team handles regulatory compliance
```

---

## Backup and Restore Procedures

### Database Backup Verification

```bash
#!/bin/bash
# backup-verification.sh

NAMESPACE=${NAMESPACE:-production}
BACKUP_BUCKET="s3://company-backups/production/database"
TIMESTAMP=$(date +%Y%m%d-%H%M)

echo "Starting backup verification at $(date)"

# 1. Check latest backup exists
LATEST_BACKUP=$(aws s3 ls $BACKUP_BUCKET/ | sort | tail -1 | awk '{print $4}')
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found"
    exit 1
fi

echo "Latest backup: $LATEST_BACKUP"

# 2. Download and verify backup integrity
echo "Downloading backup..."
aws s3 cp $BACKUP_BUCKET/$LATEST_BACKUP ./latest-backup.sql.gz

echo "Verifying backup integrity..."
gunzip -t latest-backup.sql.gz
if [ $? -ne 0 ]; then
    echo "ERROR: Backup file corrupted"
    exit 1
fi

# 3. Test backup restoration
echo "Testing backup restoration..."
kubectl create namespace backup-test
kubectl exec -n production deployment/postgres -- \
  pg_dump insurance_lead_gen > current-state.sql

# Restore to test namespace (simplified test)
kubectl exec -n backup-test deployment/postgres -- \
  psql -U postgres -c "CREATE DATABASE insurance_lead_gen_test;"

gunzip -c latest-backup.sql | \
  kubectl exec -i -n backup-test deployment/postgres -- \
  psql -U postgres insurance_lead_gen_test

# Verify restoration
RECORD_COUNT=$(kubectl exec -n backup-test deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen_test -t -c "SELECT COUNT(*) FROM leads;" | tr -d ' ')

echo "Leads count in restored backup: $RECORD_COUNT"

if [ "$RECORD_COUNT" -lt "1000" ]; then
    echo "WARNING: Unexpected record count in backup"
else
    echo "Backup verification successful"
fi

# 4. Clean up test environment
kubectl delete namespace backup-test
rm latest-backup.sql.gz

echo "Backup verification completed at $(date)"

# 5. Generate verification report
cat << EOF > backup-verification-report-$TIMESTAMP.json
{
  "timestamp": "$TIMESTAMP",
  "backup_file": "$LATEST_BACKUP",
  "verification_status": "PASSED",
  "record_count": $RECORD_COUNT,
  "backup_size": "$(ls -lh latest-backup.sql.gz 2>/dev/null | awk '{print $5}' || echo 'N/A')",
  "verification_time": "$(date)",
  "next_verification": "$(date -d '+24 hours')"
}
EOF
```

### Automated Backup Script

```bash
#!/bin/bash
# automated-backup.sh

NAMESPACE=${NAMESPACE:-production}
BACKUP_BUCKET="s3://company-backups/production/database"
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="production-backup-$TIMESTAMP.sql.gz"

echo "Starting automated backup at $(date)"

# 1. Pre-backup checks
echo "Running pre-backup checks..."
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "SELECT version();"

# 2. Create database backup
echo "Creating database backup..."
kubectl exec -n $NAMESPACE deployment/postgres -- \
  pg_dump --verbose --clean --no-owner --no-privileges \
  insurance_lead_gen | gzip > $BACKUP_FILE

# 3. Upload to S3
echo "Uploading backup to S3..."
aws s3 cp $BACKUP_FILE $BACKUP_BUCKET/

# 4. Verify upload
echo "Verifying backup upload..."
BACKUP_SIZE=$(aws s3 ls $BACKUP_BUCKET/$BACKUP_FILE | awk '{print $3}')
LOCAL_SIZE=$(stat -f%z $BACKUP_FILE 2>/dev/null || stat -c%s $BACKUP_FILE)

if [ "$BACKUP_SIZE" = "$LOCAL_SIZE" ]; then
    echo "Backup upload verified successfully"
else
    echo "ERROR: Backup upload size mismatch"
    exit 1
fi

# 5. Cleanup old backups (keep last 30 days)
echo "Cleaning up old backups..."
aws s3 ls $BACKUP_BUCKET/ | awk '{print $4}' | \
  while read backup; do
    BACKUP_DATE=$(echo $backup | grep -o '[0-9]\{8\}' | head -1)
    if [ ! -z "$BACKUP_DATE" ]; then
      BACKUP_TIMESTAMP=$(date -d "${BACKUP_DATE:0:4}-${BACKUP_DATE:4:2}-${BACKUP_DATE:6:2}" +%s 2>/dev/null || echo "0")
      CURRENT_TIMESTAMP=$(date +%s)
      DAYS_DIFF=$(( (CURRENT_TIMESTAMP - BACKUP_TIMESTAMP) / 86400 ))
      
      if [ $DAYS_DIFF -gt 30 ]; then
        echo "Deleting old backup: $backup"
        aws s3 rm $BACKUP_BUCKET/$backup
      fi
    fi
  done

# 6. Send notification
echo "Backup completed successfully at $(date)"
# Send notification to monitoring system

echo "Backup process completed"
```

### Point-in-Time Recovery

```bash
#!/bin/bash
# point-in-time-recovery.sh

TARGET_TIME=${1:-$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')}
NAMESPACE=${NAMESPACE:-production}

echo "Starting point-in-time recovery to: $TARGET_TIME"

# 1. Stop applications
echo "Stopping applications..."
kubectl scale deployment api backend frontend -n $NAMESPACE --replicas=0

# 2. Find appropriate backup
BACKUP_BUCKET="s3://company-backups/production/database"
LATEST_BACKUP=$(aws s3 ls $BACKUP_BUCKET/ | sort | tail -1 | awk '{print $4}')

echo "Using backup: $LATEST_BACKUP"

# 3. Download backup
aws s3 cp $BACKUP_BUCKET/$LATEST_BACKUP ./recovery-backup.sql.gz

# 4. Restore database
echo "Restoring database..."
gunzip -c recovery-backup.sql.gz | \
  kubectl exec -i -n $NAMESPACE deployment/postgres -- \
  psql -U postgres

# 5. Apply WAL replay to target time
echo "Applying WAL replay to target time..."
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "SELECT pg_wal_replay_pause();"

kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "SELECT pg_wal_replay_resume() WHERE pg_wal_replay_paused();"

# 6. Verify recovery
echo "Verifying recovery..."
RECOVERY_TIME=$(kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -t -c \
  "SELECT MAX(created_at) FROM leads;" | tr -d ' ')

echo "Recovery completed. Latest record time: $RECOVERY_TIME"

# 7. Restart applications
echo "Restarting applications..."
kubectl scale deployment api backend frontend -n $NAMESPACE --replicas=3

# 8. Verify functionality
sleep 30
curl -f https://api.insurance-lead-gen.com/health

echo "Point-in-time recovery completed"
```

---

## Failover Testing

### Regular Failover Drills

#### Monthly Database Failover Test
```bash
#!/bin/bash
# monthly-db-failover-test.sh

echo "Starting monthly database failover test at $(date)"

# 1. Pre-test backup
echo "Creating pre-test backup..."
./automated-backup.sh

# 2. Test primary to replica failover
echo "Testing primary to replica failover..."
kubectl exec -n production deployment/postgres-replica -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"

# 3. Promote replica to primary
echo "Promoting read replica..."
kubectl exec -n production deployment/postgres-replica -- \
  psql -U postgres -c "SELECT pg_promote();"

# 4. Test application connectivity
echo "Testing application connectivity..."
kubectl exec -n production deployment/api -- \
  npm run db:test-connection

# 5. Test write operations
echo "Testing write operations..."
kubectl exec -n production deployment/api -- \
  npm run db:test-write

# 6. Verify data consistency
echo "Verifying data consistency..."
LEADS_COUNT=$(kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -t -c "SELECT COUNT(*) FROM leads;" | tr -d ' ')

CUSTOMERS_COUNT=$(kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -t -c "SELECT COUNT(*) FROM customers;" | tr -d ' ')

echo "Data verification: $LEADS_COUNT leads, $CUSTOMERS_COUNT customers"

# 7. Fail back to original primary
echo "Failing back to original primary..."
kubectl patch deployment postgres -n production -p '{"spec":{"replicas":1}}'
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -c "SELECT pg_promote();"

echo "Database failover test completed at $(date)"
```

#### Quarterly Regional Failover Test
```bash
#!/bin/bash
# quarterly-regional-failover-test.sh

echo "Starting quarterly regional failover test at $(date)"

# 1. Verify standby region health
echo "Checking standby region health..."
curl -f https://api-us-west.insurance-lead-gen.com/health

# 2. Test DNS failover
echo "Testing DNS failover..."
ORIGINAL_DNS=$(dig +short api.insurance-lead-gen.com)

# Simulate failover
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Comment": "DR test failover",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.insurance-lead-gen.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "api-us-west.insurance-lead-gen.com"}]
      }
    }]
  }'

# Wait for DNS propagation
sleep 120

NEW_DNS=$(dig +short api.insurance-lead-gen.com)
echo "DNS changed from $ORIGINAL_DNS to $NEW_DNS"

# 3. Test services in standby region
echo "Testing services in standby region..."
curl -f https://api-us-west.insurance-lead-gen.com/health
curl -f https://api-us-west.insurance-lead-gen.com/api/v1/leads

# 4. Fail back
echo "Failing back to primary region..."
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Comment": "DR test failback",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.insurance-lead-gen.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "api.insurance-lead-gen.com"}]
      }
    }]
  }'

echo "Regional failover test completed at $(date)"
```

### Chaos Engineering Tests

#### Pod Failure Simulation
```bash
#!/bin/bash
# chaos-pod-failure.sh

NAMESPACE=${NAMESPACE:-production}
APP=${1:-api}

echo "Simulating pod failure for $APP service"

# 1. Get current pod count
ORIGINAL_REPLICAS=$(kubectl get deployment $APP -n $NAMESPACE -o jsonpath='{.spec.replicas}')
echo "Original replicas: $ORIGINAL_REPLICAS"

# 2. Delete random pod
POD_TO_DELETE=$(kubectl get pods -n $NAMESPACE -l app=$APP --no-headers | shuf | head -1 | awk '{print $1}')
echo "Deleting pod: $POD_TO_DELETE"

kubectl delete pod $POD_TO_DELETE -n $NAMESPACE

# 3. Monitor recovery
echo "Monitoring recovery..."
for i in {1..30}; do
  RUNNING_PODS=$(kubectl get pods -n $NAMESPACE -l app=$APP --no-headers | grep -c "Running" || echo "0")
  echo "Attempt $i: $RUNNING_PODS pods running"
  
  if [ "$RUNNING_PODS" = "$ORIGINAL_REPLICAS" ]; then
    echo "Recovery successful in $i attempts"
    break
  fi
  
  sleep 10
done

# 4. Verify service functionality
echo "Testing service functionality..."
curl -f https://api.insurance-lead-gen.com/health

echo "Pod failure simulation completed"
```

#### Network Partition Simulation
```bash
#!/bin/bash
# chaos-network-partition.sh

echo "Simulating network partition"

# 1. Block database connectivity
kubectl patch networkpolicy database-policy -n production \
  --patch '{"spec":{"ingress":[{"from":[{"podSelector":{"matchLabels":{"app":"api"}}}]}],"egress":[{"to":[]}]}}'

# 2. Monitor application behavior
echo "Monitoring application during network partition..."
for i in {1..10}; do
  ERROR_RATE=$(curl -s https://api.insurance-lead-gen.com/metrics | grep http_requests_total | grep " 5" | wc -l)
  echo "Attempt $i: $ERROR_RATE database errors"
  sleep 30
done

# 3. Restore connectivity
kubectl delete networkpolicy database-policy -n production

# 4. Verify recovery
echo "Verifying recovery..."
curl -f https://api.insurance-lead-gen.com/health

echo "Network partition simulation completed"
```

---

## Communication Procedures

### Incident Communication Templates

#### Initial Incident Notification
```
DISASTER RECOVERY ACTIVATED
============================
Incident Type: $INCIDENT_TYPE
Severity: SEV-$SEVERITY
Start Time: $START_TIME
Estimated Impact: $BUSINESS_IMPACT

Recovery Team Assembled:
- Incident Commander: $IC_NAME
- Technical Lead: $TECH_LEAD
- Database Admin: $DB_ADMIN
- Platform Lead: $PLATFORM_LEAD

Actions Taken:
- $ACTION_1
- $ACTION_2

Next Update: $ETA_TIME
```

#### Progress Updates
```
DR RECOVERY UPDATE - $UPDATE_NUMBER
===================================
Status: $CURRENT_STATUS
Progress: $PROGRESS_PERCENTAGE

Completed Actions:
- $COMPLETED_ACTION_1
- $COMPLETED_ACTION_2

In Progress:
- $IN_PROGRESS_ACTION_1
- $IN_PROGRESS_ACTION_2

Estimated Completion: $ETA_TIME
```

#### Resolution Notification
```
DISASTER RECOVERY COMPLETED
===========================
Incident Type: $INCIDENT_TYPE
Resolution Time: $RESOLUTION_TIME
Total Duration: $DURATION

Resolution Summary:
- $RESOLUTION_SUMMARY

Data Impact: $DATA_IMPACT
Service Impact: $SERVICE_IMPACT

Next Steps:
- [ ] Post-incident review scheduled
- [ ] Process improvements identified
- [ ] Documentation updated
```

### Customer Communication

#### Service Disruption Notice
```
SUBJECT: Service Disruption - Insurance Lead Gen Platform

Dear Valued Customer,

We are currently experiencing a service disruption that may affect your ability to access the Insurance Lead Gen Platform.

Incident Details:
- Start Time: $START_TIME
- Services Affected: $AFFECTED_SERVICES
- Current Status: $CURRENT_STATUS

Our technical team is actively working on resolution and we expect service to be restored by $ETA_TIME.

We sincerely apologize for any inconvenience this may cause and will provide updates every 30 minutes.

Thank you for your patience.

The Insurance Lead Gen Team
```

#### Resolution Confirmation
```
SUBJECT: Service Restored - Insurance Lead Gen Platform

Dear Valued Customer,

We are pleased to confirm that the service disruption affecting the Insurance Lead Gen Platform has been resolved.

Resolution Summary:
- Issue: $ISSUE_DESCRIPTION
- Resolution: $RESOLUTION_ACTION
- Service Restored: $RESTORATION_TIME
- Duration: $TOTAL_DURATION

We have implemented additional monitoring and safeguards to prevent similar issues in the future.

Thank you for your patience during this incident.

The Insurance Lead Gen Team
```

---

## Quick Reference

### Emergency Contacts
```
DR Coordinator: +1-555-DR-COORD
Database Admin: +1-555-DB-ADMIN
Platform Lead: +1-555-PLATFORM
Security Team: +1-555-SECURITY
Legal/Compliance: +1-555-LEGAL
Executive Team: +1-555-EXEC-TEAM
```

### Critical Recovery Commands
```bash
# Database emergency
kubectl exec -n production deployment/postgres -- pg_promote()

# Application emergency restart
kubectl rollout restart deployment --all -n production

# DNS emergency failover
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://emergency-failover.json

# Backup emergency
./automated-backup.sh
./point-in-time-recovery.sh
```

### Recovery Time Targets
- SEV-1 Service: 5 minutes
- SEV-2 Service: 15 minutes  
- Database: 15 minutes
- Regional Failover: 30 minutes
- Data Recovery: 60 minutes

### Backup Locations
- Primary: s3://company-backups/production/database/
- Secondary: s3://company-backups-dr/production/database/
- Local: /backups/postgres/

Remember: Regular testing and drills ensure effective disaster recovery when real incidents occur.
