# Kubernetes Networking Guide

This guide covers networking concepts, service discovery, ingress configuration, and network policies for the Insurance Lead Generation Platform.

## Table of Contents

1. [Network Architecture](#network-architecture)
2. [Service Discovery](#service-discovery)
3. [Services](#services)
4. [Ingress](#ingress)
5. [Network Policies](#network-policies)
6. [DNS Configuration](#dns-configuration)
7. [Load Balancing](#load-balancing)
8. [Troubleshooting](#troubleshooting)

## Network Architecture

### Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      External Users                          │
└───────────────────────────┬──────────────────────────────┘
                            │
                            │ HTTPS
                            │
┌───────────────────────────▼──────────────────────────────┐
│                    Load Balancer (ALB/NLB)                │
└───────────────────────────┬──────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌───────────────────────────▼──────────────────────────────┐
│              NGINX Ingress Controller                     │
│  (TLS Termination, Routing, Rate Limiting, Security)    │
└───────────────────────────┬──────────────────────────────┘
                            │
                            │ HTTP
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌─────▼────────┐  ┌──────▼──────┐
│   Frontend     │  │   API        │  │   Backend    │
│   Service      │  │   Service    │  │   Service    │
└───────┬────────┘  └─────┬────────┘  └──────┬──────┘
        │                 │                  │
        │                 │                  │
        └─────────────────┼──────────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
┌───────▼────────┐  ┌─────▼────────┐  ┌──────▼──────┐
│  PostgreSQL    │  │   Redis      │  │   Neo4j     │
│  Database      │  │   Cache      │  │   Graph DB  │
└────────────────┘  └──────────────┘  └─────────────┘
```

### Namespaces

The platform uses isolated namespaces for each environment:

- `insurance-lead-gen-dev` - Development
- `insurance-lead-gen-staging` - Staging
- `insurance-lead-gen-prod` - Production
- `ingress-nginx` - Ingress controller (cluster-wide)
- `monitoring` - Monitoring stack
- `kube-system` - Kubernetes system

### Network Policies

Default deny-all policy enforces least privilege. Explicit allow rules define traffic flow.

## Service Discovery

### Kubernetes DNS

All services are automatically registered in cluster DNS:

```
<service-name>.<namespace>.svc.cluster.local
```

### Examples

```bash
# API service
http://api.insurance-lead-gen-prod.svc.cluster.local

# Data service
http://data-service.insurance-lead-gen-prod.svc.cluster.local

# PostgreSQL database
postgresql://postgres:5432

# Redis cache
redis://redis:6379
```

### Short Names

Within the same namespace, use short names:

```bash
# From API pod
http://api:3000
http://data-service:3001
postgresql://postgres:5432
redis://redis:6379
```

### Environment Variables

Kubernetes injects service discovery environment variables:

```bash
# API service
API_SERVICE_HOST=10.96.123.45
API_SERVICE_PORT=80
API_PORT=tcp://10.96.123.45:80

# Data service
DATA_SERVICE_HOST=10.96.123.46
DATA_SERVICE_PORT=80
```

### ConfigMap Service URLs

Service URLs are configured in ConfigMaps:

```yaml
# api-config
DATA_SERVICE_URL: "http://data-service:80"
ORCHESTRATOR_URL: "http://orchestrator:80"
DATABASE_URL: "postgresql://postgres:5432/insurance_lead_gen"
REDIS_URL: "redis://redis:6379"
```

## Services

### Service Types

#### ClusterIP (Default)

Internal cluster access only:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: api
```

#### NodePort

External access via node port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 3000
    nodePort: 30080
  selector:
    app: api
```

#### LoadBalancer

External access via cloud load balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: api
```

### Service Endpoints

View service endpoints:

```bash
kubectl get endpoints api -n insurance-lead-gen-prod
```

Output:
```
NAME   ENDPOINTS                                      AGE
api    10.244.1.5:3000,10.244.2.8:3000,10.244.3.2:3000   10d
```

### Service Health

Check service health:

```bash
# Describe service
kubectl describe service api -n insurance-lead-gen-prod

# Check endpoints
kubectl get endpoints api -n insurance-lead-gen-prod

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -qO- http://api:80/health
```

## Ingress

### Ingress Controller

NGINX Ingress Controller is deployed for external access:

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress controller service
kubectl get svc -n ingress-nginx
```

### Ingress Resources

#### API Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: insurance-lead-gen-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/limit-connections: "500"
    nginx.ingress.kubernetes.io/limit-rps: "250"
spec:
  tls:
  - hosts:
    - api.insurance-platform.com
    secretName: api-prod-tls
  rules:
  - host: api.insurance-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
```

#### Frontend Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  namespace: insurance-lead-gen-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - insurance-platform.com
    - www.insurance-platform.com
    secretName: frontend-prod-tls
  rules:
  - host: insurance-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Ingress Annotations

#### Rate Limiting

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-connections: "100"
  nginx.ingress.kubernetes.io/limit-rps: "50"
```

#### IP Whitelisting

```yaml
annotations:
  nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
```

#### CORS

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://insurance-platform.com"
```

#### Body Size

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-body-size: "10m"
```

#### Timeout

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
  nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
```

#### Security Headers

```yaml
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
```

### TLS Configuration

#### Let's Encrypt (Production)

```yaml
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.insurance-platform.com
    secretName: api-prod-tls
```

#### Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=*.dev.internal"

# Create secret
kubectl create secret tls dev-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n insurance-lead-gen-dev
```

### Ingress Management

```bash
# List ingresses
kubectl get ingress -n insurance-lead-gen-prod

# Describe ingress
kubectl describe ingress api-ingress -n insurance-lead-gen-prod

# View ingress logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test ingress
curl -k https://api.insurance-platform.com/health
```

## Network Policies

### Default Deny-All

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### Allow DNS

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

### Allow Service Communication

```yaml
# API to Data Service
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-data-service
  namespace: insurance-lead-gen-prod
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: data-service
    ports:
    - protocol: TCP
      port: 3001
```

### Allow Database Access

```yaml
# API to Databases
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-databases
  namespace: insurance-lead-gen-prod
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app: neo4j
    ports:
    - protocol: TCP
      port: 7687
```

### Allow Ingress Traffic

```yaml
# Allow ingress controller to route to services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: insurance-lead-gen-prod
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
```

### Network Policy Management

```bash
# List network policies
kubectl get networkpolicy -n insurance-lead-gen-prod

# Describe network policy
kubectl describe networkpolicy api-to-data-service -n insurance-lead-gen-prod

# Check pod connectivity
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://data-service:3001/health
```

## DNS Configuration

### CoreDNS

CoreDNS provides cluster DNS:

```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

### Custom DNS Entries

Add custom DNS via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        log
        errors
        health {
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
    custom.domain.com:53 {
        errors
        cache 30
        forward . 8.8.8.8 8.8.4.4
    }
```

### DNS Debugging

```bash
# Test DNS from pod
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup api

# Check DNS resolution
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- dig api.insurance-lead-gen-prod.svc.cluster.local

# Test external DNS
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup google.com
```

## Load Balancing

### Service Load Balancing

Services automatically load balance traffic:

- **Round Robin** - Default algorithm
- **Session Affinity** - For sticky sessions

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: api
```

### Ingress Load Balancing

Ingress controller distributes traffic:

```yaml
annotations:
  nginx.ingress.kubernetes.io/upstream-keepalive-connections: "100"
  nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
```

### External Load Balancers

#### AWS Load Balancer

```bash
# Check load balancer
kubectl get svc -n ingress-nginx

# View ALB details
aws elb describe-load-balancers | jq '.LoadBalancerDescriptions[] | .DNSName'
```

#### GCP Load Balancer

```bash
# Check load balancer
kubectl get svc -n ingress-nginx

# View LB details
gcloud compute forwarding-rules list
```

## Troubleshooting

### Service Not Resolving

```bash
# Check service exists
kubectl get svc api -n insurance-lead-gen-prod

# Check endpoints
kubectl get endpoints api -n insurance-lead-gen-prod

# Check DNS
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup api

# Check pod network
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- ip addr
```

### Cannot Connect to Service

```bash
# Check service
kubectl describe svc api -n insurance-lead-gen-prod

# Check endpoints
kubectl get endpoints api -n insurance-lead-gen-prod

# Check pod labels
kubectl get pods -n insurance-lead-gen-prod --show-labels

# Test connectivity
kubectl run -it --rm debug --image=busybox -- wget -qO- http://api:80/health
```

### Network Policy Blocking Traffic

```bash
# List network policies
kubectl get networkpolicy -n insurance-lead-gen-prod

# Check specific policy
kubectl describe networkpolicy api-to-data-service -n insurance-lead-gen-prod

# Check if policy is applied
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- wget -qO- http://data-service:3001/health
```

### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n insurance-lead-gen-prod

# Describe ingress
kubectl describe ingress api-ingress -n insurance-lead-gen-prod

# Check ingress controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test ingress
curl -v https://api.insurance-platform.com/health
```

### DNS Issues

```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- nslookup api

# Check /etc/resolv.conf
kubectl exec -it api-xxx -n insurance-lead-gen-prod -- cat /etc/resolv.conf
```

## Best Practices

1. **Use ClusterIP for internal services** - Don't expose unnecessary services
2. **Implement network policies** - Enforce least privilege
3. **Use ingress for external access** - Centralize routing
4. **Enable TLS** - Encrypt all external traffic
5. **Implement rate limiting** - Protect against abuse
6. **Monitor network traffic** - Use network policies as observability tool
7. **Test connectivity** - Verify service-to-service communication
8. **Use DNS names** - Don't hardcode IP addresses
9. **Configure health checks** - Ensure services are healthy
10. **Document network architecture** - Keep diagrams updated

## Next Steps

- [Kubernetes Security Guide](./KUBERNETES_SECURITY.md)
- [Kubernetes Troubleshooting Guide](./KUBERNETES_TROUBLESHOOTING.md)
