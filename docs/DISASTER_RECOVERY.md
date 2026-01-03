# Disaster Recovery Plan (DRP)

## 📋 Overview
This Disaster Recovery Plan (DRP) provides detailed procedures for recovering the Insurance Lead Gen AI Platform from major disasters, including regional cloud outages, total data loss, and security breaches.

## 🎯 Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | 1 hour | Maximum data loss tolerance |
| RTO (Recovery Time Objective) | 4 hours | Maximum downtime tolerance |

## 🌪️ Disaster Scenarios & Impact Analysis

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Single Region Outage | Complete service unavailability | Cross-region failover (US-East-1 to US-West-2) |
| Database Corruption | Data inconsistency/loss | Point-in-Time Recovery (PITR) from RDS |
| Security Breach | Data compromised, unauthorized access | Isolate environment, restore from known good backups |
| Total S3/MinIO Loss | Loss of documents/leads data | Multi-region bucket replication |
| Vector DB Failure | AI recommendations unavailable | Re-index from source data or restore from snapshots |

## 📁 Backup Strategy

### Frequency and Retention

| Component | Backup Frequency | Retention Policy | Cost Optimization |
|-----------|------------------|------------------|-------------------|
| PostgreSQL | Continuous (WAL) + Daily Snapshot | 35 Days | Use tiered storage for old snapshots |
| MinIO/S3 | Versioning + Continuous Replication | 90 Days | Lifecycle rules to Glacier after 30 days |
| Qdrant | Every 6 hours (Snapshots) | 7 Days | Delete snapshots after 7 days |
| Kubernetes | Daily (Velero or YAML exports) | 14 Days | Small footprint (YAML) |

## 🔄 System-Specific Recovery Procedures

### 1. Database (PostgreSQL)
*Refer to existing procedures in DISASTER_RECOVERY.md*

### 2. File Storage (MinIO)
MinIO is configured with bucket replication. In case of failure:
```bash
# 1. Verify replication status
mc replicate ls myminio/leads

# 2. If primary is down, point application to secondary endpoint
# Update secret: insurance-lead-gen/production/minio
{
  "endpoint": "minio-secondary.example.com",
  "accessKey": "...",
  "secretKey": "..."
}

# 3. Restart services
kubectl rollout restart deployment/api -n production
```

### 3. Vector Database (Qdrant)
Qdrant uses snapshots stored in S3/MinIO.
```bash
# 1. List available snapshots
curl http://qdrant:6333/collections/leads/snapshots

# 2. Restore from snapshot
curl -X POST http://qdrant:6333/collections/leads/snapshots/recover \
     -H 'Content-Type: application/json' \
     --data '{"location": "s3://backups/qdrant/leads-snapshot-2024-01-01.snapshot"}'

# 3. Alternative: Re-index from PostgreSQL
# Run the migration/indexing script
kubectl create job --from=cronjob/reindex-leads reindex-manual
```

### 4. Cache (Redis)
Redis is considered ephemeral. 
```bash
# 1. Flush existing corrupted cache if needed
kubectl exec -n production <redis-pod> -- redis-cli FLUSHALL

# 2. Allow applications to re-populate cache from database
# No further action required. Monitor for initial latency spike.
```

## 🚀 Failover Procedures

### Automated Failover (DNS-based)
We use Cloudflare Load Balancing for automated failover between regions.
1.  **Health Check:** Cloudflare monitors `https://api.insurance-lead-gen.com/health`.
2.  **Trigger:** If health check fails for 2 consecutive periods (60s total).
3.  **Action:** Traffic is automatically routed to the standby region.

### Manual Failover Procedure
1.  **Assess Status:** Confirm primary region is unavailable.
2.  **Verify Data Sync:** Ensure secondary databases are up-to-date.
3.  **Update DNS:** If automated failover fails, manually update CNAME records.
4.  **Promote Database:** If using RDS Multi-Region Read Replicas, promote the replica to primary.

## 🧪 Testing Schedule & Procedures

| Test Type | Frequency | Procedure |
|-----------|-----------|-----------|
| Backup Validation | Weekly | Automated script checks if backups exist and are non-empty. |
| Restoration Test | Monthly | Restore a DB snapshot to a "test-restore" instance and verify row counts. |
| Failover Drill | Bi-Annually | Simulated regional outage in staging environment. |
| Full DR Drill | Annually | Complete platform restoration in a new environment. |

## ✅ Recovery Validation Checklist

- [ ] All pods are in `Running` state.
- [ ] API Health check returns `200 OK`.
- [ ] Database connectivity verified for all services.
- [ ] MinIO objects are accessible.
- [ ] Qdrant collections are populated and searchable.
- [ ] SSL certificates are valid for the new environment.
- [ ] Security Groups and Network Policies are applied.
- [ ] Performance meets baseline targets.

## 📝 Change Log
- **2024-01-20:** Enhanced with Qdrant, MinIO, and failover automation procedures.
