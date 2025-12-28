# Disaster Recovery Procedures

## 📋 Overview

This document outlines the disaster recovery (DR) procedures for the Insurance Lead Gen AI Platform. The goal is to minimize data loss and restore service as quickly as possible in the event of a major incident.

## 🎯 Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | 1 hour | Maximum data loss tolerance |
| RTO (Recovery Time Objective) | 4 hours | Maximum downtime tolerance |
| MTTR (Mean Time to Recovery) | 2 hours | Expected recovery time |

## 📁 Backup Strategy

### Database Backups

```bash
# Automated daily backup (configured in RDS)
aws rds describe-db-snapshots \
  --db-instance-identifier insurance-lead-gen-production \
  --query 'DBSnapshots[*]'

# Manual backup creation
aws rds create-db-snapshot \
  --db-instance-identifier insurance-lead-gen-production \
  --db-snapshot-identifier insurance-lead-gen-backup-$(date +%Y%m%d)

# Cross-region backup (recommended for production)
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789:snapshot:backup-123 \
  --target-db-snapshot-identifier insurance-lead-gen-backup-us-west-2 \
  --destination-region us-west-2
```

### S3 Backup for Application Data

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket insurance-lead-gen-backups \
  --versioning-configuration Status=Enabled

# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket insurance-lead-gen-backups \
  --replication-configuration file://replication-config.json
```

### Kubernetes Resources

```bash
# Backup all Kubernetes resources
kubectl get all,configmap,secret,ingress,pdb,sa -n production -o yaml > cluster-backup.yaml

# Backup Helm releases
helm list -n production -o json > helm-releases.json
```

## 🔄 Recovery Procedures

### 1. Complete Cluster Failure

#### Step 1: Assess Damage
```bash
# Check cluster status
aws eks describe-cluster \
  --name insurance-lead-gen-production

# Check node status
kubectl get nodes

# Review recent events
aws eks describe-cluster \
  --name insurance-lead-gen-production \
  --query 'cluster.resourcesVpcConfig'
```

#### Step 2: Restore from Terraform
```bash
# Navigate to Terraform directory
cd deploy/terraform/aws

# Plan restoration
terraform plan -var-file=environments/production.tfvars

# Apply (this will recreate infrastructure)
terraform apply -var-file=environments/production.tfvars
```

#### Step 3: Restore Kubernetes Resources
```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name insurance-lead-gen-production \
  --region us-east-1

# Apply network policies
kubectl apply -f deploy/k8s/security/network-policy.yaml

# Deploy Helm charts
helm upgrade --install api deploy/helm/api \
  -f deploy/helm/api/values.production.yaml \
  -n production --wait

# Repeat for other services...
```

#### Step 4: Restore Database
```bash
# Restore from latest snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier insurance-lead-gen-restored \
  --db-snapshot-identifier insurance-lead-gen-backup-$(date +%Y%m%d) \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name insurance-lead-gen-subnet-group

# Update application connection string
aws secretsmanager update-secret \
  --secret-id insurance-lead-gen/production/database \
  --secret-string "{\"host\":\"insurance-lead-gen-restored.xxxxx.rds.amazonaws.com\",\"port\":5432}"

# Restart applications
kubectl rollout restart deployment/api -n production
```

### 2. Database Corruption

#### Step 1: Stop Application Traffic
```bash
# Scale down API
kubectl scale deployment/api -n production --replicas=0

# Wait for connections to drain
kubectl exec -n production <postgres-pod> -- psql -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Step 2: Restore from Snapshot
```bash
# Create new instance from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier insurance-lead-gen-db-restore \
  --db-snapshot-identifier insurance-lead-gen-backup-latest

# Wait for restore to complete
aws rds wait db-instance-available \
  --db-instance-identifier insurance-lead-gen-db-restore

# Update DNS/endpoint in secrets
aws secretsmanager update-secret \
  --secret-id insurance-lead-gen/production/database \
  --secret-string "{\"host\":\"insurance-lead-gen-db-restore.xxxxx.rds.amazonaws.com\"}"

# Restart applications
kubectl scale deployment/api -n production --replicas=3
```

### 3. Data Deletion/Accident

#### Step 1: Identify Affected Data
```bash
# Check table status
kubectl exec -n production <postgres-pod> -- psql -c "\dt"

# Estimate data loss
# Compare with backup
```

#### Step 2: Point-in-Time Recovery
```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier insurance-lead-gen-production \
  --target-db-instance-identifier insurance-lead-gen-pitr \
  --restore-time 2024-01-15T10:00:00Z

# Copy specific tables
pg_dump -h insurance-lead-gen-pitr.xxxxx.rds.amazonaws.com -U postgres insurance_lead_gen \
  -t deleted_table | psql -h insurance-lead-gen-production.xxxxx.rds.amazonaws.com -U postgres insurance_lead_gen
```

### 4. Application Deployment Issue

#### Step 1: Quick Rollback
```bash
# List previous releases
helm history api -n production

# Rollback to last known good version
helm rollback api 1 -n production

# Verify rollback
kubectl rollout status deployment/api -n production
```

#### Step 2: Full Re-deployment if Needed
```bash
# Uninstall and reinstall
helm uninstall api -n production
helm install api deploy/helm/api \
  -f deploy/helm/api/values.production.yaml \
  -n production --wait
```

## 🧪 DR Testing

### Monthly DR Test Schedule

```bash
#!/bin/bash
# dr-test-monthly.sh

set -e

echo "=== DR Test Started: $(date) ==="

# 1. Backup current state
echo "1. Creating backup of current state..."
kubectl get all,configmap,secret -n production -o yaml > /tmp/pre-test-backup.yaml

# 2. Document test parameters
TEST_ID="DR-TEST-$(date +%Y%m%d-%H%M%S)"
START_TIME=$(date +%s)

# 3. Simulate recovery (dry-run)
echo "2. Simulating recovery procedure..."
# terraform plan -var-file=environments/production.tfvars > /tmp/terraform-plan.txt

# 4. Measure time to complete steps
# Record timestamps for each step

# 5. Validate restored services
echo "3. Validating service functionality..."
curl -f https://api.insurance-lead-gen.com/health || exit 1

# 6. Generate report
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

cat > /tmp/dr-test-report.json << EOF
{
  "test_id": "$TEST_ID",
  "start_time": "$START_TIME",
  "end_time": "$END_TIME",
  "duration_seconds": $DURATION,
  "status": "PASSED",
  "steps_completed": [
    "backup_verification",
    "recovery_simulation",
    "service_validation"
  ]
}
EOF

echo "=== DR Test Completed: $DURATION seconds ==="
```

### DR Test Checklist

- [ ] Verify backup integrity
- [ ] Test restoration procedures
- [ ] Validate recovery time
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Notify stakeholders of test results

## 📊 Recovery Scenarios Summary

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|----------|
| Complete cluster failure | 4 hours | 1 hour | Terraform + Helm restore |
| Database corruption | 2 hours | 1 hour | Snapshot restore + PITR |
| Data deletion | 1 hour | 1 hour | PITR + table copy |
| Application deployment issue | 30 minutes | N/A | Helm rollback |
| Region outage | 8 hours | 4 hours | Cross-region failover |

## 🔐 Security Considerations

- All restores must maintain encryption at rest
- Verify IAM roles and policies after restore
- Ensure secrets are rotated after DR
- Validate network policies are applied
- Check SSL/TLS certificates are valid

## 📞 Emergency Contacts

| Role | Contact | Escalation |
|------|---------|-----------|
| Platform Lead | #platform-lead | CTO |
| SRE Lead | #sre-lead | VP Engineering |
| Database Admin | #db-team | SRE Lead |

## 📝 Post-Incident Review

After any DR event, complete a review:

1. What happened?
2. How was it detected?
3. How was it resolved?
4. What could have been faster?
5. What prevention measures needed?
6. Update documentation
