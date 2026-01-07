# Database Setup Guide

## Overview

This guide covers the setup and configuration of all databases used in the Insurance Lead Generation AI Platform: PostgreSQL, Redis, Neo4j, and Qdrant.

## Table of Contents

- [Prerequisites](#prerequisites)
- [PostgreSQL Setup](#postgresql-setup)
- [Redis Setup](#redis-setup)
- [Neo4j Setup](#neo4j-setup)
- [Qdrant Setup](#qdrant-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Connection Strings](#connection-strings)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### AWS CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### kubectl
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Helm
```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## PostgreSQL Setup

### Local Development (Docker)

PostgreSQL is included in the development Docker Compose setup:

```bash
# Start all databases
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d insurance_lead_gen
```

### Production (Terraform)

Deploy PostgreSQL using Terraform:

```bash
# Navigate to Terraform directory
cd deploy/terraform/aws

# Initialize Terraform
terraform init

# Review plan
terraform plan -var-file=environments/production.tfvars

# Apply changes
terraform apply -var-file=environments/production.tfvars

# Outputs
terraform output
```

### Production (Kubernetes Operator)

Deploy PostgreSQL using CloudNativePG operator:

```bash
# Create namespace
kubectl create namespace postgresql-operator

# Install operator
kubectl apply -f k8s/operators/postgres-operator.yaml

# Verify cluster status
kubectl get clusters -n postgresql-operator

# Check pods
kubectl get pods -n postgresql-operator

# View cluster status
kubectl describe cluster postgres-cluster -n postgresql-operator
```

### Configuration

PostgreSQL configuration is managed via:

- **Terraform**: Parameter groups in `infrastructure/databases/postgresql/parameter-group.tf`
- **Kubernetes**: Custom config in operator manifest
- **Docker**: Environment variables in `docker-compose.yml`

Key settings:

```yaml
# Memory (db.r6i.xlarge = 32GB RAM)
shared_buffers: 8GB         # 25% of RAM
effective_cache_size: 24GB  # 75% of RAM
work_mem: 64MB              # Per query operation
maintenance_work_mem: 2GB   # VACUUM, CREATE INDEX

# Connections
max_connections: 500

# Performance
random_page_cost: 1.0        # SSD-optimized
checkpoint_completion_target: 0.9
```

## Redis Setup

### Local Development (Docker)

Redis is included in the development Docker Compose setup:

```bash
# Start Redis
docker-compose up -d redis

# View logs
docker-compose logs -f redis

# Connect to Redis
docker-compose exec redis redis-cli
```

### Production (Terraform)

Deploy Redis using Terraform:

```bash
# Navigate to Terraform directory
cd deploy/terraform/aws

# Initialize Terraform
terraform init

# Review plan
terraform plan -var-file=environments/production.tfvars

# Apply changes
terraform apply -var-file=environments/production.tfvars
```

### Production (Kubernetes Operator)

Deploy Redis using Redis operator:

```bash
# Create namespace
kubectl create namespace redis-operator

# Install operator
kubectl apply -f k8s/operators/redis-operator.yaml

# Verify cluster status
kubectl get rediscluster -n redis-operator

# Check pods
kubectl get pods -n redis-operator

# View cluster status
kubectl describe rediscluster redis-cluster -n redis-operator
```

### Configuration

Redis configuration is managed via:

- **Terraform**: Parameter groups in `infrastructure/databases/redis/cluster.tf`
- **Kubernetes**: Custom config in operator manifest
- **Docker**: Environment variables in `docker-compose.yml`

Key settings:

```yaml
# Memory management
maxmemory-policy: allkeys-lru
maxmemory: 0  # Uses available memory

# Persistence
save: "900 1 300 10 60 10000"
appendonly: yes
appendfsync: everysec

# Replication
repl-timeout: 60
repl-backlog-size: 10mb

# Performance
tcp-keepalive: 300
timeout: 300
```

## Neo4j Setup

### Local Development (Docker)

Neo4j is included in the development Docker Compose setup:

```bash
# Start Neo4j
docker-compose up -d neo4j

# View logs
docker-compose logs -f neo4j

# Access Neo4j Browser
open http://localhost:7474

# Connect via Cypher Shell
docker-compose exec neo4j cypher-shell
```

### Production (Helm)

Deploy Neo4j using Helm:

```bash
# Add Neo4j Helm repository
helm repo add neo4j https://neo4j.github.io/helm-charts/
helm repo update

# Create namespace
kubectl create namespace neo4j

# Install Neo4j
helm install neo4j neo4j/neo4j \
  -n neo4j \
  -f helm/neo4j/values.yaml \
  -f helm/neo4j/values-prod.yaml

# Check status
helm status neo4j -n neo4j

# Get password
kubectl get secret neo4j-password -n neo4j -o jsonpath="{.data.neo4j-password}" | base64 -d
```

### Production (Terraform + EC2)

Deploy Neo4j on EC2 instances:

```bash
# Navigate to Terraform directory
cd deploy/terraform/aws

# Initialize Terraform
terraform init

# Review plan
terraform plan -var-file=environments/production.tfvars -var=enable_neo4j=true

# Apply changes
terraform apply -var-file=environments/production.tfvars -var=enable_neo4j=true
```

### Configuration

Neo4j configuration is managed via:

- **Helm**: Values files in `helm/neo4j/`
- **Terraform**: User data scripts in `infrastructure/databases/neo4j/`
- **Docker**: Environment variables in `docker-compose.yml`

Key settings:

```yaml
# Memory (r6i.2xlarge = 64GB RAM)
dbms.memory.heap.initial_size: 16G
dbms.memory.heap.max_size: 16G
dbms.memory.pagecache.size: 24G

# Cluster configuration
dbms.mode: CORE
causal_clustering.minimum_core_cluster_size_at_formation: 3

# Transaction configuration
dbms.transaction.timeout: 60s

# Security
dbms.ssl.policy.bolt.enabled: true
dbms.ssl.policy.https.enabled: true
```

## Qdrant Setup

### Local Development (Docker)

Qdrant is included in the development Docker Compose setup:

```bash
# Start Qdrant
docker-compose up -d qdrant

# View logs
docker-compose logs -f qdrant

# Access Qdrant API
curl http://localhost:6333/health

# Access Qdrant Dashboard
open http://localhost:6333/dashboard
```

### Production (Kubernetes)

Deploy Qdrant on Kubernetes:

```bash
# Create namespace
kubectl create namespace qdrant

# Deploy Qdrant
kubectl apply -f k8s/base/qdrant/

# Check status
kubectl get pods -n qdrant

# Get API key
kubectl get secret qdrant-api-key -n qdrant -o jsonpath="{.data.api-key}" | base64 -d
```

### Configuration

Qdrant configuration is managed via:

- **Kubernetes**: ConfigMap in `k8s/base/qdrant/configmap.yaml`
- **Docker**: Environment variables in `docker-compose.yml`

Key settings:

```yaml
# Memory
cache_vector_ram_threshold_gb: 16
optimizers_ram_threshold_gb: 8

# Snapshot
snapshot_interval_hours: 6

# WAL (Write-Ahead Log)
wal_capacity_mb: 256
wal_segments_ahead: 2

# Replication
replication_factor: 2
read_consistency: majority
write_consistency: majority
```

## Connection Strings

### PostgreSQL

**Development:**
```
postgresql://postgres:postgres@localhost:5432/insurance_lead_gen
```

**Production (Terraform):**
```
postgresql://${PGUSER}:${PGPASSWORD}@${PRIMARY_ENDPOINT}:5432/${PGDATABASE}
```

**Production (Kubernetes):**
```
postgresql://${PGUSER}:${PGPASSWORD}@postgres-cluster-rw.postgresql-operator.svc.cluster.local:5432/${PGDATABASE}
```

### Redis

**Development:**
```
redis://localhost:6379
```

**Production (Terraform):**
```
rediss://:${REDIS_PASSWORD}@${PRIMARY_ENDPOINT}:6379
```

**Production (Kubernetes):**
```
rediss://:${REDIS_PASSWORD}@redis-cluster-master.redis-operator.svc.cluster.local:6379
```

### Neo4j

**Development:**
```
bolt://neo4j:password@localhost:7687
```

**Production (Helm):**
```
bolt://${NEO4J_USER}:${NEO4J_PASSWORD}@neo4j-neo4j.neo4j.svc.cluster.local:7687
```

**Production (EC2):**
```
bolt://${NEO4J_USER}:${NEO4J_PASSWORD}@neo4j-nlb-*.elb.amazonaws.com:7687
```

### Qdrant

**Development:**
```
http://localhost:6333
```

**Production (Kubernetes):**
```
http://qdrant.qdrant.svc.cluster.local:6333
```

## Local Development

### Using Docker Compose

All databases are configured in `docker-compose.yml`:

```bash
# Start all databases
docker-compose up -d postgres redis neo4j qdrant nats

# View logs
docker-compose logs -f

# Stop all databases
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=insurance_lead_gen
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Neo4j
NEO4J_AUTH=neo4j/password
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687

# Qdrant
QDRANT_PORT=6333
QDRANT_REST_PORT=6334
```

## Production Deployment

### Using Terraform

For AWS-managed databases (PostgreSQL, Redis):

```bash
# Configure variables
cd deploy/terraform/aws/environments
cp production.tfvars.example production.tfvars

# Edit configuration
vim production.tfvars

# Deploy
cd ..
terraform init
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

### Using Kubernetes Operators

For self-managed databases:

```bash
# Apply operator manifests
kubectl apply -f k8s/operators/

# Apply base configurations
kubectl apply -f k8s/base/

# Verify
kubectl get all -A
```

### Using Helm

For Neo4j:

```bash
# Install Neo4j
helm install neo4j neo4j/neo4j \
  -n neo4j \
  -f helm/neo4j/values-prod.yaml
```

## Troubleshooting

### PostgreSQL

**Connection Refused:**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**Connection Pool Exhausted:**
```bash
# Check connection count
docker-compose exec postgres psql -U postgres -d insurance_lead_gen \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
docker-compose exec postgres psql -U postgres -d insurance_lead_gen \
  -c "SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
```

### Redis

**Memory Pressure:**
```bash
# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Check evictions
docker-compose exec redis redis-cli INFO stats | grep evicted_keys

# Flush if needed (be careful!)
docker-compose exec redis redis-cli FLUSHALL
```

### Neo4j

**Cluster Issues:**
```bash
# Check cluster status
docker-compose exec neo4j cypher-shell \
  "CALL dbms.cluster.overview();"

# Check database health
docker-compose exec neo4j cypher-shell \
  "CALL dbms.cluster.checkConnectivity();"
```

### Qdrant

**Collection Issues:**
```bash
# List collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/insurance-leads

# Delete collection (be careful!)
curl -X DELETE http://localhost:6333/collections/insurance-leads
```

## Next Steps

- [Configure Database Backups](DATABASE_BACKUP_RECOVERY.md)
- [Set Up Monitoring](DATABASE_MONITORING.md)
- [Review Security Settings](DATABASE_SECURITY.md)
- [Schedule Maintenance Tasks](DATABASE_MAINTENANCE.md)
