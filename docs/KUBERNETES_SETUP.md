# Kubernetes Setup Guide

This guide provides comprehensive instructions for setting up the Kubernetes infrastructure for the Insurance Lead Generation Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cluster Architecture](#cluster-architecture)
3. [Cluster Provisioning](#cluster-provisioning)
4. [Infrastructure Components](#infrastructure-components)
5. [Service Deployment](#service-deployment)
6. [Verification](#verification)

## Prerequisites

### Tools Required

- **kubectl** (v1.28+)
- **kustomize** (v5.0+)
- **helm** (v3.0+) - optional
- **terraform** (v1.5+) - for infrastructure provisioning
- **aws-cli** (v2.0+) - for EKS
- **gcloud** (v400+) - for GKE

### AWS/EKS Requirements

- AWS account with appropriate permissions
- VPC configured (or allow Terraform to create)
- IAM permissions for EKS
- S3 bucket for Terraform state

### GCP/GKE Requirements

- GCP project
- VPC configured
- IAM permissions for GKE
- GCS bucket for Terraform state

### Container Registry

- ECR (for EKS) or GCR (for GKE)
- Container images built and pushed

## Cluster Architecture

### Overview

The platform uses a multi-environment Kubernetes architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Control Plane                       │  │
│  │            (Managed by Cloud Provider)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │   Dev NS     │  Staging NS  │   Prod NS    │          │
│  │              │              │              │          │
│  │  API (1)     │  API (2)     │  API (3)     │          │
│  │  Data (1)    │  Data (2)    │  Data (3)    │          │
│  │  Orch (1)    │  Orch (2)    │  Orch (2)    │          │
│  │  Front (1)   │  Front (2)   │  Front (3)   │          │
│  │  Back (1)    │  Back (2)    │  Back (3)    │          │
│  └──────────────┴──────────────┴──────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Nodes (dedicated)              │  │
│  │  PostgreSQL | Redis | Neo4j | Qdrant                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Infrastructure Components                 │  │
│  │  Ingress | Monitoring | Logging | Service Mesh       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Node Types

| Node Type | Purpose | CPU | Memory | Storage |
|-----------|---------|-----|--------|---------|
| System | Control plane components, monitoring | 2 vCPUs | 8 GiB | 100 GB |
| Application | API, Data, Orchestrator, Frontend, Backend | 4 vCPUs | 16 GiB | 150 GB |
| Database | PostgreSQL, Redis, Neo4j, Qdrant | 8 vCPUs | 64 GiB | 500 GB |
| AI (Optional) | GPU workloads | 4 vCPUs + GPU | 16 GiB | 100 GB |

### High Availability

- **Control Plane**: Managed by cloud provider (99.95%+ SLA)
- **Multi-AZ**: Nodes distributed across 3 availability zones
- **Pod Anti-Affinity**: Pods spread across nodes
- **HPA**: Automatic scaling based on load

## Cluster Provisioning

### Option 1: AWS EKS

#### 1. Configure AWS CLI

```bash
aws configure
# Enter your AWS credentials
```

#### 2. Create S3 Bucket for Terraform State

```bash
aws s3 mb s3://insurance-lead-gen-terraform-state
aws s3api put-bucket-versioning \
  --bucket insurance-lead-gen-terraform-state \
  --versioning-configuration Status=Enabled
```

#### 3. Create DynamoDB Table for Locking

```bash
aws dynamodb create-table \
  --table-name insurance-lead-gen-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### 4. Provision EKS Cluster

```bash
cd infrastructure/kubernetes/aws

# Initialize Terraform
terraform init

# Review the plan
terraform plan -var="environment=prod" -var="aws_region=us-east-1"

# Apply the changes
terraform apply -var="environment=prod" -var="aws_region=us-east-1"

# Configure kubectl
aws eks update-kubeconfig \
  --name insurance-lead-gen-prod \
  --region us-east-1

# Verify cluster access
kubectl get nodes
```

#### 5. Install Cluster Add-ons

```bash
cd infrastructure/kubernetes/aws

terraform apply -var="environment=prod" -var="aws_region=us-east-1"
```

This will install:
- EBS CSI Driver
- EFS CSI Driver
- AWS Load Balancer Controller
- Cluster Autoscaler
- External DNS

### Option 2: Google GKE

#### 1. Configure GCloud CLI

```bash
gcloud auth login
gcloud config set project your-project-id
gcloud config set region us-central1
```

#### 2. Create GCS Bucket for Terraform State

```bash
gsutil mb gs://insurance-lead-gen-terraform-state
```

#### 3. Provision GKE Cluster

```bash
cd infrastructure/kubernetes/gcp

# Initialize Terraform
terraform init

# Review the plan
terraform plan \
  -var="project_id=your-project-id" \
  -var="region=us-central1" \
  -var="environment=prod"

# Apply the changes
terraform apply \
  -var="project_id=your-project-id" \
  -var="region=us-central1" \
  -var="environment=prod"

# Configure kubectl
gcloud container clusters get-credentials insurance-lead-gen-prod \
  --region us-central1 \
  --project your-project-id

# Verify cluster access
kubectl get nodes
```

## Infrastructure Components

### 1. Create Namespace

```bash
kubectl apply -f k8s/infrastructure/namespace.yaml
```

### 2. Deploy RBAC

```bash
kubectl apply -f k8s/infrastructure/rbac.yaml
```

### 3. Deploy Storage Classes

```bash
kubectl apply -f k8s/infrastructure/storage-classes.yaml
```

This creates:
- `fast-ssd` - GP3 with 3000 IOPS (databases)
- `standard-ssd` - GP3 with 3000 IOPS (general)
- `standard-hdd` - GP3 with 500 IOPS (backups)
- `io2-high-performance` - IO2 with 10000 IOPS (high-performance)
- `efs` - EFS file system (shared storage)

### 4. Deploy Network Policies

```bash
kubectl apply -f k8s/infrastructure/network-policies.yaml
```

This applies:
- Default deny-all ingress/egress
- Explicit allow rules for service communication
- DNS resolution
- Database replication
- Prometheus metrics scraping

### 5. Deploy Ingress Controller

```bash
kubectl apply -f k8s/infrastructure/ingress-controller.yaml
```

This deploys:
- NGINX Ingress Controller
- Default backend
- TLS configuration
- Rate limiting
- Security headers

### 6. Deploy Kubernetes Dashboard (Optional)

```bash
kubectl apply -f k8s/dashboard/deployment.yaml
```

### 7. Configure External DNS (EKS/GKE)

```bash
# For EKS, this is handled by Terraform
# For manual configuration:
kubectl annotate service ingress-nginx-controller \
  external-dns.alpha.kubernetes.io/hostname=insurance-platform.com
```

## Service Deployment

### Prerequisites

1. Build and push container images
2. Create secrets for sensitive data
3. Configure environment-specific values

### Build and Push Images

```bash
# For EKS
docker build -t insurance-lead-gen/api:prod ./apps/api
docker build -t insurance-lead-gen/data-service:prod ./apps/data-service
docker build -t insurance-lead-gen/orchestrator:prod ./apps/orchestrator
docker build -t insurance-lead-gen/frontend:prod ./apps/frontend
docker build -t insurance-lead-gen/backend:prod ./apps/backend

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/insurance-lead-gen/api:prod
# ... repeat for other images
```

### Create Secrets

```bash
# Create secret for API
kubectl create secret generic api-secrets \
  --from-literal=DATABASE_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  --from-literal=OPENAI_API_KEY=your-key \
  -n insurance-lead-gen-prod

# Create secret for Data Service
kubectl create secret generic data-service-secrets \
  --from-literal=DATABASE_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  -n insurance-lead-gen-prod

# ... repeat for other services
```

### Deploy Services

#### Option 1: Using Deployment Script (Recommended)

```bash
cd scripts/k8s

# Deploy to production
./deploy.sh --env prod
```

#### Option 2: Using Kustomize Directly

```bash
cd k8s/overlays/prod

# Validate manifests
kustomize build . | kubectl apply --dry-run=client -f -

# Apply manifests
kustomize build . | kubectl apply -f -

# Wait for rollout
kubectl rollout status deployment/api -n insurance-lead-gen-prod
kubectl rollout status deployment/data-service -n insurance-lead-gen-prod
# ... repeat for other deployments
```

## Verification

### 1. Check Namespace

```bash
kubectl get ns insurance-lead-gen-prod
```

### 2. Check Pods

```bash
kubectl get pods -n insurance-lead-gen-prod
```

Expected output:
```
NAME                           READY   STATUS    RESTARTS   AGE
api-xxx                        1/1     Running   0          5m
data-service-xxx               1/1     Running   0          5m
orchestrator-xxx               1/1     Running   0          5m
frontend-xxx                   1/1     Running   0          5m
backend-xxx                    1/1     Running   0          5m
postgres-0                     1/1     Running   0          5m
redis-0                        1/1     Running   0          5m
neo4j-0                        1/1     Running   0          5m
qdrant-0                       1/1     Running   0          5m
```

### 3. Check Services

```bash
kubectl get svc -n insurance-lead-gen-prod
```

### 4. Check Ingress

```bash
kubectl get ingress -n insurance-lead-gen-prod
```

### 5. Check PVCs

```bash
kubectl get pvc -n insurance-lead-gen-prod
```

### 6. Check HPA

```bash
kubectl get hpa -n insurance-lead-gen-prod
```

### 7. Run Health Check

```bash
cd scripts/k8s
./health-check.sh --env prod --deep-check
```

### 8. Test Service Access

```bash
# Test API (port-forward)
kubectl port-forward -n insurance-lead-gen-prod deployment/api 8080:3000 &
curl http://localhost:8080/health

# Test Ingress
curl https://api.insurance-platform.com/health
```

## Next Steps

1. Configure monitoring and logging
2. Set up alerts and notifications
3. Configure CI/CD pipeline
4. Set up disaster recovery procedures
5. Document runbooks

See:
- [Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md)
- [Kubernetes Networking Guide](./KUBERNETES_NETWORKING.md)
- [Kubernetes Security Guide](./KUBERNETES_SECURITY.md)
- [Kubernetes Troubleshooting Guide](./KUBERNETES_TROUBLESHOOTING.md)
