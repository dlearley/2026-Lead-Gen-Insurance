# Kubernetes Deployment Guide

This guide provides detailed instructions for deploying and managing applications on Kubernetes.

## Table of Contents

1. [Deployment Strategies](#deployment-strategies)
2. [Using Kustomize](#using-kustomize)
3. [Using Helm](#using-helm)
4. [Updating Deployments](#updating-deployments)
5. [Rolling Updates](#rolling-updates)
6. [Rollbacks](#rollbacks)
7. [Blue-Green Deployments](#blue-green-deployments)
8. [Canary Deployments](#canary-deployments)
9. [Best Practices](#best-practices)

## Deployment Strategies

### Overview

The platform supports multiple deployment strategies:

1. **Rolling Updates** - Default strategy, gradual replacement
2. **Blue-Green** - Zero-downtime deployments with instant rollback
3. **Canary** - Gradual traffic shift for risk mitigation

### Strategy Selection

| Strategy | Use Case | Downtime | Complexity |
|----------|-----------|-----------|------------|
| Rolling Updates | Standard deployments | None | Low |
| Blue-Green | Critical production systems | None | Medium |
| Canary | High-risk changes | None | High |

## Using Kustomize

### Kustomize Overview

Kustomize is a Kubernetes-native configuration management tool that enables:

- Base manifest definitions
- Environment-specific overrides
- Patching and customizing resources
- Image tag management

### Directory Structure

```
k8s/
├── base/                    # Common manifests
│   ├── api/
│   ├── data-service/
│   └── ...
├── overlays/
│   ├── dev/                # Dev overrides
│   ├── staging/            # Staging overrides
│   └── prod/               # Production overrides
```

### Building Manifests

```bash
# Build base manifests
kustomize build k8s/base

# Build with overlay
kustomize build k8s/overlays/prod

# Build and output to file
kustomize build k8s/overlays/prod > prod-manifests.yaml
```

### Validating Manifests

```bash
# Dry-run validation
kustomize build k8s/overlays/prod | kubectl apply --dry-run=client -f -

# Detailed validation
kustomize build k8s/overlays/prod | kubeval --strict
```

### Applying Manifests

```bash
# Apply all at once
kustomize build k8s/overlays/prod | kubectl apply -f -

# Apply with create timeout
kustomize build k8s/overlays/prod | kubectl apply -f --timeout=5m
```

### Using Deployment Script

The deployment script automates the process:

```bash
# Deploy to environment
./scripts/k8s/deploy.sh --env prod

# Dry-run
./scripts/k8s/deploy.sh --env prod --dry-run

# Skip health checks
./scripts/k8s/deploy.sh --env prod --skip-health-check
```

## Using Helm

### Helm Overview

Helm is a package manager for Kubernetes. While Kustomize is the primary method, Helm can be used for third-party dependencies.

### Installing Charts

```bash
# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Install chart
helm install my-release stable/nginx-ingress

# Install with values file
helm install my-release stable/nginx-ingress -f values.yaml

# Install specific version
helm install my-release stable/nginx-ingress --version 1.36.0
```

### Customizing Charts

```yaml
# values.yaml
replicaCount: 3

image:
  repository: insurance-lead-gen/api
  tag: prod

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

```bash
# Install with custom values
helm install my-release ./chart -f values.yaml
```

### Upgrading Releases

```bash
# Upgrade release
helm upgrade my-release ./chart

# Upgrade with new values
helm upgrade my-release ./chart -f values.yaml

# Upgrade with set flags
helm upgrade my-release ./chart --set replicaCount=5
```

### Rolling Back Helm Releases

```bash
# List releases
helm list

# List revisions
helm history my-release

# Rollback to previous
helm rollback my-release

# Rollback to specific revision
helm rollback my-release 5
```

### Uninstalling Releases

```bash
# Uninstall release
helm uninstall my-release

# Uninstall and keep history
helm uninstall my-release --keep-history
```

## Updating Deployments

### Image Updates

```bash
# Update image in deployment
kubectl set image deployment/api api=insurance-lead-gen/api:v1.2.3 -n insurance-lead-gen-prod

# Update all deployments in namespace
kubectl set image deployments -n insurance-lead-gen-prod \
  api=insurance-lead-gen/api:v1.2.3 \
  data-service=insurance-lead-gen/data-service:v1.2.3
```

### ConfigMap Updates

```bash
# Edit ConfigMap
kubectl edit configmap api-config -n insurance-lead-gen-prod

# Or apply from file
kubectl apply -f k8s/base/api/configmap.yaml -n insurance-lead-gen-prod

# Restart pods to pick up changes
kubectl rollout restart deployment/api -n insurance-lead-gen-prod
```

### Secret Updates

```bash
# Edit secret
kubectl edit secret api-secrets -n insurance-lead-gen-prod

# Or create new secret
kubectl create secret generic api-secrets \
  --from-literal=API_KEY=new-key \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods
kubectl rollout restart deployment/api -n insurance-lead-gen-prod
```

## Rolling Updates

### Rolling Update Process

Kubernetes performs rolling updates automatically:

1. New pods are created
2. Old pods are terminated
3. Process repeats until all pods are updated
4. Health checks ensure new pods are ready before old ones are terminated

### Configure Rolling Update

```yaml
# deployment.yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Max additional pods
      maxUnavailable: 25%  # Max unavailable pods
```

### Monitor Rolling Update

```bash
# Watch rollout status
kubectl rollout status deployment/api -n insurance-lead-gen-prod

# Watch in real-time
watch kubectl get pods -n insurance-lead-gen-prod

# Get detailed status
kubectl describe deployment api -n insurance-lead-gen-prod
```

### Rolling Update with Deployment Script

```bash
# Update image tags in overlay
# Then deploy
./scripts/k8s/deploy.sh --env prod
```

## Rollbacks

### Immediate Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/api -n insurance-lead-gen-prod

# Rollback to specific revision
kubectl rollout undo deployment/api -n insurance-lead-gen-prod --to-revision=5
```

### Using Rollback Script

```bash
# List revisions
kubectl rollout history deployment/api -n insurance-lead-gen-prod

# Rollback to previous
./scripts/k8s/rollback.sh --env prod --deployment api

# Rollback to specific revision
./scripts/k8s/rollback.sh --env prod --deployment api --revision 5
```

### Rollback Best Practices

1. **Review changes** - Understand what you're rolling back
2. **Check logs** - Review logs from failed deployment
3. **Document** - Document the rollback reason
4. **Test** - Verify rollback was successful
5. **Investigate** - Find root cause of failure

### Rollback Procedure

```bash
# 1. Check current status
kubectl get pods -n insurance-lead-gen-prod

# 2. View deployment history
kubectl rollout history deployment/api -n insurance-lead-gen-prod

# 3. Rollback
kubectl rollout undo deployment/api -n insurance-lead-gen-prod

# 4. Monitor rollout
kubectl rollout status deployment/api -n insurance-lead-gen-prod

# 5. Verify
./scripts/k8s/health-check.sh --env prod
```

## Blue-Green Deployments

### Overview

Blue-Green deployment maintains two identical production environments:

- **Blue**: Current production version
- **Green**: New version

Traffic is switched from Blue to Green, enabling instant rollback.

### Implementing Blue-Green

```bash
# 1. Deploy green version
kubectl apply -f k8s/overlays/prod-green/

# 2. Wait for green to be ready
kubectl rollout status deployment/api-green -n insurance-lead-gen-prod

# 3. Switch traffic
kubectl patch service api -n insurance-lead-gen-prod -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Monitor green
./scripts/k8s/health-check.sh --env prod

# 5. If issues, rollback instantly
kubectl patch service api -n insurance-lead-gen-prod -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Service Definition for Blue-Green

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
    version: blue  # Switch to green for traffic
  ports:
  - port: 80
    targetPort: 3000
```

## Canary Deployments

### Overview

Canary deployment gradually shifts traffic to new version:

1. Deploy new version alongside old version
2. Shift small percentage of traffic to new version
3. Monitor metrics and errors
4. Gradually increase traffic to new version
5. Complete switch or rollback

### Implementing Canary

```yaml
# canary-deployment.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-canary
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 10    # 10% traffic to canary
      - pause: {duration: 10m}
      - setWeight: 30    # 30% traffic to canary
      - pause: {duration: 10m}
      - setWeight: 50    # 50% traffic to canary
      - pause: {duration: 10m}
      - setWeight: 100   # 100% traffic to canary
      canaryService: api-canary
      stableService: api
  selector:
    matchLabels:
      app: api-canary
  template:
    metadata:
      labels:
        app: api-canary
        version: canary
    spec:
      containers:
      - name: api
        image: insurance-lead-gen/api:canary
```

### Monitoring Canary

```bash
# Watch rollout status
kubectl argo rollouts get rollout api-canary -n insurance-lead-gen-prod --watch

# Check metrics
kubectl top pods -n insurance-lead-gen-prod -l version=canary

# View logs
kubectl logs -f -n insurance-lead-gen-prod -l version=canary
```

### Manual Canary with Service Split

```yaml
# Split traffic between blue (90%) and canary (10%)
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-vs
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: blue
      weight: 90
    - destination:
        host: api
        subset: canary
      weight: 10
```

## Best Practices

### 1. Always Test First

```bash
# Test in dev
./scripts/k8s/deploy.sh --env dev

# Test in staging
./scripts/k8s/deploy.sh --env staging

# Then deploy to prod
./scripts/k8s/deploy.sh --env prod
```

### 2. Use Semantic Versioning

- `1.2.3` - Major.Minor.Patch
- Increment appropriately based on changes
- Track versions in Git tags

### 3. Tag Docker Images

```bash
# Use semantic version tags
docker build -t insurance-lead-gen/api:1.2.3 ./apps/api
docker tag insurance-lead-gen/api:1.2.3 insurance-lead-gen/api:latest
docker push insurance-lead-gen/api:1.2.3
docker push insurance-lead-gen/api:latest
```

### 4. Keep Rollback History

```bash
# Keep last 10 revisions
kubectl patch deployment api -n insurance-lead-gen-prod \
  -p '{"spec":{"revisionHistoryLimit":10}}'
```

### 5. Use Resource Limits

```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 6. Configure Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 7. Enable Auto-Restart on Config Changes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    # Force restart on config change
    configmap.reloader.stakater.com/reload: "api-config"
spec:
  ...
```

### 8. Use Labels and Annotations

```yaml
metadata:
  labels:
    app: api
    version: v1.2.3
    environment: production
  annotations:
    kubernetes.io/change-cause: "Updated to v1.2.3 for feature X"
```

### 9. Monitor Deployments

```bash
# Watch pods
watch kubectl get pods -n insurance-lead-gen-prod

# Check HPA
kubectl get hpa -n insurance-lead-gen-prod --watch

# View events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp'
```

### 10. Use Deployment Scripts

The deployment scripts automate and standardize the process:

```bash
# Always use scripts for consistency
./scripts/k8s/deploy.sh --env prod
./scripts/k8s/health-check.sh --env prod
./scripts/k8s/debug.sh --env prod
```

### 11. Document Changes

```bash
# Change-cause annotation
kubectl annotate deployment api \
  -n insurance-lead-gen-prod \
  kubernetes.io/change-cause="Fixed bug in lead scoring, updated to v1.2.4"
```

### 12. Rollback Plan

Always have a rollback plan before deploying:

1. Document changes
2. Set success criteria
3. Define rollback triggers
4. Prepare rollback command
5. Test rollback procedure

### 13. Gradual Rollout in Production

For major changes, consider gradual rollout:

1. Deploy to 1 replica
2. Monitor for 30 minutes
3. Scale to 2 replicas
4. Monitor for 1 hour
5. Scale to full replica count

### 14. Use Feature Flags

Deploy code behind feature flags:

```javascript
if (featureFlags.NEW_LEAD_SCORING) {
  // New code
} else {
  // Old code
}
```

This allows instant rollback by toggling the flag.

### 15. Monitor Post-Deployment

```bash
# Check error rates
./scripts/k8s/debug.sh --env prod
kubectl logs -f -n insurance-lead-gen-prod -l app=api | grep ERROR

# Check resource usage
kubectl top pods -n insurance-lead-gen-prod -l app=api
```

## Troubleshooting

### Deployment Stuck in Progress

```bash
# Check deployment status
kubectl describe deployment api -n insurance-lead-gen-prod

# Check events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp'

# Force restart
kubectl rollout restart deployment/api -n insurance-lead-gen-prod
```

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod api-xxx -n insurance-lead-gen-prod

# View logs
kubectl logs api-xxx -n insurance-lead-gen-prod

# Check image pull
kubectl describe pod api-xxx -n insurance-lead-gen-prod | grep Image
```

### Rollback Failed

```bash
# Check revision history
kubectl rollout history deployment/api -n insurance-lead-gen-prod

# Rollback to known good revision
kubectl rollout undo deployment/api -n insurance-lead-gen-prod --to-revision=3
```

## Next Steps

- [Kubernetes Networking Guide](./KUBERNETES_NETWORKING.md)
- [Kubernetes Security Guide](./KUBERNETES_SECURITY.md)
- [Kubernetes Troubleshooting Guide](./KUBERNETES_TROUBLESHOOTING.md)
