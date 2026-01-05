# Staging Environment Deployment Runbook

## 🎯 Overview

This runbook provides comprehensive procedures for deploying the Insurance Lead Gen Platform to staging environments. Staging serves as a production-like environment for final validation before production releases.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Staging Deployment Procedure](#staging-deployment-procedure)
4. [Production-Like Configuration](#production-like-configuration)
5. [Data Synchronization](#data-synchronization)
6. [Test Data Management](#test-data-management)
7. [Performance Validation](#performance-validation)
8. [Incident Testing](#incident-testing)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Cleanup Procedures](#cleanup-procedures)

---

## Prerequisites

### Access Requirements
- **Kubernetes Access**: Valid kubeconfig for staging cluster
- **Container Registry**: Access to staging image repository
- **Database Access**: Staging database credentials
- **Monitoring Access**: Grafana and Prometheus access
- **Communication**: Slack/Teams access for updates

### Required Tools
```bash
# Kubernetes tools
kubectl version --client
helm version
kustomize version

# Container tools
docker version
helm plugin install https://github.com/hypnoglow/helm-s3.git

# Monitoring tools
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
kubectl port-forward -n monitoring svc/grafana 3000:3000 &

# Load testing tools
npm install -g artillery
npm install -g k6
```

### Environment Configuration
```bash
# Set staging context
kubectl config use-context staging

# Verify access
kubectl cluster-info
kubectl get nodes
kubectl get namespaces

# Check current deployments
helm list -n staging
kubectl get pods -n staging
```

---

## Pre-Deployment Setup

### 1. Environment Validation

```bash
# Verify staging cluster health
kubectl get nodes -o wide
kubectl get pods -n kube-system
kubectl get cs  # Component status

# Check resource availability
kubectl top nodes
kubectl describe nodes | grep -A 5 "Allocated resources"

# Verify storage
kubectl get pv,pvc -n staging

# Check network policies
kubectl get networkpolicies -n staging
```

### 2. Namespace Preparation

```bash
# Verify staging namespace exists
kubectl get namespace staging

# If not exists, create it
kubectl create namespace staging
kubectl label namespace staging environment=staging tier=application

# Set resource quotas
kubectl create quota staging-quota \
  --hard=cpu=4,memory=8Gi,pods=20 \
  --namespace=staging

# Set default resource limits
kubectl create limitrange staging-limits \
  --namespace=staging \
  --type=Container \
  --default-cpu=500m \
  --default-memory=1Gi \
  --min-cpu=100m \
  --min-memory=256Mi
```

### 3. Secrets Management

```bash
# Verify all required secrets exist
kubectl get secrets -n staging

# Required secrets:
# - database-url
# - redis-url
# - jwt-secret
# - stripe-secret-key
# - sendgrid-api-key
# - twilio-credentials

# If secrets missing, create from production (sanitized)
kubectl get secret database-url -n production -o yaml | \
  kubectl apply -n staging -f -

# Update values for staging
kubectl patch secret database-url -n staging \
  --patch '{"data":{"url": "<base64-encoded-staging-url>"}}'
```

### 4. Container Registry Setup

```bash
# Login to staging registry
docker login registry.staging.company.com -u <username> -p <password>

# Verify image access
docker pull registry.staging.company.com/insurance-lead-gen/api:latest
docker pull registry.staging.company.com/insurance-lead-gen/backend:latest
docker pull registry.staging.company.com/insurance-lead-gen/frontend:latest

# Check available images
docker images | grep staging
```

---

## Staging Deployment Procedure

### 1. Pre-Deployment Checklist

```bash
# Run staging pre-deployment checklist
cat << EOF > staging-precheck.sh
#!/bin/bash

echo "=== Staging Pre-Deployment Checklist ==="

# Code quality checks
echo ">>> Code Quality"
npm run lint
npm run type-check
npm run test:unit

# Security checks
echo ">>> Security Scan"
npm audit --audit-level moderate
docker run --rm -v "\$(pwd)":/app -w /app snyk/snyk:test

# Build verification
echo ">>> Build Verification"
npm run build
docker build -t staging-build-test ./apps/api/

# Database migration verification
echo ">>> Database Migration Test"
kubectl apply -f staging/database/test-migration.yaml

echo "Pre-deployment checklist completed"
EOF

chmod +x staging-precheck.sh
./staging-precheck.sh
```

### 2. Build and Push Images

```bash
#!/bin/bash
# build-staging-images.sh

set -e

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M)
STAGING_TAG="${VERSION}-staging-${TIMESTAMP}"

echo "Building staging images with tag: $STAGING_TAG"

# Build API service
echo ">>> Building API service"
docker build \
  -f apps/api/Dockerfile \
  -t registry.staging.company.com/insurance-lead-gen/api:${STAGING_TAG} \
  -t registry.staging.company.com/insurance-lead-gen/api:latest-staging \
  apps/api/

# Build backend service
echo ">>> Building backend service"
docker build \
  -f apps/backend/Dockerfile \
  -t registry.staging.company.com/insurance-lead-gen/backend:${STAGING_TAG} \
  -t registry.staging.company.com/insurance-lead-gen/backend:latest-staging \
  apps/backend/

# Build frontend service
echo ">>> Building frontend service"
docker build \
  -f apps/frontend/Dockerfile \
  -t registry.staging.company.com/insurance-lead-gen/frontend:${STAGING_TAG} \
  -t registry.staging.company.com/insurance-lead-gen/frontend:latest-staging \
  apps/frontend/

# Build data service
echo ">>> Building data service"
docker build \
  -f apps/data-service/Dockerfile \
  -t registry.staging.company.com/insurance-lead-gen/data-service:${STAGING_TAG} \
  -t registry.staging.company.com/insurance-lead-gen/data-service:latest-staging \
  apps/data-service/

# Build orchestrator
echo ">>> Building orchestrator"
docker build \
  -f apps/orchestrator/Dockerfile \
  -t registry.staging.company.com/insurance-lead-gen/orchestrator:${STAGING_TAG} \
  -t registry.staging.company.com/insurance-lead-gen/orchestrator:latest-staging \
  apps/orchestrator/

# Push images to registry
echo ">>> Pushing images to registry"
docker push registry.staging.company.com/insurance-lead-gen/api:${STAGING_TAG}
docker push registry.staging.company.com/insurance-lead-gen/api:latest-staging
docker push registry.staging.company.com/insurance-lead-gen/backend:${STAGING_TAG}
docker push registry.staging.company.com/insurance-lead-gen/backend:latest-staging
docker push registry.staging.company.com/insurance-lead-gen/frontend:${STAGING_TAG}
docker push registry.staging.company.com/insurance-lead-gen/frontend:latest-staging
docker push registry.staging.company.com/insurance-lead-gen/data-service:${STAGING_TAG}
docker push registry.staging.company.com/insurance-lead-gen/data-service:latest-staging
docker push registry.staging.company.com/insurance-lead-gen/orchestrator:${STAGING_TAG}
docker push registry.staging.company.com/insurance-lead-gen/orchestrator:latest-staging

echo "Staging images built and pushed successfully"
echo "Tag: $STAGING_TAG"
```

### 3. Database Preparation

```bash
# Create pre-deployment backup
echo "Creating staging database backup..."
kubectl exec -n staging deployment/postgres -- \
  pg_dump insurance_lead_gen_staging > staging-pre-deployment-backup-$(date +%Y%m%d-%H%M).sql

# Verify backup integrity
psql -h staging-db.internal -U staging_user -d insurance_lead_gen_staging \
  -c "SELECT count(*) FROM leads;" < staging-pre-deployment-backup-$(date +%Y%m%d-%H%M).sql

# Run database migrations
echo "Applying database migrations..."
kubectl exec -n staging deployment/api -- npm run db:migrate

# Verify migration success
kubectl exec -n staging deployment/api -- npm run db:migrate:status

# Run database health check
kubectl exec -n staging deployment/api -- npm run db:health
```

### 4. Helm Deployment

```bash
#!/bin/bash
# deploy-staging.sh

set -e

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M)
STAGING_TAG="${VERSION}-staging-${TIMESTAMP}"

echo "Starting staging deployment at $(date)"
echo "Version: $VERSION"
echo "Tag: $STAGING_TAG"

# Pre-deployment health check
echo ">>> Pre-deployment health check"
kubectl get pods -n staging
kubectl get services -n staging

# Deploy using Helm
echo ">>> Deploying with Helm"
helm upgrade --install insurance-lead-gen-staging ./deploy/helm/insurance-lead-gen \
  --namespace staging \
  --values ./deploy/helm/insurance-lead-gen/values.staging.yaml \
  --set image.tag=${STAGING_TAG} \
  --set image.repository=registry.staging.company.com/insurance-lead-gen \
  --wait \
  --timeout 15m \
  --debug

# Wait for rollout to complete
echo ">>> Waiting for rollout completion"
kubectl rollout status deployment/api -n staging --timeout=10m
kubectl rollout status deployment/backend -n staging --timeout=10m
kubectl rollout status deployment/frontend -n staging --timeout=10m
kubectl rollout status deployment/data-service -n staging --timeout=10m
kubectl rollout status deployment/orchestrator -n staging --timeout=10m

echo "Staging deployment completed successfully at $(date)"
```

### 5. Service Configuration

```bash
# Update ingress configuration
kubectl patch ingress api-ingress -n staging \
  --patch='{"spec":{"rules":[{"host":"api.staging.insurance-lead-gen.com","http":{"paths":[{"backend":{"service":{"name":"api-service","port":{"number":80}}},"path":"/","pathType":"Prefix"}}]}}}'

kubectl patch ingress frontend-ingress -n staging \
  --patch='{"spec":{"rules":[{"host":"staging.insurance-lead-gen.com","http":{"paths":[{"backend":{"service":{"name":"frontend-service","port":{"number":80}}},"path":"/","pathType":"Prefix"}}]}}}'

# Update DNS records (if using external DNS)
# aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://staging-dns-updates.json

# Update service mesh configuration (if applicable)
kubectl apply -f staging/service-mesh/virtual-service.yaml -n staging
kubectl apply -f staging/service-mesh/destination-rule.yaml -n staging
```

---

## Production-Like Configuration

### Staging Values Configuration

Create `deploy/helm/insurance-lead-gen/values.staging.yaml`:

```yaml
# Global configuration
global:
  environment: staging
  imageRegistry: registry.staging.company.com
  imagePullSecrets:
    - name: registry-credentials
  
  # Production-like resource limits
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

# API Service
api:
  enabled: true
  replicaCount: 2
  
  image:
    repository: insurance-lead-gen/api
    tag: "latest-staging"
    pullPolicy: IfNotPresent
    
  service:
    type: ClusterIP
    port: 80
    targetPort: 3000
    
  ingress:
    enabled: true
    className: nginx
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
      cert-manager.io/cluster-issuer: letsencrypt-staging
    hosts:
      - host: api.staging.insurance-lead-gen.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: api-tls-staging
        hosts:
          - api.staging.insurance-lead-gen.com
  
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi
      
  # Production-like autoscaling
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
    
  # Security hardening
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    readOnlyRootFilesystem: true
    
  # Health checks
  livenessProbe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
    
  readinessProbe:
    httpGet:
      path: /ready
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 3
    
  # Environment variables (production-like)
  env:
    - name: NODE_ENV
      value: "staging"
    - name: LOG_LEVEL
      value: "info"
    - name: ENABLE_METRICS
      value: "true"
    - name: ENABLE_TRACING
      value: "true"
    - name: CORS_ORIGINS
      value: "https://staging.insurance-lead-gen.com"

# Backend Service
backend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: insurance-lead-gen/backend
    tag: "latest-staging"
    
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 800m
      memory: 1Gi
      
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

# Frontend Service
frontend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: insurance-lead-gen/frontend
    tag: "latest-staging"
    
  ingress:
    enabled: true
    className: nginx
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      cert-manager.io/cluster-issuer: letsencrypt-staging
    hosts:
      - host: staging.insurance-lead-gen.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: frontend-tls-staging
        hosts:
          - staging.insurance-lead-gen.com
          
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Data Service
data-service:
  enabled: true
  replicaCount: 1
  
  image:
    repository: insurance-lead-gen/data-service
    tag: "latest-staging"
    
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Orchestrator
orchestrator:
  enabled: true
  replicaCount: 1
  
  image:
    repository: insurance-lead-gen/orchestrator
    tag: "latest-staging"
    
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 800m
      memory: 1Gi

# Database Configuration
postgresql:
  enabled: true
  auth:
    database: insurance_lead_gen_staging
    username: staging_user
  primary:
    persistence:
      enabled: true
      size: 50Gi
    resources:
      requests:
        cpu: 250m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 4Gi

# Redis Configuration
redis:
  enabled: true
  auth:
    enabled: false  # For staging simplicity
  master:
    persistence:
      enabled: true
      size: 10Gi
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

# Monitoring
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
  podMonitor:
    enabled: true
    interval: 30s
    
# Logging
loki:
  enabled: true
  persistence:
    size: 20Gi
  config:
    table_manager:
      retention_deletes_enabled: true
      retention_period: 168h  # 7 days for staging

# Ingress Configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-staging
    
# Network Policies
networkPolicies:
  enabled: true
  ingress:
    enabled: true
  egress:
    enabled: true

# Pod Disruption Budgets
podDisruptionBudget:
  enabled: true
  api:
    minAvailable: 1
  backend:
    minAvailable: 1
  frontend:
    minAvailable: 1

# Security
security:
  podSecurityPolicy:
    enabled: true
  networkPolicies:
    enabled: true
  rbac:
    create: true
```

### Production-Like Security Settings

```bash
# Apply network policies
kubectl apply -f staging/security/network-policies.yaml

# Create Pod Disruption Budgets
kubectl apply -f staging/security/pod-disruption-budgets.yaml

# Configure RBAC
kubectl apply -f staging/security/rbac.yaml

# Enable Pod Security Policy
kubectl apply -f staging/security/pod-security-policy.yaml
```

---

## Data Synchronization

### Production Data Sync (Anonymized)

```bash
#!/bin/bash
# sync-production-data.sh

set -e

echo "Starting production data synchronization (anonymized)..."

# 1. Create anonymized production backup
echo ">>> Creating anonymized production backup"
kubectl exec -n production deployment/postgres -- \
  pg_dump --no-owner --no-privileges insurance_lead_gen | \
  sed 's/replace_with_fake_email@.*/fake_email@example.com/g' | \
  sed 's/replace_with_fake_phone.*/fake_phone_number/g' | \
  sed 's/replace_with_fake_address.*/fake_address_line/g' > production-anonymized-backup.sql

# 2. Backup current staging data
echo ">>> Backing up current staging data"
kubectl exec -n staging deployment/postgres -- \
  pg_dump --no-owner --no-privileges insurance_lead_gen_staging > staging-backup-$(date +%Y%m%d-%H%M).sql

# 3. Stop staging applications
echo ">>> Stopping staging applications"
kubectl scale deployment api -n staging --replicas=0
kubectl scale deployment backend -n staging --replicas=0
kubectl scale deployment frontend -n staging --replicas=0
kubectl scale deployment data-service -n staging --replicas=0
kubectl scale deployment orchestrator -n staging --replicas=0

# 4. Restore anonymized production data
echo ">>> Restoring anonymized production data"
kubectl exec -i -n staging deployment/postgres -- \
  psql -U staging_user -d insurance_lead_gen_staging < production-anonymized-backup.sql

# 5. Update staging-specific data
echo ">>> Updating staging-specific configurations"
kubectl exec -n staging deployment/api -- \
  npm run db:update-staging-config

# 6. Restart applications
echo ">>> Restarting applications"
kubectl scale deployment api -n staging --replicas=2
kubectl scale deployment backend -n staging --replicas=2
kubectl scale deployment frontend -n staging --replicas=2
kubectl scale deployment data-service -n staging --replicas=1
kubectl scale deployment orchestrator -n staging --replicas=1

# 7. Verify synchronization
echo ">>> Verifying data synchronization"
kubectl exec -n staging deployment/api -- \
  npm run db:verify-sync

echo "Production data synchronization completed"
```

### Selective Data Sync

```bash
# Sync only specific tables
echo "SELECT 'COPY leads FROM stdin;' FROM pg_tables WHERE tablename = 'leads';" > selective-sync.sql
kubectl exec -n production deployment/postgres -- \
  pg_dump -t leads --no-owner insurance_lead_gen >> selective-sync.sql

kubectl exec -i -n staging deployment/postgres -- \
  psql -U staging_user -d insurance_lead_gen_staging < selective-sync.sql

# Sync recent data only
kubectl exec -n production deployment/postgres -- \
  pg_dump -t leads --where="created_at > NOW() - INTERVAL '30 days'" \
  --no-owner insurance_lead_gen > recent-leads.sql

kubectl exec -i -n staging deployment/postgres -- \
  psql -U staging_user -d insurance_lead_gen_staging < recent-leads.sql
```

---

## Test Data Management

### Test Data Seeding

```bash
# Load comprehensive test dataset
kubectl exec -n staging deployment/api -- \
  npm run db:seed:comprehensive

# Load performance test data
kubectl exec -n staging deployment/api -- \
  npm run db:seed:performance

# Load specific test scenarios
kubectl exec -n staging deployment/api -- \
  npm run db:seed:test-scenarios

# Verify test data
kubectl exec -n staging deployment/api -- \
  npm run db:verify-test-data
```

### Test Data Categories

```sql
-- Create test data categories
INSERT INTO test_data_categories (name, description, data_size) VALUES
('small', 'Minimal test dataset (< 1000 records)', 'small'),
('medium', 'Medium test dataset (10K-50K records)', 'medium'),
('large', 'Large test dataset (100K+ records)', 'large'),
('performance', 'Performance testing dataset', 'performance'),
('edge_cases', 'Edge case scenarios', 'edge_cases'),
('load_testing', 'Load testing dataset', 'load_testing');

-- Load test data based on category
SELECT load_test_data('medium');
```

### Test Data Refresh

```bash
#!/bin/bash
# refresh-test-data.sh

CATEGORY=${1:-medium}

echo "Refreshing test data with category: $CATEGORY"

# Stop applications
kubectl scale deployment api -n staging --replicas=0

# Clear existing test data
kubectl exec -n staging deployment/api -- \
  npm run db:clear-test-data -- --category=$CATEGORY

# Load fresh test data
kubectl exec -n staging deployment/api -- \
  npm run db:seed -- --category=$CATEGORY

# Restart applications
kubectl scale deployment api -n staging --replicas=2

# Verify test data
kubectl exec -n staging deployment/api -- \
  npm run db:verify-test-data -- --category=$CATEGORY

echo "Test data refresh completed for category: $CATEGORY"
```

---

## Performance Validation

### Load Testing Setup

```bash
# Install load testing tools
npm install -g artillery
npm install -g k6

# Configure load testing
cat << EOF > staging-load-test.yml
config:
  target: 'https://api.staging.insurance-lead-gen.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 300
      arrivalRate: 50
    - duration: 120
      arrivalRate: 100
  payload:
    path: "test-data.csv"
    fields:
      - "email"
      - "name"
      - "phone"

scenarios:
  - name: "Lead Creation Flow"
    weight: 40
    flow:
      - post:
          url: "/api/leads"
          json:
            email: "{{ email }}"
            name: "{{ name }}"
            phone: "{{ phone }}"
            source: "load_test"
          capture:
            - json: "$.id"
              as: "lead_id"
      - get:
          url: "/api/leads/{{ lead_id }}"
          
  - name: "Customer Lookup"
    weight: 30
    flow:
      - get:
          url: "/api/customers"
          qs:
            page: 1
            limit: 20
          
  - name: "Dashboard Access"
    weight: 20
    flow:
      - get:
          url: "/api/dashboard/stats"
          
  - name: "Health Check"
    weight: 10
    flow:
      - get:
          url: "/health"
EOF

# Run load test
echo "Running load test against staging..."
artillery run staging-load-test.yml --output staging-load-results.json

# Generate load test report
artillery report staging-load-results.json --output staging-load-report.html
```

### Performance Benchmarks

```bash
# API Performance Test
kubectl exec -n staging deployment/api -- \
  npm run test:performance -- --target=https://api.staging.insurance-lead-gen.com

# Database Performance Test
kubectl exec -n staging deployment/api -- \
  npm run test:db-performance

# Cache Performance Test
kubectl exec -n staging deployment/api -- \
  npm run test:cache-performance

# Memory Usage Test
kubectl exec -n staging deployment/api -- \
  npm run test:memory-usage
```

### Performance Monitoring

```bash
# Monitor staging performance during testing
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Monitor specific metrics
echo "Monitoring staging performance metrics..."

# API response time
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))"

# Error rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m])"

# Database connections
curl -s "http://localhost:9090/api/v1/query?query=pg_stat_database_numbackends{datname=\"insurance_lead_gen_staging\"}"

# Memory usage
curl -s "http://localhost:9090/api/v1/query?query=container_memory_usage_bytes{namespace=\"staging\"}"
```

---

## Incident Testing

### Chaos Engineering Tests

```bash
# Install chaos testing tools
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace

# Test pod failures
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: api-pod-failure
  namespace: staging
spec:
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: api
  action: pod-failure
  mode: one
EOF

# Test network latency
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-network-latency
  namespace: staging
spec:
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: api
  action: latency
  mode: one
  latency:
    latency: "100ms"
    jitter: "50ms"
  duration: "5m"
EOF

# Test database connection failure
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: database-connection-failure
  namespace: staging
spec:
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: api
  action: loss
  mode: one
  loss:
    loss: "100"
    correlation: "100"
  duration: "2m"
EOF
```

### Recovery Testing

```bash
# Test service recovery
echo "Testing API service recovery..."
kubectl delete pod -n staging -l app=api
sleep 30
kubectl get pods -n staging -l app=api

# Test database failover (if configured)
echo "Testing database failover..."
# This would depend on your database setup

# Test cache recovery
echo "Testing Redis recovery..."
kubectl delete pod -n staging -l app=redis
sleep 30
kubectl get pods -n staging -l app=redis

# Test ingress recovery
echo "Testing ingress recovery..."
kubectl delete pod -n staging -l app=nginx-ingress-controller
sleep 30
kubectl get pods -n staging -l app=nginx-ingress-controller
```

### Performance Degradation Testing

```bash
# Simulate high CPU usage
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: api-cpu-stress
  namespace: staging
spec:
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: api
  mode: one
  stress:
    cpu:
      workers: 4
  duration: "5m"
EOF

# Simulate memory pressure
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: api-memory-stress
  namespace: staging
spec:
  selector:
    namespaces:
      - staging
    labelSelectors:
      app: api
  mode: one
  stress:
    memory:
      workers: 2
      size: "1GB"
  duration: "5m"
EOF
```

---

## Post-Deployment Verification

### Automated Verification

```bash
#!/bin/bash
# staging-verification.sh

set -e

echo "Starting staging post-deployment verification..."

# 1. Service Health Check
echo ">>> Service Health Check"
kubectl get pods -n staging | grep -E "(0/.*|Error|CrashLoop)" && exit 1

# 2. Service Endpoints
echo ">>> Service Endpoints"
kubectl get endpoints -n staging | grep "<none>" && exit 1

# 3. Health Endpoints
echo ">>> Health Endpoints"
HEALTH_ENDPOINTS=(
    "https://api.staging.insurance-lead-gen.com/health"
    "https://staging.insurance-lead-gen.com/health"
    "https://api.staging.insurance-lead-gen.com/metrics"
)

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    echo "Checking $endpoint"
    if ! curl -f "$endpoint" --max-time 10; then
        echo "Health check failed for $endpoint"
        exit 1
    fi
done

# 4. Functional Tests
echo ">>> Functional Tests"
npm run test:smoke -- --baseUrl=https://api.staging.insurance-lead-gen.com || exit 1

# 5. Database Connectivity
echo ">>> Database Connectivity"
kubectl exec -n staging deployment/api -- npm run db:test-connection || exit 1

# 6. Error Check
echo ">>> Error Check"
ERROR_COUNT=$(kubectl logs -n staging -l app=api --tail=1000 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "High error count: $ERROR_COUNT"
    exit 1
fi

# 7. Performance Check
echo ">>> Performance Check"
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://api.staging.insurance-lead-gen.com/health)
if (( $(echo "$RESPONSE_TIME > 3.0" | bc -l) )); then
    echo "High response time: $RESPONSE_TIME"
    exit 1
fi

# 8. Load Test
echo ">>> Load Test"
artillery run staging-load-test.yml --output staging-verification-results.json

echo "Staging verification completed successfully"
```

### Manual Verification Checklist

- [ ] **API Service**: All endpoints responding (200 status)
- [ ] **Frontend**: Application loads correctly
- [ ] **Authentication**: Login/logout working
- [ ] **Database**: CRUD operations functional
- [ ] **Cache**: Redis operations working
- [ ] **File Uploads**: Document processing working
- [ ] **Email/SMS**: Notifications sending
- [ ] **Background Jobs**: Queue processing working
- [ ] **External APIs**: Third-party integrations working
- [ ] **Performance**: Response times within SLA

### Monitoring Setup

```bash
# Setup monitoring for staging
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Create staging-specific dashboards
kubectl apply -f staging/monitoring/dashboards/

# Configure alerts for staging
kubectl apply -f staging/monitoring/alerts/
```

---

## Cleanup Procedures

### Post-Testing Cleanup

```bash
#!/bin/bash
# staging-cleanup.sh

echo "Starting staging cleanup..."

# 1. Stop chaos experiments
kubectl delete chaos --all -n staging

# 2. Clean up test data
kubectl exec -n staging deployment/api -- \
  npm run db:cleanup-test-data

# 3. Remove load test artifacts
rm -f staging-load-test.yml
rm -f staging-load-results.json
rm -f staging-load-report.html

# 4. Clean up temporary resources
kubectl delete pvc -n staging -l app=temp
kubectl delete job -n staging -l app=cleanup

# 5. Reset monitoring data
kubectl delete configmap -n staging -l app=load-test

# 6. Backup final staging state
kubectl exec -n staging deployment/postgres -- \
  pg_dump insurance_lead_gen_staging > staging-final-backup-$(date +%Y%m%d-%H%M).sql

echo "Staging cleanup completed"
```

### Environment Reset

```bash
# Complete environment reset (if needed)
echo "Resetting staging environment..."

# Scale down all deployments
kubectl scale deployment --all -n staging --replicas=0

# Clean up ingress
kubectl delete ingress --all -n staging

# Remove Helm release
helm uninstall insurance-lead-gen-staging -n staging

# Clean up PVCs (WARNING: Removes all data)
kubectl delete pvc --all -n staging

# Recreate namespace
kubectl delete namespace staging
kubectl create namespace staging

echo "Staging environment reset completed"
```

### Data Retention

```bash
# Configure data retention for staging
cat << EOF > staging-retention-policy.sql
-- Set retention for test data
DELETE FROM test_data WHERE created_at < NOW() - INTERVAL '7 days';
DELETE FROM load_test_results WHERE created_at < NOW() - INTERVAL '3 days';

-- Archive old logs
SELECT archive_staging_logs(NOW() - INTERVAL '30 days');

-- Optimize database
VACUUM ANALYZE;
EOF

kubectl exec -n staging deployment/postgres -- \
  psql -U staging_user -d insurance_lead_gen_staging < staging-retention-policy.sql
```

---

## Quick Reference

### Essential Commands
```bash
# Quick staging deployment
./build-staging-images.sh && ./deploy-staging.sh && ./staging-verification.sh

# Reset staging environment
kubectl delete namespace staging && kubectl create namespace staging

# Monitor staging deployment
kubectl get pods -n staging -w
kubectl logs -f -n staging -l app=api

# Access staging services
kubectl port-forward -n staging svc/api-service 3000:80
kubectl port-forward -n staging svc/frontend-service 3002:80
```

### URLs
- **API**: https://api.staging.insurance-lead-gen.com
- **Frontend**: https://staging.insurance-lead-gen.com
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

### Troubleshooting
```bash
# Check staging logs
kubectl logs -n staging -l app=api --tail=100

# Debug pod
kubectl debug -it -n staging -l app=api --image=busybox

# Database shell
kubectl exec -it -n staging deployment/postgres -- psql -U staging_user -d insurance_lead_gen_staging

# Redis shell
kubectl exec -it -n staging deployment/redis -- redis-cli
```

### Emergency Contacts
- **Staging On-call**: @staging-oncall
- **Platform Team**: #platform-staging
- **Dev Lead**: @dev-lead
- **SRE Team**: #sre-support
