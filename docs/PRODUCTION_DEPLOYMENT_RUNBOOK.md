# Production Deployment Runbook
## Insurance Lead Generation Platform - Phase 19.2

### Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [Application Deployment](#application-deployment)
4. [Post-Deployment Validation](#post-deployment-validation)
5. [Monitoring Setup](#monitoring-setup)
6. [Security Configuration](#security-configuration)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Emergency Procedures](#emergency-procedures)

---

## Pre-Deployment Checklist

### ✅ Infrastructure Prerequisites
- [ ] AWS account with appropriate permissions
- [ ] Terraform state backend configured (S3 bucket)
- [ ] DNS domain configured and ready
- [ ] SSL certificates obtained (Let's Encrypt or AWS ACM)
- [ ] GitHub Actions OIDC configured
- [ ] CI/CD pipeline secrets configured

### ✅ Security Prerequisites
- [ ] Production secrets rotated and stored in AWS Secrets Manager
- [ ] IAM roles and policies created
- [ ] Security groups configured
- [ ] VPC flow logs enabled
- [ ] WAF rules configured

### ✅ Monitoring Prerequisites
- [ ] Prometheus remote storage configured
- [ ] Grafana dashboards imported
- [ ] AlertManager configured with proper notifications
- [ ] PagerDuty/Slack integrations tested

### ✅ Database Prerequisites
- [ ] RDS instance created and configured
- [ ] ElastiCache Redis cluster created
- [ ] Neo4j cluster configured (if using managed service)
- [ ] Database backups automated
- [ ] Connection pooling configured

---

## Infrastructure Deployment

### Step 1: Deploy Infrastructure with Terraform

```bash
# Clone repository and checkout production branch
git clone https://github.com/your-org/insurance-lead-gen.git
cd insurance-lead-gen
git checkout main
git pull origin main

# Configure Terraform backend and variables
cp terraform/aws/environments/production/terraform.tfvars.example \
   terraform/aws/environments/production/terraform.tfvars

# Edit production variables
vim terraform/aws/environments/production/terraform.tfvars

# Initialize Terraform
cd terraform/aws
terraform init -backend-config="environments/production/backend.tfvars"

# Plan infrastructure changes
terraform plan -var-file="environments/production/terraform.tfvars"

# Apply infrastructure (WARNING: This will create resources)
terraform apply -var-file="environments/production/terraform.tfvars"
```

### Step 2: Configure Production Variables

Create `terraform/aws/environments/production/terraform.tfvars`:

```hcl
# Environment Configuration
environment = "production"
aws_region = "us-east-1"
project_name = "insurance-lead-gen"

# Network Configuration
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS Configuration
instance_types = ["m5.xlarge", "m5.2xlarge"]
node_group_min_size = 3
node_group_max_size = 20
node_group_desired_size = 5

# RDS Configuration
rds_instance_class = "db.r5.xlarge"
rds_allocated_storage = 500
rds_admin_username = "admin"

# Redis Configuration
redis_node_type = "cache.r6g.large"

# GitHub OIDC
github_organization = "your-org"
admin_iam_users = ["arn:aws:iam::123456789012:user/your-admin-user"]

# Tags
tags = {
  Project = "insurance-lead-gen"
  Environment = "production"
  ManagedBy = "terraform"
  CostCenter = "engineering"
  Owner = "devops-team"
}
```

### Step 3: Build and Push Docker Images

```bash
# Build all application images
docker build -t insurance-lead-gen-api:latest -f apps/api/Dockerfile .
docker build -t insurance-lead-gen-data-service:latest -f apps/data-service/Dockerfile .
docker build -t insurance-lead-gen-orchestrator:latest -f apps/orchestrator/Dockerfile .
docker build -t insurance-lead-gen-backend:latest -f apps/backend/Dockerfile .
docker build -t insurance-lead-gen-frontend:latest -f apps/frontend/Dockerfile .

# Tag for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker tag insurance-lead-gen-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/api:latest
docker tag insurance-lead-gen-data-service:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest
docker tag insurance-lead-gen-orchestrator:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/orchestrator:latest
docker tag insurance-lead-gen-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/backend:latest
docker tag insurance-lead-gen-frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/frontend:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/api:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/orchestrator:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/backend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/frontend:latest
```

---

## Application Deployment

### Step 1: Configure kubectl for EKS

```bash
# Update kubeconfig for EKS cluster
aws eks update-kubeconfig --region us-east-1 --name insurance-lead-gen-production

# Verify cluster access
kubectl get nodes
kubectl get pods --all-namespaces
```

### Step 2: Deploy Database Migrations

```bash
# Run Prisma migrations
kubectl run db-migration --rm -it \
  --image=123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest \
  --command -- npm run migrate:prod

# Or use a migration job
kubectl apply -f deploy/k8s/migration-job.yaml
```

### Step 3: Deploy Applications with Helm

```bash
# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.replicaCount=3 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.image.digest="" \
  --set controller.metrics.enabled=true \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb"

# Install cert-manager
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --set crds.enabled=true

# Deploy applications
helm upgrade --install insurance-lead-gen ./deploy/helm \
  --namespace default \
  --set environment=production \
  --set image.tag=latest \
  --set replicaCount.api=3 \
  --set replicaCount.dataService=3 \
  --set replicaCount.orchestrator=2 \
  --set replicaCount.backend=2 \
  --set replicaCount.frontend=2 \
  --set database.host=$(terraform output database_endpoint) \
  --set redis.host=$(terraform output redis_endpoint) \
  --set secrets.encryptionKey=your-encryption-key \
  --set monitoring.enabled=true
```

### Step 4: Deploy Monitoring Stack

```bash
# Install Prometheus
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set grafana.adminPassword=your-grafana-password \
  --set grafana.plugins[0]=grafana-clock-panel \
  --set grafana.plugins[1]=grafana-simple-json-datasource

# Import dashboards
kubectl apply -f monitoring/grafana/dashboards/
kubectl apply -f monitoring/grafana/provisioning/
```

---

## Post-Deployment Validation

### Health Checks

```bash
# Check all pods are running
kubectl get pods --all-namespaces

# Check services are accessible
kubectl get svc --all-namespaces

# Check ingress is configured
kubectl get ingress

# Check certificates are issued
kubectl get certificates --all-namespaces

# Verify database connectivity
kubectl exec -it deployment/api -- npm run db:check

# Test API endpoints
curl -f https://api.your-production-domain.com/health
curl -f https://your-production-domain.com/health

# Check monitoring endpoints
curl -f https://monitoring.your-production-domain.com/grafana/api/health
curl -f https://monitoring.your-production-domain.com/prometheus/-/healthy
```

### Load Testing

```bash
# Install k6 for load testing
docker run --rm -i loadimpact/k6 run - < load-test.js

# Basic load test script (load-test.js)
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up
    { duration: '5m', target: 100 }, // stay at 100 users
    { duration: '2m', target: 200 }, // ramp to 200 users
    { duration: '5m', target: 200 }, // stay at 200 users
    { duration: '2m', target: 0 },   // ramp down
  ],
};

export default function () {
  const responses = http.batch([
    ['GET', 'https://your-production-domain.com'],
    ['GET', 'https://api.your-production-domain.com/health'],
  ]);
  
  check(responses[0], {
    'homepage status is 200': (r) => r.status === 200,
  });
  
  check(responses[1], {
    'API health status is 200': (r) => r.status === 200,
  });
}
```

---

## Monitoring Setup

### Dashboard Access

- **Grafana**: https://monitoring.your-production-domain.com/grafana
  - User: admin
  - Password: Set in Helm values

- **Prometheus**: https://monitoring.your-production-domain.com/prometheus
- **Jaeger**: https://monitoring.your-production-domain.com/jaeger
- **AlertManager**: https://monitoring.your-production-domain.com/alertmanager

### Key Metrics to Monitor

1. **Infrastructure Metrics**:
   - CPU/Memory utilization per pod
   - Network throughput
   - Disk I/O and storage
   - Node health

2. **Application Metrics**:
   - Request rate and latency
   - Error rates
   - Database connection pool
   - Cache hit rates

3. **Business Metrics**:
   - Lead generation rate
   - AI processing queue length
   - User session duration
   - Conversion rates

### Alert Configuration

The following alerts are pre-configured:

- **Critical**: Service down, high error rate (>5%)
- **High**: High latency (>1s), database connection issues
- **Medium**: High resource utilization, rate limiting triggered
- **Low**: SSL certificate expiry, backup failures

---

## Security Configuration

### SSL/TLS Certificate Management

```bash
# Check certificate status
kubectl get certificates --all-namespaces

# Force certificate renewal
kubectl delete certificate insurance-lead-gen-tls
kubectl apply -f deploy/k8s/ingress.yaml

# Verify certificate
openssl s_client -connect your-production-domain.com:443 -servername your-production-domain.com
```

### Network Policies

```bash
# Apply network policies for pod isolation
kubectl apply -f deploy/k8s/security/network-policies.yaml
```

### Security Scanning

```bash
# Run security scan on containers
aws ecr batch-scan-image --repository-name insurance-lead-gen/api --image-ids imageTag=latest
aws ecr batch-scan-image --repository-name insurance-lead-gen/data-service --image-ids imageTag=latest

# Run infrastructure security scan
terraform plan -detailed-exitcode
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name> --previous
kubectl logs <pod-name> -c <container-name>

# Check resource limits
kubectl describe pod <pod-name> | grep -A 10 "Limits\|Requests"
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/api -- npm run db:test

# Check database metrics
kubectl port-forward service/postgres-metrics 9187:9187
curl localhost:9187/metrics | grep pg_up

# Check connection pool
kubectl exec -it deployment/data-service -- npm run db:pool:status
```

#### 3. Ingress Issues

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check ingress status
kubectl describe ingress insurance-lead-gen-ingress

# Test DNS resolution
nslookup your-production-domain.com
dig your-production-domain.com
```

#### 4. High Memory/CPU Usage

```bash
# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Scale up manually if HPA is not working
kubectl scale deployment api-service --replicas=5

# Check for memory leaks
kubectl exec -it deployment/api -- npm run memory:analyze
```

#### 5. Message Queue Issues

```bash
# Check NATS status
kubectl exec -it deployment/nats -- nats-server report

# Check message queue depth
kubectl exec -it deployment/orchestrator -- npm run queue:status

# Clear stuck messages
kubectl exec -it deployment/orchestrator -- npm run queue:clear
```

### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/api --tail=100

# Search for errors
kubectl logs deployment/api | grep -i error

# Export logs for analysis
kubectl logs deployment/api > api-logs-$(date +%Y%m%d-%H%M%S).log

# Check logs in Grafana/Loki
# Navigate to https://monitoring.your-production-domain.com/grafana
# Use Loki datasource to search: {app="api"} |= "error"
```

### Performance Issues

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.your-production-domain.com/health

# Create curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect:    %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n

# Check database performance
kubectl exec -it deployment/data-service -- npm run db:explain:analyze

# Check Redis performance
kubectl exec -it deployment/redis -- redis-cli --latency-history
```

---

## Emergency Procedures

### Service Recovery

#### 1. Restart All Services

```bash
# Rolling restart all deployments
kubectl rollout restart deployment/api-service
kubectl rollout restart deployment/data-service
kubectl rollout restart deployment/orchestrator-service
kubectl rollout restart deployment/backend-service
kubectl rollout restart deployment/frontend-service

# Monitor rollout status
kubectl rollout status deployment/api-service
kubectl rollout status deployment/data-service
```

#### 2. Scale Down to Diagnose Issues

```bash
# Scale down services to 1 replica
kubectl scale deployment api-service --replicas=1
kubectl scale deployment data-service --replicas=1

# Scale back up after resolution
kubectl scale deployment api-service --replicas=3
kubectl scale deployment data-service --replicas=3
```

#### 3. Database Failover

```bash
# If RDS Multi-AZ is configured, AWS handles failover automatically
# For manual intervention:

# Check RDS status
aws rds describe-db-instances --region us-east-1

# Promote read replica to primary
aws rds promote-read-replica --db-instance-identifier insurance-lead-gen-production-db-replica

# Update connection strings in application
kubectl create secret generic db-connection \
  --from-literal=url="postgresql://user:pass@new-host:5432/db" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart services to pick up new connection
kubectl rollout restart deployment/data-service
```

#### 4. Rollback Deployment

```bash
# Rollback Helm release
helm rollback insurance-lead-gen 1

# Or update deployment to previous image
kubectl set image deployment/api-service \
  api=123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/api:previous-tag \
  -n default

# Rollback database migration (use with caution)
kubectl run db-rollback --rm -it \
  --image=123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest \
  --command -- npm run migrate:rollback
```

### Disaster Recovery

#### 1. Complete System Restore

```bash
# Scale down all services
kubectl scale deployment --all --replicas=0

# Restore from backup (example for RDS)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier insurance-lead-gen-production-restore \
  --db-snapshot-identifier insurance-lead-gen-production-backup-$(date +%Y%m%d)

# Restore Redis from backup
# (Redis backups depend on configuration - restore from snapshot)

# Scale services back up
kubectl scale deployment api-service --replicas=3
kubectl scale deployment data-service --replicas=3
# ... continue with other services
```

#### 2. DNS Failover

```bash
# If using Route53, update DNS to point to backup environment
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover.json

# dns-failover.json:
# {
#   "Changes": [{
#     "Action": "UPSERT",
#     "ResourceRecordSet": {
#       "Name": "your-production-domain.com",
#       "Type": "CNAME",
#       "TTL": 60,
#       "ResourceRecords": [{"Value": "backup-environment.your-domain.com"}]
#     }
#   }]
# }
```

### Communication Protocol

During incidents:

1. **Immediate**: Update status page and notify team in #incidents Slack channel
2. **Within 5 minutes**: Send initial assessment to stakeholders
3. **Every 15 minutes**: Provide status updates
4. **Resolution**: Send post-incident report within 24 hours

### Contact Information

- **On-call Engineer**: +1-xxx-xxx-xxxx
- **DevOps Team**: devops@your-company.com
- **Security Team**: security@your-company.com
- **Management**: cto@your-company.com

### Escalation Path

1. **L1**: On-call engineer (0-15 minutes)
2. **L2**: Senior engineer (15-30 minutes)
3. **L3**: Engineering manager (30-60 minutes)
4. **L4**: CTO/VP Engineering (60+ minutes)

---

## Rollback Procedures

### Application Rollback

```bash
# Check deployment history
helm history insurance-lead-gen

# Rollback to previous version
helm rollback insurance-lead-gen

# Or specific revision
helm rollback insurance-lead-gen 2

# Verify rollback
kubectl get deployments
kubectl get pods
```

### Infrastructure Rollback

```bash
# Destroy infrastructure (WARNING: This deletes everything)
terraform destroy -var-file="environments/production/terraform.tfvars"

# Or rollback specific resources
terraform plan -destroy -var-file="environments/production/terraform.tfvars"
terraform destroy -target=aws_rds_instance.main -var-file="environments/production/terraform.tfvars"
```

### Database Rollback

```bash
# WARNING: Only use if absolutely necessary and ensure backups are available

# Restore from automated RDS backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier insurance-lead-gen-production-restore \
  --db-snapshot-identifier automated-backup-$(date +%Y-%m-%d)

# Apply Prisma migration rollback
kubectl run db-rollback --rm -it \
  --image=123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest \
  --command -- npm run migrate:rollback -- --to=previous-migration
```

---

## Maintenance Procedures

### Regular Maintenance Windows

- **Weekly**: System health check, security updates
- **Monthly**: Database maintenance, certificate renewal check
- **Quarterly**: Disaster recovery drill, security audit

### SSL Certificate Renewal

```bash
# Check certificate expiry
kubectl get certificates -o wide

# Certificates auto-renew with cert-manager
# Manual renewal if needed:
kubectl delete certificate insurance-lead-gen-tls
kubectl apply -f deploy/k8s/ingress.yaml

# Verify renewal
kubectl get certificates
```

### Database Maintenance

```bash
# Connect to RDS and run maintenance
kubectl run db-maintenance --rm -it \
  --image=postgres:16-alpine \
  --command -- psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Update table statistics
kubectl run db-stats --rm -it \
  --image=postgres:16-alpine \
  --command -- psql $DATABASE_URL -c "ANALYZE;"
```

### Backup Verification

```bash
# Test RDS backup restoration
aws rds describe-db-snapshots --db-instance-identifier insurance-lead-gen-production-db

# Verify Redis backup
kubectl exec -it deployment/redis -- redis-cli --rdb /data/dump.rdb BGSAVE

# Test application backup
kubectl run backup-test --rm -it \
  --image=123456789012.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/data-service:latest \
  --command -- npm run backup:test
```

---

## Security Incident Response

### Immediate Response (0-5 minutes)

1. **Isolate affected systems**
   ```bash
   # Scale down compromised service
   kubectl scale deployment api-service --replicas=0
   
   # Block malicious IPs (example)
   kubectl apply -f deploy/k8s/security/emergency-block.yaml
   ```

2. **Preserve evidence**
   ```bash
   # Capture logs
   kubectl logs deployment/api --previous > security-incident-logs.txt
   
   # Capture system state
   kubectl get all > security-incident-state.txt
   ```

### Investigation (5-30 minutes)

1. **Analyze logs for indicators of compromise**
2. **Check for unauthorized access patterns**
3. **Review authentication logs**
4. **Verify data integrity**

### Recovery (30+ minutes)

1. **Apply security patches**
2. **Rotate compromised credentials**
3. **Gradually restore services**
4. **Monitor for re-compromise**

### Post-Incident

1. **Conduct root cause analysis**
2. **Update security procedures**
3. **Implement additional monitoring**
4. **Document lessons learned**

---

## Contact Information and Escalation

### Emergency Contacts
- **Primary On-call**: +1-xxx-xxx-xxxx
- **Secondary On-call**: +1-xxx-xxx-xxxx
- **Security Team**: security@your-company.com
- **DevOps Lead**: devops-lead@your-company.com

### Stakeholder Communication
- **Status Page**: https://status.your-production-domain.com
- **Slack Channels**: 
  - #incidents (real-time updates)
  - #ops-updates (operational updates)
  - #security (security incidents)

### External Vendors
- **AWS Support**: Case #123456789
- **Monitoring Vendor**: support@monitoring-vendor.com
- **Security Vendor**: emergency@security-vendor.com

---

*This runbook should be reviewed and updated quarterly or after any major incident. Last updated: $(date +%Y-%m-%d)*