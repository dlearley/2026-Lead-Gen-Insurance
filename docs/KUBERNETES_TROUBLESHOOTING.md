# Kubernetes Troubleshooting Guide

This guide covers common issues and solutions for troubleshooting Kubernetes deployments.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Pod Issues](#pod-issues)
3. [Deployment Issues](#deployment-issues)
4. [Service Issues](#service-issues)
5. [Storage Issues](#storage-issues)
6. [Network Issues](#network-issues)
7. [Performance Issues](#performance-issues)
8. [Debugging Techniques](#debugging-techniques)

## Common Issues

### Issue: Pod Stuck in Pending State

**Symptoms:**
```bash
kubectl get pods -n insurance-lead-gen-prod
NAME           READY   STATUS    RESTARTS   AGE
api-xxx        0/1     Pending   0          5m
```

**Possible Causes:**
1. Insufficient resources (CPU/memory)
2. Node affinity/anti-affinity constraints
3. Taints preventing scheduling
4. PVC not bound

**Solutions:**

```bash
# 1. Check pod events
kubectl describe pod api-xxx -n insurance-lead-gen-prod

# 2. Check available resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Check PVC status
kubectl get pvc -n insurance-lead-gen-prod

# 4. Check node selectors and tolerations
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.nodeName}'

# 5. Add more nodes or scale down other workloads
kubectl scale deployment api -n insurance-lead-gen-prod --replicas=2
```

### Issue: Pod CrashLoopBackOff

**Symptoms:**
```bash
kubectl get pods -n insurance-lead-gen-prod
NAME           READY   STATUS             RESTARTS   AGE
api-xxx        0/1     CrashLoopBackOff   5          10m
```

**Possible Causes:**
1. Application error
2. Failed health checks
3. Missing environment variables
4. Dependency not available

**Solutions:**

```bash
# 1. Check pod logs
kubectl logs api-xxx -n insurance-lead-gen-prod

# 2. Check previous container logs
kubectl logs api-xxx -n insurance-lead-gen-prod --previous

# 3. Check events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp' | grep api-xxx

# 4. Describe pod
kubectl describe pod api-xxx -n insurance-lead-gen-prod

# 5. Get shell access (if container starts briefly)
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- sh

# 6. Check health probe configuration
kubectl get pod api-xxx -n insurance-lead-gen-prod -o yaml | grep -A 10 "livenessProbe"
```

### Issue: Image Pull Errors

**Symptoms:**
```bash
kubectl describe pod api-xxx -n insurance-lead-gen-prod
# Output: Failed to pull image "insurance-lead-gen/api:prod": rpc error: code = Unknown desc = Error response from daemon: pull access denied
```

**Possible Causes:**
1. Invalid image tag
2. Authentication issues
3. Private repository access
4. Network connectivity

**Solutions:**

```bash
# 1. Verify image exists
docker pull insurance-lead-gen/api:prod

# 2. Check imagePullSecrets
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.imagePullSecrets}'

# 3. Create/update imagePullSecret
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n insurance-lead-gen-prod

# 4. Add imagePullSecrets to deployment
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}' \
  -n insurance-lead-gen-prod
```

## Pod Issues

### Pod Not Ready

**Diagnosis:**

```bash
# Check pod status
kubectl get pods -n insurance-lead-gen-prod -o wide

# Check pod conditions
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.status.conditions}'

# Describe pod
kubectl describe pod api-xxx -n insurance-lead-gen-prod

# Check events
kubectl get events -n insurance-lead-gen-prod --field-selector involvedObject.name=api-xxx
```

**Solutions:**

```bash
# 1. Check if pod is scheduled
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.nodeName}'

# 2. Check resource usage
kubectl top pod api-xxx -n insurance-lead-gen-prod

# 3. Check for init container issues
kubectl logs api-xxx -n insurance-lead-gen-prod -c <init-container-name>

# 4. Check readiness probe
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].readinessProbe}'

# 5. Manually check endpoint
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://localhost:3000/health/ready
```

### High Pod Restarts

**Diagnosis:**

```bash
# Check restart count
kubectl get pods -n insurance-lead-gen-prod

# Get restart history
kubectl describe pod api-xxx -n insurance-lead-gen-prod | grep -A 5 "State"

# Check logs for patterns
kubectl logs api-xxx -n insurance-lead-gen-prod | grep -i error
```

**Solutions:**

```bash
# 1. Check resource limits
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].resources}'

# 2. Increase limits if OOMKilled
kubectl set resources deployment api \
  -n insurance-lead-gen-prod \
  --limits=cpu=2000m,memory=2Gi

# 3. Check application logs for errors
kubectl logs api-xxx -n insurance-lead-gen-prod --tail=100

# 4. Check liveness probe configuration
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].livenessProbe}'

# 5. Adjust probe timeouts
kubectl set image deployment api insurance-lead-gen/api:latest -n insurance-lead-gen-prod
# Then update probe configuration in deployment YAML
```

### Pod High CPU/Memory

**Diagnosis:**

```bash
# Check resource usage
kubectl top pods -n insurance-lead-gen-prod

# Check container limits
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].resources}'
```

**Solutions:**

```bash
# 1. Check if pod is throttled
kubectl describe pod api-xxx -n insurance-lead-gen-prod | grep -i throttled

# 2. Increase limits
kubectl set resources deployment api \
  -n insurance-lead-gen-prod \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2000m,memory=2Gi

# 3. Scale out horizontally
kubectl scale deployment api -n insurance-lead-gen-prod --replicas=5

# 4. Check application for memory leaks
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- ps aux
```

## Deployment Issues

### Deployment Stuck in Progress

**Diagnosis:**

```bash
# Check deployment status
kubectl get deployment api -n insurance-lead-gen-prod

# Describe deployment
kubectl describe deployment api -n insurance-lead-gen-prod

# Check rollout status
kubectl rollout status deployment api -n insurance-lead-gen-prod
```

**Solutions:**

```bash
# 1. Check for image pull errors
kubectl get pods -n insurance-lead-gen-prod | grep ImagePullBackOff

# 2. Check resource constraints
kubectl describe nodes | grep -A 10 "Allocated resources"

# 3. Pause rollout for debugging
kubectl rollout pause deployment api -n insurance-lead-gen-prod

# 4. Resume rollout
kubectl rollout resume deployment api -n insurance-lead-gen-prod

# 5. Rollback if needed
kubectl rollout undo deployment api -n insurance-lead-gen-prod
```

### Deployment Not Updating

**Diagnosis:**

```bash
# Check deployment revision
kubectl rollout history deployment api -n insurance-lead-gen-prod

# Check current pods
kubectl get pods -n insurance-lead-gen-prod -l app=api

# Describe deployment
kubectl describe deployment api -n insurance-lead-gen-prod
```

**Solutions:**

```bash
# 1. Force update
kubectl rollout restart deployment api -n insurance-lead-gen-prod

# 2. Update image tag
kubectl set image deployment api api=insurance-lead-gen/api:v1.2.4 -n insurance-lead-gen-prod

# 3. Update config
kubectl apply -f k8s/base/api/configmap.yaml -n insurance-lead-gen-prod
kubectl rollout restart deployment api -n insurance-lead-gen-prod

# 4. Check maxSurge/maxUnavailable
kubectl get deployment api -n insurance-lead-gen-prod -o jsonpath='{.spec.strategy}'
```

### HPA Not Scaling

**Diagnosis:**

```bash
# Check HPA status
kubectl get hpa -n insurance-lead-gen-prod

# Describe HPA
kubectl describe hpa api -n insurance-lead-gen-prod

# Check metrics server
kubectl get pods -n kube-system -l k8s-app=metrics-server
```

**Solutions:**

```bash
# 1. Check if metrics server is running
kubectl top pods -n insurance-lead-gen-prod

# 2. Check resource requests/limits
kubectl get deployment api -n insurance-lead-gen-prod -o jsonpath='{.spec.template.spec.containers[0].resources}'

# 3. Check if thresholds are met
kubectl top pod api-xxx -n insurance-lead-gen-prod

# 4. Adjust HPA parameters
kubectl autoscale deployment api \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n insurance-lead-gen-prod

# 5. Check HPA conditions
kubectl get hpa api -n insurance-lead-gen-prod -o jsonpath='{.status.conditions}'
```

## Service Issues

### Service Not Accessible

**Diagnosis:**

```bash
# Check service
kubectl get svc api -n insurance-lead-gen-prod

# Describe service
kubectl describe svc api -n insurance-lead-gen-prod

# Check endpoints
kubectl get endpoints api -n insurance-lead-gen-prod
```

**Solutions:**

```bash
# 1. Check if selector matches pods
kubectl get pods -n insurance-lead-gen-prod -l app=api

# 2. Check if pods are ready
kubectl get pods -n insurance-lead-gen-prod -l app=api

# 3. Verify port configuration
kubectl get svc api -n insurance-lead-gen-prod -o yaml | grep -A 5 "ports:"

# 4. Test from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -qO- http://api:80/health

# 5. Check network policies
kubectl get networkpolicy -n insurance-lead-gen-prod
```

### Service DNS Not Resolving

**Diagnosis:**

```bash
# Check DNS from pod
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup api

# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

**Solutions:**

```bash
# 1. Check /etc/resolv.conf
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- cat /etc/resolv.conf

# 2. Test full DNS name
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup api.insurance-lead-gen-prod.svc.cluster.local

# 3. Test with dig
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- dig api.insurance-lead-gen-prod.svc.cluster.local

# 4. Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# 5. Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system
```

### LoadBalancer Not Provisioning

**Diagnosis:**

```bash
# Check service status
kubectl get svc api -n insurance-lead-gen-prod

# Describe service
kubectl describe svc api -n insurance-lead-gen-prod

# Check events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp'
```

**Solutions:**

```bash
# 1. Check cloud provider load balancer (AWS)
aws elb describe-load-balancers

# 2. Check cloud provider load balancer (GCP)
gcloud compute forwarding-rules list

# 3. Verify service type
kubectl get svc api -n insurance-lead-gen-prod -o jsonpath='{.spec.type}'

# 4. Check annotations
kubectl get svc api -n insurance-lead-gen-prod -o jsonpath='{.metadata.annotations}'

# 5. Delete and recreate service (last resort)
kubectl delete svc api -n insurance-lead-gen-prod
kubectl apply -f k8s/base/api/service.yaml -n insurance-lead-gen-prod
```

## Storage Issues

### PVC Stuck in Pending

**Diagnosis:**

```bash
# Check PVC status
kubectl get pvc -n insurance-lead-gen-prod

# Describe PVC
kubectl describe pvc postgres-data-postgres-0 -n insurance-lead-gen-prod

# Check events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp'
```

**Solutions:**

```bash
# 1. Check storage class
kubectl get sc

# 2. Check available PV
kubectl get pv

# 3. Check if storage class is default
kubectl get sc fast-ssd -o jsonpath='{.metadata.annotations}'

# 4. Check provisioner
kubectl get sc fast-ssd -o jsonpath='{.provisioner}'

# 5. Manually provision PV (if static)
kubectl apply -f manual-pv.yaml
```

### Volume Mount Issues

**Diagnosis:**

```bash
# Check pod events
kubectl describe pod postgres-0 -n insurance-lead-gen-prod

# Check pod configuration
kubectl get pod postgres-0 -n insurance-lead-gen-prod -o jsonpath='{.spec.volumes}'

# Check volume mounts
kubectl get pod postgres-0 -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].volumeMounts}'
```

**Solutions:**

```bash
# 1. Check if PVC exists
kubectl get pvc postgres-data-postgres-0 -n insurance-lead-gen-prod

# 2. Check if PVC is bound
kubectl get pvc postgres-data-postgres-0 -n insurance-lead-gen-prod -o jsonpath='{.status.phase}'

# 3. Check storage class permissions
kubectl describe sc fast-ssd

# 4. Check volume permissions (if using hostPath)
kubectl get pod postgres-0 -n insurance-lead-gen-prod -o yaml | grep -A 10 "volumeMounts:"

# 5. Recreate pod to remount volume
kubectl delete pod postgres-0 -n insurance-lead-gen-prod
```

### Insufficient Storage

**Diagnosis:**

```bash
# Check PV capacity
kubectl get pv

# Check PVC capacity
kubectl get pvc -n insurance-lead-gen-prod

# Check node storage
kubectl describe nodes | grep -A 5 "Allocated resources"
```

**Solutions:**

```bash
# 1. Expand PVC (if storage class allows)
kubectl patch pvc postgres-data-postgres-0 \
  -n insurance-lead-gen-prod \
  -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# 2. Check if expansion is supported
kubectl get sc fast-ssd -o jsonpath='{.allowVolumeExpansion}'

# 3. Add more storage nodes
# (Cloud provider specific)

# 4. Delete old data and reclaim space
kubectl exec -it postgres-0 -n insurance-lead-gen-prod -- vacuumdb -z

# 5. Use different storage class with more capacity
# Update PVC spec with new storage class
```

## Network Issues

### Pod Cannot Reach Service

**Diagnosis:**

```bash
# Check service endpoints
kubectl get endpoints api -n insurance-lead-gen-prod

# Test connectivity
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://data-service:3001/health

# Check network policies
kubectl get networkpolicy -n insurance-lead-gen-prod
```

**Solutions:**

```bash
# 1. Verify service exists
kubectl get svc data-service -n insurance-lead-gen-prod

# 2. Check endpoints
kubectl get endpoints data-service -n insurance-lead-gen-prod

# 3. Check network policy
kubectl describe networkpolicy api-to-data-service -n insurance-lead-gen-prod

# 4. Test with IP
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://<pod-ip>:3001/health

# 5. Check DNS
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup data-service
```

### Ingress Not Routing

**Diagnosis:**

```bash
# Check ingress
kubectl get ingress -n insurance-lead-gen-prod

# Describe ingress
kubectl describe ingress api-ingress -n insurance-lead-gen-prod

# Check ingress controller
kubectl get pods -n ingress-nginx
```

**Solutions:**

```bash
# 1. Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# 2. Check ingress configuration
kubectl get ingress api-ingress -n insurance-lead-gen-prod -o yaml

# 3. Test with direct service
kubectl port-forward svc/api 8080:80 -n insurance-lead-gen-prod

# 4. Check load balancer (AWS)
aws elb describe-load-balancers

# 5. Check DNS resolution
nslookup api.insurance-platform.com
```

### Network Policy Blocking Traffic

**Diagnosis:**

```bash
# List network policies
kubectl get networkpolicy -n insurance-lead-gen-prod

# Check specific policy
kubectl describe networkpolicy api-to-data-service -n insurance-lead-gen-prod

# Test connectivity
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://data-service:3001/health
```

**Solutions:**

```bash
# 1. Verify policy exists
kubectl get networkpolicy api-to-data-service -n insurance-lead-gen-prod

# 2. Check policy rules
kubectl get networkpolicy api-to-data-service -n insurance-lead-gen-prod -o yaml

# 3. Temporarily delete policy to test
kubectl delete networkpolicy api-to-data-service -n insurance-lead-gen-prod

# 4. Check pod labels
kubectl get pods -n insurance-lead-gen-prod -l app=api --show-labels

# 5. Update policy with correct selectors
kubectl apply -f k8s/infrastructure/network-policies.yaml
```

## Performance Issues

### High CPU Usage

**Diagnosis:**

```bash
# Check pod CPU usage
kubectl top pods -n insurance-lead-gen-prod

# Check node CPU usage
kubectl top nodes

# Check resource limits
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].resources}'
```

**Solutions:**

```bash
# 1. Identify high CPU pods
kubectl top pods -n insurance-lead-gen-prod --sort-by=cpu

# 2. Increase limits
kubectl set resources deployment api \
  -n insurance-lead-gen-prod \
  --limits=cpu=2000m,memory=2Gi

# 3. Scale horizontally
kubectl scale deployment api -n insurance-lead-gen-prod --replicas=5

# 4. Optimize application
# Review application code and optimize

# 5. Use node affinity for CPU-intensive workloads
kubectl patch deployment api -n insurance-lead-gen-prod -p '{"spec":{"template":{"spec":{"nodeSelector":{"node-type":"application"}}}}}'
```

### High Memory Usage

**Diagnosis:**

```bash
# Check pod memory usage
kubectl top pods -n insurance-lead-gen-prod

# Check for OOMKilled
kubectl get pods -n insurance-lead-gen-prod | grep OOMKilled

# Check memory limits
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.spec.containers[0].resources}'
```

**Solutions:**

```bash
# 1. Check for memory leaks
kubectl logs api-xxx -n insurance-lead-gen-prod | grep -i memory

# 2. Increase memory limits
kubectl set resources deployment api \
  -n insurance-lead-gen-prod \
  --limits=cpu=2000m,memory=2Gi

# 3. Scale horizontally
kubectl scale deployment api -n insurance-lead-gen-prod --replicas=5

# 4. Check application memory usage
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- ps aux

# 5. Restart pods to free memory
kubectl rollout restart deployment api -n insurance-lead-gen-prod
```

### Slow Application Response

**Diagnosis:**

```bash
# Check pod CPU/memory
kubectl top pods -n insurance-lead-gen-prod

# Check network latency
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- ping data-service

# Check application logs
kubectl logs api-xxx -n insurance-lead-gen-prod | tail -100
```

**Solutions:**

```bash
# 1. Check for bottlenecks
kubectl top pods -n insurance-lead-gen-prod --sort-by=cpu

# 2. Check database performance
kubectl exec -it postgres-0 -n insurance-lead-gen-prod -- psql -c "SELECT * FROM pg_stat_activity;"

# 3. Check cache hit rate
kubectl exec -it redis-0 -n insurance-lead-gen-prod -- redis-cli INFO stats

# 4. Scale horizontally
kubectl scale deployment api -n insurance-lead-gen-prod --replicas=5

# 5. Check network policies
kubectl get networkpolicy -n insurance-lead-gen-prod

# 6. Use distributed tracing
# Check Jaeger traces
```

## Debugging Techniques

### Interactive Debugging

```bash
# 1. Start debug pod
kubectl run debug-pod -it --rm --image=busybox --restart=Never -- sh

# 2. Debug running pod
kubectl debug -it api-xxx -n insurance-lead-gen-prod --image=busybox --target=api -- sh

# 3. Debug with profile
kubectl debug -it api-xxx -n insurance-lead-gen-prod --profile=sysadmin -- sh
```

### Port Forwarding

```bash
# Forward local port to pod
kubectl port-forward api-xxx 8080:3000 -n insurance-lead-gen-prod

# Forward local port to service
kubectl port-forward svc/api 8080:80 -n insurance-lead-gen-prod

# Access application locally
curl http://localhost:8080/health
```

### Log Analysis

```bash
# Stream logs
kubectl logs -f api-xxx -n insurance-lead-gen-prod

# Filter logs
kubectl logs api-xxx -n insurance-lead-gen-prod | grep ERROR

# Multiple pods
kubectl logs -f -l app=api -n insurance-lead-gen-prod

# Previous container
kubectl logs api-xxx -n insurance-lead-gen-prod --previous

# Timestamp filter
kubectl logs --since=1h api-xxx -n insurance-lead-gen-prod
```

### Event Analysis

```bash
# Get all events
kubectl get events -n insurance-lead-gen-prod --sort-by='.lastTimestamp'

# Filter by pod
kubectl get events -n insurance-lead-gen-prod --field-selector involvedObject.name=api-xxx

# Filter by type
kubectl get events -n insurance-lead-gen-prod --field-selector type=Warning

# Watch events
kubectl get events -n insurance-lead-gen-prod --watch
```

### Resource Inspection

```bash
# Describe resource
kubectl describe pod api-xxx -n insurance-lead-gen-prod

# Get YAML
kubectl get pod api-xxx -n insurance-lead-gen-prod -o yaml

# Get JSON
kubectl get pod api-xxx -n insurance-lead-gen-prod -o json

# Get specific field
kubectl get pod api-xxx -n insurance-lead-gen-prod -o jsonpath='{.status.phase}'
```

### Network Debugging

```bash
# DNS resolution
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup data-service

# Test connectivity
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://data-service:3001/health

# Ping
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- ping data-service

# Trace route
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- traceroute data-service

# Check ports
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- netstat -tlnp
```

### Using Debug Script

The debug script provides interactive debugging:

```bash
cd scripts/k8s
./debug.sh --env prod
```

Features:
- Select pod
- View logs
- Describe pod
- Get shell access
- View events
- Port forward
- Check resources

## Best Practices

1. **Start with events** - Check events first for any issue
2. **Check logs** - Always review application logs
3. **Use describe** - Get detailed information about resources
4. **Test locally** - Test connectivity from within cluster
5. **Check health** - Verify health probes are working
6. **Monitor resources** - Use `kubectl top` to track usage
7. **Use labels** - Filter resources effectively
8. **Document issues** - Keep record of common problems
9. **Automate** - Use health-check script regularly
10. **Escalate** - Don't hesitate to escalate complex issues

## Getting Help

1. **Kubernetes Documentation** - https://kubernetes.io/docs/
2. **Debug Pods** - https://kubernetes.io/docs/tasks/debug/debug-application/
3. **Troubleshoot Services** - https://kubernetes.io/docs/tasks/debug/debug-application/
4. **Cluster Debugging** - https://kubernetes.io/docs/tasks/debug/debug-cluster/

## Next Steps

- [Kubernetes Security Guide](./KUBERNETES_SECURITY.md)
- [Kubernetes Setup Guide](./KUBERNETES_SETUP.md)
