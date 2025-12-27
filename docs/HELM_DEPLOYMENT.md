# Helm Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the Insurance Lead Gen AI Platform using Helm charts.

## Prerequisites

### Required Tools
```bash
# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip
sudo ./aws/install
```

### Required Access
- AWS credentials with EKS access
- Helm repository configured
- kubectl configured with cluster access

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Helm Charts                          │
├──────────┬─────────┬──────────┬─────────┬──────────┬──┤
│  common  │ ingress │ monitoring│  api   │ backend  │..│
└────┬─────┴────┬────┴─────┬────┬───┴────┬────┴────┬───┘
     │          │          │    │        │         │
     ▼          ▼          ▼    ▼        ▼         ▼
┌─────────────────────────────────────────────────────────┐
│              Kubernetes Cluster (EKS)                   │
├─────────────────────────────────────────────────────────┤
│  Production Namespace │ Staging Namespace │ Monitoring │
└─────────────────────────────────────────────────────────┘
```

## 📦 Available Charts

| Chart | Description | Service Port |
|-------|-------------|--------------|
| `api` | REST API service | 3000 |
| `backend` | Python FastAPI backend | 8000 |
| `data-service` | Data processing service | 3001 |
| `orchestrator` | AI orchestration service | 3002 |
| `frontend` | Next.js frontend | 3000 |
| `ingress-nginx` | Ingress controller | 80/443 |
| `monitoring` | Prometheus, Grafana, Loki, Jaeger | Various |
| `common` | Shared templates | N/A |

## 🚀 Quick Start

### 1. Configure kubectl
```bash
# Update kubeconfig for EKS
aws eks update-kubeconfig \
  --name insurance-lead-gen-production \
  --region us-east-1

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 2. Create Namespaces
```bash
# Create namespaces
kubectl create namespace staging
kubectl create namespace production
kubectl create namespace monitoring
kubectl create namespace ingress-nginx

# Apply security labels
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted
kubectl label namespace staging \
  pod-security.kubernetes.io/enforce=baseline
```

### 3. Install Ingress Controller
```bash
# Deploy ingress-nginx
helm upgrade --install ingress-nginx \
  ./deploy/helm/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --wait --timeout 10m

# Verify installation
kubectl get pods -n ingress-nginx
```

### 4. Deploy Common Chart
```bash
# Deploy common utilities
helm upgrade --install common \
  ./deploy/helm/common \
  --namespace production \
  --wait --timeout 5m
```

### 5. Deploy Monitoring (Optional but Recommended)
```bash
# Deploy monitoring stack
helm upgrade --install monitoring \
  ./deploy/helm/monitoring \
  --namespace monitoring \
  --create-namespace \
  --wait --timeout 10m

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open http://localhost:3000 (admin/admin)
```

### 6. Deploy Application Services

#### Staging Environment
```bash
# Deploy to staging
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.staging.yaml \
  -n staging \
  --wait --timeout 5m

helm upgrade --install backend ./deploy/helm/backend \
  -f ./deploy/helm/backend/values.staging.yaml \
  -n staging \
  --wait --timeout 5m

helm upgrade --install data-service ./deploy/helm/data-service \
  -f ./deploy/helm/data-service/values.staging.yaml \
  -n staging \
  --wait --timeout 5m

helm upgrade --install orchestrator ./deploy/helm/orchestrator \
  -f ./deploy/helm/orchestrator/values.staging.yaml \
  -n staging \
  --wait --timeout 5m

helm upgrade --install frontend ./deploy/helm/frontend \
  -f ./deploy/helm/frontend/values.staging.yaml \
  -n staging \
  --wait --timeout 5m
```

#### Production Environment
```bash
# Deploy to production
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production \
  --wait --timeout 10m

helm upgrade --install backend ./deploy/helm/backend \
  -f ./deploy/helm/backend/values.production.yaml \
  -n production \
  --wait --timeout 10m

helm upgrade --install data-service ./deploy/helm/data-service \
  -f ./deploy/helm/data-service/values.production.yaml \
  -n production \
  --wait --timeout 10m

helm upgrade --install orchestrator ./deploy/helm/orchestrator \
  -f ./deploy/helm/orchestrator/values.production.yaml \
  -n production \
  --wait --timeout 10m

helm upgrade --install frontend ./deploy/helm/frontend \
  -f ./deploy/helm/frontend/values.production.yaml \
  -n production \
  --wait --timeout 10m
```

## 🔧 Configuration

### Environment Values Files

#### Staging (values.staging.yaml)
```yaml
replicaCount: 2
image:
  repository: insurance-lead-gen-api
  tag: "staging"
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

#### Production (values.production.yaml)
```yaml
replicaCount: 3
image:
  repository: insurance-lead-gen-api
  tag: "production"
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
podDisruptionBudget:
  minAvailable: 2
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - api
        topologyKey: kubernetes.io/hostname
```

### Custom Values
```bash
# Deploy with custom values
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.yaml \
  -f ./deploy/helm/api/values.production.yaml \
  -f custom-values.yaml \
  -n production \
  --wait
```

## 🔄 Updating Deployments

### Rolling Update
```bash
# Update image tag
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  --set image.tag="v1.2.0" \
  -n production

# Monitor rollout
kubectl rollout status deployment/api -n production
```

### Rollback
```bash
# List revisions
helm history api -n production

# Rollback to previous version
helm rollback api 1 -n production

# Verify rollback
kubectl rollout status deployment/api -n production
```

### Dry-Run Before Deployment
```bash
# Test deployment without applying
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production \
  --dry-run \
  --debug
```

## 📊 Monitoring Deployments

### Check Status
```bash
# List all releases
helm list -n production -a

# Get release status
helm status api -n production

# Get values used
helm get values api -n production
```

### View Logs
```bash
# Follow logs for a release
kubectl logs -n production -l app.kubernetes.io/name=api -f
```

### Check Resources
```bash
# Get all resources for a release
kubectl get all -n production -l app.kubernetes.io/instance=api

# Check resource usage
kubectl top pods -n production -l app.kubernetes.io/instance=api
```

## 🚨 Troubleshooting

### Pod Not Starting
```bash
# Check pod status
kubectl get pods -n production -l app.kubernetes.io/instance=api

# View events
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production
```

### ImagePullBackOff
```bash
# Verify image repository
kubectl get events -n production | grep ImagePull

# Check image tag exists
aws ecr describe-images \
  --repository-name insurance-lead-gen/api \
  --image-ids imageTag=production
```

### CrashLoopBackOff
```bash
# Check restart count
kubectl get pods -n production -l app.kubernetes.io/instance=api

# View previous logs
kubectl logs <pod-name> -n production --previous
```

### Resource Issues
```bash
# Check resource limits
kubectl describe pod <pod-name> -n production | grep -A 5 "Limits"

# Increase resources
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  --set resources.limits.memory=2Gi \
  -n production
```

## 🧹 Cleanup

### Uninstall Release
```bash
# Uninstall release
helm uninstall api -n production

# Remove namespace (caution!)
kubectl delete namespace production
```

### Uninstall All Charts
```bash
# Uninstall all releases in namespace
helm list -n production -q | xargs -I {} helm uninstall {} -n production
```

## 📚 Chart Values Reference

### Common Values (all charts)

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `replicaCount` | int | 2 | Number of replicas |
| `image.repository` | string | - | Docker image repository |
| `image.tag` | string | `appVersion` | Image tag |
| `image.pullPolicy` | string | `IfNotPresent` | Pull policy |
| `service.type` | string | `ClusterIP` | Service type |
| `service.port` | int | - | Service port |
| `resources.limits.cpu` | string | - | CPU limit |
| `resources.limits.memory` | string | - | Memory limit |
| `resources.requests.cpu` | string | - | CPU request |
| `resources.requests.memory` | string | - | Memory request |
| `autoscaling.enabled` | bool | false | Enable HPA |
| `autoscaling.minReplicas` | int | 1 | Min replicas |
| `autoscaling.maxReplicas` | int | 10 | Max replicas |

## 🔗 Useful Links

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
