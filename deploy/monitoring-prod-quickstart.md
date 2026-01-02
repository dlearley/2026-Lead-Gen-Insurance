# Quick Start Guide: Production Monitoring Setup

## Prerequisites Checklist

- [ ] Kubernetes cluster (EKS 1.27+) running
- [ ] kubectl configured and connected
- [ ] helm installed
- [ ] gp3 storage class available
- [ ] NGINX ingress controller installed
- [ ] Cert-Manager installed
- [ ] DNS records configured:
  - [ ] grafana.insurance-lead-gen.com
  - [ ] prometheus.insurance-lead-gen.com
  - [ ] alertmanager.insurance-lead-gen.com
  - [ ] jaeger.insurance-lead-gen.com (optional)

## 5-Minute Deployment

### Step 1: Set Environment Variables

```bash
export GRAFANA_ADMIN_PASSWORD="your_secure_password"
export MONITORING_NAMESPACE="monitoring"
export CLUSTER_NAME="your-cluster-name"
export AWS_REGION="us-east-1"
```

### Step 2: Deploy Monitoring Stack

**Option A: Using Helm (Recommended)**

```bash
cd deploy/helm/monitoring
helm install insurance-lead-gen-monitoring . \
  --namespace monitoring \
  --create-namespace \
  --values values.production.yaml \
  --wait \
  --timeout 10m
```

**Option B: Using Kustomize**

```bash
cd deploy/k8s/monitoring
kubectl apply -k .
kubectl wait --for=condition=available \
  -l app.kubernetes.io/component=monitoring \
  --namespace monitoring \
  --timeout 600s deployment
```

**Option C: Using Deployment Script**

```bash
cd deploy/scripts
./deploy-monitoring.sh helm
```

### Step 3: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n monitoring

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# prometheus-6f7b5c7d7-xq9mz        1/1     Running   0          2m
# prometheus-6f7b5c7d7-zk5pq        1/1     Running   0          2m
# grafana-7b9c8d9e6-abc12          1/1     Running   0          2m
# grafana-7b9c8d9e6-def34          1/1     Running   0          2m
# loki-8c0d9e0f7-ghi56            1/1     Running   0          2m
# loki-8c0d9e0f7-jkl78            1/1     Running   0          2m
# alertmanager-9d1e0f1g8-mno90      1/1     Running   0          2m
# alertmanager-9d1e0f1g8-pqr12      1/1     Running   0          2m
```

### Step 4: Access Monitoring Stack

**Public Access (via Ingress)**

- Grafana: https://grafana.insurance-lead-gen.com
- Prometheus: https://prometheus.insurance-lead-gen.com
- AlertManager: https://alertmanager.insurance-lead-gen.com

**Local Access (via Port Forwarding)**

```bash
# Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open: http://localhost:3000

# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open: http://localhost:9090

# AlertManager
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# Open: http://localhost:9093
```

## Common Tasks

### Update Grafana Password

```bash
kubectl create secret generic grafana-admin-credentials \
  --from-literal=admin-user=admin \
  --from-literal=admin-password=new_secure_password \
  --namespace monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/grafana -n monitoring
```

### Reload Prometheus Configuration

```bash
kubectl exec -n monitoring prometheus-0 -- \
  wget -qO- --post-data='' http://localhost:9090/-/reload
```

### View Logs

```bash
# All components
kubectl logs -n monitoring -l app.kubernetes.io/component=monitoring -f

# Specific component
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus -f
```

### Check Prometheus Targets

```bash
# Port forward
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Open in browser
open http://localhost:9090/targets

# Check all targets are UP
```

### Scale Prometheus (Vertical)

```bash
kubectl set resources deployment prometheus \
  -n monitoring \
  --limits=cpu=2000m,memory=4Gi \
  --requests=cpu=1000m,memory=2Gi
```

### Increase Prometheus Retention

Edit `values.production.yaml`:

```yaml
prometheus:
  retention: "60d"  # Change from 30d
```

Apply changes:

```bash
helm upgrade insurance-lead-gen-monitoring \
  deploy/helm/monitoring \
  --namespace monitoring \
  --values values.production.yaml
```

## Troubleshooting

### Problem: Pods stuck in Pending state

**Solution:** Check PVCs and storage class

```bash
kubectl get pvc -n monitoring
kubectl get storageclass
```

### Problem: Grafana shows "Datasource not found"

**Solution:** Check datasource configuration

```bash
kubectl get configmaps grafana-datasources -n monitoring -o yaml
# Verify URL: http://prometheus:9090
```

### Problem: No metrics showing in Prometheus

**Solution:** Check service discovery

```bash
kubectl exec -n monitoring prometheus-0 -- \
  wget -qO- http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'
```

### Problem: Loki not receiving logs

**Solution:** Check Promtail and Loki connection

```bash
kubectl logs -n production -l app.kubernetes.io/name=promtail -f
kubectl logs -n monitoring -l app.kubernetes.io/name=loki -f
```

### Problem: High memory usage

**Solution:** Check resource limits

```bash
kubectl top pods -n monitoring
kubectl describe pod prometheus-0 -n monitoring
```

## Production Readiness Checklist

- [ ] All pods running (2 replicas for HA)
- [ ] PVCs bound and mounting
- [ ] TLS certificates issued
- [ ] DNS records resolving
- [ ] Grafana accessible with strong password
- [ ] Prometheus scraping all targets
- [ ] Alerts firing and routing correctly
- [ ] Logs flowing to Loki
- [ ] Traces visible in Jaeger (if enabled)
- [ ] Backup procedures tested
- [ ] On-call rotation established

## Next Steps

1. **Configure Alerts**
   - Review alert rules in `monitoring/prometheus/alerts.yml`
   - Configure notification channels
   - Test alert delivery

2. **Create Dashboards**
   - Import dashboards from `monitoring/grafana/dashboards/`
   - Create custom dashboards for your metrics

3. **Set Up Backup**
   - Configure automated backups of monitoring data
   - Test restore procedures

4. **Monitor Cost**
   - Track monitoring infrastructure costs
   - Ensure <5% of total infrastructure cost
   - Optimize retention and sampling rates

## Support

- **Full Documentation**: `docs/RUN_19.3_MONITORING_PROD_SETUP.md`
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/

## Cleanup

To remove the monitoring stack:

```bash
# Using Helm
helm uninstall insurance-lead-gen-monitoring -n monitoring
kubectl delete namespace monitoring

# Using Kustomize
kubectl delete -k deploy/k8s/monitoring
```
