# Kubernetes Configuration

This directory contains all Kubernetes manifests and configurations for deploying the Insurance Lead Generation Platform.

## Directory Structure

```
k8s/
├── base/                          # Base configurations (all environments)
│   ├── api/                       # API service
│   ├── data-service/              # Data service
│   ├── orchestrator/              # AI orchestrator
│   ├── frontend/                  # Frontend application
│   ├── backend/                   # Backend service
│   ├── postgres/                  # PostgreSQL database
│   ├── redis/                     # Redis cache
│   ├── neo4j/                     # Neo4j graph database
│   ├── qdrant/                    # Qdrant vector database
│   └── kustomization.yaml         # Base Kustomization
├── overlays/
│   ├── dev/                       # Development environment overrides
│   ├── staging/                   # Staging environment overrides
│   └── prod/                      # Production environment overrides
├── infrastructure/                # Infrastructure components
│   ├── namespace.yaml
│   ├── rbac.yaml
│   ├── network-policies.yaml
│   ├── storage-classes.yaml
│   ├── ingress-controller.yaml
│   └── kustomization.yaml
├── dashboard/                     # Kubernetes Dashboard
├── service-mesh/                  # Service mesh configuration (optional)
└── README.md                      # This file
```

## Prerequisites

- Kubernetes cluster (EKS, GKE, or self-hosted)
- kubectl configured to talk to your cluster
- kustomize installed
- Docker registry access for image pushing/pulling

## Quick Start

### 1. Deploy to Development

```bash
cd scripts/k8s
./deploy.sh --env dev
```

### 2. Deploy to Staging

```bash
cd scripts/k8s
./deploy.sh --env staging
```

### 3. Deploy to Production

```bash
cd scripts/k8s
./deploy.sh --env prod
```

### 4. Validate Manifests (Dry Run)

```bash
cd scripts/k8s
./deploy.sh --env dev --dry-run
```

## Management Scripts

### Deployment

Deploy all services to a specific environment:

```bash
./deploy.sh --env <env>
```

Options:
- `--env, -e`: Environment (dev, staging, prod)
- `--dry-run`: Validate without applying
- `--skip-health-check`: Skip post-deployment health checks

### Rollback

Rollback a deployment to a previous revision:

```bash
./rollback.sh --env <env> --deployment <name> [--revision <revision>]
```

Options:
- `--env, -e`: Environment
- `--deployment, -d`: Deployment name
- `--revision, -r`: Specific revision (optional, defaults to previous)

Example:
```bash
./rollback.sh --env prod --deployment api --revision 5
```

### Scale

Manually scale a deployment:

```bash
./scale.sh --env <env> --deployment <name> --replicas <count>
```

Options:
- `--env, -e`: Environment
- `--deployment, -d`: Deployment name
- `--replicas, -r`: Target replica count

Example:
```bash
./scale.sh --env prod --deployment api --replicas 5
```

### Debug

Interactive debugging tool:

```bash
./debug.sh --env <env> [--pod <pod-name>]
```

Options:
- `--env, -e`: Environment
- `--pod, -p`: Specific pod (optional)

Features:
- View logs
- Describe pods
- Get shell access
- View events
- Port forward
- Check resources

### Health Check

Check health of all deployed components:

```bash
./health-check.sh --env <env> [--deep-check]
```

Options:
- `--env, -e`: Environment
- `--deep-check, -d`: Perform detailed health checks

Example:
```bash
./health-check.sh --env prod --deep-check
```

## Environment-Specific Configuration

### Development

- Single replica for most services
- Minimal resource requirements
- Self-signed certificates
- No rate limiting

### Staging

- 2-3 replicas for high availability
- Standard resource requirements
- Let's Encrypt staging certificates
- Basic rate limiting

### Production

- 3+ replicas for production workloads
- High resource allocations
- Let's Encrypt production certificates
- Advanced rate limiting and security
- Pod security policies enforced

## Services

### Application Services

1. **API** (NestJS)
   - Port: 3000
   - Replicas: 2-10 (HPA)
   - Resources: 250m - 1000m CPU, 512Mi - 1Gi RAM

2. **Data Service** (Express)
   - Port: 3001
   - Replicas: 2-8 (HPA)
   - Resources: 200m - 800m CPU, 256Mi - 512Mi RAM

3. **Orchestrator** (AI Workloads)
   - Port: 3002
   - Replicas: 2-5 (HPA)
   - Resources: 500m - 2000m CPU, 1Gi - 2Gi RAM
   - GPU support available

4. **Frontend** (Next.js)
   - Port: 80 (behind nginx)
   - Replicas: 2-3
   - Resources: 100m - 500m CPU, 128Mi - 256Mi RAM

5. **Backend** (Python FastAPI)
   - Port: 8000
   - Replicas: 2-8 (HPA)
   - Resources: 300m - 1500m CPU, 512Mi - 1Gi RAM

### Database Services

1. **PostgreSQL**
   - Port: 5432
   - Replicas: 1-3 (StatefulSet)
   - Resources: 500m - 2000m CPU, 1Gi - 4Gi RAM
   - Storage: 100Gi (fast SSD)

2. **Redis**
   - Port: 6379
   - Replicas: 1-3 (StatefulSet)
   - Resources: 250m - 1000m CPU, 512Mi - 2Gi RAM
   - Storage: 50Gi (fast SSD)

3. **Neo4j**
   - Port: 7474 (HTTP), 7687 (Bolt)
   - Replicas: 1-3 (StatefulSet)
   - Resources: 500m - 2000m CPU, 1Gi - 4Gi RAM
   - Storage: 100Gi (fast SSD)

4. **Qdrant**
   - Port: 6333 (HTTP), 6334 (gRPC)
   - Replicas: 1-2 (StatefulSet)
   - Resources: 500m - 2000m CPU, 1Gi - 4Gi RAM
   - Storage: 100Gi (fast SSD)

## Auto-Scaling

Horizontal Pod Autoscalers (HPA) are configured for:

- API: 2-10 replicas, scale on CPU (70%) and memory (80%)
- Data Service: 2-8 replicas, scale on CPU (70%) and memory (80%)
- Orchestrator: 2-5 replicas, scale on CPU (70%) and memory (80%)
- Backend: 2-8 replicas, scale on CPU (70%) and memory (80%)

Scale-up: Within 60 seconds
Scale-down: After 5 minutes of low utilization

## Networking

### Service Discovery

All services can communicate with each other using their service names:
- `http://api:80`
- `http://data-service:80`
- `http://orchestrator:80`
- `http://frontend:80`
- `http://backend:80`
- `postgresql://postgres:5432`
- `redis://redis:6379`
- `bolt://neo4j:7687`
- `http://qdrant:6333`

### Ingress

External access is configured via NGINX Ingress Controller:

Development: `http://*.dev.internal`
Staging: `https://*.staging.insurance-platform.com`
Production: `https://*.insurance-platform.com`

### Network Policies

Default deny-all policy is enforced. Only explicitly allowed traffic can flow between services.

## Storage

### Storage Classes

- `fast-ssd`: GP3 SSD (3000 IOPS) - for databases
- `standard-ssd`: GP3 SSD (3000 IOPS) - for general use
- `standard-hdd`: GP3 SSD (500 IOPS) - for backups/logs
- `io2-high-performance`: IO2 SSD (10000 IOPS) - for high-performance databases
- `efs`: EFS file system - for shared storage

## Security

### RBAC

Least-privilege RBAC is configured for each service. Service accounts have minimal necessary permissions.

### Pod Security

- All pods run as non-root user (UID 1000+)
- Read-only root filesystem
- All capabilities dropped
- Seccomp profiles enabled

### Secrets Management

Secrets should be managed using:
- AWS Secrets Manager (EKS)
- Google Secret Manager (GKE)
- Kubernetes secrets (development)

## Monitoring

### Metrics

All services expose Prometheus metrics on port 9090.

### Logging

Structured logging is configured with trace context for distributed tracing.

### Tracing

OpenTelemetry integration with Jaeger for distributed tracing.

## Troubleshooting

### View Logs

```bash
kubectl logs -f -n insurance-lead-gen-<env> <pod-name>
```

### Describe Pod

```bash
kubectl describe pod -n insurance-lead-gen-<env> <pod-name>
```

### Check Events

```bash
kubectl get events -n insurance-lead-gen-<env> --sort-by='.lastTimestamp'
```

### Port Forward

```bash
kubectl port-forward -n insurance-lead-gen-<env> <pod-name> 8080:3000
```

### Get Shell Access

```bash
kubectl exec -it -n insurance-lead-gen-<env> <pod-name> -- sh
```

## Maintenance

### Rolling Updates

Deployments are configured for rolling updates. Update image tags and run:

```bash
kustomize build overlays/<env> | kubectl apply -f -
```

### Database Backups

PostgreSQL backups are automated via CronJob (daily at 2 AM).

Manual backup:
```bash
kubectl exec -n insurance-lead-gen-<env> postgres-0 -- pg_dump -U postgres insurance_lead_gen > backup.sql
```

### Certificate Renewal

Let's Encrypt certificates are configured for automatic renewal.

## Best Practices

1. **Always dry-run first**: Use `--dry-run` to validate changes
2. **Check health after deployment**: Use the health-check script
3. **Monitor resources**: Use `kubectl top` to track usage
4. **Review logs regularly**: Check for errors and warnings
5. **Update images carefully**: Test in dev/staging before prod
6. **Use resource limits**: Prevent resource exhaustion
7. **Set appropriate replicas**: Balance cost and availability
8. **Monitor HPA**: Ensure auto-scaling works as expected

## Support

For issues or questions:
- Check logs: `./debug.sh --env <env>`
- Run health check: `./health-check.sh --env <env> --deep-check`
- Review documentation: `docs/KUBERNETES_*.md`
